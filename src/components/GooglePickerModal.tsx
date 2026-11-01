import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  File,
  FileText,
  Image,
  FileCheck,
  ExternalLink,
  X,
  AlertTriangle,
  CheckCircle2,
  LogOut,
  ShieldAlert,
  Download,
  Paperclip,
  Search,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
} from '../services/gmailAuth.ts';
import {
  openGooglePicker,
  SelectedDriveFile,
} from '../services/googlePickerApi.ts';
import { GameStats } from '../types/game.ts';

interface GooglePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'ar' | 'en';
  initialStats?: GameStats | null;
  onFileSelected?: (file: SelectedDriveFile) => void;
}

export const GooglePickerModal: React.FC<GooglePickerModalProps> = ({
  isOpen,
  onClose,
  lang = 'ar',
  initialStats = null,
  onFileSelected,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoadingPicker, setIsLoadingPicker] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Selected Drive Files list
  const [pickedFiles, setPickedFiles] = useState<SelectedDriveFile[]>([]);
  const [activeFile, setActiveFile] = useState<SelectedDriveFile | null>(null);

  // Mandatory Confirmation Dialog State
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
        setPickedFiles([]);
        setActiveFile(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMsg(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setToken(res.accessToken);
      }
    } catch (err: any) {
      setErrorMsg(
        err.message ||
          (lang === 'ar'
            ? 'فشل تسجيل الدخول باستخدام حساب Google'
            : 'Google Sign-In failed')
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
    setToken(null);
    setPickedFiles([]);
    setActiveFile(null);
  };

  const handleOpenPicker = async () => {
    if (!token) {
      setErrorMsg(lang === 'ar' ? 'يرجى تسجيل الدخول أولاً' : 'Please sign in first');
      return;
    }

    setIsLoadingPicker(true);
    setErrorMsg(null);

    try {
      await openGooglePicker({
        accessToken: token,
        onPicked: (file) => {
          setPickedFiles((prev) => [file, ...prev.filter((f) => f.id !== file.id)]);
          setActiveFile(file);
          setSuccessMsg(
            lang === 'ar'
              ? `تم اختيار الملف "${file.name}" بنجاح من Google Drive`
              : `Selected file "${file.name}" from Google Drive`
          );
          if (onFileSelected) {
            onFileSelected(file);
          }
        },
        onCancel: () => {
          // User closed picker dialog
        },
      });
    } catch (err: any) {
      console.error('Failed to open Google Picker:', err);
      setErrorMsg(
        err.message ||
          (lang === 'ar'
            ? 'تعذر فتح أداة التحديد Google Picker'
            : 'Failed to open Google Picker')
      );
    } finally {
      setIsLoadingPicker(false);
    }
  };

  const requestAttachFile = (file: SelectedDriveFile) => {
    setPendingConfirmAction({
      title: lang === 'ar' ? 'تأكيد إرفاق مستند الاستخبارات' : 'Confirm Intelligence Document Attachment',
      description:
        lang === 'ar'
          ? `هل أنت متأكد من ربط الملف "${file.name}" بسجل التقرير التكتيكي الميداني؟`
          : `Are you sure you want to attach "${file.name}" to the tactical combat dossier?`,
      onConfirm: async () => {
        setSuccessMsg(
          lang === 'ar'
            ? `تم إرفاق المستند "${file.name}" بنجاح!`
            : `Document "${file.name}" attached to mission record!`
        );
        if (onFileSelected) {
          onFileSelected(file);
        }
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-slate-900 border border-indigo-500/40 rounded-xl shadow-2xl text-slate-100 overflow-hidden"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-indigo-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-400">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-wide text-indigo-400 flex items-center gap-2">
                {lang === 'ar' ? 'مستكشف وثائق القيادة - Google Picker' : 'Intelligence File Picker - Google Picker'}
              </h2>
              <p className="text-xs text-slate-400">
                {lang === 'ar'
                  ? 'اختيار وإرفاق خرائط الاستطلاع وتقارير Google Drive التكتيكية'
                  : 'Select & attach reconnaissance files & maps from Google Drive'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Auth status bar / Sign in screen */}
        {!currentUser || !token ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-900/90">
            <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-center justify-center text-indigo-400 mb-4">
              <FolderOpen className="w-8 h-8" />
            </div>

            <h3 className="text-2xl font-bold mb-2">
              {lang === 'ar' ? 'الاتصال بحساب Google Drive' : 'Connect to Google Drive'}
            </h3>
            <p className="text-slate-400 max-w-md text-sm mb-6">
              {lang === 'ar'
                ? 'قم بتسجيل الدخول لاختيار وإرفاق الصور والخرائط ومستندات الاستخبارات من Google Drive مباشرةً في تطبيق طليعة اليمن.'
                : 'Sign in to select and attach maps, intelligence dossiers, and field images directly from your Google Drive.'}
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300 text-sm flex items-center gap-2 max-w-md">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="gsi-material-button inline-flex items-center gap-3 bg-white text-slate-900 font-medium px-6 py-3 rounded-lg shadow-lg hover:bg-slate-100 transition-all disabled:opacity-50 cursor-pointer"
            >
              <div className="gsi-material-button-icon">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
              </div>
              <span>
                {isLoggingIn
                  ? lang === 'ar'
                    ? 'جاري التواصل...'
                    : 'Connecting...'
                  : lang === 'ar'
                  ? 'تسجيل الدخول باستخدام Google'
                  : 'Sign in with Google'}
              </span>
            </button>
          </div>
        ) : (
          <>
            {/* Authenticated Status Bar */}
            <div className="flex items-center justify-between px-6 py-2.5 bg-slate-950/60 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-3 text-slate-300">
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt="User" className="w-5 h-5 rounded-full" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-indigo-500/30 flex items-center justify-center text-indigo-300 text-[10px]">
                    {currentUser.email?.[0].toUpperCase()}
                  </div>
                )}
                <span className="font-medium text-indigo-400">{currentUser.email}</span>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-slate-400 hover:text-red-400 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}</span>
              </button>
            </div>

            {/* Main Area */}
            <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-slate-900/60">
              {/* Status Notifications */}
              {errorMsg && (
                <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300 text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                  <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-200">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-indigo-500/20 border border-indigo-500/40 rounded-lg text-indigo-300 text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                  <button onClick={() => setSuccessMsg(null)} className="text-indigo-400 hover:text-indigo-200">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Action Banner */}
              <div className="p-6 bg-slate-950/80 border border-indigo-500/30 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-right sm:text-right">
                  <h3 className="text-lg font-bold text-indigo-300">
                    {lang === 'ar' ? 'مستندات وملفات Google Drive' : 'Google Drive Files & Documents'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {lang === 'ar'
                      ? 'انقر لاستعراض أقسام Google Drive الخاصة بك واختيار خرائط أو وثائق ميدانية'
                      : 'Click to open Google Picker dialog and choose maps or field intelligence files'}
                  </p>
                </div>

                <button
                  onClick={handleOpenPicker}
                  disabled={isLoadingPicker}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-lg shadow-lg transition-all disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>
                    {isLoadingPicker
                      ? lang === 'ar'
                        ? 'جاري فتح النافذة...'
                        : 'Opening Picker...'
                      : lang === 'ar'
                      ? 'فتح Google Picker'
                      : 'Open Google Picker'}
                  </span>
                </button>
              </div>

              {/* Selected Files List */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-400">
                  {lang === 'ar' ? 'الملفات المحددة من Drive' : 'Selected Drive Files'}
                </h4>

                {pickedFiles.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl text-slate-500 text-sm">
                    {lang === 'ar'
                      ? 'لم يتم تحديد أي ملف حتى الآن. انقر فوق "فتح Google Picker" للاختيار.'
                      : 'No files selected yet. Click "Open Google Picker" above to choose files.'}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pickedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between gap-4 hover:border-indigo-500/50 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-indigo-400 shrink-0">
                            {file.mimeType.includes('image') ? (
                              <Image className="w-5 h-5" />
                            ) : file.mimeType.includes('pdf') || file.mimeType.includes('document') ? (
                              <FileText className="w-5 h-5" />
                            ) : (
                              <File className="w-5 h-5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h5 className="font-bold text-sm text-slate-100 truncate">{file.name}</h5>
                            <p className="text-xs text-slate-400 font-mono truncate">{file.mimeType}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-slate-800 transition-colors"
                            title={lang === 'ar' ? 'فتح في Drive' : 'Open in Drive'}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>

                          <button
                            onClick={() => requestAttachFile(file)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 rounded-lg text-xs font-medium transition-colors"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                            <span>{lang === 'ar' ? 'إرفاق' : 'Attach'}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>{lang === 'ar' ? 'مساعد وثائق Google Picker المدمج' : 'Integrated Google Picker Assistant'}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors"
          >
            {lang === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>

      {/* Mandatory Explicit Confirmation Modal */}
      {pendingConfirmAction && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-indigo-500/50 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-indigo-400">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold">{pendingConfirmAction.title}</h3>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">{pendingConfirmAction.description}</p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setPendingConfirmAction(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={async () => {
                  const action = pendingConfirmAction.onConfirm;
                  setPendingConfirmAction(null);
                  await action();
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors shadow-md"
              >
                {lang === 'ar' ? 'تأكيد وإرفاق' : 'Confirm & Attach'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
