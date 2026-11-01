import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  BookOpen,
  MessageSquare,
  FileSpreadsheet,
  Users,
  Plus,
  RefreshCw,
  X,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  LogOut,
  ShieldAlert,
  Send,
  Calendar,
  Award,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
} from '../services/gmailAuth.ts';
import {
  listCourses,
  listCourseWork,
  listAnnouncements,
  createAnnouncement,
  createCourseWork,
  listStudents,
  listTeachers,
  ClassroomCourse,
  ClassroomCourseWork,
  ClassroomAnnouncement,
  ClassroomStudent,
  ClassroomTeacher,
} from '../services/googleClassroomApi.ts';
import { GameStats } from '../types/game.ts';

interface GoogleClassroomModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'ar' | 'en';
  initialStats?: GameStats | null;
}

type TabType = 'courses' | 'announcements' | 'coursework' | 'roster';

export const GoogleClassroomModal: React.FC<GoogleClassroomModalProps> = ({
  isOpen,
  onClose,
  lang = 'ar',
  initialStats = null,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('courses');

  // Loading & Messages
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Classroom Data
  const [courses, setCourses] = useState<ClassroomCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<ClassroomCourse | null>(null);
  const [courseworkList, setCourseworkList] = useState<ClassroomCourseWork[]>([]);
  const [announcementsList, setAnnouncementsList] = useState<ClassroomAnnouncement[]>([]);
  const [studentsList, setStudentsList] = useState<ClassroomStudent[]>([]);
  const [teachersList, setTeachersList] = useState<ClassroomTeacher[]>([]);

  // Post Announcement State
  const [announcementText, setAnnouncementText] = useState('');
  
  // Post Coursework State
  const [courseworkTitle, setCourseworkTitle] = useState('');
  const [courseworkDesc, setCourseworkDesc] = useState('');
  const [courseworkMaxPoints, setCourseworkMaxPoints] = useState(100);

  // Mandatory Confirmation Dialog State (Per Workspace API guidelines for mutations)
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
        setCourses([]);
        setSelectedCourse(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch courses when modal is opened and token is ready
  useEffect(() => {
    if (token && isOpen) {
      loadCourses(token);
    }
  }, [token, isOpen]);

  // Pre-fill debrief text when initialStats provided
  useEffect(() => {
    if (initialStats && isOpen) {
      const statsSummary =
        lang === 'ar'
          ? `📋 [تقرير debrief تكتيكي - طليعة اليمن]\n• الأعداء المتحيدون: ${initialStats.kills}\n• النقاط الإجمالية: ${initialStats.score}\n• زمن الصمود: ${Math.floor(initialStats.timeSeconds)} ثانية\n• الموجات المكتملة: ${initialStats.wavesCleared}\n• التوضيع: الأجهزة التكتيكية الميدانية`
          : `📋 [Yemen Vanguard Tactical Combat Debrief]\n• Hostiles Eliminated: ${initialStats.kills}\n• Total Score: ${initialStats.score}\n• Time Survived: ${Math.floor(initialStats.timeSeconds)}s\n• Waves Completed: ${initialStats.wavesCleared}\n• Field Sector: Operational Zone`;

      setAnnouncementText(statsSummary);
      setCourseworkTitle(
        lang === 'ar'
          ? `مهمة تكتيكية: تقرير الاشتباك #${initialStats.wavesCleared}`
          : `Tactical Mission: Combat Debrief #${initialStats.wavesCleared}`
      );
      setCourseworkDesc(statsSummary);
    }
  }, [initialStats, isOpen, lang]);

  // Fetch course detail data when selectedCourse changes
  useEffect(() => {
    if (token && selectedCourse) {
      loadCourseDetails(token, selectedCourse.id);
    }
  }, [token, selectedCourse]);

  const loadCourses = async (accessToken: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const fetchedCourses = await listCourses(accessToken);
      setCourses(fetchedCourses);
      if (fetchedCourses.length > 0 && !selectedCourse) {
        setSelectedCourse(fetchedCourses[0]);
      }
    } catch (err: any) {
      console.error('Failed to load courses:', err);
      setErrorMsg(err.message || (lang === 'ar' ? 'فشل تحميل الدورات التعليمية' : 'Failed to load Classroom courses'));
    } finally {
      setIsLoading(false);
    }
  };

  const loadCourseDetails = async (accessToken: string, courseId: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [cw, ann, std, tch] = await Promise.all([
        listCourseWork(accessToken, courseId).catch(() => []),
        listAnnouncements(accessToken, courseId).catch(() => []),
        listStudents(accessToken, courseId).catch(() => []),
        listTeachers(accessToken, courseId).catch(() => []),
      ]);
      setCourseworkList(cw);
      setAnnouncementsList(ann);
      setStudentsList(std);
      setTeachersList(tch);
    } catch (err: any) {
      console.error('Failed to load course details:', err);
      setErrorMsg(err.message || (lang === 'ar' ? 'فشل تحميل تفاصيل الدورة' : 'Failed to load course details'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMsg(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setToken(res.accessToken);
        await loadCourses(res.accessToken);
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
    setCourses([]);
    setSelectedCourse(null);
    setCourseworkList([]);
    setAnnouncementsList([]);
  };

  // Create Announcement with Mandatory User Confirmation Modal
  const requestPostAnnouncement = () => {
    if (!selectedCourse) {
      setErrorMsg(lang === 'ar' ? 'يرجى تحديد دورة تعليمية أولاً' : 'Please select a course first');
      return;
    }
    if (!announcementText.trim()) {
      setErrorMsg(lang === 'ar' ? 'يرجى كتابة نص الإعلان' : 'Please enter announcement text');
      return;
    }

    setPendingConfirmAction({
      title: lang === 'ar' ? 'تأكيد نشر إعلان في الفصل' : 'Confirm Posting Announcement',
      description:
        lang === 'ar'
          ? `هل أنت ألمؤكد من نشر هذا الإعلان في الصف الدراسي "${selectedCourse.name}" عبر Google Classroom؟`
          : `Are you sure you want to post this announcement to "${selectedCourse.name}" on Google Classroom?`,
      onConfirm: async () => {
        if (!token || !selectedCourse) return;
        setIsLoading(true);
        setErrorMsg(null);
        setSuccessMsg(null);
        try {
          await createAnnouncement(token, selectedCourse.id, announcementText.trim());
          setSuccessMsg(
            lang === 'ar'
              ? 'تم نشر الإعلان بنجاح في Google Classroom!'
              : 'Announcement successfully posted to Google Classroom!'
          );
          setAnnouncementText('');
          await loadCourseDetails(token, selectedCourse.id);
        } catch (err: any) {
          setErrorMsg(err.message || (lang === 'ar' ? 'فشل نشر الإعلان' : 'Failed to post announcement'));
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  // Create CourseWork with Mandatory User Confirmation Modal
  const requestPostCourseWork = () => {
    if (!selectedCourse) {
      setErrorMsg(lang === 'ar' ? 'يرجى تحديد دورة تعليمية أولاً' : 'Please select a course first');
      return;
    }
    if (!courseworkTitle.trim()) {
      setErrorMsg(lang === 'ar' ? 'يرجى إدخال عنوان الواجب التكتيكي' : 'Please enter assignment title');
      return;
    }

    setPendingConfirmAction({
      title: lang === 'ar' ? 'تأكيد إنشاء واجب تكتيكي جديد' : 'Confirm Creating Classroom Assignment',
      description:
        lang === 'ar'
          ? `هل أنت متأكد من إضافة الواجب "${courseworkTitle}" بـ ${courseworkMaxPoints} نقطة في صف "${selectedCourse.name}"؟`
          : `Are you sure you want to add assignment "${courseworkTitle}" (${courseworkMaxPoints} pts) to "${selectedCourse.name}"?`,
      onConfirm: async () => {
        if (!token || !selectedCourse) return;
        setIsLoading(true);
        setErrorMsg(null);
        setSuccessMsg(null);
        try {
          await createCourseWork(
            token,
            selectedCourse.id,
            courseworkTitle.trim(),
            courseworkDesc.trim(),
            courseworkMaxPoints
          );
          setSuccessMsg(
            lang === 'ar'
              ? 'تم إنشاء الواجب الدراسي التكتيكي بنجاح!'
              : 'Tactical assignment created successfully!'
          );
          setCourseworkTitle('');
          setCourseworkDesc('');
          await loadCourseDetails(token, selectedCourse.id);
        } catch (err: any) {
          setErrorMsg(err.message || (lang === 'ar' ? 'فشل إنشاء الواجب الدراسي' : 'Failed to create assignment'));
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-900 border border-emerald-500/40 rounded-xl shadow-2xl text-slate-100 overflow-hidden"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-emerald-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
              <GraduationCap className="w-6 h-[24px]" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-wide text-emerald-400 flex items-center gap-2">
                {lang === 'ar' ? 'منصة الفصول التكتيكية - Google Classroom' : 'Tactical Classrooms - Google Classroom'}
              </h2>
              <p className="text-xs text-slate-400">
                {lang === 'ar'
                  ? 'مزامنة التمارين والتدريبات التكتيكية وبلاغات الميدان'
                  : 'Sync tactical drills, exercises, and field debriefs'}
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
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400 mb-4">
              <BookOpen className="w-8 h-8" />
            </div>

            <h3 className="text-2xl font-bold mb-2">
              {lang === 'ar' ? 'الاتصال بـ Google Classroom' : 'Connect to Google Classroom'}
            </h3>
            <p className="text-slate-400 max-w-md text-sm mb-6">
              {lang === 'ar'
                ? 'قم بتسجيل الدخول بحساب Google Workspace الخاص بك لاستعراض الفصول التكتيكية، ونشر تقارير المهمات، ومشاركة التدريبات الميدانية مع فريقك.'
                : 'Sign in with your Google Workspace account to access tactical courses, post mission debriefs, and assign field drills to your unit.'}
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
            {/* Authenticated User Status Bar */}
            <div className="flex items-center justify-between px-6 py-2.5 bg-slate-950/60 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-3 text-slate-300">
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt="User" className="w-5 h-5 rounded-full" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-emerald-500/30 flex items-center justify-center text-emerald-300 text-[10px]">
                    {currentUser.email?.[0].toUpperCase()}
                  </div>
                )}
                <span className="font-medium text-emerald-400">{currentUser.email}</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">
                  {lang === 'ar'
                    ? `عدد الفصول المكتشفة: ${courses.length}`
                    : `Active Courses: ${courses.length}`}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-slate-400 hover:text-red-400 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}</span>
              </button>
            </div>

            {/* Main Content Layout */}
            <div className="flex-1 flex overflow-hidden">
              {/* Course Selector Sidebar */}
              <div className="w-64 bg-slate-950/80 border-l border-slate-800 flex flex-col p-3 gap-2 overflow-y-auto shrink-0">
                <div className="flex items-center justify-between px-2 py-1 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <span>{lang === 'ar' ? 'الفصول التكتيكية' : 'Courses'}</span>
                  <button
                    onClick={() => token && loadCourses(token)}
                    className="p-1 hover:text-emerald-400 rounded transition-colors"
                    title={lang === 'ar' ? 'تحديث الفصول' : 'Refresh Courses'}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {courses.length === 0 ? (
                  <div className="text-slate-500 text-xs text-center py-6">
                    {lang === 'ar'
                      ? 'لا يوجد فصول دراسية متاحة حالياً'
                      : 'No active Google Classroom courses found'}
                  </div>
                ) : (
                  courses.map((course) => (
                    <button
                      key={course.id}
                      onClick={() => setSelectedCourse(course)}
                      className={`w-full text-right p-3 rounded-lg border transition-all flex flex-col gap-1 ${
                        selectedCourse?.id === course.id
                          ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 shadow-sm'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <span className="font-semibold text-sm line-clamp-1">{course.name}</span>
                      {course.section && (
                        <span className="text-[11px] text-slate-400 line-clamp-1">{course.section}</span>
                      )}
                    </button>
                  ))
                )}
              </div>

              {/* Main Tab Views */}
              <div className="flex-1 flex flex-col bg-slate-900/60 overflow-hidden">
                {/* Tabs Header */}
                <div className="flex border-b border-slate-800 bg-slate-950/40">
                  <button
                    onClick={() => setActiveTab('courses')}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
                      activeTab === 'courses'
                        ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'تفاصيل الفصل' : 'Course Info'}</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('announcements')}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
                      activeTab === 'announcements'
                        ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>
                      {lang === 'ar'
                        ? `الإعلانات (${announcementsList.length})`
                        : `Announcements (${announcementsList.length})`}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab('coursework')}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
                      activeTab === 'coursework'
                        ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>
                      {lang === 'ar'
                        ? `الواجبات (${courseworkList.length})`
                        : `Assignments (${courseworkList.length})`}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab('roster')}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
                      activeTab === 'roster'
                        ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>
                      {lang === 'ar'
                        ? `الأفراد (${studentsList.length + teachersList.length})`
                        : `Roster (${studentsList.length + teachersList.length})`}
                    </span>
                  </button>
                </div>

                {/* Status Messages */}
                {errorMsg && (
                  <div className="m-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300 text-sm flex items-center justify-between">
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
                  <div className="m-4 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-emerald-300 text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{successMsg}</span>
                    </div>
                    <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Tab Views Content */}
                <div className="flex-1 p-6 overflow-y-auto">
                  {!selectedCourse ? (
                    <div className="text-center py-12 text-slate-500">
                      {lang === 'ar'
                        ? 'اختر فصلاً دراسياً من القائمة الجانبية لعرض التفاصيل'
                        : 'Select a course from the sidebar to view details'}
                    </div>
                  ) : (
                    <>
                      {/* TAB 1: COURSE INFO */}
                      {activeTab === 'courses' && (
                        <div className="space-y-6">
                          <div className="p-6 bg-slate-950/80 border border-emerald-500/30 rounded-xl space-y-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="text-2xl font-bold text-emerald-400">{selectedCourse.name}</h3>
                                {selectedCourse.section && (
                                  <p className="text-sm text-slate-400 mt-1">{selectedCourse.section}</p>
                                )}
                              </div>
                              {selectedCourse.alternateLink && (
                                <a
                                  href={selectedCourse.alternateLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 text-xs text-emerald-400 hover:underline bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20"
                                >
                                  <span>{lang === 'ar' ? 'فتح في Google Classroom' : 'Open in Classroom'}</span>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>

                            {selectedCourse.descriptionHeading && (
                              <p className="text-slate-300 text-sm font-semibold">{selectedCourse.descriptionHeading}</p>
                            )}

                            {selectedCourse.description && (
                              <p className="text-slate-400 text-sm leading-relaxed">{selectedCourse.description}</p>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-800 text-xs">
                              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                                <span className="text-slate-500 block">{lang === 'ar' ? 'رمز الانضمام:' : 'Enrollment Code:'}</span>
                                <span className="font-mono font-bold text-emerald-400 text-sm">
                                  {selectedCourse.enrollmentCode || 'N/A'}
                                </span>
                              </div>
                              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                                <span className="text-slate-500 block">{lang === 'ar' ? 'حالة الفصل:' : 'State:'}</span>
                                <span className="font-semibold text-slate-300">
                                  {selectedCourse.courseState || 'ACTIVE'}
                                </span>
                              </div>
                              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                                <span className="text-slate-500 block">{lang === 'ar' ? 'عدد الواجبات:' : 'Assignments:'}</span>
                                <span className="font-semibold text-slate-300">{courseworkList.length}</span>
                              </div>
                              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                                <span className="text-slate-500 block">{lang === 'ar' ? 'إجمالي الأعضاء:' : 'Total Roster:'}</span>
                                <span className="font-semibold text-slate-300">
                                  {studentsList.length + teachersList.length}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TAB 2: ANNOUNCEMENTS */}
                      {activeTab === 'announcements' && (
                        <div className="space-y-6">
                          {/* Create Announcement Form */}
                          <div className="p-5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-4">
                            <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                              <Plus className="w-4 h-4 text-emerald-400" />
                              <span>{lang === 'ar' ? 'نشر إعلان / بلاغ تكتيكي جديد' : 'Post New Announcement / Tactical Bulletin'}</span>
                            </h4>

                            <textarea
                              value={announcementText}
                              onChange={(e) => setAnnouncementText(e.target.value)}
                              rows={4}
                              placeholder={
                                lang === 'ar'
                                  ? 'اكتب نص الإعلان التكتيكي أو التقرير هنا...'
                                  : 'Write tactical announcement or field report text here...'
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                            />

                            <div className="flex justify-end">
                              <button
                                onClick={requestPostAnnouncement}
                                disabled={isLoading || !announcementText.trim()}
                                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg text-sm font-medium shadow-md transition-all disabled:opacity-50"
                              >
                                <Send className="w-4 h-4" />
                                <span>{lang === 'ar' ? 'نشر الإعلان' : 'Post Announcement'}</span>
                              </button>
                            </div>
                          </div>

                          {/* Announcements Stream */}
                          <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-slate-400">
                              {lang === 'ar' ? 'سجل الإعلانات الميدانية' : 'Announcements Stream'}
                            </h4>

                            {announcementsList.length === 0 ? (
                              <div className="text-center py-8 text-slate-500 text-sm">
                                {lang === 'ar' ? 'لا يوجد إعلانات منشورة في هذا الفصل' : 'No announcements in this course'}
                              </div>
                            ) : (
                              announcementsList.map((ann) => (
                                <div key={ann.id} className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2">
                                  <p className="text-sm text-slate-200 whitespace-pre-wrap">{ann.text}</p>
                                  {ann.creationTime && (
                                    <div className="text-[11px] text-slate-500">
                                      {new Date(ann.creationTime).toLocaleString(lang === 'ar' ? 'ar-YE' : 'en-US')}
                                    </div>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}

                      {/* TAB 3: COURSEWORK */}
                      {activeTab === 'coursework' && (
                        <div className="space-y-6">
                          {/* Create Assignment Form */}
                          <div className="p-5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-4">
                            <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                              <Plus className="w-4 h-4 text-emerald-400" />
                              <span>{lang === 'ar' ? 'إنشاء واجب تكتيكي جديد' : 'Create New Tactical Assignment'}</span>
                            </h4>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="md:col-span-2">
                                <label className="text-xs text-slate-400 block mb-1">
                                  {lang === 'ar' ? 'عنوان الواجب:' : 'Title:'}
                                </label>
                                <input
                                  type="text"
                                  value={courseworkTitle}
                                  onChange={(e) => setCourseworkTitle(e.target.value)}
                                  placeholder={lang === 'ar' ? 'مثال: تقرير الاشتباك الميداني' : 'e.g., Tactical Field Debrief'}
                                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                                />
                              </div>

                              <div>
                                <label className="text-xs text-slate-400 block mb-1">
                                  {lang === 'ar' ? 'ألمجموع الأقصى للنقاط:' : 'Max Points:'}
                                </label>
                                <input
                                  type="number"
                                  value={courseworkMaxPoints}
                                  onChange={(e) => setCourseworkMaxPoints(Number(e.target.value))}
                                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-xs text-slate-400 block mb-1">
                                {lang === 'ar' ? 'الوصف والتعليمات:' : 'Instructions:'}
                              </label>
                              <textarea
                                value={courseworkDesc}
                                onChange={(e) => setCourseworkDesc(e.target.value)}
                                rows={3}
                                placeholder={lang === 'ar' ? 'اكتب تعليمات المهمة والتوجيهات...' : 'Write assignment details...'}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                              />
                            </div>

                            <div className="flex justify-end">
                              <button
                                onClick={requestPostCourseWork}
                                disabled={isLoading || !courseworkTitle.trim()}
                                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg text-sm font-medium shadow-md transition-all disabled:opacity-50"
                              >
                                <Plus className="w-4 h-4" />
                                <span>{lang === 'ar' ? 'إنشاء الواجب' : 'Create Assignment'}</span>
                              </button>
                            </div>
                          </div>

                          {/* Coursework List */}
                          <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-slate-400">
                              {lang === 'ar' ? 'قائمة الواجبات والمهمات التكتيكية' : 'Assignments List'}
                            </h4>

                            {courseworkList.length === 0 ? (
                              <div className="text-center py-8 text-slate-500 text-sm">
                                {lang === 'ar' ? 'لا يوجد واجبات دراسية منشورة حالياً' : 'No assignments found in this course'}
                              </div>
                            ) : (
                              courseworkList.map((cw) => (
                                <div key={cw.id} className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h5 className="font-bold text-sm text-emerald-300">{cw.title}</h5>
                                    <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700">
                                      {cw.maxPoints ? `${cw.maxPoints} pts` : 'Ungraded'}
                                    </span>
                                  </div>
                                  {cw.description && (
                                    <p className="text-xs text-slate-400 whitespace-pre-wrap">{cw.description}</p>
                                  )}
                                  <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                                    {cw.dueDate && (
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        <span>
                                          {cw.dueDate.year}-{cw.dueDate.month}-{cw.dueDate.day}
                                        </span>
                                      </span>
                                    )}
                                    {cw.alternateLink && (
                                      <a
                                        href={cw.alternateLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-emerald-400 hover:underline flex items-center gap-1"
                                      >
                                        <span>{lang === 'ar' ? 'عرض الواجب' : 'View Assignment'}</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}

                      {/* TAB 4: ROSTER */}
                      {activeTab === 'roster' && (
                        <div className="space-y-6">
                          {/* Teachers */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                              <Award className="w-4 h-4" />
                              <span>{lang === 'ar' ? 'المعلمون / قادة التدريب' : 'Teachers'}</span>
                            </h4>
                            {teachersList.length === 0 ? (
                              <p className="text-xs text-slate-500">{lang === 'ar' ? 'لا يوجد بيانات معلمين' : 'No teacher data available'}</p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {teachersList.map((teacher, idx) => (
                                  <div key={idx} className="flex items-center gap-3 p-3 bg-slate-950/80 border border-slate-800 rounded-lg">
                                    {teacher.profile?.photoUrl ? (
                                      <img src={teacher.profile.photoUrl} alt="Teacher" className="w-8 h-8 rounded-full" />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                                        T
                                      </div>
                                    )}
                                    <div className="text-xs">
                                      <div className="font-semibold text-slate-200">
                                        {teacher.profile?.name?.fullName || teacher.userId}
                                      </div>
                                      <div className="text-slate-400">{teacher.profile?.emailAddress}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Students */}
                          <div className="space-y-3 pt-4 border-t border-slate-800">
                            <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              <span>{lang === 'ar' ? 'الطلاب / عناصر الوحدة التكتيكية' : 'Students Roster'}</span>
                            </h4>
                            {studentsList.length === 0 ? (
                              <p className="text-xs text-slate-500">{lang === 'ar' ? 'لا يوجد طلاب مسجلون' : 'No students enrolled'}</p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {studentsList.map((student, idx) => (
                                  <div key={idx} className="flex items-center gap-3 p-3 bg-slate-950/80 border border-slate-800 rounded-lg">
                                    {student.profile?.photoUrl ? (
                                      <img src={student.profile.photoUrl} alt="Student" className="w-8 h-8 rounded-full" />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs">
                                        S
                                      </div>
                                    )}
                                    <div className="text-xs">
                                      <div className="font-semibold text-slate-200">
                                        {student.profile?.name?.fullName || student.userId}
                                      </div>
                                      <div className="text-slate-400">{student.profile?.emailAddress}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>{lang === 'ar' ? 'نظام Google Classroom التكتيكي المدمج' : 'Integrated Tactical Google Classroom'}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors"
          >
            {lang === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>

      {/* MANDATORY Explicit User Confirmation Modal for Mutating Workspace Actions */}
      {pendingConfirmAction && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-amber-500/50 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
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
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors shadow-md"
              >
                {lang === 'ar' ? 'تأكيد وإرسال' : 'Confirm & Proceed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
