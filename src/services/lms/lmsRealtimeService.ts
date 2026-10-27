import { supabase, supabaseAdmin, supabaseUrl } from '../../lib/supabase';
import { getActiveOrgId } from '../attendance/biometricCommandService';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

export interface CourseMetadata {
  videoId: string;
  youtubeUrl: string;
  passingPercentage: number;
  passingScoreNumber?: number;
  description: string;
  questions: QuizQuestion[];
}

export interface LmsCourseItem {
  id: string;
  organization_id: string;
  title: string;
  code: string;
  category: string;
  is_mandatory: boolean;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
  // Computed / rich fields
  videoId?: string;
  youtubeUrl?: string;
  thumbnailUrl?: string;
  passingPercentage: number;
  passingScoreNumber?: number;
  description?: string;
  questions?: QuizQuestion[];
  progress_percentage?: number;
  enrollment_status?: string;
}

export interface EmployeeEnrollmentRecord {
  enrollment_id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  email: string;
  department_name: string;
  avatar_url?: string;
  progress_percentage: number;
  score: number | null;
  status: 'ENROLLED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  completed_at: string | null;
  user_id?: string;
}

export interface CourseTrackingStats {
  totalAssigned: number;
  completedCount: number;
  inProgressCount: number;
  pendingCount: number;
  failedCount: number;
  averageScore: number;
  records: EmployeeEnrollmentRecord[];
}

export interface LmsDashboardRealtimeData {
  totalCourses: number;
  activePrograms: number;
  totalEnrollments: number;
  mandatoryCompliance: string;
  expiringCerts: number;
  completionRate: string;
  averageScore: number;
  courseCompletionData: {
    name: string;
    enrolled: number;
    completed: number;
    inProgress: number;
    pending: number;
  }[];
  employeeMetrics?: {
    enrolledCount: number;
    completedCount: number;
    inProgressCount: number;
    avgScore: number;
    myCourses: {
      id: string;
      title: string;
      progress: number;
      status: string;
      score: number | null;
      category: string;
    }[];
  };
}

/**
 * Parses any YouTube link format and returns the 11-char Video ID
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  // Direct 11-character ID (alphanumeric, -, _)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = trimmed.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

/**
 * Extracts YouTube videoId and passingPercentage from code
 * E.g. "YT:sBws8MSXN7A:80" => videoId: "sBws8MSXN7A", passingScore: 80
 */
export function parseCourseCode(code: string): { videoId: string; passingScore: number } {
  if (code && code.startsWith('YT:')) {
    const parts = code.split(':');
    return {
      videoId: parts[1] || '',
      passingScore: parts[2] ? parseInt(parts[2], 10) : 80,
    };
  }
  return { videoId: '', passingScore: 80 };
}

export async function resolveCurrentEmployeeId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: emp } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    return emp?.id || user.id;
  } catch {
    return null;
  }
}

