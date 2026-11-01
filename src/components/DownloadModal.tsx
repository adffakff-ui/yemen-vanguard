import React, { useState, useRef } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { saveManager, TacticalSaveDossier } from '../game/saveManager';
import { buildAndDownloadApk, ApkBuildProgress, APK_CONFIG } from '../game/apkBuilder';
import { 
  Download, 
  Smartphone, 
  Monitor, 
  HardDrive, 
  Upload, 
  CheckCircle2, 
  WifiOff, 
  ExternalLink, 
  X, 
  Shield, 
  Sparkles,
  FileText,
  Package,
  Cpu,
  Layers,
  ArrowDownCircle
} from 'lucide-react';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'ar' | 'en';
  onSaveLoaded?: (data: TacticalSaveDossier) => void;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({
  isOpen,
  onClose,
  lang,
  onSaveLoaded,
}) => {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isAndroid,
    isIframe,
    install,
    openStandaloneWindow,
    cacheOfflineAssets,
    cacheProgress,
    isOfflineReady,
  } = usePWAInstall();

  const [activeTab, setActiveTab] = useState<'apk' | 'install' | 'offline' | 'save'>('apk');
  const [apkProgress, setApkProgress] = useState<ApkBuildProgress | null>(null);
  const [isBuildingApk, setIsBuildingApk] = useState(false);
  const [deviceGuideTab, setDeviceGuideTab] = useState<'android' | 'ios' | 'desktop'>(
    isAndroid ? 'android' : isIOS ? 'ios' : 'desktop'
  );
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleBuildApkClick = async () => {
    if (isBuildingApk) return;
    setIsBuildingApk(true);
    try {
      await buildAndDownloadApk((p) => setApkProgress(p), lang);
      setImportSuccess(true);
      setImportStatus(
        lang === 'ar'
          ? 'تم بناء وتجميع حزمة APK (YemenVanguard-TacticalCommando-v1.4.0.apk) بنجاح وجاري تنزيلها!'
          : 'Android APK package compiled & downloaded successfully!'
      );
    } catch (err: any) {
      setImportSuccess(false);
      setImportStatus(err?.message || (lang === 'ar' ? 'حدث خطأ أثناء بناء الحزمة' : 'Build failed'));
    } finally {
      setIsBuildingApk(false);
      setTimeout(() => setApkProgress(null), 3000);
    }
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) {
        setImportSuccess(true);
        setImportStatus(lang === 'ar' ? 'تم بدء تثبيت التطبيق بنجاح!' : 'App installation started successfully!');
      }
    } else if (isIframe) {
      openStandaloneWindow();
    }
  };

  const handleExportSave = () => {
    saveManager.exportSaveFile();
    setImportSuccess(true);
    setImportStatus(lang === 'ar' ? 'تم تحميل ملف الحفظ التكتيكي على جهازك بنجاح (.json)' : 'Tactical save dossier exported successfully (.json)');
    setTimeout(() => setImportStatus(null), 4000);
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const res = await saveManager.importSaveFile(file);
    if (res.success && res.data) {
      setImportSuccess(true);
      setImportStatus(lang === 'ar' ? 'تم استيراد وتحميل ملف الحفظ التكتيكي بنجاح!' : 'Tactical save file imported and loaded successfully!');
      if (onSaveLoaded) {
        onSaveLoaded(res.data);
      }
    } else {
      setImportSuccess(false);
      setImportStatus(res.error || (lang === 'ar' ? 'فشل استيراد الملف' : 'File import failed'));
    }
    setTimeout(() => setImportStatus(null), 4500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md select-none pointer-events-auto animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/90 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Glowing Status Strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-emerald-400 to-amber-500 animate-pulse" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.25)] shrink-0">
              <Download className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-xs font-hud font-bold text-amber-400 uppercase tracking-widest">
                {lang === 'ar' ? 'مركز التحميل والتثبيت التكتيكي' : 'TACTICAL DOWNLOAD & SAVE CENTER'}
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white font-arabic">
                {lang === 'ar' ? 'تحميل اللعبة وتثبيت حزمة APK' : 'Download Game & APK Package'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-2 bg-slate-950/40 border-b border-slate-800/80 overflow-x-auto">
          <button
            onClick={() => setActiveTab('apk')}
            className={`px-3.5 py-2 rounded-lg text-xs font-hud font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'apk'
                ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>{lang === 'ar' ? 'حزمة أندرويد (APK)' : 'Android APK'}</span>
          </button>

          <button
            onClick={() => setActiveTab('install')}
            className={`px-3.5 py-2 rounded-lg text-xs font-hud font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'install'
                ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>{lang === 'ar' ? 'تثبيت سريع (PWA)' : 'Install PWA'}</span>
          </button>

          <button
            onClick={() => setActiveTab('offline')}
            className={`px-3.5 py-2 rounded-lg text-xs font-hud font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'offline'
                ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <WifiOff className="w-4 h-4" />
            <span>{lang === 'ar' ? 'حزمة اللعب أوفلاين' : 'Offline Pack'}</span>
          </button>

          <button
            onClick={() => setActiveTab('save')}
            className={`px-3.5 py-2 rounded-lg text-xs font-hud font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'save'
                ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>{lang === 'ar' ? 'تحميل وحفظ التقدم' : 'Save & Load Data'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Notification status banner if any */}
          {importStatus && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-semibold animate-fade-in ${
                importSuccess
                  ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                  : 'bg-red-500/15 border-red-500/50 text-red-300'
              }`}
            >
              {importSuccess ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <X className="w-4 h-4 text-red-400 shrink-0" />}
              <span>{importStatus}</span>
            </div>
          )}

          {/* TAB 0: ANDROID APK PACKAGE BUILDER */}
          {activeTab === 'apk' && (
            <div className="space-y-4">
              {/* Main Call-to-Action Hero Box */}
              <div className="bg-gradient-to-br from-amber-500/15 via-slate-800/70 to-slate-950/90 border-2 border-amber-500/40 rounded-xl p-4 sm:p-5 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-amber-500/25 text-amber-300 text-[11px] font-hud font-bold border border-amber-500/50">
                      <Package className="w-3.5 h-3.5 text-amber-400" />
                      <span>{lang === 'ar' ? 'حزمة تطبيق أندرويد مستقلة (Android APK)' : 'Android Native Application Package'}</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-white font-arabic">
                      {lang === 'ar' ? 'بناء وتنزيل ملف APK لهواتف الأندرويد' : 'Build & Download Android APK Package'}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {lang === 'ar'
                        ? 'توليد حزمة APK كاملة موقعة ومجهزة للأندرويد، متوافقة مع كافة أجهزة Android (Samsung، Xiaomi، Huawei، Pixel) مع تسريع عتادي 3D وتشغيل كامل بدون إنترنت.'
                        : 'Compiles a complete standalone Android APK package ready to install on any Android device with full 3D hardware acceleration and offline play.'}
                    </p>
                  </div>

                  {/* Build & Download Trigger Button */}
                  <div className="shrink-0 w-full sm:w-auto">
                    <button
                      onClick={handleBuildApkClick}
                      disabled={isBuildingApk}
                      className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-400 hover:to-amber-500 disabled:opacity-60 text-slate-950 font-black font-hud text-xs sm:text-sm rounded-xl transition-all shadow-[0_0_25px_rgba(245,158,11,0.5)] flex items-center justify-center gap-2.5 cursor-pointer transform hover:scale-[1.02] active:scale-95"
                    >
                      {isBuildingApk ? (
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Download className="w-5 h-5 text-slate-950" />
                      )}
                      <span>
                        {isBuildingApk
                          ? (lang === 'ar' ? 'جاري بناء الحزمة...' : 'BUILDING APK...')
                          : (lang === 'ar' ? 'بناء وتحميل ملف APK الآن (.apk)' : 'BUILD & DOWNLOAD APK NOW')}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Live Build Packaging Progress Bar */}
                {apkProgress && (
                  <div className="mt-4 pt-3 border-t border-amber-500/30 space-y-2 animate-fade-in">
                    <div className="flex justify-between items-center text-xs font-hud text-amber-300">
                      <span className="flex items-center gap-1.5 truncate">
                        <Cpu className="w-3.5 h-3.5 animate-spin" />
                        <span className="truncate">{apkProgress.step}</span>
                      </span>
                      <span className="font-bold font-mono shrink-0 ml-2">{apkProgress.percent}%</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden p-0.5 border border-amber-500/40">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-300"
                        style={{ width: `${apkProgress.percent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Technical Specifications Bento Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl text-center">
                  <div className="text-[10px] font-hud text-slate-400 uppercase">
                    {lang === 'ar' ? 'اسم الحزمة' : 'PACKAGE ID'}
                  </div>
                  <div className="text-xs font-bold font-mono text-amber-400 mt-0.5 truncate" title={APK_CONFIG.packageName}>
                    com.yemenvanguard
                  </div>
                  <div className="text-[9px] text-slate-500">Android ID</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl text-center">
                  <div className="text-[10px] font-hud text-slate-400 uppercase">
                    {lang === 'ar' ? 'إصدار النظام' : 'TARGET SDK'}
                  </div>
                  <div className="text-xs font-bold font-hud text-emerald-400 mt-0.5">
                    Android 8.0 - 14+
                  </div>
                  <div className="text-[9px] text-slate-500">SDK 26 to 34</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl text-center">
                  <div className="text-[10px] font-hud text-slate-400 uppercase">
                    {lang === 'ar' ? 'حجم الملف' : 'FILE SIZE'}
                  </div>
                  <div className="text-xs font-bold font-hud text-sky-400 mt-0.5">
                    ~3.8 MB
                  </div>
                  <div className="text-[9px] text-slate-500">{lang === 'ar' ? 'تحميل فوري' : 'Ultra Fast'}</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl text-center">
                  <div className="text-[10px] font-hud text-slate-400 uppercase">
                    {lang === 'ar' ? 'المعمارية' : 'ARCHITECTURE'}
                  </div>
                  <div className="text-xs font-bold font-hud text-amber-400 mt-0.5">
                    ARM64 / WebGL2
                  </div>
                  <div className="text-[9px] text-slate-500">60 FPS Hardware</div>
                </div>
              </div>

              {/* Step-by-step Installation Guide */}
              <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 space-y-3">
                <div className="text-xs font-hud font-bold text-amber-400 uppercase flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>{lang === 'ar' ? 'خطوات تثبيت ملف الـ APK على هاتفك:' : 'How to install APK on Android:'}</span>
                </div>

                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-hud font-bold text-[11px] flex items-center justify-center shrink-0">1</span>
                    <p>
                      {lang === 'ar'
                        ? 'اضغط زر "بناء وتحميل ملف APK الآن" أعلاه وسيبدأ تنزيل ملف YemenVanguard-TacticalCommando-v1.4.0.apk فوراً.'
                        : 'Tap "BUILD & DOWNLOAD APK NOW" above to compile and download YemenVanguard-TacticalCommando-v1.4.0.apk.'}
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-hud font-bold text-[11px] flex items-center justify-center shrink-0">2</span>
                    <p>
                      {lang === 'ar'
                        ? 'افتح الملف من قائمة إشعارات الهاتف أو من مجلد التنزيلات (Downloads) في تطبيق "ملفاتي" أو "مدير الملفات".'
                        : 'Open the downloaded APK from your notification drawer or Downloads folder.'}
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-hud font-bold text-[11px] flex items-center justify-center shrink-0">3</span>
                    <p>
                      {lang === 'ar'
                        ? 'اضغط "تثبيت" (Install) — إذا ظهرت رسالة أمان لأول مرة، اختر "السماح بتثبيت التطبيقات من هذا المصدر".'
                        : 'Tap "Install" — if prompted for security, enable "Allow installation from this source".'}
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-hud font-bold text-[11px] flex items-center justify-center shrink-0">4</span>
                    <p>
                      {lang === 'ar'
                        ? 'مبروك! ستظهر أيقونة اللعبة على شاشة هاتفك ويمكنك تشغيلها بملء الشاشة مع حفظ تقدمك بدون إنترنت.'
                        : 'Done! The game icon appears on your home screen ready for offline high-fps action.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: INSTALL APP / PWA */}
          {activeTab === 'install' && (
            <div className="space-y-4">
              {/* Main Call-to-Action Hero Box */}
              <div className="bg-gradient-to-br from-amber-500/10 via-slate-800/60 to-slate-950/80 border border-amber-500/30 rounded-xl p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[11px] font-hud font-bold">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>{lang === 'ar' ? 'تطبيق ويب تقدمي (PWA)' : 'Progressive Web App'}</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white font-arabic">
                      {isInstalled
                        ? (lang === 'ar' ? 'اللعبة مثبتة بالفعل على جهازك' : 'Game Is Installed on Your Device')
                        : (lang === 'ar' ? 'تثبيت اللعبة كبرنامج مستقل على هاتفك أو حاسوبك' : 'Install Game as Standalone App')}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {lang === 'ar'
                        ? 'احصل على تجربة لعب بملء الشاشة، سرعة فائقة 60 إطاراً بالثانية، والتشغيل مباشرة من الشاشة الرئيسية بدون الحاجة لفتح المتصفح.'
                        : 'Get a full-screen experience at 60 FPS directly launched from your home screen with zero clutter.'}
                    </p>
                  </div>

                  {/* Primary Trigger Button */}
                  <div className="shrink-0 w-full sm:w-auto">
                    {isInstalled ? (
                      <div className="px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-hud text-xs font-bold flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>{lang === 'ar' ? 'مثبت بنجاح' : 'INSTALLED'}</span>
                      </div>
                    ) : isInstallable ? (
                      <button
                        onClick={handleInstallClick}
                        className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold font-hud text-xs sm:text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 cursor-pointer transform hover:scale-[1.02]"
                      >
                        <Download className="w-4 h-4" />
                        <span>{lang === 'ar' ? 'تثبيت التطبيق الآن' : 'INSTALL NOW'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={openStandaloneWindow}
                        className="w-full sm:w-auto px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-hud text-xs sm:text-sm rounded-xl transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2 cursor-pointer"
                        title={lang === 'ar' ? 'فتح في نافذة كاملة للتثبيت السريع' : 'Open in direct window to install'}
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>{lang === 'ar' ? 'فتح للتثبيت الفوري' : 'OPEN TO INSTALL'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Technical Specifications Bento Grid */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl text-center">
                  <div className="text-[10px] font-hud text-slate-400 uppercase">
                    {lang === 'ar' ? 'حجم اللعبة' : 'GAME SIZE'}
                  </div>
                  <div className="text-base sm:text-lg font-bold font-hud text-amber-400 mt-0.5">
                    ~3.8 MB
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {lang === 'ar' ? 'خفيف جداً وفوري' : 'Ultra-lightweight'}
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl text-center">
                  <div className="text-[10px] font-hud text-slate-400 uppercase">
                    {lang === 'ar' ? 'الأداء' : 'FRAME RATE'}
                  </div>
                  <div className="text-base sm:text-lg font-bold font-hud text-emerald-400 mt-0.5">
                    60 FPS
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {lang === 'ar' ? 'ثلاثي الأبعاد WebGL' : 'Hardware 3D'}
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl text-center">
                  <div className="text-[10px] font-hud text-slate-400 uppercase">
                    {lang === 'ar' ? 'أوفلاين' : 'OFFLINE'}
                  </div>
                  <div className="text-base sm:text-lg font-bold font-hud text-sky-400 mt-0.5">
                    100%
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {lang === 'ar' ? 'بدون إنترنت' : 'No network needed'}
                  </div>
                </div>
              </div>

              {/* Step-by-Step Installation Guides by Platform */}
              <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-hud font-bold text-amber-400 uppercase">
                    {lang === 'ar' ? 'طريقة التثبيت حسب جهازك:' : 'Installation Steps by Device:'}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setDeviceGuideTab('android')}
                      className={`px-2.5 py-1 rounded text-xs font-hud font-semibold transition-colors cursor-pointer ${
                        deviceGuideTab === 'android'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Android
                    </button>
                    <button
                      onClick={() => setDeviceGuideTab('ios')}
                      className={`px-2.5 py-1 rounded text-xs font-hud font-semibold transition-colors cursor-pointer ${
                        deviceGuideTab === 'ios'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      iPhone / iPad
                    </button>
                    <button
                      onClick={() => setDeviceGuideTab('desktop')}
                      className={`px-2.5 py-1 rounded text-xs font-hud font-semibold transition-colors cursor-pointer ${
                        deviceGuideTab === 'desktop'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      PC / Mac
                    </button>
                  </div>
                </div>

                {deviceGuideTab === 'android' && (
                  <div className="space-y-2 text-xs text-slate-300">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-hud font-bold text-[11px] flex items-center justify-center shrink-0">1</span>
                      <p>
                        {lang === 'ar'
                          ? 'اضغط على زر القائمة (⋮) الثلاث نقاط أعلى يمين المتصفح (Google Chrome أو Samsung Internet).'
                          : 'Tap the three-dot menu (⋮) in Google Chrome or Samsung Internet.'}
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-hud font-bold text-[11px] flex items-center justify-center shrink-0">2</span>
                      <p>
                        {lang === 'ar'
                          ? 'اختر "تثبيت التطبيق" (Install App) أو "إضافة إلى الشاشة الرئيسية" (Add to Home Screen).'
                          : 'Select "Install app" or "Add to Home Screen".'}
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-hud font-bold text-[11px] flex items-center justify-center shrink-0">3</span>
                      <p>
                        {lang === 'ar'
                          ? 'ستظهر أيقونة اللعبة الرسمية على شاشتك الرئيسية ويمكن تشغيلها في أي وقت بدون إنترنت.'
                          : 'The game icon will be added to your app drawer and can be played offline anytime.'}
                      </p>
                    </div>
                  </div>
                )}

                {deviceGuideTab === 'ios' && (
                  <div className="space-y-2 text-xs text-slate-300">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-hud font-bold text-[11px] flex items-center justify-center shrink-0">1</span>
                      <p>
                        {lang === 'ar'
                          ? 'افتح الرابط في متصفح Safari واضغط على زر المشاركة (Share) ذو السهم لأعلى.'
                          : 'Open the game in Safari and tap the Share button (box with upward arrow).'}
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-hud font-bold text-[11px] flex items-center justify-center shrink-0">2</span>
                      <p>
                        {lang === 'ar'
                          ? 'مرر للأسفل واضغط على "إضافة إلى الصفحة الرئيسية" (Add to Home Screen).'
                          : 'Scroll down and tap "Add to Home Screen".'}
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-hud font-bold text-[11px] flex items-center justify-center shrink-0">3</span>
                      <p>
                        {lang === 'ar'
                          ? 'اضغط "إضافة" (Add) في الزاوية العلوية لتثبيت أيقونة اللعبة.'
                          : 'Tap "Add" in the top corner to complete installation.'}
                      </p>
                    </div>
                  </div>
                )}

                {deviceGuideTab === 'desktop' && (
                  <div className="space-y-2 text-xs text-slate-300">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 font-hud font-bold text-[11px] flex items-center justify-center shrink-0">1</span>
                      <p>
                        {lang === 'ar'
                          ? 'في متصفح Chrome أو Edge، اضغط على أيقونة التثبيت (⊕) الظاهرة في نهاية شريط العنوان.'
                          : 'In Chrome or Edge, click the Install App icon (⊕) located in the address bar.'}
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 font-hud font-bold text-[11px] flex items-center justify-center shrink-0">2</span>
                      <p>
                        {lang === 'ar'
                          ? 'اضغط "تثبيت" لتشغيل اللعبة في نافذة برمجية مستقلة عالية الأداء وخالية من إطارات المتصفح.'
                          : 'Click "Install" to launch the game as a dedicated, frameless desktop application.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: OFFLINE PLAY CACHE */}
          {activeTab === 'offline' && (
            <div className="space-y-4">
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <WifiOff className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white font-arabic">
                      {lang === 'ar' ? 'تخزين حزمة اللعبة للتشغيل أوفلاين' : 'Pre-cache Game Bundle for Offline Play'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {lang === 'ar'
                        ? 'تخزين جميع ملفات اللعبة والنماذج والصوتيات في ذاكرة جهازك المحلية CacheStorage.'
                        : 'Stores all scripts, 3D audio, and models in local browser CacheStorage for offline play.'}
                    </p>
                  </div>
                </div>

                {/* Live Cache Progress Bar */}
                {cacheProgress !== null && (
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-xs font-hud text-slate-300">
                      <span>{lang === 'ar' ? 'جاري تحميل الحزمة...' : 'Downloading bundle...'}</span>
                      <span>{cacheProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${cacheProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {isOfflineReady && (
                  <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      {lang === 'ar'
                        ? 'حزمة اللعبة محملة ومحفوظة بنجاح! يمكنك الآن قطع الاتصال واللعب في أي وقت.'
                        : 'Offline game pack is cached and ready! You can now disconnect and play anytime.'}
                    </span>
                  </div>
                )}

                <button
                  onClick={() => cacheOfflineAssets()}
                  disabled={cacheProgress !== null}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-hud font-bold text-xs sm:text-sm rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {cacheProgress !== null
                      ? (lang === 'ar' ? 'جاري التنزيل...' : 'DOWNLOADING...')
                      : (lang === 'ar' ? 'تحميل حزمة الأوفلاين الآن' : 'DOWNLOAD OFFLINE PACK')}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SAVE & LOAD DOSSIER */}
          {activeTab === 'save' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Export Save Card */}
                <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl flex flex-col justify-between space-y-3">
                  <div>
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 w-fit mb-2">
                      <Download className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-white font-arabic">
                      {lang === 'ar' ? 'تصدير وتحميل ملف الحفظ' : 'Export & Download Save'}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {lang === 'ar'
                        ? 'تنزيل ملف بيانات التقدم والعتاد والنقاط المشفر (.json) لحفظه على هاتفك أو حاسوبك.'
                        : 'Download your operational dossier (.json) to back up unlocked loadouts and high scores.'}
                    </p>
                  </div>

                  <button
                    onClick={handleExportSave}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-hud text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-amber-400" />
                    <span>{lang === 'ar' ? 'تنزيل ملف الحفظ (.json)' : 'DOWNLOAD SAVE FILE'}</span>
                  </button>
                </div>

                {/* Import Save Card */}
                <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl flex flex-col justify-between space-y-3">
                  <div>
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 w-fit mb-2">
                      <Upload className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-white font-arabic">
                      {lang === 'ar' ? 'تحميل واسترجاع ملف حفظ' : 'Import / Load Save'}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {lang === 'ar'
                        ? 'رفع ملف حفظ سابق لاسترجاع رتبتك العسكرية والأسلحة والمسارح المفتوحة فوراً.'
                        : 'Upload an existing tactical save file (.json) to immediately restore your command dossier.'}
                    </p>
                  </div>

                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleImportFileChange}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-hud text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-emerald-400" />
                      <span>{lang === 'ar' ? 'رفع ملف حفظ واسترجاع' : 'IMPORT SAVE FILE'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800/90 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400 font-hud">
          <div className="flex items-center gap-2 text-slate-400">
            <Shield className="w-4 h-4 text-amber-400" />
            <span>YEMEN VANGUARD // SECURE TACTICAL ENGINE</span>
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
