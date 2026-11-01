import React, { useState, useEffect } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
} from '@vis.gl/react-google-maps';
import {
  MapPin,
  X,
  Layers,
  Crosshair,
  Shield,
  Radio,
  AlertTriangle,
  Globe,
  Navigation,
  Sparkles,
} from 'lucide-react';
import { WAR_THEATERS } from '../game/theater.ts';
import { WarTheaterId } from '../types/game.ts';

interface TacticalMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'ar' | 'en';
  onSelectTheater?: (id: WarTheaterId) => void;
  onStartDeployment?: (id: WarTheaterId) => void;
}

interface MapTarget {
  id: WarTheaterId | 'outpost_aden' | 'outpost_alhudaydah';
  theaterId?: WarTheaterId;
  nameAr: string;
  nameEn: string;
  regionAr: string;
  regionEn: string;
  lat: number;
  lng: number;
  threatLevel: 'HIGH' | 'EXTREME' | 'CRITICAL' | 'SECURE';
  type: 'theater' | 'outpost';
  descriptionAr: string;
  descriptionEn: string;
  color: string;
}

const TACTICAL_TARGETS: MapTarget[] = [
  {
    id: 'sanaa',
    theaterId: 'sanaa',
    nameAr: 'مسرح حصن صنعاء والخنادق الجبلية',
    nameEn: "Sana'a Citadel & Trench Complex",
    regionAr: 'المرتفعات الجبلية - العاصمة صنعاء',
    regionEn: "Highland Mountains, Sana'a",
    lat: 15.3547,
    lng: 44.2066,
    threatLevel: 'HIGH',
    type: 'theater',
    descriptionAr: 'حصن جليخ مرتفع محاط بخنادق ميدانية وأبراج قنص محصنة.',
    descriptionEn: 'High-altitude citadel with field trenches and elevated sniper watchtowers.',
    color: '#f59e0b', // Amber
  },
  {
    id: 'mandeeb',
    theaterId: 'mandeeb',
    nameAr: 'مسرح قاعدة باب المندب الساحلية',
    nameEn: 'Bab-el-Mandeb Coastal Post',
    regionAr: 'مضيق باب المندب - البحر الأحمر',
    regionEn: 'Bab-el-Mandeb Strait, Red Sea Coast',
    lat: 12.5891,
    lng: 43.3374,
    threatLevel: 'EXTREME',
    type: 'theater',
    descriptionAr: 'قاعدة ساحلية استراتيجية مليئة بالحاويات البحرية ورادارات المراقبة.',
    descriptionEn: 'Strategic coastal outpost with shipping container corridors and naval radars.',
    color: '#0ea5e9', // Sky Blue
  },
  {
    id: 'hadramaut',
    theaterId: 'hadramaut',
    nameAr: 'مسرح وادي حضرموت ومجمع الخنادق',
    nameEn: 'Hadramaut Canyon Fortress',
    regionAr: 'الهضبة الصحراوية - وادي حضرموت',
    regionEn: 'Sandstone Canyon Plateau, Hadramaut',
    lat: 15.9322,
    lng: 48.7845,
    threatLevel: 'CRITICAL',
    type: 'theater',
    descriptionAr: 'أخدود صحراوي عميق يضم خنادق سفلية وأعشاش قناصة موجهة.',
    descriptionEn: 'Deep sandstone gorge bordered by fortified trench networks.',
    color: '#f97316', // Orange
  },
  {
    id: 'outpost_aden',
    nameAr: 'قاعدة الدعم اللوجستي (عدن)',
    nameEn: 'Aden Forward Logistics Base',
    regionAr: 'الساحل الجنوبي - ميناء عدن',
    regionEn: 'Southern Coast, Port of Aden',
    lat: 12.7855,
    lng: 45.0186,
    threatLevel: 'SECURE',
    type: 'outpost',
    descriptionAr: 'مركز القيادة والتموين الميداني وإعادة المذخرات لقوات طليعة اليمن.',
    descriptionEn: 'Forward operating logistics hub & commando supply depot.',
    color: '#10b981', // Emerald
  },
  {
    id: 'outpost_alhudaydah',
    nameAr: 'موقع الاستطلاع المتقدم (الحديدة)',
    nameEn: 'Al-Hudaydah Reconnaissance Outpost',
    regionAr: 'الساحل الغربي - الحديدة',
    regionEn: 'Western Coast, Al-Hudaydah',
    lat: 14.7978,
    lng: 42.9545,
    threatLevel: 'HIGH',
    type: 'outpost',
    descriptionAr: 'برج مراقبة واستطلاع تكتيكي لرصد التحركات البحرية والبرية.',
    descriptionEn: 'Tactical surveillance tower for maritime & overland recon.',
    color: '#8b5cf6', // Violet
  },
  {
    id: 'snow',
    theaterId: 'snow',
    nameAr: 'مسرح مرتفعات ذمار الجليدية',
    nameEn: 'Dhamar Frozen Heights',
    regionAr: 'محافظة ذمار - القمم الجليدية',
    regionEn: 'Dhamar Governorate, Frozen Peaks',
    lat: 14.545,
    lng: 44.405,
    threatLevel: 'EXTREME',
    type: 'theater',
    descriptionAr: 'قاعدة عسكرية فوق قمم الجبال المكسوة بالثلوج، حيث تنخفض الرؤية وتزداد الصعوبة تكتيكياً.',
    descriptionEn: 'Military base atop snow-capped peaks, where visibility is low and tactical complexity is high.',
    color: '#38bdf8', // Sky Blue
  },
  {
    id: 'forest',
    theaterId: 'forest',
    nameAr: 'مسرح وادي ريمة الغابوي',
    nameEn: 'Raymah Forest Gorge',
    regionAr: 'محافظة ريمة - المدرجات الخضراء',
    regionEn: 'Raymah Governorate, Green Terraces',
    lat: 14.615,
    lng: 43.705,
    threatLevel: 'CRITICAL',
    type: 'theater',
    descriptionAr: 'منطقة غابات كثيفة وتضاريس خضراء شاهقة توفر غطاءً ممتازاً للعمليات الخاصة والكمائن.',
    descriptionEn: 'Dense forested area with towering green terraces providing excellent cover for special ops.',
    color: '#22c55e', // Green
  },
];