export const lmsRealtimeService = {
  /**
   * Fetches all courses with live metadata and assessment questions
   */
  async fetchCourses(orgId: string = getActiveOrgId()): Promise<LmsCourseItem[]> {
    try {
      const client = supabaseAdmin || supabase;
      const { data, error } = await client
        .from('lms_courses')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error || !data) {
        console.warn('[LmsRealtime] Error fetching courses:', error);
        return [];
      }

      // Fetch active user's enrollment progress if available
      const userEnrollmentMap = new Map<string, any>();
      try {
        const empId = await resolveCurrentEmployeeId();
        if (empId) {
          const { data: enrs } = await client
            .from('lms_enrollments')
            .select('course_id, progress_percentage, status')
            .eq('employee_id', empId);

          if (enrs) {
            enrs.forEach((enr) => userEnrollmentMap.set(enr.course_id, enr));
          }
        }
      } catch (_) {}

      const coursesWithMeta: LmsCourseItem[] = await Promise.all(
        data.map(async (row) => {
          const { videoId, passingScore } = parseCourseCode(row.code);
          let metadata: Partial<CourseMetadata> = {};

          try {
            // Attempt to load rich assessment JSON from public bucket
            const metaUrl = `${supabaseUrl}/storage/v1/object/public/lms-content/courses/${row.id}/assessment.json`;
            const resp = await fetch(metaUrl);
            if (resp.ok) {
              metadata = await resp.json();
            }
          } catch (_) {
            // Silently fallback if not created yet
          }

          const effectiveVideoId = metadata.videoId || videoId;
          const questionsList = metadata.questions || [];
          const totalQ = questionsList.length;
          const effectivePassing = metadata.passingPercentage || passingScore || (totalQ > 0 ? 80 : 0);
          const effectivePassingScoreNumber = metadata.passingScoreNumber !== undefined
            ? metadata.passingScoreNumber
            : (totalQ > 0 ? Math.max(1, Math.ceil((effectivePassing / 100) * totalQ)) : undefined);
          const userEnr = userEnrollmentMap.get(row.id);
          const progressPercentage = userEnr ? Number(userEnr.progress_percentage) || 0 : 0;
          const enrollmentStatus = userEnr ? userEnr.status : 'ENROLLED';

          return {
            id: row.id,
            organization_id: row.organization_id,
            title: row.title,
            code: row.code,
            category: row.category || 'Compliance',
            is_mandatory: row.is_mandatory ?? true,
            duration_minutes: row.duration_minutes || 30,
            is_active: row.is_active,
            created_at: row.created_at,
            videoId: effectiveVideoId,
            youtubeUrl: metadata.youtubeUrl || (effectiveVideoId ? `https://www.youtube.com/watch?v=${effectiveVideoId}` : ''),
            thumbnailUrl: effectiveVideoId ? `https://img.youtube.com/vi/${effectiveVideoId}/hqdefault.jpg` : undefined,
            passingPercentage: effectivePassing,
            passingScoreNumber: effectivePassingScoreNumber,
            description: metadata.description || '',
            questions: questionsList,
            progress_percentage: progressPercentage,
            enrollment_status: enrollmentStatus,
          };
        })
      );

      return coursesWithMeta;
    } catch (err) {
      console.error('[LmsRealtime] fetchCourses exception:', err);
      return [];
    }
  },

  /**
   * Creates a new course, saves assessment JSON in storage bucket,
   * and automatically enrolls all active company employees.
   */
  async createCourse(input: {
    title: string;
    youtubeUrl: string;
    category?: string;
    durationMinutes?: number;
    isMandatory?: boolean;
    passingPercentage?: number;
    passingScoreNumber?: number;
    description?: string;
    questions?: QuizQuestion[];
    orgId?: string;
  }): Promise<LmsCourseItem> {
    const orgId = input.orgId || getActiveOrgId();
    const videoId = extractYouTubeVideoId(input.youtubeUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL or Video ID provided');
    }

    const questionsList = input.questions || [];
    const hasQuestions = questionsList.length > 0;
    const totalQ = questionsList.length;
    let passingNum: number | undefined = undefined;
    let passing = 0;

    if (hasQuestions) {
      passingNum = input.passingScoreNumber !== undefined
        ? Math.min(totalQ, Math.max(1, input.passingScoreNumber))
        : Math.max(1, Math.ceil(((input.passingPercentage || 80) / 100) * totalQ));
      passing = Math.round((passingNum / totalQ) * 100);
    }
    const code = `YT:${videoId}:${passing}`.slice(0, 50);
    const client = supabaseAdmin || supabase;

    // 1. Insert course row
    const { data: courseRow, error: courseErr } = await client
      .from('lms_courses')
      .insert({
        organization_id: orgId,
        title: input.title.trim(),
        code: code,
        category: (input.category || 'Safety & Compliance').trim(),
        is_mandatory: input.isMandatory ?? true,
        duration_minutes: input.durationMinutes || 15,
        is_active: true,
      })
      .select()
      .single();

    if (courseErr || !courseRow) {
      throw new Error(`Failed to create course in DB: ${courseErr?.message || 'Unknown error'}`);
    }

    // 2. Upload metadata + assessment JSON to lms-content bucket
    const courseId = courseRow.id;
    const metaPayload: CourseMetadata = {
      videoId,
      youtubeUrl: input.youtubeUrl.trim(),
      passingPercentage: passing,
      passingScoreNumber: passingNum,
      description: input.description || '',
      questions: questionsList,
    };

    try {
      const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/lms-content/courses/${courseId}/assessment.json`, {
        method: 'POST',
        headers: {
          apikey: (client as any).supabaseKey || '',
          Authorization: `Bearer ${(client as any).supabaseKey || ''}`,
          'Content-Type': 'application/json',
          'x-upsert': 'true',
        },
        body: JSON.stringify(metaPayload),
      });

      if (!uploadRes.ok) {
        console.warn('[LmsRealtime] Assessment upload returned status:', uploadRes.status);
      }
    } catch (e) {
      console.warn('[LmsRealtime] Error uploading assessment JSON:', e);
    }

    // 3. Auto-enroll active employees so HR and managers have immediate visibility
    try {
      const dbClient = supabaseAdmin || client;
      let { data: employees } = await dbClient
        .from('employees')
        .select('id')
        .is('deleted_at', null);

      if (employees && employees.length > 0) {
        const enrollments = employees.map((emp) => ({
          organization_id: orgId,
          course_id: courseId,
          employee_id: emp.id,
          progress_percentage: 0,
          status: 'ENROLLED',
        }));

        await dbClient.from('lms_enrollments').insert(enrollments);
      }
    } catch (enrollErr) {
      console.warn('[LmsRealtime] Auto-enrollment notice:', enrollErr);
    }

    return {
      id: courseRow.id,
      organization_id: courseRow.organization_id,
      title: courseRow.title,
      code: courseRow.code,
      category: courseRow.category,
      is_mandatory: courseRow.is_mandatory,
      duration_minutes: courseRow.duration_minutes,
      is_active: courseRow.is_active,
      created_at: courseRow.created_at,
      videoId,
      youtubeUrl: input.youtubeUrl,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      passingPercentage: passing,
      passingScoreNumber: passingNum,
      description: input.description,
      questions: questionsList,
    };
  },

  /**
   * Updates an existing course, its code, and assessment JSON in storage
   */
  async updateCourse(
    courseId: string,
    input: {
      title: string;
      youtubeUrl: string;
      category?: string;
      durationMinutes?: number;
      isMandatory?: boolean;
      passingPercentage?: number;
      passingScoreNumber?: number;
      description?: string;
      questions?: QuizQuestion[];
    }
  ): Promise<LmsCourseItem> {
    const videoId = extractYouTubeVideoId(input.youtubeUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL or Video ID provided');
    }

    const questionsList = input.questions || [];
    const hasQuestions = questionsList.length > 0;
    const totalQ = questionsList.length;
    let passingNum: number | undefined = undefined;
    let passing = 0;

    if (hasQuestions) {
      passingNum = input.passingScoreNumber !== undefined
        ? Math.min(totalQ, Math.max(1, input.passingScoreNumber))
        : Math.max(1, Math.ceil(((input.passingPercentage || 80) / 100) * totalQ));
      passing = Math.round((passingNum / totalQ) * 100);
    }
    const code = `YT:${videoId}:${passing}`.slice(0, 50);
    const client = supabaseAdmin || supabase;

    // 1. Update course row in lms_courses
    const { data: updatedRow, error: updateErr } = await client
      .from('lms_courses')
      .update({
        title: input.title.trim(),
        code: code,
        category: (input.category || 'Safety & Compliance').trim(),
        is_mandatory: input.isMandatory ?? true,
        duration_minutes: input.durationMinutes || 15,
      })
      .eq('id', courseId)
      .select()
      .single();

    if (updateErr) {
      throw new Error(`Failed to update course in DB: ${updateErr.message}`);
    }

    // 2. Upload updated metadata + assessment JSON to lms-content bucket
    const metaPayload: CourseMetadata = {
      videoId,
      youtubeUrl: input.youtubeUrl.trim(),
      passingPercentage: passing,
      passingScoreNumber: passingNum,
      description: input.description || '',
      questions: questionsList,
    };

    try {
      await fetch(`${supabaseUrl}/storage/v1/object/lms-content/courses/${courseId}/assessment.json`, {
        method: 'POST',
        headers: {
          apikey: (client as any).supabaseKey || '',
          Authorization: `Bearer ${(client as any).supabaseKey || ''}`,
          'Content-Type': 'application/json',
          'x-upsert': 'true',
        },
        body: JSON.stringify(metaPayload),
      });
    } catch (e) {
      console.warn('[LmsRealtime] Error updating assessment JSON:', e);
    }

    return {
      id: courseId,
      organization_id: updatedRow?.organization_id || getActiveOrgId(),
      title: input.title.trim(),
      code: code,
      category: (input.category || 'Safety & Compliance').trim(),
      is_mandatory: input.isMandatory ?? true,
      duration_minutes: input.durationMinutes || 15,
      is_active: true,
      created_at: updatedRow?.created_at || new Date().toISOString(),
      videoId,
      youtubeUrl: input.youtubeUrl.trim(),
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      passingPercentage: passing,
      passingScoreNumber: passingNum,
      description: input.description || '',
      questions: questionsList,
    };
  },

  /**
   * Deletes a course from DB (soft-delete + cleanup)
   */
  async deleteCourse(courseId: string): Promise<boolean> {
    const client = supabaseAdmin || supabase;
    try {
      // 1. Mark is_active = false immediately to hide from all queries
      await client
        .from('lms_courses')
        .update({ is_active: false })
        .eq('id', courseId);

      // 2. Delete enrollments linked to this course
      try {
        await client
          .from('lms_enrollments')
          .delete()
          .eq('course_id', courseId);
      } catch (_) {}

      // 3. Attempt permanent delete from lms_courses
      try {
        await client
          .from('lms_courses')
          .delete()
          .eq('id', courseId);
      } catch (_) {}

      return true;
    } catch (err) {
      console.error('[LmsRealtime] Error deleting course:', err);
      throw err;
    }
  },

  /**
   * Fetches real-time employee progress for a course:
   * Who watched, who pending, scores, pass/fail status
   */
  async getCourseTracking(courseId: string, orgId: string = getActiveOrgId()): Promise<CourseTrackingStats> {
    const client = supabaseAdmin || supabase;

    // 1. Fetch all enrollments for this course
    let { data: enrollments, error: enrErr } = await client
      .from('lms_enrollments')
      .select('*')
      .eq('course_id', courseId);

    // Auto-heal: If course has 0 enrollments, automatically enroll all active employees!
    if (!enrollments || enrollments.length === 0) {
      try {
        const { data: allEmps } = await client
          .from('employees')
          .select('id')
          .is('deleted_at', null);

        if (allEmps && allEmps.length > 0) {
          const newEnrollments = allEmps.map((emp) => ({
            organization_id: orgId,
            course_id: courseId,
            employee_id: emp.id,
            progress_percentage: 0,
            status: 'ENROLLED',
          }));
          const { data: inserted } = await client
            .from('lms_enrollments')
            .insert(newEnrollments)
            .select();
          if (inserted && inserted.length > 0) {
            enrollments = inserted;
          }
        }
      } catch (autoErr) {
        console.warn('[LmsRealtime] Auto-heal enrollments error:', autoErr);
      }
    }

    if (enrErr || !enrollments || enrollments.length === 0) {
      console.warn('[LmsRealtime] Enrollments empty or error:', enrErr);
      return {
        totalAssigned: 0,
        completedCount: 0,
        inProgressCount: 0,
        pendingCount: 0,
        failedCount: 0,
        averageScore: 0,
        records: [],
      };
    }

    // 2. Fetch employee details for all enrolled IDs (safe columns only)
    const empIds = enrollments.map((e) => e.employee_id).filter(Boolean);
    let empMap = new Map<string, any>();

    if (empIds.length > 0) {
      const { data: emps } = await client
        .from('employees')
        .select('id, first_name, last_name, employee_code, work_email, avatar_url, user_id')
        .in('id', empIds);

      if (emps) {
        emps.forEach((em) => empMap.set(em.id, em));
      }
    }

    // 3. Assemble unified tracking rows
    let completedCount = 0;
    let inProgressCount = 0;
    let pendingCount = 0;
    let failedCount = 0;
    let scoreSum = 0;
    let scoreCount = 0;

    const records: EmployeeEnrollmentRecord[] = enrollments.map((e) => {
      const emp = empMap.get(e.employee_id);
      const fullName = emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Employee' : 'Employee';
      const progress = Number(e.progress_percentage) || 0;
      const score = e.score !== null ? Number(e.score) : null;
      let status: 'ENROLLED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' = (e.status as any) || 'ENROLLED';

      if (status === 'COMPLETED') {
        completedCount++;
        if (score !== null) {
          scoreSum += score;
          scoreCount++;
        }
      } else if (status === 'FAILED') {
        failedCount++;
        if (score !== null) {
          scoreSum += score;
          scoreCount++;
        }
      } else if (progress > 0) {
        status = 'IN_PROGRESS';
        inProgressCount++;
      } else {
        status = 'ENROLLED';
        pendingCount++;
      }

      return {
        enrollment_id: e.id,
        employee_id: e.employee_id,
        employee_name: fullName,
        employee_code: emp?.employee_code || 'EMP',
        email: emp?.work_email || '',
        department_name: emp?.department_name || 'General',
        avatar_url: emp?.avatar_url,
        progress_percentage: progress,
        score: score,
        status: status,
        completed_at: e.completed_at,
        user_id: emp?.user_id,
      };
    });

    const averageScore = scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 0;

    return {
      totalAssigned: enrollments.length,
      completedCount,
      inProgressCount,
      pendingCount,
      failedCount,
      averageScore,
      records,
    };
  },

  /**
   * Dispatches a real Mobile Push / In-App Notification Reminder
   * to a pending or in-progress employee via public.notification_events.
   */
  async sendMobileReminder(
    courseId: string,
    employeeId: string,
    courseTitle: string,
    orgId: string = getActiveOrgId()
  ): Promise<{ success: boolean; eventId?: string }> {
    const client = supabaseAdmin || supabase;

    // Resolve employee user_id / auth_user_id
    let recipientUserId: string | null = null;

    try {
      const { data: emp } = await client
        .from('employees')
        .select('user_id, first_name, last_name')
        .eq('id', employeeId)
        .maybeSingle();

      recipientUserId = emp?.user_id || null;
    } catch (_) {
      recipientUserId = null;
    }

    const { data, error } = await client
      .from('notification_events')
      .insert({
        organization_id: orgId,
        recipient_user_id: recipientUserId,
        channel: 'IN_APP',
        title: `Training Pending: ${courseTitle}`,
        message: `Your mandatory training "${courseTitle}" is pending. Please watch the video and complete the assessment on your Mobile or Web app.`,
        action_url: `/lms/course/${courseId}`,
        is_read: false,
        is_sent: false,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('[LmsRealtime] Error sending reminder event:', error);
      return { success: false };
    }

    return { success: true, eventId: data?.id };
  },

  /**
   * Updates employee video watch progress (Anti-Skip verified)
   */
  async updateWatchProgress(
    courseId: string,
    employeeId: string,
    progressPercentage: number,
    orgId: string = getActiveOrgId()
  ): Promise<void> {
    const client = supabaseAdmin || supabase;
    const progress = Math.min(100, Math.max(0, Math.round(progressPercentage)));

    const { data: existing } = await client
      .from('lms_enrollments')
      .select('id, progress_percentage, status')
      .eq('course_id', courseId)
      .eq('employee_id', employeeId)
      .maybeSingle();

    if (existing) {
      const newStatus = existing.status === 'COMPLETED' ? 'COMPLETED' : progress >= 100 ? 'IN_PROGRESS' : 'IN_PROGRESS';
      await client
        .from('lms_enrollments')
        .update({
          progress_percentage: Math.max(existing.progress_percentage || 0, progress),
          status: newStatus,
        })
        .eq('id', existing.id);
    } else {
      await client.from('lms_enrollments').insert({
        organization_id: orgId,
        course_id: courseId,
        employee_id: employeeId,
        progress_percentage: progress,
        status: 'IN_PROGRESS',
      });
    }
  },

  /**
   * Submits assessment score, evaluates pass/fail constraint,
   * and updates employee enrollment status.
   */
  async submitAssessmentResult(
    courseId: string,
    employeeId: string,
    scorePercentage: number,
    passingThreshold: number = 80,
    orgId: string = getActiveOrgId(),
    options?: {
      correctAnswers?: number;
      totalQuestions?: number;
      passingScoreNumber?: number;
    }
  ): Promise<{ passed: boolean; score: number }> {
    const client = supabaseAdmin || supabase;
    const passed = options?.passingScoreNumber !== undefined && options?.correctAnswers !== undefined
      ? options.correctAnswers >= options.passingScoreNumber
      : scorePercentage >= passingThreshold;
    const status = passed ? 'COMPLETED' : 'FAILED';
    const completedAt = passed ? new Date().toISOString() : null;

    const { data: existing } = await client
      .from('lms_enrollments')
      .select('id')
      .eq('course_id', courseId)
      .eq('employee_id', employeeId)
      .maybeSingle();

    if (existing) {
      await client
        .from('lms_enrollments')
        .update({
          score: scorePercentage,
          status,
          progress_percentage: 100,
          completed_at: completedAt,
        })
        .eq('id', existing.id);
    } else {
      await client.from('lms_enrollments').insert({
        organization_id: orgId,
        course_id: courseId,
        employee_id: employeeId,
        score: scorePercentage,
        status,
        progress_percentage: 100,
        completed_at: completedAt,
      });
    }

    return { passed, score: scorePercentage };
  },

  /**
   * Directly marks course as COMPLETED when no quiz assessment is attached
   */
  async markCourseCompleted(
    courseId: string,
    employeeId: string,
    orgId: string = getActiveOrgId()
  ): Promise<{ success: boolean }> {
    const client = supabaseAdmin || supabase;
    const completedAt = new Date().toISOString();

    const { data: existing } = await client
      .from('lms_enrollments')
      .select('id')
      .eq('course_id', courseId)
      .eq('employee_id', employeeId)
      .maybeSingle();

    if (existing) {
      await client
        .from('lms_enrollments')
        .update({
          status: 'COMPLETED',
          progress_percentage: 100,
          completed_at: completedAt,
        })
        .eq('id', existing.id);
    } else {
      await client.from('lms_enrollments').insert({
        organization_id: orgId,
        course_id: courseId,
        employee_id: employeeId,
        status: 'COMPLETED',
        progress_percentage: 100,
        completed_at: completedAt,
      });
    }
    return { success: true };
  },

  /**
   * Aggregates real-time LMS metrics for the Intelligence Dashboard
   */
  async getDashboardMetrics(
    currentEmployeeId?: string,
    orgId: string = getActiveOrgId()
  ): Promise<LmsDashboardRealtimeData> {
    const client = supabaseAdmin || supabase;

    // 1. Fetch real active courses
    const courses = await this.fetchCourses(orgId);

    // 2. Fetch all real enrollments for these courses
    const { data: allEnrollments } = await client
      .from('lms_enrollments')
      .select('id, course_id, employee_id, status, progress_percentage, score, completed_at');

    const enrollments = allEnrollments || [];

    // Distinct course categories as active programs
    const categories = Array.from(new Set(courses.map((c) => c.category).filter(Boolean)));
    const activePrograms = Math.max(1, categories.length);

    // Total enrollments
    const totalEnrollments = enrollments.length;

    // Mandatory courses compliance
    const mandatoryCourseIds = new Set(courses.filter((c) => c.is_mandatory).map((c) => c.id));
    const mandatoryEnrollments = enrollments.filter((e) => mandatoryCourseIds.has(e.course_id));
    const completedMandatory = mandatoryEnrollments.filter((e) => e.status === 'COMPLETED').length;
    const mandatoryCompliancePct =
      mandatoryEnrollments.length > 0
        ? Math.round((completedMandatory / mandatoryEnrollments.length) * 100)
        : courses.length > 0
        ? 100
        : 0;

    // Overall completion rate
    const totalCompleted = enrollments.filter((e) => e.status === 'COMPLETED').length;
    const overallCompletionPct =
      totalEnrollments > 0 ? Math.round((totalCompleted / totalEnrollments) * 100) : 0;

    // Average Assessment Score
    const scoredList = enrollments.filter((e) => typeof e.score === 'number' && e.score !== null);
    const avgScore =
      scoredList.length > 0
        ? Math.round(scoredList.reduce((acc, curr) => acc + (curr.score || 0), 0) / scoredList.length)
        : 0;

    // Pending Action (courses pending completion)
    const pendingActionCount = totalEnrollments - totalCompleted;

    // Chart analytics per active course
    const courseCompletionData = courses.map((crs) => {
      const crsEnrs = enrollments.filter((e) => e.course_id === crs.id);
      const compCount = crsEnrs.filter((e) => e.status === 'COMPLETED').length;
      const inProgCount = crsEnrs.filter((e) => e.status === 'IN_PROGRESS').length;
      const pendCount = crsEnrs.filter((e) => e.status === 'ENROLLED').length;
      return {
        name: crs.title.length > 20 ? crs.title.slice(0, 18) + '...' : crs.title,
        enrolled: crsEnrs.length,
        completed: compCount,
        inProgress: inProgCount,
        pending: pendCount,
      };
    });

    // Employee specific metrics
    let empId = currentEmployeeId;
    if (!empId) {
      empId = (await resolveCurrentEmployeeId()) || undefined;
    }

    const myEnrs = empId ? enrollments.filter((e) => e.employee_id === empId) : [];
    const myCompleted = myEnrs.filter((e) => e.status === 'COMPLETED').length;
    const myInProg = myEnrs.filter((e) => e.status === 'IN_PROGRESS').length;
    const myScored = myEnrs.filter((e) => typeof e.score === 'number' && e.score !== null);
    const myAvg =
      myScored.length > 0
        ? Math.round(myScored.reduce((acc, curr) => acc + (curr.score || 0), 0) / myScored.length)
        : 0;

    const myCourses = courses.map((crs) => {
      const myEnr = myEnrs.find((e) => e.course_id === crs.id);
      return {
        id: crs.id,
        title: crs.title,
        progress: myEnr ? Number(myEnr.progress_percentage) || 0 : 0,
        status: myEnr ? myEnr.status : 'ENROLLED',
        score: myEnr ? myEnr.score : null,
        category: crs.category,
      };
    });

    const employeeMetrics = {
      enrolledCount: myEnrs.length,
      completedCount: myCompleted,
      inProgressCount: myInProg,
      avgScore: myAvg,
      myCourses,
    };

    return {
      totalCourses: courses.length,
      activePrograms,
      totalEnrollments,
      mandatoryCompliance: `${mandatoryCompliancePct}%`,
      expiringCerts: pendingActionCount,
      completionRate: `${overallCompletionPct}%`,
      averageScore: avgScore,
      courseCompletionData,
      employeeMetrics,
    };
  },
};
