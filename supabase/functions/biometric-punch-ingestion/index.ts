// ============================================================================
// JOY PeopleHR — Secure Biometric Punch Ingestion Edge Function
// ============================================================================
// Architecture: Physical Biometric Terminal -> HTTPS -> Edge Function -> Postgres
// Protects database by requiring device token / API key authentication.
// NEVER exposes service_role key to physical hardware or clients.
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit } from '../_shared/rateLimiter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-device-token, x-tenant-id',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 0. Rate Limiting Protection (Gate: 500 requests / 60 seconds per device token / IP)
  const rateLimitCheck = await checkRateLimit(req, {
    profile: 'BIOMETRIC_PUNCH_INGESTION',
    maxRequests: 500,
    windowSeconds: 60,
  });
  if (!rateLimitCheck.allowed && rateLimitCheck.response) {
    return rateLimitCheck.response;
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server misconfiguration: missing Supabase credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Authenticate physical device / gateway agent via token
    const deviceToken = req.headers.get('x-device-token') || req.headers.get('authorization')?.replace('Bearer ', '');
    const headerTenantId = req.headers.get('x-tenant-id');

    if (!deviceToken) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: missing x-device-token header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const {
      serial_number,
      device_id,
      biometric_pin,
      punch_time,
      verification_mode = 'Face',
      punch_direction = 'AUTO',
      raw_payload,
    } = body;

    if (!serial_number && !device_id) {
      return new Response(
        JSON.stringify({ error: 'Bad Request: missing serial_number or device_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!biometric_pin || !punch_time) {
      return new Response(
        JSON.stringify({ error: 'Bad Request: missing biometric_pin or punch_time' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Resolve registered device & organization
    let deviceQuery = supabase.from('biometric_devices').select('*');
    if (serial_number) {
      deviceQuery = deviceQuery.eq('serial_number', serial_number);
    } else {
      deviceQuery = deviceQuery.eq('id', device_id);
    }

    const { data: devices, error: devError } = await deviceQuery;
    if (devError || !devices || devices.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: unregistered or unrecognized biometric terminal' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const device = devices[0];
    const organizationId = device.organization_id || headerTenantId;

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'Internal Error: device has no associated organization' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. 60-Second Timestamp Deduplication Hash
    const punchDate = new Date(punch_time);
    const minuteBucket = Math.floor(punchDate.getTime() / 60000);
    const dedupHash = `${device.serial_number}_${biometric_pin}_${minuteBucket}`;

    // 4. Check for existing punch with same dedup hash
    const { data: existingPunches } = await supabase
      .from('attendance_punches')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('device_id', device.id)
      .eq('device_user_id', biometric_pin)
      .gte('punch_time', new Date(punchDate.getTime() - 60000).toISOString())
      .lte('punch_time', new Date(punchDate.getTime() + 60000).toISOString())
      .limit(1);

    if (existingPunches && existingPunches.length > 0) {
      return new Response(
        JSON.stringify({
          status: 'DEDUPLICATED',
          message: 'Duplicate punch within 60s window ignored',
          dedup_hash: dedupHash,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Resolve employee mapping if available
    let employeeId = null;
    const { data: mappings } = await supabase
      .from('biometric_device_users')
      .select('id, mapped_employee_id')
      .eq('organization_id', organizationId)
      .eq('device_user_id', biometric_pin)
      .limit(1);

    if (mappings && mappings.length > 0 && mappings[0].mapped_employee_id) {
      employeeId = mappings[0].mapped_employee_id;
    }

    // 6. Insert Authoritative Attendance Punch into PostgreSQL
    const punchId = `punch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const { data: insertedPunch, error: insertError } = await supabase
      .from('attendance_punches')
      .insert({
        id: punchId,
        organization_id: organizationId,
        employee_id: employeeId,
        device_id: device.id,
        device_serial: device.serial_number,
        device_name: device.device_name,
        device_user_id: biometric_pin,
        punch_time: punchDate.toISOString(),
        punch_type: punch_direction === 'OUT' ? 'CHECK_OUT' : 'CHECK_IN',
        punch_source: 'BIOMETRIC',
        verification_mode: verification_mode.toUpperCase(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: 'Database error storing punch', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Update device last_seen_at / last_punch_at timestamp
    await supabase
      .from('biometric_devices')
      .update({
        last_punch_at: new Date().toISOString(),
        last_health_check: new Date().toISOString(),
        status: 'Online',
        updated_at: new Date().toISOString(),
      })
      .eq('id', device.id);

    // 8. Dispatch notification to reporting manager if employee is resolved
    if (employeeId) {
      try {
        const { data: emp } = await supabase
          .from('employees')
          .select('id, employee_code, first_name, last_name, display_name, phone, organization_id, reporting_manager_id, department_id')
          .eq('id', employeeId)
          .maybeSingle();

        if (emp) {
          let managerId = emp.reporting_manager_id;
          if (!managerId && emp.department_id) {
            const { data: dept } = await supabase
              .from('departments')
              .select('head_employee_id')
              .eq('id', emp.department_id)
              .maybeSingle();
            if (dept?.head_employee_id && dept.head_employee_id !== emp.id) {
              managerId = dept.head_employee_id;
            }
          }

          if (managerId) {
            const timeFormatted = punchDate.toLocaleTimeString('en-US', {
              timeZone: 'Asia/Kolkata',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            });
            const empName = (emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`).trim();
            const isOut = punch_direction === 'OUT';
            const title = isOut ? `👋 Employee Check-Out: ${empName}` : `🟢 Biometric Check-In: ${empName}`;
            const body = isOut
              ? `${empName} (${emp.employee_code || ''}) checked out at ${timeFormatted} via Biometric Terminal.`
              : `${empName} (${emp.employee_code || ''}) checked in at ${timeFormatted} via Biometric Terminal.`;

            // Insert in-app notification
            await supabase.from('notification_events').insert([{
              organization_id: organizationId,
              recipient_user_id: managerId,
              channel: 'IN_APP',
              title,
              message: body,
              action_url: `/attendance?emp=${emp.id}&date=${punchDate.toISOString().split('T')[0]}`,
              is_read: false,
              is_sent: true,
              sent_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            }]);

            // Dispatch push notification
            await fetch(`${supabaseUrl}/functions/v1/send-push`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                employee_id: managerId,
                title,
                body,
                route: 'attendance',
                data: {
                  route: 'attendance',
                  eventType: isOut ? 'attendance.check_out.accepted' : 'attendance.check_in.accepted',
                  employeeId: emp.id,
                  employeeName: empName,
                  source: 'BIOMETRIC',
                  timestamp: String(Date.now()),
                },
              }),
            });
          }
        }
      } catch (errNotif) {
        console.warn('[biometric-punch-ingestion] Manager alert error:', errNotif);
      }
    }

    return new Response(
      JSON.stringify({
        status: 'SUCCESS',
        punch_id: insertedPunch.id,
        employee_id: employeeId,
        organization_id: organizationId,
        punch_time: punchDate.toISOString(),
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', message: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
