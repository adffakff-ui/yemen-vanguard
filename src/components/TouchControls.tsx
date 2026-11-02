import React, { useRef, useState, useCallback } from 'react';
import { Crosshair, RotateCcw, Bomb, Shield, Zap, ChevronUp, Disc, Sliders, Radio, Eye, Heart, Plane } from 'lucide-react';
import { YemenCombatEngine } from '../game/engine.ts';
import { PlayerState } from '../types/game.ts';
import { Joystick } from './Joystick.tsx';

interface TouchControlsProps {
  engine: YemenCombatEngine | null;
  playerState: PlayerState;
  lang: 'ar' | 'en';
  descentStatus?: { isActive: boolean; altitude: number; phase: string };
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  engine,
  playerState,
  lang,
  descentStatus = { isActive: false, altitude: 0, phase: 'landed' },
}) => {
  // Movement control mode: 'joystick' vs 'dpad'
  const [movementMode, setMovementMode] = useState<'joystick' | 'dpad'>('joystick');

  // D-Pad active directions state
  const [activeDirections, setActiveDirections] = useState<{
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
  }>({
    up: false,
    down: false,
    left: false,
    right: false,
  });

  // Action button active feedback states
  const [isFiring, setIsFiring] = useState(false);
  const [isCrouching, setIsCrouching] = useState(false);

  // Touch tracking references
  const dpadRef = useRef<HTMLDivElement | null>(null);
  const dpadTouchId = useRef<number | null>(null);
  const aimAreaRef = useRef<HTMLDivElement | null>(null);
  const aimTouchId = useRef<number | null>(null);
  const lastAimPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Haptic feedback helper
  const triggerHaptic = useCallback((ms = 15) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(ms);
      }
    } catch {
      // Ignore vibration unsupported
    }
  }, []);

  // --- JOYSTICK LOGIC ---
  const handleJoystickMove = useCallback((data: { x: number; y: number }) => {
    if (engine) {
      engine.setTouchMovement(data.x, data.y);
    }
  }, [engine]);

  const handleJoystickEnd = useCallback(() => {
    if (engine) {
      engine.setTouchMovement(0, 0);
    }
  }, [engine]);

  // --- D-PAD LOGIC ---
  const updateDpadMovement = useCallback((dirs: { up: boolean; down: boolean; left: boolean; right: boolean }) => {
    if (!engine) return;
    let x = 0;
    let z = 0;

    if (dirs.right) x += 1;
    if (dirs.left) x -= 1;
    if (dirs.up) z -= 1;
    if (dirs.down) z += 1;

    if (x !== 0 && z !== 0) {
      const inv = 1 / Math.SQRT2;
      x *= inv;
      z *= inv;
    }
    engine.setTouchMovement(x, z);
  }, [engine]);

  const evaluateDpadTouch = useCallback((clientX: number, clientY: number) => {
    if (!dpadRef.current) return;
    const rect = dpadRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    if (dist < 12) {
      const reset = { up: false, down: false, left: false, right: false };
      setActiveDirections(reset);
      updateDpadMovement(reset);
      return;
    }

    const angle = Math.atan2(dy, dx);
    const deg = (angle * 180) / Math.PI;

    const up = deg > -157.5 && deg < -22.5;
    const down = deg > 22.5 && deg < 157.5;
    const right = deg > -67.5 && deg < 67.5;
    const left = deg > 112.5 || deg < -112.5;

    const newDirs = { up, down, left, right };
    setActiveDirections(newDirs);
    updateDpadMovement(newDirs);
  }, [updateDpadMovement]);

  const handleDpadTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (dpadTouchId.current !== null) return;
    const touch = e.changedTouches[0];
    dpadTouchId.current = touch.identifier;
    triggerHaptic(20);
    evaluateDpadTouch(touch.clientX, touch.clientY);
  };

  const handleDpadTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === dpadTouchId.current) {
        evaluateDpadTouch(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleDpadTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === dpadTouchId.current) {
        dpadTouchId.current = null;
        const reset = { up: false, down: false, left: false, right: false };
        setActiveDirections(reset);
        updateDpadMovement(reset);
        break;
      }
    }
  };

  // --- CAMERA LOOK SWIPE ZONE ---
  const handleAimTouchStart = (e: React.TouchEvent) => {
    if (aimTouchId.current !== null) return;
    const touch = e.changedTouches[0];
    aimTouchId.current = touch.identifier;
    lastAimPos.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleAimTouchMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === aimTouchId.current && engine) {
        const dx = touch.clientX - lastAimPos.current.x;
        const dy = touch.clientY - lastAimPos.current.y;
        lastAimPos.current = { x: touch.clientX, y: touch.clientY };
        engine.addTouchLookDelta(dx, dy);
        break;
      }
    }
  };

  const handleAimTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === aimTouchId.current) {
        aimTouchId.current = null;
        break;
      }
    }
  };

  // --- ACTION BUTTON HANDLERS ---
  const handleFireStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    setIsFiring(true);
    triggerHaptic(25);
    engine?.setTouchShooting(true);
  };

  const handleFireEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    setIsFiring(false);
    engine?.setTouchShooting(false);
  };

  const handleToggleAim = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    if ('touches' in e) e.preventDefault();
    triggerHaptic(25);
    engine?.toggleAim();
  };

  const handleDodge = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(30);
    engine?.triggerDodge();
  };

  const handleReload = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(20);
    engine?.triggerReload();
  };

  const handleSwapWeapon = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(20);
    engine?.cycleNextWeapon();
  };

  const handleLoot = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(30);
    engine?.interactLoot();
  };

  const handleVehicle = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(35);
    engine?.interactVehicle();
  };

  const handleGrenade = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(40);
    engine?.triggerGrenade();
  };

  const handleInspectWeapon = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(25);
    engine?.triggerInspectWeapon();
  };

  const handleDroneLaunch = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(30);
    engine?.triggerDroneLaunch();
  };

  const handleToggleCrouch = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(15);
    if (engine) {
      const next = engine.toggleCrouch();
      setIsCrouching(next);
    }
  };

  const handleUseMedkit = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(30);
    engine?.useMedkit();
  };

  const handleUseArmorPlate = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(30);
    engine?.useArmorPlate();
  };

  const handleParachuteAction = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(40);
    engine?.triggerParachuteToggle();
  };

  const isDescentActive = descentStatus.isActive || playerState.isDescentMode;

  // --- MODE 1: PARACHUTE DESCENT MODE HUD CONTROLS ---
  if (isDescentActive) {
    return (
      <div className="absolute inset-0 pointer-events-none select-none z-30 overflow-hidden touch-none">
        {/* Left Side: Air Steering Joystick */}
        <div className="absolute bottom-8 left-6 pointer-events-auto z-40 flex flex-col items-center">
          <div className="text-[10px] font-hud font-bold text-amber-400 mb-2 uppercase tracking-wider bg-slate-950/70 px-2 py-0.5 rounded border border-amber-500/40">
            {lang === 'ar' ? 'توجيه الطيران' : 'AIR STEERING'}
          </div>
          <Joystick onMove={handleJoystickMove} onEnd={handleJoystickEnd} />
        </div>

        {/* Right Side: Primary Parachute Action Button (Jump / Cut / Deploy) */}
        <div className="absolute bottom-10 right-6 pointer-events-auto z-40">
          <button
            onTouchStart={handleParachuteAction}
            onClick={handleParachuteAction}
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 border-4 border-white text-slate-950 font-black font-hud shadow-[0_0_40px_rgba(245,158,11,0.85)] flex flex-col items-center justify-center active:scale-95 transition-transform animate-pulse"
          >
            <Plane className="w-10 h-10 text-slate-950" />
            <span className="text-xs tracking-wider uppercase font-extrabold mt-1">
              {descentStatus.phase === 'plane'
                ? (lang === 'ar' ? 'القفز الآن' : 'JUMP NOW')
                : descentStatus.phase === 'freefall'
                ? (lang === 'ar' ? 'فتح المظلة' : 'DEPLOY CHUTE')
                : (lang === 'ar' ? 'قطع المظلة' : 'CUT CHUTE')}
            </span>
          </button>
        </div>
      </div>
    );
  }

  // --- MODE 2: VEHICLE DRIVING CONTROLS ---
  if (playerState.isInVehicle) {
    return (
      <div className="absolute inset-0 pointer-events-none select-none z-30 overflow-hidden touch-none">
        {/* Left side steering */}
        <div className="absolute bottom-8 left-6 pointer-events-auto z-40">
          <Joystick onMove={handleJoystickMove} onEnd={handleJoystickEnd} />
        </div>

        {/* Right side vehicle drive/exit button */}
        <div className="absolute bottom-8 right-6 pointer-events-auto z-40 flex flex-col gap-3">
          <button
            onTouchStart={handleVehicle}
            onClick={handleVehicle}
            className="w-22 h-22 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 font-black font-hud border-2 border-white shadow-[0_0_25px_rgba(16,185,129,0.9)] flex flex-col items-center justify-center active:scale-95 transition-transform"
          >
            <span className="text-2xl">🏎️</span>
            <span className="text-xs font-bold uppercase">{lang === 'ar' ? 'ترجل' : 'EXIT BUGGY'}</span>
          </button>
        </div>
      </div>
    );
  }

  // --- MODE 3: ON-FOOT BATTLEFIELD GROUND COMBAT HUD CONTROLS ---
  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 overflow-hidden touch-none">
      {/* MODE SWITCHER: Compact Toggle */}
      <div
        className={`absolute top-14 left-2 sm:top-20 sm:left-6 pointer-events-auto flex items-center bg-slate-950/60 backdrop-blur-sm border border-slate-800/80 p-0.5 rounded-md shadow-md hud-adaptive-transition ${
          playerState.isInCombat ? 'hud-combat-dimmed' : 'opacity-85 hover:opacity-100'
        }`}
      >
        <button
          onClick={() => {
            setMovementMode('joystick');
            triggerHaptic(15);
          }}
          className={`px-2 py-0.5 text-[10px] font-hud font-bold rounded flex items-center gap-1 transition-all cursor-pointer ${
            movementMode === 'joystick'
              ? 'bg-amber-500 text-slate-950 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-2.5 h-2.5" />
          <span>{lang === 'ar' ? 'عصا' : 'JOY'}</span>
        </button>

        <button
          onClick={() => {
            setMovementMode('dpad');
            triggerHaptic(15);
          }}
          className={`px-2 py-0.5 text-[10px] font-hud font-bold rounded flex items-center gap-1 transition-all cursor-pointer ${
            movementMode === 'dpad'
              ? 'bg-amber-500 text-slate-950 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ChevronUp className="w-3 h-3" />
          <span>D-PAD</span>
        </button>
      </div>

      {/* QUICK-USE BACKPACK GEAR SHORTCUTS (Medkit & Armor Plate Buttons) */}
      <div className="absolute bottom-36 left-6 pointer-events-auto z-30 flex items-center gap-2">
        {/* Medkit Button */}
        <button
          onTouchStart={handleUseMedkit}
          onClick={handleUseMedkit}
          className="px-3 py-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md border-2 border-red-500/80 hover:border-red-400 text-red-300 font-hud font-bold text-xs shadow-[0_0_15px_rgba(239,68,68,0.4)] flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
          title="Use Medkit"
        >
          <Heart className="w-4 h-4 fill-red-500 text-red-400 animate-pulse" />
          <span>{lang === 'ar' ? 'علاج' : 'MEDKIT'}</span>
          <span className="px-1.5 py-0.2 bg-red-600 text-white rounded-full text-[10px] font-mono font-black">
            {playerState.medkits || 0}
          </span>
        </button>

        {/* Armor Plate Button */}
        <button
          onTouchStart={handleUseArmorPlate}
          onClick={handleUseArmorPlate}
          className="px-3 py-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md border-2 border-sky-500/80 hover:border-sky-400 text-sky-300 font-hud font-bold text-xs shadow-[0_0_15px_rgba(14,165,233,0.4)] flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
          title="Insert Armor Plate"
        >
          <Shield className="w-4 h-4 fill-sky-500 text-sky-400" />
          <span>{lang === 'ar' ? 'درع' : 'PLATE'}</span>
          <span className="px-1.5 py-0.2 bg-sky-600 text-white rounded-full text-[10px] font-mono font-black">
            {playerState.armorPlates || 0}
          </span>
        </button>
      </div>

      {/* JOYSTICK CONTAINER (Bottom Left) */}
      <div className="absolute bottom-6 left-6 pointer-events-auto z-30">
        <Joystick onMove={handleJoystickMove} onEnd={handleJoystickEnd} />
      </div>

      {/* RIGHT SCREEN AIMING / CAMERA SWIPE ZONE */}
      <div
        ref={aimAreaRef}
        onTouchStart={handleAimTouchStart}
        onTouchMove={handleAimTouchMove}
        onTouchEnd={handleAimTouchEnd}
        onTouchCancel={handleAimTouchEnd}
        className="absolute top-16 right-0 bottom-44 left-[48%] pointer-events-auto touch-none"
        title="Swipe here to aim camera"
      />

      {/* RIGHT SIDE: ERGONOMIC COMBAT ACTION BUTTON CLUSTER (Radial Arc Layout) */}
      <div className="absolute inset-b-0 right-0 bottom-0 pointer-events-none select-none z-30">
        {/* 1. GIANT PRIMARY FIRE TRIGGER BUTTON */}
        <button
          onTouchStart={handleFireStart}
          onTouchEnd={handleFireEnd}
          onTouchCancel={handleFireEnd}
          onMouseDown={handleFireStart}
          onMouseUp={handleFireEnd}
          className={`absolute bottom-4 right-4 sm:bottom-6 sm:right-6 w-20 h-20 sm:w-22 sm:h-22 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-75 shadow-2xl pointer-events-auto select-none touch-none ${
            isFiring
              ? 'bg-gradient-to-tr from-amber-600 via-red-600 to-rose-600 text-white border-amber-300 scale-95 shadow-[0_0_30px_rgba(239,68,68,0.85)]'
              : 'bg-slate-950/80 backdrop-blur-md text-amber-400 border-amber-500/80 hover:bg-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
          }`}
          title="Fire Weapon [LEFT-CLICK]"
        >
          <Crosshair className={`w-8 h-8 ${isFiring ? 'animate-spin stroke-[2.5] text-white' : 'text-amber-400'}`} />
          <span className="text-[10px] font-hud font-black tracking-wider uppercase -mt-0.5">
            {lang === 'ar' ? 'إطلاق' : 'FIRE'}
          </span>
        </button>

        {/* 2. SHOULDER AIM / SCOPE & TARGET LOCK TOGGLE */}
        <button
          onTouchStart={handleToggleAim}
          onClick={handleToggleAim}
          className={`absolute bottom-4 right-26 sm:bottom-6 sm:right-32 w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 flex flex-col items-center justify-center transition-all active:scale-90 shadow-xl pointer-events-auto select-none touch-none ${
            playerState.isAimLocked
              ? 'bg-gradient-to-tr from-red-600 to-rose-500 text-white border-red-300 shadow-[0_0_24px_rgba(239,68,68,0.9)] scale-105 animate-pulse'
              : playerState.isAiming
              ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_20px_#06b6d4] scale-105'
              : 'bg-slate-950/80 backdrop-blur-md text-cyan-400 border-slate-700/80 hover:border-cyan-500/60'
          }`}
          title="Shoulder Aim & Target Lock"
        >
          <Crosshair className={`w-5 h-5 sm:w-6 sm:h-6 ${playerState.isAimLocked ? 'animate-spin' : ''}`} />
          <span className="text-[9px] font-hud font-bold mt-0.5">
            {playerState.isAimLocked
              ? (lang === 'ar' ? 'مُقفل' : 'LOCKED')
              : (lang === 'ar' ? 'تصويب' : 'AIM')}
          </span>
        </button>

        {/* 3. DODGE ROLL BUTTON */}
        <button
          onTouchStart={handleDodge}
          onClick={handleDodge}
          className="absolute bottom-26 right-4 sm:bottom-32 sm:right-6 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-950/80 backdrop-blur-md border-2 border-slate-700/80 hover:border-amber-500 text-amber-400 flex flex-col items-center justify-center active:scale-90 transition-transform shadow-xl pointer-events-auto select-none touch-none"
          title="Tactical Dodge Roll [SPACE]"
        >
          <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
          <span className="text-[9px] font-hud font-bold mt-0.5">{lang === 'ar' ? 'دحرجة' : 'DODGE'}</span>
        </button>

        {/* 4. CROUCH STANCE BUTTON */}
        <button
          onTouchStart={handleToggleCrouch}
          onClick={handleToggleCrouch}
          className={`absolute bottom-24 right-24 sm:bottom-28 sm:right-30 w-13 h-13 sm:w-14 sm:h-14 rounded-full border flex flex-col items-center justify-center active:scale-90 transition-all shadow-lg pointer-events-auto select-none touch-none ${
            isCrouching
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_15px_#f59e0b]'
              : 'bg-slate-950/80 backdrop-blur-md text-slate-300 border-slate-700/80'
          }`}
          title="Crouch [C]"
        >
          <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-[8px] font-hud font-bold mt-0.5">{lang === 'ar' ? 'انحناء' : 'CROUCH'}</span>
        </button>

        {/* 5. RELOAD MAGAZINE */}
        <button
          onTouchStart={handleReload}
          onClick={handleReload}
          className="absolute bottom-44 right-4 sm:bottom-52 sm:right-6 w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700/80 hover:border-amber-500/80 text-slate-200 flex flex-col items-center justify-center active:scale-90 transition-transform shadow-lg pointer-events-auto select-none touch-none"
          title="Reload Magazine [R]"
        >
          <RotateCcw className="w-4 h-4 text-amber-400" />
          <span className="text-[8px] font-hud font-bold mt-0.5">{lang === 'ar' ? 'تذخير' : 'R'}</span>
        </button>

        {/* 6. SWAP WEAPON */}
        <button
          onTouchStart={handleSwapWeapon}
          onClick={handleSwapWeapon}
          className="absolute bottom-42 right-20 sm:bottom-48 sm:right-24 w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700/80 hover:border-emerald-500/80 text-slate-200 flex flex-col items-center justify-center active:scale-90 transition-transform shadow-lg pointer-events-auto select-none touch-none"
          title="Swap Weapon [1/2]"
        >
          <Disc className="w-4 h-4 text-emerald-400" />
          <span className="text-[8px] font-hud font-bold mt-0.5">
            {playerState.currentWeapon === 'assault' ? 'SNIPER' : 'CARBINE'}
          </span>
        </button>

        {/* 7. FRAG GRENADE */}
        <button
          onTouchStart={handleGrenade}
          onClick={handleGrenade}
          className="absolute bottom-38 right-36 sm:bottom-44 sm:right-42 w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700/80 hover:border-amber-500 text-amber-400 flex items-center justify-center active:scale-90 transition-transform shadow-lg pointer-events-auto select-none touch-none"
          title="Throw Frag Grenade [G]"
        >
          <Bomb className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-amber-500 text-slate-950 font-hud font-bold text-[9px] rounded-full flex items-center justify-center shadow-md">
            {playerState.grenades}
          </span>
        </button>

        {/* 8. RECON DRONE LAUNCH BUTTON */}
        <button
          onTouchStart={handleDroneLaunch}
          onClick={handleDroneLaunch}
          className={`absolute bottom-52 right-36 sm:bottom-60 sm:right-42 w-12 h-12 sm:w-13 sm:h-13 rounded-full border flex flex-col items-center justify-center active:scale-90 transition-all shadow-lg pointer-events-auto select-none touch-none ${
            playerState.droneState?.active
              ? 'bg-emerald-500 text-slate-950 border-emerald-300 animate-pulse shadow-[0_0_15px_#10b981]'
              : 'bg-slate-950/80 backdrop-blur-md text-emerald-400 border-emerald-500/60 hover:border-emerald-400'
          }`}
          title="Deploy Recon Drone [E]"
        >
          <Radio className="w-4 h-4 text-emerald-400" />
          <span className="text-[8px] font-hud font-bold mt-0.5">
            {playerState.droneState?.active
              ? `${playerState.droneState.battery}%`
              : playerState.droneState?.cooldown && playerState.droneState.cooldown > 0
              ? `${playerState.droneState.cooldown}s`
              : (lang === 'ar' ? 'مسيرة' : 'DRONE')}
          </span>
        </button>

        {/* 9. MOBILE WEAPON INSPECT BUTTON */}
        <button
          onTouchStart={handleInspectWeapon}
          onClick={handleInspectWeapon}
          className={`absolute bottom-52 right-20 sm:bottom-60 sm:right-24 w-12 h-12 sm:w-13 sm:h-13 rounded-full border flex flex-col items-center justify-center active:scale-90 transition-all shadow-lg pointer-events-auto select-none touch-none ${
            playerState.isInspecting
              ? 'bg-amber-500 text-slate-950 border-amber-300 animate-pulse shadow-[0_0_18px_#f59e0b]'
              : 'bg-slate-950/80 backdrop-blur-md text-amber-400 border-amber-500/60 hover:border-amber-400'
          }`}
          title="Inspect Weapon [N / I]"
        >
          <Eye className="w-4 h-4 text-amber-400" />
          <span className="text-[8px] font-hud font-bold mt-0.5">
            {lang === 'ar' ? 'فحص' : 'INSPECT'}
          </span>
        </button>

        {/* 10. MOBILE ONE-TAP LOOT BUTTON */}
        {playerState.nearbyLoot && !playerState.isInVehicle && (
          <button
            onTouchStart={handleLoot}
            onClick={handleLoot}
            className="absolute bottom-22 right-42 sm:bottom-26 sm:right-50 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-400 text-slate-950 font-black font-hud text-xs border-2 border-white shadow-[0_0_25px_rgba(245,158,11,0.9)] flex flex-col items-center justify-center animate-bounce pointer-events-auto active:scale-95 transition-transform"
            title="Loot Crate [E]"
          >
            <span className="text-base">📦</span>
            <span className="text-[9px] -mt-0.5">{lang === 'ar' ? 'التقاط' : 'LOOT'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
