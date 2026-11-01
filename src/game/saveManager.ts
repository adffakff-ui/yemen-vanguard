import { db, auth, handleFirestoreError, OperationType } from '../services/firebase';
import { doc, setDoc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
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
  // Cloud Sync: Push local data to Firestore if logged in
  async syncToCloud(data: TacticalSaveDossier) {
    if (!auth.currentUser) return;
    const path = `users/${auth.currentUser.uid}`;
    try {
      const sanitizedPayload = {
        userId: auth.currentUser.uid,
        displayName: auth.currentUser.displayName || 'Sabir Operative',
        playerRank: data.playerRank || 'نقيب صاعقة (Captain Sabir)',
        totalScore: Math.floor(Math.max(0, data.totalScore || 0)),
        totalKills: Math.floor(Math.max(0, data.totalKills || 0)),
        highestWave: Math.floor(Math.max(1, data.highestWave || 1)),
        highestAccuracy: Number(data.highestAccuracy || 0),
        lastTheater: String(data.lastTheater || 'sanaa'),
        unlockedTheaters: Array.isArray(data.unlockedTheaters) ? data.unlockedTheaters : ['sanaa', 'mandeeb', 'hadramaut'],
        customization: {
          camo: data.customization?.camo || 'desert',
          visorTint: data.customization?.visorTint || 'emerald',
          sightOptic: data.customization?.sightOptic || 'holo',
        },
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', auth.currentUser.uid), sanitizedPayload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // Cloud Sync: Fetch data from Firestore
  async fetchFromCloud(): Promise<TacticalSaveDossier | null> {
    if (!auth.currentUser) return null;
    const path = `users/${auth.currentUser.uid}`;
    try {
      const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (snap.exists()) {
        const cloudData = snap.data();
        const local = this.getSaveData();
        const merged: TacticalSaveDossier = {
          version: local.version || '1.4.0',
          timestamp: Date.now(),
          playerRank: cloudData.playerRank || local.playerRank || 'نقيب صاعقة (Captain Sabir)',
          totalScore: typeof cloudData.totalScore === 'number' ? cloudData.totalScore : local.totalScore,
          totalKills: typeof cloudData.totalKills === 'number' ? cloudData.totalKills : local.totalKills,
          highestWave: typeof cloudData.highestWave === 'number' ? cloudData.highestWave : local.highestWave,
          highestAccuracy: typeof cloudData.highestAccuracy === 'number' ? cloudData.highestAccuracy : local.highestAccuracy,
          lastTheater: cloudData.lastTheater || local.lastTheater || 'sanaa',
          unlockedTheaters: Array.isArray(cloudData.unlockedTheaters) ? cloudData.unlockedTheaters : local.unlockedTheaters,
          customization: cloudData.customization || local.customization,
          saveSignature: 'SABIR-YV-SECURE-ALPHA',
        };
        // Merge with local storage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  // Submit High Score to Leaderboard
  async submitHighScore(stats: GameStats, displayName?: string) {
    if (!auth.currentUser) return;
    const path = 'leaderboard';
    try {
      await addDoc(collection(db, 'leaderboard'), {
        userId: auth.currentUser.uid,
        displayName: displayName || auth.currentUser.displayName || 'Anonymous Sabir',
        score: Math.floor(Math.max(0, stats.score || 0)),
        kills: Math.floor(Math.max(0, stats.kills || 0)),
        theaterId: String(stats.theater || 'sanaa'),
        accuracy: Number(stats.accuracy || 0),
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

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
      
      // Auto-sync if logged in
      this.syncToCloud(updated);
      
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

  // Subscribe to mission
  async updateSubscriber(status: 'waiting' | 'dropping' | 'deployed') {
    if (!auth.currentUser) return;
    const path = `subscribers/${auth.currentUser.uid}`;
    try {
      await setDoc(doc(db, 'subscribers', auth.currentUser.uid), {
        userId: auth.currentUser.uid,
        displayName: auth.currentUser.displayName || 'Anonymous Sabir',
        status,
        lastActive: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // Get active subscriber count (simplified for demo)
  async getSubscriberCount(): Promise<number> {
    return Math.floor(Math.random() * 11) + 5;
  },
};
