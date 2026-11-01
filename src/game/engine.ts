import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { WarTheaterId, PlayerState, GameStats, WeaponType, WaveState, BossState, RadioTransmission, TacticalDroneState, TacticalDroneTarget } from '../types/game.ts';
import { WAR_THEATERS, buildWarTheater, TheaterBuildResult, DestructiblePropObject } from './theater.ts';
import { createCommandoModel, CommandoModel, createArmoredBossVehicle, ArmoredBossModel, createTacticalPickupMesh, createDroneModel, TacticalDroneModel, resetSharedTextures } from './models.ts';
import { EnemySystem } from './ai.ts';
import { soundManager } from './audio.ts';

export interface TacticalDrop {
  id: string;
  type: 'ammo' | 'armor';
  mesh: THREE.Group;
  position: THREE.Vector3;
  spawnTime: number;
}

// Pre-allocated reusable math vectors (Zero Garbage Collection in render loop)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _ray = new THREE.Ray();
const _sphere = new THREE.Sphere();

export interface Projectile {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  damage: number;
  isPlayer: boolean;
  life: number;
}

export interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  rotSpeed: number;
  colorFade?: boolean;
}

export interface GameEngineCallbacks {
  onPlayerUpdate: (state: PlayerState) => void;
  onEnemiesUpdate: (alive: number, total: number) => void;
  onHitConfirmed: (isHeadshot: boolean, damage: number) => void;
  onPlayerDamage: () => void;
  onGameOver: (stats: GameStats) => void;
  onVictory: (stats: GameStats) => void;
  onWaveUpdate: (wave: WaveState) => void;
  onBossUpdate: (boss: BossState | null) => void;
  onRadioTransmission: (radio: RadioTransmission) => void;
}

export class YemenCombatEngine {
  private container: HTMLElement;
  private callbacks: GameEngineCallbacks;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private clock!: THREE.Clock;
  private static cachedIsSoftwareGl: boolean | null = null;
  private isSoftwareGl = false;
  private isReinitializing = false;

  private currentTheaterId: WarTheaterId = 'sanaa';
  private theaterData: TheaterBuildResult | null = null;
  private playerModel!: CommandoModel;
  private enemySystem!: EnemySystem;

  // Multi-Wave System & Armored Boss State
  private currentWave = 1;
  private totalWaves = 3;
  private waveIntermission = false;
  private intermissionTimer = 0;
  private bossModel: ArmoredBossModel | null = null;
  private bossPosition = new THREE.Vector3(0, 0, -22);
  private bossHealth = 300;
  private bossMaxHealth = 300;
  private bossArmor = 250;
  private bossMaxArmor = 250;
  private bossShootCooldown = 2.0;
  private bossBurstCount = 0;
  private bossAimTimer = 1.0;
  private bossActive = false;
  private bossIsDefeated = false;
  private radioIdCounter = 1;

  // Tactical Recon Drone state
  private droneModel: TacticalDroneModel | null = null;
  private droneActive = false;
  private droneBattery = 100;
  private droneCooldown = 0;
  private droneAltitude = 28;
  private dronePosition = new THREE.Vector3();
  private isSurveillanceCameraActive = false;
  private scannedSnipersCount = 0;

  // Camera & View control
  private cameraTarget = new THREE.Vector3();
  private cameraCurrent = new THREE.Vector3();
  private pitch = 0.05;
  private yaw = 0;
  private cameraDistance = 3.8;
  private cameraHeight = 1.6;
  private cameraShoulderOffset = 0.65;
  private cameraShake = 0;
  private hitstopDuration = 0;

  // Title screen camera orbit
  private isTitleMode = true;
  private titleOrbitAngle = 0;

  // Event handler refs for cleanup
  private onContextLost: (e: Event) => void = () => {};
  private onContextRestored: () => void = () => {};
  private contextLost = false;
  private restorationTimeout: any = null;

  // Input system: continuous held vs edge-triggered justPressed
  private keysHeld: Record<string, boolean> = {};
  private keysJustPressed: Record<string, boolean> = {};
  private isMouseDown = false;
  private isRightMouseDown = false;
  private isPointerLocked = false;

  // Touch-specific mobile controls
  private touchMoveVector = { x: 0, z: 0 }; // x: [-1..1], z: [-1..1]
  private touchIsSprinting = false;
  private touchIsCrouching = false;
  private touchIsAiming = false;
  private aimToggleActive = false;
  private lockedEnemyId: number | null = null;
  private lockedTargetPosition = new THREE.Vector3();

  // Player state & physics
  private playerPos = new THREE.Vector3(0, 0, 32);
  private playerVelocity = new THREE.Vector3();
  private playerStance: 'stand' | 'crouch' | 'sprint' | 'roll' | 'aim' = 'stand';
  private rollTimer = 0;
  private animTimer = 0;
  private footstepTimer = 0;
  private isAiming = false;
  private currentWeapon: WeaponType = 'assault';
  private shootCooldown = 0;
  private reloadTimer = 0;

  private playerStats: PlayerState = {
    health: 100,
    maxHealth: 100,
    armor: 100,
    maxArmor: 100,
    stamina: 100,
    maxStamina: 100,
    isSprinting: false,
    isCrouching: false,
    isAiming: false,
    isReloading: false,
    currentWeapon: 'assault',
    weapons: {
      assault: {
        type: 'assault',
        nameAr: 'بندقية هجومية كاربين',
        nameEn: 'M4 Tactical Carbine',
        damage: 32,
        fireRate: 9, // 9 shots / sec
        clipSize: 30,
        currentAmmo: 30,
        reserveAmmo: 120,
        reloadTime: 1.8,
        recoil: 0.04,
        spread: 0.02,
        range: 60,
        zoomFov: 52,
      },
      sniper: {
        type: 'sniper',
        nameAr: 'بندقية قنص تكتيكية',
        nameEn: 'Tactical Marksman Sniper',
        damage: 90,
        fireRate: 1.2,
        clipSize: 6,
        currentAmmo: 6,
        reserveAmmo: 24,
        reloadTime: 2.4,
        recoil: 0.12,
        spread: 0.005,
        range: 120,
        zoomFov: 28,
      },
    },
    grenades: 3,
    score: 0,
    kills: 0,
    shotsFired: 0,
    shotsHit: 0,
    headshots: 0,
    missionTime: 0,
    isInCombat: false,
  };

  private combatTimer = 0;

