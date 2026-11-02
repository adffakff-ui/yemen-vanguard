import React, { useEffect, useRef, useState } from 'react';
import { WarTheaterConfig, WarTheaterId, CustomMapConfig } from '../types/game.ts';
import { WAR_THEATERS } from '../game/theater.ts';
import { MapPin, Flame, CloudRain, Plus, Crosshair, Navigation, AlertTriangle, Layers } from 'lucide-react';

interface SatelliteMapSelectorProps {
  selectedTheater: WarTheaterId;
  onSelectTheater: (id: WarTheaterId) => void;
  customMaps: CustomMapConfig[];
  customDropZone: { x: number; z: number } | null;
  onSelectDropZone: (coords: { x: number; z: number }) => void;
  lang: 'ar' | 'en';
  onOpenMapEditor: () => void;
}

export const SatelliteMapSelector: React.FC<SatelliteMapSelectorProps> = ({
  selectedTheater,
  onSelectTheater,
  customMaps,
  customDropZone,
  onSelectDropZone,
  lang,
  onOpenMapEditor,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showWeather, setShowWeather] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; z: number; label: string } | null>(null);

  const currentTheater: WarTheaterConfig =
    customMaps.find((m) => m.id === selectedTheater) ||
    WAR_THEATERS.find((t) => t.id === selectedTheater) ||
    WAR_THEATERS[0];

  // Render animated Satellite Reconnaissance Map
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const renderMap = () => {
      time += 0.03;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const scale = 2.4; // 1 unit in 3D = 2.4 pixels in canvas

      ctx.clearRect(0, 0, w, h);

      // Dark Satellite Background
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, w, h);

      // Topographic Grid Lines
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.12)';
      ctx.lineWidth = 1;
      const gridSize = 25;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Concentric Radar Distance Rings
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.2)';
      [50, 100, 150, 200].forEach((r) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Animated Radar Scanning Line
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(time * 0.8);
      const gradient = ctx.createConicGradient(0, 0, 0);
      gradient.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
      gradient.addColorStop(0.15, 'rgba(16, 185, 129, 0)');
      gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, 220, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Enemy Patrol Route Vectors (Animated Dashed Lines)
      if (currentTheater.patrolRoutes) {
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.lineDashOffset = -time * 15;
        currentTheater.patrolRoutes.forEach((route) => {
          const x1 = cx + route.from.x * scale;
          const y1 = cy + route.from.z * scale;
          const x2 = cx + route.to.x * scale;
          const y2 = cy + route.to.z * scale;

          ctx.strokeStyle = route.type === 'buggy' ? '#f59e0b' : route.type === 'sniper' ? '#ef4444' : '#10b981';
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        });
        ctx.setLineDash([]);
      }

      // Heatmaps Layer (Radial Threat Gradients)
      if (showHeatmap && currentTheater.heatmapData) {
        currentTheater.heatmapData.forEach((point) => {
          const px = cx + point.x * scale;
          const py = cy + point.z * scale;
          const radius = 35 + Math.sin(time * 3 + point.x) * 4;

          const heatGrad = ctx.createRadialGradient(px, py, 2, px, py, radius);
          heatGrad.addColorStop(0, `rgba(239, 68, 68, ${0.7 * point.intensity})`);
          heatGrad.addColorStop(0.6, `rgba(245, 158, 11, ${0.3 * point.intensity})`);
          heatGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');

          ctx.fillStyle = heatGrad;
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fill();

          // Danger Point Indicator
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(px, py, 4, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Animated Weather Clouds Overlay (Moving Atmosphere)
      if (showWeather) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        for (let i = 0; i < 5; i++) {
          const wx = ((time * 20 + i * 90) % (w + 100)) - 50;
          const wy = 40 + i * 60 + Math.sin(time + i) * 15;
          ctx.beginPath();
          ctx.arc(wx, wy, 45, 0, Math.PI * 2);
          ctx.arc(wx + 25, wy - 10, 35, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Selected Custom Drop Zone Marker
      if (customDropZone) {
        const dzX = cx + customDropZone.x * scale;
        const dzY = cy + customDropZone.z * scale;

        // Glowing Target Pulse
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        const pulseR = 12 + Math.sin(time * 6) * 4;
        ctx.beginPath();
        ctx.arc(dzX, dzY, pulseR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(dzX, dzY, 5, 0, Math.PI * 2);
        ctx.fill();

        // Crosshair Lines
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(dzX - 14, dzY);
        ctx.lineTo(dzX + 14, dzY);
        ctx.moveTo(dzX, dzY - 14);
        ctx.lineTo(dzX, dzY + 14);
        ctx.stroke();
      }

      animId = requestAnimationFrame(renderMap);
    };

    renderMap();
    return () => cancelAnimationFrame(animId);
  }, [currentTheater, showHeatmap, showWeather, customDropZone]);

  // Click on satellite map to set custom paratrooper touchdown point
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const scale = 2.4;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const worldX = Math.round((clickX - cx) / scale);
    const worldZ = Math.round((clickY - cy) / scale);

    onSelectDropZone({ x: worldX, z: worldZ });
  };

  return (
    <div className="bg-slate-950/90 border-2 border-amber-500/60 p-4 rounded-2xl shadow-2xl backdrop-blur-md max-w-4xl w-full mx-auto">
      {/* Header & Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-amber-500/30">
        <div>
          <div className="text-xs font-hud font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>{lang === 'ar' ? 'قاعدة خرائط الاستطلاع الفضائي 2D' : 'SATELLITE RECON MAP DATABASE'}</span>
          </div>
          <div className="text-base sm:text-lg font-bold text-white font-arabic mt-0.5">
            {lang === 'ar' ? currentTheater.nameAr : currentTheater.nameEn}
          </div>
        </div>

        {/* Toggles & Builder Launcher */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-3 py-1.5 rounded-lg text-xs font-hud font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              showHeatmap
                ? 'bg-red-500/30 border-red-500 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-red-400" />
            <span>{lang === 'ar' ? 'الخريطة الحرارية' : 'Heatmap'}</span>
          </button>

          <button
            onClick={() => setShowWeather(!showWeather)}
            className={`px-3 py-1.5 rounded-lg text-xs font-hud font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              showWeather
                ? 'bg-sky-500/30 border-sky-500 text-sky-300 shadow-[0_0_12px_rgba(14,165,233,0.4)]'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            <CloudRain className="w-3.5 h-3.5 text-sky-400" />
            <span>{lang === 'ar' ? 'رادار الطقس' : 'Weather'}</span>
          </button>

          <button
            onClick={onOpenMapEditor}
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-hud font-black text-xs shadow-lg cursor-pointer flex items-center gap-1.5 transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'ar' ? 'إنشاء خريطة مخصصة' : 'CREATE MAP'}</span>
          </button>
        </div>
      </div>

      {/* Theater Map Selector Tabs (Standard & Custom Maps) */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
        {WAR_THEATERS.map((theater) => (
          <button
            key={theater.id}
            onClick={() => onSelectTheater(theater.id)}
            className={`px-3 py-2 rounded-xl text-xs font-hud font-bold border whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
              selectedTheater === theater.id
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-105'
                : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300'
            }`}
          >
            <span>{lang === 'ar' ? theater.nameAr.split(' ')[0] : theater.nameEn.split(' ')[0]}</span>
            <span className="text-[10px] opacity-75 font-mono">({theater.coordinates.lat})</span>
          </button>
        ))}

        {customMaps.map((map) => (
          <button
            key={map.id}
            onClick={() => onSelectTheater(map.id)}
            className={`px-3 py-2 rounded-xl text-xs font-hud font-bold border whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
              selectedTheater === map.id
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-105'
                : 'bg-slate-900/80 hover:bg-slate-800 border-emerald-900 text-emerald-300'
            }`}
          >
            <span>🛠️ {lang === 'ar' ? map.nameAr : map.nameEn}</span>
          </button>
        ))}
      </div>

      {/* Interactive Satellite Canvas Display */}
      <div className="relative w-full h-72 sm:h-96 rounded-xl overflow-hidden border-2 border-slate-800 shadow-inner group">
        <canvas
          ref={canvasRef}
          width={700}
          height={400}
          onClick={handleCanvasClick}
          className="w-full h-full cursor-crosshair object-cover"
        />

        {/* Instructions Overlay Banner */}
        <div className="absolute top-3 left-3 bg-slate-950/85 backdrop-blur-md border border-amber-500/50 px-3 py-1.5 rounded-lg text-[10px] font-hud text-amber-300 flex items-center gap-1.5 shadow-lg">
          <Navigation className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>
            {lang === 'ar'
              ? 'انقر على الخريطة لتحديد نقطة الإنزال المظلي المخصصة'
              : 'Tap anywhere on satellite map to set custom Paratrooper Drop Zone'}
          </span>
        </div>

        {/* Threat Level & Coordinates Readout */}
        <div className="absolute bottom-3 left-3 bg-slate-950/90 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-hud text-slate-200 flex items-center gap-3 shadow-xl">
          <div className="flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-amber-400 font-bold">{currentTheater.threatLevel} THREAT</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="font-mono text-[11px] text-slate-300">
            LAT: {currentTheater.coordinates.lat} • LNG: {currentTheater.coordinates.lng}
          </div>
        </div>

        {/* Active Drop Zone Waypoint Coordinate Display */}
        {customDropZone && (
          <div className="absolute bottom-3 right-3 bg-amber-500 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-hud font-black flex items-center gap-1.5 shadow-2xl animate-bounce">
            <MapPin className="w-4 h-4 fill-slate-950" />
            <span>
              {lang === 'ar' ? 'إحداثيات الإنزال:' : 'DROP TARGET:'} X={customDropZone.x}, Z={customDropZone.z}
            </span>
          </div>
        )}
      </div>

      {/* Description & Objective */}
      <div className="mt-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs font-arabic text-slate-300 leading-relaxed flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <span className="text-amber-400 font-bold font-hud uppercase mr-2">
            {lang === 'ar' ? 'الوصف التكتيكي:' : 'TACTICAL BRIEF:'}
          </span>
          {lang === 'ar' ? currentTheater.descriptionAr : currentTheater.descriptionEn}
        </div>
        <div className="text-[10px] font-hud font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-1 rounded shrink-0">
          🎯 {lang === 'ar' ? currentTheater.objectiveAr : currentTheater.objectiveEn}
        </div>
      </div>
    </div>
  );
};
