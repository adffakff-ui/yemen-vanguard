import React, { useEffect, useState } from 'react';
import { WarTheaterId } from '../types/game.ts';
import { WAR_THEATERS } from '../game/theater.ts';
import { Shield, Crosshair, Volume2, VolumeX, Globe, Sliders, Palette, Eye, Target } from 'lucide-react';
import { soundManager } from '../game/audio.ts';
import { PWAInstallButton } from './PWAInstallButton.tsx';
import { DownloadModal } from './DownloadModal.tsx';
import { TacticalSaveDossier } from '../game/saveManager.ts';

export interface LoadoutCustomization {
  camo: 'desert' | 'coastal' | 'canyon';
  visorTint: 'emerald' | 'amber' | 'cobalt';
  sightOptic: 'holo' | 'acog' | 'thermal';
}

interface TitleScreenProps {
  selectedTheater: WarTheaterId;
  onSelectTheater: (id: WarTheaterId) => void;
  onStartGame: () => void;
  lang: 'ar' | 'en';
  onToggleLang: () => void;
  customization?: LoadoutCustomization;
  onUpdateCustomization?: (customization: LoadoutCustomization) => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedTheater,
  onSelectTheater,
  onStartGame,
  lang,
  onToggleLang,
  customization = { camo: 'desert', visorTint: 'emerald', sightOptic: 'holo' },
  onUpdateCustomization,
}) => {
  const [activeTab, setActiveTab] = useState<'theaters' | 'customizer' | 'audio'>('theaters');
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());
  const [loadout, setLoadout] = useState<LoadoutCustomization>(customization);
  const [showDownloadCenter, setShowDownloadCenter] = useState(false);

  const handleToggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  const handleCustomizationChange = (key: keyof LoadoutCustomization, val: any) => {
    const next = { ...loadout, [key]: val };
    setLoadout(next);
    if (onUpdateCustomization) {
      onUpdateCustomization(next);
    }
  };

  // Keyboard shortcut listener for Enter or Space to start
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStartGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartGame]);

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-4 sm:p-8 md:p-12 pointer-events-auto select-none bg-gradient-to-t from-slate-950/95 via-slate-950/50 to-transparent">
      {/* Top Header Row */}
      <div className="flex items-center justify-between w-full">
        {/* Military Unit Insignia Tag */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <Shield className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="text-xs font-hud font-bold text-amber-400 uppercase tracking-widest">
              {lang === 'ar' ? 'القوات الخاصة المشتركة' : 'JOINT SPECIAL FORCES // YEMEN'}
            </div>
            <div className="text-[11px] text-slate-300">
              {lang === 'ar' ? 'كتيبة الصاعقة التكتيكية (صابر)' : 'TACTICAL COMMANDO REGIMENT (SABIR)'}
            </div>
          </div>
        </div>

        {/* Global Settings */}
        <div className="flex items-center gap-2">
          <PWAInstallButton lang={lang} onClick={() => setShowDownloadCenter(true)} />
          
          <button
            onClick={onToggleLang}
            className="px-3.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-xs font-semibold text-slate-200 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'ar' ? 'English' : 'عربي'}</span>
          </button>

          <button
            onClick={handleToggleMute}
            className="p-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-slate-200 transition-colors cursor-pointer"
          >
            {isMuted ? (
              <VolumeX className="w-4.5 h-4.5 text-red-400" />
            ) : (
              <Volume2 className="w-4.5 h-4.5 text-emerald-400" />
            )}
          </button>
        </div>
      </div>

      {/* Main Title & Customizer Glass Container */}
      <div className="max-w-3xl my-auto text-left space-y-4">
        {/* Bespoke Inline SVG Military Emblem */}
        <div className="flex items-center gap-4">
          <svg className="w-16 h-16 sm:w-20 sm:h-20 text-amber-500 shrink-0" viewBox="0 0 100 100" fill="none">
            <polygon
              points="50,4 92,26 92,74 50,96 8,74 8,26"
              stroke="currentColor"
              strokeWidth="2.5"
              fill="rgba(245, 158, 11, 0.08)"
            />
            <circle cx="50" cy="50" r="32" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
            <path
              d="M50 24 L50 76 M24 50 L76 50 M32 32 L68 68 M32 68 L68 32"
              stroke="#fbbf24"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M38 58 L50 46 L62 58 M42 66 L50 58 L58 66"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <div className="space-y-0.5">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white font-arabic">
              {lang === 'ar' ? 'طليعة اليمن: عملية صابر' : 'YEMEN VANGUARD'}
            </h1>
            <div className="text-lg sm:text-2xl font-bold font-hud text-amber-400 tracking-wide">
              {lang === 'ar' ? 'OPERATION SABIR // كوماندوز تكتيكي' : 'OPERATION SABIR // TACTICAL COMMANDO'}
            </div>
          </div>
        </div>

        {/* Dynamic Navigation Tabs: Theaters, Customizer, Audio */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-1.5 flex items-center gap-2 w-fit">
          <button
            onClick={() => setActiveTab('theaters')}
            className={`px-4 py-2 rounded-lg text-xs font-bold font-hud transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'theaters'
                ? 'bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Crosshair className="w-4 h-4" />
            <span>{lang === 'ar' ? 'مسارح العمليات' : 'War Theaters'}</span>
          </button>

          <button
            onClick={() => setActiveTab('customizer')}
            className={`px-4 py-2 rounded-lg text-xs font-bold font-hud transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'customizer'
                ? 'bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>{lang === 'ar' ? 'تخصيص العتاد' : 'Commando Customizer'}</span>
          </button>

          <button
            onClick={() => setActiveTab('audio')}
            className={`px-4 py-2 rounded-lg text-xs font-bold font-hud transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'audio'
                ? 'bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>{lang === 'ar' ? 'إعدادات الصوت' : 'Audio Settings'}</span>
          </button>
        </div>

        {/* TAB 1: WAR THEATERS */}
        {activeTab === 'theaters' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {WAR_THEATERS.map((theater) => {
              const isSelected = selectedTheater === theater.id;
              return (
                <button
                  key={theater.id}
                  onClick={() => onSelectTheater(theater.id)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-100 font-arabic">
                      {lang === 'ar' ? theater.nameAr : theater.nameEn}
                    </span>
                    {isSelected && <Crosshair className="w-4 h-4 text-amber-400" />}
                  </div>
                  <div className="text-[11px] text-amber-400/90 font-hud mt-1">
                    {lang === 'ar' ? theater.regionAr : theater.regionEn}
                  </div>
                  <div className="text-xs text-slate-400 mt-1.5 line-clamp-2">
                    {lang === 'ar' ? theater.descriptionAr : theater.descriptionEn}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* TAB 2: COMMANDO LOADOUT CUSTOMIZER */}
        {activeTab === 'customizer' && (
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Camo Pattern Option */}
              <div className="space-y-2">
                <label className="text-xs font-hud font-bold text-amber-400 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'تمويه الزي القتالي:' : 'Combat Camo Pattern:'}</span>
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    { id: 'desert', ar: 'تمويه الصحراء الجبلية', en: 'Highland Desert Camo' },
                    { id: 'coastal', ar: 'تمويه الساحل الأربان', en: 'Coastal Urban Camo' },
                    { id: 'canyon', ar: 'تمويه الهضبة الصخرية', en: 'Canyon Plateau Camo' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleCustomizationChange('camo', opt.id)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                        loadout.camo === opt.id
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                          : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {lang === 'ar' ? opt.ar : opt.en}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visor Tint Option */}
              <div className="space-y-2">
                <label className="text-xs font-hud font-bold text-amber-400 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'لون توهج نظارة الرؤية:' : 'NVG Visor Glow Tint:'}</span>
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    { id: 'emerald', ar: 'أخضر تكتيكي (NVG)', en: 'Emerald Tactical Green' },
                    { id: 'amber', ar: 'عنبري حراري', en: 'Amber Thermal Gold' },
                    { id: 'cobalt', ar: 'أزرق ليزري', en: 'Cobalt Blue' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleCustomizationChange('visorTint', opt.id)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                        loadout.visorTint === opt.id
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                          : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {lang === 'ar' ? opt.ar : opt.en}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optic Sight Option */}
              <div className="space-y-2">
                <label className="text-xs font-hud font-bold text-amber-400 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'منظار البندقية:' : 'Primary Rifle Optic:'}</span>
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    { id: 'holo', ar: 'منظار هولوغرافي EOTech', en: 'Holographic EOTech' },
                    { id: 'acog', ar: 'منظار ACOG مكبر x4', en: 'ACOG 4x Scope' },
                    { id: 'thermal', ar: 'منظار حراري ليلي', en: 'Thermal Night Sight' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleCustomizationChange('sightOptic', opt.id)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                        loadout.sightOptic === opt.id
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                          : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {lang === 'ar' ? opt.ar : opt.en}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AUDIO & CONTROLS */}
        {activeTab === 'audio' && (
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-100 font-arabic">
                  {lang === 'ar' ? 'الصوت والمؤثرات التكتيكية' : 'Master Tactical SFX & Audio'}
                </div>
                <div className="text-xs text-slate-400">
                  {lang === 'ar' ? 'صوت محاكاة إطلاق النار واللاسلكي الميداني' : 'Procedural Web Audio API combat synthesis'}
                </div>
              </div>

              <button
                onClick={handleToggleMute}
                className={`px-4 py-2 rounded-lg text-xs font-bold font-hud transition-colors cursor-pointer ${
                  isMuted ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                }`}
              >
                {isMuted ? (lang === 'ar' ? 'الصوت مكتوم' : 'Audio Muted') : (lang === 'ar' ? 'الصوت مفعّل' : 'Audio Enabled')}
              </button>
            </div>
          </div>
        )}

        {/* Primary Start CTA Button & Download Button */}
        <div className="pt-2 flex flex-wrap items-center gap-3 sm:gap-4">
          <button
            onClick={onStartGame}
            className="px-8 sm:px-9 py-3.5 sm:py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold font-hud text-sm sm:text-base rounded-xl transition-all transform hover:scale-[1.02] shadow-[0_0_25px_rgba(245,158,11,0.4)] flex items-center gap-3 cursor-pointer"
          >
            <Crosshair className="w-5 h-5 text-slate-950" />
            <span>
              {lang === 'ar' ? 'بدء المداهمة والانتشار [SPACE]' : 'DEPLOY COMMANDO [SPACE / ENTER]'}
            </span>
          </button>

          <PWAInstallButton
            lang={lang}
            variant="prominent"
            onClick={() => setShowDownloadCenter(true)}
          />
        </div>
      </div>

      {/* Bottom Flat Control Hint Line (Mandatory craft rule) */}
      <div className="border-t border-slate-800/80 pt-3 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 font-hud gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-300">
          <span>WASD {lang === 'ar' ? 'تحرك' : 'Move'}</span>
          <span className="text-slate-600">·</span>
          <span>{lang === 'ar' ? 'زر الفأرة الأيمن / Q تصويب وقفل الهدف' : 'Right-Click / Q Aim & Lock'}</span>
          <span className="text-slate-600">·</span>
          <span>{lang === 'ar' ? 'زر الفأرة الأيسر إطلاق نار' : 'Left-Click Fire'}</span>
          <span className="text-slate-600">·</span>
          <span>Space {lang === 'ar' ? 'مراوغة / دحرجة' : 'Dodge Roll'}</span>
          <span className="text-slate-600">·</span>
          <span>R {lang === 'ar' ? 'تذخير' : 'Reload'}</span>
          <span className="text-slate-600">·</span>
          <span>1/2 {lang === 'ar' ? 'تبديل السلاح' : 'Swap Weapon'}</span>
          <span className="text-slate-600">·</span>
          <span>Esc {lang === 'ar' ? 'إيقاف مؤقت' : 'Pause'}</span>
          <span className="text-slate-600">·</span>
          <span className="text-emerald-400 font-bold">{lang === 'ar' ? '📱 أزرار اللمس D-Pad مدعومة' : '📱 Mobile Touch D-Pad Supported'}</span>
        </div>
        <div className="text-amber-500/80 font-mono">
          YEMEN THEATER // 60 FPS SIMULATION
        </div>
      </div>

      {/* Tactical Download & Save Center Modal */}
      <DownloadModal
        isOpen={showDownloadCenter}
        onClose={() => setShowDownloadCenter(false)}
        lang={lang}
        onSaveLoaded={(save) => {
          if (save.lastTheater) onSelectTheater(save.lastTheater);
          if (save.customization && onUpdateCustomization) {
            onUpdateCustomization(save.customization);
            setLoadout(save.customization);
          }
        }}
      />
    </div>
  );
};

