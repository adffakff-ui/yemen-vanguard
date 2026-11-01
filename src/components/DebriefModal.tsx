import React, { useState } from 'react';
import { GameStats } from '../types/game.ts';
import { WAR_THEATERS } from '../game/theater.ts';
import { Award, Target, Clock, ShieldCheck, RotateCcw, Home, Skull, Download, CheckCircle2, Mail, MessageSquare, FileText, GraduationCap } from 'lucide-react';
import { saveManager } from '../game/saveManager.ts';
import { GmailCommsModal } from './GmailCommsModal.tsx';
import { GoogleChatModal } from './GoogleChatModal.tsx';
import { GoogleDocsModal } from './GoogleDocsModal.tsx';
import { GoogleClassroomModal } from './GoogleClassroomModal.tsx';

interface DebriefModalProps {
  stats: GameStats;
  onRestart: () => void;
  onQuitToTitle: () => void;
  lang: 'ar' | 'en';
}

export const DebriefModal: React.FC<DebriefModalProps> = ({
  stats,
  onRestart,
  onQuitToTitle,
  lang,
}) => {
  const [downloaded, setDownloaded] = useState(false);
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [showGoogleChatModal, setShowGoogleChatModal] = useState(false);
  const [showGoogleDocsModal, setShowGoogleDocsModal] = useState(false);
  const [showGoogleClassroomModal, setShowGoogleClassroomModal] = useState(false);
  const theater = WAR_THEATERS.find((t) => t.id === stats.theater) || WAR_THEATERS[0];

  const handleDownloadReport = () => {
    saveManager.downloadDebriefDossier(stats, lang);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/85 select-none pointer-events-auto">
      <div className="bg-slate-900 border border-slate-700/90 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative overflow-hidden">
        {/* Top ambient color glow */}
        <div
          className={`absolute top-0 left-0 right-0 h-1.5 ${
            stats.victory
              ? 'bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-500'
              : 'bg-gradient-to-r from-red-600 via-rose-500 to-red-600'
          }`}
        />

        {/* Status Header */}
        <div className="text-center pb-4 border-b border-slate-800">
          <div className="inline-flex p-3 rounded-full bg-slate-800/80 mb-2 border border-slate-700">
            {stats.victory ? (
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
            ) : (
              <Skull className="w-8 h-8 text-red-400" />
            )}
          </div>
          <div className="text-xs font-hud font-bold tracking-widest uppercase text-amber-400">
            {lang === 'ar' ? 'تقرير العمليات الميدانية' : 'AFTER-ACTION DEBRIEF'}
          </div>
          <h2 className="text-3xl font-black text-white font-arabic mt-1">
            {stats.victory
              ? (lang === 'ar' ? 'تم إنجاز المهمة بنجاح!' : 'MISSION ACCOMPLISHED!')
              : (lang === 'ar' ? 'سقوط في أرض المعركة' : 'OPERATIVE K.I.A.')}
          </h2>
          <div className="text-xs text-slate-400 mt-1">
            {lang === 'ar' ? theater.nameAr : theater.nameEn} · {lang === 'ar' ? theater.regionAr : theater.regionEn}
          </div>
        </div>

        {/* Mission Stats Bento Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 my-5">
          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
            <div className="text-[11px] font-hud text-slate-400 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>{lang === 'ar' ? 'النقاط التكتيكية' : 'TOTAL SCORE'}</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-hud text-amber-400 mt-1 tabular-nums">
              {stats.score.toLocaleString()}
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
            <div className="text-[11px] font-hud text-slate-400 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-red-400" />
              <span>{lang === 'ar' ? 'الأهداف المحيدة' : 'HOSTILES KILLED'}</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-hud text-slate-100 mt-1 tabular-nums">
              {stats.kills}
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
            <div className="text-[11px] font-hud text-slate-400 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              <span>{lang === 'ar' ? 'دقة الرماية' : 'HIT ACCURACY'}</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-hud text-emerald-400 mt-1 tabular-nums">
              {stats.accuracy}%
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
            <div className="text-[11px] font-hud text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>{lang === 'ar' ? 'زمن العملية' : 'MISSION TIME'}</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-hud text-slate-100 mt-1 tabular-nums">
              {formatTime(stats.timeSeconds)}
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
            <div className="text-[11px] font-hud text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>{lang === 'ar' ? 'الموجات المكتملة' : 'WAVES'}</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-hud text-amber-300 mt-1 tabular-nums">
              {stats.wavesCleared} / 3
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
            <div className="text-[11px] font-hud text-slate-400 flex items-center gap-1.5">
              <Skull className={`w-3.5 h-3.5 ${stats.bossDefeated ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span>{lang === 'ar' ? 'الزعيم المدرع' : 'BOSS'}</span>
            </div>
            <div className={`text-base sm:text-lg font-bold font-hud mt-1.5 ${stats.bossDefeated ? 'text-emerald-400' : 'text-slate-500'}`}>
              {stats.bossDefeated
                ? (lang === 'ar' ? 'تم التدمير' : 'NEUTRALIZED')
                : (lang === 'ar' ? 'لم ينجز' : 'SURVIVED')}
            </div>
          </div>
        </div>

        {/* Commendation Medal Banner (if victory) */}
        {stats.victory && (
          <div className="mb-5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
            <Award className="w-6 h-6 text-emerald-400 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-emerald-300 font-arabic block">
                {lang === 'ar' ? 'وسام الشجاعة والتحرير التكتيكي (اليمن)' : 'Medal of Tactical Valor & Liberation'}
              </span>
              <span className="text-slate-400">
                {lang === 'ar'
                  ? 'تم تطهير جميع الموجات وتدمير المدرعة القتالية وتأمين مسرح العمليات بالكامل.'
                  : 'All reinforcement waves repelled and heavy armored technical neutralized. Theater secured.'}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons & Report Download */}
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={handleDownloadReport}
              className="py-2.5 px-3 bg-slate-800/90 hover:bg-slate-700/90 border border-amber-500/40 text-amber-300 font-hud font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {downloaded ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{lang === 'ar' ? 'تم حفظ التقرير' : 'DOSSIER SAVED'}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>{lang === 'ar' ? 'تحميل التقرير (.txt)' : 'DOWNLOAD DOSSIER'}</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowGmailModal(true)}
              className="py-2.5 px-3 bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 hover:text-white font-hud font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-[0_0_10px_rgba(239,68,68,0.2)]"
            >
              <Mail className="w-4 h-4 text-red-400" />
              <span>{lang === 'ar' ? 'Gmail' : 'Gmail'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={() => setShowGoogleChatModal(true)}
              className="py-2.5 px-3 bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/40 text-teal-300 hover:text-white font-hud font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-[0_0_10px_rgba(20,184,166,0.2)]"
            >
              <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
              <span>{lang === 'ar' ? 'Google Chat' : 'Google Chat'}</span>
            </button>

            <button
              onClick={() => setShowGoogleDocsModal(true)}
              className="py-2.5 px-3 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/40 text-blue-300 hover:text-white font-hud font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-[0_0_10px_rgba(59,130,246,0.2)]"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>{lang === 'ar' ? 'Google Docs' : 'Google Docs'}</span>
            </button>

            <button
              onClick={() => setShowGoogleClassroomModal(true)}
              className="py-2.5 px-3 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 hover:text-white font-hud font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.2)]"
            >
              <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
              <span>{lang === 'ar' ? 'Classroom' : 'Classroom'}</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onRestart}
              className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-hud text-sm rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{lang === 'ar' ? 'إعادة الانتشار' : 'REDEPLOY'}</span>
            </button>

            <button
              onClick={onQuitToTitle}
              className="px-5 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium font-hud text-sm rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Home className="w-4 h-4 text-slate-400" />
              <span>{lang === 'ar' ? 'المسارح' : 'THEATERS'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Gmail Tactical Comms Center with Pre-filled After-Action Combat Stats */}
      <GmailCommsModal
        isOpen={showGmailModal}
        onClose={() => setShowGmailModal(false)}
        lang={lang}
        initialStats={stats}
      />

      {/* Google Chat Operational Spaces with Pre-filled Combat Stats */}
      <GoogleChatModal
        isOpen={showGoogleChatModal}
        onClose={() => setShowGoogleChatModal(false)}
        lang={lang}
        initialStats={stats}
      />

      {/* Google Docs Intelligence Center with Pre-filled Combat Stats */}
      <GoogleDocsModal
        isOpen={showGoogleDocsModal}
        onClose={() => setShowGoogleDocsModal(false)}
        lang={lang}
        initialStats={stats}
      />

      {/* Google Classroom Tactical Center with Pre-filled Combat Stats */}
      <GoogleClassroomModal
        isOpen={showGoogleClassroomModal}
        onClose={() => setShowGoogleClassroomModal(false)}
        lang={lang}
        initialStats={stats}
      />
    </div>
  );
};