export const TacticalMapModal: React.FC<TacticalMapModalProps> = ({
  isOpen,
  onClose,
  lang = 'ar',
  onSelectTheater,
  onStartDeployment,
}) => {
  // Sanitize API key: trim whitespace and fix duplicated key strings if accidentally pasted twice
  let rawApiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
  if (rawApiKey.length > 39 && rawApiKey.startsWith('AIzaSy')) {
    const firstHalf = rawApiKey.slice(0, 39);
    const secondHalf = rawApiKey.slice(39, 78);
    if (firstHalf === secondHalf) {
      rawApiKey = firstHalf;
    }
  }
  const apiKey = rawApiKey;

  const [mapType, setMapType] = useState<'hybrid' | 'satellite' | 'roadmap' | 'terrain'>('hybrid');
  const [selectedTarget, setSelectedTarget] = useState<MapTarget | null>(TACTICAL_TARGETS[0]);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [mapError, setMapError] = useState(false);

  // Global listener for quota exceeded or map load errors
  useEffect(() => {
    const handleQuota = () => {
      setQuotaExceeded(true);
      setMapError(true);
    };
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md select-none pointer-events-auto animate-fade-in font-arabic">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/90 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col h-[90vh] max-h-[820px]">
        {/* Top Glowing Status Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-sky-500 via-amber-400 to-emerald-400 animate-pulse" />

        {/* Quota Exceeded Alert Banner */}
        {quotaExceeded && (
          <div className="bg-amber-500/20 border-b border-amber-500/40 text-amber-200 px-4 py-2 text-xs flex items-center justify-between font-arabic shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {lang === 'ar'
                  ? 'تم الوصول إلى الحد الأقصى لاستعلامات الخريطة اليومية. يرجى مراجعة إعدادات المفتاح.'
                  : 'Google Maps Platform quota limit reached. Please check your API key options.'}
              </span>
            </div>
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-bold text-amber-300 hover:text-white"
            >
              {lang === 'ar' ? 'التفاصيل' : 'Details'}
            </a>
          </div>
        )}

        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(14,165,233,0.3)] shrink-0">
              <Globe className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="text-xs font-hud font-bold text-sky-400 uppercase tracking-widest flex items-center gap-2">
                <span>{lang === 'ar' ? 'خريطة القمر الصناعي التكتيكية' : 'TACTICAL SATELLITE RADAR'}</span>
                <span className="text-slate-600">·</span>
                <span className="text-amber-400">GOOGLE MAPS PLATFORM</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                {lang === 'ar' ? 'استطلاع المسارح والقواعد الميدانية' : 'Theater Reconnaissance & Outpost Radar'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Body Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 overflow-hidden relative">
          {/* Left Column: Target Location Directory & Controls */}
          <div className="p-3 sm:p-4 bg-slate-950/70 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between overflow-y-auto space-y-3">
            <div className="space-y-3">
              {/* Layer / Map Type Selector Buttons */}
              <div className="space-y-1">
                <label className="text-[11px] font-hud font-bold text-slate-400 uppercase flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-sky-400" />
                  <span>{lang === 'ar' ? 'نمط الخريطة الرادارية:' : 'Map Satellite View:'}</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'hybrid', ar: 'مختلط (الهجين)', en: 'Hybrid' },
                    { id: 'satellite', ar: 'قمر صناعي', en: 'Satellite' },
                    { id: 'roadmap', ar: 'خريطة الطرق', en: 'Roadmap' },
                    { id: 'terrain', ar: 'تضاريس', en: 'Terrain' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMapType(m.id as any)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-hud transition-all cursor-pointer border ${
                        mapType === m.id
                          ? 'bg-sky-500/25 border-sky-400 text-sky-200 font-bold shadow-[0_0_10px_rgba(14,165,233,0.3)]'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {lang === 'ar' ? m.ar : m.en}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Buttons List */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-hud font-bold text-slate-400 uppercase flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5 text-amber-400" />
                  <span>{lang === 'ar' ? 'المواقع التكتيكية المحددة:' : 'Tactical Target Locations:'}</span>
                </label>

                <div className="space-y-1.5 max-h-[220px] md:max-h-[310px] overflow-y-auto pr-1">
                  {TACTICAL_TARGETS.map((target) => {
                    const isSelected = selectedTarget?.id === target.id;
                    return (
                      <button
                        key={target.id}
                        onClick={() => {
                          setSelectedTarget(target);
                          if (target.theaterId && onSelectTheater) {
                            onSelectTheater(target.theaterId);
                          }
                        }}
                        className={`w-full p-2.5 rounded-xl border text-right transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-slate-800/90 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                            : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="text-xs font-bold text-white truncate">
                            {lang === 'ar' ? target.nameAr : target.nameEn}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            {lang === 'ar' ? target.regionAr : target.regionEn}
                          </div>
                        </div>

                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: target.color }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Selected Target Tactical Dossier & Launch Button */}
            {selectedTarget && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400">
                    {lang === 'ar' ? selectedTarget.nameAr : selectedTarget.nameEn}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-hud font-bold border ${
                      selectedTarget.threatLevel === 'SECURE'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : selectedTarget.threatLevel === 'HIGH'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-red-500/20 text-red-300 border-red-500/40'
                    }`}
                  >
                    {selectedTarget.threatLevel}
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {lang === 'ar' ? selectedTarget.descriptionAr : selectedTarget.descriptionEn}
                </p>

                {selectedTarget.theaterId && (
                  <button
                    onClick={() => {
                      if (onStartDeployment && selectedTarget.theaterId) {
                        onStartDeployment(selectedTarget.theaterId);
                        onClose();
                      }
                    }}
                    className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-hud font-bold text-xs rounded-lg transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2 cursor-pointer active:scale-95 mt-1"
                  >
                    <Navigation className="w-3.5 h-3.5 text-slate-950" />
                    <span>
                      {lang === 'ar' ? 'بدء الانتشار الميداني فوراً' : 'DEPLOY COMMANDO HERE'}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right Area: Interactive Google Map */}
          <div className="col-span-1 md:col-span-2 relative h-full w-full min-h-[320px]">
            {apiKey && !mapError ? (
              <APIProvider apiKey={apiKey} onError={() => setMapError(true)}>
                <Map
                  style={{ width: '100%', height: '100%' }}
                  center={{
                    lat: selectedTarget ? selectedTarget.lat : 15.3547,
                    lng: selectedTarget ? selectedTarget.lng : 44.2066,
                  }}
                  zoom={selectedTarget ? (selectedTarget.type === 'theater' ? 12 : 11) : 7}
                  mapId="DEMO_MAP_ID"
                  mapTypeId={mapType}
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  gestureHandling="greedy"
                  disableDefaultUI={false}
                >
                  {/* Advanced Markers for All War Theaters & Outposts */}
                  {TACTICAL_TARGETS.map((target) => (
                    <AdvancedMarker
                      key={target.id}
                      position={{ lat: target.lat, lng: target.lng }}
                      onClick={() => {
                        setSelectedTarget(target);
                        if (target.theaterId && onSelectTheater) {
                          onSelectTheater(target.theaterId);
                        }
                      }}
                    >
                      <Pin
                        background={target.color}
                        borderColor="#ffffff"
                        glyphColor="#000000"
                        scale={selectedTarget?.id === target.id ? 1.3 : 1.0}
                      />
                    </AdvancedMarker>
                  ))}

                  {/* InfoWindow for Selected Target */}
                  {selectedTarget && (
                    <InfoWindow
                      position={{ lat: selectedTarget.lat, lng: selectedTarget.lng }}
                      onCloseClick={() => setSelectedTarget(null)}
                    >
                      <div className="p-1 max-w-[200px] text-slate-900 font-arabic space-y-1">
                        <div className="flex items-center gap-1 text-xs font-bold">
                          <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span>{lang === 'ar' ? selectedTarget.nameAr : selectedTarget.nameEn}</span>
                        </div>
                        <div className="text-[10px] text-slate-600 font-mono">
                          {selectedTarget.lat.toFixed(4)}°N, {selectedTarget.lng.toFixed(4)}°E
                        </div>
                        <p className="text-[10px] text-slate-700 leading-snug">
                          {lang === 'ar' ? selectedTarget.descriptionAr : selectedTarget.descriptionEn}
                        </p>
                      </div>
                    </InfoWindow>
                  )}
                </Map>
              </APIProvider>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-300 space-y-4 bg-slate-950 relative overflow-hidden">
                {/* Background Tactical Grid Pattern */}
                <div
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage: `radial-gradient(circle at 50% 50%, #0ea5e9 1px, transparent 1px), linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)`,
                    backgroundSize: '30px 30px',
                  }}
                />

                <div className="w-14 h-14 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 animate-pulse relative z-10">
                  <Globe className="w-7 h-7" />
                </div>

                <div className="space-y-1 relative z-10 max-w-sm">
                  <h3 className="text-sm font-bold text-sky-400 font-hud">
                    {lang === 'ar' ? 'رادار الاستطلاع التكتيكي الميداني' : 'TACTICAL SATELLITE RADAR GRID'}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {selectedTarget
                      ? lang === 'ar'
                        ? `إحداثيات الموقع: ${selectedTarget.lat.toFixed(4)}° شمالاً، ${selectedTarget.lng.toFixed(4)}° شرقاً`
                        : `Target Coordinates: ${selectedTarget.lat.toFixed(4)}°N, ${selectedTarget.lng.toFixed(4)}°E`
                      : lang === 'ar'
                      ? 'تم تحديد المسارح والقواعد الميدانية على الخريطة'
                      : 'Tactical target sectors identified'}
                  </p>
                </div>

                {/* Selected Target Tactical Quick Card */}
                {selectedTarget && (
                  <div className="p-4 bg-slate-900/90 border border-sky-500/40 rounded-xl relative z-10 max-w-sm w-full text-right space-y-2 shadow-lg">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                      <span>{lang === 'ar' ? selectedTarget.nameAr : selectedTarget.nameEn}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {selectedTarget.lat.toFixed(2)}°, {selectedTarget.lng.toFixed(2)}°
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{lang === 'ar' ? selectedTarget.descriptionAr : selectedTarget.descriptionEn}</p>
                    {selectedTarget.theaterId && onStartDeployment && (
                      <button
                        onClick={() => {
                          onStartDeployment(selectedTarget.theaterId!);
                          onClose();
                        }}
                        className="w-full mt-2 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-hud font-bold text-xs rounded-lg transition-all"
                      >
                        {lang === 'ar' ? 'بدء الانتشار الميداني' : 'DEPLOY COMMANDO'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
