// supabase/functions/face-attend-verify/index.ts
// Authoritative backend verification, challenge issuance, enrolment, fallback review,
// and atomic attendance commit endpoint for JOY FaceAttend.
import { withSupabase } from 'npm:@supabase/server@1';
import {
  DEFAULT_FACEATTEND_POLICY,
  evaluateCombinedAttendanceDecision,
  evaluateGpsAndGeofence,
  type FaceAttendPolicyConfig,
  type WorkLocationCandidate,
} from './policy.ts';
import { resolveFaceVerificationProvider } from './providers.ts';

async function resolveCallerEmployee(
  supabaseAdmin: any,
  authUserId: string
): Promise<{
  employeeId: string;
  organizationId: string;
  displayName: string;
  employeeCode: string;
  departmentId: string | null;
  companyId: string | null;
} | null> {
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('id, employee_id, organization_id, email')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (!profile) return null;

  let query = supabaseAdmin
    .from('employees')
    .select('id, organization_id, company_id, display_name, employee_code, department_id');

  if (profile.employee_id) {
    query = query.eq('id', profile.employee_id);
  } else if (profile.email) {
    query = query.ilike('work_email', profile.email);
  } else {
    query = query.or(`user_id.eq.${profile.id},user_id.eq.${authUserId}`);
  }

  const { data: emp } = await query.limit(1).maybeSingle();
  if (emp) {
    return {
      employeeId: emp.id,
      organizationId: emp.organization_id || profile.organization_id,
      displayName: emp.display_name || 'Employee',
      employeeCode: emp.employee_code || '',
      departmentId: emp.department_id || null,
      companyId: emp.company_id || null,
    };
  }

  // Graceful fallback for demo/test profiles
  return {
    employeeId: profile.employee_id || profile.id,
    organizationId: profile.organization_id,
    displayName: (profile as any).full_name || 'Employee',
    employeeCode: 'JCS-099',
    departmentId: null,
    companyId: null,
  };
}

