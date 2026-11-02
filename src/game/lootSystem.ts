import * as THREE from 'three';
import { LootCrateEntity, LootItem, TacticalVehicleEntity, WeaponData, WeaponType, PlayerState } from '../types/game.ts';
import { createLootCrateMesh, createTacticalBuggyModel } from './models.ts';
import { soundManager } from './audio.ts';

export const WEAPON_REGISTRY: Record<WeaponType, WeaponData> = {
  knife: {
    type: 'knife',
    nameAr: 'خنجر قتالي تكتيكي (جنبية صاعقة)',
    nameEn: 'Tactical Combat Knife',
    damage: 45,
    fireRate: 2.5,
    clipSize: 1,
    currentAmmo: 1,
    reserveAmmo: 1,
    reloadTime: 0.1,
    recoil: 0.01,
    spread: 0.01,
    range: 3.5,
    zoomFov: 60,
  },
  pistol: {
    type: 'pistol',
    nameAr: 'مسدس تكتيكي 9 ملم (صقر الصحراء)',
    nameEn: '9mm Tactical Pistol',
    damage: 28,
    fireRate: 4.5,
    clipSize: 15,
    currentAmmo: 15,
    reserveAmmo: 60,
    reloadTime: 1.2,
    recoil: 0.03,
    spread: 0.02,
    range: 35,
    zoomFov: 55,
  },
  assault: {
    type: 'assault',
    nameAr: 'بندقية هجومية كاربين M4A1',
    nameEn: 'M4A1 Tactical Carbine',
    damage: 34,
    fireRate: 9.5,
    clipSize: 30,
    currentAmmo: 30,
    reserveAmmo: 150,
    reloadTime: 1.8,
    recoil: 0.045,
    spread: 0.022,
    range: 75,
    zoomFov: 50,
  },
  sniper: {
    type: 'sniper',
    nameAr: 'بندقية قنص دراغونوف SVD',
    nameEn: 'SVD Marksman Sniper',
    damage: 95,
    fireRate: 1.4,
    clipSize: 10,
    currentAmmo: 10,
    reserveAmmo: 40,
    reloadTime: 2.4,
    recoil: 0.14,
    spread: 0.004,
    range: 160,
    zoomFov: 24,
  },
  shotgun: {
    type: 'shotgun',
    nameAr: 'شوزن اقتحام تكتيكي SPAS-12',
    nameEn: 'SPAS-12 Tactical Shotgun',
    damage: 110,
    fireRate: 1.8,
    clipSize: 8,
    currentAmmo: 8,
    reserveAmmo: 32,
    reloadTime: 2.6,
    recoil: 0.18,
    spread: 0.09,
    range: 25,
    zoomFov: 55,
  },
  lmg: {
    type: 'lmg',
    nameAr: 'رشاش ثقيل داعم RPK',
    nameEn: 'RPK Heavy Squad LMG',
    damage: 42,
    fireRate: 11,
    clipSize: 75,
    currentAmmo: 75,
    reserveAmmo: 225,
    reloadTime: 3.4,
    recoil: 0.07,
    spread: 0.045,
    range: 90,
    zoomFov: 48,
  },
};

const LOOT_CATALOG: LootItem[] = [
  { id: 'w_m4', type: 'weapon', weaponType: 'assault', nameAr: 'بندقية M4A1 تكتيكية', nameEn: 'M4A1 Assault Rifle', tier: 'rare' },
  { id: 'w_svd', type: 'weapon', weaponType: 'sniper', nameAr: 'بندقية قنص SVD مع دربيل', nameEn: 'SVD Marksman Sniper', tier: 'epic' },
  { id: 'w_spas', type: 'weapon', weaponType: 'shotgun', nameAr: 'شوزن اقتحام SPAS-12', nameEn: 'SPAS-12 Shotgun', tier: 'rare' },
  { id: 'w_rpk', type: 'weapon', weaponType: 'lmg', nameAr: 'رشاش ثقيل RPK مخزن طبلة', nameEn: 'RPK Heavy Machine Gun', tier: 'legendary' },
  { id: 'a_heavy', type: 'armor', nameAr: 'درع باليستي عسكري (مستوى 3)', nameEn: 'Level 3 Ballistic Armor', tier: 'epic', armorAmount: 100 },
  { id: 'a_medium', type: 'armor', nameAr: 'سترة حماية تكتيكية (مستوى 2)', nameEn: 'Level 2 Kevlar Vest', tier: 'rare', armorAmount: 65 },
  { id: 'm_trauma', type: 'medkit', nameAr: 'حقيبة إسعاف ميدانية تكتيكية', nameEn: 'Tactical Trauma Medkit', tier: 'rare', healAmount: 85 },
  { id: 'c_ammo_large', type: 'ammo', nameAr: 'صندوق ذخيرة عسكرية شامل', nameEn: 'Military Munitions Crate', tier: 'common', ammoAmount: 120 },
];

