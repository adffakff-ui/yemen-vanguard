import * as THREE from 'three';
import { CommandoModel, createCommandoModel } from './models.ts';
import { soundManager } from './audio.ts';
import { LandedParatrooperData } from './descent.ts';
import { LootSystem } from './lootSystem.ts';

export interface EnemyEntity {
  id: number;
  model: CommandoModel;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  targetPos: THREE.Vector3;
  health: number;
  maxHealth: number;
  state: 'patrol' | 'alert' | 'aiming' | 'attacking' | 'dead' | 'scavenge';
  stateTimer: number;
  shootCooldown: number;
  telegraphLaser: THREE.Line;
  alertLevel: number;
  isDead: boolean;
  deathAnimTimer: number;
  walkCycle: number;
  type: 'rifleman' | 'heavy' | 'sniper';
  isArmed: boolean;
  targetCrateId?: string;
  targetCratePos?: THREE.Vector3;
}

export class EnemySystem {
  public enemies: EnemyEntity[] = [];
  private scene: THREE.Scene;
  private idCounter = 1;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public spawnParatrooperScavengers(landedBots: LandedParatrooperData[], lootSystem: LootSystem) {
    this.clear();

    landedBots.forEach((botData, idx) => {
      const model = createCommandoModel(false);
      model.root.position.copy(botData.position);
      model.root.rotation.y = botData.rotationY;
      this.scene.add(model.root);

      // Weapon initially holstered / hidden until looted
      model.weaponGroup.visible = false;

      const laserGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 20),
      ]);
      const laserMat = new THREE.LineDashedMaterial({
        color: 0xef4444,
        dashSize: 0.5,
        gapSize: 0.3,
        transparent: true,
        opacity: 0,
      });
      const telegraphLaser = new THREE.Line(laserGeo, laserMat);
      telegraphLaser.computeLineDistances();
      model.weaponGroup.add(telegraphLaser);

      const type = idx % 3 === 0 ? 'heavy' : (idx % 4 === 0 ? 'sniper' : 'rifleman');
      const maxHealth = type === 'heavy' ? 140 : (type === 'sniper' ? 60 : 80);

      // Paratroopers disperse immediately to search for nearest weapon crate
      const nearestCrate = lootSystem.findNearestUnlootedCrate(botData.position, 350);

      const enemy: EnemyEntity = {
        id: this.idCounter++,
        model,
        position: botData.position.clone(),
        velocity: new THREE.Vector3(),
        targetPos: nearestCrate ? new THREE.Vector3(nearestCrate.x, nearestCrate.y, nearestCrate.z) : botData.position.clone(),
        health: maxHealth,
        maxHealth,
        state: 'scavenge',
        stateTimer: 0,
        shootCooldown: 1.5 + Math.random() * 2,
        telegraphLaser,
        alertLevel: 0,
        isDead: false,
        deathAnimTimer: 0,
        walkCycle: Math.random() * 10,
        type,
        isArmed: false,
        targetCrateId: nearestCrate ? nearestCrate.id : undefined,
        targetCratePos: nearestCrate ? new THREE.Vector3(nearestCrate.x, nearestCrate.y, nearestCrate.z) : undefined,
      };

