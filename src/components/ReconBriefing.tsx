import React from 'react';
import { WarTheaterConfig, WarTheaterId, CustomMapConfig } from '../types/game.ts';
import { WAR_THEATERS } from '../game/theater.ts';
import { ShieldAlert, Crosshair, ArrowRight, ArrowLeft, Radio, Compass, MapPin } from 'lucide-react';
import { SatelliteMapSelector } from './SatelliteMapSelector.tsx';

interface ReconBriefingProps {
  selectedTheater: WarTheaterId;
  onSelectTheater: (id: WarTheaterId) => void;
  customMaps: CustomMapConfig[];
  customDropZone: { x: number; z: number } | null;
  onSelectDropZone: (coords: { x: number; z: number }) => void;
  onOpenMapEditor: () => void;
  onConfirmDeploy: () => void;
  onBackToTitle: () => void;
  lang: 'ar' | 'en';
}

export const ReconBriefing: React.FC<ReconBriefingProps> = ({
  selectedTheater,
  onSelectTheater,
  customMaps,
  customDropZone,
  onSelectDropZone,
  onOpenMapEditor,
  onConfirmDeploy,
  onBackToTitle,
  lang,
}) => {
  const currentTheater: WarTheaterConfig =
    customMaps.find((m) => m.id === selectedTheater) ||
    WAR_THEATERS.find((t) => t.id === selectedTheater) ||
    WAR_THEATERS[0];

  return (
    <div className="absolute inset-0 z-30 overflow-y-auto bg-slate-950/95 text-slate-100 select-none p-4 sm:p-8 flex flex-col min-h-full pb-28 scroll-smooth touch-pan-y">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30">
            <Radio className="w-5 h-5 text-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="text-[11px] font-hud text-amber-400 font-bold tracking-widest uppercase">
              {lang === 'ar' ? 'غرفة العمليات المشتركة // قيادة الاستطلاع الفضائي' : 'TACTICAL JOINT OPERATIONS // SATELLITE RECON'}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white font-arabic">
              {lang === 'ar' ? 'قاعدة خرائط الأقمار الصناعية وتقرير الاستطلاع' : 'SATELLITE RECON MAPS & INTELLIGENCE DOSSIER'}
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

      {/* Main Grid: Left Interactive Satellite Map Database, Right Target Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-auto py-4">
        {/* INTERACTIVE SATELLITE RECON MAP SELECTOR (7 Cols) */}
        <div className="lg:col-span-7">
          <SatelliteMapSelector
            selectedTheater={selectedTheater}
            onSelectTheater={onSelectTheater}
            customMaps={customMaps}
            customDropZone={customDropZone}
            onSelectDropZone={onSelectDropZone}
            lang={lang}
            onOpenMapEditor={onOpenMapEditor}
          />
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
                <p className="text-xs text-slate-300 mt-1 leading-relaxed font-arabic">
                  {lang === 'ar' ? currentTheater.descriptionAr : currentTheater.descriptionEn}
                </p>
              </div>

              <div>
                <div className="text-xs font-hud text-amber-400 font-semibold">
                  {lang === 'ar' ? 'الأمر القتالي الأساسي:' : 'PRIMARY DIRECTIVE:'}
                </div>
                <p className="text-xs text-slate-200 font-bold mt-1 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 font-arabic">
                  {lang === 'ar' ? currentTheater.objectiveAr : currentTheater.objectiveEn}
                </p>
              </div>

              {/* CUSTOM PARATROOPER DROP ZONE STATS */}
              {customDropZone && (
                <div className="bg-amber-500/15 border border-amber-500/40 p-3 rounded-xl text-xs font-hud">
                  <div className="text-amber-400 font-bold flex items-center gap-1 mb-1">
                    <MapPin className="w-4 h-4 text-amber-400" />
                    <span>{lang === 'ar' ? 'إحداثيات الإنزال المظلي المخصصة:' : 'CUSTOM DROP ZONE TARGET:'}</span>
                  </div>
                  <div className="font-mono text-slate-200">
                    X: {customDropZone.x} meters, Z: {customDropZone.z} meters
                  </div>
                </div>
              )}

              {/* MULTI-TIER SECTOR BREAKDOWN */}
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
              className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-amber-600 active:scale-95 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold font-hud text-base rounded-xl transition-all shadow-[0_0_25px_rgba(245,158,11,0.5)] flex items-center justify-center gap-3 cursor-pointer touch-manipulation min-h-[52px]"
            >
              <Compass className="w-6 h-6 text-slate-950" />
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
