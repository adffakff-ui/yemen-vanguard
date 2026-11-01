import { GameStats, WarTheaterId } from '../types/game.ts';
import { LoadoutCustomization } from '../components/TitleScreen.tsx';

export interface TacticalSaveDossier {
  version: string;
  timestamp: number;
  playerRank: string;
  totalScore: number;
  totalKills: number;
  highestWave: number;
  highestAccuracy: number;
  lastTheater: WarTheaterId;
  unlockedTheaters: WarTheaterId[];
  customization: LoadoutCustomization;
  saveSignature: string;
}

const STORAGE_KEY = 'yemen_vanguard_tactical_save_v1';

export const saveManager = {
  // Read current saved profile from localStorage
  getSaveData(): TacticalSaveDossier {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {}

    // Default save dossier
    return {
      version: '1.2.0',
      timestamp: Date.now(),
      playerRank: 'نقيب صاعقة (Captain Sabir)',
      totalScore: 0,
      totalKills: 0,
      highestWave: 1,
      highestAccuracy: 0,
      lastTheater: 'sanaa',
      unlockedTheaters: ['sanaa', 'mandeeb', 'hadramaut'],
      customization: { camo: 'desert', visorTint: 'emerald', sightOptic: 'holo' },
      saveSignature: 'SABIR-YV-SECURE-ALPHA',
    };
  },

  // Save profile to localStorage
  saveData(data: Partial<TacticalSaveDossier>) {
    try {
      const current = this.getSaveData();
      const updated: TacticalSaveDossier = {
        ...current,
        ...data,
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    } catch {
      return this.getSaveData();
    }
  },

  // Export and download current save file to local device (.json)
  exportSaveFile() {
    const data = this.getSaveData();
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yemen-vanguard-tactical-save-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // Import save file from local device
  async importSaveFile(file: File): Promise<{ success: boolean; data?: TacticalSaveDossier; error?: string }> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content) as TacticalSaveDossier;
          if (parsed && typeof parsed === 'object') {
            const updated = this.saveData(parsed);
            resolve({ success: true, data: updated });
          } else {
            resolve({ success: false, error: 'الملف التكتيكي تالف أو غير صالح.' });
          }
        } catch {
          resolve({ success: false, error: 'تعذر قراءة ملف الحفظ. تأكد من أنه ملف JSON صالح.' });
        }
      };
      reader.onerror = () => resolve({ success: false, error: 'فشل في قراءة الملف.' });
      reader.readAsText(file);
    });
  },

  // Download official after-action tactical military report dossier (.txt)
  downloadDebriefDossier(stats: GameStats, lang: 'ar' | 'en') {
    const isAr = lang === 'ar';
    const dateStr = new Date().toLocaleString(isAr ? 'ar-YE' : 'en-US');
    const timeFormatted = `${Math.floor(stats.timeSeconds / 60)}m ${stats.timeSeconds % 60}s`;

    const content = isAr
      ? `================================================================================
          قيادة القوات الخاصة المشتركة - الجمهورية اليمنية
                     تقرير العمليات الميدانية الرسمي
                     OPERATION SABIR // MISSION DEBRIEF
================================================================================
تاريخ ووقت الانتشار: ${dateStr}
مسرح العمليات المستهدف: ${stats.theater.toUpperCase()}
حالة الإنجاز: ${stats.victory ? 'تم إنجاز المهمة بنجاح وتطهير المسرح' : 'سقوط في أرض المعركة (K.I.A)'}
النتيجة التكتيكية الإجمالية: ${stats.score.toLocaleString()} نقطة
عدد الأهداف المعادية المحيدة: ${stats.kills}
دقة الرماية النارية: ${stats.accuracy}%
زمن تنفيذ المهمة: ${timeFormatted}
الموجات القتالية المطهرة: ${stats.wavesCleared} / 3
حالة الزعيم المدرع المعادي: ${stats.bossDefeated ? 'تم التدمير والتحييد بالكامل' : 'لم ينجز'}

الوسام التقديري: ${stats.victory ? 'وسام الشجاعة والتحرير التكتيكي - الدرجة الأولى' : 'شرف المحاولة والواجب الوطني'}
الكتيبة: كتيبة الصاعقة التكتيكية (صابر)
كود التحقق التكتيكي: SABIR-OP-${Math.random().toString(36).substring(2, 9).toUpperCase()}
================================================================================`
      : `================================================================================
          JOINT SPECIAL FORCES HEADQUARTERS // YEMEN
                   OFFICIAL AFTER-ACTION REPORT
                 OPERATION SABIR // MISSION DEBRIEF
================================================================================
Deployment Date & Time: ${dateStr}
Target Operational Theater: ${stats.theater.toUpperCase()}
Mission Outcome: ${stats.victory ? 'MISSION ACCOMPLISHED // THEATER SECURED' : 'OPERATIVE K.I.A.'}
Total Tactical Score: ${stats.score.toLocaleString()} PTS
Hostiles Neutralized: ${stats.kills}
Marksmanship Accuracy: ${stats.accuracy}%
Operation Duration: ${timeFormatted}
Waves Cleared: ${stats.wavesCleared} / 3
Hostile Armored Boss: ${stats.bossDefeated ? 'NEUTRALIZED' : 'SURVIVED'}

Commendation: ${stats.victory ? 'Medal of Tactical Valor & Liberation (Class 1)' : 'Honorary Field Duty Citation'}
Unit: Tactical Commando Regiment (Sabir)
Verification Code: SABIR-OP-${Math.random().toString(36).substring(2, 9).toUpperCase()}
================================================================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `operation-sabir-debrief-${stats.theater}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