      model.setAnimation('run', 0);
      this.enemies.push(enemy);
    });
  }

  public spawnEnemies(spawnPoints: THREE.Vector3[]) {
    this.clear();

    spawnPoints.forEach((pos, idx) => {
      const model = createCommandoModel(false);
      model.root.position.copy(pos);
      this.scene.add(model.root);

      // Aiming telegraph laser line (red dashed indicator showing player they are in crosshairs)
      const laserGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 20),
      ]);
      const laserMat = new THREE.LineDashedMaterial({
        color: 0xef4444,
        dashSize: 0.5,
        gapSize: 0.3,
        transparent: true,
        opacity: 0,
      });
      const telegraphLaser = new THREE.Line(laserGeo, laserMat);
      telegraphLaser.computeLineDistances();
      model.weaponGroup.add(telegraphLaser);

      const type = idx % 4 === 0 ? 'sniper' : (idx % 3 === 0 ? 'heavy' : 'rifleman');
      const maxHealth = type === 'heavy' ? 140 : (type === 'sniper' ? 60 : 80);

      this.enemies.push({
        id: this.idCounter++,
        model,
        position: pos.clone(),
        velocity: new THREE.Vector3(),
        targetPos: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 8, 0, (Math.random() - 0.5) * 8)),
        health: maxHealth,
        maxHealth,
        state: 'patrol',
        stateTimer: Math.random() * 3,
        shootCooldown: 1.0 + Math.random() * 2,
        telegraphLaser,
        alertLevel: 0,
        isDead: false,
        deathAnimTimer: 0,
        walkCycle: Math.random() * 10,
        type,
        isArmed: true,
      });
    });
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    onEnemyShoot: (from: THREE.Vector3, dir: THREE.Vector3, damage: number) => void,
    lootSystem?: LootSystem
  ) {
    const toPlayer = new THREE.Vector3();

    this.enemies.forEach((enemy) => {
      if (enemy.isDead) {
        if (enemy.deathAnimTimer < 1.0) {
          enemy.deathAnimTimer += dt * 2.5;
          // Smooth death collapse
          enemy.model.root.rotation.x = THREE.MathUtils.lerp(0, Math.PI / 2.2, enemy.deathAnimTimer);
          enemy.model.root.position.y = THREE.MathUtils.lerp(0, 0.2, enemy.deathAnimTimer);
        }
        return;
      }

      // SCAVENGE STATE: Paratrooper landed and sprints across terrain to find & loot weapon caches
      if (enemy.state === 'scavenge') {
        (enemy.telegraphLaser.material as THREE.LineDashedMaterial).opacity = 0;

        if (lootSystem) {
          // If no target crate or current target was already looted, find closest available
          if (!enemy.targetCratePos || !enemy.targetCrateId) {
            const nearest = lootSystem.findNearestUnlootedCrate(enemy.position, 450);
            if (nearest) {
              enemy.targetCrateId = nearest.id;
              enemy.targetCratePos = new THREE.Vector3(nearest.x, nearest.y, nearest.z);
            } else {
              // No crates available; fall back to patrol
              enemy.state = 'patrol';
              enemy.isArmed = true;
              enemy.model.weaponGroup.visible = true;
              return;
            }
          }

          const dx = enemy.targetCratePos.x - enemy.position.x;
          const dz = enemy.targetCratePos.z - enemy.position.z;
          const distToCrate = Math.hypot(dx, dz);

          if (distToCrate > 2.2) {
            // Sprint toward weapon cache
            const targetAngle = Math.atan2(dx, dz);
            enemy.model.root.rotation.y = THREE.MathUtils.damp(
              enemy.model.root.rotation.y,
              targetAngle,
              10,
              dt
            );

            const sprintSpeed = 5.8; // Fast sprint across open terrain
            enemy.position.x += Math.sin(targetAngle) * sprintSpeed * dt;
            enemy.position.z += Math.cos(targetAngle) * sprintSpeed * dt;
            enemy.model.root.position.copy(enemy.position);

            enemy.walkCycle += dt * 8;
            enemy.model.setAnimation('run', enemy.walkCycle);
          } else {
            // Reached weapon crate! Scavenge and equip weapon
            const crateRecord = lootSystem.getCrates().find((c) => c.id === enemy.targetCrateId);
            if (crateRecord && !crateRecord.isLooted) {
              crateRecord.isLooted = true;
            }

            enemy.isArmed = true;
            enemy.model.weaponGroup.visible = true;
            enemy.state = 'patrol';
            enemy.stateTimer = 2.0;
            enemy.model.setAnimation('idle', 0);
            soundManager.playReload();
          }
        } else {
          enemy.state = 'patrol';
          enemy.isArmed = true;
          enemy.model.weaponGroup.visible = true;
        }

        return;
      }

      toPlayer.subVectors(playerPos, enemy.position);
      const distToPlayer = toPlayer.length();
      toPlayer.y = 0;
      toPlayer.normalize();

      enemy.stateTimer -= dt;
      enemy.shootCooldown -= dt;

      // Line of sight / detection radius (up to 38m)
      const isVisible = distToPlayer < 38;

      if (isVisible) {
        enemy.alertLevel = Math.min(1.0, enemy.alertLevel + dt * 2.0);
      } else {
        enemy.alertLevel = Math.max(0, enemy.alertLevel - dt * 0.5);
      }

      // Smooth look-at rotation towards player when alert
      if (enemy.alertLevel > 0.4) {
        const targetAngle = Math.atan2(toPlayer.x, toPlayer.z);
        enemy.model.root.rotation.y = THREE.MathUtils.damp(
          enemy.model.root.rotation.y,
          targetAngle,
          8,
          dt
        );
      }

      // AI State Transitions (only armed soldiers can enter aiming/attacking)
      if (enemy.isArmed && enemy.alertLevel > 0.6) {
        if (enemy.state === 'patrol') {
          enemy.state = 'aiming';
          enemy.stateTimer = enemy.type === 'sniper' ? 1.4 : 0.7; // Windup telegraph
          soundManager.playRadioChirp();
        }
      } else if (enemy.state !== 'patrol') {
        enemy.state = 'patrol';
      }

      // Execution by state
      if (enemy.state === 'aiming' && enemy.isArmed) {
        enemy.model.setAnimation('aim', 0);

        // Turn on telegraph laser indicator (flickers in warning)
        const laserMat = enemy.telegraphLaser.material as THREE.LineDashedMaterial;
        laserMat.opacity = Math.min(0.9, 0.3 + (1 - enemy.stateTimer) * 0.8);

        if (enemy.stateTimer <= 0 && enemy.shootCooldown <= 0) {
          // Fire attack!
          enemy.state = 'attacking';
          enemy.stateTimer = 0.3;
          laserMat.opacity = 0;

          // Compute muzzle world point
          const muzzle = new THREE.Vector3();
          enemy.model.weaponGroup.getWorldPosition(muzzle);
          muzzle.y += 0.1;

          // Target slightly lead or jittered based on distance
          const jitter = (Math.random() - 0.5) * 0.08;
          const fireDir = new THREE.Vector3()
            .subVectors(playerPos, muzzle)
            .normalize();
          fireDir.x += jitter;
          fireDir.z += jitter;
          fireDir.normalize();

          const dmg = enemy.type === 'sniper' ? 45 : (enemy.type === 'heavy' ? 22 : 14);
          onEnemyShoot(muzzle, fireDir, dmg);

          soundManager.playRifleShot();
          enemy.shootCooldown = enemy.type === 'sniper' ? 3.0 : 1.4 + Math.random() * 0.8;
        }
      } else if (enemy.state === 'attacking' && enemy.isArmed) {
        enemy.model.setAnimation('aim', 0);
        if (enemy.stateTimer <= 0) {
          enemy.state = 'aiming';
          enemy.stateTimer = 1.0;
        }
      } else {
        // Patrol / Reposition
        (enemy.telegraphLaser.material as THREE.LineDashedMaterial).opacity = 0;
        enemy.walkCycle += dt;
        enemy.model.setAnimation('idle', enemy.walkCycle);

        // Subtle idle wander
        if (enemy.stateTimer <= 0) {
          enemy.stateTimer = 4 + Math.random() * 4;
          enemy.targetPos.set(
            enemy.position.x + (Math.random() - 0.5) * 6,
            0,
            enemy.position.z + (Math.random() - 0.5) * 6
          );
        }
      }
    });
  }

  public damageEnemy(id: number, amount: number, hitPos?: THREE.Vector3): { killed: boolean; isHeadshot: boolean } {
    const enemy = this.enemies.find((e) => e.id === id);
    if (!enemy || enemy.isDead) return { killed: false, isHeadshot: false };

    let isHeadshot = false;
    if (hitPos && hitPos.y > enemy.position.y + 1.45) {
      isHeadshot = true;
      amount *= 2.5; // Headshot bonus multiplier
    }

    enemy.health -= amount;
    enemy.alertLevel = 1.0; // Instantly alerts on being shot

    if (enemy.health <= 0) {
      enemy.health = 0;
      enemy.isDead = true;
      (enemy.telegraphLaser.material as THREE.LineDashedMaterial).opacity = 0;
      return { killed: true, isHeadshot };
    }

    return { killed: false, isHeadshot };
  }

  public getAliveCount(): number {
    return this.enemies.filter((e) => !e.isDead).length;
  }

  public clear() {
    this.enemies.forEach((enemy) => {
      enemy.model.root.traverse((obj) => {
        if ((obj as any).geometry && !(obj as any).geometry.userData?.isShared) {
          (obj as any).geometry.dispose();
        }
        if ((obj as any).material) {
          const mats = Array.isArray((obj as any).material) ? (obj as any).material : [(obj as any).material];
          mats.forEach((m: any) => {
            if (m.map && !m.map.userData?.isShared) m.map.dispose();
            if (m.lightMap && !m.lightMap.userData?.isShared) m.lightMap.dispose();
            if (m.bumpMap && !m.bumpMap.userData?.isShared) m.bumpMap.dispose();
            if (m.normalMap && !m.normalMap.userData?.isShared) m.normalMap.dispose();
            if (m.specularMap && !m.specularMap.userData?.isShared) m.specularMap.dispose();
            if (m.envMap && !m.envMap.userData?.isShared) m.envMap.dispose();
            
            if (!m.userData?.isShared) {
              m.dispose();
            }
          });
        }
      });
      this.scene.remove(enemy.model.root);
    });
    this.enemies = [];
  }
}
