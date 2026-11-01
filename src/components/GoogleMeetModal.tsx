import React, { useState, useEffect } from 'react';
import {
  Video,
  Plus,
  Link as LinkIcon,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  X,
  LogOut,
  ShieldAlert,
  User as UserIcon,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
} from '../services/gmailAuth.ts';
import {
  createMeetSpace,
  MeetSpace,
} from '../services/googleMeetApi.ts';

interface GoogleMeetModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'ar' | 'en';
}

export const GoogleMeetModal: React.FC<GoogleMeetModalProps> = ({
  isOpen,
  onClose,
  lang = 'ar',
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [currentSpace, setCurrentMeetSpace] = useState<MeetSpace | null>(null);

  // Auto initialize auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, cachedToken) => {
        setCurrentUser(user);
        setToken(cachedToken);
      },
      () => {
        setCurrentUser(null);
        setToken(null);
        setCurrentMeetSpace(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setIsLoggingIn(true);
    setErrorMsg(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setToken(res.accessToken);
        setSuccessMsg(lang === 'ar' ? 'تم تسجيل الدخول بنجاح!' : 'Successfully signed in!');
        setTimeout(() => setSuccessMsg(null), 3500);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to sign in');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setCurrentUser(null);
    setToken(null);
    setCurrentMeetSpace(null);
  };

  const handleCreateSpace = async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const space = await createMeetSpace(token);
      setCurrentMeetSpace(space);
      setSuccessMsg(lang === 'ar' ? 'تم إنشاء غرفة الاجتماع بنجاح!' : 'Meet space created successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to create Meet space');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccessMsg(lang === 'ar' ? 'تم نسخ الرابط التكتيكي!' : 'Tactical link copied!');
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md select-none pointer-events-auto animate-fade-in font-arabic">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/90 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Glow Strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-400 to-purple-400 animate-pulse" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.25)] shrink-0">
              <Video className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-xs font-hud font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                <span>{lang === 'ar' ? 'منظومة التنسيق الميداني' : 'TACTICAL COORDINATION SYSTEM'}</span>
                <span className="text-slate-600">·</span>
                <span className="text-emerald-400">GOOGLE MEET</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                {lang === 'ar' ? 'غرفة الاجتماعات المرئية (Google Meet)' : 'Tactical Video Briefing (Google Meet)'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser && (
              <button
                onClick={handleSignOut}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-hud flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              >
                <LogOut className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">{lang === 'ar' ? 'خروج' : 'Sign Out'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Banners */}
        {errorMsg && (
          <div className="bg-red-500/15 border-b border-red-500/40 p-3 flex items-center justify-between text-xs text-red-300 animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-500/15 border-b border-emerald-500/40 p-3 flex items-center justify-between text-xs text-emerald-300 animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {!currentUser ? (
            <div className="py-8 px-4 flex flex-col items-center text-center space-y-6 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border-2 border-blue-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                <Video className="w-8 h-8 text-blue-400" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-white">
                  {lang === 'ar' ? 'تنسيق العمليات عبر الفيديو' : 'Coordinate Operations via Video'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {lang === 'ar'
                    ? 'اربط حساب Google الخاص بك لإنشاء غرف اجتماعات Google Meet فورية. نسّق الخطط التكتيكية مع فريقك وجهاً لوجه مباشرة من داخل مركز قيادة اللعبة.'
                    : 'Connect your Google account to create instant Google Meet rooms. Coordinate tactical plans with your squad face-to-face directly from within the game command center.'}
                </p>
              </div>

              <button
                onClick={handleSignIn}
                disabled={isLoggingIn}
                className="flex items-center justify-center gap-3 w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-100 text-slate-800 font-medium rounded-xl shadow-lg border border-slate-300 transition-all cursor-pointer font-sans text-sm"
              >
                {isLoggingIn ? (
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                )}
                <span className="font-semibold text-slate-800">
                  {lang === 'ar' ? 'ربط حساب Google' : 'Connect Google Account'}
                </span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Profile Bar */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                    {currentUser.photoURL ? (
                      <img src={currentUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-white">{currentUser.displayName}</div>
                    <div className="text-slate-500 font-mono text-[10px]">{currentUser.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-blue-500/15 border border-blue-500/30 text-[10px] text-blue-400 font-hud font-bold">
                  MEET API ACTIVE
                </div>
              </div>

              {/* Meet Space Card */}
              {!currentSpace ? (
                <div className="bg-slate-950 border-2 border-dashed border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center space-y-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                    <Video className="w-8 h-8 text-slate-600" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold">{lang === 'ar' ? 'لا يوجد اجتماع نشط' : 'No Active Meeting'}</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {lang === 'ar' ? 'أنشئ غرفة جديدة لبدء الإحاطة التكتيكية.' : 'Create a new room to start the tactical briefing.'}
                    </p>
                  </div>
                  <button
                    onClick={handleCreateSpace}
                    disabled={isLoading}
                    className="mt-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-hud font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    <span>{lang === 'ar' ? 'إنشاء غرفة إحاطة فورية' : 'Create Briefing Room'}</span>
                  </button>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-blue-900/20 to-slate-950 border border-blue-500/40 rounded-2xl p-5 space-y-5 animate-scale-in">
                  <div className="flex items-center justify-between border-b border-blue-500/20 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                        <Video className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <h4 className="text-white font-black">{lang === 'ar' ? 'غرفة العمليات المشتركة' : 'Joint Operations Room'}</h4>
                        <div className="text-[10px] font-hud text-blue-400 uppercase tracking-widest mt-0.5">
                          SECURE ENCRYPTED CHANNEL
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleCreateSpace}
                      disabled={isLoading}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title={lang === 'ar' ? 'إنشاء غرفة جديدة' : 'New Room'}
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-hud font-bold text-slate-500 uppercase">{lang === 'ar' ? 'رابط الاجتماع تكتيكي:' : 'Tactical Meeting URL:'}</label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-blue-300 truncate">
                          {currentSpace.meetingUri}
                        </div>
                        <button
                          onClick={() => copyToClipboard(currentSpace.meetingUri)}
                          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-hud font-bold text-slate-500 uppercase">{lang === 'ar' ? 'كود الاتصال تكتيكي:' : 'Tactical Call Code:'}</label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-amber-400 tracking-widest uppercase">
                          {currentSpace.meetingCode}
                        </div>
                        <button
                          onClick={() => copyToClipboard(currentSpace.meetingCode)}
                          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <a
                      href={currentSpace.meetingUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black font-hud text-sm rounded-xl shadow-[0_0_25px_rgba(59,130,246,0.4)] flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-95"
                    >
                      <ExternalLink className="w-5 h-5" />
                      <span>{lang === 'ar' ? 'الالتحاق بغرفة الإحاطة الآن' : 'JOIN BRIEFING ROOM NOW'}</span>
                    </a>
                  </div>

                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      {lang === 'ar'
                        ? 'تنبيه أمني: شارك هذا الرابط فقط مع أفراد الكتيبة المعتمدين. يتم تسجيل جميع الاجتماعات لأغراض المراجعة التكتيكية.'
                        : 'Security Alert: Share this link only with authorized battalion members. All meetings are logged for tactical review purposes.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800/90 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400 font-hud">
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldAlert className="w-4 h-4 text-blue-400" />
            <span>YEMEN VANGUARD // JOINT OPS COORDINATION</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-hud font-bold text-xs transition-colors cursor-pointer"
          >
            {lang === 'ar' ? 'إغلاق' : 'CLOSE'}
          </button>
        </div>
      </div>
    </div>
  );
};
