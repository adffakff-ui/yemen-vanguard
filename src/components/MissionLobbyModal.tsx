import React, { useState, useEffect } from 'react';
import { Plane, Users, CheckCircle2, AlertTriangle, X, Play, Loader2, ShieldCheck } from 'lucide-react';
import { saveManager } from '../game/saveManager';
import { soundManager } from '../game/audio';

interface MissionLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeploy: (subscriberCount: number) => void;
  lang: 'ar' | 'en';
  theaterName: string;
}

export const MissionLobbyModal: React.FC<MissionLobbyModalProps> = ({
  isOpen,
  onClose,
  onDeploy,
  lang,
  theaterName,
}) => {
  const [subscriberCount, setSubscriberCount] = useState(14);
  const [isLobbyReady, setIsLobbyReady] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      saveManager.getSubscriberCount().then((count) => {
        setSubscriberCount(count > 0 ? count : 14);
        setIsLoading(false);
        setIsLobbyReady(true);
        soundManager.playRadioVoiceCallout();
      }).catch(() => {
        setIsLoading(false);
        setIsLobbyReady(true);
      });
      
      saveManager.updateSubscriber('waiting');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-xl animate-fade-in font-arabic pointer-events-auto">
      <div className="relative w-full max-w-2xl max-h-[92vh] bg-slate-900 border-2 border-amber-500/50 rounded-2xl shadow-[0_0_80px_rgba(245,158,11,0.25)] overflow-hidden flex flex-col">
        {/* Animated Scanning Header */}
        <div className="absolute top-0 left-0 w-full h-1 bg-amber-500/20 z-10">
          <div className="h-full bg-amber-500 shadow-[0_0_10px_#f59e0b] animate-scan-line" style={{ width: '30%' }} />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <Plane className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
            </div>
            <div>
              <div className="text-[10px] font-hud font-bold text-amber-500 uppercase tracking-[0.2em]">
                {lang === 'ar' ? 'مركز التعبئة الميدانية' : 'TACTICAL MOBILIZATION CENTER'}
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                {lang === 'ar' ? 'غرفة عمليات الإنزال المظلي' : 'Paratrooper Infiltration Lobby'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body - Scrollable on mobile */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1 touch-pan-y">
          {/* Mission Intel Card */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 sm:p-4 space-y-1">
              <div className="text-[10px] font-hud font-bold text-slate-500 uppercase">{lang === 'ar' ? 'مسرح العمليات' : 'THEATER OF OPS'}</div>
              <div className="text-sm font-bold text-white uppercase tracking-wider">{theaterName}</div>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 sm:p-4 space-y-1 text-right">
              <div className="text-[10px] font-hud font-bold text-slate-500 uppercase">{lang === 'ar' ? 'كود الانتشار' : 'DEPLOYMENT CODE'}</div>
              <div className="text-sm font-mono font-bold text-amber-500">SABIR-ALPHA-9</div>
            </div>
          </div>

          {/* Subscriber Count Display */}
          <div className="bg-gradient-to-br from-amber-500/15 via-slate-950/60 to-slate-950 border border-amber-500/30 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-4 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
            {isLoading ? (
              <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
            ) : (
              <div className="relative">
                <Users className="w-16 h-16 text-amber-500/50" />
                <div className="absolute inset-0 flex items-center justify-center text-3xl font-black text-white font-hud">
                  {subscriberCount}
                </div>
              </div>
            )}
            
            <div>
              <h4 className="text-base sm:text-lg font-bold text-white">
                {lang === 'ar' ? 'المظليون المستعدون للإنزال' : 'Paratroopers Ready for Jump'}
              </h4>
              <p className="text-xs text-slate-300 max-w-sm mt-1">
                {lang === 'ar' 
                  ? 'تم تأكيد جاهزية الكتيبة. سيتم تنفيذ الإنزال التكتيكي في تكوين هجومي مشترك.'
                  : 'Battalion readiness confirmed. Tactical descent will execute in joint offensive formation.'}
              </p>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[11px] text-emerald-300 font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>{lang === 'ar' ? 'الشبكة التكتيكية نشطة' : 'TACTICAL NETWORK ACTIVE'}</span>
            </div>
          </div>

          {/* Security Warning */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 sm:p-4 flex gap-3 items-start">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-300 leading-relaxed font-arabic">
              <span className="text-amber-400 font-bold uppercase">{lang === 'ar' ? 'تنبيه القيادة:' : 'COMMAND ALERT:'}</span>{' '}
              {lang === 'ar' 
                ? 'تأكد من معايرة مظلتك التكتيكية قبل القفز من الطائرة. الرياح في منطقة الإنزال قد تؤثر على دقة التمركز.'
                : 'Ensure tactical parachute calibration before jumping. LZ winds may affect positioning accuracy.'}
            </div>
          </div>
        </div>

        {/* Modal Footer / Action - Prominent Sticky Start Button */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/90 shrink-0">
          <button
            onClick={() => {
              saveManager.updateSubscriber('dropping');
              onDeploy(subscriberCount);
            }}
            className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-slate-950 font-black font-hud text-base sm:text-lg rounded-xl shadow-[0_0_35px_rgba(245,158,11,0.6)] transition-all flex items-center justify-center gap-3 cursor-pointer touch-manipulation min-h-[56px]"
          >
            <Play className="w-6 h-6 fill-current text-slate-950 animate-pulse" />
            <span>{lang === 'ar' ? 'بدء الإنزال المظلي الآن (DEPLOY)' : 'EXECUTE PARATROOPER JUMP'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
