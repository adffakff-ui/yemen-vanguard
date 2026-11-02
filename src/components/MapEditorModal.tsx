import React, { useState } from 'react';
import { CustomMapConfig, WarTheaterId } from '../types/game.ts';
import { X, Wrench, Mountain, Sliders, ShieldAlert, Sparkles, MapPin } from 'lucide-react';

interface MapEditorModalProps {
  onSaveMap: (map: CustomMapConfig) => void;
  onClose: () => void;
  lang: 'ar' | 'en';
}

export const MapEditorModal: React.FC<MapEditorModalProps> = ({
  onSaveMap,
  onClose,
  lang,
}) => {
  const [nameAr, setNameAr] = useState('ميدان العاصفة المخصص');
  const [nameEn, setNameEn] = useState('Custom Storm Ground');
  const [regionAr, setRegionAr] = useState('قطاع الاستطلاع الخاص');
  const [regionEn, setRegionEn] = useState('Special Recon Sector');
  const [elevationProfile, setElevationProfile] = useState<'mountains' | 'coastal_dunes' | 'sandstone_canyon' | 'snow_peaks' | 'flat_basin'>('mountains');
  const [roughness, setRoughness] = useState(0.6);
  const [enemyCount, setEnemyCount] = useState(12);
  const [barrelCount, setBarrelCount] = useState(8);
  const [threatLevel, setThreatLevel] = useState<'HIGH' | 'EXTREME' | 'CRITICAL'>('EXTREME');
  const [dropZoneX, setDropZoneX] = useState(0);
  const [dropZoneZ] = useState(32);
  const [presetTheme, setPresetTheme] = useState<'desert' | 'snow' | 'coastal' | 'forest'>('desert');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    const customId = `custom_${Date.now()}` as WarTheaterId;

    let skyColor = 0x87ceeb;
    let fogColor = 0xbae6fd;
    let sunColor = 0xfff8ee;
    let groundColor = 0xb59265;
    let accentColor = '#f59e0b';

    if (presetTheme === 'snow') {
      skyColor = 0xd1d5db;
      fogColor = 0xe5e7eb;
      groundColor = 0xf3f4f6;
      accentColor = '#38bdf8';
    } else if (presetTheme === 'coastal') {
      skyColor = 0x38bdf8;
      fogColor = 0xbae6fd;
      groundColor = 0xd1b98c;
      accentColor = '#0ea5e9';
    } else if (presetTheme === 'forest') {
      skyColor = 0x064e3b;
      fogColor = 0x065f46;
      groundColor = 0x14532d;
      accentColor = '#22c55e';
    }

    const customMap: CustomMapConfig = {
      id: customId,
      nameAr,
      nameEn,
      regionAr,
      regionEn,
      descriptionAr: 'خريطة تكتيكية مخصصة تم توليدها بواسطة محرر الخرائط والتضاريس.',
      descriptionEn: 'Custom tactical battleground generated via custom map terrain editor.',
      skyColor,
      fogColor,
      sunColor,
      groundColor,
      accentColor,
      objectiveAr: 'طهّر الميدان المخصص واقضِ على كافة التهديدات المعادية',
      objectiveEn: 'Clear the custom field and eliminate all hostile threats',
      enemyCount,
      barrelCount,
      coordinates: { lat: '15°30\'N', lng: '44°20\'E' },
      threatLevel,
      elevationProfile,
      isCustomMap: true,
      roughness,
      vegetationDensity: 0.5,
      dropZoneX,
      dropZoneZ,
      createdTime: Date.now(),
      heatmapData: [
        { x: dropZoneX, z: dropZoneZ - 40, intensity: 0.9, labelAr: 'منطقة الاشتباك الرئيسة', labelEn: 'Primary Engagement Zone' },
      ],
    };

    onSaveMap(customMap);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in select-none">
      <div className="bg-slate-950 border-2 border-amber-500 rounded-2xl p-5 max-w-xl w-full shadow-[0_0_50px_rgba(245,158,11,0.35)]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-500/30">
          <div className="flex items-center gap-2 text-amber-400">
            <Wrench className="w-5 h-5 animate-pulse" />
            <h2 className="text-base sm:text-lg font-hud font-bold uppercase tracking-wider">
              {lang === 'ar' ? 'محرر تضاريس وخرائط ساحة المعركة' : 'CUSTOM TERRAIN & MAP BUILDER'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleCreate} className="mt-4 space-y-4 text-xs font-hud text-slate-200">
          {/* Map Name Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">
                {lang === 'ar' ? 'اسم الخريطة (بالعربية):' : 'Map Name (Arabic):'}
              </label>
              <input
                type="text"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-arabic focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">
                {lang === 'ar' ? 'اسم الخريطة (بالإنجليزية):' : 'Map Name (English):'}
              </label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          {/* Elevation Profile Selector */}
          <div>
            <label className="block text-slate-400 mb-1 flex items-center gap-1.5">
              <Mountain className="w-3.5 h-3.5 text-amber-400" />
              <span>{lang === 'ar' ? 'نمط التضاريس والارتفاعات:' : 'Elevation Profile & Terrain Style:'}</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'mountains', ar: 'مرتفعات جبلية', en: 'High Mountains' },
                { id: 'coastal_dunes', ar: 'كثبان ساحلية', en: 'Coastal Dunes' },
                { id: 'sandstone_canyon', ar: 'وادي صخري', en: 'Sandstone Canyon' },
                { id: 'snow_peaks', ar: 'قمم جليدية', en: 'Snow Peaks' },
                { id: 'flat_basin', ar: 'حوض مستوٍ', en: 'Flat Basin' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setElevationProfile(p.id as any)}
                  className={`p-2 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                    elevationProfile === p.id
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {lang === 'ar' ? p.ar : p.en}
                </button>
              ))}
            </div>
          </div>

          {/* Biome Weather & Sky Preset */}
          <div>
            <label className="block text-slate-400 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{lang === 'ar' ? 'النسق البيئي والطقس:' : 'Biome Environment & Sky:'}</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'desert', ar: 'صحراوي', en: 'Desert' },
                { id: 'coastal', ar: 'ساحلي', en: 'Coastal' },
                { id: 'snow', ar: 'ثلجي', en: 'Snow' },
                { id: 'forest', ar: 'غابي', en: 'Forest' },
              ].map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setPresetTheme(b.id as any)}
                  className={`p-2 rounded-lg border text-center text-[11px] font-bold transition-all cursor-pointer ${
                    presetTheme === b.id
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                      : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  {lang === 'ar' ? b.ar : b.en}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders: Roughness, Enemies, Threat */}
          <div className="space-y-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span className="flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  {lang === 'ar' ? 'خشونة الارتفاعات والتضاريس:' : 'Terrain Elevation Roughness:'}
                </span>
                <span className="font-mono text-amber-400 font-bold">{Math.round(roughness * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={roughness}
                onChange={(e) => setRoughness(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 mb-1">
                  {lang === 'ar' ? 'عدد عناصر العدو:' : 'Hostile Enemy Count:'} ({enemyCount})
                </label>
                <input
                  type="range"
                  min="4"
                  max="20"
                  step="1"
                  value={enemyCount}
                  onChange={(e) => setEnemyCount(parseInt(e.target.value))}
                  className="w-full accent-red-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                  {lang === 'ar' ? 'مستوى الخطر:' : 'Threat Level:'}
                </label>
                <select
                  value={threatLevel}
                  onChange={(e) => setThreatLevel(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white font-mono outline-none"
                >
                  <option value="HIGH">HIGH THREAT</option>
                  <option value="EXTREME">EXTREME THREAT</option>
                  <option value="CRITICAL">CRITICAL THREAT</option>
                </select>
              </div>
            </div>

            {/* Custom Drop Coordinate X */}
            <div>
              <label className="block text-slate-300 mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-amber-400" />
                {lang === 'ar' ? 'إحداثيات مركز الإنزال المظلي (X Offset):' : 'Paratrooper Drop Offset X:'}
              </label>
              <input
                type="range"
                min="-60"
                max="60"
                step="5"
                value={dropZoneX}
                onChange={(e) => setDropZoneX(parseInt(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Submit Action Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold cursor-pointer"
            >
              {lang === 'ar' ? 'إلغاء' : 'CANCEL'}
            </button>

            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black font-hud text-xs shadow-[0_0_20px_rgba(245,158,11,0.6)] cursor-pointer active:scale-95 transition-transform"
            >
              🚀 {lang === 'ar' ? 'حفظ الخريطة والبدء' : 'SAVE & LAUNCH MAP'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
