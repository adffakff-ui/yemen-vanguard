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
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [isLobbyReady, setIsLobbyReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      // Fetch subscriber count (simulated for now)
      saveManager.getSubscriberCount().then((count) => {
        setSubscriberCount(count);
        setIsLoading(false);
        setIsLobbyReady(true);
        soundManager.playRadioVoiceCallout();
      });
      
      // Update our own status
      saveManager.updateSubscriber('waiting');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-fade-in font-arabic">
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-amber-500/30 rounded-2xl shadow-[0_0_80px_rgba(245,158,11,0.15)] overflow-hidden flex flex-col">
        {/* Animated Scanning Header */}
        <div className="absolute top-0 left-0 w-full h-1 bg-amber-500/20">
          <div className="h-full bg-amber-500 shadow-[0_0_10px_#f59e0b] animate-scan-line" style={{ width: '30%' }} />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.1)]">
              <Plane className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <div className="text-[10px] font-hud font-bold text-amber-500 uppercase tracking-[0.2em]">
                {lang === 'ar' ? 'مركز التعبئة الميدانية' : 'TACTICAL MOBILIZATION CENTER'}
              </div>
              <h2 className="text-xl font-black text-white">
                {lang === 'ar' ? 'غرفة عمليات الإنزال المظلي' : 'Paratrooper Infiltration Lobby'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Mission Intel Card */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-1">
              <div className="text-[10px] font-hud font-bold text-slate-500 uppercase">{lang === 'ar' ? 'مسرح العمليات' : 'THEATER OF OPS'}</div>
              <div className="text-sm font-bold text-white uppercase tracking-wider">{theaterName}</div>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-1 text-right">
              <div className="text-[10px] font-hud font-bold text-slate-500 uppercase">{lang === 'ar' ? 'كود الانتشار' : 'DEPLOYMENT CODE'}</div>
              <div className="text-sm font-mono font-bold text-amber-500">SABIR-ALPHA-9</div>
            </div>
          </div>

          {/* Subscriber Count Display */}
          <div className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4">
            {isLoading ? (
              <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
            ) : (
              <div className="relative">
                <Users className="w-16 h-16 text-amber-500/40" />
                <div className="absolute inset-0 flex items-center justify-center text-3xl font-black text-white font-hud">
                  {subscriberCount}
                </div>
              </div>
            )}
            
            <div>
              <h4 className="text-lg font-bold text-white">
                {lang === 'ar' ? 'المظليون المستعدون للإنزال' : 'Paratroopers Ready for Jump'}
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                {lang === 'ar' 
                  ? 'تم تأكيد جاهزية الكتيبة. سيتم تنفيذ الإنزال التكتيكي في تكوين هجومي مشترك.'
                  : 'Battalion readiness confirmed. Tactical descent will execute in joint offensive formation.'}
              </p>
            </div>

            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] text-emerald-400 font-bold tracking-widest uppercase">
              <ShieldCheck className="w-3 h-3" />
              {lang === 'ar' ? 'الشبكة التكتيكية نشطة' : 'TACTICAL NETWORK ACTIVE'}
            </div>
          </div>

          {/* Security Warning */}
          <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 flex gap-3 items-start">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-400 leading-relaxed">
              <span className="text-amber-500 font-bold uppercase">{lang === 'ar' ? 'تنبيه القيادة:' : 'COMMAND ALERT:'}</span>{' '}
              {lang === 'ar' 
                ? 'تأكد من معايرة مظلتك التكتيكية قبل القفز من الطائرة. الرياح في منطقة الإنزال قد تؤثر على دقة التمركز.'
                : 'Ensure tactical parachute calibration before jumping. LZ winds may affect positioning accuracy.'}
            </div>
          </div>
        </div>

        {/* Modal Footer / Action */}
        <div className="p-6 border-t border-slate-800 bg-slate-950/50">
          <button
            onClick={() => {
              saveManager.updateSubscriber('dropping');
              onDeploy(subscriberCount);
            }}
            disabled={!isLobbyReady}
            className="w-full py-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black font-hud text-base rounded-xl shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-all transform hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>{lang === 'ar' ? 'بدء الإنزال المظلي الآن' : 'EXECUTE PARATROOPER JUMP'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
