import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Sparkles } from 'lucide-react';
import { DownloadModal } from './DownloadModal';

interface PWAInstallButtonProps {
  lang: 'ar' | 'en';
  variant?: 'compact' | 'prominent';
  onClick?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  lang,
  variant = 'compact',
  onClick,
}) => {
  const { isInstallable, isInstalled } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    } else {
      setShowModal(true);
    }
  };

  const buttonClass =
    variant === 'prominent'
      ? 'px-5 py-3.5 bg-gradient-to-r from-amber-500/20 via-amber-500/30 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-500/40 border border-amber-500/70 text-amber-300 font-bold font-hud text-xs sm:text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.25)] flex items-center gap-2.5 cursor-pointer transform hover:scale-[1.02]'
      : 'px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 rounded-lg text-xs font-hud font-bold text-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer shadow-md';

  return (
    <>
      <button
        onClick={handleClick}
        className={buttonClass}
        title={lang === 'ar' ? 'زر التحميل وتثبيت اللعبة وحفظ البيانات' : 'Download and install game'}
      >
        <Download className={variant === 'prominent' ? 'w-4 h-4 text-amber-400' : 'w-3.5 h-3.5 text-amber-400'} />
        <span>
          {isInstalled
            ? (lang === 'ar' ? 'مركز التحميل وحزمة APK' : 'DOWNLOAD CENTER & APK')
            : (lang === 'ar' ? 'تحميل وتثبيت (APK / App)' : 'DOWNLOAD & INSTALL (APK)')}
        </span>
        <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 font-black text-[9px] rounded font-mono">
          APK
        </span>
      </button>

      {showModal && (
        <DownloadModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          lang={lang}
        />
      )}
    </>
  );
};
