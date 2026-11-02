import * as THREE from 'three';
import {
  createTransportPlaneModel,
  createParachuteModel,
  createCollapsedParachuteModel,
  createCommandoModel,
  CommandoModel,
  TransportPlaneModel
} from './models.ts';
import { soundManager } from './audio.ts';
import { DescentTelemetry } from '../types/game.ts';

export interface LandedParatrooperData {
  position: THREE.Vector3;
  rotationY: number;
}

/**
 * DescentSystem: Manages high-altitude tactical flight, cargo door jump,
 * interactive 3D steerable canopy flight with physics, terrain touchdown,
 * parachute cutaway, and bot squad dispersion.
 */
export class DescentSystem {
  private scene: THREE.Scene;
  private plane: TransportPlaneModel | null = null;
  private playerModel: CommandoModel;
  private playerParachute: THREE.Group | null = null;
  private droppedParachutes: THREE.Group[] = [];
  
  private otherParatroopers: {
    model: CommandoModel;
    chute: THREE.Group;
    offset: THREE.Vector3;
    altitude: number;
    velocity: THREE.Vector3;
    isLanded: boolean;
  }[] = [];
  
  private isActive = false;
  private phase: 'plane' | 'jump' | 'freefall' | 'parachuting' | 'touchdown' | 'landed' = 'plane';
  private altitude = 950; // Starting altitude (meters above ground)
  private planeSpeed = 65; // Horizontal aircraft speed (m/s)
  private descentSpeed = 14; // Vertical descent speed (m/s)
  private forwardSpeed = 16; // Gliding airspeed (m/s)
  private rotation = 0; // Yaw heading in radians
  private rollAngle = 0; // Bank angle in radians
  private pitchAngle = 0; // Forward dive angle
  
  private timer = 0;
  private onLandingCallback: (pos: THREE.Vector3, landedBots: LandedParatrooperData[]) => void;
  private getTerrainHeightFn: (x: number, z: number) => number;

  constructor(
    scene: THREE.Scene,
    playerModel: CommandoModel,
    getTerrainHeightFn: (x: number, z: number) => number,
    onLanding: (pos: THREE.Vector3, landedBots: LandedParatrooperData[]) => void
  ) {
    this.scene = scene;
    this.playerModel = playerModel;
    this.getTerrainHeightFn = getTerrainHeightFn;
    this.onLandingCallback = onLanding;
  }

  /**
   * Start the descent phase with a specific number of paratroopers (subscribers)
   */
  public start(subscriberCount: number = 14, startPos?: { x: number; z: number }) {
    this.clear();

    this.isActive = true;
    this.phase = 'plane';
    this.altitude = 900;
    this.timer = 0;
    this.descentSpeed = 14;
    this.forwardSpeed = 18;
    this.rotation = 0;
    this.rollAngle = 0;
    this.pitchAngle = 0;

    const spawnX = startPos ? startPos.x : 0;
    const spawnZ = startPos ? startPos.z + 180 : 180;

    // Create 4-Turboprop Military Transport Plane
    this.plane = createTransportPlaneModel();
    this.plane.root.position.set(spawnX, this.altitude + 15, spawnZ);
    this.plane.root.rotation.y = Math.PI; // Flying northwards
    this.scene.add(this.plane.root);

    // Position player inside cargo bay
    this.playerModel.root.position.set(0, -1.2, -4);
    this.playerModel.root.rotation.set(0, 0, 0);
    this.plane.root.add(this.playerModel.root);
    this.playerModel.setAnimation('idle', 0);

    // Create squad paratroopers lined up inside the cargo hold
    const squadSize = Math.max(6, Math.min(subscriberCount, 16));
    for (let i = 1; i < squadSize; i++) {
      const bot = createCommandoModel(false);
      const chute = createParachuteModel();
      chute.visible = false;
      
      const side = i % 2 === 0 ? 0.9 : -0.9;
      const row = Math.floor((i + 1) / 2);
      bot.root.position.set(side, -1.2, -5 - row * 0.85);
      bot.setAnimation('idle', 0);
      this.plane.root.add(bot.root);
      
      this.otherParatroopers.push({
        model: bot,
        chute,
        offset: new THREE.Vector3((Math.random() - 0.5) * 60, (Math.random() - 0.5) * 15, (Math.random() - 0.5) * 60),
        altitude: this.altitude + (Math.random() - 0.5) * 10,
        velocity: new THREE.Vector3(),
        isLanded: false,
      });
    }

    soundManager.playRadioVoiceCallout();
  }