export class LootSystem {
  private scene: THREE.Scene;
  private crates: { entity: LootCrateEntity; mesh: THREE.Group }[] = [];
  private vehicles: { entity: TacticalVehicleEntity; mesh: THREE.Group }[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Spawns weapon caches and tactical crates across the vast warzone terrain.
   */
  public populateWorldCrates(
    crateSpawns: { x: number; y: number; z: number; type?: 'tactical_box' | 'air_drop' | 'military_locker' }[],
    vehicleSpawns: { x: number; y: number; z: number; rotationY?: number }[] = []
  ) {
    this.clear();

    crateSpawns.forEach((spawn, idx) => {
      // Pick item from catalog with varied rarities
      const itemTemplate = LOOT_CATALOG[idx % LOOT_CATALOG.length];
      const crateType = spawn.type || (idx % 6 === 0 ? 'air_drop' : idx % 3 === 0 ? 'military_locker' : 'tactical_box');
      
      const entity: LootCrateEntity = {
        id: `crate_${idx}_${Date.now()}`,
        x: spawn.x,
        y: spawn.y,
        z: spawn.z,
        type: crateType,
        isLooted: false,
        item: { ...itemTemplate },
      };

      const mesh = createLootCrateMesh(crateType, entity.item.tier);
      mesh.position.set(spawn.x, spawn.y, spawn.z);
      this.scene.add(mesh);

      this.crates.push({ entity, mesh });
    });

    // Spawn Tactical Vehicles (Buggy / Technical)
    vehicleSpawns.forEach((vSpawn, vIdx) => {
      const vEntity: TacticalVehicleEntity = {
        id: `vehicle_${vIdx}`,
        type: 'buggy',
        x: vSpawn.x,
        y: vSpawn.y,
        z: vSpawn.z,
        rotationY: vSpawn.rotationY || 0,
        speed: 0,
        maxSpeed: 38, // 38 m/s (~136 km/h) for fast vast terrain traversal
        health: 400,
        maxHealth: 400,
        isOccupied: false,
      };

      const buggyMesh = createTacticalBuggyModel();
      buggyMesh.position.set(vSpawn.x, vSpawn.y, vSpawn.z);
      buggyMesh.rotation.y = vEntity.rotationY;
      this.scene.add(buggyMesh);

      this.vehicles.push({ entity: vEntity, mesh: buggyMesh });
    });
  }

  /**
   * Check if player is near any unlooted crate within range (e.g. 3.5m).
   */
  public checkNearbyLoot(playerPos: THREE.Vector3, maxDist: number = 3.6): LootCrateEntity | null {
    let closestCrate: LootCrateEntity | null = null;
    let minDist = maxDist;

    for (let i = 0; i < this.crates.length; i++) {
      const c = this.crates[i];
      if (c.entity.isLooted) continue;

      const dist = Math.hypot(c.entity.x - playerPos.x, c.entity.z - playerPos.z);
      if (dist < minDist) {
        minDist = dist;
        closestCrate = c.entity;
      }
    }

    return closestCrate;
  }

  /**
   * Check if player is near a vehicle to mount/drive.
   */
  public checkNearbyVehicle(playerPos: THREE.Vector3, maxDist: number = 4.2): TacticalVehicleEntity | null {
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      const dist = Math.hypot(v.entity.x - playerPos.x, v.entity.z - playerPos.z);
      if (dist < maxDist) {
        return v.entity;
      }
    }
    return null;
  }