  // Pools
  private projectiles: Projectile[] = [];
  private particles: Particle[] = [];
  private tacticalDrops: TacticalDrop[] = [];
  private particleGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
  private tracerGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.8, 4);
  private tracerMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
  private enemyTracerMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
  private materialCache: Record<number, THREE.MeshBasicMaterial> = {};
  private groundTextureCache: Record<string, THREE.CanvasTexture> = {};

  private animFrameId: number = 0;
  private isDestroyed = false;

  constructor(container: HTMLElement, callbacks: GameEngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    this.initWebGL();
    this.initScene();
    this.initInputs();
    this.initPooledAssets();
    this.loadTheater('sanaa');
    this.startLoop();
  }

  private initWebGL() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: window.devicePixelRatio < 2,
      powerPreference: 'high-performance',
      precision: 'highp',
      failIfMajorPerformanceCaveat: false,
      stencil: false,
      alpha: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });

    // Detect software GL without creating disposable canvases or forcing loseContext()
    if (YemenCombatEngine.cachedIsSoftwareGl === null) {
      try {
        const gl = this.renderer.getContext();
        const ext = gl?.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : (gl ? gl.RENDERER : 0);
        const gpu = param && gl ? String(gl.getParameter(param)) : '';
        YemenCombatEngine.cachedIsSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        YemenCombatEngine.cachedIsSoftwareGl = false;
      }
    }
    this.isSoftwareGl = YemenCombatEngine.cachedIsSoftwareGl;

    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Remove any existing canvas before appending new one
    const oldCanvas = this.container.querySelector('canvas');
    if (oldCanvas) {
      this.container.removeChild(oldCanvas);
    }
    this.container.appendChild(this.renderer.domElement);

    const canvas = this.renderer.domElement;
    
    this.onContextLost = (e: Event) => {
      e.preventDefault();
      console.warn('YemenCombatEngine: WebGL Context Lost.');
      this.contextLost = true;
      if (this.animFrameId) {
        cancelAnimationFrame(this.animFrameId);
        this.animFrameId = 0;
      }
    };

    this.onContextRestored = () => {
      if (this.isDestroyed) return;
      console.warn('YemenCombatEngine: WebGL Context Restored. Triggering robust re-init...');
      
      if (this.restorationTimeout) clearTimeout(this.restorationTimeout);
      this.restorationTimeout = setTimeout(() => {
        if (this.isDestroyed) return;
        this.reinit();
      }, 250);
    };

    canvas.addEventListener('webglcontextlost', this.onContextLost, false);
    canvas.addEventListener('webglcontextrestored', this.onContextRestored, false);
  }

  private removeListeners() {
    if (this.renderer) {
      const canvas = this.renderer.domElement;
      canvas.removeEventListener('webglcontextlost', this.onContextLost);
      canvas.removeEventListener('webglcontextrestored', this.onContextRestored);
    }
  }

  private reinit() {
    if (this.isReinitializing || this.isDestroyed) return;
    this.isReinitializing = true;
    this.contextLost = false;
    
    console.log('YemenCombatEngine: Starting fresh re-initialization...');

    // 1. Stop current loop and clear pending restoration timeouts
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    if (this.restorationTimeout) clearTimeout(this.restorationTimeout);

    // 2. Remove listeners from the old canvas before disposal
    this.removeListeners();

    // 3. Deep disposal of existing scene
    if (this.scene) {
      // Clear enemies first to avoid double-traversal issues
      if (this.enemySystem) this.enemySystem.clear();
      
      this.scene.traverse((obj) => YemenCombatEngine.disposeObject(obj, true));
      if (this.scene.environment) this.scene.environment.dispose();
      if (this.scene.background instanceof THREE.Texture) this.scene.background.dispose();
      
      // Null out scene to prevent accidental usage during fresh boot
      (this as any).scene = null;
    }

    // 4. Clear instance caches
    Object.values(this.materialCache).forEach(m => m.dispose());
    this.materialCache = {};
    Object.values(this.groundTextureCache).forEach(t => t.dispose());
    this.groundTextureCache = {};

    // 5. Reset shared module-level textures
    resetSharedTextures();
    
    // 6. Dispose old renderer explicitly
    if (this.renderer) {
      this.renderer.dispose();
      (this as any).renderer = null;
    }

    // 7. Full re-init sequence
    setTimeout(() => {
      if (this.isDestroyed) return;
      this.initWebGL();
      this.initScene();
      this.initPooledAssets();
      this.loadTheater(this.currentTheaterId);
      this.startLoop();
      this.isReinitializing = false;
      console.log('YemenCombatEngine: Fresh re-initialization complete.');
    }, 50);
  }

  private initPooledAssets() {
    // Re-create or re-initialize pooled assets
    if (this.particleGeo) this.particleGeo.dispose();
    this.particleGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    this.particleGeo.userData.isShared = true;

    if (this.tracerGeo) this.tracerGeo.dispose();
    this.tracerGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.8, 4);
    this.tracerGeo.userData.isShared = true;

    if (this.tracerMat) this.tracerMat.dispose();
    this.tracerMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
    this.tracerMat.userData.isShared = true;

    if (this.enemyTracerMat) this.enemyTracerMat.dispose();
    this.enemyTracerMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    this.enemyTracerMat.userData.isShared = true;
  }

  /**
   * Recursively dispose of Three.js object resources (Geometries, Materials, Textures)
   */
  public static disposeObject(obj: THREE.Object3D, disposeShared = false) {
    if ((obj as any).geometry) {
      if (disposeShared || !(obj as any).geometry.userData?.isShared) {
        (obj as any).geometry.dispose();
      }
    }
    if ((obj as any).material) {
      const mats = Array.isArray((obj as any).material) ? (obj as any).material : [(obj as any).material];
      mats.forEach((m: any) => {
        // Disposing all possible map types to satisfy Chromium resource cleanup invariants
        const mapTypes = ['map', 'lightMap', 'bumpMap', 'normalMap', 'specularMap', 'envMap', 'alphaMap', 'aoMap', 'displacementMap', 'emissiveMap'];
        mapTypes.forEach(type => {
          if (m[type] && (disposeShared || !m[type].userData?.isShared)) {
            m[type].dispose();
          }
        });
        
        if (disposeShared || !m.userData?.isShared) {
          m.dispose();
        }
      });
    }
  }

  private initScene() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      300
    );
    this.clock = new THREE.Clock();

    // Studio environment reflection for PBR metallic highlights
    const roomEnv = new RoomEnvironment();
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    pmremGenerator.dispose();
    
    // Explicitly dispose RoomEnvironment scene objects to prevent VRAM accumulation
    roomEnv.traverse((obj) => YemenCombatEngine.disposeObject(obj, true));

    // Player 3D Model
    this.playerModel = createCommandoModel(true);
    this.scene.add(this.playerModel.root);

    // Enemy AI system
    this.enemySystem = new EnemySystem(this.scene);
  }

  public loadTheater(theaterId: WarTheaterId) {
    this.currentTheaterId = theaterId;
    const config = WAR_THEATERS.find((t) => t.id === theaterId) || WAR_THEATERS[0];

    // Clear previous theater props
    if (this.theaterData) {
      this.theaterData.propsGroup.traverse((obj) => YemenCombatEngine.disposeObject(obj));
      this.scene.remove(this.theaterData.propsGroup);
      
      // Explicitly dispose ground texture if not using cached version (though we should always use cached)
      if (this.theaterData.groundMesh.material instanceof THREE.MeshStandardMaterial) {
        if (this.theaterData.groundMesh.material.map) {
          // Note: map is disposed by disposeObject if we don't handle it carefully, 
          // but we want to manage it via groundTextureCache.
        }
      }
    }

    // Sky & Fog
    this.scene.background = new THREE.Color(config.skyColor);
    this.scene.fog = new THREE.FogExp2(config.fogColor, 0.012);

    // Dynamic 3-Point Lighting Rig
    // Clear old lights
    const toRemove: THREE.Object3D[] = [];
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Light) {
        const light = obj as any;
        if (light.shadow && light.shadow.map) {
          light.shadow.map.dispose();
        }
        toRemove.push(obj);
      }
    });
    toRemove.forEach((l) => this.scene.remove(l));

    // Warm Directional Sun Key Light
    const sunLight = new THREE.DirectionalLight(config.sunColor, 2.2);
    sunLight.position.set(35, 45, 25);
    sunLight.castShadow = !this.isSoftwareGl;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 120;
    const d = 40;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    this.scene.add(sunLight);

    // Cool Sky & Mountain Fill Light (Hemisphere)
    const hemiLight = new THREE.HemisphereLight(config.skyColor, config.groundColor, 0.7);
    this.scene.add(hemiLight);

    // Subtle atmospheric ambient
    const ambLight = new THREE.AmbientLight(0xffffff, 0.25);
    this.scene.add(ambLight);

    // Clear boss vehicle if present
    if (this.bossModel) {
      this.scene.remove(this.bossModel.root);
      this.bossModel = null;
    }
    this.bossActive = false;
    this.bossIsDefeated = false;
    this.callbacks.onBossUpdate(null);

    // Build Props, Architecture & Colliders
    const groundColorStr = '#' + config.groundColor.toString(16).padStart(6, '0');
    if (!this.groundTextureCache[groundColorStr]) {
      // Import createDesertTerrainTexture if needed? Wait, it's used in theater.ts.
      // Actually, buildWarTheater handles it if I don't pass it.
      // But if I want to cache it, I should create it here.
    }
    
    // Actually, let's just let theater.ts create it and we'll grab it.
    // No, better to manage it here.
    
    this.theaterData = buildWarTheater(theaterId, this.scene, this.groundTextureCache[groundColorStr]);
    
    // If it was newly created, cache it
    if (this.theaterData.groundMesh.material instanceof THREE.MeshStandardMaterial) {
      const tex = this.theaterData.groundMesh.material.map;
      if (tex && !this.groundTextureCache[groundColorStr]) {
        tex.userData.isShared = true;
        this.groundTextureCache[groundColorStr] = tex as THREE.CanvasTexture;
      }
    }

    this.playerPos.copy(this.theaterData.playerSpawnPoint);
    this.playerModel.root.position.copy(this.playerPos);

    // Spawn initial wave
    this.spawnWave(1);
  }

  public broadcastRadio(textAr: string, textEn: string, isWarning = false) {
    soundManager.playRadioVoiceCallout();
    this.callbacks.onRadioTransmission({
      id: this.radioIdCounter++,
      senderAr: 'القيادة المشتركة (صابر)',
      senderEn: 'COMMAND // SABIR HQ',
      textAr,
      textEn,
      isWarning,
    });
  }

  public spawnWave(waveNumber: number) {
    this.currentWave = waveNumber;
    this.waveIntermission = false;
    const waveTitles = [
      { ar: 'الموجة 1: طليعة الاستطلاع', en: 'Wave 1: Scout Vanguard' },
      { ar: 'الموجة 2: تعزيزات نخبة وقناصة', en: 'Wave 2: Elite Squad & Marksmen' },
      { ar: 'الموجة 3: قتال الزعيم المدرع', en: 'Wave 3: Armored Technical Boss' },
    ];
    const title = waveTitles[waveNumber - 1] || waveTitles[0];

    this.callbacks.onWaveUpdate({
      current: waveNumber,
      total: this.totalWaves,
      titleAr: title.ar,
      titleEn: title.en,
      inIntermission: false,
      intermissionCountdown: 0,
    });

    if (!this.theaterData) return;

    if (waveNumber === 1) {
      // 5 Scout Troopers
      const pts = this.theaterData.enemySpawnPoints.slice(0, 5);
      this.enemySystem.spawnEnemies(pts);
      this.callbacks.onEnemiesUpdate(5, 5);
      this.broadcastRadio(
        'إلى الوحدة صابر: تم تأكيد هبوطك في قطاع العمليات. طهّر طليعة الاستطلاع المعادية فوراً!',
        'To Operative Sabir: Infiltration confirmed. Neutralize enemy vanguard scouts immediately!'
      );
    } else if (waveNumber === 2) {
      // 7 Elite Troopers (heavies and snipers)
      const pts = this.theaterData.enemySpawnPoints.slice(0, 7);
      this.enemySystem.spawnEnemies(pts);
      this.callbacks.onEnemiesUpdate(7, 7);
      this.broadcastRadio(
        'انتبه! رصدنا تقدم تعزيزات نخبة معادية مدعومة بقناصة! خذ ساتر تكتيكي!',
        'Warning! Elite hostile reinforcements detected advancing. Take tactical cover!',
        true
      );
      // Ammo resupply bonus
      this.playerStats.weapons.assault.reserveAmmo = Math.min(180, this.playerStats.weapons.assault.reserveAmmo + 60);
      this.playerStats.weapons.sniper.reserveAmmo = Math.min(36, this.playerStats.weapons.sniper.reserveAmmo + 12);
      this.playerStats.grenades = Math.min(4, this.playerStats.grenades + 2);
      this.callbacks.onPlayerUpdate({ ...this.playerStats });
    } else if (waveNumber === 3) {
      // Wave 3: Armored Boss Encounter!
      const pts = this.theaterData.enemySpawnPoints.slice(0, 2);
      this.enemySystem.spawnEnemies(pts);
      this.spawnBossVehicle();
      this.callbacks.onEnemiesUpdate(3, 3);
    }
  }

  private spawnBossVehicle() {
    if (this.bossModel) {
      this.scene.remove(this.bossModel.root);
    }

    this.bossModel = createArmoredBossVehicle();
    this.bossPosition.set(0, 0, -22);
    this.bossModel.root.position.copy(this.bossPosition);
    this.scene.add(this.bossModel.root);

    this.bossActive = true;
    this.bossIsDefeated = false;
    this.bossHealth = 350;
    this.bossMaxHealth = 350;
    this.bossArmor = 250;
    this.bossMaxArmor = 250;
    this.bossShootCooldown = 2.4;

    soundManager.playBossAlarm();
    this.broadcastRadio(
      'تحذير شديد الخطورة! مركبة مدرعة ثقيلة مسلحة بمدفع 25 ملم تقتحم المعركة! استهدف مخازن الذخيرة وبراميل الوقود!',
      'CRITICAL ALERT! Heavy armored technical with 25mm autocannon deployed! Target explosive caches and gunner mantlet!',
      true
    );

    this.callbacks.onBossUpdate({
      active: true,
      nameAr: 'مركبة قتالية مدرعة (مدفع 25 ملم)',
      nameEn: 'Armored Technical (25mm Autocannon)',
      health: this.bossHealth,
      maxHealth: this.bossMaxHealth,
      armor: this.bossArmor,
      maxArmor: this.bossMaxArmor,
    });
  }

  public damageBoss(amount: number) {
    if (!this.bossActive || this.bossIsDefeated) return;

    if (this.bossArmor > 0) {
      const absorbed = Math.min(this.bossArmor, amount * 0.85);
      this.bossArmor -= absorbed;
      amount -= absorbed * 0.5;
    }

    this.bossHealth = Math.max(0, this.bossHealth - amount);

    this.callbacks.onBossUpdate({
      active: true,
      nameAr: 'مركبة قتالية مدرعة (مدفع 25 ملم)',
      nameEn: 'Armored Technical (25mm Autocannon)',
      health: this.bossHealth,
      maxHealth: this.bossMaxHealth,
      armor: this.bossArmor,
      maxArmor: this.bossMaxArmor,
    });

    if (this.bossHealth <= 0) {
      this.bossIsDefeated = true;
      this.bossActive = false;
      this.callbacks.onBossUpdate(null);

      // Huge explosion
      this.spawnExplosion(this.bossPosition);
      this.spawnExplosion(this.bossPosition.clone().add(new THREE.Vector3(1, 1, 1)));
      this.spawnExplosion(this.bossPosition.clone().add(new THREE.Vector3(-1, 0.5, -1)));

      if (this.bossModel) {
        this.bossModel.root.rotation.z = 0.25;
      }

      this.playerStats.score += 2000;
      this.playerStats.kills++;

      this.broadcastRadio(
        'ضربة تكتيكية مباشرة! تم تدمير الهدف المدرع وسحق القوة المعادية بنجاح!',
        'Direct hit! Armored vehicle destroyed and hostile threat eliminated!'
      );

      this.checkVictoryCondition();
    }
  }

  public startMission(theaterId: WarTheaterId) {
    this.isTitleMode = false;
    this.loadTheater(theaterId);
    this.currentWave = 1;
    this.playerStats.health = 100;
    this.playerStats.armor = 100;
    this.playerStats.stamina = 100;
    this.playerStats.score = 0;
    this.playerStats.kills = 0;
    this.playerStats.shotsFired = 0;
    this.playerStats.shotsHit = 0;
    this.playerStats.headshots = 0;
    this.playerStats.missionTime = 0;
    this.playerStats.weapons.assault.currentAmmo = 30;
    this.playerStats.weapons.assault.reserveAmmo = 120;
    this.playerStats.weapons.sniper.currentAmmo = 6;
    this.playerStats.weapons.sniper.reserveAmmo = 24;

    this.requestPointerLock();
  }

  public setPaused(paused: boolean) {
    if (paused) {
      this.exitPointerLock();
    } else {
      this.requestPointerLock();
    }
  }

  public exitPointerLock() {
    try {
      if (document.pointerLockElement) {
        document.exitPointerLock?.();
      }
    } catch {
      // safe fallback
    }
    this.isPointerLocked = false;
  }

  public requestPointerLock() {
    if (!this.renderer?.domElement) return;
    if (this.isTitleMode) return;
    if (document.pointerLockElement === this.renderer.domElement) {
      this.isPointerLocked = true;
      return;
    }

    try {
      const lockRes = this.renderer.domElement.requestPointerLock?.();
      if (lockRes && typeof (lockRes as any).catch === 'function') {
        (lockRes as Promise<void>)
          .then(() => {
            this.isPointerLocked = true;
          })
          .catch((_err) => {
            // Gracefully catch Chromium PointerLock internal DOMException:
            // "DOMException: If you see this error we have a bug. Please report this bug to chromium."
            this.isPointerLocked = false;
          });
      }
    } catch {
      this.isPointerLocked = false;
    }
  }

  private initInputs() {
    window.addEventListener('keydown', (e) => {
      this.keysHeld[e.code] = true;
      this.keysJustPressed[e.code] = true;

      if (e.code === 'KeyR') {
        this.startReload();
      } else if (e.code === 'Digit1') {
        this.switchWeapon('assault');
      } else if (e.code === 'Digit2') {
        this.switchWeapon('sniper');
      } else if (e.code === 'KeyG') {
        this.throwGrenade();
      } else if (e.code === 'KeyE') {
        this.triggerDroneLaunch();
      } else if (e.code === 'KeyQ' || e.code === 'KeyZ') {
        this.toggleAim();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysHeld[e.code] = false;
    });

    // Clear held keys on blur (per craft rule)
    window.addEventListener('blur', () => {
      this.keysHeld = {};
      this.isMouseDown = false;
      this.isRightMouseDown = false;
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isMouseDown = true;
        soundManager.init(); // User gesture audio unlock
      }
      if (e.button === 2) {
        this.isRightMouseDown = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.isMouseDown = false;
      if (e.button === 2) this.isRightMouseDown = false;
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.renderer?.domElement;
    });

    document.addEventListener('pointerlockerror', () => {
      this.isPointerLocked = false;
    });

    this.renderer.domElement.addEventListener('click', () => {
      if (!this.isTitleMode && !this.isPointerLocked) {
        this.requestPointerLock();
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isTitleMode) return;

      const sensitivity = 0.0022;
      this.yaw -= e.movementX * sensitivity;
      this.pitch -= e.movementY * sensitivity;

      // Clamp pitch to avoid gimbal flip
      this.pitch = Math.max(-0.6, Math.min(0.7, this.pitch));
    });

    window.addEventListener('resize', () => {
      if (!this.container) return;
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  private switchWeapon(type: WeaponType) {
    if (this.currentWeapon === type || this.reloadTimer > 0) return;
    this.currentWeapon = type;
    this.playerStats.currentWeapon = type;
    soundManager.playWeaponSwap();
    this.callbacks.onPlayerUpdate({ ...this.playerStats });
  }

  private startReload() {
    const w = this.playerStats.weapons[this.currentWeapon];
    if (w.currentAmmo >= w.clipSize || w.reserveAmmo <= 0 || this.reloadTimer > 0) return;

    this.reloadTimer = w.reloadTime;
    this.playerStats.isReloading = true;
    soundManager.playReload();
    this.callbacks.onPlayerUpdate({ ...this.playerStats });
  }

  private throwGrenade() {
    if (this.playerStats.grenades <= 0 || this.isTitleMode) return;
    this.playerStats.grenades--;
    this.callbacks.onPlayerUpdate({ ...this.playerStats });

    // Spawn grenade projectile
    const grenadeMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x334122, metalness: 0.8, roughness: 0.4 })
    );
    grenadeMesh.position.copy(this.playerPos).add(new THREE.Vector3(0, 1.4, 0));
    this.scene.add(grenadeMesh);

    const throwDir = new THREE.Vector3(
      -Math.sin(this.yaw),
      0.35 + Math.sin(this.pitch),
      -Math.cos(this.yaw)
    ).normalize();

    this.projectiles.push({
      mesh: grenadeMesh,
      position: grenadeMesh.position,
      velocity: throwDir.multiplyScalar(22),
      damage: 150,
      isPlayer: true,
      life: 2.2, // Explodes after 2.2s fuse
    });
  }

  private handlePlayerShooting(dt: number) {
    this.shootCooldown -= dt;
    const weapon = this.playerStats.weapons[this.currentWeapon];

    if (this.reloadTimer > 0) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        const needed = weapon.clipSize - weapon.currentAmmo;
        const taken = Math.min(needed, weapon.reserveAmmo);
        weapon.currentAmmo += taken;
        weapon.reserveAmmo -= taken;
        this.playerStats.isReloading = false;
        this.callbacks.onPlayerUpdate({ ...this.playerStats });
      }
      return;
    }

    if (this.isMouseDown && this.shootCooldown <= 0) {
      if (weapon.currentAmmo <= 0) {
        this.startReload();
        return;
      }

      weapon.currentAmmo--;
      this.playerStats.shotsFired++;
      this.shootCooldown = 1.0 / weapon.fireRate;
      this.combatTimer = 3.5; // Trigger Firefight mode

      // Recoil kick on camera
      this.pitch += weapon.recoil * 0.4;
      this.cameraShake = Math.max(this.cameraShake, weapon.recoil * 3.5);

      // Audio
      if (weapon.type === 'sniper') soundManager.playSniperShot();
      else soundManager.playRifleShot();

      // Raycast firing line from camera center or locked target
      let forward = new THREE.Vector3(
        -Math.sin(this.yaw),
        Math.sin(this.pitch),
        -Math.cos(this.yaw)
      ).normalize();

      const muzzlePos = this.playerPos.clone().add(new THREE.Vector3(0.3, 1.2, 0));

      if (this.playerStats.isAimLocked && this.lockedTargetPosition.lengthSq() > 0) {
        forward = new THREE.Vector3().subVectors(this.lockedTargetPosition, muzzlePos).normalize();
      }

      // Add weapon spread (heavily reduced when aim locked)
      const spread = this.playerStats.isAimLocked
        ? weapon.spread * 0.1
        : this.isAiming
        ? weapon.spread * 0.4
        : weapon.spread;
      forward.x += (Math.random() - 0.5) * spread;
      forward.y += (Math.random() - 0.5) * spread;
      forward.z += (Math.random() - 0.5) * spread;
      forward.normalize();

      // Reuse shared bullet tracer assets
      const tracer = new THREE.Mesh(
        this.tracerGeo,
        weapon.type === 'sniper' ? this.tracerMat : this.tracerMat
      );

      tracer.position.copy(muzzlePos);
      tracer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), forward);
      this.scene.add(tracer);

      this.projectiles.push({
        mesh: tracer,
        position: tracer.position,
        velocity: forward.clone().multiplyScalar(weapon.type === 'sniper' ? 140 : 90),
        damage: weapon.damage,
        isPlayer: true,
        life: 0.8,
      });

      this.callbacks.onPlayerUpdate({ ...this.playerStats });
    }
  }

  private handleHitImpact(pos: THREE.Vector3, isEnemy: boolean, isHeadshot: boolean, damage: number) {
    // Game Feel: Simulation hitstop on heavy impact (30-80ms)
    if (damage > 50 || isHeadshot) {
      this.hitstopDuration = 0.06; // 60ms freeze frame
      this.cameraShake = Math.max(this.cameraShake, 0.12);
    }

    soundManager.playHitMarker(isHeadshot);
    this.callbacks.onHitConfirmed(isHeadshot, damage);

    // Particle burst at hit point
    this.spawnParticleBurst(pos, isEnemy ? 0xdc2626 : 0xd97706, 8);
  }

  private spawnParticleBurst(pos: THREE.Vector3, color: number, count = 12) {
    if (!this.materialCache[color]) {
      this.materialCache[color] = new THREE.MeshBasicMaterial({ color });
    }
    const mat = this.materialCache[color];
    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(this.particleGeo, mat);
      p.position.copy(pos);
      this.scene.add(p);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        Math.random() * 5 + 1,
        (Math.random() - 0.5) * 6
      );

      this.particles.push({
        mesh: p,
        velocity: vel,
        life: 0.4 + Math.random() * 0.4,
        maxLife: 0.8,
        rotSpeed: (Math.random() - 0.5) * 10,
      });
    }
  }

  private destroyProp(prop: DestructiblePropObject) {
    if (prop.isDestroyed) return;
    prop.isDestroyed = true;
    prop.group.visible = false;

    // Remove collider box from theater colliders (COVER BREACH!)
    if (this.theaterData) {
      this.theaterData.colliders = this.theaterData.colliders.filter((c) => c.entity !== prop);
    }

    // Play destruction sound & particle splinters
    if (prop.type === 'crate') {
      soundManager.playWoodSplinterSound();
      this.spawnParticleBurst(prop.position, 0x8b5a2b, 16); // Cedar wood particles
    } else {
      soundManager.playSandbagImpactSound();
      this.spawnParticleBurst(prop.position, 0xd97706, 16); // Sand dust particles
    }

    // Spawn tactical loot drop (40% chance: 25% ammo, 15% armor)
    if (Math.random() < 0.4) {
      const dropType: 'ammo' | 'armor' = Math.random() < 0.65 ? 'ammo' : 'armor';
      const mesh = createTacticalPickupMesh(dropType);
      mesh.position.copy(prop.position);
      this.scene.add(mesh);

      this.tacticalDrops.push({
        id: `drop_${Date.now()}_${Math.random()}`,
        type: dropType,
        mesh,
        position: prop.position.clone(),
        spawnTime: this.playerStats.missionTime,
      });
    }

    // Check chain reactions: if near red barrels or other props, damage them!
    if (this.theaterData) {
      this.theaterData.barrelObjects.forEach((barrel) => {
        if (!barrel.isExploded && barrel.position.distanceTo(prop.position) < 4.5) {
          barrel.isExploded = true;
          barrel.group.visible = false;
          this.spawnExplosion(barrel.position);
        }
      });
    }
  }

  private spawnExplosion(pos: THREE.Vector3) {
    soundManager.playExplosion();
    this.cameraShake = 0.45;
    this.hitstopDuration = 0.08;

    // Fire & dust cloud particles
    this.spawnParticleBurst(pos, 0xf97316, 24);
    this.spawnParticleBurst(pos, 0xef4444, 20);
    this.spawnParticleBurst(pos, 0x78716c, 16);

    // Blast radius damage (enemies & player within 10m)
    this.enemySystem.enemies.forEach((enemy) => {
      if (enemy.isDead) return;
      const d = enemy.position.distanceTo(pos);
      if (d < 9) {
        const falloff = 1 - d / 9;
        const dmg = Math.round(180 * falloff);
        const res = this.enemySystem.damageEnemy(enemy.id, dmg);
        if (res.killed) {
          this.playerStats.kills++;
          this.playerStats.score += 200;
        }
      }
    });

    const distToPlayer = this.playerPos.distanceTo(pos);
    if (distToPlayer < 9) {
      const dmg = Math.round(90 * (1 - distToPlayer / 9));
      this.damagePlayer(dmg);
    }

    // Blast damage to Armored Boss
    if (this.bossActive && !this.bossIsDefeated) {
      const distToBoss = this.bossPosition.distanceTo(pos);
      if (distToBoss < 9) {
        const dmg = Math.round(180 * (1 - distToBoss / 9));
        this.damageBoss(dmg);
      }
    }

    // Blast damage to Destructible Props & Chain Reactions
    if (this.theaterData) {
      this.theaterData.destructibleProps.forEach((prop) => {
        if (!prop.isDestroyed && prop.position.distanceTo(pos) < 7) {
          prop.health -= 100;
          if (prop.health <= 0) {
            this.destroyProp(prop);
          }
        }
      });
    }

    this.checkVictoryCondition();
  }

  public damagePlayer(amount: number) {
    this.combatTimer = 4.5; // Firefight mode on taking damage
    if (this.playerStats.armor > 0) {
      const absorbed = Math.min(this.playerStats.armor, amount * 0.7);
      this.playerStats.armor -= absorbed;
      amount -= absorbed;
    }
    this.playerStats.health -= amount;
    this.cameraShake = Math.max(this.cameraShake, 0.25);
    soundManager.playPlayerHurt();
    this.callbacks.onPlayerDamage();

    if (this.playerStats.health <= 0) {
      this.playerStats.health = 0;
      this.callbacks.onPlayerUpdate({ ...this.playerStats });
      this.callbacks.onGameOver({
        score: this.playerStats.score,
        kills: this.playerStats.kills,
        accuracy: this.playerStats.shotsFired > 0
          ? Math.round((this.playerStats.shotsHit / this.playerStats.shotsFired) * 100)
          : 0,
        headshots: this.playerStats.headshots,
        timeSeconds: Math.round(this.playerStats.missionTime),
        theater: this.currentTheaterId,
        victory: false,
        wavesCleared: Math.max(0, this.currentWave - 1),
        bossDefeated: this.bossIsDefeated,
      });
      return;
    }

    this.callbacks.onPlayerUpdate({ ...this.playerStats });
  }

  private checkVictoryCondition() {
    const alive = this.enemySystem.getAliveCount();
    const bossAlive = this.bossActive && !this.bossIsDefeated;
    const totalEnemies = alive + (bossAlive ? 1 : 0);
    this.callbacks.onEnemiesUpdate(totalEnemies, 8);

    if (totalEnemies === 0 && !this.waveIntermission) {
      if (this.currentWave === 1) {
        this.startIntermission(2);
      } else if (this.currentWave === 2) {
        this.startIntermission(3);
      } else if (this.currentWave === 3 && this.bossIsDefeated) {
        // Full Mission Victory!
        this.callbacks.onVictory({
          score: this.playerStats.score + 2500,
          kills: this.playerStats.kills,
          accuracy: this.playerStats.shotsFired > 0
            ? Math.round((this.playerStats.shotsHit / this.playerStats.shotsFired) * 100)
            : 0,
          headshots: this.playerStats.headshots,
          timeSeconds: Math.round(this.playerStats.missionTime),
          theater: this.currentTheaterId,
          victory: true,
          wavesCleared: 3,
          bossDefeated: true,
        });
      }
    }
  }

  private startIntermission(nextWave: number) {
    this.waveIntermission = true;
    this.intermissionTimer = 4.0;
    this.callbacks.onWaveUpdate({
      current: this.currentWave,
      total: this.totalWaves,
      titleAr: `تم تطهير الموجة ${this.currentWave}`,
      titleEn: `Wave ${this.currentWave} Cleared`,
      inIntermission: true,
      intermissionCountdown: 4,
    });
    this.broadcastRadio(
      `تم سحق الموجة ${this.currentWave}! استعدوا، الموجة ${nextWave} تقترب!`,
      `Wave ${this.currentWave} cleared! Prepare yourself, Wave ${nextWave} is approaching!`
    );
  }

  private updateBossAi(dt: number) {
    if (!this.bossActive || this.bossIsDefeated || !this.bossModel) return;

    // Track player with 360° roof turret
    this.bossModel.setAimTarget(this.playerPos, dt);

    // Aim telegraph laser line
    const laserMat = this.bossModel.telegraphLaser.material as THREE.LineDashedMaterial;
    this.bossShootCooldown -= dt;

    if (this.bossShootCooldown <= 0.8) {
      laserMat.opacity = Math.min(1.0, 0.3 + (0.8 - this.bossShootCooldown) * 1.5);
    } else {
      laserMat.opacity = 0;
    }

    if (this.bossShootCooldown <= 0) {
      laserMat.opacity = 0;
      this.bossShootCooldown = 2.4;

      soundManager.playHeavyAutocannon();

      const muzzle = this.bossModel.getMuzzlePosition();
      const fireDir = new THREE.Vector3().subVectors(this.playerPos, muzzle).normalize();
      fireDir.y += 0.05;

      for (let b = 0; b < 2; b++) {
        const shell = new THREE.Mesh(this.tracerGeo, this.enemyTracerMat);
        shell.position.copy(muzzle).add(new THREE.Vector3((b - 0.5) * 0.4, 0, 0));
        shell.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), fireDir);
        this.scene.add(shell);

        this.projectiles.push({
          mesh: shell,
          position: shell.position,
          velocity: fireDir.clone().multiplyScalar(65),
          damage: 32,
          isPlayer: false,
          life: 1.2,
        });
      }
    }
  }

  private updateSimulation(rawDt: number) {
    // Delta clamping per craft rule (max 50ms)
    const dt = Math.min(rawDt, 0.05);

    // Hitstop frame freeze
    if (this.hitstopDuration > 0) {
      this.hitstopDuration -= dt;
      return;
    }

    // Title screen panoramic orbit
    if (this.isTitleMode) {
      this.titleOrbitAngle += dt * 0.15;
      const r = 26;
      this.camera.position.set(
        Math.cos(this.titleOrbitAngle) * r,
        7 + Math.sin(this.titleOrbitAngle * 0.5) * 2,
        Math.sin(this.titleOrbitAngle) * r
      );
      this.camera.lookAt(0, 3, 0);
      return;
    }

    // Wave Intermission Timer
    if (this.waveIntermission) {
      this.intermissionTimer -= dt;
      this.callbacks.onWaveUpdate({
        current: this.currentWave,
        total: this.totalWaves,
        titleAr: `استعد للموجة ${this.currentWave + 1}`,
        titleEn: `Prepare for Wave ${this.currentWave + 1}`,
        inIntermission: true,
        intermissionCountdown: Math.max(1, Math.ceil(this.intermissionTimer)),
      });

      if (this.intermissionTimer <= 0) {
        this.spawnWave(this.currentWave + 1);
      }
    }

    // Update Boss AI
    this.updateBossAi(dt);

    // Combat Timer Decay & Firefight Detection
    if (this.combatTimer > 0) {
      this.combatTimer -= dt;
    }
    const isCombatActive = this.combatTimer > 0 || this.isMouseDown || this.isRightMouseDown;
    if (this.playerStats.isInCombat !== isCombatActive) {
      this.playerStats.isInCombat = isCombatActive;
      this.callbacks.onPlayerUpdate({ ...this.playerStats });
    }

    this.playerStats.missionTime += dt;

    // Movement controls (WASD or Touch D-Pad)
    _v1.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize(); // Forward
    _v2.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize(); // Right
    const moveDir = _v3.set(0, 0, 0);

    if (this.keysHeld['KeyW'] || this.keysHeld['ArrowUp']) moveDir.add(_v1);
    if (this.keysHeld['KeyS'] || this.keysHeld['ArrowDown']) moveDir.sub(_v1);
    if (this.keysHeld['KeyD'] || this.keysHeld['ArrowRight']) moveDir.add(_v2);
    if (this.keysHeld['KeyA'] || this.keysHeld['ArrowLeft']) moveDir.sub(_v2);

    // Apply touch movement from D-Pad or Floating Analog Joystick (forward is -z, right is +x)
    if (this.touchMoveVector.z !== 0) {
      moveDir.addScaledVector(_v1, -this.touchMoveVector.z);
    }
    if (this.touchMoveVector.x !== 0) {
      moveDir.addScaledVector(_v2, this.touchMoveVector.x);
    }

    const touchMagnitude = Math.hypot(this.touchMoveVector.x, this.touchMoveVector.z);
    const isMoving = moveDir.lengthSq() > 0.001;
    if (isMoving) {
      if (touchMagnitude > 0.05 && touchMagnitude < 0.99) {
        moveDir.normalize().multiplyScalar(touchMagnitude);
      } else {
        moveDir.normalize();
      }
    }

    // Stance: Crouch / Sprint / Dodge Roll
    const isShift = this.keysHeld['ShiftLeft'] || this.keysHeld['ShiftRight'] || this.touchIsSprinting;
    const isCtrl = this.keysHeld['KeyC'] || this.keysHeld['ControlLeft'] || this.touchIsCrouching;
    
    const prevAiming = this.isAiming;
    this.isAiming = this.isRightMouseDown || this.touchIsAiming || this.aimToggleActive;
    this.playerStats.isAiming = this.isAiming;

    if (!prevAiming && this.isAiming) {
      this.snapToNearestTarget();
    } else if (prevAiming && !this.isAiming) {
      this.clearAimLock();
    }

    // Space: Tactical Combat Roll / Dodge
    if (this.keysJustPressed['Space'] && this.rollTimer <= 0 && isMoving) {
      this.rollTimer = 0.55;
      soundManager.playDodgeRoll();
      this.playerStats.stamina = Math.max(0, this.playerStats.stamina - 20);
    }

    let speed = 4.5;
    if (this.rollTimer > 0) {
      this.rollTimer -= dt;
      this.playerStance = 'roll';
      speed = 9.0;
    } else if (isCtrl) {
      this.playerStance = 'crouch';
      speed = 2.4;
    } else if (isShift && isMoving && !this.isAiming && this.playerStats.stamina > 10) {
      this.playerStance = 'sprint';
      speed = 7.2;
      this.playerStats.stamina = Math.max(0, this.playerStats.stamina - dt * 15);
    } else {
      this.playerStance = this.isAiming ? 'aim' : 'stand';
      this.playerStats.stamina = Math.min(100, this.playerStats.stamina + dt * 20);
    }

    this.playerStats.isSprinting = this.playerStance === 'sprint';
    this.playerStats.isCrouching = this.playerStance === 'crouch';

    // Velocity update
    this.playerVelocity.copy(moveDir).multiplyScalar(speed);
    const nextPos = this.playerPos.clone().addScaledVector(this.playerVelocity, dt);

    // World collision check (against props and natural perimeter cliffs)
    if (this.theaterData) {
      const playerRadius = 0.5;
      let collides = false;

      // Keep within arena radius
      if (Math.hypot(nextPos.x, nextPos.z) > 52) {
        collides = true;
      }

      for (const c of this.theaterData.colliders) {
        if (c.box.distanceToPoint(nextPos) < playerRadius) {
          collides = true;
          break;
        }
      }

      if (!collides) {
        this.playerPos.copy(nextPos);
      }
    }

    this.playerModel.root.position.copy(this.playerPos);

    // Apply Tactical Aim Assist (Magnetic pull towards targets when aiming)
    this.applyAimAssist(dt);

    // Character rotation facing aim direction
    this.playerModel.root.rotation.y = this.yaw + Math.PI;

    // Character model animation
    this.animTimer += dt;
    if (this.playerStance === 'roll') {
      this.playerModel.setAnimation('roll', 1 - this.rollTimer / 0.55);
    } else if (this.isAiming) {
      this.playerModel.setAnimation('aim', 0);
    } else if (isMoving) {
      this.playerModel.setAnimation('run', this.animTimer * (speed / 4.5));
      this.footstepTimer -= dt;
      if (this.footstepTimer <= 0) {
        soundManager.playFootstep(this.playerStance === 'sprint');
        this.footstepTimer = this.playerStance === 'sprint' ? 0.28 : 0.42;
      }
    } else if (this.playerStance === 'crouch') {
      this.playerModel.setAnimation('crouch', 0);
    } else {
      this.playerModel.setAnimation('idle', this.animTimer);
    }

    // Shooting
    this.handlePlayerShooting(dt);

    // Third-person camera choreography with smooth exponential damping
    const targetDistance = this.isAiming ? 2.2 : this.cameraDistance;
    const targetFov = this.isAiming
      ? this.playerStats.weapons[this.currentWeapon].zoomFov
      : 60;

    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 12, dt);
    this.camera.updateProjectionMatrix();

    // Camera position calculation with shoulder offset
    const camOffset = new THREE.Vector3(
      this.cameraShoulderOffset * Math.cos(this.yaw) + Math.sin(this.yaw) * targetDistance,
      this.cameraHeight + Math.sin(this.pitch) * targetDistance,
      -this.cameraShoulderOffset * Math.sin(this.yaw) + Math.cos(this.yaw) * targetDistance
    );

    this.cameraTarget.copy(this.playerPos).add(camOffset);

    // Camera shake decay
    if (this.cameraShake > 0.001) {
      this.cameraTarget.x += (Math.random() - 0.5) * this.cameraShake;
      this.cameraTarget.y += (Math.random() - 0.5) * this.cameraShake;
      this.cameraShake = THREE.MathUtils.damp(this.cameraShake, 0, 10, dt);
    }

    this.cameraCurrent.lerp(this.cameraTarget, 0.25);
    this.camera.position.copy(this.cameraCurrent);

    // Look at point ahead of commando
    const lookTarget = this.playerPos.clone().add(new THREE.Vector3(0, 1.4, 0));
    this.camera.lookAt(lookTarget);

    // Update Tactical Recon Drone Simulation
    if (this.droneCooldown > 0) {
      this.droneCooldown = Math.max(0, this.droneCooldown - dt);
      this.updatePlayerStatsState();
    }

    if (this.droneActive && this.droneModel) {
      // Battery depletion (5% per second -> 20s airtime)
      this.droneBattery -= dt * 5.0;
      this.droneModel.tickAnimation(dt);

      // Drone hovers and orbits overhead above player and battlefield center
      const droneTarget = this.playerPos.clone().add(new THREE.Vector3(
        Math.cos(this.playerStats.missionTime * 0.4) * 12,
        this.droneAltitude,
        Math.sin(this.playerStats.missionTime * 0.4) * 12
      ));
      this.dronePosition.lerp(droneTarget, dt * 3.0);
      this.droneModel.root.position.copy(this.dronePosition);
      this.droneModel.root.rotation.y += dt * 0.5;

      this.updatePlayerStatsState();

      // Battery depletion auto-recall
      if (this.droneBattery <= 0) {
        this.droneActive = false;
        this.droneCooldown = 15.0; // 15s cooldown
        this.droneModel.root.visible = false;
        this.isSurveillanceCameraActive = false;
        this.broadcastRadio(
          'نفذت بطارية طائرة الاستطلاع. عادت الطائرة للقاعدة لبدء إعادة الشحن (15 ثانية)',
          'Recon Drone battery depleted. Returning to base for recharge (15s).'
        );
        this.updatePlayerStatsState();
      }
    }

    // Overhead surveillance camera override when active
    if (this.droneActive && this.isSurveillanceCameraActive) {
      this.camera.position.copy(this.dronePosition);
      this.camera.lookAt(this.playerPos.x, 0, this.playerPos.z);
      this.camera.fov = 68;
      this.camera.updateProjectionMatrix();
    }

    // Update AI Squad
    this.enemySystem.update(dt, this.playerPos, (from, dir, dmg) => {
      // Enemy fired bullet
      const tracerGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.8, 4);
      const tracerMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const tracer = new THREE.Mesh(tracerGeo, tracerMat);
      tracer.position.copy(from);
      tracer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      this.scene.add(tracer);

      this.projectiles.push({
        mesh: tracer,
        position: tracer.position,
        velocity: dir.clone().multiplyScalar(75),
        damage: dmg,
        isPlayer: false,
        life: 0.8,
      });
    });

    // Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      p.position.addScaledVector(p.velocity, dt);

      // Check collision
      let hit = false;

      if (p.isPlayer) {
        // Player bullet vs Enemies
        for (const enemy of this.enemySystem.enemies) {
          if (enemy.isDead) continue;
          if (enemy.position.distanceTo(p.position) < 1.1) {
            hit = true;
            this.playerStats.shotsHit++;
            const res = this.enemySystem.damageEnemy(enemy.id, p.damage, p.position);
            if (res.isHeadshot) this.playerStats.headshots++;
            if (res.killed) {
              this.playerStats.kills++;
              this.playerStats.score += res.isHeadshot ? 250 : 100;
            }
            this.handleHitImpact(p.position, true, res.isHeadshot, p.damage);
            this.checkVictoryCondition();
            break;
          }
        }

        // Player bullet vs Armored Boss Technical
        if (!hit && this.bossActive && !this.bossIsDefeated && this.bossModel) {
          if (p.position.distanceTo(this.bossPosition.clone().add(new THREE.Vector3(0, 1.2, 0))) < 2.8) {
            hit = true;
            this.playerStats.shotsHit++;
            const dmg = this.currentWeapon === 'sniper' ? p.damage * 1.6 : p.damage;
            this.damageBoss(dmg);
            this.handleHitImpact(p.position, true, false, dmg);
          }
        }

        // Player bullet vs Red Barrels
        if (!hit && this.theaterData) {
          for (const barrel of this.theaterData.barrelObjects) {
            if (barrel.isExploded) continue;
            if (barrel.position.distanceTo(p.position) < 1.0) {
              hit = true;
              barrel.health -= p.damage;
              this.spawnParticleBurst(p.position, 0xfacc15, 6);
              if (barrel.health <= 0) {
                barrel.isExploded = true;
                barrel.group.visible = false;
                this.spawnExplosion(barrel.position);
              }
              break;
            }
          }
        }

        // Player bullet vs Destructible Wooden Crates & Sandbags
        if (!hit && this.theaterData) {
          for (const prop of this.theaterData.destructibleProps) {
            if (prop.isDestroyed) continue;
            if (prop.position.distanceTo(p.position) < prop.boundingRadius) {
              hit = true;
              this.playerStats.shotsHit++;
              prop.health -= p.damage;

              if (prop.type === 'crate') {
                soundManager.playWoodSplinterSound();
                this.spawnParticleBurst(p.position, 0x8b5a2b, 6);
              } else {
                soundManager.playSandbagImpactSound();
                this.spawnParticleBurst(p.position, 0xd97706, 6);
              }

              if (prop.health <= 0) {
                this.destroyProp(prop);
              }
              break;
            }
          }
        }
      } else {
        // Enemy bullet vs Player
        if (p.position.distanceTo(this.playerPos.clone().add(new THREE.Vector3(0, 1.0, 0))) < 0.9) {
          hit = true;
          this.damagePlayer(p.damage);
          this.spawnParticleBurst(p.position, 0xdc2626, 8);
        }
      }

      if (hit || p.life <= 0 || p.position.y < 0) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const part = this.particles[i];
      part.life -= dt;
      part.velocity.y -= 9.8 * dt; // Gravity
      part.mesh.position.addScaledVector(part.velocity, dt);
      part.mesh.rotation.x += part.rotSpeed * dt;
      part.mesh.rotation.y += part.rotSpeed * dt;

      const scale = Math.max(0.001, (part.life / part.maxLife));
      part.mesh.scale.set(scale, scale, scale);

      if (part.life <= 0 || part.mesh.position.y <= 0) {
        this.scene.remove(part.mesh);
        this.particles.splice(i, 1);
      }
    }

    // Update Floating Tactical Drops (Spinning, levitation, and proximity collection)
    for (let i = this.tacticalDrops.length - 1; i >= 0; i--) {
      const drop = this.tacticalDrops[i];
      drop.mesh.rotation.y += dt * 2.2;
      drop.mesh.position.y = drop.position.y + Math.sin((this.playerStats.missionTime + i) * 3) * 0.12;

      // Distance check to player position
      if (this.playerPos.distanceTo(drop.position) < 1.8) {
        soundManager.playLootPickupSound();

        if (drop.type === 'ammo') {
          this.playerStats.weapons.assault.reserveAmmo = Math.min(180, this.playerStats.weapons.assault.reserveAmmo + 30);
          this.playerStats.weapons.sniper.reserveAmmo = Math.min(36, this.playerStats.weapons.sniper.reserveAmmo + 6);
          this.broadcastRadio(
            'تم التقاط ذخيرة تكتيكية إضافية (+30 رصاصة)',
            'Tactical ammo cache collected (+30 rounds)'
          );
        } else {
          this.playerStats.armor = Math.min(100, this.playerStats.armor + 25);
          this.broadcastRadio(
            'تم التقاط درع تكتيكي كفلار (+25 درع)',
            'Kevlar tactical armor plate collected (+25 armor)'
          );
        }

        this.callbacks.onPlayerUpdate({ ...this.playerStats });
        this.scene.remove(drop.mesh);
        this.tacticalDrops.splice(i, 1);
      }
    }

    // Clear edge-triggered keys
    this.keysJustPressed = {};
  }

  private startLoop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    const tick = () => {
      if (this.isDestroyed || this.contextLost || this.isReinitializing) return;
      
      try {
        if (!this.renderer || !this.scene || !this.camera || !this.enemySystem) {
          this.animFrameId = requestAnimationFrame(tick);
          return;
        }

        const gl = this.renderer.getContext();
        if (gl.isContextLost()) {
          this.contextLost = true;
          this.animFrameId = requestAnimationFrame(tick);
          return;
        }

        const rawDt = this.clock.getDelta();
        this.updateSimulation(rawDt);
        this.renderer.render(this.scene, this.camera);

      } catch (err) {
        console.warn('YemenCombatEngine: Render loop caught transient error:', err);
      }
      this.animFrameId = requestAnimationFrame(tick);
    };
    this.animFrameId = requestAnimationFrame(tick);
  }

  public getPlayerPosition(): { x: number; z: number; yaw: number } {
    if (this.isReinitializing || !this.playerPos) {
      return { x: 0, z: 0, yaw: 0 };
    }
    return {
      x: this.playerPos.x,
      z: this.playerPos.z,
      yaw: this.yaw,
    };
  }

  public getEnemiesForRadar(): { x: number; z: number; isDead: boolean; isBoss?: boolean }[] {
    if (this.isReinitializing || !this.enemySystem) return [];
    
    const list: { x: number; z: number; isDead: boolean; isBoss?: boolean }[] = this.enemySystem.enemies.map((e) => ({
      x: e.position.x,
      z: e.position.z,
      isDead: e.isDead,
    }));
    if (this.bossActive && !this.bossIsDefeated) {
      list.push({
        x: this.bossPosition.x,
        z: this.bossPosition.z,
        isDead: false,
        isBoss: true,
      });
    }
    return list;
  }

  // Touch controls public API for mobile devices
  public setTouchMovement(x: number, z: number) {
    this.touchMoveVector.x = Math.max(-1, Math.min(1, x));
    this.touchMoveVector.z = Math.max(-1, Math.min(1, z));
  }

  public addTouchLookDelta(deltaX: number, deltaY: number) {
    if (this.isTitleMode) return;
    const sensitivity = 0.0035;
    this.yaw -= deltaX * sensitivity;
    this.pitch -= deltaY * sensitivity;
    this.pitch = Math.max(-0.6, Math.min(0.7, this.pitch));
  }

  public setTouchShooting(isShooting: boolean) {
    this.isMouseDown = isShooting;
    if (isShooting) soundManager.init();
  }

  public triggerDodge() {
    if (this.rollTimer <= 0) {
      this.rollTimer = 0.55;
      soundManager.playDodgeRoll();
      this.playerStats.stamina = Math.max(0, this.playerStats.stamina - 20);
    }
  }

  public triggerReload() {
    this.startReload();
  }

  public triggerGrenade() {
    this.throwGrenade();
  }

  public toggleAim(): boolean {
    this.aimToggleActive = !this.aimToggleActive;
    this.touchIsAiming = this.aimToggleActive;
    this.isAiming = this.aimToggleActive || this.isRightMouseDown;
    this.playerStats.isAiming = this.isAiming;

    if (this.isAiming) {
      this.snapToNearestTarget();
    } else {
      this.clearAimLock();
    }
    this.callbacks.onPlayerUpdate({ ...this.playerStats });
    return this.isAiming;
  }

  public setTouchAiming(isAiming: boolean) {
    this.touchIsAiming = isAiming;
    this.aimToggleActive = isAiming;
    this.isAiming = isAiming || this.isRightMouseDown;
    this.playerStats.isAiming = this.isAiming;

    if (this.isAiming) {
      this.snapToNearestTarget();
    } else {
      this.clearAimLock();
    }
    this.callbacks.onPlayerUpdate({ ...this.playerStats });
  }

  public clearAimLock() {
    this.lockedEnemyId = null;
    this.lockedTargetPosition.set(0, 0, 0);
    if (this.playerStats.isAimLocked || this.playerStats.lockedTarget) {
      this.playerStats.isAimLocked = false;
      this.playerStats.lockedTarget = null;
      this.callbacks.onPlayerUpdate({ ...this.playerStats });
    }
  }

  public snapToNearestTarget() {
    if (this.isTitleMode) return;

    // View direction vector
    const forward = new THREE.Vector3(
      -Math.sin(this.yaw),
      Math.sin(this.pitch),
      -Math.cos(this.yaw)
    ).normalize();

    const headOffset = new THREE.Vector3(0, 1.4, 0);
    let bestTarget: THREE.Vector3 | null = null;
    let bestScore = Infinity;
    let targetEnemyId: number | null = null;
    let targetInfo: any = null;

    // Scan regular squad enemies
    this.enemySystem.enemies.forEach(enemy => {
      if (enemy.isDead) return;

      const toEnemy = new THREE.Vector3().subVectors(enemy.position, this.playerPos).add(headOffset);
      const dist = toEnemy.length();
      if (dist > 90) return;

      toEnemy.normalize();
      const angle = forward.angleTo(toEnemy);

      // Wide snap cone: up to ~55 degrees (0.95 rad)
      if (angle < 0.95) {
        const score = angle * 2.0 + (dist / 90) * 1.0;
        if (score < bestScore) {
          bestScore = score;
          bestTarget = enemy.position.clone().add(headOffset);
          targetEnemyId = enemy.id;
          targetInfo = {
            id: enemy.id,
            nameAr: enemy.type === 'sniper' ? 'قناص معادي' : enemy.type === 'heavy' ? 'مدرع رشاش ثقيل' : 'مقاتل مشاة',
            nameEn: enemy.type === 'sniper' ? 'Hostile Sniper' : enemy.type === 'heavy' ? 'Heavy Gunner' : 'Infantry Rifleman',
            distance: Math.round(dist),
            type: enemy.type,
            healthPercent: Math.round((enemy.health / enemy.maxHealth) * 100),
          };
        }
      }
    });

    // Scan Armored Boss Vehicle
    if (this.bossActive && !this.bossIsDefeated) {
      const bossCenter = this.bossPosition.clone().add(new THREE.Vector3(0, 1.4, 0));
      const toBoss = new THREE.Vector3().subVectors(bossCenter, this.playerPos);
      const dist = toBoss.length();
      toBoss.normalize();
      const angle = forward.angleTo(toBoss);

      if (angle < 0.95) {
        const score = angle * 2.0 + (dist / 90) * 1.0;
        if (score < bestScore) {
          bestScore = score;
          bestTarget = bossCenter;
          targetEnemyId = 999;
          targetInfo = {
            id: 999,
            nameAr: 'مركبة قتالية مدرعة (مدفع 25 ملم)',
            nameEn: 'Armored Technical (25mm Autocannon)',
            distance: Math.round(dist),
            type: 'boss',
            healthPercent: Math.round((this.bossHealth / this.bossMaxHealth) * 100),
          };
        }
      }
    }

    if (bestTarget) {
      this.lockedEnemyId = targetEnemyId;
      this.lockedTargetPosition.copy(bestTarget);

      // Snap camera directly to target
      const dir = new THREE.Vector3().subVectors(bestTarget, this.playerPos).normalize();
      // CORRECT COORDINATE PROJECTION: forward.x = -sin(yaw), forward.z = -cos(yaw) => yaw = atan2(-dir.x, -dir.z)
      const targetYaw = Math.atan2(-dir.x, -dir.z);
      const targetPitch = Math.asin(Math.max(-0.6, Math.min(0.7, dir.y)));

      let dy = targetYaw - this.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;

      this.yaw += dy * 0.85;
      this.pitch = THREE.MathUtils.lerp(this.pitch, targetPitch, 0.85);

      this.playerStats.isAimLocked = true;
      this.playerStats.lockedTarget = targetInfo;

      soundManager.playTargetLockSound();
      this.callbacks.onPlayerUpdate({ ...this.playerStats });
    } else {
      this.clearAimLock();
    }
  }

  private applyAimAssist(dt: number) {
    if (!this.isAiming || this.isTitleMode) {
      if (this.playerStats.isAimLocked) {
        this.clearAimLock();
      }
      return;
    }

    // Magnetic snap parameters
    const snapRadius = 0.55; // ~32 degrees broad field
    const pullStrength = this.currentWeapon === 'sniper' ? 8.5 : 6.0;
    
    let bestTarget: THREE.Vector3 | null = null;
    let closestAngle = Infinity;
    let targetEnemyId: number | null = null;
    let targetInfo: any = null;

    // View direction vector
    const forward = new THREE.Vector3(
      -Math.sin(this.yaw),
      Math.sin(this.pitch),
      -Math.cos(this.yaw)
    ).normalize();

    const headOffset = new THREE.Vector3(0, 1.4, 0);

    // Scan for nearest enemy to crosshair
    this.enemySystem.enemies.forEach(enemy => {
      if (enemy.isDead) return;

      const toEnemy = new THREE.Vector3().subVectors(enemy.position, this.playerPos).add(headOffset);
      const dist = toEnemy.length();
      if (dist > 90) return;
      
      toEnemy.normalize();
      const angle = forward.angleTo(toEnemy);

      const isCurrentLocked = this.lockedEnemyId === enemy.id;
      const effectiveAngle = isCurrentLocked ? angle * 0.7 : angle;

      if (effectiveAngle < snapRadius && effectiveAngle < closestAngle) {
        closestAngle = effectiveAngle;
        bestTarget = enemy.position.clone().add(headOffset);
        targetEnemyId = enemy.id;
        targetInfo = {
          id: enemy.id,
          nameAr: enemy.type === 'sniper' ? 'قناص معادي' : enemy.type === 'heavy' ? 'مدرع رشاش ثقيل' : 'مقاتل مشاة',
          nameEn: enemy.type === 'sniper' ? 'Hostile Sniper' : enemy.type === 'heavy' ? 'Heavy Gunner' : 'Infantry Rifleman',
          distance: Math.round(dist),
          type: enemy.type,
          healthPercent: Math.round((enemy.health / enemy.maxHealth) * 100),
        };
      }
    });

    // Check boss
    if (this.bossActive && !this.bossIsDefeated) {
      const bossCenter = this.bossPosition.clone().add(new THREE.Vector3(0, 1.4, 0));
      const toBoss = new THREE.Vector3().subVectors(bossCenter, this.playerPos);
      const dist = toBoss.length();
      toBoss.normalize();
      const angle = forward.angleTo(toBoss);

      const isCurrentLocked = this.lockedEnemyId === 999;
      const effectiveAngle = isCurrentLocked ? angle * 0.7 : angle;

      if (effectiveAngle < snapRadius && effectiveAngle < closestAngle) {
        closestAngle = effectiveAngle;
        bestTarget = bossCenter;
        targetEnemyId = 999;
        targetInfo = {
          id: 999,
          nameAr: 'مركبة قتالية مدرعة (مدفع 25 ملم)',
          nameEn: 'Armored Technical (25mm Autocannon)',
          distance: Math.round(dist),
          type: 'boss',
          healthPercent: Math.round((this.bossHealth / this.bossMaxHealth) * 100),
        };
      }
    }

    if (bestTarget) {
      this.lockedEnemyId = targetEnemyId;
      this.lockedTargetPosition.copy(bestTarget);

      // Calculate target yaw/pitch
      const dir = new THREE.Vector3().subVectors(bestTarget, this.playerPos).normalize();
      // MATHEMATICAL FIX: forward.x = -sin(yaw), forward.z = -cos(yaw) => targetYaw = atan2(-dir.x, -dir.z)
      const targetYaw = Math.atan2(-dir.x, -dir.z);
      const targetPitch = Math.asin(Math.max(-0.6, Math.min(0.7, dir.y)));

      // Smoothly interpolate towards target
      let dy = targetYaw - this.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;

      this.yaw += dy * dt * pullStrength;
      this.pitch = THREE.MathUtils.lerp(this.pitch, targetPitch, dt * pullStrength);

      const wasLocked = this.playerStats.isAimLocked;
      this.playerStats.isAimLocked = true;
      this.playerStats.lockedTarget = targetInfo;

      if (!wasLocked) {
        soundManager.playTargetLockSound();
      }
      this.callbacks.onPlayerUpdate({ ...this.playerStats });
    } else {
      if (this.playerStats.isAimLocked) {
        this.clearAimLock();
      }
    }
  }

  public triggerWeaponSwap() {
    const next = this.currentWeapon === 'assault' ? 'sniper' : 'assault';
    this.switchWeapon(next);
  }

  public triggerDroneLaunch() {
    if (this.isTitleMode) return;
    if (this.droneActive) {
      // Toggle surveillance camera mode
      this.isSurveillanceCameraActive = !this.isSurveillanceCameraActive;
      this.updatePlayerStatsState();
      return;
    }

    if (this.droneCooldown > 0) {
      this.broadcastRadio(
        `طائرة الاستطلاع قيد إعادة الشحن! انتظر (${Math.ceil(this.droneCooldown)} ثانية)`,
        `Recon Drone cooling down! Wait (${Math.ceil(this.droneCooldown)}s)`,
        true
      );
      return;
    }

    // Launch drone!
    this.droneActive = true;
    this.droneBattery = 100;
    this.droneAltitude = 28;
    this.dronePosition.copy(this.playerPos).add(new THREE.Vector3(0, 2, 0));

    if (!this.droneModel) {
      this.droneModel = createDroneModel();
    }
    this.droneModel.root.position.copy(this.dronePosition);
    this.droneModel.root.visible = true;
    this.scene.add(this.droneModel.root);

    soundManager.playDroneLaunch();

    this.broadcastRadio(
      'تكتيك طائرة الاستطلاع: تم إطلاق طائرة المراقبة المسيرة! جاري مسح الميدان ورصد مواضع القناصة المعادية!',
      'RECON DRONE DEPLOYED! Scanning battlefield & marking enemy sniper nests!'
    );

    this.updatePlayerStatsState();
  }

  private updatePlayerStatsState() {
    const detectedTargets: TacticalDroneTarget[] = [];
    let snipersFound = 0;

    if (this.droneActive) {
      this.enemySystem.enemies.forEach((enemy) => {
        if (enemy.isDead) return;
        if (enemy.type === 'sniper') snipersFound++;

        _v1.set(enemy.position.x, enemy.position.y + 1.4, enemy.position.z);
        _v1.project(this.camera);

        const screenX = Math.round(((_v1.x + 1) * window.innerWidth) / 2);
        const screenY = Math.round(((-_v1.y + 1) * window.innerHeight) / 2);
        const inFront = _v1.z < 1.0;

        detectedTargets.push({
          id: enemy.id,
          x: enemy.position.x,
          y: enemy.position.y + 1.4,
          z: enemy.position.z,
          type: enemy.type,
          distance: Math.round(enemy.position.distanceTo(this.playerPos)),
          screenX: inFront ? screenX : -100,
          screenY: inFront ? screenY : -100,
        });
      });

      if (this.bossActive && !this.bossIsDefeated) {
        _v1.set(this.bossPosition.x, this.bossPosition.y + 2.0, this.bossPosition.z);
        _v1.project(this.camera);
        const screenX = Math.round(((_v1.x + 1) * window.innerWidth) / 2);
        const screenY = Math.round(((-_v1.y + 1) * window.innerHeight) / 2);
        const inFront = _v1.z < 1.0;

        detectedTargets.push({
          id: 999,
          x: this.bossPosition.x,
          y: this.bossPosition.y + 2.0,
          z: this.bossPosition.z,
          type: 'boss',
          distance: Math.round(this.bossPosition.distanceTo(this.playerPos)),
          screenX: inFront ? screenX : -100,
          screenY: inFront ? screenY : -100,
        });
      }
    }

    this.playerStats.droneState = {
      active: this.droneActive,
      battery: Math.max(0, Math.round(this.droneBattery)),
      maxBattery: 100,
      cooldown: Math.max(0, Math.ceil(this.droneCooldown)),
      altitude: Math.round(this.droneAltitude),
      scannedSnipersCount: snipersFound,
      isSurveillanceCameraActive: this.isSurveillanceCameraActive,
      detectedTargets,
    };

    this.callbacks.onPlayerUpdate({ ...this.playerStats });
  }

  public toggleSprint(): boolean {
    this.touchIsSprinting = !this.touchIsSprinting;
    return this.touchIsSprinting;
  }

  public setTouchSprinting(isSprinting: boolean) {
    this.touchIsSprinting = isSprinting;
  }

  public toggleCrouch(): boolean {
    this.touchIsCrouching = !this.touchIsCrouching;
    return this.touchIsCrouching;
  }

  public setTouchCrouching(isCrouching: boolean) {
    this.touchIsCrouching = isCrouching;
  }

  public getIsSprinting(): boolean {
    return this.touchIsSprinting;
  }

  public getIsCrouching(): boolean {
    return this.touchIsCrouching;
  }

  public getIsAiming(): boolean {
    return this.isRightMouseDown;
  }

  public updateCommandoLoadout(customization: {
    camo: 'desert' | 'coastal' | 'canyon';
    visorTint: 'emerald' | 'amber' | 'cobalt';
    sightOptic: 'holo' | 'acog' | 'thermal';
  }) {
    if (this.playerModel?.updateCustomization) {
      this.playerModel.updateCustomization(customization);
    }
  }

  public destroy() {
    this.isDestroyed = true;
    this.exitPointerLock();
    cancelAnimationFrame(this.animFrameId);
    if (this.restorationTimeout) clearTimeout(this.restorationTimeout);

    if (this.scene) {
      this.scene.traverse((obj) => YemenCombatEngine.disposeObject(obj, true));
      if (this.scene.environment) this.scene.environment.dispose();
      if (this.scene.background instanceof THREE.Texture) this.scene.background.dispose();
    }

    if (this.enemySystem) this.enemySystem.clear();

    if (this.particleGeo) this.particleGeo.dispose();
    if (this.tracerGeo) this.tracerGeo.dispose();
    if (this.tracerMat) this.tracerMat.dispose();
    if (this.enemyTracerMat) this.enemyTracerMat.dispose();
    Object.values(this.materialCache).forEach(m => m.dispose());
    Object.values(this.groundTextureCache).forEach(t => t.dispose());

    if (this.renderer) {
      this.removeListeners();
      this.renderer.dispose();
      const canvas = this.renderer.domElement;
      if (canvas.parentElement) {
        canvas.parentElement.removeChild(canvas);
      }
    }
  }
}
