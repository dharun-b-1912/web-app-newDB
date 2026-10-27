import React, { useState, useEffect, useMemo } from 'react';
import {
  lmsRealtimeService,
  LmsCourseItem,
  CourseTrackingStats,
  EmployeeEnrollmentRecord,
  QuizQuestion,
  extractYouTubeVideoId,
  resolveCurrentEmployeeId,
} from '../../../services/lms/lmsRealtimeService';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import {
  BookOpen,
  Play,
  CheckCircle2,
  Clock,
  Plus,
  Award,
  Users,
  Bell,
  Send,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  X,
  HelpCircle,
  Percent,
  Check,
  RefreshCw,
  RotateCcw,
  Filter,
  Edit3,
  Trash2,
} from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

interface CoursesViewProps {
  initialSubTab?: string;
}

export const CoursesView: React.FC<CoursesViewProps> = ({ initialSubTab }) => {
  const { showToast } = useToast();
  const [courses, setCourses] = useState<LmsCourseItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCourse, setSelectedCourse] = useState<LmsCourseItem | null>(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showPlayerModal, setShowPlayerModal] = useState<boolean>(false);
  const [showAssessmentModal, setShowAssessmentModal] = useState<boolean>(false);
  const [showTrackingDrawer, setShowTrackingDrawer] = useState<boolean>(false);

  // Tracking state & filter
  const [trackingStats, setTrackingStats] = useState<CourseTrackingStats | null>(null);
  const [loadingTracking, setLoadingTracking] = useState<boolean>(false);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  const [trackingFilter, setTrackingFilter] = useState<'ALL' | 'COMPLETED' | 'PENDING' | 'SCORED'>('ALL');

  // Filtered employee records based on active summary card
  const filteredTrackingRecords = useMemo(() => {
    if (!trackingStats) return [];
    if (trackingFilter === 'COMPLETED') {
      return trackingStats.records.filter((r) => r.status === 'COMPLETED');
    }
    if (trackingFilter === 'PENDING') {
      return trackingStats.records.filter(
        (r) => r.status === 'ENROLLED' || r.status === 'IN_PROGRESS' || r.status === 'FAILED'
      );
    }
    if (trackingFilter === 'SCORED') {
      return trackingStats.records.filter((r) => r.score !== null && r.score !== undefined);
    }
    return trackingStats.records;
  }, [trackingStats, trackingFilter]);

  // Video playback & anti-skip state
  const [watchProgress, setWatchProgress] = useState<number>(0);
  const [videoCompleted, setVideoCompleted] = useState<boolean>(false);
  const [resumeSeconds, setResumeSeconds] = useState<number>(0);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Listen to YouTube postMessage events for real-time position tracking
  useEffect(() => {
    if (!showPlayerModal || !selectedCourse) return;

    let latestSeconds = resumeSeconds;
    let latestPct = watchProgress;

    const handleMessage = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return;
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'infoDelivery' && data.info) {
          const current = Math.floor(data.info.currentTime || 0);
          const dur = Math.floor(data.info.duration || (selectedCourse.duration_minutes * 60) || 1);
          if (current > 0) {
            latestSeconds = current;
            const pct = dur > 0 ? Math.min(100, Math.floor((current / dur) * 100)) : 0;
            latestPct = pct;
            setWatchProgress((prev) => Math.max(prev, pct));
            if (pct >= 98) {
              setVideoCompleted(true);
            }
          }
        }
      } catch (_) {}
    };

    window.addEventListener('message', handleMessage);

    // Prompt iframe to stream events
    const interval = setInterval(() => {
      const iframe = document.getElementById('lms-youtube-player') as HTMLIFrameElement | null;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*');
      }
    }, 1000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(interval);

      // On modal close: persist progress to Supabase
      if (selectedCourse && latestPct > 0) {
        resolveCurrentEmployeeId().then((empId) => {
          if (empId) {
            lmsRealtimeService.updateWatchProgress(selectedCourse.id, empId, latestPct);
          }
        });
      }
    };
  }, [showPlayerModal, selectedCourse]);

  // Quiz state
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [quizResult, setQuizResult] = useState<{ passed: boolean; score: number } | null>(null);
  const [submittingQuiz, setSubmittingQuiz] = useState<boolean>(false);

  // Create Course form state
  const [formTitle, setFormTitle] = useState('');
  const [formYoutubeUrl, setFormYoutubeUrl] = useState('');
  const [formCategory, setFormCategory] = useState('Safety & Compliance');
  const [formDuration, setFormDuration] = useState(15);
  const [formMandatory, setFormMandatory] = useState(true);
  const [enableAssessment, setEnableAssessment] = useState(false);
  const [formPassing, setFormPassing] = useState(80);
  const [formPassingScore, setFormPassingScore] = useState<number>(1);
  const [formDescription, setFormDescription] = useState('');
  const [formQuestions, setFormQuestions] = useState<QuizQuestion[]>([]);
  const [creatingCourse, setCreatingCourse] = useState(false);

  // Edit Course Modal state
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingCourse, setEditingCourse] = useState<LmsCourseItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editYoutubeUrl, setEditYoutubeUrl] = useState('');
  const [editCategory, setEditCategory] = useState('Safety & Compliance');
  const [editDuration, setEditDuration] = useState(15);
  const [editMandatory, setEditMandatory] = useState(true);
  const [editEnableAssessment, setEditEnableAssessment] = useState(false);
  const [editPassing, setEditPassing] = useState(80);
  const [editPassingScore, setEditPassingScore] = useState<number>(1);
  const [editDescription, setEditDescription] = useState('');
  const [editQuestions, setEditQuestions] = useState<QuizQuestion[]>([]);
  const [updatingCourse, setUpdatingCourse] = useState(false);

  // Delete Course Modal state
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [deletingCourse, setDeletingCourse] = useState<LmsCourseItem | null>(null);
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const list = await lmsRealtimeService.fetchCourses();
      setCourses(list);
      if (list.length > 0 && !selectedCourse) {
        setSelectedCourse(list[0]);
      }
    } catch (err) {
      showToast('Error loading courses from Supabase');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const openTracking = async (course: LmsCourseItem) => {
    setSelectedCourse(course);
    setTrackingFilter('ALL');
    setShowTrackingDrawer(true);
    setLoadingTracking(true);
    try {
      const stats = await lmsRealtimeService.getCourseTracking(course.id);
      setTrackingStats(stats);
    } catch (e) {
      showToast('Failed to load tracking data');
    } finally {
      setLoadingTracking(false);
    }
  };

  const handleSendReminder = async (emp: EmployeeEnrollmentRecord) => {
    if (!selectedCourse) return;
    setSendingReminderId(emp.employee_id);
    try {
      const res = await lmsRealtimeService.sendMobileReminder(
        selectedCourse.id,
        emp.employee_id,
        selectedCourse.title
      );
      if (res.success) {
        showToast(`Mobile notification dispatched to ${emp.employee_name}`);
      } else {
        showToast(`Failed to send notification to ${emp.employee_name}`);
      }
    } catch (err) {
      showToast('Error sending mobile reminder');
    } finally {
      setSendingReminderId(null);
    }
  };

  const handleNudgeAllPending = async () => {
    if (!selectedCourse || !trackingStats) return;
    const pendingList = trackingStats.records.filter((r) => r.status === 'ENROLLED' || r.status === 'IN_PROGRESS');
    if (pendingList.length === 0) {
      showToast('No pending employees to nudge');
      return;
    }
    showToast(`Sending mobile reminders to ${pendingList.length} pending employees...`);
    for (const p of pendingList) {
      await lmsRealtimeService.sendMobileReminder(selectedCourse.id, p.employee_id, selectedCourse.title);
    }
    showToast(`Dispatched ${pendingList.length} mobile notifications successfully!`);
  };

  const handleLaunchPlayer = (course: LmsCourseItem) => {
    setSelectedCourse(course);

    // Resume position directly from Supabase course progress percentage
    const progress = course.progress_percentage || 0;
    const initialSec = (progress > 0 && course.duration_minutes > 0)
      ? Math.floor((progress / 100) * (course.duration_minutes * 60))
      : 0;

    setResumeSeconds(initialSec);
    setWatchProgress(progress);
    setVideoCompleted(progress >= 98);
    setQuizResult(null);
    setUserAnswers({});
    setShowPlayerModal(true);
  };

  const handleCreateCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formYoutubeUrl.trim()) {
      showToast('Please provide course title and YouTube video link');
      return;
    }
    const videoId = extractYouTubeVideoId(formYoutubeUrl);
    if (!videoId) {
      showToast('Invalid YouTube URL. Please enter a valid YouTube link');
      return;
    }

    setCreatingCourse(true);
    const questionsToSend = enableAssessment && formQuestions.length > 0 ? formQuestions : [];
    const passingNum = questionsToSend.length > 0 ? formPassingScore : undefined;
    const passingThreshold = questionsToSend.length > 0 ? Math.round((formPassingScore / questionsToSend.length) * 100) : 0;
    try {
      const created = await lmsRealtimeService.createCourse({
        title: formTitle,
        youtubeUrl: formYoutubeUrl,
        category: formCategory,
        durationMinutes: formDuration,
        isMandatory: formMandatory,
        passingPercentage: passingThreshold,
        passingScoreNumber: passingNum,
        description: formDescription,
        questions: questionsToSend,
      });

      showToast(
        questionsToSend.length > 0
          ? `Course "${created.title}" published with anti-skip video & quiz!`
          : `Course "${created.title}" published with anti-skip video!`
      );
      setShowCreateModal(false);
      // Reset form
      setFormTitle('');
      setFormYoutubeUrl('');
      setFormDescription('');
      setEnableAssessment(false);
      setFormQuestions([]);
      setFormPassingScore(1);
      loadCourses();
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Failed to create course'}`);
    } finally {
      setCreatingCourse(false);
    }
  };

  const handleOpenEditModal = (crs: LmsCourseItem) => {
    setEditingCourse(crs);
    setEditTitle(crs.title || '');
    setEditYoutubeUrl(crs.youtubeUrl || (crs.videoId ? `https://www.youtube.com/watch?v=${crs.videoId}` : ''));
    setEditCategory(crs.category || 'Safety & Compliance');
    setEditDuration(crs.duration_minutes || 15);
    setEditMandatory(crs.is_mandatory ?? true);
    setEditPassing(crs.passingPercentage || 80);
    setEditDescription(crs.description || '');
    const hasQuiz = Boolean(crs.questions && crs.questions.length > 0);
    const totalQ = (crs.questions && crs.questions.length) || 0;
    const initialPassingScore = crs.passingScoreNumber !== undefined
      ? crs.passingScoreNumber
      : (totalQ > 0 ? Math.max(1, Math.ceil(((crs.passingPercentage || 80) / 100) * totalQ)) : 1);
    setEditPassingScore(initialPassingScore);
    setEditEnableAssessment(hasQuiz);
    setEditQuestions(crs.questions ? JSON.parse(JSON.stringify(crs.questions)) : []);
    setShowEditModal(true);
  };

  const handleUpdateCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;
    if (!editTitle.trim() || !editYoutubeUrl.trim()) {
      showToast('Please provide course title and YouTube video link');
      return;
    }
    const videoId = extractYouTubeVideoId(editYoutubeUrl);
    if (!videoId) {
      showToast('Invalid YouTube URL. Please enter a valid YouTube link');
      return;
    }

    setUpdatingCourse(true);
    const questionsToSend = editEnableAssessment && editQuestions.length > 0 ? editQuestions : [];
    const passingNum = questionsToSend.length > 0 ? editPassingScore : undefined;
    const passingThreshold = questionsToSend.length > 0 ? Math.round((editPassingScore / questionsToSend.length) * 100) : 0;
    try {
      const updated = await lmsRealtimeService.updateCourse(editingCourse.id, {
        title: editTitle,
        youtubeUrl: editYoutubeUrl,
        category: editCategory,
        durationMinutes: editDuration,
        isMandatory: editMandatory,
        passingPercentage: passingThreshold,
        passingScoreNumber: passingNum,
        description: editDescription,
        questions: questionsToSend,
      });

      showToast(`Course "${updated.title}" updated successfully!`);
      setShowEditModal(false);
      setEditingCourse(null);
      loadCourses();
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Failed to update course'}`);
    } finally {
      setUpdatingCourse(false);
    }
  };

  const handleOpenDeleteModal = (crs: LmsCourseItem) => {
    setDeletingCourse(crs);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCourse) return;
    setIsDeletingCourse(true);
    try {
      await lmsRealtimeService.deleteCourse(deletingCourse.id);
      showToast(`Course "${deletingCourse.title}" deleted.`);
      setShowDeleteModal(false);
      setDeletingCourse(null);
      loadCourses();
    } catch (err: any) {
      showToast(`Error deleting course: ${err.message || 'Unknown error'}`);
    } finally {
      setIsDeletingCourse(false);
    }
  };

  const handleAnswerSelect = (qIdx: number, optIdx: number) => {
    setUserAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  const handleSubmitAssessment = async () => {
    if (!selectedCourse) return;
    const questions = selectedCourse.questions || [];
    if (questions.length === 0) {
      showToast('No assessment questions configured for this course');
      return;
    }

    if (Object.keys(userAnswers).length < questions.length) {
      showToast('Please answer all questions before submitting');
      return;
    }

    setSubmittingQuiz(true);
    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctIndex) {
        correctCount++;
      }
    });

    const scorePct = Math.round((correctCount / questions.length) * 100);
    const passThreshold = selectedCourse.passingPercentage || 80;
    const requiredScoreNumber = selectedCourse.passingScoreNumber !== undefined
      ? selectedCourse.passingScoreNumber
      : Math.max(1, Math.ceil((passThreshold / 100) * questions.length));

    // Get current user employee id directly via Supabase Auth
    const currentEmpId = (await resolveCurrentEmployeeId()) || '';

    try {
      const res = await lmsRealtimeService.submitAssessmentResult(
        selectedCourse.id,
        currentEmpId,
        scorePct,
        passThreshold,
        undefined,
        {
          correctAnswers: correctCount,
          totalQuestions: questions.length,
          passingScoreNumber: requiredScoreNumber,
        }
      );
      setQuizResult(res);
      if (res.passed) {
        showToast(`Congratulations! You passed with ${correctCount}/${questions.length} correct (${scorePct}%)`);
        loadCourses();
      } else {
        showToast(`Assessment failed (${correctCount}/${questions.length} correct). Required: at least ${requiredScoreNumber} correct.`);
      }
    } catch (e) {
      showToast('Error recording assessment result');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Ribbon */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#07563D] flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-gray-900">Corporate Training & LMS Catalog</h2>
            <p className="text-xs text-gray-500">
              YouTube video integration with anti-skip verification, pass/fail assessments, and employee tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            onClick={loadCourses}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setShowCreateModal(true)}
            className="bg-[#07563D] hover:bg-[#064e37] text-white"
          >
            Add YouTube Course
          </Button>
        </div>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 bg-gray-100 rounded-2xl border border-gray-200"></div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-emerald-50 text-[#07563D] rounded-full flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-gray-900">No LMS Courses Published Yet</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Paste a YouTube video link to create your first company training course. Employees can watch it on both Web
            and Mobile apps.
          </p>
          <Button size="sm" onClick={() => setShowCreateModal(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Create First Course
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {courses.map((crs) => (
            <div
              key={crs.id}
              className="bg-white rounded-2xl border border-gray-200/80 hover:border-[#07563D]/40 transition-all shadow-xs hover:shadow-md flex flex-col overflow-hidden group"
            >
              {/* Video Thumbnail */}
              <div className="relative aspect-video bg-gray-900 overflow-hidden cursor-pointer" onClick={() => handleLaunchPlayer(crs)}>
                {crs.thumbnailUrl ? (
                  <img
                    src={crs.thumbnailUrl}
                    alt={crs.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-500">
                    <Play className="w-10 h-10" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-[#07563D]/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 ml-0.5" />
                  </div>
                </div>
                {crs.is_mandatory && (
                  <div className="absolute top-3 left-3 bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
                    Mandatory
                  </div>
                )}

                {/* Quick Edit & Delete Action Buttons on Thumbnail */}
                <div
                  className="absolute top-3 right-3 flex items-center gap-1.5 z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    title="Edit Course"
                    onClick={() => handleOpenEditModal(crs)}
                    className="w-7 h-7 rounded-full bg-black/60 hover:bg-[#07563D] text-white backdrop-blur-xs flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Delete Course"
                    onClick={() => handleOpenDeleteModal(crs)}
                    className="w-7 h-7 rounded-full bg-black/60 hover:bg-rose-600 text-white backdrop-blur-xs flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-xs text-white text-[11px] font-mono px-2 py-0.5 rounded">
                  {crs.duration_minutes} Mins
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-[#07563D] font-bold bg-emerald-50 px-2 py-0.5 rounded">
                      {crs.category}
                    </span>
                    {crs.questions && crs.questions.length > 0 ? (
                      <span className="text-purple-700 bg-purple-50 font-bold px-1.5 py-0.5 rounded text-[10px]">
                        Quiz ({crs.questions.length} Qs) • Need {crs.passingScoreNumber || Math.ceil((crs.passingPercentage / 100) * crs.questions.length)} to pass
                      </span>
                    ) : (
                      <span className="text-emerald-700 bg-emerald-50 font-bold px-1.5 py-0.5 rounded text-[10px]">
                        Video Only
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-extrabold text-gray-900 line-clamp-1">{crs.title}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {crs.description || (crs.questions && crs.questions.length > 0
                      ? 'Watch the training module and take the assessment to complete verification.'
                      : 'Watch the complete video module to complete training verification.')}
                  </p>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<Users className="w-3.5 h-3.5" />}
                    onClick={() => openTracking(crs)}
                    className="text-xs"
                  >
                    Track Progress
                  </Button>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      title="Edit Course Details"
                      onClick={() => handleOpenEditModal(crs)}
                      className="w-8 h-8 rounded-xl border border-gray-200 hover:border-[#07563D]/40 text-gray-500 hover:text-[#07563D] hover:bg-emerald-50/50 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Delete Course"
                      onClick={() => handleOpenDeleteModal(crs)}
                      className="w-8 h-8 rounded-xl border border-gray-200 hover:border-rose-300 text-gray-500 hover:text-rose-600 hover:bg-rose-50/50 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <Button
                      size="sm"
                      leftIcon={<Play className="w-3.5 h-3.5" />}
                      onClick={() => handleLaunchPlayer(crs)}
                      className="bg-[#07563D] hover:bg-[#064e37] text-white text-xs"
                    >
                      {crs.questions && crs.questions.length > 0 ? 'Watch & Test' : 'Watch Video'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          1. CREATE COURSE MODAL (YouTube URL + Assessment Constraint)
         ───────────────────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-lg font-black text-gray-900">Publish YouTube Training Course</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  The video will immediately appear on both Employee Self Service Web and Mobile apps
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCourseSubmit} className="space-y-4">
              {/* YouTube Link */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  YouTube Video Link <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                  value={formYoutubeUrl}
                  onChange={(e) => setFormYoutubeUrl(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-[#07563D] focus:border-[#07563D] outline-none"
                />
                {extractYouTubeVideoId(formYoutubeUrl) && (
                  <div className="mt-2 flex items-center gap-3 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                    <img
                      src={`https://img.youtube.com/vi/${extractYouTubeVideoId(formYoutubeUrl)}/hqdefault.jpg`}
                      alt="Preview"
                      className="w-16 h-10 object-cover rounded-lg shadow-xs"
                    />
                    <div className="text-[11px] text-emerald-900">
                      <span className="font-bold">Detected Video ID:</span> {extractYouTubeVideoId(formYoutubeUrl)}
                      <span className="block text-emerald-700 font-medium">Valid YouTube link connected</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Course Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Information Security & Phishing Awareness 2026"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-[#07563D] focus:border-[#07563D] outline-none"
                />
              </div>

              {/* Category, Duration, Passing Threshold */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-[#07563D] outline-none"
                  >
                    <option value="Safety & Compliance">Safety & Compliance</option>
                    <option value="POSH & Conduct">POSH & Conduct</option>
                    <option value="Information Security">Information Security</option>
                    <option value="Technical Skills">Technical Skills</option>
                    <option value="Leadership & Culture">Leadership & Culture</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    min="1"
                    max="600"
                    value={formDuration}
                    onChange={(e) => setFormDuration(parseInt(e.target.value, 10) || 15)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-[#07563D] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Pass Score (Correct Answers)
                    {!enableAssessment ? (
                      <span className="text-gray-400 font-normal ml-1">(No Quiz)</span>
                    ) : (
                      <span className="text-[#07563D] font-normal ml-1">
                        (out of {formQuestions.length} Qs)
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max={Math.max(1, formQuestions.length)}
                      disabled={!enableAssessment}
                      value={enableAssessment ? formPassingScore : 0}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 1;
                        const capped = Math.min(Math.max(1, formQuestions.length), Math.max(1, val));
                        setFormPassingScore(capped);
                        setFormPassing(Math.round((capped / Math.max(1, formQuestions.length)) * 100));
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:ring-2 focus:ring-[#07563D] outline-none pr-12 font-bold ${
                        !enableAssessment ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'border-gray-300 text-gray-900'
                      }`}
                    />
                    <span className="text-[11px] font-bold text-gray-400 absolute right-3 top-3">
                      / {enableAssessment ? formQuestions.length : 0}
                    </span>
                  </div>
                  {enableAssessment && (
                    <p className="text-[10px] text-emerald-700 font-medium mt-1">
                      Must get at least <strong>{formPassingScore} of {formQuestions.length}</strong> correct ({Math.round((formPassingScore / Math.max(1, formQuestions.length)) * 100)}%) to pass.
                    </p>
                  )}
                </div>
              </div>

              {/* Mandatory Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-mandatory"
                  checked={formMandatory}
                  onChange={(e) => setFormMandatory(e.target.checked)}
                  className="rounded text-[#07563D] focus:ring-[#07563D]"
                />
                <label htmlFor="chk-mandatory" className="text-xs font-semibold text-gray-700 cursor-pointer">
                  Mandatory Training (auto-assigned to all enterprise staff)
                </label>
              </div>

              {/* Optional Assessment Quiz Toggle & Builder */}
              <div className="pt-3 border-t border-gray-200 space-y-3">
                <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100/70 text-[#07563D] flex items-center justify-center font-bold">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-800">Attach Quiz Assessment</span>
                        <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded uppercase">Optional</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {enableAssessment
                          ? `Quiz enabled (${formQuestions.length} Questions). Employees must answer at least ${formPassingScore} of ${formQuestions.length} correctly to pass.`
                          : 'No quiz required. Employees complete the course immediately upon watching the video.'}
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    id="chk-assessment"
                    checked={enableAssessment}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setEnableAssessment(checked);
                      if (checked && formQuestions.length === 0) {
                        setFormQuestions([
                          {
                            id: 'q1',
                            question: '',
                            options: ['Option A', 'Option B', 'Option C', 'Option D'],
                            correctIndex: 0,
                          },
                        ]);
                        setFormPassingScore(1);
                      }
                    }}
                    className="w-4 h-4 rounded text-[#07563D] focus:ring-[#07563D] cursor-pointer"
                  />
                </div>

                {enableAssessment && (
                  <div className="p-3.5 bg-emerald-50/40 rounded-2xl border border-emerald-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#07563D] uppercase tracking-wider">
                        Quiz Questions ({formQuestions.length})
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setFormQuestions((prev) => {
                            const updated = [
                              ...prev,
                              {
                                id: `q${prev.length + 1}`,
                                question: `Question ${prev.length + 1}`,
                                options: ['Option A', 'Option B', 'Option C', 'Option D'],
                                correctIndex: 0,
                              },
                            ];
                            return updated;
                          })
                        }
                      >
                        + Add Question
                      </Button>
                    </div>

                    <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                      {formQuestions.map((q, qIdx) => (
                        <div key={q.id} className="p-3 bg-white rounded-xl border border-gray-200 text-xs space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono font-bold text-[#07563D]">Q{qIdx + 1}</span>
                            <input
                              type="text"
                              value={q.question}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFormQuestions((prev) =>
                                  prev.map((item, i) => (i === qIdx ? { ...item, question: val } : item))
                                );
                              }}
                              placeholder="Enter question text..."
                              className="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs bg-white"
                            />
                            {formQuestions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFormQuestions((prev) => {
                                    const updated = prev.filter((_, i) => i !== qIdx);
                                    setFormPassingScore((curr) => Math.min(Math.max(1, curr), Math.max(1, updated.length)));
                                    return updated;
                                  });
                                }}
                                className="text-rose-500 hover:text-rose-700"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2 pl-6">
                            {q.options.map((opt, optIdx) => (
                              <div key={optIdx} className="flex items-center gap-1.5">
                                <input
                                  type="radio"
                                  name={`correct-${q.id}`}
                                  checked={q.correctIndex === optIdx}
                                  onChange={() =>
                                    setFormQuestions((prev) =>
                                      prev.map((item, i) => (i === qIdx ? { ...item, correctIndex: optIdx } : item))
                                    )
                                  }
                                  title="Mark as correct answer"
                                  className="text-[#07563D] focus:ring-[#07563D]"
                                />
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setFormQuestions((prev) =>
                                      prev.map((item, i) =>
                                        i === qIdx
                                          ? {
                                              ...item,
                                              options: item.options.map((o, oi) => (oi === optIdx ? val : o)),
                                            }
                                          : item
                                      )
                                    );
                                  }}
                                  className="w-full px-2 py-1 rounded border border-gray-200 text-[11px] bg-white"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creatingCourse}
                  className="bg-[#07563D] hover:bg-[#064e37] text-white"
                >
                  {creatingCourse ? 'Publishing Course...' : 'Publish Course'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          1b. EDIT COURSE MODAL (Edit Video URL, Assessment & Details)
         ───────────────────────────────────────────────────────────── */}
      {showEditModal && editingCourse && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-lg font-black text-gray-900">Edit Training Course</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Update course video, content, mandatory settings, or attached quiz
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCourseSubmit} className="space-y-4">
              {/* YouTube Link */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  YouTube Video Link <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                  value={editYoutubeUrl}
                  onChange={(e) => setEditYoutubeUrl(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-[#07563D] focus:border-[#07563D] outline-none"
                />
                {extractYouTubeVideoId(editYoutubeUrl) && (
                  <div className="mt-2 flex items-center gap-3 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                    <img
                      src={`https://img.youtube.com/vi/${extractYouTubeVideoId(editYoutubeUrl)}/hqdefault.jpg`}
                      alt="Preview"
                      className="w-16 h-10 object-cover rounded-lg shadow-xs"
                    />
                    <div className="text-[11px] text-emerald-900">
                      <span className="font-bold">Detected Video ID:</span> {extractYouTubeVideoId(editYoutubeUrl)}
                      <span className="block text-emerald-700 font-medium">Valid YouTube link connected</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Course Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-[#07563D] focus:border-[#07563D] outline-none"
                />
              </div>

              {/* Category, Duration, Passing Threshold */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-[#07563D] outline-none"
                  >
                    <option value="Safety & Compliance">Safety & Compliance</option>
                    <option value="POSH & Conduct">POSH & Conduct</option>
                    <option value="Information Security">Information Security</option>
                    <option value="Technical Skills">Technical Skills</option>
                    <option value="Leadership & Culture">Leadership & Culture</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    min="1"
                    max="600"
                    value={editDuration}
                    onChange={(e) => setEditDuration(parseInt(e.target.value, 10) || 15)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-[#07563D] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Pass Score (Correct Answers)
                    {!editEnableAssessment ? (
                      <span className="text-gray-400 font-normal ml-1">(No Quiz)</span>
                    ) : (
                      <span className="text-[#07563D] font-normal ml-1">
                        (out of {editQuestions.length} Qs)
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max={Math.max(1, editQuestions.length)}
                      disabled={!editEnableAssessment}
                      value={editEnableAssessment ? editPassingScore : 0}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 1;
                        const capped = Math.min(Math.max(1, editQuestions.length), Math.max(1, val));
                        setEditPassingScore(capped);
                        setEditPassing(Math.round((capped / Math.max(1, editQuestions.length)) * 100));
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:ring-2 focus:ring-[#07563D] outline-none pr-12 font-bold ${
                        !editEnableAssessment ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'border-gray-300 text-gray-900'
                      }`}
                    />
                    <span className="text-[11px] font-bold text-gray-400 absolute right-3 top-3">
                      / {editEnableAssessment ? editQuestions.length : 0}
                    </span>
                  </div>
                  {editEnableAssessment && (
                    <p className="text-[10px] text-emerald-700 font-medium mt-1">
                      Must get at least <strong>{editPassingScore} of {editQuestions.length}</strong> correct ({Math.round((editPassingScore / Math.max(1, editQuestions.length)) * 100)}%) to pass.
                    </p>
                  )}
                </div>
              </div>

              {/* Mandatory Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-edit-mandatory"
                  checked={editMandatory}
                  onChange={(e) => setEditMandatory(e.target.checked)}
                  className="rounded text-[#07563D] focus:ring-[#07563D]"
                />
                <label htmlFor="chk-edit-mandatory" className="text-xs font-semibold text-gray-700 cursor-pointer">
                  Mandatory Training (auto-assigned to all enterprise staff)
                </label>
              </div>

              {/* Course Description */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Description / Instructions</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Optional brief description of the course module..."
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-[#07563D] outline-none resize-none"
                />
              </div>

              {/* Quiz Assessment Toggle & Builder */}
              <div className="pt-3 border-t border-gray-200 space-y-3">
                <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100/70 text-[#07563D] flex items-center justify-center font-bold">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-800">Attach Quiz Assessment</span>
                        <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded uppercase">Optional</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {editEnableAssessment
                          ? `Quiz enabled (${editQuestions.length} Questions). Employees must answer at least ${editPassingScore} of ${editQuestions.length} correctly to pass.`
                          : 'No quiz required. Employees complete the course upon watching video.'}
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    id="chk-edit-assessment"
                    checked={editEnableAssessment}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setEditEnableAssessment(checked);
                      if (checked && editQuestions.length === 0) {
                        setEditQuestions([
                          {
                            id: 'q1',
                            question: '',
                            options: ['Option A', 'Option B', 'Option C', 'Option D'],
                            correctIndex: 0,
                          },
                        ]);
                        setEditPassingScore(1);
                      }
                    }}
                    className="w-4 h-4 rounded text-[#07563D] focus:ring-[#07563D] cursor-pointer"
                  />
                </div>

                {editEnableAssessment && (
                  <div className="p-3.5 bg-emerald-50/40 rounded-2xl border border-emerald-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#07563D] uppercase tracking-wider">
                        Quiz Questions ({editQuestions.length})
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setEditQuestions((prev) => {
                            const updated = [
                              ...prev,
                              {
                                id: `q${prev.length + 1}`,
                                question: `Question ${prev.length + 1}`,
                                options: ['Option A', 'Option B', 'Option C', 'Option D'],
                                correctIndex: 0,
                              },
                            ];
                            return updated;
                          })
                        }
                      >
                        + Add Question
                      </Button>
                    </div>

                    <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                      {editQuestions.map((q, qIdx) => (
                        <div key={q.id || qIdx} className="p-3 bg-white rounded-xl border border-gray-200 text-xs space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono font-bold text-[#07563D]">Q{qIdx + 1}</span>
                            <input
                              type="text"
                              value={q.question}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditQuestions((prev) =>
                                  prev.map((item, i) => (i === qIdx ? { ...item, question: val } : item))
                                );
                              }}
                              placeholder="Enter question text..."
                              className="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs bg-white"
                            />
                            {editQuestions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditQuestions((prev) => {
                                    const updated = prev.filter((_, i) => i !== qIdx);
                                    setEditPassingScore((curr) => Math.min(Math.max(1, curr), Math.max(1, updated.length)));
                                    return updated;
                                  });
                                }}
                                className="text-rose-500 hover:text-rose-700 cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2 pl-6">
                            {q.options.map((opt, optIdx) => (
                              <div key={optIdx} className="flex items-center gap-1.5">
                                <input
                                  type="radio"
                                  name={`edit-correct-${q.id || qIdx}`}
                                  checked={q.correctIndex === optIdx}
                                  onChange={() =>
                                    setEditQuestions((prev) =>
                                      prev.map((item, i) => (i === qIdx ? { ...item, correctIndex: optIdx } : item))
                                    )
                                  }
                                  title="Mark as correct answer"
                                  className="text-[#07563D] focus:ring-[#07563D] cursor-pointer"
                                />
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setEditQuestions((prev) =>
                                      prev.map((item, i) =>
                                        i === qIdx
                                          ? {
                                              ...item,
                                              options: item.options.map((o, oi) => (oi === optIdx ? val : o)),
                                            }
                                          : item
                                      )
                                    );
                                  }}
                                  className="w-full px-2 py-1 rounded border border-gray-200 text-[11px] bg-white"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updatingCourse}
                  className="bg-[#07563D] hover:bg-[#064e37] text-white"
                >
                  {updatingCourse ? 'Saving Changes...' : 'Save Course Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          1c. DELETE COURSE CONFIRMATION MODAL
         ───────────────────────────────────────────────────────────── */}
      {showDeleteModal && deletingCourse && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900">Delete Training Course</h3>
                <p className="text-xs text-gray-500">This action cannot be undone</p>
              </div>
            </div>

            <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 flex items-center gap-3">
              {deletingCourse.thumbnailUrl && (
                <img
                  src={deletingCourse.thumbnailUrl}
                  alt={deletingCourse.title}
                  className="w-16 h-11 object-cover rounded-xl shadow-xs shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-mono font-bold text-[#07563D] uppercase bg-emerald-50 px-1.5 py-0.5 rounded">
                  {deletingCourse.category}
                </span>
                <h4 className="text-xs font-bold text-gray-900 truncate mt-1">{deletingCourse.title}</h4>
                <p className="text-[10px] text-gray-400 font-mono">
                  {deletingCourse.duration_minutes} Mins • {deletingCourse.is_mandatory ? 'Mandatory' : 'Optional'}
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Are you sure you want to delete <strong className="text-gray-900 font-bold">"{deletingCourse.title}"</strong>? It will be removed immediately from the LMS catalog and tracking dashboard.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setShowDeleteModal(false)} disabled={isDeletingCourse}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeletingCourse}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {isDeletingCourse ? 'Deleting Course...' : 'Delete Course'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. ANTI-SKIP YOUTUBE PLAYER & ASSESSMENT LAUNCHER
         ───────────────────────────────────────────────────────────── */}
      {showPlayerModal && selectedCourse && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-4 my-8 animate-in fade-in">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#07563D] uppercase bg-emerald-50 px-2 py-0.5 rounded">
                  {selectedCourse.category} • Anti-Skip Protected
                </span>
                <h3 className="text-lg font-black text-gray-900 mt-1">{selectedCourse.title}</h3>
              </div>
              <button
                onClick={() => setShowPlayerModal(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Embedded YouTube Player with Resumption */}
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black shadow-lg">
              {selectedCourse.videoId ? (
                <iframe
                  id="lms-youtube-player"
                  key={`${selectedCourse.id}-${resumeSeconds}`}
                  src={`https://www.youtube.com/embed/${selectedCourse.videoId}?enablejsapi=1&rel=0&modestbranding=1&autoplay=1${
                    resumeSeconds > 0 ? `&start=${resumeSeconds}` : ''
                  }`}
                  title={selectedCourse.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  Video ID not detected
                </div>
              )}
            </div>

            {/* Resume Notification Banner */}
            {resumeSeconds > 0 && (
              <div className="flex items-center justify-between px-3.5 py-2 bg-emerald-50 rounded-xl border border-emerald-200 text-xs animate-in fade-in">
                <div className="flex items-center gap-2 text-[#07563D] font-bold">
                  <RotateCcw className="w-4 h-4 text-[#07563D]" />
                  <span>Resumed playback from {formatSeconds(resumeSeconds)} ({watchProgress}% completed)</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setResumeSeconds(0);
                    setWatchProgress(0);
                  }}
                  className="text-[11px] font-semibold text-gray-500 hover:text-gray-900 underline"
                >
                  Restart from 0:00
                </button>
              </div>
            )}

            {/* Watch Progress & Anti-Skip Banner */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1 w-full md:w-auto">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
                  <Clock className="w-4 h-4 text-[#07563D]" />
                  <span>Anti-Skip Tracking Active</span>
                  <span className="text-emerald-700 font-mono">({watchProgress}% completed)</span>
                </div>
                <p className="text-[11px] text-gray-500">
                  {selectedCourse.questions && selectedCourse.questions.length > 0
                    ? `You must watch the complete video to unlock the assessment. Required pass constraint: ${selectedCourse.passingPercentage}%.`
                    : 'Watch the complete video to finish this training. No assessment quiz is required for this course.'}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {!videoCompleted ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setWatchProgress(100);
                      setVideoCompleted(true);
                      showToast(
                        selectedCourse.questions && selectedCourse.questions.length > 0
                          ? 'Video watching verified (100%). Assessment unlocked!'
                          : 'Video watching verified (100%). Ready to complete!'
                      );
                    }}
                    className="border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs"
                  >
                    Verify Complete Watch
                  </Button>
                ) : selectedCourse.questions && selectedCourse.questions.length > 0 ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      setShowPlayerModal(false);
                      setShowAssessmentModal(true);
                    }}
                    className="bg-[#07563D] hover:bg-[#064e37] text-white shadow-md text-xs font-bold"
                  >
                    Take Assessment Now
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={async () => {
                      const empId = (await resolveCurrentEmployeeId()) || '';
                      await lmsRealtimeService.markCourseCompleted(selectedCourse.id, empId);
                      showToast('Training completed successfully! (No quiz required)');
                      setShowPlayerModal(false);
                      loadCourses();
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md text-xs font-bold flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Complete Training
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. ASSESSMENT MODAL (Pass/Fail Evaluation)
         ───────────────────────────────────────────────────────────── */}
      {showAssessmentModal && selectedCourse && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 my-8 animate-in fade-in">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#07563D] uppercase bg-emerald-50 px-2 py-0.5 rounded">
                  Compliance Assessment
                </span>
                <h3 className="text-lg font-black text-gray-900 mt-1">{selectedCourse.title}</h3>
                <p className="text-xs text-gray-500">
                  Passing constraint: Must answer at least{' '}
                  <strong>
                    {selectedCourse.passingScoreNumber || Math.ceil((selectedCourse.passingPercentage / 100) * (selectedCourse.questions?.length || 1))} of{' '}
                    {selectedCourse.questions?.length || 0}
                  </strong>{' '}
                  questions correctly ({selectedCourse.passingPercentage}%)
                </p>
              </div>
              <button
                onClick={() => setShowAssessmentModal(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Questions List */}
            {(!selectedCourse.questions || selectedCourse.questions.length === 0) ? (
              <div className="p-8 text-center text-xs text-gray-500">
                No assessment questions configured for this course.
              </div>
            ) : (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {selectedCourse.questions.map((q, idx) => (
                  <div key={q.id || idx} className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#07563D] text-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <h4 className="text-xs font-bold text-gray-900 leading-snug">{q.question}</h4>
                    </div>

                    <div className="space-y-2 pl-7">
                      {q.options.map((opt, optIdx) => {
                        const isSelected = userAnswers[idx] === optIdx;
                        return (
                          <div
                            key={optIdx}
                            onClick={() => handleAnswerSelect(idx, optIdx)}
                            className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                              isSelected
                                ? 'bg-emerald-50 border-[#07563D] text-[#07563D] font-bold ring-1 ring-[#07563D]'
                                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            <span>{opt}</span>
                            {isSelected && <Check className="w-4 h-4 text-[#07563D]" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Result Display */}
            {quizResult && (
              <div
                className={`p-4 rounded-2xl border flex items-center gap-3 ${
                  quizResult.passed
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}
              >
                {quizResult.passed ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-8 h-8 text-rose-600 shrink-0" />
                )}
                <div>
                  <h4 className="text-sm font-black">
                    {quizResult.passed ? 'PASSED — CONGRATULATIONS!' : 'FAILED — PASS SCORE NOT MET'}
                  </h4>
                  <p className="text-xs mt-0.5">
                    Your Score: <strong>{quizResult.score}%</strong>. Required:{' '}
                    <strong>
                      {selectedCourse.passingScoreNumber || Math.ceil((selectedCourse.passingPercentage / 100) * (selectedCourse.questions?.length || 1))} of{' '}
                      {selectedCourse.questions?.length || 0}
                    </strong>{' '}
                    correct.
                    {!quizResult.passed && ' Course remains incomplete until you re-attempt and pass.'}
                  </p>
                </div>
              </div>
            )}

            {/* Assessment Footer */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setShowAssessmentModal(false)}>
                Close
              </Button>
              <Button
                disabled={submittingQuiz}
                onClick={handleSubmitAssessment}
                className="bg-[#07563D] hover:bg-[#064e37] text-white"
              >
                {submittingQuiz ? 'Evaluating...' : 'Submit Answers & Evaluate'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. LIVE TRACKING DRAWER (HR Head & Manager Monitoring + Mobile Push)
         ───────────────────────────────────────────────────────────── */}
      {showTrackingDrawer && selectedCourse && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-3xl h-full shadow-2xl flex flex-col p-6 space-y-6 overflow-hidden animate-in slide-in-from-right">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#07563D] uppercase bg-emerald-50 px-2 py-0.5 rounded">
                  HR Head & Reporting Manager Tracking Console
                </span>
                <h3 className="text-lg font-black text-gray-900 mt-1">{selectedCourse.title}</h3>
              </div>
              <button
                onClick={() => setShowTrackingDrawer(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* KPI Cards (Interactive Filters) */}
            {trackingStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
                {/* Total Assigned Card */}
                <button
                  type="button"
                  onClick={() => setTrackingFilter('ALL')}
                  className={`text-left p-3 rounded-2xl border transition-all duration-150 cursor-pointer select-none active:scale-[0.98] ${
                    trackingFilter === 'ALL'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/30'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-900 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider ${
                        trackingFilter === 'ALL' ? 'text-slate-300' : 'text-gray-500'
                      }`}
                    >
                      Total Assigned
                    </span>
                    {trackingFilter === 'ALL' ? (
                      <span className="text-[9px] font-bold bg-white/20 text-white px-1.5 py-0.5 rounded-full">
                        All
                      </span>
                    ) : (
                      <span className="text-[9px] text-gray-400">Filter</span>
                    )}
                  </div>
                  <span
                    className={`text-xl font-black font-mono block ${
                      trackingFilter === 'ALL' ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {trackingStats.totalAssigned}
                  </span>
                </button>

                {/* Completed Card */}
                <button
                  type="button"
                  onClick={() => setTrackingFilter((prev) => (prev === 'COMPLETED' ? 'ALL' : 'COMPLETED'))}
                  className={`text-left p-3 rounded-2xl border transition-all duration-150 cursor-pointer select-none active:scale-[0.98] ${
                    trackingFilter === 'COMPLETED'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/30'
                      : 'bg-emerald-50/70 hover:bg-emerald-50 text-emerald-950 border-emerald-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider ${
                        trackingFilter === 'COMPLETED' ? 'text-emerald-100' : 'text-emerald-700'
                      }`}
                    >
                      Completed
                    </span>
                    {trackingFilter === 'COMPLETED' ? (
                      <span className="text-[9px] font-bold bg-white/25 text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5" /> Filtered
                      </span>
                    ) : (
                      <span className="text-[9px] text-emerald-600 font-medium">Filter</span>
                    )}
                  </div>
                  <span
                    className={`text-xl font-black font-mono block ${
                      trackingFilter === 'COMPLETED' ? 'text-white' : 'text-emerald-800'
                    }`}
                  >
                    {trackingStats.completedCount}
                  </span>
                </button>

                {/* Pending / Watching Card */}
                <button
                  type="button"
                  onClick={() => setTrackingFilter((prev) => (prev === 'PENDING' ? 'ALL' : 'PENDING'))}
                  className={`text-left p-3 rounded-2xl border transition-all duration-150 cursor-pointer select-none active:scale-[0.98] ${
                    trackingFilter === 'PENDING'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-500/30'
                      : 'bg-amber-50/70 hover:bg-amber-50 text-amber-950 border-amber-200 hover:border-amber-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider ${
                        trackingFilter === 'PENDING' ? 'text-amber-100' : 'text-amber-700'
                      }`}
                    >
                      Pending / Watching
                    </span>
                    {trackingFilter === 'PENDING' ? (
                      <span className="text-[9px] font-bold bg-white/25 text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5" /> Filtered
                      </span>
                    ) : (
                      <span className="text-[9px] text-amber-600 font-medium">Filter</span>
                    )}
                  </div>
                  <span
                    className={`text-xl font-black font-mono block ${
                      trackingFilter === 'PENDING' ? 'text-white' : 'text-amber-900'
                    }`}
                  >
                    {trackingStats.pendingCount + trackingStats.inProgressCount}
                  </span>
                </button>

                {/* Average Score Card */}
                <button
                  type="button"
                  onClick={() => setTrackingFilter((prev) => (prev === 'SCORED' ? 'ALL' : 'SCORED'))}
                  className={`text-left p-3 rounded-2xl border transition-all duration-150 cursor-pointer select-none active:scale-[0.98] ${
                    trackingFilter === 'SCORED'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-500/30'
                      : 'bg-indigo-50/70 hover:bg-indigo-50 text-indigo-950 border-indigo-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider ${
                        trackingFilter === 'SCORED' ? 'text-indigo-100' : 'text-indigo-700'
                      }`}
                    >
                      Average Score
                    </span>
                    {trackingFilter === 'SCORED' ? (
                      <span className="text-[9px] font-bold bg-white/25 text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5" /> Scored
                      </span>
                    ) : (
                      <span className="text-[9px] text-indigo-600 font-medium">Filter</span>
                    )}
                  </div>
                  <span
                    className={`text-xl font-black font-mono block ${
                      trackingFilter === 'SCORED' ? 'text-white' : 'text-indigo-900'
                    }`}
                  >
                    {trackingStats.averageScore}%
                  </span>
                </button>
              </div>
            )}

            {/* Active Filter Bar */}
            {trackingFilter !== 'ALL' && trackingStats && (
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs shrink-0">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-gray-700">
                    Filtered by{' '}
                    <strong className="text-gray-900 font-bold">
                      {trackingFilter === 'COMPLETED'
                        ? 'Completed Employees'
                        : trackingFilter === 'PENDING'
                        ? 'Pending & Watching Employees'
                        : 'Assessed / Scored Employees'}
                    </strong>{' '}
                    <span className="text-gray-500 font-mono">
                      ({filteredTrackingRecords.length} of {trackingStats.totalAssigned})
                    </span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setTrackingFilter('ALL')}
                  className="text-xs text-[#07563D] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Clear Filter
                </button>
              </div>
            )}

            {/* Bulk Reminder Action */}
            <div className="flex items-center justify-between bg-amber-50/60 p-3 rounded-2xl border border-amber-200/80">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-amber-900">
                  Send Mobile Push Reminder to Pending Employees
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Send className="w-3.5 h-3.5 text-amber-700" />}
                onClick={handleNudgeAllPending}
                className="bg-white border-amber-300 text-amber-900 hover:bg-amber-100 text-xs font-bold"
              >
                Nudge All Pending
              </Button>
            </div>

            {/* Employee List Table */}
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-2xl">
              {loadingTracking ? (
                <div className="p-8 text-center text-xs text-gray-400">Loading live employee progress...</div>
              ) : !trackingStats || trackingStats.records.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400">No employees assigned to this course yet.</div>
              ) : filteredTrackingRecords.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-500 space-y-3">
                  <p className="font-medium text-gray-600">
                    No employees found for "
                    {trackingFilter === 'COMPLETED'
                      ? 'Completed'
                      : trackingFilter === 'PENDING'
                      ? 'Pending / Watching'
                      : 'Assessed'}
                    ".
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setTrackingFilter('ALL')}>
                    Show All {trackingStats.totalAssigned} Employees
                  </Button>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[10px] sticky top-0">
                    <tr>
                      <th className="p-3">Employee</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Video Watch</th>
                      <th className="p-3">Assessment</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Reminder</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTrackingRecords.map((rec) => {
                      const isPending = rec.status === 'ENROLLED' || rec.status === 'IN_PROGRESS';
                      return (
                        <tr key={rec.enrollment_id} className="hover:bg-gray-50/80">
                          <td className="p-3">
                            <div className="font-bold text-gray-900">{rec.employee_name}</div>
                            <div className="text-[10px] text-gray-400 font-mono">{rec.employee_code}</div>
                          </td>
                          <td className="p-3 text-gray-600">{rec.department_name}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#07563D] rounded-full transition-all"
                                  style={{ width: `${rec.progress_percentage}%` }}
                                />
                              </div>
                              <span className="font-mono text-[10px] font-bold text-gray-600">
                                {rec.progress_percentage}%
                              </span>
                            </div>
                          </td>
                          <td className="p-3 font-mono font-bold">
                            {rec.score !== null ? (
                              <span className={rec.status === 'COMPLETED' ? 'text-emerald-700' : 'text-rose-700'}>
                                {rec.score}%
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="p-3">
                            {rec.status === 'COMPLETED' ? (
                              <Badge variant="emerald">Completed</Badge>
                            ) : rec.status === 'FAILED' ? (
                              <Badge variant="rose">Failed</Badge>
                            ) : rec.status === 'IN_PROGRESS' ? (
                              <Badge variant="info">Watching</Badge>
                            ) : (
                              <Badge variant="amber">Pending</Badge>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            {isPending ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={sendingReminderId === rec.employee_id}
                                onClick={() => handleSendReminder(rec)}
                                leftIcon={<Bell className="w-3 h-3 text-[#07563D]" />}
                                className="text-[11px] h-7 px-2"
                              >
                                {sendingReminderId === rec.employee_id ? 'Sending...' : 'Notify'}
                              </Button>
                            ) : (
                              <span className="text-[11px] text-emerald-600 font-bold flex items-center justify-end gap-1">
                                <Check className="w-3.5 h-3.5" /> Done
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