  /**
   * Player or Bot interacts to open/loot a crate.
   */
  public lootCrate(
    crateId: string,
    playerState: PlayerState,
    onRadioBroadcast?: (ar: string, en: string) => void
  ): boolean {
    const crateRecord = this.crates.find((c) => c.entity.id === crateId);
    if (!crateRecord || crateRecord.entity.isLooted) return false;

    const { entity, mesh } = crateRecord;
    entity.isLooted = true;

    // Visual feedback on 3D mesh: Open lid / dim beacon
    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (child.material instanceof THREE.MeshBasicMaterial) {
          // Dim beacon
          child.material.color.setHex(0x334155);
        }
      }
    });
    // Slight upward offset or tilt to indicate opened state
    mesh.rotation.y += 0.15;

    soundManager.playReload(); // Satisfying gear rattle sound

    // Apply item to player loadout
    const item = entity.item;
    if (item.type === 'weapon' && item.weaponType) {
      const baseData = WEAPON_REGISTRY[item.weaponType];
      if (baseData) {
        playerState.weapons[item.weaponType] = { ...baseData };
        if (!playerState.unlockedWeapons.includes(item.weaponType)) {
          playerState.unlockedWeapons.push(item.weaponType);
        }
        playerState.currentWeapon = item.weaponType;

        if (onRadioBroadcast) {
          onRadioBroadcast(
            `تم تجهيز ${item.nameAr}! العتاد التكتيكي جاهز للاشتباك.`,
            `Equipped ${item.nameEn}! Weapon primed for battle.`
          );
        }
      }
    } else if (item.type === 'armor') {
      const addArmor = item.armorAmount || 50;
      playerState.armor = Math.min(playerState.maxArmor, playerState.armor + addArmor);
      if (onRadioBroadcast) {
        onRadioBroadcast(
          `تم ارتداء ${item.nameAr} (+${addArmor}% درع).`,
          `Equipped ${item.nameEn} (+${addArmor}% Armor).`
        );
      }
    } else if (item.type === 'medkit') {
      const heal = item.healAmount || 60;
      playerState.health = Math.min(playerState.maxHealth, playerState.health + heal);
      if (onRadioBroadcast) {
        onRadioBroadcast(
          `تم استخدام ${item.nameAr} (+${heal} صحة).`,
          `Applied ${item.nameEn} (+${heal} Health).`
        );
      }
    } else if (item.type === 'ammo') {
      const ammoBonus = item.ammoAmount || 90;
      Object.keys(playerState.weapons).forEach((wKey) => {
        const w = playerState.weapons[wKey as WeaponType];
        if (w) w.reserveAmmo += ammoBonus;
      });
      if (onRadioBroadcast) {
        onRadioBroadcast(
          `تم تذخير كافة الأسلحة (+${ammoBonus} ذخيرة).`,
          `Munitions replenished (+${ammoBonus} Reserve Ammo).`
        );
      }
    }

    return true;
  }

  /**
   * For autonomous bot paratroopers: Find closest unlooted crate to run to.
   */
  public findNearestUnlootedCrate(pos: THREE.Vector3, maxSearchDist: number = 250): LootCrateEntity | null {
    let nearest: LootCrateEntity | null = null;
    let minDist = maxSearchDist;

    for (let i = 0; i < this.crates.length; i++) {
      const c = this.crates[i];
      if (c.entity.isLooted) continue;

      const dist = Math.hypot(c.entity.x - pos.x, c.entity.z - pos.z);
      if (dist < minDist) {
        minDist = dist;
        nearest = c.entity;
      }
    }

    return nearest;
  }

  public getCrates(): LootCrateEntity[] {
    return this.crates.map((c) => c.entity);
  }

  public getVehicles(): TacticalVehicleEntity[] {
    return this.vehicles.map((v) => v.entity);
  }

  public getVehicleMesh(id: string): THREE.Group | undefined {
    return this.vehicles.find((v) => v.entity.id === id)?.mesh;
  }

  public clear() {
    this.crates.forEach((c) => this.scene.remove(c.mesh));
    this.vehicles.forEach((v) => this.scene.remove(v.mesh));
    this.crates = [];
    this.vehicles = [];
  }
}
