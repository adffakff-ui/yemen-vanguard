import React from 'react';
import { WarTheaterConfig, WarTheaterId } from '../types/game.ts';
import { WAR_THEATERS } from '../game/theater.ts';
import { MapPin, ShieldAlert, Crosshair, ArrowRight, ArrowLeft, Radio, Compass, Eye } from 'lucide-react';

interface ReconBriefingProps {
  selectedTheater: WarTheaterId;
  onSelectTheater: (id: WarTheaterId) => void;
  onConfirmDeploy: () => void;
  onBackToTitle: () => void;
  lang: 'ar' | 'en';
}

export const ReconBriefing: React.FC<ReconBriefingProps> = ({
  selectedTheater,
  onSelectTheater,
  onConfirmDeploy,
  onBackToTitle,
  lang,
}) => {
  const currentTheater = WAR_THEATERS.find((t) => t.id === selectedTheater) || WAR_THEATERS[0];

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-between p-4 sm:p-8 bg-slate-950/95 text-slate-100 select-none overflow-y-auto">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30">
            <Radio className="w-5 h-5 text-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="text-[11px] font-hud text-amber-400 font-bold tracking-widest uppercase">
              {lang === 'ar' ? 'غرفة العمليات المشتركة // قيادة الاستطلاع' : 'TACTICAL JOINT OPERATIONS // RECON DOSSIER'}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white font-arabic">
              {lang === 'ar' ? 'خريطة مسرح العمليات وتقرير الاستطلاع' : 'YEMEN THEATER RECONNAISSANCE MAP'}
            </h1>
          </div>
        </div>

        <button
          onClick={onBackToTitle}
          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-hud text-slate-300 transition-colors flex items-center gap-2 cursor-pointer"
        >
          {lang === 'ar' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          <span>{lang === 'ar' ? 'القائمة الرئيسية' : 'BACK'}</span>
        </button>
      </div>

      {/* Main Grid: Left Interactive Satellite Map, Right Target Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-auto py-4">
        {/* SATELLITE OPERATIONAL MAP (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-6 relative overflow-hidden flex flex-col justify-between">
          {/* Tactical Map Grid Canvas / SVG */}
          <div className="relative w-full h-72 sm:h-96 rounded-xl border border-slate-700/60 bg-gradient-to-b from-slate-950 to-slate-900 overflow-hidden flex items-center justify-center">
            {/* Grid Coordinates Overlay */}
            <div className="absolute inset-0 radar-grid opacity-60 pointer-events-none" />

            {/* Yemen Topographic Stylized Vector Map Contour */}
            <svg
              className="w-full h-full p-4 text-slate-800 opacity-90"
              viewBox="0 0 600 400"
              fill="none"
            >
              {/* Coastline / Country Silhouette */}
              <path
                d="M 60 220 Q 120 180 180 200 T 320 220 T 480 210 T 560 160 L 580 320 Q 450 360 300 340 T 120 330 Z"
                fill="rgba(30, 41, 59, 0.4)"
                stroke="#475569"
                strokeWidth="2"
                strokeDasharray="4 2"
              />
              {/* Mountain ridge elevation lines */}
              <path
                d="M 140 210 Q 200 160 260 210 T 380 200"
                stroke="#64748b"
                strokeWidth="1.5"
                strokeDasharray="2 4"
              />
              <path
                d="M 180 240 Q 240 190 320 230"
                stroke="#64748b"
                strokeWidth="1"
              />

              {/* Red Sea & Gulf of Aden water labels */}
              <text x="70" y="320" fill="#38bdf8" fontSize="11" fontFamily="monospace" opacity="0.6">
                RED SEA // البحر الأحمر
              </text>
              <text x="320" y="360" fill="#38bdf8" fontSize="11" fontFamily="monospace" opacity="0.6">
                GULF OF ADEN // خليج عدن
              </text>
            </svg>

            {/* INTERACTIVE THEATER PINS ON MAP */}
            {/* Sana'a Pin (Highlands) */}
            <button
              onClick={() => onSelectTheater('sanaa')}
              className={`absolute top-24 left-1/3 -translate-x-1/2 p-2 rounded-xl transition-all cursor-pointer flex flex-col items-center group ${
                selectedTheater === 'sanaa'
                  ? 'bg-amber-500/20 border-2 border-amber-400 scale-110 shadow-[0_0_20px_#f59e0b]'
                  : 'bg-slate-900/90 border border-slate-700 hover:border-amber-400/60'
              }`}
            >
              <MapPin className={`w-6 h-6 ${selectedTheater === 'sanaa' ? 'text-amber-400' : 'text-slate-400'}`} />
              <span className="text-[10px] font-hud font-bold text-slate-200 bg-slate-950/90 px-1.5 py-0.5 rounded mt-1 whitespace-nowrap">
                {lang === 'ar' ? 'صنعاء (الحصن الجبلي)' : "Sana'a Citadel"}
              </span>
            </button>

            {/* Bab-el-Mandeb Pin (Strait Coast) */}
            <button
              onClick={() => onSelectTheater('mandeeb')}
              className={`absolute bottom-16 left-24 p-2 rounded-xl transition-all cursor-pointer flex flex-col items-center group ${
                selectedTheater === 'mandeeb'
                  ? 'bg-cyan-500/20 border-2 border-cyan-400 scale-110 shadow-[0_0_20px_#06b6d4]'
                  : 'bg-slate-900/90 border border-slate-700 hover:border-cyan-400/60'
              }`}
            >
              <MapPin className={`w-6 h-6 ${selectedTheater === 'mandeeb' ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span className="text-[10px] font-hud font-bold text-slate-200 bg-slate-950/90 px-1.5 py-0.5 rounded mt-1 whitespace-nowrap">
                {lang === 'ar' ? 'مضيق باب المندب' : 'Bab-el-Mandeb'}
              </span>
            </button>

            {/* Hadramaut Pin (Canyon Valley) */}
            <button
              onClick={() => onSelectTheater('hadramaut')}
              className={`absolute top-28 right-28 p-2 rounded-xl transition-all cursor-pointer flex flex-col items-center group ${
                selectedTheater === 'hadramaut'
                  ? 'bg-orange-500/20 border-2 border-orange-400 scale-110 shadow-[0_0_20px_#f97316]'
                  : 'bg-slate-900/90 border border-slate-700 hover:border-orange-400/60'
              }`}
            >
              <MapPin className={`w-6 h-6 ${selectedTheater === 'hadramaut' ? 'text-orange-400' : 'text-slate-400'}`} />
              <span className="text-[10px] font-hud font-bold text-slate-200 bg-slate-950/90 px-1.5 py-0.5 rounded mt-1 whitespace-nowrap">
                {lang === 'ar' ? 'وادي حضرموت' : 'Hadramaut Gorge'}
              </span>
            </button>

            {/* Live GPS Coordinates Tracker */}
            <div className="absolute bottom-2 left-2 text-[10px] font-mono text-slate-400 bg-slate-950/80 px-2 py-1 rounded border border-slate-800">
              COORDS: {currentTheater.coordinates.lat}, {currentTheater.coordinates.lng}
            </div>
          </div>

          {/* Quick Region Selector Strip below map */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            {WAR_THEATERS.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelectTheater(t.id)}
                className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                  selectedTheater === t.id
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="text-xs font-arabic">{lang === 'ar' ? t.nameAr : t.nameEn}</div>
                <div className="text-[9px] font-mono text-slate-500 mt-0.5">{t.threatLevel} THREAT</div>
              </button>
            ))}
          </div>
        </div>

        {/* TACTICAL INTELLIGENCE DOSSIER (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            {/* Target Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[11px] font-hud text-amber-400 font-bold uppercase tracking-wider">
                  {lang === 'ar' ? 'تقرير قطاع العمليات' : 'SECTOR INTELLIGENCE REPORT'}
                </span>
                <h2 className="text-xl font-black text-white font-arabic mt-0.5">
                  {lang === 'ar' ? currentTheater.nameAr : currentTheater.nameEn}
                </h2>
              </div>

              {/* Threat Level Badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-500/15 border border-red-500/40 text-red-400 text-xs font-hud font-bold">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{currentTheater.threatLevel}</span>
              </div>
            </div>

            {/* Description & Objective */}
            <div className="mt-3.5 space-y-3">
              <div>
                <div className="text-xs font-hud text-slate-400 font-semibold">
                  {lang === 'ar' ? 'وصف مسرح القتال:' : 'TERRAIN TOPOGRAPHY:'}
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {lang === 'ar' ? currentTheater.descriptionAr : currentTheater.descriptionEn}
                </p>
              </div>

              <div>
                <div className="text-xs font-hud text-amber-400 font-semibold">
                  {lang === 'ar' ? 'الأمر القتالي الأساسي:' : 'PRIMARY DIRECTIVE:'}
                </div>
                <p className="text-xs text-slate-200 font-bold mt-1 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                  {lang === 'ar' ? currentTheater.objectiveAr : currentTheater.objectiveEn}
                </p>
              </div>

              {/* 3-SECTOR & 3-WAVE COMBAT ESCALATION PREVIEW */}
              <div className="pt-2">
                <div className="text-xs font-hud text-slate-400 font-semibold mb-2">
                  {lang === 'ar' ? 'مستويات القطاعات التكتيكية والاشتباك (3 قطاعات):' : 'MULTI-TIER SECTOR BREAKDOWN:'}
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="p-2 rounded bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <span className="font-bold text-amber-400 font-mono">SECTOR ALPHA:</span>
                      <span>{lang === 'ar' ? 'الخنادق السفلية والدشم' : 'Frontline Trenches & Bunkers'}</span>
                    </span>
                    <span className="font-mono text-emerald-400">GROUND TIER</span>
                  </div>
                  <div className="p-2 rounded bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <span className="font-bold text-sky-400 font-mono">SECTOR BRAVO:</span>
                      <span>{lang === 'ar' ? 'أعشاش القناصة والأبراج العلوية' : 'Elevated Sniper Nests & Towers'}</span>
                    </span>
                    <span className="font-mono text-sky-400">HIGH VANTAGE</span>
                  </div>
                  <div className="p-2 rounded bg-red-950/30 border border-red-500/30 flex items-center justify-between">
                    <span className="text-red-300 font-bold flex items-center gap-1.5">
                      <Crosshair className="w-3.5 h-3.5 text-red-400" />
                      <span className="font-mono">SECTOR CHARLIE:</span>
                      <span>{lang === 'ar' ? 'المستودع ومدرعة الزعيم' : 'Vehicle Gate & Armored Boss'}</span>
                    </span>
                    <span className="font-mono text-red-400 font-bold">AUTOCANNON BOSS</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Confirm & Deploy Button */}
          <div className="mt-6 pt-4 border-t border-slate-800">
            <button
              onClick={onConfirmDeploy}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold font-hud text-base rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center justify-center gap-3 cursor-pointer"
            >
              <Compass className="w-5 h-5 text-slate-950" />
              <span>
                {lang === 'ar' ? 'تأكيد الخطة وبدء الانتشار التكتيكي' : 'CONFIRM ORDERS & DEPLOY NOW'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center text-[11px] font-hud text-slate-500 border-t border-slate-800/80 pt-2">
        COMMAND DIRECTIVE: ALL OPERATIONS UNDER GENERAL HEADQUARTERS // 60 FPS SIMULATION
      </div>
    </div>
  );
};
