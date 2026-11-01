import React from 'react';
import { Shield, Cpu, Activity } from 'lucide-react';
import { AssetLoadProgress } from '../game/assetLoader.ts';

interface LoadingScreenProps {
  progressData: AssetLoadProgress | null;
  onComplete?: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ progressData }) => {
  const percent = progressData ? progressData.progress : 0;
  const currentItem = progressData ? progressData.currentItem : 'Initializing Systems...';

  return (
    <div className="absolute inset-0 z-50 bg-slate-950 text-white flex flex-col items-center justify-center p-6 select-none font-mono">
      {/* Background tactical grid effect */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      <div className="relative z-10 max-w-md w-full bg-slate-900/90 border border-emerald-500/40 rounded-xl p-8 shadow-2xl shadow-emerald-950/50 backdrop-blur-md flex flex-col items-center text-center">
        {/* Logo / Header */}
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/50 rounded-2xl flex items-center justify-center mb-6 text-emerald-400 shadow-inner">
          <Shield className="w-8 h-8 animate-pulse" />
        </div>

        <h1 className="text-2xl font-black tracking-wider text-emerald-400 mb-1 uppercase">
          Tactical Strike
        </h1>
        <p className="text-xs text-slate-400 tracking-widest uppercase mb-8">
          Mobile Combat Theater v3.5
        </p>

        {/* Progress Bar Container */}
        <div className="w-full bg-slate-800/80 rounded-full h-3 mb-4 overflow-hidden border border-slate-700 p-0.5">
          <div
            className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full rounded-full transition-all duration-300 ease-out shadow-[0_0_12px_rgba(16,185,129,0.5)]"
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Status Text & Percentage */}
        <div className="w-full flex items-center justify-between text-xs text-slate-300 mb-6">
          <div className="flex items-center gap-2 truncate max-w-[240px]">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-spin flex-shrink-0" />
            <span className="truncate">{currentItem}</span>
          </div>
          <span className="font-bold text-emerald-400 tabular-nums">{percent}%</span>
        </div>

        {/* System Diagnostics Footer */}
        <div className="w-full pt-4 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-emerald-500" />
            RAM CACHE OPTIMIZED
          </span>
          <span className="text-emerald-500 font-semibold">SECURE LINK</span>
        </div>
      </div>
    </div>
  );
};
