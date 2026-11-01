import * as THREE from 'three';
import { createTransportPlaneModel, createParachuteModel, createCommandoModel, CommandoModel, TransportPlaneModel } from './models.ts';
import { soundManager } from './audio.ts';

/**
 * DescentSystem: Manages the interactive paratrooping phase.
 * Features: High-altitude transport plane, cargo ramp jump, controlled descent, 
 * and multi-soldier formation based on subscriber count.
 */
export class DescentSystem {
  private scene: THREE.Scene;
  private plane: TransportPlaneModel | null = null;
  private playerModel: CommandoModel;
  private playerParachute: THREE.Group | null = null;
  private otherParatroopers: { model: CommandoModel; chute: THREE.Group; velocity: THREE.Vector3 }[] = [];
  
  private isActive = false;
  private phase: 'plane' | 'jump' | 'falling' | 'landing' = 'plane';
  private altitude = 800; // Starting altitude (meters)
  private planeSpeed = 60; // Horizontal speed (m/s)
  private descentSpeed = 0; // Vertical speed (m/s)
  private rotation = 0;
  
  private timer = 0;
  private onLanding: () => void;

  constructor(scene: THREE.Scene, playerModel: CommandoModel, onLanding: () => void) {
    this.scene = scene;
    this.playerModel = playerModel;
    this.onLanding = onLanding;
  }

  /**
   * Start the descent phase with a specific number of paratroopers (subscribers)
   */
  public start(subscriberCount: number) {
    this.isActive = true;
    this.phase = 'plane';
    this.altitude = 800;
    this.timer = 0;
    this.descentSpeed = 0;
    this.rotation = 0;

    // Create Transport Plane
    this.plane = createTransportPlaneModel();
    this.plane.root.position.set(0, this.altitude, 100);
    this.scene.add(this.plane.root);

    // Position player inside plane
    this.playerModel.root.position.set(0, -1, -8); // Near the cargo ramp
    this.plane.root.add(this.playerModel.root);
    this.playerModel.setAnimation('idle', 0);

    // Create other paratroopers based on subscribers
    // Limit to reasonable number for performance (e.g. 15 max visual bots)
    const visualBots = Math.min(subscriberCount - 1, 12);
    for (let i = 0; i < visualBots; i++) {
      const bot = createCommandoModel(false);
      const chute = createParachuteModel();
      chute.visible = false;
      
      // Offset bots in cargo hold
      bot.root.position.set((i % 2 === 0 ? 1 : -1) * 0.8, -1, -9 - (i * 0.6));
      this.plane.root.add(bot.root);
      
      this.otherParatroopers.push({
        model: bot,
        chute,
        velocity: new THREE.Vector3(),
      });
    }

    soundManager.playRadioVoiceCallout(); // "Green light, go!" feel
  }

  public jump() {
    if (this.phase !== 'plane') return;
    this.phase = 'jump';
    this.timer = 0;
    
    // Animate cargo door opening
    // In our model, cargoDoor is a group
    if (this.plane) {
      this.plane.cargoDoor.rotation.x = -Math.PI / 3;
    }

    soundManager.playWindWhistle(); // Start wind sound
  }

  public update(dt: number, inputs: { forward: number; side: number; yaw: number }) {
    if (!this.isActive) return;

    this.timer += dt;

    if (this.phase === 'plane') {
      // Plane flyover
      if (this.plane) {
        this.plane.root.position.z -= this.planeSpeed * dt;
        this.plane.tickAnimation(dt);
        
        // Auto-jump after 5 seconds if not triggered
        if (this.timer > 5) {
          this.jump();
        }
      }
    } else if (this.phase === 'jump') {
      // Transition from plane to falling
      if (this.timer > 0.8) {
        this.phase = 'falling';
        
        // Detach player from plane
        const worldPos = new THREE.Vector3();
        this.playerModel.root.getWorldPosition(worldPos);
        this.scene.add(this.playerModel.root);
        this.playerModel.root.position.copy(worldPos);
        
        // Add parachute
        this.playerParachute = createParachuteModel();
        this.playerModel.root.add(this.playerParachute);
        
        // Detach others with slight delay
        this.otherParatroopers.forEach((bot, idx) => {
          setTimeout(() => {
            const bPos = new THREE.Vector3();
            bot.model.root.getWorldPosition(bPos);
            this.scene.add(bot.model.root);
            bot.model.root.position.copy(bPos);
            this.scene.add(bot.chute);
            bot.chute.position.copy(bPos);
            bot.chute.visible = true;
          }, idx * 150);
        });

        // Hide plane after it flies away
        setTimeout(() => {
          if (this.plane) {
            this.scene.remove(this.plane.root);
            this.plane = null;
          }
        }, 3000);
      }
    } else if (this.phase === 'falling') {
      // Descent physics
      // Terminal velocity logic
      const targetDescentSpeed = inputs.forward > 0 ? 25 : 12; // Dive vs Float
      this.descentSpeed = THREE.MathUtils.damp(this.descentSpeed, targetDescentSpeed, 2, dt);
      
      this.altitude -= this.descentSpeed * dt;
      this.rotation -= inputs.side * 1.5 * dt;

      // Update Player position
      this.playerModel.root.position.y = this.altitude;
      this.playerModel.root.rotation.y = this.rotation;
      
      // Subtle tilt based on movement
      this.playerModel.root.rotation.z = THREE.MathUtils.damp(this.playerModel.root.rotation.z, inputs.side * 0.3, 4, dt);
      this.playerModel.root.rotation.x = THREE.MathUtils.damp(this.playerModel.root.rotation.x, inputs.forward * 0.2, 4, dt);

      // Update Parachute flap animation
      if (this.playerParachute) {
        this.playerParachute.rotation.z = Math.sin(this.timer * 4) * 0.02;
        this.playerParachute.scale.setScalar(1 + Math.sin(this.timer * 2) * 0.01);
      }

      // Update other paratroopers
      this.otherParatroopers.forEach((bot, idx) => {
        // Simple AI drift
        const driftX = Math.sin(this.timer * 0.5 + idx) * 0.5;
        const driftZ = Math.cos(this.timer * 0.4 + idx) * 0.5;
        
        bot.model.root.position.y -= (this.descentSpeed + Math.sin(idx) * 2) * dt;
        bot.model.root.position.x += driftX * dt;
        bot.model.root.position.z += driftZ * dt;
        
        bot.chute.position.copy(bot.model.root.position);
      });

      // Landing check
      if (this.altitude < 1.5) {
        this.phase = 'landing';
        this.timer = 0;
      }
    } else if (this.phase === 'landing') {
      // Landing animation
      this.playerModel.setAnimation('roll', Math.min(this.timer * 2, 1));
      
      if (this.timer > 1.2) {
        this.complete();
      }
    }
  }

  private complete() {
    this.isActive = false;
    
    // Cleanup
    if (this.playerParachute) {
      this.playerModel.root.remove(this.playerParachute);
      this.playerParachute = null;
    }
    
    this.otherParatroopers.forEach((bot) => {
      this.scene.remove(bot.model.root);
      this.scene.remove(bot.chute);
    });
    this.otherParatroopers = [];

    if (this.plane) {
      this.scene.remove(this.plane.root);
      this.plane = null;
    }

    this.onLanding();
  }

  public getStatus() {
    return {
      isActive: this.isActive,
      altitude: this.altitude,
      phase: this.phase,
    };
  }
}
