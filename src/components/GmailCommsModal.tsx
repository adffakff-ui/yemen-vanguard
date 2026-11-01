import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  Inbox,
  LogOut,
  ShieldAlert,
  FileText,
  Clock,
  User as UserIcon,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  GMAIL_SCOPES,
} from '../services/gmailAuth.ts';
import {
  getGmailProfile,
  listGmailMessages,
  getGmailMessage,
  sendGmailMessage,
  trashGmailMessage,
  deleteGmailMessage,
  GmailProfile,
  GmailMessageSummary,
  GmailMessageDetail,
} from '../services/gmailApi.ts';
import { GameStats } from '../types/game.ts';

interface GmailCommsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'ar' | 'en';
  initialStats?: GameStats | null;
}

export const GmailCommsModal: React.FC<GmailCommsModalProps> = ({
  isOpen,
  onClose,
  lang = 'ar',
  initialStats = null,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<GmailProfile | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Tab: 'inbox' | 'compose' | 'view'
  const [activeTab, setActiveTab] = useState<'inbox' | 'compose' | 'view'>('inbox');

  // Messages list state
  const [messages, setMessages] = useState<GmailMessageSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<GmailMessageDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Compose state
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState(
    lang === 'ar'
      ? 'تقرير العمليات التكتيكية - طليعة اليمن: عملية صابر'
      : 'Tactical Mission Debrief - Yemen Vanguard: Operation Sabir'
  );
  const [composeBody, setComposeBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Confirmation dialogs (MANDATORY per Workspace guidelines for mutations/deletions)
  const [pendingConfirmAction, setPendingConfirmAction] = useState<{
    type: 'send' | 'trash' | 'delete';
    title: string;
    description: string;
    targetId?: string;
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
        setProfile(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch profile and inbox messages when token becomes available
  useEffect(() => {
    if (token && isOpen) {
      loadProfileAndInbox(token);
    }
  }, [token, isOpen]);

  // Pre-fill debrief if initialStats provided
  useEffect(() => {
    if (initialStats) {
      const statsText =
        lang === 'ar'
          ? `تقرير استخباراتي عاجل:\n-------------------------\nالنتيجة التكتيكية: ${initialStats.victory ? 'انتصار حاسم' : 'سقوط تكتيكي'}\nمسرح العمليات: ${initialStats.theater}\nالأعداء المحيدون: ${initialStats.kills}\nإصابات الرأس الدقيقة: ${initialStats.headshots}\nالدقة التهديفية: ${initialStats.accuracy.toFixed(1)}%\nالموجات المحررة: ${initialStats.wavesCleared}\nالنقاط التكتيكية المحققة: ${initialStats.score} نقطة\nزمن الاشتباك: ${Math.floor(initialStats.timeSeconds)} ثانية\n-------------------------\nمرسل عبر منظومة اتصالات طليعة اليمن الميدانية.`
          : `TACTICAL FIELD REPORT:\n-------------------------\nStatus: ${initialStats.victory ? 'VICTORY' : 'DEFEAT'}\nOperation Theater: ${initialStats.theater}\nHostiles Eliminated: ${initialStats.kills}\nCritical Headshots: ${initialStats.headshots}\nCombat Accuracy: ${initialStats.accuracy.toFixed(1)}%\nWaves Cleared: ${initialStats.wavesCleared}\nTotal Tactical Score: ${initialStats.score} PTS\nTime in Combat: ${Math.floor(initialStats.timeSeconds)}s\n-------------------------\nTransmitted via Yemen Vanguard Secure Comms.`;
      setComposeBody(statsText);
    }
  }, [initialStats, lang]);

  const loadProfileAndInbox = async (authToken: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const prof = await getGmailProfile(authToken);
      setProfile(prof);

      const msgList = await listGmailMessages(authToken, searchQuery, 15);
      if (msgList.messages.length === 0) {
        setMessages([]);
      } else {
        // Fetch message summaries (batch of up to 10 for quick responsive UI)
        const summaryPromises = msgList.messages.slice(0, 10).map(async (m) => {
          try {
            const detail = await getGmailMessage(authToken, m.id);
            return detail;
          } catch {
            return null;
          }
        });
        const resolved = await Promise.all(summaryPromises);
        setMessages(resolved.filter((item): item is GmailMessageDetail => item !== null));
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || (lang === 'ar' ? 'فشل تحميل بيانات Gmail' : 'Failed to load Gmail data'));
    } finally {
      setIsLoading(false);
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
        setSuccessMsg(lang === 'ar' ? 'تم تسجيل الدخول بنجاح بحساب Google!' : 'Successfully signed in with Google!');
        setTimeout(() => setSuccessMsg(null), 3500);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err?.message?.includes('popup-closed-by-user')
          ? (lang === 'ar' ? 'تم إغلاق نافذة تسجيل الدخول قبل الاكتمال' : 'Sign-in popup closed before completion')
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
    setProfile(null);
    setMessages([]);
    setSelectedMessage(null);
    setActiveTab('inbox');
  };

  const handleViewMessage = async (msgSummary: GmailMessageSummary) => {
    if (!token) return;
    setIsLoadingDetail(true);
    setSelectedMessage(null);
    setActiveTab('view');
    try {
      const detail = await getGmailMessage(token, msgSummary.id);
      setSelectedMessage(detail);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to read message');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Compose & Send with Mandatory User Confirmation
  const promptSendEmail = () => {
    if (!composeTo.trim()) {
      setErrorMsg(lang === 'ar' ? 'يرجى كتابة البريد الإلكتروني للمستلم أولاً.' : 'Please enter recipient email.');
      return;
    }
    if (!composeBody.trim()) {
      setErrorMsg(lang === 'ar' ? 'يرجى كتابة نص الرسالة أولاً.' : 'Please enter message content.');
      return;
    }

    setPendingConfirmAction({
      type: 'send',
      title: lang === 'ar' ? 'تأكيد إرسال البرقية عبر Gmail' : 'Confirm Dispatch via Gmail',
      description:
        lang === 'ar'
          ? `هل توافق على إرسال الرسالة إلى "${composeTo}" بموضوع "${composeSubject}" من حسابك الرسمي؟`
          : `Do you confirm sending this email to "${composeTo}" with subject "${composeSubject}" from your authorized Gmail account?`,
      onConfirm: async () => {
        if (!token) return;
        setIsSending(true);
        setErrorMsg(null);
        try {
          await sendGmailMessage(token, {
            to: composeTo.trim(),
            subject: composeSubject.trim(),
            body: composeBody.trim(),
            senderEmail: profile?.emailAddress || currentUser?.email || undefined,
          });
          setSuccessMsg(lang === 'ar' ? 'تم إرسال البرقية بنجاح عبر Gmail!' : 'Dispatch sent successfully via Gmail!');
          setComposeBody('');
          setActiveTab('inbox');
          loadProfileAndInbox(token);
          setTimeout(() => setSuccessMsg(null), 4000);
        } catch (err: any) {
          setErrorMsg(err?.message || 'Failed to send email');
        } finally {
          setIsSending(false);
        }
      },
    });
  };

  // Trash message with Mandatory Confirmation
  const promptTrashMessage = (msgId: string, subject: string) => {
    setPendingConfirmAction({
      type: 'trash',
      title: lang === 'ar' ? 'تأكيد نقل الرسالة إلى سلة المهملات' : 'Confirm Move to Trash',
      description:
        lang === 'ar'
          ? `هل أنت متأكد من نقل الرسالة "${subject}" إلى سلة المهملات في Gmail؟`
          : `Are you sure you want to move the message "${subject}" to your Gmail Trash?`,
      targetId: msgId,
      onConfirm: async () => {
        if (!token) return;
        setIsLoading(true);
        try {
          await trashGmailMessage(token, msgId);
          setSuccessMsg(lang === 'ar' ? 'تم نقل الرسالة إلى المهملات بنجاح.' : 'Message moved to trash.');
          setSelectedMessage(null);
          setActiveTab('inbox');
          await loadProfileAndInbox(token);
          setTimeout(() => setSuccessMsg(null), 3000);
        } catch (err: any) {
          setErrorMsg(err?.message || 'Failed to trash message');
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md select-none pointer-events-auto animate-fade-in font-arabic">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/90 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Glow Strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-400 animate-pulse" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.25)] shrink-0">
              <Mail className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="text-xs font-hud font-bold text-red-400 uppercase tracking-widest flex items-center gap-1.5">
                <span>{lang === 'ar' ? 'منظومة الاتصالات التكتيكية' : 'TACTICAL COMMS SYSTEM'}</span>
                <span className="text-slate-600">·</span>
                <span className="text-emerald-400">GMAIL API</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                {lang === 'ar' ? 'مركز بريد القيادة التكتيكية (Gmail)' : 'Tactical Command Gmail Center'}
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

        {/* Modal Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* STATE 1: NOT AUTHENTICATED -> Google Sign In Screen */}
          {!currentUser ? (
            <div className="py-8 px-4 flex flex-col items-center text-center space-y-6 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                <Mail className="w-8 h-8 text-red-400" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-white">
                  {lang === 'ar' ? 'ربط بريد Gmail باللعبة بأمان' : 'Connect Gmail to Game Securely'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {lang === 'ar'
                    ? 'قم بتسجيل الدخول بحساب Google المعتمد لاستعراض برقيات الوارد التكتيكية، وإرسال تقارير المهام وسجلات الأداء العالي مباشرة من داخل اللعبة عبر Gmail، مع حفظ الأمان الكامل.'
                    : 'Sign in with your Google account to read incoming tactical dispatches and send mission debriefs & combat records directly from within the game via Gmail.'}
                </p>
              </div>

              {/* Security Badges */}
              <div className="grid grid-cols-2 gap-3 w-full text-xs">
                <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl flex items-center gap-2 text-slate-300">
                  <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{lang === 'ar' ? 'مصادقة OAuth 2.0 رسمية' : 'Official OAuth 2.0'}</span>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{lang === 'ar' ? 'تأكيد إجباري قبل أي إرسال' : 'Confirmation on send'}</span>
                </div>
              </div>

              {/* Official Google Sign-In Button (Standard branding compliant with skill) */}
              <div className="pt-2 w-full flex justify-center">
                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={isLoggingIn}
                  className="flex items-center justify-center gap-3 w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-100 text-slate-800 font-medium rounded-xl shadow-lg border border-slate-300 transition-all cursor-pointer font-sans text-sm active:scale-95 disabled:opacity-60"
                >
                  {isLoggingIn ? (
                    <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
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
                    {lang === 'ar' ? 'تسجيل الدخول باستخدام Google' : 'Sign in with Google'}
                  </span>
                </button>
              </div>

              <div className="text-[11px] text-slate-500">
                {lang === 'ar'
                  ? 'يتم طلب الإذن للوصول لبريدك الإلكتروني لإرسال التقارير التكتيكية وقراءة الرسائل بإذنك.'
                  : 'Workspace scopes will access and manage emails strictly with user permission.'}
              </div>
            </div>
          ) : (
            /* STATE 2: AUTHENTICATED -> Full Comms Center */
            <div className="space-y-4">
              {/* User profile & stats strip */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                    {currentUser.photoURL ? (
                      <img src={currentUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>{currentUser.displayName || profile?.emailAddress || 'Tactical Commando'}</span>
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-hud bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {lang === 'ar' ? 'متصل' : 'ONLINE'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {profile?.emailAddress || currentUser.email}
                    </div>
                  </div>
                </div>

                {profile && (
                  <div className="flex items-center gap-4 text-xs font-hud">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase">{lang === 'ar' ? 'إجمالي الرسائل' : 'TOTAL MSGS'}</div>
                      <div className="font-bold text-amber-400">{profile.messagesTotal.toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase">{lang === 'ar' ? 'المحادثات' : 'THREADS'}</div>
                      <div className="font-bold text-sky-400">{profile.threadsTotal.toLocaleString()}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sub-navigation Tabs: Inbox, Compose, View */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('inbox')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold font-hud flex items-center gap-1.5 transition-colors cursor-pointer ${
                      activeTab === 'inbox'
                        ? 'bg-red-500 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Inbox className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'الوارد (Inbox)' : 'Inbox'}</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('compose')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold font-hud flex items-center gap-1.5 transition-colors cursor-pointer ${
                      activeTab === 'compose'
                        ? 'bg-red-500 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'إرسال برقية' : 'Compose Dispatch'}</span>
                  </button>

                  {selectedMessage && (
                    <button
                      onClick={() => setActiveTab('view')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold font-hud flex items-center gap-1.5 transition-colors cursor-pointer ${
                        activeTab === 'view'
                          ? 'bg-red-500 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'قراءة الرسالة' : 'View Message'}</span>
                    </button>
                  )}
                </div>

                {activeTab === 'inbox' && (
                  <button
                    onClick={() => token && loadProfileAndInbox(token)}
                    disabled={isLoading}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title={lang === 'ar' ? 'تحديث الرسائل' : 'Refresh'}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
                  </button>
                )}
              </div>

              {/* TAB 1: INBOX */}
              {activeTab === 'inbox' && (
                <div className="space-y-3">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && token) loadProfileAndInbox(token);
                      }}
                      placeholder={lang === 'ar' ? 'ابحث في رسائل البريد الإلكتروني...' : 'Search emails...'}
                      className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-red-500"
                    />
                  </div>

                  {/* Messages list */}
                  {isLoading ? (
                    <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-400">
                      <div className="w-7 h-7 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-hud">
                        {lang === 'ar' ? 'جاري الاتصال بـ Gmail واسترجاع الرسائل...' : 'Syncing messages with Gmail...'}
                      </span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 space-y-2 bg-slate-950/40 rounded-xl border border-slate-800/80">
                      <Inbox className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-xs">
                        {lang === 'ar' ? 'لا توجد رسائل واردة مطابقة.' : 'No messages found.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          onClick={() => handleViewMessage(msg)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                            msg.unread
                              ? 'bg-slate-800/80 border-slate-700 hover:border-red-500/60 shadow-sm'
                              : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {msg.unread && (
                                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                              )}
                              <span className={`text-xs truncate ${msg.unread ? 'font-bold text-white' : 'text-slate-300'}`}>
                                {msg.from}
                              </span>
                            </div>
                            <div className={`text-xs truncate ${msg.unread ? 'font-semibold text-amber-300' : 'text-slate-300'}`}>
                              {msg.subject}
                            </div>
                            <div className="text-[11px] text-slate-400 line-clamp-1">
                              {msg.snippet}
                            </div>
                          </div>

                          <div className="text-right shrink-0 space-y-1">
                            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 justify-end">
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span>{msg.date ? new Date(msg.date).toLocaleDateString() : ''}</span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                promptTrashMessage(msg.id, msg.subject);
                              }}
                              className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
                              title={lang === 'ar' ? 'نقل للمهملات' : 'Trash'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: COMPOSE DISPATCH */}
              {activeTab === 'compose' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-hud font-bold text-slate-300">
                      {lang === 'ar' ? 'المستلم (To):' : 'Recipient Email:'}
                    </label>
                    <input
                      type="email"
                      value={composeTo}
                      onChange={(e) => setComposeTo(e.target.value)}
                      placeholder="commander@military-command.org or your-email@gmail.com"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-hud font-bold text-slate-300">
                      {lang === 'ar' ? 'موضوع البرقية (Subject):' : 'Subject:'}
                    </label>
                    <input
                      type="text"
                      value={composeSubject}
                      onChange={(e) => setComposeSubject(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-hud font-bold text-slate-300">
                        {lang === 'ar' ? 'نص البرقية التكتيكية (Message Body):' : 'Dispatch Body:'}
                      </label>
                      {initialStats && (
                        <button
                          type="button"
                          onClick={() => {
                            const statsText =
                              lang === 'ar'
                                ? `تقرير استخباراتي عاجل:\n-------------------------\nالمسرح: ${initialStats.theater}\nالقتلى: ${initialStats.kills}\nإصابات الرأس: ${initialStats.headshots}\nالدقة التهديفية: ${initialStats.accuracy.toFixed(1)}%\nالموجات المحررة: ${initialStats.wavesCleared}\nالنقاط التكتيكية: ${initialStats.score}\nالزمن: ${Math.floor(initialStats.timeSeconds)} ث\n-------------------------`
                                : `TACTICAL BRIEF:\nTheater: ${initialStats.theater}\nKills: ${initialStats.kills}\nHeadshots: ${initialStats.headshots}\nAccuracy: ${initialStats.accuracy.toFixed(1)}%\nWaves Cleared: ${initialStats.wavesCleared}\nScore: ${initialStats.score} PTS\nTime: ${Math.floor(initialStats.timeSeconds)}s`;
                            setComposeBody((prev) => (prev ? `${prev}\n\n${statsText}` : statsText));
                          }}
                          className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-hud cursor-pointer"
                        >
                          <FileText className="w-3 h-3" />
                          <span>{lang === 'ar' ? '+ إدراج تقرير اللعبة' : '+ Insert Combat Stats'}</span>
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={7}
                      value={composeBody}
                      onChange={(e) => setComposeBody(e.target.value)}
                      placeholder={
                        lang === 'ar'
                          ? 'اكتب تقرير المهمة، ملاحظات العمليات الميدانية، أو رسالتك الشخصية هنا...'
                          : 'Write your tactical report or personal message here...'
                      }
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500 resize-none font-mono"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <div className="text-[11px] text-slate-500">
                      {lang === 'ar' ? '🔒 سيتم طلب التأكيد قبل الإرسال' : '🔒 Confirmation requested before send'}
                    </div>

                    <button
                      type="button"
                      onClick={promptSendEmail}
                      disabled={isSending}
                      className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-hud font-bold text-xs rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.35)] flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isSending ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      <span>{lang === 'ar' ? 'إرسال عبر Gmail الآن' : 'Send via Gmail'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: VIEW MESSAGE DETAIL */}
              {activeTab === 'view' && selectedMessage && (
                <div className="space-y-4">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-white">{selectedMessage.subject}</h4>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {lang === 'ar' ? 'من:' : 'From:'} <span className="text-amber-400">{selectedMessage.from}</span>
                        </div>
                        {selectedMessage.to && (
                          <div className="text-xs text-slate-500">
                            {lang === 'ar' ? 'إلى:' : 'To:'} {selectedMessage.to}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => promptTrashMessage(selectedMessage.id, selectedMessage.subject)}
                          className="px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 text-xs font-hud flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{lang === 'ar' ? 'حذف للمهملات' : 'Move to Trash'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-slate-200 leading-relaxed max-h-[300px] overflow-y-auto whitespace-pre-wrap p-2 bg-slate-900/60 rounded-lg font-mono">
                      {selectedMessage.body}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => setActiveTab('inbox')}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-hud rounded-lg transition-colors cursor-pointer"
                    >
                      {lang === 'ar' ? '← العودة لصندوق الوارد' : '← Back to Inbox'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MANDATORY CONFIRMATION DIALOG MODAL (Guarantees zero unauthorized mutations/deletions) */}
        {pendingConfirmAction && (
          <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-900 border-2 border-red-500/80 rounded-2xl max-w-md w-full p-5 shadow-[0_0_40px_rgba(239,68,68,0.5)] space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/50 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white font-arabic">
                    {pendingConfirmAction.title}
                  </h3>
                  <div className="text-[11px] font-hud text-red-400 uppercase">
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
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-hud font-bold text-xs shadow-lg transition-colors cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {pendingConfirmAction.type === 'send'
                      ? (lang === 'ar' ? 'تأكيد وإرسال الرسالة' : 'Confirm & Send')
                      : (lang === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete')}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
