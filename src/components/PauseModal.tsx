import React from 'react';
import { Volume2, VolumeX, Globe, Play, RotateCcw, Home } from 'lucide-react';
import { soundManager } from '../game/audio.ts';
import { PWAInstallButton } from './PWAInstallButton.tsx';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onQuitToTitle: () => void;
  lang: 'ar' | 'en';
  onToggleLang: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onQuitToTitle,
  lang,
  onToggleLang,
}) => {
  const [isMuted, setIsMuted] = React.useState(soundManager.getMuted());

  const handleToggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/75 select-none pointer-events-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
        <div className="text-center pb-4 border-b border-slate-800">
          <div className="text-xs font-hud font-bold text-amber-400 uppercase tracking-widest">
            {lang === 'ar' ? 'العمليات الميدانية معلقة' : 'OPERATION SUSPENDED'}
          </div>
          <h2 className="text-2xl font-black text-white font-arabic mt-1">
            {lang === 'ar' ? 'إيقاف مؤقت' : 'TACTICAL PAUSE'}
          </h2>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-2.5">
          <div className="flex justify-center mb-1">
            <PWAInstallButton lang={lang} />
          </div>
          
          <button
            onClick={onResume}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-hud rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>{lang === 'ar' ? 'استئناف القتال [ESC]' : 'RESUME COMBAT'}</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium font-hud rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span>{lang === 'ar' ? 'إعادة المهمة' : 'RESTART MISSION'}</span>
          </button>

          <button
            onClick={onQuitToTitle}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium font-hud rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4 text-slate-400" />
            <span>{lang === 'ar' ? 'العودة للقائمة الرئيسية' : 'ABORT TO TITLE'}</span>
          </button>
        </div>

        {/* Quick Toggles */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-hud text-slate-400">
          <button
            onClick={onToggleLang}
            className="flex items-center gap-2 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <Globe className="w-4 h-4 text-amber-400" />
            <span>{lang === 'ar' ? 'English' : 'عربي'}</span>
          </button>

          <button
            onClick={handleToggleMute}
            className="flex items-center gap-2 hover:text-slate-200 transition-colors cursor-pointer"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
            <span>{isMuted ? (lang === 'ar' ? 'صامت' : 'Muted') : (lang === 'ar' ? 'صوت مفعّل' : 'Audio On')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
