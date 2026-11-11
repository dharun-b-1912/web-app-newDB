// ============================================================================
// JOY PeopleHR — Garment Workforce Express/Connect Backend Gateway
// Handles authenticated privileged actions, entitlement toggle, & offline batch sync
// Mounted in both server.js (production) and vite.config.ts (development)
// ============================================================================

async function resolveCallerContext(req, supabaseAdmin) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
  const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    return { errorStatus: 401, error: 'Missing Bearer authentication token' };
  }

  const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !authData?.user) {
    return { errorStatus: 401, error: 'Invalid or expired authentication token' };
  }

  const authUser = authData.user;
  const { data: profiles } = await supabaseAdmin
    .from('user_profiles')
    .select('id, organization_id, employee_id, role, full_name, email')
    .eq('auth_user_id', authUser.id)
    .limit(1);

  const profile = (profiles && profiles[0]) || null;
  if (!profile || !profile.organization_id) {
    return { errorStatus: 403, error: 'No active organization profile mapped to user' };
  }

  return { user: authUser, profile };
}

function isSupervisorOrAdmin(roleStr) {
  const r = String(roleStr || '').toUpperCase();
  return (
    r.includes('ADMIN') ||
    r.includes('HR') ||
    r.includes('PAYROLL') ||
    r.includes('MANAGER') ||
    r.includes('TEAM LEAD') ||
    r.includes('TL') ||
    r.includes('SUPERVISOR')
  );
}

function isAdminRole(roleStr) {
  const r = String(roleStr || '').toUpperCase();
  return r.includes('ADMIN') || r.includes('HR HEAD') || r.includes('PAYROLL');
}

function sendJson(res, status, data) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(status).json(data);
  }
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify(data));
}

