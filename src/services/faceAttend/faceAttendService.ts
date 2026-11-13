// src/services/faceAttend/faceAttendService.ts
// Complete data & governance service for JOY FaceAttend web module + Realtime listeners.
import { supabase } from '../../lib/supabase';
import { DEFAULT_FACEATTEND_POLICY } from '../../../supabase/functions/face-attend-verify/policy';
import type {
  FaceAttendAttemptRecord,
  FaceAttendAuditLog,
  FaceAttendExceptionReview,
  FaceAttendOrgSettings,
  FaceAttendTemplateRecord,
} from '../../types/faceAttend';

export const faceAttendService = {
  async getSettings(organizationId: string): Promise<FaceAttendOrgSettings> {
    const { data, error } = await supabase
      .from('faceattend_org_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error || !data) {
      return {
        organization_id: organizationId,
        ...DEFAULT_FACEATTEND_POLICY,
      };
    }

    return {
      organization_id: organizationId,
      ...DEFAULT_FACEATTEND_POLICY,
      ...data,
      match_threshold: Number(data.match_threshold ?? DEFAULT_FACEATTEND_POLICY.match_threshold),
      liveness_threshold: Number(data.liveness_threshold ?? DEFAULT_FACEATTEND_POLICY.liveness_threshold),
      max_gps_accuracy_meters: Number(
        data.max_gps_accuracy_meters ?? DEFAULT_FACEATTEND_POLICY.max_gps_accuracy_meters
      ),
      gps_freshness_seconds: Number(
        data.gps_freshness_seconds ?? DEFAULT_FACEATTEND_POLICY.gps_freshness_seconds
      ),
    };
  },

  async saveSettings(
    organizationId: string,
    updates: Partial<FaceAttendOrgSettings>,
    actorUserId?: string
  ): Promise<{ ok: boolean; data?: FaceAttendOrgSettings; error?: string }> {
    const current = await this.getSettings(organizationId);
    const nextVersion = (current.policy_version || 1) + 1;

    const payload = {
      ...current,
      ...updates,
      organization_id: organizationId,
      policy_version: nextVersion,
      updated_by: actorUserId || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('faceattend_org_settings')
      .upsert(payload, { onConflict: 'organization_id' })
      .select('*')
      .single();

    if (error) return { ok: false, error: error.message };

    await supabase.from('faceattend_audit_logs').insert({
      organization_id: organizationId,
      actor_user_id: actorUserId || null,
      event_type: 'POLICY_SETTINGS_UPDATED',
      target_type: 'faceattend_org_settings',
      metadata: {
        policy_version: nextVersion,
        module_enabled: data.module_enabled,
        face_verification_enabled: data.face_verification_enabled,
        liveness_enabled: data.liveness_enabled,
        gps_verification_enabled: data.gps_verification_enabled,
        geofence_mode: data.geofence_mode,
      },
    });

    return { ok: true, data: data as FaceAttendOrgSettings };
  },

  async listTemplates(organizationId: string): Promise<FaceAttendTemplateRecord[]> {
    const [{ data: templates, error }, { data: consents }] = await Promise.all([
      supabase
        .from('faceattend_templates')
        .select('*, employees(display_name, employee_code, avatar_url)')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('faceattend_consents')
        .select('employee_id, status, consent_version, granted_at')
        .eq('organization_id', organizationId)
        .order('granted_at', { ascending: false }),
    ]);

    if (error) {
      console.warn('[FaceAttendService] listTemplates error:', error.message);
      return [];
    }

    const consentByEmp = new Map<string, { status: string; version: string }>();
    for (const c of consents || []) {
      if (!consentByEmp.has(c.employee_id)) {
        consentByEmp.set(c.employee_id, {
          status: c.status,
          version: c.consent_version,
        });
      }
    }

    return (templates || []).map((row: any) => {
      const c = consentByEmp.get(row.employee_id);
      return {
        id: row.id,
        organization_id: row.organization_id,
        employee_id: row.employee_id,
        employee_name: row.employees?.display_name || 'Employee',
        employee_code: row.employees?.employee_code || '',
        department: row.employees?.department || row.employees?.department_id || '',
        employee_avatar_url: row.employees?.avatar_url || null,
        primary_image_path: row.primary_image_path || null,
        liveness_audit_paths: Array.isArray(row.liveness_audit_paths) ? row.liveness_audit_paths : [],
        enrolment_status: row.enrolment_status,
        capture_method: row.capture_method,
        template_version: row.template_version,
        provider_code: row.provider_code,
        quality_score: row.quality_score != null ? Number(row.quality_score) : null,
        approved_by: row.approved_by,
        approved_at: row.approved_at,
        rejection_reason: row.rejection_reason,
        revocation_reason: row.revocation_reason,
        consent_status: (c?.status as any) || 'NONE',
        consent_version: c?.version || null,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });
  },

  async getTemplateSignedPhotoUrls(
    tpl: Pick<FaceAttendTemplateRecord, 'primary_image_path' | 'liveness_audit_paths'>
  ): Promise<Array<{ label: string; url: string }>> {
    const entries: Array<{ label: string; path: string }> = [];
    if (tpl.primary_image_path) {
      entries.push({ label: 'Front', path: tpl.primary_image_path });
    }
    const sides = Array.isArray(tpl.liveness_audit_paths) ? tpl.liveness_audit_paths : [];
    for (const p of sides) {
      if (typeof p !== 'string' || !p) continue;
      const label = p.includes('_left') ? 'Left' : p.includes('_right') ? 'Right' : 'Angle';
      entries.push({ label, path: p });
    }
    if (entries.length === 0) return [];

    const results = await Promise.all(
      entries.map(async (item) => {
        const { data } = await supabase.storage
          .from('faceattend-private')
          .createSignedUrl(item.path, 120);
        return data?.signedUrl ? { label: item.label, url: data.signedUrl } : null;
      })
    );
    return results.filter((x): x is { label: string; url: string } => x !== null);
  },

  async updateTemplateDecision(params: {
    organizationId: string;
    templateId: string;
    action: 'APPROVE' | 'REJECT' | 'REVOKE';
    reason?: string;
    actorUserId?: string;
  }): Promise<{ ok: boolean; error?: string }> {
    const now = new Date().toISOString();
    const patch: Record<string, any> = {};

    if (params.action === 'APPROVE') {
      patch.enrolment_status = 'ACTIVE';
      patch.approved_by = params.actorUserId || null;
      patch.approved_at = now;
      patch.rejection_reason = null;
    } else if (params.action === 'REJECT') {
      patch.enrolment_status = 'REJECTED';
      patch.rejection_reason = params.reason || 'Image or pose did not meet enrolment policy';
    } else {
      patch.enrolment_status = 'REVOKED';
      patch.revoked_by = params.actorUserId || null;
      patch.revoked_at = now;
      patch.revocation_reason = params.reason || 'Revoked by administrator';
    }

    const { error } = await supabase
      .from('faceattend_templates')
      .update(patch)
      .eq('id', params.templateId)
      .eq('organization_id', params.organizationId);

    if (error) return { ok: false, error: error.message };

    await supabase.from('faceattend_audit_logs').insert({
      organization_id: params.organizationId,
      actor_user_id: params.actorUserId || null,
      event_type: `TEMPLATE_${params.action}`,
      target_type: 'faceattend_templates',
      target_id: params.templateId,
      metadata: { reason: params.reason || null },
    });

    return { ok: true };
  },

  async deleteEmployeeBiometrics(
    organizationId: string,
    employeeId: string,
    reason = 'Admin-triggered consent withdrawal and biometric deletion'
  ): Promise<{ ok: boolean; error?: string }> {
    const { data, error } = await supabase.rpc('fn_withdraw_faceattend_consent_and_delete', {
      p_organization_id: organizationId,
      p_employee_id: employeeId,
      p_reason: reason,
    });
    if (error) return { ok: false, error: error.message };

    const paths: string[] = Array.isArray(data?.purged_storage_paths)
      ? data.purged_storage_paths
      : [];
    if (paths.length > 0) {
      await supabase.storage.from('faceattend-private').remove(paths);
    }
    return { ok: true };
  },

  async listAttempts(organizationId: string, limit = 150): Promise<FaceAttendAttemptRecord[]> {
    const { data, error } = await supabase
      .from('faceattend_verification_attempts')
      .select('*, employees(display_name, employee_code), work_locations(name)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[FaceAttendService] listAttempts error:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      ...row,
      employee_name: row.employees?.display_name || 'Employee',
      employee_code: row.employees?.employee_code || '',
      work_location_name: row.work_locations?.name || null,
      face_similarity_score:
        row.face_similarity_score != null ? Number(row.face_similarity_score) : null,
      liveness_score: row.liveness_score != null ? Number(row.liveness_score) : null,
      distance_meters: row.distance_meters != null ? Number(row.distance_meters) : null,
      gps_accuracy_meters:
        row.gps_accuracy_meters != null ? Number(row.gps_accuracy_meters) : null,
    }));
  },

  async listExceptionReviews(organizationId: string): Promise<FaceAttendExceptionReview[]> {
    const { data, error } = await supabase
      .from('faceattend_exception_reviews')
      .select('*, employees(display_name, employee_code)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(150);

    if (error) {
      console.warn('[FaceAttendService] listExceptionReviews error:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      ...row,
      employee_name: row.employees?.display_name || 'Employee',
      employee_code: row.employees?.employee_code || '',
    }));
  },

  async resolveExceptionReview(params: {
    organizationId: string;
    review: FaceAttendExceptionReview;
    decision: 'APPROVED' | 'REJECTED';
    notes: string;
    actorUserId?: string;
  }): Promise<{ ok: boolean; error?: string }> {
    const now = new Date().toISOString();
    let committedPunchId: string | null = null;
    let committedDailyId: string | null = null;

    if (params.decision === 'APPROVED') {
      // Commit approved fallback attendance cleanly into attendance_punches + attendance_daily
      const todayIst = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const { data: punchRow, error: punchErr } = await supabase
        .from('attendance_punches')
        .insert({
          organization_id: params.organizationId,
          employee_id: params.review.employee_id,
          punch_time: now,
          punch_type: params.review.requested_punch_type === 'CHECK_OUT' ? 'OUT' : 'IN',
          verification_mode: 'Manual',
          latitude: params.review.latitude,
          longitude: params.review.longitude,
          work_location_id: params.review.work_location_id,
          distance_meters: params.review.distance_meters,
          location_authorized: true,
          punch_source: 'JOY_FACEATTEND_FALLBACK',
          attendance_date: todayIst,
          idempotency_key: `faceattend_fallback_${params.review.id}`,
          is_processed: true,
        })
        .select('id')
        .maybeSingle();

      if (punchErr && !punchErr.message?.includes('duplicate key')) {
        return { ok: false, error: punchErr.message };
      }
      committedPunchId = punchRow?.id || null;

      if (params.review.requested_punch_type === 'CHECK_IN') {
        const { data: dailyRow } = await supabase
          .from('attendance_daily')
          .upsert(
            {
              organization_id: params.organizationId,
              employee_id: params.review.employee_id,
              attendance_date: todayIst,
              first_check_in: now,
              status: 'PRESENT',
              payable_status: 1.0,
              check_in_location_name: 'FaceAttend Supervisor Fallback',
              updated_at: now,
            },
            { onConflict: 'employee_id,attendance_date' }
          )
          .select('id')
          .maybeSingle();
        committedDailyId = dailyRow?.id || null;
      } else {
        const { data: openDaily } = await supabase
          .from('attendance_daily')
          .select('id, first_check_in')
          .eq('employee_id', params.review.employee_id)
          .is('last_check_out', null)
          .not('first_check_in', 'is', null)
          .order('attendance_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (openDaily?.id) {
          const mins = Math.max(
            0,
            Math.round((Date.now() - new Date(openDaily.first_check_in).getTime()) / 60000)
          );
          await supabase
            .from('attendance_daily')
            .update({
              last_check_out: now,
              total_work_minutes: mins,
              check_out_location_name: 'FaceAttend Supervisor Fallback',
              updated_at: now,
            })
            .eq('id', openDaily.id);
          committedDailyId = openDaily.id;
        }
      }
    }

    const { error } = await supabase
      .from('faceattend_exception_reviews')
      .update({
        review_status: params.decision,
        reviewed_by: params.actorUserId || null,
        reviewed_at: now,
        review_notes: params.notes,
        committed_punch_id: committedPunchId,
        committed_daily_id: committedDailyId,
      })
      .eq('id', params.review.id)
      .eq('organization_id', params.organizationId);

    if (error) return { ok: false, error: error.message };

    await supabase.from('faceattend_audit_logs').insert({
      organization_id: params.organizationId,
      actor_user_id: params.actorUserId || null,
      event_type: `EXCEPTION_REVIEW_${params.decision}`,
      target_type: 'faceattend_exception_reviews',
      target_id: params.review.id,
      metadata: {
        employee_id: params.review.employee_id,
        committed_punch_id: committedPunchId,
        notes: params.notes,
      },
    });

    return { ok: true };
  },

  async listWorkLocations(organizationId: string) {
    const { data, error } = await supabase
      .from('work_locations')
      .select('id, name, address, latitude, longitude, geofence_radius_meters, is_active')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });

    if (error) return [];
    return data || [];
  },

  async listAuditLogs(organizationId: string): Promise<FaceAttendAuditLog[]> {
    const { data, error } = await supabase
      .from('faceattend_audit_logs')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(120);

    if (error) return [];
    return (data || []) as FaceAttendAuditLog[];
  },

  subscribeToFaceAttendRealtime(organizationId: string, onEvent: () => void) {
    const channel = supabase
      .channel(`faceattend_realtime_${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'faceattend_verification_attempts',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => onEvent()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'faceattend_exception_reviews',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => onEvent()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'faceattend_templates',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => onEvent()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_daily',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => onEvent()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  async getEngineStatus(): Promise<import('../../types/faceAttend').FaceAttendEngineStatus | null> {
    const { data, error } = await supabase.functions.invoke('face-attend-verify', {
      body: { action: 'engine_status' },
    });
    if (error || !data) {
      console.warn('[FaceAttendService] getEngineStatus error:', error?.message);
      return null;
    }
    return data as import('../../types/faceAttend').FaceAttendEngineStatus;
  },
};

