import React, { useEffect, useRef } from 'react';
import { PlayerState, WarTheaterId, WaveState, BossState, RadioTransmission } from '../types/game.ts';
import { WAR_THEATERS } from '../game/theater.ts';
import { Shield, Heart, Zap, Crosshair, Bomb, Volume2, VolumeX, Globe, Smartphone, Radio, AlertTriangle, Eye, Target, Plane } from 'lucide-react';
import { soundManager } from '../game/audio.ts';

interface HUDProps {
  playerState: PlayerState;
  theaterId: WarTheaterId;
  lang: 'ar' | 'en';
  onToggleLang: () => void;
  enemiesAlive: number;
  enemiesTotal: number;
  hitFeedback: { isHeadshot: boolean; damage: number } | null;
  playerDamaged: boolean;
  onPause: () => void;
  radarData: { player: { x: number; z: number; yaw: number }; enemies: { x: number; z: number; isDead: boolean; isBoss?: boolean }[] };
  showTouchControls: boolean;
  onToggleTouchControls: () => void;
  waveState: WaveState;
  bossState: BossState | null;
  radioTransmission: RadioTransmission | null;
  onTriggerDrone?: () => void;
  descentStatus?: { isActive: boolean; altitude: number; phase: string };
}

export const HUD: React.FC<HUDProps> = ({
  playerState,
  theaterId,
  lang,
  onToggleLang,
  enemiesAlive,
  enemiesTotal,
  hitFeedback,
  playerDamaged,
  onPause,
  radarData,
  showTouchControls,
  onToggleTouchControls,
  waveState,
  bossState,
  radioTransmission,
  onTriggerDrone,
  descentStatus = { isActive: false, altitude: 0, phase: 'plane' },
}) => {
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isMuted, setIsMuted] = React.useState(soundManager.getMuted());
  const theater = WAR_THEATERS.find((t) => t.id === theaterId) || WAR_THEATERS[0];
  const weapon = playerState.weapons[playerState.currentWeapon];

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  // Render tactical mini radar
  useEffect(() => {
    try {
      const canvas = radarCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const scale = 1.35;

      ctx.clearRect(0, 0, w, h);

      // Radar circular backing
      ctx.fillStyle = 'rgba(12, 14, 18, 0.85)';
      ctx.beginPath();
      ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
      ctx.fill();

      // Radar concentric rings
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
      ctx.lineWidth = 1;
      [0.35, 0.7, 0.98].forEach((r) => {
        ctx.beginPath();
        ctx.arc(cx, cy, (cx - 4) * r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(cx, 4);
      ctx.lineTo(cx, h - 4);
      ctx.moveTo(4, cy);
      ctx.lineTo(w - 4, cy);
      ctx.stroke();

      // Radar Sweep Line
      const sweepAngle = (Date.now() * 0.002) % (Math.PI * 2);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweepAngle) * (cx - 4), cy + Math.sin(sweepAngle) * (cy - 4));
      ctx.stroke();

      // Draw Enemies & Boss blips relative to player
      const px = radarData.player.x;
      const pz = radarData.player.z;
      const pyaw = radarData.player.yaw;

      radarData.enemies.forEach((enemy) => {
        if (enemy.isDead) return;

        const dx = enemy.x - px;
        const dz = enemy.z - pz;

        const rx = dx * Math.cos(-pyaw) - dz * Math.sin(-pyaw);
        const rz = dx * Math.sin(-pyaw) + dz * Math.cos(-pyaw);

        const ex = cx + rx * scale;
        const ey = cy + rz * scale;

        if (Math.hypot(ex - cx, ey - cy) < cx - 6) {
          if (enemy.isBoss) {
            // Large flashing diamond for Boss Technical
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.moveTo(ex, ey - 5);
            ctx.lineTo(ex + 5, ey);
            ctx.lineTo(ex, ey + 5);
            ctx.lineTo(ex - 5, ey);
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });

      // Draw Player Commando Icon in Center
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 6);
      ctx.lineTo(cx - 4, cy + 4);
      ctx.lineTo(cx, cy + 2);
      ctx.lineTo(cx + 4, cy + 4);
      ctx.closePath();
      ctx.fill();
    } catch {
      // Ignore transient canvas 2d context loss
    }
  }, [radarData]);

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10 flex flex-col justify-between p-4 sm:p-6 overflow-hidden">
      {/* Red Screen Damage Vignette Flash */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 pointer-events-none ${
          playerDamaged
            ? 'opacity-80 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(220,38,38,0.45)_100%)]'
            : 'opacity-0'
        }`}
      />

      {/* TOP PERIMETER: Objective Directive, Wave Tracker & Boss Bar, Radar */}
      <div className="flex flex-wrap sm:flex-nowrap items-start justify-between w-full gap-2 sm:gap-4">
        {/* Left: Mission Directive (Dynamically fades smoothly during firefights) */}
        <div
          className={`bg-slate-950/85 backdrop-blur-md border border-amber-500/30 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg max-w-[180px] xs:max-w-[220px] sm:max-w-sm shadow-lg shrink hud-adaptive-transition ${
            playerState.isInCombat
              ? 'hud-combat-dimmed'
              : 'opacity-100 scale-100 pointer-events-auto'
          }`}
        >
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-hud text-amber-400">
            <span className="uppercase tracking-wider font-bold truncate">
              {lang === 'ar' ? 'الهدف الميداني' : 'MISSION DIRECTIVE'}
            </span>
            <span>·</span>
            <span className="text-slate-300 font-mono">
              {enemiesTotal - enemiesAlive}/{enemiesTotal}
            </span>
          </div>
          <div className="text-[11px] sm:text-sm font-semibold text-slate-100 mt-0.5 line-clamp-1">
            {lang === 'ar' ? theater.objectiveAr : theater.objectiveEn}
          </div>
        </div>

        {/* Center: Wave Tracker, Combat Status Indicator & Boss Health/Armor Bar */}
        <div className="flex flex-col items-center flex-1 max-w-xs sm:max-w-md mx-auto order-3 sm:order-2 w-full sm:w-auto mt-1 sm:mt-0">
          {/* Wave & Zone Status Badge */}
          <div className="bg-slate-950/90 backdrop-blur-md border border-slate-700/80 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full shadow-md flex items-center gap-1.5 text-[11px] sm:text-xs font-hud transition-all duration-300">
            {/* Dynamic Combat Zone Beacon Indicator */}
            {playerState.isInCombat ? (
              <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold border border-red-500/50 flex items-center gap-1 animate-pulse text-[10px]">
                🔥 {lang === 'ar' ? 'اشتباك ناري' : 'FIREFIGHT'}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/50 flex items-center gap-1 text-[10px]">
                🛡️ {lang === 'ar' ? 'منطقة آمنة' : 'SAFE ZONE'}
              </span>
            )}

            <span className="text-amber-400 font-bold whitespace-nowrap ml-1">
              {lang === 'ar' ? `الموجة ${waveState.current}/${waveState.total}` : `WAVE ${waveState.current}/${waveState.total}`}
            </span>
            <span className="text-slate-600 hidden xs:inline">·</span>
            <span className="text-slate-200 truncate max-w-[100px] sm:max-w-none hidden xs:inline">
              {lang === 'ar' ? waveState.titleAr : waveState.titleEn}
            </span>

            {waveState.inIntermission && (
              <span className="text-amber-400 font-bold animate-pulse ml-1">
                ⏳ {waveState.intermissionCountdown}s
              </span>
            )}
          </div>

          {/* ARMORED BOSS HEALTH & ARMOR BAR (Appears during Wave 3) */}
          {bossState && bossState.active && (
            <div className="w-full mt-1.5 bg-slate-950/95 border-2 border-red-500/60 p-2 sm:p-2.5 rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.35)] animate-fade-in">
              <div className="flex items-center justify-between text-[11px] sm:text-xs font-hud mb-1">
                <span className="font-bold text-red-400 flex items-center gap-1.5 font-arabic truncate">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-bounce shrink-0" />
                  <span className="truncate">{lang === 'ar' ? bossState.nameAr : bossState.nameEn}</span>
                </span>
                <span className="text-slate-300 font-mono text-[10px] sm:text-[11px] tabular-nums shrink-0 ml-1">
                  HP {Math.round((bossState.health / bossState.maxHealth) * 100)}%
                </span>
              </div>

              {/* Boss Armor Bar (Blue Shield) */}
              {bossState.armor > 0 && (
                <div className="w-full bg-slate-900 h-1.5 rounded overflow-hidden mb-1 border border-slate-800">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-150"
                    style={{ width: `${(bossState.armor / bossState.maxArmor) * 100}%` }}
                  />
                </div>
              )}

              {/* Boss Hull Health Bar (Red) */}
              <div className="w-full bg-slate-900 h-2.5 rounded overflow-hidden p-0.5 border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 rounded-sm transition-all duration-150"
                  style={{ width: `${(bossState.health / bossState.maxHealth) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: Tactical Controls & Mini-Radar */}
        <div className="flex items-center gap-1.5 sm:gap-3 order-2 sm:order-3 shrink-0">
          <div
            className={`flex items-center gap-1 pointer-events-auto hud-adaptive-transition ${
              playerState.isInCombat ? 'hud-combat-dimmed' : 'opacity-100 scale-100'
            }`}
          >
            {/* Tactical Recon Drone Launch Button */}
            <button
              onClick={onTriggerDrone}
              className={`px-2 py-1.5 sm:px-3 sm:py-1.5 border rounded text-xs font-hud font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                playerState.droneState?.active
                  ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                  : playerState.droneState?.cooldown && playerState.droneState.cooldown > 0
                  ? 'bg-slate-900/80 border-slate-700 text-slate-500'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/80 text-amber-300'
              }`}
              title="Deploy Recon Drone [E]"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {playerState.droneState?.active
                  ? `${lang === 'ar' ? 'مسيرة [E]' : 'DRONE [E]'} (${playerState.droneState.battery}%)`
                  : playerState.droneState?.cooldown && playerState.droneState.cooldown > 0
                  ? `⏳ ${playerState.droneState.cooldown}s`
                  : (lang === 'ar' ? 'طائرة مسيرة [E]' : 'DRONE [E]')}
              </span>
            </button>

            <button
              onClick={onToggleTouchControls}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 border rounded text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                showTouchControls
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-300'
              }`}
              title="Toggle Touch Controls"
            >
              <Smartphone className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">{lang === 'ar' ? 'أزرار اللمس' : 'Touch'}</span>
            </button>

            <button
              onClick={onToggleLang}
              className="p-1.5 sm:px-2.5 sm:py-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 rounded text-xs font-medium text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
              title="Toggle Language"
            >
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xs:inline">{lang === 'ar' ? 'EN' : 'عربي'}</span>
            </button>

            <button
              onClick={handleToggleMute}
              className="p-1.5 sm:p-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 rounded text-slate-200 transition-colors cursor-pointer"
              title="Toggle Audio"
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
              )}
            </button>

            <button
              onClick={onPause}
              className="px-2 py-1.5 sm:px-3 sm:py-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 rounded text-xs font-hud text-slate-200 transition-colors cursor-pointer"
            >
              <span className="hidden sm:inline">{lang === 'ar' ? 'إيقاف [ESC]' : 'PAUSE'}</span>
              <span className="sm:hidden font-bold">||</span>
            </button>
          </div>

          {/* Mini-Radar Display */}
          <div
            className={`relative w-14 h-14 sm:w-22 sm:h-22 rounded-full border border-emerald-500/40 p-0.5 sm:p-1 shadow-md bg-slate-950/80 shrink-0 hud-adaptive-transition ${
              playerState.isInCombat ? 'hud-combat-dimmed' : 'opacity-100 scale-100'
            }`}
          >
            <canvas ref={radarCanvasRef} width={88} height={88} className="w-full h-full rounded-full" />
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[8px] sm:text-[9px] font-hud text-emerald-400 font-bold">
              N
            </div>
          </div>
        </div>
      </div>

      {/* CENTER RETICLE & TARGET LOCK-ON HUD */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
        {/* Tactical Lock-On Corner Brackets when Target Acquired */}
        {playerState.isAimLocked && (
          <div className="absolute w-20 h-20 pointer-events-none animate-pulse flex items-center justify-center">
            <div className="absolute -top-1 -left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-red-500 shadow-[0_0_8px_#ef4444]" />
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-red-500 shadow-[0_0_8px_#ef4444]" />
            <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-red-500 shadow-[0_0_8px_#ef4444]" />
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-2 border-r-2 border-red-500 shadow-[0_0_8px_#ef4444]" />

            {/* Pulsing Lock Diamond Ring */}
            <div className="w-14 h-14 border border-red-500/70 rotate-45 animate-spin duration-1000" />
          </div>
        )}

        <div
          className={`relative transition-all duration-75 flex items-center justify-center ${
            playerState.isAiming ? 'w-8 h-8' : 'w-12 h-12'
          } ${playerState.isAimLocked ? 'scale-110' : 'scale-100'}`}
        >
          <div className={`absolute top-0 w-0.5 h-2.5 rounded-full transition-colors ${playerState.isAimLocked ? 'bg-red-500' : 'bg-amber-400/90'}`} />
          <div className={`absolute bottom-0 w-0.5 h-2.5 rounded-full transition-colors ${playerState.isAimLocked ? 'bg-red-500' : 'bg-amber-400/90'}`} />
          <div className={`absolute left-0 h-0.5 w-2.5 rounded-full transition-colors ${playerState.isAimLocked ? 'bg-red-500' : 'bg-amber-400/90'}`} />
          <div className={`absolute right-0 h-0.5 w-2.5 rounded-full transition-colors ${playerState.isAimLocked ? 'bg-red-500' : 'bg-amber-400/90'}`} />
          <div className={`w-1.5 h-1.5 rounded-full transition-all ${playerState.isAimLocked ? 'bg-red-500 shadow-[0_0_12px_#ef4444]' : 'bg-emerald-400 shadow-[0_0_8px_#10b981]'}`} />

          {/* Dynamic Tactical Hit-Marker (Appears on successful impact) */}
          {hitFeedback && (
            <div
              className={`absolute inset-0 flex items-center justify-center hitmarker-active ${
                hitFeedback.isHeadshot ? 'text-red-500' : (playerState.isAimLocked ? 'text-red-400' : 'text-white')
              }`}
            >
              <div className="relative w-8 h-8">
                {/* 4 Diagonal Lines forming the tactical X */}
                <div className="hitmarker-line top-0 left-0 rotate-45 origin-top-left" />
                <div className="hitmarker-line top-0 right-0 -rotate-45 origin-top-right" />
                <div className="hitmarker-line bottom-0 left-0 -rotate-45 origin-bottom-left" />
                <div className="hitmarker-line bottom-0 right-0 rotate-45 origin-bottom-right" />
              </div>
            </div>
          )}
        </div>

        {/* Tactical Locked Target Information Banner */}
        {playerState.isAimLocked && playerState.lockedTarget && (
          <div className="absolute top-12 flex flex-col items-center animate-fade-in pointer-events-none whitespace-nowrap">
            <div className="px-2.5 py-1 rounded-md bg-red-950/90 border border-red-500 text-red-200 text-[10px] sm:text-xs font-hud font-bold shadow-[0_0_15px_rgba(239,68,68,0.6)] flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-red-400 animate-spin" />
              <span>
                {lang === 'ar' ? 'تم قفل الهدف:' : 'TARGET LOCKED:'}{' '}
                {lang === 'ar' ? playerState.lockedTarget.nameAr : playerState.lockedTarget.nameEn}
              </span>
              <span className="text-amber-400 font-mono">({playerState.lockedTarget.distance}m)</span>
              <span className="text-red-400 font-mono">HP {playerState.lockedTarget.healthPercent}%</span>
            </div>
            <div className="text-[9px] text-red-400/90 font-hud tracking-widest uppercase mt-0.5">
              {lang === 'ar' ? '◄ تصويب مؤكد - مسار دقيق ►' : '◄ BALLISTIC LOCK ENGAGED ►'}
            </div>
          </div>
        )}

        {hitFeedback && hitFeedback.isHeadshot && (
          <div className="absolute -top-10 text-[10px] font-hud font-black text-red-500 uppercase tracking-[0.2em] animate-bounce drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">
            {lang === 'ar' ? 'إصابة قتالية قاتلة' : 'CRITICAL HEADSHOT'}
          </div>
        )}
      </div>

      {/* TACTICAL RECON DRONE DETECTED TARGETS & HIDDEN SNIPER NESTS */}
      {playerState.droneState?.active &&
        playerState.droneState.detectedTargets.map((target) => {
          if (!target.screenX || !target.screenY || target.screenX < 0 || target.screenY < 0) return null;
          if (target.screenX > window.innerWidth || target.screenY > window.innerHeight) return null;

          const isSniper = target.type === 'sniper';
          const isBoss = target.type === 'boss';

          return (
            <div
              key={`target_${target.id}`}
              className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center animate-fade-in"
              style={{
                left: `${target.screenX}px`,
                top: `${target.screenY}px`,
              }}
            >
              {/* Tactical Bracket Box */}
              <div
                className={`relative w-12 h-12 sm:w-16 sm:h-16 border-2 rounded flex items-center justify-center ${
                  isSniper
                    ? 'border-red-500 bg-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.85)] animate-pulse'
                    : isBoss
                    ? 'border-amber-400 bg-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.8)]'
                    : 'border-emerald-500/80 bg-emerald-500/10'
                }`}
              >
                <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-white" />
                <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-white" />
                <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-white" />
                <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-white" />

                <Crosshair className={`w-5 h-5 sm:w-6 sm:h-6 ${isSniper ? 'text-red-400' : isBoss ? 'text-amber-400' : 'text-emerald-400'}`} />
              </div>

              {/* Target Identification Banner */}
              <div
                className={`mt-1 px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-hud font-black tracking-wider uppercase whitespace-nowrap shadow-xl border ${
                  isSniper
                    ? 'bg-red-950/90 border-red-500 text-red-300'
                    : isBoss
                    ? 'bg-amber-950/90 border-amber-500 text-amber-300'
                    : 'bg-slate-950/90 border-emerald-500 text-emerald-300'
                }`}
              >
                {isSniper
                  ? `🎯 ${lang === 'ar' ? 'موقع قناص معادي' : 'SNIPER NEST'} (${target.distance}m)`
                  : isBoss
                  ? `🔥 ${lang === 'ar' ? 'زعيم مدرع' : 'BOSS VEHICLE'} (${target.distance}m)`
                  : `⚠️ ${lang === 'ar' ? 'عنصر معادي' : 'HOSTILE'} (${target.distance}m)`}
              </div>
            </div>
          );
        })}

      {/* OVERHEAD SURVEILLANCE CAMERA MODE FULL HUD OVERLAY */}
      {playerState.droneState?.isSurveillanceCameraActive && (
        <div className="absolute inset-0 pointer-events-none z-30 border-4 border-emerald-500/70 bg-emerald-950/15 backdrop-contrast-125 flex flex-col justify-between p-4 sm:p-6 animate-fade-in">
          <div className="flex flex-wrap justify-between items-center bg-slate-950/95 border-2 border-emerald-500/80 px-4 py-2 rounded-xl shadow-2xl pointer-events-auto">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
              <span className="text-xs sm:text-sm font-hud font-bold text-emerald-400 tracking-wider">
                {lang === 'ar' ? 'بث الاستطلاع التكتيكي المباشر (طائرة مسيرة)' : 'OVERHEAD SURVEILLANCE FEED ONLINE'}
              </span>
            </div>

            <div className="flex items-center gap-3 sm:gap-5 text-xs font-mono text-slate-200">
              <span>ALT: {playerState.droneState.altitude}M</span>
              <span className="text-emerald-400 font-bold">BATTERY: {playerState.droneState.battery}%</span>
              <span>SNIPERS MARKED: {playerState.droneState.scannedSnipersCount}</span>
              <button
                onClick={onTriggerDrone}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-hud font-bold rounded shadow-lg cursor-pointer pointer-events-auto transition-transform active:scale-95"
              >
                {lang === 'ar' ? 'العودة لمنظور صابر [E]' : 'COMMANDO VIEW [E]'}
              </button>
            </div>
          </div>

          {/* Tactical Target Scope Reticle */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 border-2 border-dashed border-emerald-400/50 rounded-full flex items-center justify-center">
              <div className="w-32 h-32 border border-emerald-400/80 rounded-full" />
              <div className="absolute w-full h-[1px] bg-emerald-500/40" />
              <div className="absolute h-full w-[1px] bg-emerald-500/40" />
            </div>
          </div>
        </div>
      )}

      {/* RADIO TRANSMISSION TRANSCRIPT BANNER (Arabic Voice Comms) */}
      {radioTransmission && (
        <div className="mx-auto mb-3 max-w-lg w-full bg-slate-950/90 border-2 border-amber-500/50 p-3 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-up pointer-events-none">
          <div className="p-2 rounded bg-amber-500/20 text-amber-400 shrink-0">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-hud font-bold text-amber-400 uppercase tracking-wider">
              {lang === 'ar' ? radioTransmission.senderAr : radioTransmission.senderEn}
            </div>
            <div className="text-xs font-arabic font-bold text-slate-100 mt-0.5 leading-snug">
              {lang === 'ar' ? radioTransmission.textAr : radioTransmission.textEn}
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM PERIMETER: Commando Vitals & Weapon Stats (Non-blocking Translucent Panels) */}
      <div className="flex items-end justify-between w-full pointer-events-none gap-2 z-10">
        {/* Left: Health, Armor, Stamina */}
        <div className="bg-slate-950/70 backdrop-blur-md border border-slate-800/80 p-2 sm:p-3 rounded-xl w-36 xs:w-44 sm:w-64 shadow-2xl pointer-events-auto">
          <div className="text-[10px] sm:text-[11px] font-hud text-slate-400 flex items-center justify-between pb-1 border-b border-slate-800/80">
            <span className="text-emerald-400 font-semibold truncate">
              {lang === 'ar' ? 'صابر' : 'SABIR'}
            </span>
            <span className="font-mono text-slate-300 text-[9px] sm:text-[10px]">
              {playerState.isCrouching
                ? (lang === 'ar' ? 'انحناء' : 'CROUCH')
                : playerState.isSprinting
                ? (lang === 'ar' ? 'ركض' : 'SPRINT')
                : (lang === 'ar' ? 'وقوف' : 'STAND')}
            </span>
          </div>

          {/* Health Bar */}
          <div className="mt-1.5">
            <div className="flex justify-between text-[10px] sm:text-xs font-hud mb-0.5">
              <span className="flex items-center gap-1 text-red-400">
                <Heart className="w-3 h-3 fill-red-500" />
                <span className="hidden xs:inline">{lang === 'ar' ? 'الصحة' : 'HP'}</span>
              </span>
              <span className="font-mono text-slate-200 tabular-nums">
                {Math.round(playerState.health)}%
              </span>
            </div>
            <div className="w-full bg-slate-900/80 h-2 rounded overflow-hidden p-0.5 border border-slate-800/80">
              <div
                className="h-full bg-gradient-to-r from-red-600 to-rose-400 rounded-sm transition-all duration-200"
                style={{ width: `${Math.max(0, playerState.health)}%` }}
              />
            </div>
          </div>

          {/* Armor Bar */}
          <div className="mt-1">
            <div className="flex justify-between text-[10px] sm:text-xs font-hud mb-0.5">
              <span className="flex items-center gap-1 text-sky-400">
                <Shield className="w-3 h-3 fill-sky-500" />
                <span className="hidden xs:inline">{lang === 'ar' ? 'الدرع' : 'ARMOR'}</span>
              </span>
              <span className="font-mono text-slate-200 tabular-nums">
                {Math.round(playerState.armor)}%
              </span>
            </div>
            <div className="w-full bg-slate-900/80 h-1.5 rounded overflow-hidden p-0.5 border border-slate-800/80">
              <div
                className="h-full bg-gradient-to-r from-sky-600 to-cyan-400 rounded-sm transition-all duration-200"
                style={{ width: `${Math.max(0, playerState.armor)}%` }}
              />
            </div>
          </div>

          {/* Stamina Meter */}
          <div className="mt-1 hidden xs:block">
            <div className="flex justify-between text-[9px] sm:text-[11px] font-hud mb-0.5">
              <span className="flex items-center gap-1 text-emerald-400">
                <Zap className="w-2.5 h-2.5 fill-emerald-500" />
                <span>{lang === 'ar' ? 'القدرة' : 'STAMINA'}</span>
              </span>
              <span className="font-mono text-slate-400 tabular-nums">
                {Math.round(playerState.stamina)}
              </span>
            </div>
            <div className="w-full bg-slate-900/80 h-1 rounded overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-sm transition-all duration-150"
                style={{ width: `${playerState.stamina}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: Weapon & Ammunition */}
        <div className="bg-slate-950/70 backdrop-blur-md border border-slate-800/80 p-2 sm:p-3 rounded-xl w-36 xs:w-44 sm:w-64 shadow-2xl pointer-events-auto">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
            <div className="text-xs sm:text-sm font-bold text-amber-400 truncate">
              {lang === 'ar' ? weapon.nameAr : weapon.nameEn}
            </div>
            <div className="text-[9px] sm:text-[11px] font-hud text-slate-400 shrink-0 ml-1">
              {playerState.currentWeapon === 'assault' ? 'AUTO' : 'SEMI'}
            </div>
          </div>

          {/* Ammo Counters */}
          <div className="mt-1.5 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-3xl font-black font-hud text-slate-100 tabular-nums">
                {playerState.isReloading ? '--' : weapon.currentAmmo}
              </span>
              <span className="text-xs sm:text-sm font-hud text-slate-400 font-mono">
                / {weapon.reserveAmmo}
              </span>
            </div>

            {/* Grenade Count */}
            <div className="flex items-center gap-1 text-[10px] sm:text-xs font-hud text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
              <Bomb className="w-3 h-3 text-amber-500" />
              <span>{playerState.grenades}</span>
            </div>
          </div>

          {/* Reload Status Message */}
          {playerState.isReloading && (
            <div className="mt-1 text-[10px] sm:text-xs font-hud font-bold text-amber-400 animate-pulse text-center bg-amber-500/10 py-0.5 rounded">
              {lang === 'ar' ? 'جاري التذخير...' : 'RELOADING...'}
            </div>
          )}

          {/* Controls Mini Helper (Desktop only) */}
          <div
            className={`mt-2 pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-500 hidden sm:flex justify-between font-hud hud-adaptive-transition ${
              playerState.isInCombat ? 'opacity-30' : 'opacity-100'
            }`}
          >
            <span>[R] {lang === 'ar' ? 'تذخير' : 'Reload'}</span>
            <span>[1/2] {lang === 'ar' ? 'سلاح' : 'Swap'}</span>
            <span>[Space] {lang === 'ar' ? 'مراوغة' : 'Dodge'}</span>
          </div>
        </div>
      </div>

      {/* INTERACTIVE PARATROOPING DESCENT UI OVERLAY */}
      {descentStatus.isActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-between p-8 sm:p-12 z-50 pointer-events-none animate-fade-in bg-slate-950/20 backdrop-blur-[2px]">
          {/* Top: Altitude & Speed Gauge */}
          <div className="w-full max-w-lg flex flex-col items-center gap-2">
            <div className="bg-slate-950/90 border-2 border-amber-500/50 rounded-xl px-8 py-4 shadow-2xl flex flex-col items-center">
              <div className="text-[10px] font-hud font-bold text-amber-500 uppercase tracking-[0.3em] mb-1">
                {lang === 'ar' ? 'الارتفاع الميداني' : 'TACTICAL ALTITUDE'}
              </div>
              <div className="text-4xl sm:text-5xl font-black text-white font-hud tabular-nums flex items-baseline gap-2">
                {Math.round(descentStatus.altitude)}
                <span className="text-sm text-slate-400">M</span>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="bg-slate-950/80 border border-slate-700 px-4 py-1.5 rounded-lg text-[10px] font-hud font-bold text-slate-300">
                {lang === 'ar' ? 'الحالة:' : 'PHASE:'} <span className="text-amber-400 uppercase">{descentStatus.phase}</span>
              </div>
              <div className="bg-slate-950/80 border border-slate-700 px-4 py-1.5 rounded-lg text-[10px] font-hud font-bold text-slate-300">
                {lang === 'ar' ? 'الرياح:' : 'WIND:'} <span className="text-emerald-400">12 KM/H NW</span>
              </div>
            </div>
          </div>

          {/* Center: Jump Instruction / Alignment Crosshair */}
          <div className="flex flex-col items-center gap-6">
            {descentStatus.phase === 'plane' ? (
              <div className="flex flex-col items-center animate-pulse">
                <div className="w-24 h-24 rounded-full border-4 border-amber-500 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(245,158,11,0.4)]">
                  <Plane className="w-10 h-10 text-amber-500" />
                </div>
                <div className="bg-amber-600 text-slate-950 px-6 py-2 rounded-full font-black font-hud text-lg uppercase tracking-wider">
                  {lang === 'ar' ? 'اضغط مسافة للقفز' : 'PRESS SPACE TO JUMP'}
                </div>
              </div>
            ) : (
              <div className="relative w-64 h-64 flex items-center justify-center">
                <div className="absolute inset-0 border-2 border-emerald-500/30 rounded-full" />
                <div className="absolute w-full h-[1px] bg-emerald-500/20" />
                <div className="absolute h-full w-[1px] bg-emerald-500/20" />
                
                {/* Dynamic Horizon / Attitude Indicator */}
                <div className="w-48 h-[2px] bg-emerald-400/80 shadow-[0_0_10px_#10b981]" />
                
                <div className="absolute bottom-[-40px] text-center">
                  <div className="text-[10px] font-hud font-bold text-emerald-400 uppercase tracking-widest mb-1">
                    {lang === 'ar' ? 'التحكم في التوجيه' : 'STEERING ENGAGED'}
                  </div>
                  <div className="text-[9px] text-slate-400 italic">
                    {lang === 'ar' ? '[WASD] للمناورة الجوية' : '[WASD] TO MANEUVER'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom: Warning / Proximity Alert */}
          <div className="w-full max-w-sm">
            {descentStatus.altitude < 150 && (
              <div className="bg-red-600/90 border-2 border-white text-white p-4 rounded-xl shadow-2xl flex flex-col items-center animate-bounce">
                <div className="text-xs font-black font-hud uppercase tracking-[0.2em]">
                  {lang === 'ar' ? 'تنبيه: اقتراب من الأرض' : 'PROXIMITY ALERT: TERRAIN'}
                </div>
                <div className="text-[10px] font-bold mt-1 opacity-80 uppercase">
                  {lang === 'ar' ? 'استعد للهبوط التكتيكي' : 'PREPARE FOR TACTICAL IMPACT'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
