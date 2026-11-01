import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Plus,
  RefreshCw,
  X,
  AlertTriangle,
  CheckCircle2,
  Users,
  ExternalLink,
  LogOut,
  ShieldAlert,
  User as UserIcon,
  MessageCircle,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
} from '../services/gmailAuth.ts';
import {
  listChatSpaces,
  listChatMessages,
  sendChatMessage,
  createChatSpace,
  ChatSpace,
  ChatMessage,
  CHAT_CONSOLE_CONFIG_URL,
} from '../services/googleChatApi.ts';
import { GameStats } from '../types/game.ts';

interface GoogleChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'ar' | 'en';
  initialStats?: GameStats | null;
}

export const GoogleChatModal: React.FC<GoogleChatModalProps> = ({
  isOpen,
  onClose,
  lang = 'ar',
  initialStats = null,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoadingSpaces, setIsLoadingLoadingSpaces] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [consoleConfigRequired, setConsoleConfigRequired] = useState(false);
  const [workspaceRequiredMsg, setWorkspaceRequiredMsg] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Chat Spaces & Selected Space
  const [spaces, setSpaces] = useState<ChatSpace[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<ChatSpace | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // New message input & new space input
  const [messageText, setMessageText] = useState('');
  const [isCreatingSpace, setIsCreatingSpace] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');

  // Confirmation dialog state (MANDATORY per Workspace guidelines for mutations)
  const [pendingConfirmAction, setPendingConfirmAction] = useState<{
    title: string;
    description: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

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
        setSpaces([]);
        setSelectedSpace(null);
        setMessages([]);
      }
    );
    return () => unsubscribe();
  }, []);

  // Load spaces when token is ready
  useEffect(() => {
    if (token && isOpen) {
      loadSpaces(token);
    }
  }, [token, isOpen]);

  // Pre-fill debrief text if initialStats provided
  useEffect(() => {
    if (initialStats) {
      const statsText =
        lang === 'ar'
          ? `[برقية قتالية عاجلة] نتيجة المعركة في ${initialStats.theater}: ${initialStats.victory ? 'انتصار حاسم' : 'سقوط تكتيكي'} | الأعداء: ${initialStats.kills} | الدقة: ${initialStats.accuracy.toFixed(1)}% | النقاط: ${initialStats.score} PTS`
          : `[TACTICAL DEBRIEF] Mission Result in ${initialStats.theater}: ${initialStats.victory ? 'VICTORY' : 'K.I.A.'} | Kills: ${initialStats.kills} | Accuracy: ${initialStats.accuracy.toFixed(1)}% | Score: ${initialStats.score} PTS`;
      setMessageText(statsText);
    }
  }, [initialStats, lang]);

  const loadSpaces = async (authToken: string) => {
    setIsLoadingLoadingSpaces(true);
    setErrorMsg(null);
    setConsoleConfigRequired(false);
    setWorkspaceRequiredMsg(false);
    try {
      const spaceList = await listChatSpaces(authToken);
      setSpaces(spaceList);
      if (spaceList.length > 0 && !selectedSpace) {
        setSelectedSpace(spaceList[0]);
        await loadMessagesForSpace(authToken, spaceList[0].name);
      }
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || '';
      if (msg.includes('GOOGLE_CHAT_APP_NOT_FOUND')) {
        setConsoleConfigRequired(true);
      } else if (msg.includes('GOOGLE_CHAT_WORKSPACE_REQUIRED')) {
        setWorkspaceRequiredMsg(true);
      } else {
        setErrorMsg(msg || (lang === 'ar' ? 'فشل تحميل غرف Google Chat' : 'Failed to load Google Chat spaces'));
      }
    } finally {
      setIsLoadingLoadingSpaces(false);
    }
  };

  const loadMessagesForSpace = async (authToken: string, spaceName: string) => {
    setIsLoadingMessages(true);
    try {
      const msgList = await listChatMessages(authToken, spaceName);
      setMessages(msgList);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || (lang === 'ar' ? 'فشل تحميل الرسائل' : 'Failed to load messages'));
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSignIn = async () => {
    setIsLoggingIn(true);
    setErrorMsg(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setToken(res.accessToken);
        setSuccessMsg(lang === 'ar' ? 'تم تسجيل الدخول بنجاح بحساب Google Workspace!' : 'Signed in successfully with Google Workspace!');
        setTimeout(() => setSuccessMsg(null), 3500);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err?.message?.includes('popup-closed-by-user')
          ? (lang === 'ar' ? 'تم إغلاق نافذة تسجيل الدخول قبل الاكتمال' : 'Sign-in popup closed')
          : (err?.message || (lang === 'ar' ? 'فشل الاتصال بـ Google' : 'Failed to sign in'))
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setCurrentUser(null);
    setToken(null);
    setSpaces([]);
    setSelectedSpace(null);
    setMessages([]);
  };

  // Create Space handler
  const handleCreateSpaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newSpaceName.trim()) return;
    setIsLoadingLoadingSpaces(true);
    try {
      const created = await createChatSpace(token, newSpaceName.trim());
      setSuccessMsg(lang === 'ar' ? `تم إنشاء الغرفة التكتيكية "${newSpaceName}" بنجاح!` : `Space "${newSpaceName}" created successfully!`);
      setNewSpaceName('');
      setIsCreatingSpace(false);
      await loadSpaces(token);
      setSelectedSpace(created);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to create space');
    } finally {
      setIsLoadingLoadingSpaces(false);
    }
  };

  // Prompt Send Message with Mandatory Confirmation
  const promptSendMessage = () => {
    if (!selectedSpace) {
      setErrorMsg(lang === 'ar' ? 'يرجى اختيار غرفة محادثة أولاً.' : 'Please select a space first.');
      return;
    }
    if (!messageText.trim()) {
      setErrorMsg(lang === 'ar' ? 'يرجى كتابة نص الرسالة.' : 'Please type a message.');
      return;
    }

    const spaceTitle = selectedSpace.displayName || selectedSpace.name;

    setPendingConfirmAction({
      title: lang === 'ar' ? 'تأكيد نشر البرقية في Google Chat' : 'Confirm Google Chat Dispatch',
      description:
        lang === 'ar'
          ? `هل توافق على إرسال الرسالة إلى غرفة Google Chat ("${spaceTitle}") باسمك الحقيقي؟`
          : `Are you sure you want to post this message to Google Chat space ("${spaceTitle}")?`,
      onConfirm: async () => {
        if (!token || !selectedSpace) return;
        setIsLoadingMessages(true);
        try {
          await sendChatMessage(token, selectedSpace.name, messageText.trim());
          setSuccessMsg(lang === 'ar' ? 'تم نشر الرسالة في Google Chat بنجاح!' : 'Message posted to Google Chat successfully!');
          setMessageText('');
          await loadMessagesForSpace(token, selectedSpace.name);
          setTimeout(() => setSuccessMsg(null), 3500);
        } catch (err: any) {
          setErrorMsg(err?.message || 'Failed to send message');
        } finally {
          setIsLoadingMessages(false);
        }
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md select-none pointer-events-auto animate-fade-in font-arabic">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/90 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Glow Strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-500 animate-pulse" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(20,184,166,0.25)] shrink-0">
              <MessageSquare className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <div className="text-xs font-hud font-bold text-teal-400 uppercase tracking-widest flex items-center gap-1.5">
                <span>{lang === 'ar' ? 'شبكة المحادثات التكتيكية' : 'TACTICAL CHAT NETWORK'}</span>
                <span className="text-slate-600">·</span>
                <span className="text-emerald-400">GOOGLE CHAT API</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                {lang === 'ar' ? 'غرف اتصالات القيادة (Google Chat)' : 'Google Chat Operational Spaces'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser && (
              <button
                onClick={handleSignOut}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-hud flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                title={lang === 'ar' ? 'تسجيل الخروج' : 'Sign out'}
              >
                <LogOut className="w-3.5 h-3.5 text-red-400" />
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

        {/* Banners */}
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

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* STATE 1: NOT AUTHENTICATED */}
          {!currentUser ? (
            <div className="py-8 px-4 flex flex-col items-center text-center space-y-6 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border-2 border-teal-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(20,184,166,0.2)]">
                <MessageSquare className="w-8 h-8 text-teal-400" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-white">
                  {lang === 'ar' ? 'ربط تطبيق Google Chat الميداني' : 'Connect Google Chat Operational Spaces'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {lang === 'ar'
                    ? 'سجّل الدخول باستخدام حساب Google Workspace (الخاص بالمؤسسات والأعمال) للوصول لغرف القوات الميدانية، وتبادل البرقيات واستلام التوجيهات الميدانية عبر Google Chat.'
                    : 'Sign in with a Google Workspace (Business/Enterprise) account to access operational rooms and exchange field dispatches via Google Chat.'}
                </p>
              </div>

              {/* Workspace Notice Callout */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-right text-xs text-slate-300 space-y-1 w-full">
                <div className="font-bold text-amber-400 flex items-center gap-1.5 justify-end">
                  <span>{lang === 'ar' ? 'متطلبات Google Chat API:' : 'Google Chat API Prerequisites:'}</span>
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-[11px] text-slate-400">
                  {lang === 'ar'
                    ? 'يتطلب استخدام Google Chat حساب Google Workspace مُفعل وتجهيز التطبيق في Google Cloud Console.'
                    : 'Requires a Google Workspace account and app setup in Google Cloud Console.'}
                </p>
              </div>

              {/* Sign In Button */}
              <div className="pt-2 w-full flex justify-center">
                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={isLoggingIn}
                  className="flex items-center justify-center gap-3 w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-100 text-slate-800 font-medium rounded-xl shadow-lg border border-slate-300 transition-all cursor-pointer font-sans text-sm active:scale-95 disabled:opacity-60"
                >
                  {isLoggingIn ? (
                    <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
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
                    {lang === 'ar' ? 'تسجيل الدخول بـ Google Workspace' : 'Sign in with Google Workspace'}
                  </span>
                </button>
              </div>
            </div>
          ) : consoleConfigRequired ? (
            /* STATE 2: 404 CONSOLE CONFIG REQUIRED */
            <div className="py-6 px-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-center space-y-4 max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white font-arabic">
                  {lang === 'ar' ? 'خطوة مطلوبة: إعداد تطبيق Google Chat' : 'Action Required: Configure Google Chat App'}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {lang === 'ar'
                    ? 'يتطلب استخدام API تخصيص اسم ومعلومات تطبيق Google Chat لمرة واحدة في وحدة تحكم Google Cloud Console.'
                    : 'Google Chat API requires configuring the Chat app once in Google Cloud Console before accessing spaces.'}
                </p>
              </div>

              <a
                href={CHAT_CONSOLE_CONFIG_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-hud font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                <span>{lang === 'ar' ? 'فتح صفحة التكوين في Google Cloud' : 'Open Google Cloud Console Config'}</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              <div className="pt-2">
                <button
                  onClick={() => token && loadSpaces(token)}
                  className="text-xs text-slate-400 hover:text-white underline font-hud"
                >
                  {lang === 'ar' ? 'إعادة المحاولة بعد التكوين' : 'Retry after configuration'}
                </button>
              </div>
            </div>
          ) : workspaceRequiredMsg ? (
            /* STATE 3: CONSUMER ACCOUNT ERROR */
            <div className="py-6 px-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-center space-y-3 max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-6 h-6 text-red-400" />
              </div>
              <h4 className="text-base font-bold text-white">
                {lang === 'ar' ? 'تنبيه: حساب Google Workspace مطلوب' : 'Google Workspace Account Required'}
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {lang === 'ar'
                  ? 'لا تدعم شركة Google استخدام Google Chat API مع الحسابات الشخصية العادية (@gmail.com). يلزم تسجيل الدخول بحساب مؤسسي Google Workspace.'
                  : 'Google Chat API requires a business or enterprise Google Workspace account. Consumer @gmail.com accounts are not supported.'}
              </p>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-hud rounded-lg transition-colors cursor-pointer"
              >
                {lang === 'ar' ? 'تسجيل الخروج واستخدام حساب مؤسسي' : 'Sign Out & Use Workspace Account'}
              </button>
            </div>
          ) : (
            /* STATE 4: FULL GOOGLE CHAT INTERFACE */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[420px]">
              {/* Left Column: Spaces list & Add space */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col justify-between space-y-3">
                <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-hud font-bold text-teal-400 uppercase flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'الغرف التكتيكية (Spaces):' : 'Chat Spaces:'}</span>
                    </span>

                    <button
                      onClick={() => setIsCreatingSpace(!isCreatingSpace)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-teal-400 transition-colors cursor-pointer"
                      title={lang === 'ar' ? 'إنشاء غرفة' : 'New Space'}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Create space inline form */}
                  {isCreatingSpace && (
                    <form onSubmit={handleCreateSpaceSubmit} className="space-y-2 p-2 bg-slate-900 border border-slate-800 rounded-lg">
                      <input
                        type="text"
                        value={newSpaceName}
                        onChange={(e) => setNewSpaceName(e.target.value)}
                        placeholder={lang === 'ar' ? 'اسم الغرفة الجديدة...' : 'Space Name...'}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white placeholder:text-slate-600 focus:outline-none"
                      />
                      <div className="flex gap-1 justify-end">
                        <button
                          type="button"
                          onClick={() => setIsCreatingSpace(false)}
                          className="px-2 py-1 text-[10px] text-slate-400 hover:text-white"
                        >
                          {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button
                          type="submit"
                          className="px-2.5 py-1 text-[10px] bg-teal-500 text-slate-950 font-bold rounded"
                        >
                          {lang === 'ar' ? 'إنشاء' : 'Create'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Spaces list */}
                  {isLoadingSpaces ? (
                    <div className="py-8 flex flex-col items-center justify-center space-y-2 text-slate-400">
                      <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-[11px]">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</span>
                    </div>
                  ) : spaces.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs space-y-1">
                      <MessageCircle className="w-6 h-6 text-slate-600 mx-auto" />
                      <p>{lang === 'ar' ? 'لا توجد غرف متاحة.' : 'No spaces found.'}</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
                      {spaces.map((space) => {
                        const isSelected = selectedSpace?.name === space.name;
                        return (
                          <button
                            key={space.name}
                            onClick={() => {
                              setSelectedSpace(space);
                              if (token) loadMessagesForSpace(token, space.name);
                            }}
                            className={`w-full p-2 rounded-lg border text-right transition-all cursor-pointer flex items-center justify-between gap-2 ${
                              isSelected
                                ? 'bg-teal-500/20 border-teal-400 text-white shadow-sm'
                                : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <span className="text-xs truncate font-medium">
                              {space.displayName || space.name.replace('spaces/', 'Space #')}
                            </span>
                            <span className="text-[10px] font-mono text-teal-400 shrink-0">
                              {space.type}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => token && loadSpaces(token)}
                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-hud rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3 text-teal-400" />
                  <span>{lang === 'ar' ? 'تحديث الغرف' : 'Refresh Spaces'}</span>
                </button>
              </div>

              {/* Right Area: Messages in active space & send input */}
              <div className="col-span-1 md:col-span-2 bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col justify-between space-y-3">
                {selectedSpace ? (
                  <>
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-teal-400" />
                        <span>{selectedSpace.displayName || selectedSpace.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">{selectedSpace.name}</span>
                    </div>

                    {/* Messages feed */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
                      {isLoadingMessages ? (
                        <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-400">
                          <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs">{lang === 'ar' ? 'جاري استرجاع المحادثات...' : 'Retrieving messages...'}</span>
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="py-12 text-center text-slate-500 text-xs">
                          {lang === 'ar' ? 'لا توجد رسائل سابقة في هذه الغرفة.' : 'No messages in this space yet.'}
                        </div>
                      ) : (
                        messages.map((msg) => (
                          <div key={msg.name} className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-amber-300">
                                {msg.sender?.displayName || 'Commando Operative'}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {msg.createTime ? new Date(msg.createTime).toLocaleTimeString() : ''}
                              </span>
                            </div>
                            <p className="text-xs text-slate-200 leading-relaxed font-sans">{msg.text}</p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Input box */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-800">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') promptSendMessage();
                          }}
                          placeholder={lang === 'ar' ? 'اكتب البرقية التكتيكية هنا...' : 'Type tactical dispatch...'}
                          className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 font-sans"
                        />

                        <button
                          type="button"
                          onClick={promptSendMessage}
                          className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-hud font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer shrink-0 transition-all active:scale-95"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{lang === 'ar' ? 'نشر' : 'Post'}</span>
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-center text-slate-500 text-xs">
                    {lang === 'ar' ? 'اختر غرفة محادثة لبدء التبادل التكتيكي.' : 'Select a chat space to view communications.'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* MANDATORY CONFIRMATION MODAL (Zero unauthorized mutations) */}
        {pendingConfirmAction && (
          <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-900 border-2 border-teal-500/80 rounded-2xl max-w-md w-full p-5 shadow-[0_0_40px_rgba(20,184,166,0.5)] space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/50 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white font-arabic">
                    {pendingConfirmAction.title}
                  </h3>
                  <div className="text-[11px] font-hud text-teal-400 uppercase">
                    {lang === 'ar' ? 'تأكيد أمني صريح مطلوب' : 'EXPLICIT CONFIRMATION REQUIRED'}
                  </div>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-arabic">
                {pendingConfirmAction.description}
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPendingConfirmAction(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-hud text-xs transition-colors cursor-pointer"
                >
                  {lang === 'ar' ? 'إلغاء الأمر' : 'Cancel'}
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const action = pendingConfirmAction;
                    setPendingConfirmAction(null);
                    await action.onConfirm();
                  }}
                  className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-hud font-bold text-xs shadow-lg transition-colors cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  <span>{lang === 'ar' ? 'تأكيد ونشر الرسالة' : 'Confirm & Post'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
