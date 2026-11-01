import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Crosshair, RotateCcw, Bomb, Shield, Zap, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Disc, Sliders, Radio } from 'lucide-react';
import { YemenCombatEngine } from '../game/engine.ts';
import { PlayerState } from '../types/game.ts';

interface TouchControlsProps {
  engine: YemenCombatEngine | null;
  playerState: PlayerState;
  lang: 'ar' | 'en';
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  engine,
  playerState,
  lang,
}) => {
  // Movement control mode: 'joystick' (Floating Dynamic) vs 'dpad' (Tactile Cross)
  const [movementMode, setMovementMode] = useState<'joystick' | 'dpad'>('joystick');

  // Floating Dynamic Joystick State
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickAnchor, setJoystickAnchor] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [joystickKnob, setJoystickKnob] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSprintLocked, setIsSprintLocked] = useState(false);
  const joystickTouchId = useRef<number | null>(null);
  const prevSprintState = useRef(false);

  // D-Pad active directions state (when in 'dpad' mode)
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
  const [isAimingActive, setIsAimingActive] = useState(false);
  const [isCrouching, setIsCrouching] = useState(false);

  // References for touch tracking
  const dpadRef = useRef<HTMLDivElement | null>(null);
  const dpadTouchId = useRef<number | null>(null);
  const aimAreaRef = useRef<HTMLDivElement | null>(null);
  const aimTouchId = useRef<number | null>(null);
  const lastAimPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Safe haptic feedback helper
  const triggerHaptic = useCallback((ms = 15) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(ms);
      }
    } catch {
      // Ignore vibration errors on unsupported devices
    }
  }, []);

  // --- FLOATING DYNAMIC JOYSTICK LOGIC ---
  const MAX_RADIUS = 56; // max joystick deflection radius in px
  const SPRINT_THRESHOLD = 0.8; // 80% radius triggers auto-sprint

  const handleJoystickStart = useCallback((clientX: number, clientY: number, touchId: number | null) => {
    joystickTouchId.current = touchId;
    setJoystickAnchor({ x: clientX, y: clientY });
    setJoystickKnob({ x: clientX, y: clientY });
    setJoystickActive(true);
    setIsSprintLocked(false);
    prevSprintState.current = false;
    triggerHaptic(15);
  }, [triggerHaptic]);

  const handleJoystickMove = useCallback((clientX: number, clientY: number) => {
    const dx = clientX - joystickAnchor.x;
    const dy = clientY - joystickAnchor.y;
    const dist = Math.hypot(dx, dy);

    let clampedDx = dx;
    let clampedDy = dy;
    if (dist > MAX_RADIUS) {
      const angle = Math.atan2(dy, dx);
      clampedDx = Math.cos(angle) * MAX_RADIUS;
      clampedDy = Math.sin(angle) * MAX_RADIUS;
    }

    setJoystickKnob({
      x: joystickAnchor.x + clampedDx,
      y: joystickAnchor.y + clampedDy,
    });

    const magnitude = Math.min(1.0, dist / MAX_RADIUS);
    const normX = clampedDx / MAX_RADIUS;
    const normZ = clampedDy / MAX_RADIUS;

    // Send analog movement to engine
    engine?.setTouchMovement(normX, normZ);

    // Auto-sprint check when pushed past 80% radius
    const isSprint = magnitude >= SPRINT_THRESHOLD;
    setIsSprintLocked(isSprint);

    if (isSprint !== prevSprintState.current) {
      prevSprintState.current = isSprint;
      engine?.setTouchSprinting(isSprint);
      if (isSprint) {
        triggerHaptic(25); // Subtle click feedback on entering sprint lock
      }
    }
  }, [engine, joystickAnchor, triggerHaptic]);

  const handleJoystickEnd = useCallback(() => {
    joystickTouchId.current = null;
    setJoystickActive(false);
    setIsSprintLocked(false);
    prevSprintState.current = false;
    engine?.setTouchMovement(0, 0);
    engine?.setTouchSprinting(false);
  }, [engine]);

  // Touch listener for the floating joystick zone (Left 46% of viewport)
  const handleLeftTouchStart = (e: React.TouchEvent) => {
    if (movementMode !== 'joystick') return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.clientX < window.innerWidth * 0.46 && t.clientY > 70) {
        if (joystickTouchId.current === null) {
          handleJoystickStart(t.clientX, t.clientY, t.identifier);
          break;
        }
      }
    }
  };

  const handleLeftTouchMove = (e: React.TouchEvent) => {
    if (movementMode !== 'joystick' || joystickTouchId.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === joystickTouchId.current) {
        handleJoystickMove(t.clientX, t.clientY);
        break;
      }
    }
  };

  const handleLeftTouchEnd = (e: React.TouchEvent) => {
    if (movementMode !== 'joystick') return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchId.current) {
        handleJoystickEnd();
        break;
      }
    }
  };

  // Mouse fallback for testing the floating joystick on desktop
  const isMouseJoystick = useRef(false);
  const handleLeftMouseDown = (e: React.MouseEvent) => {
    if (movementMode !== 'joystick') return;
    if (e.clientX < window.innerWidth * 0.46 && e.clientY > 70) {
      isMouseJoystick.current = true;
      handleJoystickStart(e.clientX, e.clientY, null);
    }
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isMouseJoystick.current) {
        handleJoystickMove(e.clientX, e.clientY);
      }
    };
    const onMouseUp = () => {
      if (isMouseJoystick.current) {
        isMouseJoystick.current = false;
        handleJoystickEnd();
      }
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [handleJoystickMove, handleJoystickEnd]);

  // --- D-PAD LOGIC (when in 'dpad' mode) ---
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

  // --- RIGHT-SCREEN CAMERA AIMING & LOOK AREA ---
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
    if ('touches' in e) {
      e.preventDefault();
    }
    triggerHaptic(25);
    if (engine) {
      engine.toggleAim();
    }
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
    engine?.triggerWeaponSwap();
  };

  const handleGrenade = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(40);
    engine?.triggerGrenade();
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

  // Center offset calculations for D-Pad
  const centerOffsetX = (activeDirections.right ? 10 : 0) + (activeDirections.left ? -10 : 0);
  const centerOffsetY = (activeDirections.down ? 10 : 0) + (activeDirections.up ? -10 : 0);
  const hasActiveDir = activeDirections.up || activeDirections.down || activeDirections.left || activeDirections.right;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 overflow-hidden touch-none">
      {/* MODE SWITCHER: Ultra-compact Translucent Toggle */}
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

      {/* LEFT HALF FLOATING JOYSTICK TOUCH-CAPTURE SURFACE (Active in 'joystick' mode) */}
      {movementMode === 'joystick' && (
        <div
          onTouchStart={handleLeftTouchStart}
          onTouchMove={handleLeftTouchMove}
          onTouchEnd={handleLeftTouchEnd}
          onTouchCancel={handleLeftTouchEnd}
          onMouseDown={handleLeftMouseDown}
          className="absolute top-20 left-0 bottom-0 w-[46%] pointer-events-auto touch-none cursor-crosshair flex flex-col justify-end p-6"
        >
          {/* Subtle resting guide hint when idle */}
          {!joystickActive && (
            <div className="pointer-events-none mb-4 text-xs font-hud text-slate-500/70 border border-dashed border-slate-700/40 rounded-xl p-3 w-40 text-center animate-pulse">
              {lang === 'ar' ? 'المس في أي مكان للتحرك' : 'Touch anywhere to steer'}
            </div>
          )}
        </div>
      )}

      {/* RENDERED FLOATING DYNAMIC JOYSTICK COMPONENT */}
      {movementMode === 'joystick' && joystickActive && (
        <div
          className="fixed pointer-events-none z-30 transition-opacity duration-75"
          style={{
            left: `${joystickAnchor.x}px`,
            top: `${joystickAnchor.y}px`,
          }}
        >
          {/* Outer Housing Base Ring */}
          <div
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-colors duration-150 flex items-center justify-center ${
              isSprintLocked
                ? 'bg-slate-950/80 border-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.7)]'
                : 'bg-slate-950/70 border-emerald-500/60 shadow-[0_0_16px_rgba(16,185,129,0.35)]'
            }`}
            style={{
              width: `${MAX_RADIUS * 2 + 16}px`,
              height: `${MAX_RADIUS * 2 + 16}px`,
            }}
          >
            {/* Concentric Guide Ring for Walk / Sprint threshold */}
            <div
              className={`rounded-full border border-dashed pointer-events-none ${
                isSprintLocked ? 'border-amber-400/80' : 'border-emerald-500/30'
              }`}
              style={{
                width: `${MAX_RADIUS * 2 * SPRINT_THRESHOLD}px`,
                height: `${MAX_RADIUS * 2 * SPRINT_THRESHOLD}px`,
              }}
            />

            {/* Tactical Crosshair Axis Lines */}
            <div className="absolute inset-x-2 h-[1px] bg-slate-700/50" />
            <div className="absolute inset-y-2 w-[1px] bg-slate-700/50" />

            {/* Auto-Sprint Status Beacon Banner */}
            {isSprintLocked && (
              <div className="absolute -top-7 text-[10px] font-hud font-black text-amber-400 tracking-widest bg-amber-500/20 px-2 py-0.5 rounded border border-amber-400 animate-pulse whitespace-nowrap">
                ⚡ {lang === 'ar' ? 'ركض سريع تكتيكي' : 'AUTO-SPRINT'}
              </div>
            )}
          </div>

          {/* Vector Directional Thrust Line */}
          <svg
            className="absolute top-0 left-0 overflow-visible pointer-events-none"
            style={{ width: 0, height: 0 }}
          >
            <line
              x1="0"
              y1="0"
              x2={joystickKnob.x - joystickAnchor.x}
              y2={joystickKnob.y - joystickAnchor.y}
              stroke={isSprintLocked ? '#f59e0b' : '#10b981'}
              strokeWidth="2.5"
              strokeDasharray={isSprintLocked ? 'none' : '3 2'}
            />
          </svg>

          {/* Moving Inner Thumb Knob */}
          <div
            className={`absolute -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full border-2 shadow-2xl flex items-center justify-center transition-transform duration-75 ${
              isSprintLocked
                ? 'bg-gradient-to-tr from-amber-700 via-amber-600 to-amber-500 border-amber-300 shadow-[0_0_16px_#f59e0b] scale-105'
                : 'bg-gradient-to-tr from-slate-900 to-slate-800 border-emerald-400 shadow-[0_0_12px_#10b981]'
            }`}
            style={{
              left: `${joystickKnob.x - joystickAnchor.x}px`,
              top: `${joystickKnob.y - joystickAnchor.y}px`,
            }}
          >
            {/* Center Thumb Knurled Ridge Ring */}
            <div
              className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                isSprintLocked ? 'bg-amber-400 border-amber-200' : 'bg-emerald-400 border-emerald-300'
              }`}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />
            </div>
          </div>
        </div>
      )}

      {/* RENDERED TACTILE D-PAD COMPONENT (Active in 'dpad' mode) */}
      {movementMode === 'dpad' && (
        <div className="absolute bottom-6 left-6 pointer-events-auto flex flex-col items-center">
          <div
            ref={dpadRef}
            onTouchStart={handleDpadTouchStart}
            onTouchMove={handleDpadTouchMove}
            onTouchEnd={handleDpadTouchEnd}
            onTouchCancel={handleDpadTouchEnd}
            className="relative w-40 h-40 rounded-full bg-slate-950/80 border-2 border-slate-700/80 p-2 shadow-2xl flex items-center justify-center touch-none select-none"
          >
            <div className="absolute inset-1 rounded-full border border-dashed border-emerald-500/20 pointer-events-none" />

            {/* UP */}
            <div
              className={`absolute top-1 left-1/2 -translate-x-1/2 w-12 h-12 rounded-t-xl flex flex-col items-center justify-start pt-1.5 transition-all duration-75 ${
                activeDirections.up
                  ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-slate-950 shadow-[0_0_16px_#10b981] scale-105'
                  : 'bg-slate-900/90 text-slate-300 border border-slate-700/60'
              }`}
            >
              <ChevronUp className={`w-5 h-5 ${activeDirections.up ? 'stroke-[3]' : ''}`} />
              <span className="text-[9px] font-hud font-bold -mt-1">{lang === 'ar' ? 'أمام' : 'W'}</span>
            </div>

            {/* DOWN */}
            <div
              className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-12 h-12 rounded-b-xl flex flex-col items-center justify-end pb-1.5 transition-all duration-75 ${
                activeDirections.down
                  ? 'bg-gradient-to-t from-emerald-500 to-emerald-600 text-slate-950 shadow-[0_0_16px_#10b981] scale-105'
                  : 'bg-slate-900/90 text-slate-300 border border-slate-700/60'
              }`}
            >
              <span className="text-[9px] font-hud font-bold -mb-1">{lang === 'ar' ? 'خلف' : 'S'}</span>
              <ChevronDown className={`w-5 h-5 ${activeDirections.down ? 'stroke-[3]' : ''}`} />
            </div>

            {/* LEFT */}
            <div
              className={`absolute left-1 top-1/2 -translate-y-1/2 w-12 h-12 rounded-l-xl flex items-center justify-start pl-1.5 transition-all duration-75 ${
                activeDirections.left
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 shadow-[0_0_16px_#10b981] scale-105'
                  : 'bg-slate-900/90 text-slate-300 border border-slate-700/60'
              }`}
            >
              <ChevronLeft className={`w-5 h-5 ${activeDirections.left ? 'stroke-[3]' : ''}`} />
              <span className="text-[9px] font-hud font-bold ml-0.5">{lang === 'ar' ? 'يسار' : 'A'}</span>
            </div>

            {/* RIGHT */}
            <div
              className={`absolute right-1 top-1/2 -translate-y-1/2 w-12 h-12 rounded-r-xl flex items-center justify-end pr-1.5 transition-all duration-75 ${
                activeDirections.right
                  ? 'bg-gradient-to-l from-emerald-500 to-emerald-600 text-slate-950 shadow-[0_0_16px_#10b981] scale-105'
                  : 'bg-slate-900/90 text-slate-300 border border-slate-700/60'
              }`}
            >
              <span className="text-[9px] font-hud font-bold mr-0.5">{lang === 'ar' ? 'يمين' : 'D'}</span>
              <ChevronRight className={`w-5 h-5 ${activeDirections.right ? 'stroke-[3]' : ''}`} />
            </div>

            {/* CENTER TACTICAL HUB */}
            <div
              className={`relative w-12 h-12 rounded-full border border-slate-700 flex items-center justify-center transition-transform duration-75 shadow-inner ${
                hasActiveDir ? 'bg-slate-800 border-emerald-400' : 'bg-slate-900'
              }`}
              style={{
                transform: `translate(${centerOffsetX}px, ${centerOffsetY}px)`,
              }}
            >
              <div
                className={`w-4 h-4 rounded-full transition-colors duration-150 ${
                  hasActiveDir ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]' : 'bg-slate-600'
                }`}
              />
            </div>
          </div>
        </div>
      )}

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
        {/* 1. GIANT PRIMARY FIRE TRIGGER BUTTON (Bottom-Right Anchor) */}
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

        {/* 2. SHOULDER AIM / SCOPE & TARGET LOCK TOGGLE (Left of Fire) */}
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
          title="Shoulder Aim & Target Lock [RIGHT-CLICK / Q]"
        >
          <Crosshair className={`w-5 h-5 sm:w-6 sm:h-6 ${playerState.isAimLocked ? 'animate-spin' : ''}`} />
          <span className="text-[9px] font-hud font-bold mt-0.5">
            {playerState.isAimLocked
              ? (lang === 'ar' ? 'مُقفل' : 'LOCKED')
              : (lang === 'ar' ? 'تصويب' : 'AIM')}
          </span>
          {playerState.isAimLocked && (
            <span className="absolute -top-1.5 -right-1 px-1.5 py-0.2 bg-red-600 text-white font-hud text-[8px] font-black rounded-full border border-white shadow">
              LOCK
            </span>
          )}
        </button>

        {/* 3. DODGE ROLL BUTTON (Above Fire) */}
        <button
          onTouchStart={handleDodge}
          onClick={handleDodge}
          className="absolute bottom-26 right-4 sm:bottom-32 sm:right-6 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-950/80 backdrop-blur-md border-2 border-slate-700/80 hover:border-amber-500 text-amber-400 flex flex-col items-center justify-center active:scale-90 transition-transform shadow-xl pointer-events-auto select-none touch-none"
          title="Tactical Dodge Roll [SPACE]"
        >
          <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
          <span className="text-[9px] font-hud font-bold mt-0.5">{lang === 'ar' ? 'دحرجة' : 'DODGE'}</span>
        </button>

        {/* 4. CROUCH STANCE BUTTON (Diagonally above Aim) */}
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

        {/* 5. RELOAD MAGAZINE (Top Right of Arc) */}
        <button
          onTouchStart={handleReload}
          onClick={handleReload}
          className="absolute bottom-44 right-4 sm:bottom-52 sm:right-6 w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700/80 hover:border-amber-500/80 text-slate-200 flex flex-col items-center justify-center active:scale-90 transition-transform shadow-lg pointer-events-auto select-none touch-none"
          title="Reload Magazine [R]"
        >
          <RotateCcw className="w-4 h-4 text-amber-400" />
          <span className="text-[8px] font-hud font-bold mt-0.5">{lang === 'ar' ? 'تذخير' : 'R'}</span>
        </button>

        {/* 6. SWAP WEAPON (Inner Arc) */}
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

        {/* 7. FRAG GRENADE (Far Inner Arc) */}
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
      </div>
    </div>
  );
};
