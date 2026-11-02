import { useEffect, useRef, useState, useCallback } from 'react';
import { YemenCombatEngine } from './game/engine.ts';
import { GameStatus, GameStats, PlayerState, WarTheaterId, WaveState, BossState, RadioTransmission } from './types/game.ts';
import { TitleScreen, LoadoutCustomization } from './components/TitleScreen.tsx';
import { ReconBriefing } from './components/ReconBriefing.tsx';
import { HUD } from './components/HUD.tsx';
import { PauseModal } from './components/PauseModal.tsx';
import { DebriefModal } from './components/DebriefModal.tsx';
import { TouchControls } from './components/TouchControls.tsx';
import { GameCanvas } from './components/GameCanvas.tsx';
import { auth, signInWithGoogle, logout } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { saveManager } from './game/saveManager';
import { assetLoader, AssetLoadProgress } from './game/assetLoader.ts';
import { LoadingScreen } from './components/LoadingScreen.tsx';
import { WEAPON_REGISTRY } from './game/lootSystem.ts';

import { MapEditorModal } from './components/MapEditorModal.tsx';
import { CustomMapConfig } from './types/game.ts';
import { registerCustomTheater } from './game/theater.ts';

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const buildTacticalSimulation = ({
  theaterId,
  playerState,
  enemiesAlive,
  waveState,
  bossState,
}: {
  theaterId: WarTheaterId;
  playerState: PlayerState;
  enemiesAlive: number;
  waveState: WaveState;
  bossState: BossState | null;
}) => {
  const weatherMap: Record<WarTheaterId, 'clear' | 'dust_storm' | 'rain' | 'night'> = {
    sanaa: 'dust_storm',
    mandeeb: 'clear',
    hadramaut: 'dust_storm',
    snow: 'night',
    forest: 'rain',
  };

  const weather = weatherMap[theaterId] ?? 'clear';
  const baseVisibility =
    weather === 'night' ? 2.5 :
    weather === 'rain' ? 4.5 :
    weather === 'dust_storm' ? 3.2 :
    6.5;

  const visibilityKm = Number(
    (baseVisibility - (playerState.isInCombat ? 1.2 : 0.2) + (waveState.current - 1) * 0.2).toFixed(1)
  );

  const suppression = clamp(
    Math.round(
      enemiesAlive * 8 +
      (bossState ? 18 : 0) +
      (playerState.isInCombat ? 26 : 8) +
      (weather === 'dust_storm' ? 12 : 0) +
      (waveState.current - 1) * 10
    ),
    8,
    98
  );

  const routeRisk = clamp(
    Number(
      (0.2 +
        enemiesAlive * 0.04 +
        (bossState ? 0.18 : 0) +
        (waveState.inIntermission ? 0.12 : 0) +
        (weather === 'dust_storm' ? 0.16 : 0) +
        (weather === 'night' ? 0.1 : 0)).toFixed(2)
    ),
    0.1,
    0.95
  );

  const firefightPressure = clamp(
    Math.round(
      suppression * 0.7 +
      (playerState.isInCombat ? 24 : 8) +
      (playerState.health < 50 ? 14 : 0)
    ),
    5,
    100
  );

  const friendlyCasualtyEstimate = clamp(
    Math.round(
      (100 - playerState.armor) * 0.18 +
      (100 - playerState.health) * 0.22 +
      suppression * 0.12 +
      (playerState.isInCombat ? 16 : 0)
    ),
    1,
    95
  );

  const enemyCasualtyEstimate = clamp(
    Math.round(
      (playerState.shotsHit / Math.max(1, playerState.shotsFired)) * 55 +
      enemiesAlive * 6 +
      (bossState ? 18 : 0)
    ),
    5,
    99
  );

  const threatLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' =
    suppression >= 80 || bossState?.active
      ? 'CRITICAL'
      : suppression >= 60
      ? 'HIGH'
      : suppression >= 35
      ? 'MODERATE'
      : 'LOW';

  const timeOnTarget = Math.round(playerState.missionTime);
  const tacticalScore = Math.round(
    playerState.score +
    playerState.kills * 250 +
    playerState.headshots * 45 +
    Math.max(0, 100 - friendlyCasualtyEstimate) * 3
  );

  return {
    weather,
    visibilityKm,
    suppression,
    threatLevel,
    routeRisk,
    firefightPressure,
    friendlyCasualtyEstimate,
    enemyCasualtyEstimate,
    timeOnTarget,
    tacticalScore,
  };
};