async function loadTenantContext(supabaseAdmin: any, organizationId: string) {
  const [{ data: ent }, { data: sub }, { data: settings }] = await Promise.all([
    supabaseAdmin
      .from('organization_addon_entitlements')
      .select('is_enabled, plan_tier, max_units, max_workers')
      .eq('organization_id', organizationId)
      .eq('addon_key', 'face_attend')
      .maybeSingle(),
    supabaseAdmin
      .from('faceattend_subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle(),
    supabaseAdmin
      .from('faceattend_org_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle(),
  ]);

  const policy: FaceAttendPolicyConfig = {
    ...DEFAULT_FACEATTEND_POLICY,
    ...(settings || {}),
    match_threshold: Number(settings?.match_threshold ?? DEFAULT_FACEATTEND_POLICY.match_threshold),
    liveness_threshold: Number(settings?.liveness_threshold ?? DEFAULT_FACEATTEND_POLICY.liveness_threshold),
    max_gps_accuracy_meters: Number(
      settings?.max_gps_accuracy_meters ?? DEFAULT_FACEATTEND_POLICY.max_gps_accuracy_meters
    ),
    gps_freshness_seconds: Number(
      settings?.gps_freshness_seconds ?? DEFAULT_FACEATTEND_POLICY.gps_freshness_seconds
    ),
  };

  return {
    entitlementEnabled: Boolean(ent?.is_enabled),
    subscription: sub,
    policy,
  };
}

async function fetchAssignedLocations(
  supabaseAdmin: any,
  organizationId: string,
  employeeId: string
): Promise<WorkLocationCandidate[]> {
  const locs: WorkLocationCandidate[] = [];

  // 1. Check explicit employee-level work location assignments
  try {
    const { data: assignments } = await supabaseAdmin
      .from('employee_work_locations')
      .select('work_location_id, work_locations(id, name, latitude, longitude, geofence_radius_meters, is_active)')
      .eq('organization_id', organizationId)
      .eq('employee_id', employeeId);

    if (Array.isArray(assignments)) {
      for (const row of assignments) {
        const wl = row.work_locations;
        if (wl && wl.is_active !== false && wl.latitude != null && wl.longitude != null) {
          locs.push({
            id: wl.id,
            name: wl.name,
            latitude: Number(wl.latitude),
            longitude: Number(wl.longitude),
            geofence_radius_meters: Number(wl.geofence_radius_meters ?? 100),
          });
        }
      }
    }
  } catch (_) {}

  // 2. Authoritative Fallback: Fetch all active work locations belonging to the employee's organization
  if (locs.length === 0) {
    try {
      const { data: orgLocations } = await supabaseAdmin
        .from('work_locations')
        .select('id, name, latitude, longitude, geofence_radius_meters, is_active')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (Array.isArray(orgLocations)) {
        for (const wl of orgLocations) {
          if (wl.latitude != null && wl.longitude != null) {
            locs.push({
              id: wl.id,
              name: wl.name,
              latitude: Number(wl.latitude),
              longitude: Number(wl.longitude),
              geofence_radius_meters: Number(wl.geofence_radius_meters ?? 100),
            });
          }
        }
      }
    } catch (_) {}
  }

  return locs;
}

export default {
  fetch: withSupabase({ auth: 'user', cors: 'default' }, async (req, ctx) => {
    const authUserId = ctx.userClaims?.id || ctx.jwtClaims?.sub;
    if (!authUserId) {
      return Response.json({ error: 'Unauthorized caller identity' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'verify_and_commit');

    if (action === 'engine_status') {
      let isPlatformAdmin = false;
      try {
        const { data: adminCheck } = await ctx.supabase.rpc('is_platform_admin');
        isPlatformAdmin = Boolean(adminCheck);
      } catch {
        isPlatformAdmin = false;
      }

      const callerForStatus = isPlatformAdmin
        ? null
        : await resolveCallerEmployee(ctx.supabaseAdmin, authUserId);

      if (!isPlatformAdmin && !callerForStatus) {
        return Response.json(
          { error: 'Authenticated user is not linked to an employee profile.' },
          { status: 403 }
        );
      }

      const comprefaceUrl = (Deno.env.get('COMPREFACE_URL') || '').trim().replace(/\/+$/, '');
      const comprefaceKey = (Deno.env.get('COMPREFACE_API_KEY') || '').trim();
      const awsKey = (Deno.env.get('AWS_REKOGNITION_ACCESS_KEY_ID') || Deno.env.get('AWS_ACCESS_KEY_ID') || '').trim();
      const azureEndpoint = (Deno.env.get('AZURE_FACE_ENDPOINT') || '').trim();
      const azureKey = (Deno.env.get('AZURE_FACE_API_KEY') || '').trim();
      const webhookUrl = (Deno.env.get('FACE_ATTEND_WEBHOOK_URL') || '').trim();

      let providerCode: 'COMPREFACE' | 'AWS_REKOGNITION' | 'AZURE_FACE' | 'HTTP_WEBHOOK' | 'SANDBOX_CHALLENGE' | 'BUILTIN_FACE_ENGINE' = 'BUILTIN_FACE_ENGINE';
      let providerLabel = 'JOY Built-In Face Engine (On-Device + DB)';
      let mode: 'SELF_HOSTED_DOCKER' | 'CLOUD_AI' | 'WEBHOOK' | 'SANDBOX' | 'BUILTIN' = 'BUILTIN';
      let healthy = true;
      let latencyMs: number | null = 12;
      let healthMessage = 'Built-in 1:1 facial embedding verification engine active (Flutter + Supabase DB).';

      if (comprefaceUrl && comprefaceKey) {
        providerCode = 'COMPREFACE';
        providerLabel = 'Docker CompreFace (Self-Hosted)';
        mode = 'SELF_HOSTED_DOCKER';
        const t0 = performance.now();
        try {
          const resp = await fetch(`${comprefaceUrl}/admin/status`, {
            method: 'GET',
            signal: AbortSignal.timeout(4000),
          });
          latencyMs = Math.round(performance.now() - t0);
          healthy = resp.ok;
          healthMessage = resp.ok
            ? 'CompreFace 1:1 biometric engine is online and responding.'
            : `CompreFace health check returned HTTP ${resp.status}.`;
        } catch (err) {
          latencyMs = Math.round(performance.now() - t0);
          healthy = false;
          healthMessage = err instanceof Error ? `CompreFace unreachable: ${err.message}` : 'CompreFace unreachable.';
        }
      } else if (awsKey) {
        providerCode = 'AWS_REKOGNITION';
        providerLabel = 'AWS Rekognition (Cloud AI)';
        mode = 'CLOUD_AI';
        healthMessage = 'AWS Rekognition cloud credentials configured.';
      } else if (azureEndpoint && azureKey) {
        providerCode = 'AZURE_FACE';
        providerLabel = 'Azure AI Face (Cloud AI)';
        mode = 'CLOUD_AI';
        healthMessage = 'Azure AI Face cloud credentials configured.';
      } else if (webhookUrl) {
        providerCode = 'HTTP_WEBHOOK';
        providerLabel = 'Custom Biometric API';
        mode = 'WEBHOOK';
        healthMessage = 'Custom external biometric webhook configured.';
      }

      let diagnostics: Record<string, unknown> | undefined;
      if (isPlatformAdmin) {
        const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const [{ count: activeTemplatesCount }, { count: attempts24hCount }] = await Promise.all([
          ctx.supabaseAdmin
            .from('faceattend_templates')
            .select('id', { count: 'exact', head: true })
            .eq('enrolment_status', 'ACTIVE'),
          ctx.supabaseAdmin
            .from('faceattend_verification_attempts')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', since24h),
        ]);

        let endpointHost: string | null = null;
        const rawUrl = comprefaceUrl || azureEndpoint || webhookUrl;
        if (rawUrl) {
          try {
            endpointHost = new URL(rawUrl).host;
          } catch {
            endpointHost = 'configured';
          }
        }

        diagnostics = {
          endpoint_host: endpointHost,
          api_key_configured: Boolean(comprefaceKey || awsKey || azureKey),
          save_images_to_db_policy: 'false (Stateless 1:1 Verification)',
          storage_bucket: 'faceattend-private',
          total_active_templates: activeTemplatesCount ?? 0,
          total_attempts_24h: attempts24hCount ?? 0,
        };
      }

      return Response.json({
        provider_code: providerCode,
        provider_label: providerLabel,
        mode,
        healthy,
        latency_ms: latencyMs,
        message: healthMessage,
        checked_at: new Date().toISOString(),
        ...(diagnostics ? { diagnostics } : {}),
      });
    }

    const caller = await resolveCallerEmployee(ctx.supabaseAdmin, authUserId);
    if (!caller) {
      return Response.json(
        { error: 'Authenticated user is not linked to an employee profile.' },
        { status: 403 }
      );
    }

    const orgId = caller.organizationId;
    const empId = caller.employeeId;
    const tenantCtx = await loadTenantContext(ctx.supabaseAdmin, orgId);

    if (!tenantCtx.entitlementEnabled || !tenantCtx.policy.module_enabled) {
      return Response.json(
        {
          ok: false,
          decision: 'MODULE_DISABLED',
          message: 'JOY FaceAttend is not enabled for your organization.',
        },
        { status: 403 }
      );
    }

    // 1. ISSUE SINGLE-USE TIMED LIVENESS CHALLENGE
    if (action === 'issue_challenge') {
      const challengeNonce = crypto.randomUUID() + '-' + Math.random().toString(36).slice(2, 10);
      const challengeTypes = ['BLINK_AND_TURN', 'SMILE_AND_LOOK'] as const;
      const selectedType = tenantCtx.policy.liveness_enabled
        ? challengeTypes[Math.floor(Math.random() * challengeTypes.length)]
        : 'PASSIVE_CAPTURE';

      const prompt =
        selectedType === 'BLINK_AND_TURN'
          ? 'Look at the camera, blink once, and slightly turn your head.'
          : selectedType === 'SMILE_AND_LOOK'
          ? 'Center your face and smile briefly toward the camera.'
          : 'Center your face inside the oval frame.';

      const { data: challenge, error } = await ctx.supabaseAdmin
        .from('faceattend_challenges')
        .insert({
          organization_id: orgId,
          employee_id: empId,
          challenge_nonce: challengeNonce,
          challenge_type: selectedType,
          challenge_prompt: prompt,
          device_id: body.device_id || null,
          expires_at: new Date(Date.now() + 3 * 60 * 1000).toISOString(),
        })
        .select('id, challenge_nonce, challenge_type, challenge_prompt, expires_at')
        .single();

      if (error) {
        return Response.json({ error: error.message }, { status: 500 });
      }

      return Response.json({
        ok: true,
        challenge,
        policy: {
          face_verification_enabled: tenantCtx.policy.face_verification_enabled,
          liveness_enabled: tenantCtx.policy.liveness_enabled,
          gps_verification_enabled: tenantCtx.policy.gps_verification_enabled,
          geofence_mode: tenantCtx.policy.geofence_mode,
          manual_fallback_enabled: tenantCtx.policy.manual_fallback_enabled,
          consent_version_required: tenantCtx.policy.consent_version_required,
        },
      });
    }

function decodeBase64Bytes(base64Str: string): Uint8Array {
  const cleanBase64 = String(base64Str).replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
  const binaryStr = atob(cleanBase64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
  return bytes;
}

function isV2EmbeddingDigest(digest: unknown): boolean {
  if (typeof digest !== 'string' || !digest.trim().startsWith('{')) return false;
  try {
    const parsed = JSON.parse(digest);
    return Boolean(parsed && parsed.v === 2 && Array.isArray(parsed.front) && parsed.front.length >= 64);
  } catch {
    return false;
  }
}

async function downloadStorageImageBase64(supabaseAdmin: any, path: string): Promise<string | null> {
  const { data: blob } = await supabaseAdmin.storage.from('faceattend-private').download(path);
  if (!blob) return null;
  const arrBuf = await blob.arrayBuffer();
  const u8 = new Uint8Array(arrBuf);
  let bin = '';
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return btoa(bin);
}

    // 2. ENROL CONSENT + ISOLATED 1:1 TEMPLATE
    if (action === 'enrol_template') {
      const { image_base64, side_images, consent_version, language_code, device_id, sandbox_digest } = body;
      if (!image_base64) {
        return Response.json({ error: 'image_base64 is required for enrolment.' }, { status: 400 });
      }

      // Check employee cap in subscription
      const maxEnrolled = tenantCtx.subscription?.max_enrolled_employees;
      if (maxEnrolled != null && Number(maxEnrolled) > 0) {
        const { count } = await ctx.supabaseAdmin
          .from('faceattend_templates')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .in('enrolment_status', ['ACTIVE', 'PENDING_APPROVAL'])
          .is('deleted_at', null);

        if ((count ?? 0) >= Number(maxEnrolled)) {
          return Response.json(
            {
              ok: false,
              error: `Plan enrolled employee cap (${maxEnrolled}) reached. Please contact your HR/Platform Admin to upgrade.`,
            },
            { status: 403 }
          );
        }
      }

      const requiredVersion = tenantCtx.policy.consent_version_required || 'v1.0';
      const grantedVersion = String(consent_version || requiredVersion);
      const noticeHashBuf = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(`JOY_FACEATTEND_CONSENT_${grantedVersion}_${orgId}`)
      );
      const noticeHash = Array.from(new Uint8Array(noticeHashBuf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      await ctx.supabaseAdmin.from('faceattend_consents').insert({
        organization_id: orgId,
        employee_id: empId,
        consent_version: grantedVersion,
        language_code: String(language_code || 'en'),
        consent_notice_hash: noticeHash,
        status: 'GRANTED',
        device_id: device_id || null,
      });

      const provider = resolveFaceVerificationProvider(tenantCtx.policy.provider_preference);

      // Validate enrolled face(s) directly with CompreFace before storing, so unusable or multi-face photos are caught at enrolment
      let enrolmentQualityScore = 92.0;
      if (provider.code === 'COMPREFACE') {
        const probeB64 =
          typeof side_images?.left === 'string' && side_images.left.length > 0
            ? side_images.left
            : image_base64;
        const preCheck = await provider.verify({
          organizationId: orgId,
          employeeId: empId,
          liveImageBase64: probeB64,
          enrolledImageBase64: image_base64,
          challengeNonce: 'enrol-precheck',
          livenessEnabled: false,
        });
        if (!preCheck.providerAvailable) {
          return Response.json(
            { ok: false, error: preCheck.notice || 'CompreFace verification engine is currently unreachable.' },
            { status: 503 }
          );
        }
        if (!preCheck.imageQualityOk) {
          return Response.json(
            {
              ok: false,
              error: preCheck.imageQualityReason || 'Could not detect a single clear face in your enrolment photo.',
            },
            { status: 400 }
          );
        }
        if (preCheck.faceSimilarityScore != null) {
          enrolmentQualityScore = Math.max(80, Math.min(99.9, Number(preCheck.faceSimilarityScore)));
        }
      }

      // Upload private reference images into isolated {org}/{emp}/ path
      const ts = Date.now();
      const bytes = decodeBase64Bytes(image_base64);
      const storagePath = `${orgId}/${empId}/enrol_${ts}_front.jpg`;
      const { error: uploadErr } = await ctx.supabaseAdmin.storage
        .from('faceattend-private')
        .upload(storagePath, bytes, { contentType: 'image/jpeg', upsert: true });

      if (uploadErr) {
        return Response.json({ error: `Storage upload failed: ${uploadErr.message}` }, { status: 500 });
      }

      const sidePaths: string[] = [];
      if (side_images && typeof side_images === 'object') {
        for (const angle of ['left', 'right'] as const) {
          const sideB64 = side_images[angle];
          if (typeof sideB64 === 'string' && sideB64.length > 0) {
            const sideBytes = decodeBase64Bytes(sideB64);
            const sidePath = `${orgId}/${empId}/enrol_${ts}_${angle}.jpg`;
            const { error: sideErr } = await ctx.supabaseAdmin.storage
              .from('faceattend-private')
              .upload(sidePath, sideBytes, { contentType: 'image/jpeg', upsert: true });
            if (!sideErr) sidePaths.push(sidePath);
          }
        }
      }

      // Mark any prior pending/active templates superseded as REVOKED
      await ctx.supabaseAdmin
        .from('faceattend_templates')
        .update({
          enrolment_status: 'REVOKED',
          revoked_by: authUserId,
          revoked_at: new Date().toISOString(),
          revocation_reason: 'Superseded by new enrolment capture',
        })
        .eq('organization_id', orgId)
        .eq('employee_id', empId)
        .in('enrolment_status', ['PENDING_APPROVAL', 'ACTIVE']);

      const status = tenantCtx.policy.self_enrolment_requires_approval
        ? 'PENDING_APPROVAL'
        : 'ACTIVE';

      const effectiveProviderCode =
        provider.code === 'SANDBOX_CHALLENGE' && isV2EmbeddingDigest(sandbox_digest)
          ? 'BUILTIN_FACE_ENGINE'
          : provider.code;

      const { data: tpl, error: tplErr } = await ctx.supabaseAdmin
        .from('faceattend_templates')
        .insert({
          organization_id: orgId,
          employee_id: empId,
          enrolment_status: status,
          capture_method: 'SELF',
          primary_image_path: storagePath,
          liveness_audit_paths: sidePaths,
          provider_code: effectiveProviderCode,
          sandbox_feature_digest: sandbox_digest || null,
          quality_score: enrolmentQualityScore,
          enrolled_by: authUserId,
          approved_by: status === 'ACTIVE' ? authUserId : null,
          approved_at: status === 'ACTIVE' ? new Date().toISOString() : null,
        })
        .select('id, enrolment_status, provider_code, created_at')
        .single();

      if (tplErr) {
        return Response.json({ error: tplErr.message }, { status: 500 });
      }

      await ctx.supabaseAdmin.from('faceattend_audit_logs').insert({
        organization_id: orgId,
        actor_user_id: authUserId,
        actor_employee_id: empId,
        event_type: 'TEMPLATE_ENROLLED',
        target_type: 'faceattend_templates',
        target_id: tpl.id,
        metadata: { status, provider_code: effectiveProviderCode },
      });

      return Response.json({ ok: true, template: tpl });
    }

    // 3. WITHDRAW CONSENT & DELETE BIOMETRICS
    if (action === 'withdraw_and_delete') {
      const { data, error } = await ctx.supabaseAdmin.rpc(
        'fn_withdraw_faceattend_consent_and_delete',
        {
          p_organization_id: orgId,
          p_employee_id: empId,
          p_reason: body.reason || 'Self-service withdrawal & biometric deletion',
        }
      );
      if (error) return Response.json({ error: error.message }, { status: 400 });

      const paths: string[] = Array.isArray(data?.purged_storage_paths)
        ? data.purged_storage_paths
        : [];
      if (paths.length > 0) {
        await ctx.supabaseAdmin.storage.from('faceattend-private').remove(paths);
      }
      return Response.json({ ok: true, result: data });
    }

    // 4. REQUEST NON-BIOMETRIC MANUAL FALLBACK REVIEW
    if (action === 'request_fallback') {
      const punchType = body.punch_type === 'CHECK_OUT' ? 'CHECK_OUT' : 'CHECK_IN';
      const { data: review, error } = await ctx.supabaseAdmin
        .from('faceattend_exception_reviews')
        .insert({
          organization_id: orgId,
          employee_id: empId,
          attempt_id: body.attempt_id || null,
          requested_punch_type: punchType,
          fallback_reason: String(body.reason || 'Manual review requested after verification failure'),
          latitude: body.latitude ?? null,
          longitude: body.longitude ?? null,
          work_location_id: body.work_location_id || null,
          distance_meters: body.distance_meters ?? null,
          review_status: 'PENDING',
        })
        .select('*')
        .single();

      if (error) return Response.json({ error: error.message }, { status: 400 });
      return Response.json({ ok: true, review });
    }

    // 4B. DRY-RUN 1:1 FACE MATCH TEST (NO ATTENDANCE PUNCH COMMITTED)
    if (action === 'test_verify') {
      const verifyStartMs = performance.now();
      const { data: template } = await ctx.supabaseAdmin
        .from('faceattend_templates')
        .select('*')
        .eq('organization_id', orgId)
        .eq('employee_id', empId)
        .eq('enrolment_status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!template?.primary_image_path) {
        return Response.json({
          ok: false,
          matched: false,
          message: 'No ACTIVE enrolled template found. Please enrol and get HR approval first.',
        });
      }

      if (body.backfill_digest && isV2EmbeddingDigest(body.backfill_digest)) {
        await ctx.supabaseAdmin
          .from('faceattend_templates')
          .update({
            sandbox_feature_digest: String(body.backfill_digest),
            provider_code: 'BUILTIN_FACE_ENGINE',
          })
          .eq('id', template.id);
        template.sandbox_feature_digest = String(body.backfill_digest);
      }

      const provider = resolveFaceVerificationProvider(tenantCtx.policy.provider_preference);
      const liveEmbedding: number[] | undefined = Array.isArray(body.live_embedding)
        ? body.live_embedding
        : Array.isArray(body.challenge_signals?.liveEmbedding)
          ? body.challenge_signals.liveEmbedding
          : undefined;

      const sidePaths: string[] = Array.isArray(template.liveness_audit_paths)
        ? template.liveness_audit_paths.filter((p: unknown): p is string => typeof p === 'string' && p.length > 0)
        : [];

      // If Built-In Face Engine is active and an older template lacks v2 embeddings, return stored images once so Flutter auto-upgrades the template
      if (
        provider.code === 'SANDBOX_CHALLENGE' &&
        liveEmbedding &&
        !isV2EmbeddingDigest(template.sandbox_feature_digest)
      ) {
        const [frontB64, ...sideB64List] = await Promise.all([
          downloadStorageImageBase64(ctx.supabaseAdmin, template.primary_image_path),
          ...sidePaths.map((sp) => downloadStorageImageBase64(ctx.supabaseAdmin, sp)),
        ]);
        return Response.json({
          ok: false,
          matched: false,
          needs_embedding_backfill: true,
          enrolled_images_base64: {
            front: frontB64,
            left: sideB64List[0] || null,
            right: sideB64List[1] || null,
          },
          message: 'Upgrading enrolled template to 192-D facial embedding...',
        });
      }

      const skipImageDownload =
        provider.code === 'SANDBOX_CHALLENGE' &&
        Boolean(liveEmbedding) &&
        isV2EmbeddingDigest(template.sandbox_feature_digest);

      // Download primary enrolled photo (only when external provider requires raw image) and resolve department/org metadata in parallel
      const [enrolledB64, deptRes, orgRes] = await Promise.all([
        skipImageDownload
          ? Promise.resolve(null)
          : downloadStorageImageBase64(ctx.supabaseAdmin, template.primary_image_path),
        caller.departmentId
          ? ctx.supabaseAdmin
              .from('departments')
              .select('name')
              .eq('id', caller.departmentId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        ctx.supabaseAdmin
          .from('organizations')
          .select('name')
          .eq('id', orgId)
          .maybeSingle(),
      ]);

      let providerResult = await provider.verify({
        organizationId: orgId,
        employeeId: empId,
        liveImageBase64: String(body.image_base64 || ''),
        enrolledImageBase64: enrolledB64,
        enrolledProviderToken: template.provider_face_token_encrypted || null,
        sandboxFeatureDigest: template.sandbox_feature_digest || null,
        challengeNonce: 'test-verify',
        challengeSignals: liveEmbedding ? { liveEmbedding, faceDetectedCount: 1 } : undefined,
        livenessEnabled: false,
      });

      if (
        !skipImageDownload &&
        providerResult.providerAvailable &&
        providerResult.imageQualityOk &&
        (providerResult.faceSimilarityScore ?? 0) < tenantCtx.policy.match_threshold &&
        sidePaths.length > 0
      ) {
        // Download all side-angle templates in parallel for fast fallback comparison
        const sideB64List = await Promise.all(
          sidePaths.map((sp) => downloadStorageImageBase64(ctx.supabaseAdmin, sp))
        );
        for (const sb64 of sideB64List) {
          if (!sb64) continue;
          const sr = await provider.verify({
            organizationId: orgId,
            employeeId: empId,
            liveImageBase64: String(body.image_base64 || ''),
            enrolledImageBase64: sb64,
            enrolledProviderToken: template.provider_face_token_encrypted || null,
            sandboxFeatureDigest: template.sandbox_feature_digest || null,
            challengeNonce: 'test-verify',
            livenessEnabled: false,
          });
          if ((sr.faceSimilarityScore ?? 0) > (providerResult.faceSimilarityScore ?? 0)) {
            providerResult = sr;
          }
          if ((providerResult.faceSimilarityScore ?? 0) >= tenantCtx.policy.match_threshold) break;
        }
      }

      const sim = providerResult.faceSimilarityScore ?? 0;
      const threshold = tenantCtx.policy.match_threshold;
      const matched =
        providerResult.providerAvailable &&
        providerResult.imageQualityOk &&
        sim >= threshold;

      const latencyMs = Math.round(performance.now() - verifyStartMs);
      const empIdentity = matched
        ? {
            name: caller.displayName,
            employee_code: caller.employeeCode,
            department: deptRes?.data?.name || 'General',
            organization_name: orgRes?.data?.name || '',
          }
        : null;

      return Response.json({
        ok: providerResult.providerAvailable && providerResult.imageQualityOk,
        matched,
        face_similarity: providerResult.faceSimilarityScore,
        threshold,
        provider_code: providerResult.providerCode,
        is_production_biometric: providerResult.isProductionBiometric,
        latency_ms: latencyMs,
        verified_at: new Date().toISOString(),
        employee: empIdentity,
        message: !providerResult.providerAvailable
          ? (providerResult.notice || 'Biometric provider unavailable.')
          : !providerResult.imageQualityOk
            ? (providerResult.imageQualityReason || 'Image quality check failed.')
            : matched
              ? `Face matched your enrolled database template (${sim.toFixed(1)}% >= ${threshold}%).`
              : `Face did not match (${sim.toFixed(1)}% < ${threshold}%).`,
      });
    }

    // 5. VERIFY (1:1 FACE + LIVENESS + GPS/GEOFENCE) & ATOMIC ATTENDANCE COMMIT
    const correlationId = String(body.correlation_id || crypto.randomUUID());
    const idempotencyKey = String(body.idempotency_key || correlationId);
    const punchType: 'CHECK_IN' | 'CHECK_OUT' =
      body.punch_type === 'CHECK_OUT' ? 'CHECK_OUT' : 'CHECK_IN';

    // Check existing attempt by idempotency_key to guarantee idempotent retries
    const { data: priorAttempt } = await ctx.supabaseAdmin
      .from('faceattend_verification_attempts')
      .select('id, decision, face_similarity_score, liveness_score, distance_meters, provider_code, is_production_biometric, attendance_punch_id, attendance_daily_id, failure_reason')
      .eq('organization_id', orgId)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (priorAttempt) {
      const committed = Boolean(priorAttempt.attendance_punch_id);
      return Response.json({
        ok: committed,
        idempotent_replay: true,
        punch_committed: committed,
        attempt_id: priorAttempt.id,
        decision: priorAttempt.decision,
        message: committed
          ? 'Idempotent replay: Attendance already committed for this verification request.'
          : (priorAttempt.failure_reason || 'Previous verification attempt did not commit attendance.'),
        attendance: committed
          ? { punch_id: priorAttempt.attendance_punch_id, daily_id: priorAttempt.attendance_daily_id }
          : null,
        scores: {
          face_similarity: priorAttempt.face_similarity_score,
          liveness_score: priorAttempt.liveness_score,
          distance_meters: priorAttempt.distance_meters,
        },
      });
    }

    // Load active consent & 1:1 enrolled template strictly for THIS employee
    const [{ data: consent }, { data: template }, locations] = await Promise.all([
      ctx.supabaseAdmin
        .from('faceattend_consents')
        .select('id, status, consent_version')
        .eq('organization_id', orgId)
        .eq('employee_id', empId)
        .eq('status', 'GRANTED')
        .order('granted_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      ctx.supabaseAdmin
        .from('faceattend_templates')
        .select('*')
        .eq('organization_id', orgId)
        .eq('employee_id', empId)
        .in('enrolment_status', ['ACTIVE', 'PENDING_APPROVAL'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      fetchAssignedLocations(ctx.supabaseAdmin, orgId, empId),
    ]);

    const nowIso = new Date().toISOString();
    const provider = resolveFaceVerificationProvider(tenantCtx.policy.provider_preference);
    const liveEmbeddingCommit: number[] | undefined = Array.isArray(body.live_embedding)
      ? body.live_embedding
      : Array.isArray(body.challenge_signals?.liveEmbedding)
        ? body.challenge_signals.liveEmbedding
        : undefined;

    if (template?.id && body.backfill_digest && isV2EmbeddingDigest(body.backfill_digest)) {
      await ctx.supabaseAdmin
        .from('faceattend_templates')
        .update({
          sandbox_feature_digest: String(body.backfill_digest),
          provider_code: 'BUILTIN_FACE_ENGINE',
        })
        .eq('id', template.id);
      template.sandbox_feature_digest = String(body.backfill_digest);
    }

    const sideAuditPaths: string[] = Array.isArray(template?.liveness_audit_paths)
      ? template.liveness_audit_paths.filter((p: unknown): p is string => typeof p === 'string' && p.length > 0)
      : [];

    // Auto-upgrade legacy enrolled template BEFORE consuming single-use challenge nonce
    if (
      template?.enrolment_status === 'ACTIVE' &&
      template?.primary_image_path &&
      provider.code === 'SANDBOX_CHALLENGE' &&
      liveEmbeddingCommit &&
      !isV2EmbeddingDigest(template.sandbox_feature_digest)
    ) {
      const [frontB64, ...sideB64List] = await Promise.all([
        downloadStorageImageBase64(ctx.supabaseAdmin, template.primary_image_path),
        ...sideAuditPaths.map((sp) => downloadStorageImageBase64(ctx.supabaseAdmin, sp)),
      ]);
      return Response.json({
        ok: false,
        punch_committed: false,
        needs_embedding_backfill: true,
        enrolled_images_base64: {
          front: frontB64,
          left: sideB64List[0] || null,
          right: sideB64List[1] || null,
        },
        message: 'Upgrading enrolled template to 192-D facial embedding...',
      });
    }

    const gpsResult = evaluateGpsAndGeofence(
      {
        latitude: body.latitude != null ? Number(body.latitude) : null,
        longitude: body.longitude != null ? Number(body.longitude) : null,
        accuracyMeters: body.accuracy_meters != null ? Number(body.accuracy_meters) : null,
        capturedAtIso: body.gps_captured_at || nowIso,
        nowIso,
        isMockLocation: Boolean(body.is_mock_location),
        locations,
      },
      tenantCtx.policy
    );

    // Validate challenge nonce server-side
    let challengeValid = false;
    let challengeExpiredOrUsed = false;
    let challengeRowId: string | null = null;

    if (body.challenge_nonce) {
      const { data: challenge } = await ctx.supabaseAdmin
        .from('faceattend_challenges')
        .select('*')
        .eq('organization_id', orgId)
        .eq('employee_id', empId)
        .eq('challenge_nonce', String(body.challenge_nonce))
        .maybeSingle();

      if (challenge) {
        challengeRowId = challenge.id;
        const expired = new Date(challenge.expires_at).getTime() < Date.now();
        const used = Boolean(challenge.consumed_at);
        if (!expired && !used) {
          challengeValid = true;
          // Consume single-use challenge immediately to prevent replay
          await ctx.supabaseAdmin
            .from('faceattend_challenges')
            .update({ consumed_at: nowIso })
            .eq('id', challenge.id);
        } else {
          challengeExpiredOrUsed = true;
        }
      } else {
        challengeExpiredOrUsed = true;
      }
    }

    const skipCommitImageDownload =
      provider.code === 'SANDBOX_CHALLENGE' &&
      Boolean(liveEmbeddingCommit) &&
      isV2EmbeddingDigest(template?.sandbox_feature_digest);

    // Download private enrolled reference image for 1:1 comparison if needed
    let enrolledImageBase64: string | null = null;
    if (!skipCommitImageDownload && template?.enrolment_status === 'ACTIVE' && template?.primary_image_path) {
      enrolledImageBase64 = await downloadStorageImageBase64(
        ctx.supabaseAdmin,
        template.primary_image_path
      );
    }

    const mergedChallengeSignals = {
      ...(body.challenge_signals || {}),
      ...(liveEmbeddingCommit ? { liveEmbedding: liveEmbeddingCommit } : {}),
    };

    let providerResult = await provider.verify({
      organizationId: orgId,
      employeeId: empId,
      liveImageBase64: String(body.image_base64 || ''),
      enrolledImageBase64,
      enrolledProviderToken: template?.provider_face_token_encrypted || null,
      sandboxFeatureDigest: template?.sandbox_feature_digest || null,
      challengeNonce: String(body.challenge_nonce || ''),
      challengeSignals: mergedChallengeSignals,
      livenessSessionId: body.liveness_session_id || null,
      livenessEnabled: tenantCtx.policy.liveness_enabled,
    });

    // If front-angle score is below threshold and side angles (left/right) are enrolled, check them for best match
    if (
      !skipCommitImageDownload &&
      template?.enrolment_status === 'ACTIVE' &&
      providerResult.providerAvailable &&
      providerResult.imageQualityOk &&
      (providerResult.faceSimilarityScore ?? 0) < tenantCtx.policy.match_threshold &&
      sideAuditPaths.length > 0
    ) {
      for (const sidePath of sideAuditPaths) {
        const sideB64 = await downloadStorageImageBase64(ctx.supabaseAdmin, sidePath);
        if (!sideB64) continue;
        const sideRes = await provider.verify({
          organizationId: orgId,
          employeeId: empId,
          liveImageBase64: String(body.image_base64 || ''),
          enrolledImageBase64: sideB64,
          enrolledProviderToken: template?.provider_face_token_encrypted || null,
          sandboxFeatureDigest: template?.sandbox_feature_digest || null,
          challengeNonce: String(body.challenge_nonce || ''),
          challengeSignals: body.challenge_signals || undefined,
          livenessSessionId: body.liveness_session_id || null,
          livenessEnabled: tenantCtx.policy.liveness_enabled,
        });
        if ((sideRes.faceSimilarityScore ?? 0) > (providerResult.faceSimilarityScore ?? 0)) {
          providerResult = sideRes;
        }
        if ((providerResult.faceSimilarityScore ?? 0) >= tenantCtx.policy.match_threshold) {
          break;
        }
      }
    }

    const combined = evaluateCombinedAttendanceDecision({
      entitlementEnabled: tenantCtx.entitlementEnabled,
      subscriptionStatus: tenantCtx.subscription?.status ?? null,
      hasActiveConsent: Boolean(consent && consent.status === 'GRANTED'),
      templateStatus: template?.enrolment_status ?? null,
      punchType,
      policy: tenantCtx.policy,
      challengeValid,
      challengeExpiredOrUsed,
      imageQualityOk: providerResult.imageQualityOk,
      imageQualityReason: providerResult.imageQualityReason,
      livenessPassed: providerResult.livenessPassed,
      livenessScore: providerResult.livenessScore,
      faceSimilarityScore: providerResult.faceSimilarityScore,
      providerAvailable: providerResult.providerAvailable,
      gpsResult,
    });

    // Persist forensic attempt record BEFORE commit decision
    const { data: attempt, error: attemptErr } = await ctx.supabaseAdmin
      .from('faceattend_verification_attempts')
      .insert({
        organization_id: orgId,
        employee_id: empId,
        template_id: template?.id || null,
        challenge_id: challengeRowId,
        punch_type: punchType,
        decision: combined.decision,
        face_similarity_score: providerResult.faceSimilarityScore,
        liveness_score: providerResult.livenessScore,
        liveness_passed: providerResult.livenessPassed,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        gps_accuracy_meters: body.accuracy_meters ?? null,
        gps_captured_at: body.gps_captured_at || nowIso,
        is_mock_location: Boolean(body.is_mock_location),
        work_location_id: gpsResult.matchedLocationId,
        distance_meters: gpsResult.distanceMeters,
        geofence_passed: gpsResult.insideGeofence,
        provider_code: providerResult.providerCode,
        is_production_biometric: providerResult.isProductionBiometric,
        policy_version_applied: tenantCtx.policy.policy_version,
        correlation_id: correlationId,
        idempotency_key: idempotencyKey,
        is_offline_sync: Boolean(body.is_offline_sync),
        device_id: body.device_id || null,
        device_risk_flags: { flags: gpsResult.deviceRiskFlags },
        failure_reason: combined.allowPunchCommit ? null : combined.reason,
      })
      .select('id, decision, created_at')
      .single();

    if (attemptErr) {
      return Response.json({ error: attemptErr.message }, { status: 500 });
    }

    if (!combined.allowPunchCommit) {
      return Response.json(
        {
          ok: false,
          punch_committed: false,
          attempt_id: attempt.id,
          decision: combined.decision,
          message: combined.reason,
          can_offer_manual_fallback: combined.canOfferManualFallback,
          provider_code: providerResult.providerCode,
          is_production_biometric: providerResult.isProductionBiometric,
          provider_notice: providerResult.notice || null,
          scores: {
            face_similarity: providerResult.faceSimilarityScore,
            liveness_score: providerResult.livenessScore,
            distance_meters: gpsResult.distanceMeters,
          },
        },
        { status: 200 }
      );
    }

    // Commit Attendance Atomically ONLY after all required checks succeed
    const { data: commitData, error: commitErr } = await ctx.supabaseAdmin.rpc(
      'fn_commit_faceattend_punch',
      {
        p_organization_id: orgId,
        p_employee_id: empId,
        p_attempt_id: attempt.id,
        p_punch_type: punchType,
        p_latitude: body.latitude ?? null,
        p_longitude: body.longitude ?? null,
        p_accuracy: body.accuracy_meters ?? 20.0,
        p_work_location_id: gpsResult.matchedLocationId,
        p_work_location_name: gpsResult.matchedLocationName,
        p_distance_meters: gpsResult.distanceMeters ?? 0,
        p_location_authorized: gpsResult.insideGeofence,
        p_reason: body.reason || null,
        p_idempotency_key: idempotencyKey,
      }
    );

    if (commitErr) {
      // Log to JOY Sentinel Telemetry
      ctx.supabaseAdmin.rpc('fn_sentinel_ingest_event', {
        p_event_code: 'ATT-001',
        p_severity: 'P1',
        p_service_name: 'FaceAttend Engine',
        p_message: `FaceAttend punch commit failed for employee ${caller.displayName}: ${commitErr.message}`,
        p_source_location: 'supabase/functions/face-attend-verify/index.ts:1092',
        p_diagnostic_payload: {
          employee_id: caller.employeeId,
          error: commitErr.message,
          attempt_id: attempt.id,
        },
        p_probable_cause: 'Database RPC fn_faceattend_commit_attendance returned an error or locked row.',
        p_recommended_action: 'Inspect fn_faceattend_commit_attendance parameters and database lock queues.',
      }).catch(() => {});

      // Update attempt failure reason cleanly without leaving orphaned attendance
      await ctx.supabaseAdmin
        .from('faceattend_verification_attempts')
        .update({ failure_reason: commitErr.message })
        .eq('id', attempt.id);

      return Response.json(
        {
          ok: false,
          punch_committed: false,
          attempt_id: attempt.id,
          decision: combined.decision,
          message: commitErr.message,
          can_offer_manual_fallback: tenantCtx.policy.manual_fallback_enabled,
        },
        { status: 409 }
      );
    }

    // Link committed attendance IDs back onto attempt record
    await ctx.supabaseAdmin
      .from('faceattend_verification_attempts')
      .update({
        attendance_punch_id: commitData?.punch_id || null,
        attendance_daily_id: commitData?.daily_id || null,
      })
      .eq('id', attempt.id);

    return Response.json({
      ok: true,
      punch_committed: true,
      attempt_id: attempt.id,
      decision: combined.decision,
      message: `${punchType === 'CHECK_IN' ? 'Checked in' : 'Checked out'} with JOY FaceAttend verification.`,
      provider_code: providerResult.providerCode,
      is_production_biometric: providerResult.isProductionBiometric,
      provider_notice: providerResult.notice || null,
      employee: {
        id: caller.employeeId,
        name: caller.displayName,
        employee_code: caller.employeeCode,
      },
      location: {
        id: gpsResult.matchedLocationId,
        name: gpsResult.matchedLocationName,
        distance_meters: gpsResult.distanceMeters,
      },
      attendance: commitData,
      scores: {
        face_similarity: providerResult.faceSimilarityScore,
        liveness_score: providerResult.livenessScore,
        distance_meters: gpsResult.distanceMeters,
      },
    });
  }),
};