  /**
   * Jump from cargo bay into the air
   */
  public triggerJump() {
    if (this.phase !== 'plane') return;
    this.phase = 'jump';
    this.timer = 0;

    if (this.plane) {
      this.plane.cargoDoor.rotation.x = -Math.PI / 2.8; // Lower ramp
    }

    soundManager.playWindWhistle();
  }

  public jump() {
    this.triggerJump();
  }

  public update(
    dt: number,
    inputs: { forward: number; side: number; flare?: boolean }
  ) {
    if (!this.isActive) return;

    this.timer += dt;

    if (this.phase === 'plane') {
      // Aircraft cruising
      if (this.plane) {
        this.plane.root.position.z -= this.planeSpeed * dt;
        this.plane.tickAnimation(dt);

        // Player jogs toward ramp before jump
        if (this.timer > 2.2) {
          this.playerModel.root.position.z += 3.5 * dt;
          this.playerModel.setAnimation('run', this.timer * 4);
        }

        // Auto jump when reaching ramp edge
        if (this.timer > 3.6) {
          this.triggerJump();
        }
      }
    } else if (this.phase === 'jump') {
      // Running off the cargo ramp into the sky
      if (this.timer > 0.6) {
        this.phase = 'parachuting';

        // Detach player from aircraft into world coordinates
        const worldPos = new THREE.Vector3();
        this.playerModel.root.getWorldPosition(worldPos);
        this.scene.add(this.playerModel.root);
        this.playerModel.root.position.copy(worldPos);

        // Deploy steerable parachute canopy
        this.playerParachute = createParachuteModel();
        this.playerModel.root.add(this.playerParachute);
        this.playerModel.setAnimation('aim', 0);

        // Detach squad paratroopers with staggered airborne dispersion
        this.otherParatroopers.forEach((bot, idx) => {
          setTimeout(() => {
            if (!this.isActive) return;
            const bPos = new THREE.Vector3();
            bot.model.root.getWorldPosition(bPos);
            this.scene.add(bot.model.root);
            bot.model.root.position.copy(bPos);
            bot.altitude = bPos.y;

            this.scene.add(bot.chute);
            bot.chute.position.copy(bPos);
            bot.chute.visible = true;
          }, idx * 160);
        });

        // Transport plane flies off and vanishes
        setTimeout(() => {
          if (this.plane) {
            this.scene.remove(this.plane.root);
            this.plane = null;
          }
        }, 4000);
      }
    } else if (this.phase === 'parachuting') {
      // Real aerodynamic gliding physics:
      // Forward tilt = dive (fast vertical, high forward speed)
      // Backward tilt / flare = gentle cushion float
      const isDiving = inputs.forward > 0.2;
      const isFlaring = inputs.forward < -0.2 || inputs.flare;

      const targetDescentSpeed = isDiving ? 28 : isFlaring ? 4.8 : 13.5;
      const targetForwardSpeed = isDiving ? 26 : isFlaring ? 6 : 16;

      this.descentSpeed = THREE.MathUtils.damp(this.descentSpeed, targetDescentSpeed, 3, dt);
      this.forwardSpeed = THREE.MathUtils.damp(this.forwardSpeed, targetForwardSpeed, 3, dt);

      // Steering & banking
      this.rotation -= inputs.side * 1.6 * dt;
      this.rollAngle = THREE.MathUtils.damp(this.rollAngle, inputs.side * 0.35, 4, dt);
      this.pitchAngle = THREE.MathUtils.damp(this.pitchAngle, inputs.forward * 0.25, 4, dt);

      // Horizontal displacement based on heading
      const forwardX = -Math.sin(this.rotation) * this.forwardSpeed * dt;
      const forwardZ = -Math.cos(this.rotation) * this.forwardSpeed * dt;

      this.playerModel.root.position.x += forwardX;
      this.playerModel.root.position.z += forwardZ;
      this.altitude -= this.descentSpeed * dt;
      this.playerModel.root.position.y = this.altitude;

      // Canopy orientation
      this.playerModel.root.rotation.y = this.rotation;
      this.playerModel.root.rotation.z = this.rollAngle;
      this.playerModel.root.rotation.x = this.pitchAngle;

      if (this.playerParachute) {
        this.playerParachute.rotation.z = Math.sin(this.timer * 4) * 0.03 + this.rollAngle * 0.2;
        this.playerParachute.rotation.x = this.pitchAngle * 0.2;
      }

      // Check ground collision using terrain height
      const currentGroundY = this.getTerrainHeightFn(
        this.playerModel.root.position.x,
        this.playerModel.root.position.z
      );

      // Update fellow paratroopers gliding formation
      this.otherParatroopers.forEach((bot, idx) => {
        if (bot.isLanded) return;

        // Spread outward toward different sectors/compounds
        const driftAngle = (idx / this.otherParatroopers.length) * Math.PI * 2;
        const driftSpeed = 8 + (idx % 3) * 3;
        bot.model.root.position.x += (Math.cos(driftAngle) * driftSpeed + forwardX * 0.6) * dt;
        bot.model.root.position.z += (Math.sin(driftAngle) * driftSpeed + forwardZ * 0.6) * dt;

        bot.altitude -= (this.descentSpeed + ((idx % 3) - 1) * 1.5) * dt;
        bot.model.root.position.y = bot.altitude;
        bot.chute.position.copy(bot.model.root.position);

        const botGroundY = this.getTerrainHeightFn(bot.model.root.position.x, bot.model.root.position.z);
        if (bot.altitude <= botGroundY + 0.3) {
          bot.isLanded = true;
          bot.altitude = botGroundY;
          bot.model.root.position.y = botGroundY;

          // Detach bot chute and drop collapsed chute on ground
          this.scene.remove(bot.chute);
          const collapsedChute = createCollapsedParachuteModel();
          collapsedChute.position.set(bot.model.root.position.x, botGroundY, bot.model.root.position.z);
          this.scene.add(collapsedChute);
          this.droppedParachutes.push(collapsedChute);

          bot.model.setAnimation('run', 0);
        }
      });

      // Player Touchdown Check!
      if (this.altitude <= currentGroundY + 0.8) {
        this.phase = 'touchdown';
        this.timer = 0;
        this.altitude = currentGroundY;
        this.playerModel.root.position.y = currentGroundY;

        // Cutaway player parachute canopy and place collapsed model on ground
        if (this.playerParachute) {
          this.playerModel.root.remove(this.playerParachute);
          this.playerParachute = null;

          const collapsed = createCollapsedParachuteModel();
          collapsed.position.set(
            this.playerModel.root.position.x,
            currentGroundY,
            this.playerModel.root.position.z
          );
          this.scene.add(collapsed);
          this.droppedParachutes.push(collapsed);
        }

        // Play tactical forward landing roll
        this.playerModel.setAnimation('roll', 0.2);
        soundManager.playFootstep();
      }
    } else if (this.phase === 'touchdown') {
      // Perform landing roll animation before standing up
      this.playerModel.setAnimation('roll', Math.min(1.0, this.timer * 2.2));

      if (this.timer > 0.85) {
        this.complete();
      }
    }
  }