export default function App() {
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<YemenCombatEngine | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isPreloading, setIsPreloading] = useState(true);
  const [preloadProgress, setPreloadProgress] = useState<AssetLoadProgress | null>(null);

  const [customMaps, setCustomMaps] = useState<CustomMapConfig[]>(() => {
    try {
      const saved = localStorage.getItem('yemen_combat_custom_maps');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [customDropZone, setCustomDropZone] = useState<{ x: number; z: number } | null>(null);
  const [isMapEditorOpen, setIsMapEditorOpen] = useState(false);

  useEffect(() => {
    customMaps.forEach((map) => registerCustomTheater(map));
  }, [customMaps]);

  // Dynamic Visual Viewport Handling for Mobile Keyboard/Orientation
  useEffect(() => {
    const handleResize = () => {
      const viewport = window.visualViewport;
      if (viewport) {
        document.documentElement.style.setProperty('--vh', `${viewport.height}px`);
        document.documentElement.style.setProperty('--vw', `${viewport.width}px`);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
      handleResize(); // Initial set
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('scroll', handleResize);
      }
    };
  }, []);

  useEffect(() => {
    assetLoader.preloadAll((progress) => {
      setPreloadProgress(progress);
      if (progress.progress >= 100) {
        setTimeout(() => setIsPreloading(false), 350);
      }
    });
  }, []);
  const [status, setStatus] = useState<GameStatus>('title');
  const [selectedTheater, setSelectedTheater] = useState<WarTheaterId>('sanaa');
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [showTouchControls, setShowTouchControls] = useState(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || (navigator && navigator.maxTouchPoints > 0) || window.innerWidth < 1024;
  });

  const [customization, setCustomization] = useState<LoadoutCustomization>({
    camo: 'desert',
    visorTint: 'emerald',
    sightOptic: 'holo',
  });

  const [playerState, setPlayerState] = useState<PlayerState>({
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
    unlockedWeapons: ['knife', 'pistol', 'assault', 'sniper'],
    weapons: { ...WEAPON_REGISTRY },
    grenades: 3,
    score: 0,
    kills: 0,
    shotsFired: 0,
    shotsHit: 0,
    headshots: 0,
    missionTime: 0,
    tacticalSimulation: {
      weather: 'dust_storm',
      visibilityKm: 5.1,
      suppression: 22,
      threatLevel: 'LOW',
      routeRisk: 0.2,
      firefightPressure: 18,
      friendlyCasualtyEstimate: 5,
      enemyCasualtyEstimate: 12,
      timeOnTarget: 0,
      tacticalScore: 0,
    },
  });

  const [enemiesCount, setEnemiesCount] = useState({ alive: 8, total: 8 });
  const [hitFeedback, setHitFeedback] = useState<{ isHeadshot: boolean; damage: number } | null>(null);
  const [playerDamaged, setPlayerDamaged] = useState(false);
  const [debriefStats, setDebriefStats] = useState<GameStats | null>(null);
  const [radarData, setRadarData] = useState({
    player: { x: 0, z: 32, yaw: 0 },
    enemies: [] as { x: number; z: number; isDead: boolean; isBoss?: boolean }[],
  });

  // Wave escalation, Armored Boss, and Procedural Radio Transmission states
  const [waveState, setWaveState] = useState<WaveState>({
    current: 1,
    total: 3,
    titleAr: 'الموجة 1: طليعة الاستطلاع المعادي',
    titleEn: 'Wave 1: Hostile Recon Vanguard',
    inIntermission: false,
    intermissionCountdown: 0,
  });
  const [bossState, setBossState] = useState<BossState | null>(null);
  const [radioTransmission, setRadioTransmission] = useState<RadioTransmission | null>(null);
  const radioTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [camOrientation, setCamOrientation] = useState({ yaw: 0, pitch: 0 });
  const [descentStatus, setDescentStatus] = useState<{ isActive: boolean; altitude: number; phase: string }>({
    isActive: false,
    altitude: 0,
    phase: 'plane',
  });

  useEffect(() => {
    const nextSimulation = buildTacticalSimulation({
      theaterId: selectedTheater,
      playerState,
      enemiesAlive: enemiesCount.alive,
      waveState,
      bossState,
    });

    setPlayerState((prev) => {
      const current = prev.tacticalSimulation;
      if (
        current &&
        current.weather === nextSimulation.weather &&
        current.visibilityKm === nextSimulation.visibilityKm &&
        current.suppression === nextSimulation.suppression &&
        current.threatLevel === nextSimulation.threatLevel &&
        current.routeRisk === nextSimulation.routeRisk &&
        current.firefightPressure === nextSimulation.firefightPressure &&
        current.friendlyCasualtyEstimate === nextSimulation.friendlyCasualtyEstimate &&
        current.enemyCasualtyEstimate === nextSimulation.enemyCasualtyEstimate &&
        current.timeOnTarget === nextSimulation.timeOnTarget &&
        current.tacticalScore === nextSimulation.tacticalScore
      ) {
        return prev;
      }

      return { ...prev, tacticalSimulation: nextSimulation };
    });
  }, [selectedTheater, playerState, enemiesCount.alive, waveState, bossState]);

  // Toggle Language & Sync HTML dir
  const toggleLanguage = useCallback(() => {
    setLang((prev) => {
      const next = prev === 'ar' ? 'en' : 'ar';
      document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = next;
      return next;
    });
  }, []);

  // Sync initial dir
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // Handle Firebase Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setAuthLoading(false);
      
      if (user) {
        // Fetch save from cloud and merge
        const cloudSave = await saveManager.fetchFromCloud();
        if (cloudSave) {
          if (cloudSave.lastTheater) setSelectedTheater(cloudSave.lastTheater);
          if (cloudSave.customization) setCustomization(cloudSave.customization);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Mount Three.js Engine once in isolated ref container
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const engine = new YemenCombatEngine(canvasContainerRef.current, {
      onPlayerUpdate: (state) => {
        setPlayerState(state);
      },
      onEnemiesUpdate: (alive, total) => {
        setEnemiesCount({ alive, total });
      },
      onHitConfirmed: (isHeadshot, damage) => {
        setHitFeedback({ isHeadshot, damage });
        setTimeout(() => setHitFeedback(null), 250);
      },
      onPlayerDamage: () => {
        setPlayerDamaged(true);
        setTimeout(() => setPlayerDamaged(false), 300);
      },
      onGameOver: (stats) => {
        setDebriefStats(stats);
        setStatus('gameover');
        saveManager.submitHighScore(stats);
        try {
          if (document.pointerLockElement) document.exitPointerLock?.();
        } catch {}
      },
      onVictory: (stats) => {
        setDebriefStats(stats);
        setStatus('victory');
        saveManager.submitHighScore(stats);
        try {
          if (document.pointerLockElement) document.exitPointerLock?.();
        } catch {}
      },
      onWaveUpdate: (wave) => {
        setWaveState(wave);
      },
      onBossUpdate: (boss) => {
        setBossState(boss);
      },
      onRadioTransmission: (radio) => {
        setRadioTransmission(radio);
        if (radioTimerRef.current) clearTimeout(radioTimerRef.current);
        radioTimerRef.current = setTimeout(() => {
          setRadioTransmission(null);
        }, 4800);
      },
      onCameraUpdate: (yaw, pitch) => {
        setCamOrientation({ yaw, pitch });
      },
      onDescentUpdate: (status) => {
        setDescentStatus(status);
        if (status.isActive) {
          setStatus('descent');
        } else if (status.phase === 'landing' || status.phase === 'landed') {
          setStatus('playing');
        }
      },
    });

    engineRef.current = engine;

    // Periodic radar data poller (low frequency 10Hz to save CPU)
    const radarInterval = setInterval(() => {
      if (engineRef.current) {
        setRadarData({
          player: engineRef.current.getPlayerPosition(),
          enemies: engineRef.current.getEnemiesForRadar(),
        });
      }
    }, 100);

    return () => {
      clearInterval(radarInterval);
      if (radioTimerRef.current) clearTimeout(radioTimerRef.current);
      engine.destroy();
    };
  }, []);

  // Global ESC key listener for Pause menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        if (status === 'playing') {
          setStatus('paused');
          engineRef.current?.setPaused(true);
        } else if (status === 'paused') {
          setStatus('playing');
          engineRef.current?.setPaused(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status]);

  const handleOpenBriefing = () => {
    setStatus('briefing');
  };

  const handleConfirmDeploy = () => {
    setRadioTransmission(null);
    setBossState(null);
    setStatus('descent');
    engineRef.current?.startMission(selectedTheater);
  };

  const handleSelectTheater = (id: WarTheaterId) => {
    setSelectedTheater(id);
    engineRef.current?.loadTheater(id);
  };

  const handleResume = () => {
    setStatus('playing');
    engineRef.current?.setPaused(false);
  };

  const handleRestart = () => {
    setRadioTransmission(null);
    setBossState(null);
    setStatus('playing');
    engineRef.current?.startMission(selectedTheater);
  };

  const handleQuitToTitle = () => {
    if (radioTimerRef.current) clearTimeout(radioTimerRef.current);
    setRadioTransmission(null);
    setBossState(null);
    setStatus('title');
    engineRef.current?.loadTheater(selectedTheater);
  };


  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateCommandoLoadout(customization);
    }
  }, [customization]);

  const handleUpdateCustomization = (next: LoadoutCustomization) => {
    setCustomization(next);
    if (engineRef.current) {
      engineRef.current.updateCommandoLoadout(next);
    }
  };

  return (
    <div 
      className="relative overflow-hidden bg-black select-none"
      style={{
        width: 'var(--vw, 100vw)',
        height: 'var(--vh, 100vh)',
      }}
    >
      {/* Asset Preloader Loading Screen */}
      {isPreloading && <LoadingScreen progressData={preloadProgress} />}

      {/* Dynamic Tactical Background with Panoramic HD Image & Parallax */}
      <GameCanvas
        canvasContainerRef={canvasContainerRef}
        theaterId={selectedTheater}
        yaw={camOrientation.yaw}
        pitch={camOrientation.pitch}
      />

      {/* Title Screen Overlay */}
      {status === 'title' && (
        <TitleScreen
          selectedTheater={selectedTheater}
          onSelectTheater={handleSelectTheater}
          onStartGame={handleOpenBriefing}
          lang={lang}
          onToggleLang={toggleLanguage}
          customization={customization}
          onUpdateCustomization={handleUpdateCustomization}
          user={user}
          onLogin={signInWithGoogle}
          onLogout={logout}
          authLoading={authLoading}
        />
      )}

      {/* Interactive Reconnaissance & Operations Briefing Screen */}
      {status === 'briefing' && (
        <ReconBriefing
          selectedTheater={selectedTheater}
          onSelectTheater={handleSelectTheater}
          customMaps={customMaps}
          customDropZone={customDropZone}
          onSelectDropZone={(coords) => setCustomDropZone(coords)}
          onOpenMapEditor={() => setIsMapEditorOpen(true)}
          onConfirmDeploy={handleConfirmDeploy}
          onBackToTitle={handleQuitToTitle}
          lang={lang}
        />
      )}

      {/* Custom Map Builder Modal */}
      {isMapEditorOpen && (
        <MapEditorModal
          onSaveMap={(newMap) => {
            const next = [...customMaps, newMap];
            setCustomMaps(next);
            try {
              localStorage.setItem('yemen_combat_custom_maps', JSON.stringify(next));
            } catch {}
            setSelectedTheater(newMap.id);
            setIsMapEditorOpen(false);
          }}
          onClose={() => setIsMapEditorOpen(false)}
          lang={lang}
        />
      )}

      {/* In-Game Low-Occlusion Military HUD */}
      {(status === 'playing' || status === 'paused' || status === 'descent') && (
        <HUD
          playerState={playerState}
          theaterId={selectedTheater}
          lang={lang}
          onToggleLang={toggleLanguage}
          enemiesAlive={enemiesCount.alive}
          enemiesTotal={enemiesCount.total}
          hitFeedback={hitFeedback}
          playerDamaged={playerDamaged}
          onPause={() => {
            setStatus('paused');
            engineRef.current?.setPaused(true);
          }}
          radarData={radarData}
          showTouchControls={showTouchControls}
          onToggleTouchControls={() => setShowTouchControls((prev) => !prev)}
          waveState={waveState}
          bossState={bossState}
          radioTransmission={radioTransmission}
          onTriggerDrone={() => engineRef.current?.triggerDroneLaunch()}
          onLoot={() => engineRef.current?.interactLoot()}
          onDrive={() => engineRef.current?.interactVehicle()}
          onJump={() => engineRef.current?.jumpDescent()}
          descentStatus={descentStatus}
        />
      )}

      {/* On-Screen Touch Controls (Dynamic Floating Joystick & D-Pad) */}
      {(status === 'playing' || status === 'descent') && showTouchControls && (
        <TouchControls
          engine={engineRef.current}
          playerState={playerState}
          lang={lang}
          descentStatus={descentStatus}
        />
      )}

      {/* Tactical Pause Menu Modal */}
      {status === 'paused' && (
        <PauseModal
          onResume={handleResume}
          onRestart={handleRestart}
          onQuitToTitle={handleQuitToTitle}
          lang={lang}
          onToggleLang={toggleLanguage}
        />
      )}

      {/* After-Action Debrief (Victory / Defeat) */}
      {(status === 'victory' || status === 'gameover') && debriefStats && (
        <DebriefModal
          stats={debriefStats}
          onRestart={handleRestart}
          onQuitToTitle={handleQuitToTitle}
          lang={lang}
        />
      )}
    </div>
  );
}
