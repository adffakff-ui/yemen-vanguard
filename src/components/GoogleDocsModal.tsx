import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  RefreshCw,
  X,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  LogOut,
  ShieldAlert,
  Edit3,
  FilePlus,
  BookOpen,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
} from '../services/gmailAuth.ts';
import {
  listGoogleDocs,
  getGoogleDocDetail,
  createGoogleDoc,
  appendTextToGoogleDoc,
  GoogleDocSummary,
  GoogleDocDetail,
} from '../services/googleDocsApi.ts';
import { GameStats } from '../types/game.ts';

interface GoogleDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'ar' | 'en';
  initialStats?: GameStats | null;
}

export const GoogleDocsModal: React.FC<GoogleDocsModalProps> = ({
  isOpen,
  onClose,
  lang = 'ar',
  initialStats = null,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Docs list & Active Doc View
  const [docs, setDocs] = useState<GoogleDocSummary[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<GoogleDocDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Create / Append state
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState(
    lang === 'ar'
      ? 'تقرير العمليات الاستخباراتية - طليعة اليمن'
      : 'Yemen Vanguard - Intelligence Field Report'
  );
  const [newDocContent, setNewDocContent] = useState('');
  const [appendContentText, setAppendContentText] = useState('');

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
        setDocs([]);
        setSelectedDoc(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Load docs when token is ready
  useEffect(() => {
    if (token && isOpen) {
      loadDocsList(token);
    }
  }, [token, isOpen]);

  // Pre-fill content if initialStats provided
  useEffect(() => {
    if (initialStats) {
      const statsText =
        lang === 'ar'
          ? `تقرير المهمة القتالية الميدانية:\n-----------------------------------------\nالنتيجة التكتيكية: ${initialStats.victory ? 'إنجاز المهمة بنجاح' : 'سقوط تكتيكي في أرض المعركة'}\nمسرح العمليات: ${initialStats.theater}\nالأعداء المحيدون: ${initialStats.kills}\nإصابات الرأس الدقيقة: ${initialStats.headshots}\nالدقة التهديفية: ${initialStats.accuracy.toFixed(1)}%\nالموجات المحررة: ${initialStats.wavesCleared}\nإجمالي النقاط التكتيكية: ${initialStats.score} PTS\nزمن الاشتباك: ${Math.floor(initialStats.timeSeconds)} ثانية\n-----------------------------------------\nتم حفظ المستند تلقائياً عبر منظومة طليعة اليمن الميدانية.`
          : `TACTICAL AFTER-ACTION FIELD REPORT:\n-----------------------------------------\nMission Status: ${initialStats.victory ? 'MISSION ACCOMPLISHED' : 'OPERATIVE K.I.A.'}\nWar Theater: ${initialStats.theater}\nHostiles Eliminated: ${initialStats.kills}\nCritical Headshots: ${initialStats.headshots}\nCombat Accuracy: ${initialStats.accuracy.toFixed(1)}%\nWaves Cleared: ${initialStats.wavesCleared}\nTotal Tactical Score: ${initialStats.score} PTS\nCombat Duration: ${Math.floor(initialStats.timeSeconds)}s\n-----------------------------------------\nDocument generated via Yemen Vanguard Command.`;
      setNewDocContent(statsText);
      setAppendContentText(statsText);
    }
  }, [initialStats, lang]);

  const loadDocsList = async (authToken: string) => {
    setIsLoadingDocs(true);
    setErrorMsg(null);
    try {
      const docList = await listGoogleDocs(authToken);
      setDocs(docList);
      if (docList.length > 0 && !selectedDoc) {
        await loadDocDetail(authToken, docList[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || (lang === 'ar' ? 'فشل تحميل مستندات Google Docs' : 'Failed to load Google Docs'));
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const loadDocDetail = async (authToken: string, docId: string) => {
    setIsLoadingDetail(true);
    try {
      const detail = await getGoogleDocDetail(authToken, docId);
      setSelectedDoc(detail);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || (lang === 'ar' ? 'فشل فتح المستند' : 'Failed to open document'));
    } finally {
      setIsLoadingDetail(false);
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
        setSuccessMsg(lang === 'ar' ? 'تم تسجيل الدخول بنجاح بحساب Google!' : 'Signed in successfully with Google!');
        setTimeout(() => setSuccessMsg(null), 3500);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err?.message?.includes('popup-closed-by-user')
          ? (lang === 'ar' ? 'تم إغلاق نافذة تسجيل الدخول' : 'Sign-in popup closed')
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
    setDocs([]);
    setSelectedDoc(null);
  };

  // Create New Doc Prompt with Mandatory Confirmation
  const promptCreateDoc = () => {
    if (!newDocTitle.trim()) {
      setErrorMsg(lang === 'ar' ? 'يرجى تحديد عنوان المستند أولاً.' : 'Please enter document title.');
      return;
    }

    setPendingConfirmAction({
      title: lang === 'ar' ? 'تأكيد إنشاء مستند جديد في Google Docs' : 'Confirm Create Google Document',
      description:
        lang === 'ar'
          ? `هل توافق على إنشاء مستند جديد باسم "${newDocTitle}" وحفظه في Google Drive الخاص بك؟`
          : `Do you confirm creating a new Google Document named "${newDocTitle}" in your Google Drive?`,
      onConfirm: async () => {
        if (!token) return;
        setIsLoadingDocs(true);
        try {
          const created = await createGoogleDoc(token, newDocTitle.trim(), newDocContent);
          setSuccessMsg(lang === 'ar' ? `تم إنشاء المستند "${newDocTitle}" بنجاح!` : `Document "${newDocTitle}" created successfully!`);
          setIsCreatingNew(false);
          setSelectedDoc(created);
          await loadDocsList(token);
          setTimeout(() => setSuccessMsg(null), 3500);
        } catch (err: any) {
          setErrorMsg(err?.message || 'Failed to create document');
        } finally {
          setIsLoadingDocs(false);
        }
      },
    });
  };

  // Append Text Prompt with Mandatory Confirmation
  const promptAppendText = () => {
    if (!selectedDoc) {
      setErrorMsg(lang === 'ar' ? 'يرجى اختيار مستند أولاً.' : 'Please select a document first.');
      return;
    }
    if (!appendContentText.trim()) {
      setErrorMsg(lang === 'ar' ? 'يرجى إدخال النص المراد إضافته.' : 'Please enter text to append.');
      return;
    }

    setPendingConfirmAction({
      title: lang === 'ar' ? 'تأكيد تحديث المستند في Google Docs' : 'Confirm Update Google Document',
      description:
        lang === 'ar'
          ? `هل توافق على إضافة البيانات التكتيكية إلى نهاية المستند "${selectedDoc.title}"؟`
          : `Are you sure you want to append this text to the end of document "${selectedDoc.title}"?`,
      onConfirm: async () => {
        if (!token || !selectedDoc) return;
        setIsLoadingDetail(true);
        try {
          await appendTextToGoogleDoc(token, selectedDoc.documentId, appendContentText);
          setSuccessMsg(lang === 'ar' ? 'تمت إضافة البيانات إلى المستند بنجاح!' : 'Content appended to document successfully!');
          setAppendContentText('');
          await loadDocDetail(token, selectedDoc.documentId);
          setTimeout(() => setSuccessMsg(null), 3500);
        } catch (err: any) {
          setErrorMsg(err?.message || 'Failed to append text to document');
        } finally {
          setIsLoadingDetail(false);
        }
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md select-none pointer-events-auto animate-fade-in font-arabic">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/90 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Glow Strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-400 to-sky-400 animate-pulse" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.25)] shrink-0">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-xs font-hud font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                <span>{lang === 'ar' ? 'مستندات الاستخبارات الميدانية' : 'TACTICAL INTELLIGENCE DOCS'}</span>
                <span className="text-slate-600">·</span>
                <span className="text-sky-400">GOOGLE DOCS API</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                {lang === 'ar' ? 'مركز وثائق القوات الخاصة (Google Docs)' : 'Command Google Docs Center'}
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
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border-2 border-blue-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                <FileText className="w-8 h-8 text-blue-400" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-white">
                  {lang === 'ar' ? 'ربط Google Docs بحسابك بأمان' : 'Connect Google Docs Securely'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {lang === 'ar'
                    ? 'سجّل الدخول باستخدام حساب Google الخاص بك لإنشاء وحفظ تقارير المعارك الرسمية، وأرشفة سجلات الأداء والعمليات التكتيكية مباشرة داخل Google Docs.'
                    : 'Sign in with your Google account to create and archive official after-action reports directly in Google Docs.'}
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
                    {lang === 'ar' ? 'تسجيل الدخول باستخدام Google' : 'Sign in with Google'}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            /* STATE 2: FULL GOOGLE DOCS INTERFACE */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[440px]">
              {/* Left Column: Documents list & New doc button */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col justify-between space-y-3">
                <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-hud font-bold text-blue-400 uppercase flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'مستندات Google Docs:' : 'Google Docs:'}</span>
                    </span>

                    <button
                      onClick={() => setIsCreatingNew(!isCreatingNew)}
                      className="p-1.5 rounded bg-blue-500/20 border border-blue-500/40 text-blue-300 hover:bg-blue-500/30 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-hud"
                      title={lang === 'ar' ? 'إنشاء مستند جديد' : 'New Doc'}
                    >
                      <FilePlus className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'جديد' : 'New'}</span>
                    </button>
                  </div>

                  {/* Docs list */}
                  {isLoadingDocs ? (
                    <div className="py-8 flex flex-col items-center justify-center space-y-2 text-slate-400">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-[11px]">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</span>
                    </div>
                  ) : docs.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs space-y-1">
                      <FileText className="w-6 h-6 text-slate-600 mx-auto" />
                      <p>{lang === 'ar' ? 'لا توجد مستندات بعد.' : 'No docs found.'}</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
                      {docs.map((doc) => {
                        const isSelected = selectedDoc?.documentId === doc.id;
                        return (
                          <button
                            key={doc.id}
                            onClick={() => {
                              setIsCreatingNew(false);
                              if (token) loadDocDetail(token, doc.id);
                            }}
                            className={`w-full p-2 rounded-lg border text-right transition-all cursor-pointer flex items-center justify-between gap-2 ${
                              isSelected
                                ? 'bg-blue-500/20 border-blue-400 text-white shadow-sm'
                                : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <span className="text-xs truncate font-medium flex-1">
                              {doc.name}
                            </span>
                            {doc.webViewLink && (
                              <a
                                href={doc.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-slate-500 hover:text-sky-400"
                                title="Open in Google Docs"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => token && loadDocsList(token)}
                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-hud rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3 text-blue-400" />
                  <span>{lang === 'ar' ? 'تحديث المستندات' : 'Refresh Docs'}</span>
                </button>
              </div>

              {/* Right Column: View Doc / Create Doc Form */}
              <div className="col-span-1 md:col-span-2 bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col justify-between space-y-3">
                {isCreatingNew ? (
                  /* CREATE NEW DOC FORM */
                  <div className="space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-blue-400 uppercase flex items-center gap-1.5 border-b border-slate-800 pb-2">
                        <FilePlus className="w-4 h-4" />
                        <span>{lang === 'ar' ? 'إنشاء مستند تقرير جديد في Google Docs:' : 'Create New Google Doc:'}</span>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-hud text-slate-400">
                          {lang === 'ar' ? 'عنوان المستند:' : 'Document Title:'}
                        </label>
                        <input
                          type="text"
                          value={newDocTitle}
                          onChange={(e) => setNewDocTitle(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-hud text-slate-400">
                          {lang === 'ar' ? 'محتوى التقرير الأولي:' : 'Initial Content:'}
                        </label>
                        <textarea
                          rows={8}
                          value={newDocContent}
                          onChange={(e) => setNewDocContent(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 font-mono resize-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setIsCreatingNew(false)}
                        className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-hud rounded-lg"
                      >
                        {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                      </button>

                      <button
                        type="button"
                        onClick={promptCreateDoc}
                        className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-hud font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{lang === 'ar' ? 'إنشاء وحفظ المستند الآن' : 'Create Google Doc'}</span>
                      </button>
                    </div>
                  </div>
                ) : selectedDoc ? (
                  /* VIEW & EDIT ACTIVE DOC */
                  <div className="flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-2 flex-1 flex flex-col">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-400" />
                          <span>{selectedDoc.title}</span>
                        </div>

                        <a
                          href={`https://docs.google.com/document/d/${selectedDoc.documentId}/edit`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-sky-400 hover:underline flex items-center gap-1 font-hud"
                        >
                          <span>{lang === 'ar' ? 'فتح في Google Docs' : 'Open in Google Docs'}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      {/* Doc Content Viewer */}
                      <div className="flex-1 max-h-[190px] overflow-y-auto bg-slate-900/80 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed">
                        {isLoadingDetail ? (
                          <div className="py-8 text-center text-slate-400">
                            {lang === 'ar' ? 'جاري جلب المحتوى...' : 'Loading document...'}
                          </div>
                        ) : (
                          selectedDoc.bodyText
                        )}
                      </div>

                      {/* Append Text Form */}
                      <div className="space-y-1 pt-1">
                        <label className="text-[11px] font-hud text-amber-400 flex items-center gap-1">
                          <Edit3 className="w-3 h-3" />
                          <span>{lang === 'ar' ? 'إضافة تقرير قتالي إلى نهاية هذا المستند:' : 'Append Combat Stats to this Doc:'}</span>
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={appendContentText}
                            onChange={(e) => setAppendContentText(e.target.value)}
                            placeholder={lang === 'ar' ? 'اكتب البيانات المراد إضافتها...' : 'Type content to append...'}
                            className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={promptAppendText}
                            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-hud font-bold text-xs rounded-lg shrink-0 cursor-pointer"
                          >
                            {lang === 'ar' ? 'إضافة النص' : 'Append'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-center text-slate-500 text-xs">
                    {lang === 'ar' ? 'اختر مستنداً لعرض محتواه أو أنشئ مستنداً جديداً.' : 'Select a document or create a new one.'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* MANDATORY CONFIRMATION MODAL (Zero unauthorized mutations) */}
        {pendingConfirmAction && (
          <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-900 border-2 border-blue-500/80 rounded-2xl max-w-md w-full p-5 shadow-[0_0_40px_rgba(59,130,246,0.5)] space-y-4 font-arabic">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/50 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    {pendingConfirmAction.title}
                  </h3>
                  <div className="text-[11px] font-hud text-blue-400 uppercase">
                    {lang === 'ar' ? 'تأكيد أمني صريح مطلوب' : 'EXPLICIT CONFIRMATION REQUIRED'}
                  </div>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
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
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-hud font-bold text-xs shadow-lg transition-colors cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>{lang === 'ar' ? 'تأكيد العملية' : 'Confirm Action'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