  private complete() {
    this.isActive = false;
    this.phase = 'landed';

    const landingPos = this.playerModel.root.position.clone();
    this.playerModel.setAnimation('idle', 0);
    this.playerModel.root.rotation.set(0, this.rotation, 0);

    // Prepare landed bot data for autonomous ground scavenging
    const landedBots: LandedParatrooperData[] = this.otherParatroopers.map((bot) => ({
      position: bot.model.root.position.clone(),
      rotationY: Math.random() * Math.PI * 2,
    }));

    // Remove temporary descent models (they are handed over to AI system)
    this.otherParatroopers.forEach((bot) => {
      this.scene.remove(bot.model.root);
      this.scene.remove(bot.chute);
    });
    this.otherParatroopers = [];

    if (this.plane) {
      this.scene.remove(this.plane.root);
      this.plane = null;
    }

    this.onLandingCallback(landingPos, landedBots);
  }

  public getDescentTelemetry(): DescentTelemetry {
    return {
      isActive: this.isActive,
      phase: this.phase,
      altitude: Math.max(0, Math.round(this.altitude)),
      verticalSpeed: Math.round(this.descentSpeed),
      forwardSpeed: Math.round(this.forwardSpeed),
      compassHeading: Math.round((((this.rotation * 180) / Math.PI) % 360 + 360) % 360),
      paratroopersCount: this.otherParatroopers.length + 1,
    };
  }

  public getStatus(): DescentTelemetry {
    return this.getDescentTelemetry();
  }

  public clear() {
    this.isActive = false;
    this.phase = 'plane';

    if (this.playerParachute) {
      this.playerModel.root.remove(this.playerParachute);
      this.playerParachute = null;
    }

    this.otherParatroopers.forEach((b) => {
      this.scene.remove(b.model.root);
      this.scene.remove(b.chute);
    });
    this.otherParatroopers = [];

    this.droppedParachutes.forEach((p) => this.scene.remove(p));
    this.droppedParachutes = [];

    if (this.plane) {
      this.scene.remove(this.plane.root);
      this.plane = null;
    }
  }
}