async function handleGarmentRequest(req, res, pathname, body, supabaseAdmin) {
  if (pathname === '/api/garment/health' && req.method === 'GET') {
    return sendJson(res, 200, { ok: true, module: 'garment_workforce', timestamp: new Date().toISOString() });
  }

  const ctx = await resolveCallerContext(req, supabaseAdmin);
  if (ctx.error) {
    return sendJson(res, ctx.errorStatus || 401, { success: false, error: ctx.error });
  }

  const orgId = ctx.profile.organization_id;

  if (pathname === '/api/garment/entitlement' && req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('organization_addon_entitlements')
      .select('*')
      .eq('organization_id', orgId)
      .eq('addon_key', 'garment_workforce')
      .maybeSingle();

    if (error) return sendJson(res, 500, { success: false, error: error.message });
    return sendJson(res, 200, {
      success: true,
      enabled: Boolean(data?.is_enabled),
      entitlement: data || null,
    });
  }

  if (pathname === '/api/garment/entitlement' && req.method === 'POST') {
    if (!isAdminRole(ctx.profile.role)) {
      return sendJson(res, 403, { success: false, error: 'Only Organization or HR Admins can modify SaaS add-on entitlements' });
    }
    const targetOrgId = body?.organization_id && String(ctx.profile.role).toUpperCase().includes('SUPER')
      ? body.organization_id
      : orgId;
    const isEnabled = Boolean(body?.is_enabled);
    const nowIso = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('organization_addon_entitlements')
      .upsert(
        {
          organization_id: targetOrgId,
          addon_key: 'garment_workforce',
          is_enabled: isEnabled,
          plan_tier: body?.plan_tier || 'BUSINESS',
          config_json: body?.config_json || {
            piece_rate_calculation_mode: 'CONFIGURABLE_PER_ORDER',
            default_rework_payment_rule: 'ACCEPTED_ONLY',
          },
          enabled_at: isEnabled ? nowIso : null,
          disabled_at: isEnabled ? null : nowIso,
          updated_by: ctx.user.id,
        },
        { onConflict: 'organization_id,addon_key' }
      )
      .select()
      .single();

    if (error) return sendJson(res, 500, { success: false, error: error.message });
    return sendJson(res, 200, { success: true, enabled: Boolean(data?.is_enabled), entitlement: data });
  }

  if (pathname === '/api/garment/offline-sync' && req.method === 'POST') {
    if (!isSupervisorOrAdmin(ctx.profile.role)) {
      return sendJson(res, 403, { success: false, error: 'Supervisor, Team Lead, or Admin role required for floor sync' });
    }
    const attendanceItems = Array.isArray(body?.attendance_items) ? body.attendance_items : [];
    const productionItems = Array.isArray(body?.production_items) ? body.production_items : [];

    let attSynced = 0;
    let prodSynced = 0;

    if (attendanceItems.length > 0) {
      const attRows = attendanceItems.map((it) => ({
        organization_id: orgId,
        work_date: it.work_date,
        shift_id: it.shift_id || null,
        production_unit_id: it.production_unit_id || null,
        team_id: it.team_id || null,
        employee_id: it.employee_id,
        supervisor_employee_id: it.supervisor_employee_id || ctx.profile.employee_id || null,
        status: it.status || 'PRESENT',
        payable_day_factor: Number(it.payable_day_factor ?? 1),
        worked_hours: Number(it.worked_hours ?? 8),
        overtime_hours: Number(it.overtime_hours ?? 0),
        source: it.source || 'SUPERVISOR_MOBILE',
        approval_status: it.approval_status || 'SUBMITTED',
        client_idempotency_key: it.client_idempotency_key || null,
        remarks: it.remarks || null,
      }));
      const { data, error } = await supabaseAdmin
        .from('garment_floor_attendance')
        .upsert(attRows, { onConflict: 'organization_id,employee_id,work_date' })
        .select('id');
      if (error) return sendJson(res, 400, { success: false, error: error.message });
      attSynced = (data || []).length;
    }

    for (const it of productionItems) {
      if (it.client_idempotency_key) {
        const { data: dup } = await supabaseAdmin
          .from('garment_production_entries')
          .select('id')
          .eq('organization_id', orgId)
          .eq('client_idempotency_key', it.client_idempotency_key)
          .maybeSingle();
        if (dup) {
          prodSynced += 1;
          continue;
        }
      }
      const { error } = await supabaseAdmin.from('garment_production_entries').insert({
        organization_id: orgId,
        work_date: it.work_date,
        shift_id: it.shift_id || null,
        production_unit_id: it.production_unit_id || null,
        team_id: it.team_id || null,
        order_id: it.order_id || null,
        style_id: it.style_id || null,
        operation_id: it.operation_id,
        allocation_mode: it.allocation_mode || 'INDIVIDUAL',
        shared_split_method: it.shared_split_method || null,
        employee_id: it.employee_id || null,
        supervisor_employee_id: it.supervisor_employee_id || ctx.profile.employee_id || null,
        produced_qty: Number(it.produced_qty || 0),
        accepted_qty: Number(it.accepted_qty || 0),
        rejected_qty: Number(it.rejected_qty || 0),
        rework_qty: Number(it.rework_qty || 0),
        rework_accepted_qty: Number(it.rework_accepted_qty || 0),
        rejection_reason_code: it.rejection_reason_code || null,
        rejection_reason_notes: it.rejection_reason_notes || null,
        applied_unit_rate: Number(it.applied_unit_rate || 0),
        payable_units: Number(it.payable_units ?? it.accepted_qty ?? 0),
        computed_piece_amount: Number(it.computed_piece_amount || 0),
        qc_status: it.qc_status || 'PENDING',
        approval_status: it.approval_status || 'SUBMITTED',
        client_idempotency_key: it.client_idempotency_key || null,
        notes: it.notes || null,
      });
      if (error) return sendJson(res, 400, { success: false, error: error.message });
      prodSynced += 1;
    }

    return sendJson(res, 200, {
      success: true,
      attendance_synced: attSynced,
      production_synced: prodSynced,
    });
  }

  return sendJson(res, 404, { success: false, error: `Unknown garment endpoint: ${pathname}` });
}

module.exports = { handleGarmentRequest };

