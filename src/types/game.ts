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
}

export type WeaponType = 'assault' | 'sniper';

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
  weapons: Record<WeaponType, WeaponData>;
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
