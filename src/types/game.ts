export interface TacticalSimulationState {
  weather: 'clear' | 'dust_storm' | 'rain' | 'night';
  visibilityKm: number;
  suppression: number;
  threatLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  routeRisk: number;
  firefightPressure: number;
  friendlyCasualtyEstimate: number;
  enemyCasualtyEstimate: number;
  timeOnTarget: number;
  tacticalScore: number;
}

export type WarTheaterId = 'sanaa' | 'mandeeb' | 'hadramaut' | 'snow' | 'forest';

export interface WarTheaterConfig {
  id: WarTheaterId;
  nameAr: string;
  nameEn: string;
  regionAr: string;
  regionEn: string;
  descriptionAr: string;
  descriptionEn: string;
  skyColor: number;
  fogColor: number;
  sunColor: number;
  groundColor: number;
  accentColor: string;
  objectiveAr: string;
  objectiveEn: string;
  enemyCount: number;
  barrelCount: number;
  coordinates: { lat: string; lng: string };
  threatLevel: 'HIGH' | 'EXTREME' | 'CRITICAL';
  heatmapData?: { x: number; z: number; intensity: number; labelAr: string; labelEn: string }[];
  patrolRoutes?: { from: { x: number; z: number }; to: { x: number; z: number }; type: 'infantry' | 'buggy' | 'sniper' }[];
  elevationProfile?: 'mountains' | 'coastal_dunes' | 'sandstone_canyon' | 'snow_peaks' | 'flat_basin';
  isCustomMap?: boolean;
}

export interface CustomMapConfig extends WarTheaterConfig {
  roughness: number; // 0.1 to 1.0
  vegetationDensity: number; // 0 to 1.0
  dropZoneX: number;
  dropZoneZ: number;
  createdTime: number;
}

export type WeaponType = 'knife' | 'pistol' | 'assault' | 'sniper' | 'shotgun' | 'lmg';

export interface WeaponData {
  type: WeaponType;
  nameAr: string;
  nameEn: string;
  damage: number;
  fireRate: number; // shots per sec
  clipSize: number;
  currentAmmo: number;
  reserveAmmo: number;
  reloadTime: number; // sec
  recoil: number;
  spread: number;
  range: number;
  zoomFov: number;
}

export type LootType = 'weapon' | 'armor' | 'medkit' | 'ammo';

export interface LootItem {
  id: string;
  type: LootType;
  weaponType?: WeaponType;
  nameAr: string;
  nameEn: string;
  tier: 'common' | 'rare' | 'epic' | 'legendary';
  ammoAmount?: number;
  armorAmount?: number;
  healAmount?: number;
}

export interface LootCrateEntity {
  id: string;
  x: number;
  y: number;
  z: number;
  type: 'tactical_box' | 'air_drop' | 'military_locker';
  isLooted: boolean;
  item: LootItem;
}

export interface TacticalVehicleEntity {
  id: string;
  type: 'technical' | 'buggy';
  x: number;
  y: number;
  z: number;
  rotationY: number;
  speed: number;
  maxSpeed: number;
  health: number;
  maxHealth: number;
  isOccupied: boolean;
}

export interface DescentTelemetry {
  isActive: boolean;
  phase: 'plane' | 'jump' | 'freefall' | 'parachuting' | 'touchdown' | 'landed';
  altitude: number; // meters (1200 -> 0)
  verticalSpeed: number; // m/s
  forwardSpeed: number; // m/s
  compassHeading: number; // degrees
  paratroopersCount: number;
}

export interface TacticalDroneTarget {
  id: number;
  x: number;
  y: number;
  z: number;
  type: 'sniper' | 'heavy' | 'rifleman' | 'boss';
  distance: number;
  screenX?: number;
  screenY?: number;
}

export interface TacticalDroneState {
  active: boolean;
  battery: number;
  maxBattery: number;
  cooldown: number;
  altitude: number;
  scannedSnipersCount: number;
  isSurveillanceCameraActive: boolean;
  detectedTargets: TacticalDroneTarget[];
}

export interface PlayerState {
  health: number;
  maxHealth: number;
  armor: number;
  maxArmor: number;
  stamina: number;
  maxStamina: number;
  isSprinting: boolean;
  isCrouching: boolean;
  isAiming: boolean;
  isReloading: boolean;
  currentWeapon: WeaponType;
  weapons: Partial<Record<WeaponType, WeaponData>>;
  unlockedWeapons: WeaponType[];
  grenades: number;
  score: number;
  kills: number;
  shotsFired: number;
  shotsHit: number;
  headshots: number;
  missionTime: number;
  isInCombat?: boolean;
  isAimLocked?: boolean;
  lockedTarget?: {
    id: number;
    nameAr: string;
    nameEn: string;
    distance: number;
    type: 'sniper' | 'heavy' | 'rifleman' | 'boss';
    healthPercent: number;
  } | null;
  droneState?: TacticalDroneState;
  nearbyLoot?: LootCrateEntity | null;
  nearbyVehicle?: TacticalVehicleEntity | null;
  isInVehicle?: boolean;
  inVehicle?: TacticalVehicleEntity | null;
  descentTelemetry?: DescentTelemetry;
  isInspecting?: boolean;
  inspectProgress?: number;
  medkits?: number;
  armorPlates?: number;
  isDescentMode?: boolean;
  tacticalSimulation?: TacticalSimulationState;
}

export interface BossState {
  active: boolean;
  nameAr: string;
  nameEn: string;
  health: number;
  maxHealth: number;
  armor: number;
  maxArmor: number;
}

export interface WaveState {
  current: number;
  total: number;
  titleAr: string;
  titleEn: string;
  inIntermission: boolean;
  intermissionCountdown: number;
}

export interface RadioTransmission {
  id: number;
  senderAr: string;
  senderEn: string;
  textAr: string;
  textEn: string;
  isWarning?: boolean;
}

export type GameStatus = 'title' | 'briefing' | 'descent' | 'playing' | 'paused' | 'victory' | 'gameover';

export interface GameStats {
  score: number;
  kills: number;
  accuracy: number;
  headshots: number;
  timeSeconds: number;
  theater: WarTheaterId;
  victory: boolean;
  wavesCleared: number;
  bossDefeated: boolean;
}
