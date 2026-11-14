import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { handleGarmentRequest } = require('./server/garmentRoutes.cjs');

let _supabaseAdminInstance: any = null;
async function getSupabaseAdmin(env: Record<string, string>) {
  if (_supabaseAdminInstance) return _supabaseAdminInstance;
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co';
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';
  _supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _supabaseAdminInstance;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const smtpHost = env.SMTP_HOST || 's11777.bom1.stableserver.net';
  const smtpPort = Number(env.SMTP_PORT) || 465;
  const smtpUser = env.SMTP_USER || 'noreply@joypeoplehr.com';
  const smtpPass = env.SMTP_PASS || env.VITE_SMTP_PASS || '';
  const smtpFrom = env.SMTP_FROM || `Joy PeopleHR <${smtpUser}>`;

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'hostinger-supabase-smtp-gateway',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const isEmailEndpoint =
              req.url &&
              (req.url.startsWith('/api/email/send') ||
                req.url.startsWith('/api/resend/emails'));

            if (req.method === 'POST' && isEmailEndpoint) {
              let body = '';
              req.on('data', chunk => {
                body += chunk;
              });

              req.on('end', async () => {
                try {
                  const payload = JSON.parse(body || '{}');

                  if (!smtpPass) {
                    console.log(`[Hostinger SMTP Gateway] Development Mode: SMTP_PASS is not set in .env. Simulating delivery for ${JSON.stringify(payload.to)}`);
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(
                      JSON.stringify({
                        success: true,
                        id: `hostinger-smtp-dev-${Date.now()}`,
                        provider: 'HOSTINGER_SUPABASE_SMTP (DEV_SIMULATION)',
                        simulated: true,
                        message: `Report generated for ${Array.isArray(payload.to) ? payload.to.join(', ') : payload.to}. Configure SMTP_PASS in .env to deliver live emails to mailboxes.`,
                      })
                    );
                  }

                  const isSecure = smtpPort === 465;
                  const transporter = nodemailer.createTransport({
                    host: smtpHost,
                    port: smtpPort,
                    secure: isSecure,
                    auth: {
                      user: smtpUser,
                      pass: smtpPass,
                    },
                    tls: {
                      rejectUnauthorized: false,
                    },
                  });

                  const mailAttachments = (payload.attachments || []).map((att: any) => {
                    let rawBase64 = att.content;
                    if (typeof rawBase64 === 'string' && rawBase64.includes(',')) {
                      rawBase64 = rawBase64.split(',')[1];
                    }
                    return {
                      filename: att.filename,
                      content: rawBase64 ? Buffer.from(rawBase64, 'base64') : undefined,
                      path: att.path,
                    };
                  });

                  const info = await transporter.sendMail({
                    from: payload.from || smtpFrom,
                    to: Array.isArray(payload.to) ? payload.to.join(', ') : payload.to,
                    cc: payload.cc,
                    subject: payload.subject,
                    html: payload.html,
                    text: payload.text || payload.subject,
                    replyTo: payload.reply_to,
                    attachments: mailAttachments.length > 0 ? mailAttachments : undefined,
                  });

                  console.log(`[Hostinger/Supabase SMTP Success] Dispatched to ${JSON.stringify(payload.to)} via ${smtpHost} | ID: ${info.messageId}`);

                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(
                    JSON.stringify({
                      success: true,
                      id: info.messageId,
                      provider: 'HOSTINGER_SUPABASE_SMTP',
                    })
                  );
                } catch (err: any) {
                  console.error('[Hostinger/Supabase SMTP Error]:', err.message);
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(
                    JSON.stringify({
                      success: false,
                      error: `SMTP Error: ${err.message}`,
                    })
                  );
                }
              });
            } else {
              next();
            }
          });
        },
      },
      {
        name: 'razorpay-orders-gateway',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const razorpayKeyId = env.RAZORPAY_KEY_ID || env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TqReUSPk2WMRmD';
            const razorpayKeySecret = env.RAZORPAY_KEY_SECRET || 'hY8kYZUaC5YXkpo5CHZh3WYZ';

            if (req.method === 'POST' && req.url === '/api/razorpay/create-order') {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', async () => {
                try {
                  const payload = JSON.parse(body || '{}');
                  const amountInPaise = Math.round(Number(payload.amount || 100) * (payload.amountInPaise ? 1 : 100));
                  const currency = payload.currency || 'INR';
                  const receipt = payload.receipt || `rcpt_${Date.now()}`;
                  const notes = payload.notes || {};

                  const auth = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64');
                  const response = await fetch('https://api.razorpay.com/v1/orders', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Basic ${auth}`,
                    },
                    body: JSON.stringify({
                      amount: amountInPaise,
                      currency,
                      receipt,
                      notes,
                    }),
                  });

                  const orderData = await response.json();
                  res.statusCode = response.ok ? 200 : response.status;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify(orderData));
                } catch (err: any) {
                  console.error('[Razorpay Gateway Error]:', err.message);
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ error: err.message }));
                }
              });
            } else if (req.method === 'POST' && req.url === '/api/razorpay/verify-payment') {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', async () => {
                try {
                  const data = JSON.parse(body || '{}');
                  const orderId = data.orderId || data.razorpay_order_id;
                  const paymentId = data.paymentId || data.razorpay_payment_id;
                  const signature = data.signature || data.razorpay_signature;

                  if (!orderId || !paymentId || !signature) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({ success: false, error: 'Missing payment signature parameters' }));
                  }

                  const expectedSignature = crypto
                    .createHmac('sha256', razorpayKeySecret)
                    .update(`${orderId}|${paymentId}`)
                    .digest('hex');

                  const isValid = expectedSignature === signature;
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ success: isValid, verified: isValid }));
                } catch (err: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ error: err.message, success: false }));
                }
              });
            } else if (req.method === 'POST' && (req.url === '/api/razorpay/webhook' || req.url === '/api/webhooks/razorpay')) {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', async () => {
                try {
                  const razorpayWebhookSecret = env.RAZORPAY_WEBHOOK_SECRET || 'joy_rzp_webhook_secret_2026_x89k';
                  const signature = req.headers['x-razorpay-signature'];
                  const expectedSignature = crypto
                    .createHmac('sha256', razorpayWebhookSecret)
                    .update(body)
                    .digest('hex');

                  const isVerified = signature ? expectedSignature === signature : true;
                  console.log(`[Razorpay Webhook Ingress] Signature verified: ${isVerified ? 'YES' : 'FAIL'} | Header: ${signature || 'none'}`);

                  const payload = JSON.parse(body || '{}');
                  console.log(`[Razorpay Webhook Received] Event: ${payload.event || 'unknown'} | Account: ${payload.account_id || 'live'}`);

                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({
                    status: 'ok',
                    event: payload.event,
                    verified: isVerified,
                    processed_at: new Date().toISOString()
                  }));
                } catch (err: any) {
                  console.error('[Razorpay Webhook Error]:', err.message);
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ error: err.message, status: 'error' }));
                }
              });
            } else if (req.method === 'POST' && req.url === '/api/razorpay/create-refund') {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', async () => {
                try {
                  const { paymentId, amount, notes } = JSON.parse(body || '{}');
                  const amountInPaise = Math.round(Number(amount || 0) * 100);
                  const auth = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64');

                  if (paymentId && paymentId.startsWith('pay_')) {
                    const refundBody: any = { notes: notes || {} };
                    if (amountInPaise > 0) refundBody.amount = amountInPaise;

                    const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Basic ${auth}`,
                      },
                      body: JSON.stringify(refundBody),
                    });

                    const refundData = await response.json();
                    if (response.ok) {
                      res.statusCode = 200;
                      res.setHeader('Content-Type', 'application/json');
                      return res.end(JSON.stringify({ success: true, refund: refundData }));
                    } else {
                      res.statusCode = 200;
                      res.setHeader('Content-Type', 'application/json');
                      return res.end(JSON.stringify({
                        success: true,
                        simulated: true,
                        note: refundData.error?.description || 'Simulated refund processed in sandbox mode',
                        refund: {
                          id: `rfnd_sim_${Date.now()}`,
                          payment_id: paymentId,
                          amount: amountInPaise,
                          status: 'processed',
                          created_at: Math.floor(Date.now() / 1000),
                        },
                      }));
                    }
                  }

                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({
                    success: true,
                    simulated: true,
                    refund: {
                      id: `rfnd_manual_${Date.now()}`,
                      payment_id: paymentId,
                      amount: amountInPaise,
                      status: 'processed',
                      created_at: Math.floor(Date.now() / 1000),
                    },
                  }));
                } catch (err: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ success: false, error: err.message }));
                }
              });
            } else if (req.method === 'GET' && req.url === '/api/razorpay/diagnostic') {
              try {
                const auth = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64');
                const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${auth}`,
                  },
                  body: JSON.stringify({
                    amount: 100,
                    currency: 'INR',
                    receipt: `diag_${Date.now()}`,
                    notes: { diagnostic: 'vite_dev_health_check' },
                  }),
                });
                const isApiOk = orderRes.ok;
                const orderData = await orderRes.json();
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({
                  status: isApiOk ? 'healthy' : 'degraded',
                  key_id: razorpayKeyId.slice(0, 10) + '...',
                  environment: razorpayKeyId.startsWith('rzp_test') ? 'Sandbox / Test Mode' : 'Production Live',
                  api_reachable: isApiOk,
                  test_order_id: orderData.id || null,
                  timestamp: new Date().toISOString(),
                }));
              } catch (err: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ status: 'error', error: err.message }));
              }
            } else {
              next();
            }
          });
        },
      },
      {
        name: 'shift-roster-gateway',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (!req.url || !req.url.startsWith('/api/shift-rosters')) {
              return next();
            }

            const parsedUrl = new URL(req.url, 'http://localhost');
            const pathname = parsedUrl.pathname;
            const supabaseAdmin = await getSupabaseAdmin(env);

            if (req.method === 'POST' && pathname === '/api/shift-rosters/override') {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', async () => {
                try {
                  const payload = JSON.parse(body || '{}');
                  const {
                    organizationId,
                    companyId,
                    employeeId,
                    employeeCode,
                    employeeName,
                    rosterDate,
                    shiftId,
                    shiftCode,
                    shiftName,
                    isWeeklyOff,
                    isHoliday,
                    isOverride,
                    remarks,
                    assignedBy,
                  } = payload;

                  if (!employeeId || !rosterDate) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({ success: false, error: 'employeeId and rosterDate are required' }));
                  }

                  const orgId = organizationId || '0c621892-e938-4707-9957-13534ea32c19';
                  const row = {
                    organization_id: orgId,
                    company_id: companyId || null,
                    employee_id: employeeId,
                    employee_code: employeeCode || null,
                    employee_name: employeeName || null,
                    roster_date: rosterDate,
                    shift_id: shiftId,
                    shift_code: shiftCode,
                    shift_name: shiftName,
                    is_weekly_off: Boolean(isWeeklyOff),
                    is_holiday: Boolean(isHoliday),
                    is_override: isOverride !== false,
                    assigned_by: assignedBy || 'HR Administrator',
                    remarks: remarks || null,
                    updated_at: new Date().toISOString(),
                  };

                  const { data, error } = await supabaseAdmin
                    .from('shift_rosters')
                    .upsert(row, { onConflict: 'organization_id,employee_id,roster_date' })
                    .select()
                    .single();

                  if (error) {
                    console.error('[Vite ShiftRoster Override Error]:', error);
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({ success: false, error: error.message }));
                  }

                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ success: true, entry: data }));
                } catch (err: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ success: false, error: err.message }));
                }
              });
            } else if (req.method === 'POST' && pathname === '/api/shift-rosters/bulk') {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', async () => {
                try {
                  const { organizationId, companyId, entries } = JSON.parse(body || '{}');
                  if (!Array.isArray(entries) || entries.length === 0) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({ success: false, error: 'entries array is required' }));
                  }

                  const orgId = organizationId || '0c621892-e938-4707-9957-13534ea32c19';
                  const formattedRows = entries.map((entry: any) => ({
                    organization_id: entry.organization_id || entry.tenant_id || orgId,
                    company_id: companyId || entry.company_id || null,
                    employee_id: entry.employee_id,
                    employee_code: entry.employee_code || null,
                    employee_name: entry.employee_name || null,
                    roster_date: entry.roster_date || entry.date,
                    shift_id: entry.shift_id,
                    shift_code: entry.shift_code,
                    shift_name: entry.shift_name,
                    is_weekly_off: Boolean(entry.is_weekly_off),
                    is_holiday: Boolean(entry.is_holiday),
                    is_override: Boolean(entry.is_override),
                    assigned_by: entry.assigned_by || 'HR Administrator',
                    remarks: entry.remarks || entry.override_reason || null,
                    updated_at: new Date().toISOString(),
                  }));

                  const { data, error } = await supabaseAdmin
                    .from('shift_rosters')
                    .upsert(formattedRows, { onConflict: 'organization_id,employee_id,roster_date' })
                    .select();

                  if (error) {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({ success: false, error: error.message }));
                  }

                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ success: true, count: data ? data.length : 0 }));
                } catch (err: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ success: false, error: err.message }));
                }
              });
            } else if (req.method === 'GET' && pathname === '/api/shift-rosters') {
              try {
                const startDate = parsedUrl.searchParams.get('startDate');
                const endDate = parsedUrl.searchParams.get('endDate');
                const orgId = parsedUrl.searchParams.get('organizationId') || '0c621892-e938-4707-9957-13534ea32c19';

                let query = supabaseAdmin.from('shift_rosters').select('*').eq('organization_id', orgId);
                if (startDate) query = query.gte('roster_date', startDate);
                if (endDate) query = query.lte('roster_date', endDate);
                query = query.order('roster_date', { ascending: true });

                const { data, error } = await query;
                if (error) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ success: false, error: error.message }));
                }
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: true, rosters: data || [] }));
              } catch (err: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: false, error: err.message }));
              }
            } else {
              next();
            }
          });
        },
      },
      {
        name: 'workforce-security-admin-dev-gateway',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (!req.url) return next();
            const parsedUrl = new URL(req.url, 'http://localhost');
            const pathname = parsedUrl.pathname;

            if (pathname.startsWith('/api/garment/')) {
              try {
                const supabaseAdmin = await getSupabaseAdmin(env);
                if (req.method === 'GET' || req.method === 'HEAD') {
                  return await handleGarmentRequest(req, res, pathname, {}, supabaseAdmin);
                }
                let gBody = '';
                req.on('data', chunk => { gBody += chunk; });
                req.on('end', async () => {
                  try {
                    const gPayload = gBody ? JSON.parse(gBody) : {};
                    return await handleGarmentRequest(req, res, pathname, gPayload, supabaseAdmin);
                  } catch (e: any) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({ success: false, error: e.message }));
                  }
                });
                return;
              } catch (err: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: false, error: err.message }));
              }
            }

            if (req.method === 'GET' && (pathname === '/api/workforce/sync' || pathname === '/api/employees/sync')) {
              try {
                const urlObj = new URL(req.url || '', 'http://localhost');
                const orgId = urlObj.searchParams.get('organizationId') || urlObj.searchParams.get('organization_id');
                if (!orgId || !isValidUUID(orgId) || orgId === 'platform-root') {
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({
                    success: true,
                    count: 0,
                    employees: [],
                  }));
                }

                const supabaseAdmin = await getSupabaseAdmin(env);
                const { data: employees, error } = await supabaseAdmin
                  .from('employees')
                  .select('*')
                  .eq('organization_id', orgId)
                  .order('created_at', { ascending: false });

                if (error) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ success: false, error: error.message }));
                }

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({
                  success: true,
                  count: employees?.length || 0,
                  employees: employees || [],
                }));
              } catch (err: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: false, error: err.message }));
              }
            }

            if (req.method === 'POST' && (
              pathname === '/api/auth/suspend-employee' ||
              pathname === '/api/auth/reactivate-employee' ||
              pathname === '/api/auth/reset-password-admin' ||
              pathname === '/api/auth/revoke-sessions' ||
              pathname === '/api/auth/provision-user' ||
              pathname === '/api/workforce/update-employee' ||
              pathname === '/api/employees/update' ||
              pathname === '/api/workforce/assign-location' ||
              pathname === '/api/audit/log'
            )) {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', async () => {
                try {
                  const payload = JSON.parse(body || '{}');
                  const supabaseAdmin = await getSupabaseAdmin(env);

                  if (pathname === '/api/workforce/update-employee' || pathname === '/api/employees/update') {
                    const { id, patch = {} } = payload;
                    if (!id) {
                      res.statusCode = 400;
                      res.setHeader('Content-Type', 'application/json');
                      return res.end(JSON.stringify({ success: false, error: 'Employee ID is required' }));
                    }

                    const now = new Date().toISOString();
                    const cleanEmpPatch: any = { updated_at: now };

                    if (patch.first_name) cleanEmpPatch.first_name = String(patch.first_name).trim();
                    if (patch.last_name) cleanEmpPatch.last_name = String(patch.last_name).trim();
                    if (patch.middle_name !== undefined) cleanEmpPatch.middle_name = patch.middle_name ? String(patch.middle_name).trim() : null;
                    if (patch.display_name) cleanEmpPatch.display_name = String(patch.display_name).trim();
                    else if (patch.first_name || patch.last_name) {
                      cleanEmpPatch.display_name = `${patch.first_name || ''} ${patch.last_name || ''}`.trim();
                    }
                    if (patch.employee_code) cleanEmpPatch.employee_code = String(patch.employee_code).trim();
                    if (patch.work_email) cleanEmpPatch.work_email = String(patch.work_email).trim();
                    if (patch.personal_email !== undefined) cleanEmpPatch.personal_email = patch.personal_email ? String(patch.personal_email).trim() : null;
                    if (patch.phone !== undefined) cleanEmpPatch.phone = patch.phone ? String(patch.phone).trim() : null;
                    if (patch.avatar_url !== undefined) cleanEmpPatch.avatar_url = patch.avatar_url || null;
                    if (patch.dob !== undefined) cleanEmpPatch.dob = patch.dob || null;
                    if (patch.doj) cleanEmpPatch.doj = patch.doj;
                    if (patch.confirmation_date !== undefined) cleanEmpPatch.confirmation_date = patch.confirmation_date || null;

                    if (patch.gender) {
                      const g = String(patch.gender).toUpperCase().replace(/[\s-]/g, '_');
                      cleanEmpPatch.gender = g.includes('FEMALE') ? 'FEMALE' : g.includes('NON') ? 'NON_BINARY' : g.includes('PREFER') ? 'PREFER_NOT_TO_SAY' : 'MALE';
                    }

                    const isUUID = (s: any) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
                    if (patch.department_id && isUUID(patch.department_id)) cleanEmpPatch.department_id = patch.department_id;
                    if (patch.designation_id && isUUID(patch.designation_id)) cleanEmpPatch.designation_id = patch.designation_id;
                    if (patch.branch_id && isUUID(patch.branch_id)) cleanEmpPatch.branch_id = patch.branch_id;
                    if (patch.reporting_manager_id !== undefined) {
                      cleanEmpPatch.reporting_manager_id = (patch.reporting_manager_id && isUUID(patch.reporting_manager_id)) ? patch.reporting_manager_id : null;
                    }
                    if (patch.employment_type) {
                      const t = String(patch.employment_type).toUpperCase();
                      cleanEmpPatch.employment_type = t.includes('PART') ? 'PART_TIME' : t.includes('CONTRACT') ? 'CONTRACT' : t.includes('INTERN') ? 'INTERN' : 'FULL_TIME';
                    }
                    if (patch.employment_status || patch.status) {
                      const s = String(patch.employment_status || patch.status).toUpperCase();
                      cleanEmpPatch.employment_status = s.includes('PROBATION') ? 'PROBATION' : s.includes('NOTICE') ? 'NOTICE_PERIOD' : s.includes('SUSPEND') || s.includes('INACTIVE') ? 'SUSPENDED' : s.includes('RESIGN') ? 'RESIGNED' : s.includes('TERMINAT') ? 'TERMINATED' : 'ACTIVE';
                    }

                    const { data: updatedEmp, error: empErr } = await supabaseAdmin
                      .from('employees')
                      .update(cleanEmpPatch)
                      .eq('id', id)
                      .select('*')
                      .single();

                    if (empErr) {
                      res.statusCode = 500;
                      res.setHeader('Content-Type', 'application/json');
                      return res.end(JSON.stringify({ success: false, error: empErr.message }));
                    }

                    // Assign Work Location
                    const targetLocId = patch.location_id || patch.work_location_id;
                    let resolvedWorkLocationId = null;
                    if (targetLocId && isUUID(targetLocId)) {
                      resolvedWorkLocationId = targetLocId;
                    } else if (patch.work_location || patch.work_location_name) {
                      const locName = String(patch.work_location || patch.work_location_name).trim();
                      const { data: matchedLoc } = await supabaseAdmin
                        .from('work_locations')
                        .select('id')
                        .ilike('name', `%${locName}%`)
                        .limit(1)
                        .maybeSingle();
                      if (matchedLoc) resolvedWorkLocationId = matchedLoc.id;
                    }

                    if (resolvedWorkLocationId) {
                      await supabaseAdmin
                        .from('employee_work_location_assignments')
                        .upsert({
                          employee_id: id,
                          work_location_id: resolvedWorkLocationId,
                          organization_id: updatedEmp.organization_id || '0c621892-e938-4707-9957-13534ea32c19',
                          company_id: updatedEmp.company_id || '2030277f-a6a1-427f-beaf-4fc677a3bae2',
                          is_primary: true,
                          attendance_allowed: true,
                          is_active: true,
                          effective_from: updatedEmp.doj || new Date().toISOString().split('T')[0],
                          updated_at: now
                        }, { onConflict: 'employee_id,work_location_id' });
                    }

                    // Sync user_profiles
                    const profilePatch: any = { updated_at: now };
                    if (cleanEmpPatch.display_name) profilePatch.full_name = cleanEmpPatch.display_name;
                    if (cleanEmpPatch.work_email) profilePatch.email = cleanEmpPatch.work_email;
                    if (cleanEmpPatch.phone) profilePatch.phone = cleanEmpPatch.phone;
                    if (cleanEmpPatch.employment_status) {
                      profilePatch.status = (cleanEmpPatch.employment_status === 'ACTIVE' || cleanEmpPatch.employment_status === 'PROBATION') ? 'ACTIVE' : 'INACTIVE';
                    }
                    await supabaseAdmin.from('user_profiles').update(profilePatch).eq('employee_id', id);

                    // Sync Auth metadata
                    if (cleanEmpPatch.work_email || updatedEmp.work_email) {
                      try {
                        const { data: userList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
                        const targetEmail = (cleanEmpPatch.work_email || updatedEmp.work_email).toLowerCase();
                        const authUser = userList?.users?.find((u: any) => u.email?.toLowerCase() === targetEmail);
                        if (authUser) {
                          await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
                            user_metadata: {
                              ...(authUser.user_metadata || {}),
                              full_name: cleanEmpPatch.display_name || authUser.user_metadata?.full_name,
                              employee_code: cleanEmpPatch.employee_code || authUser.user_metadata?.employee_code
                            }
                          });
                        }
                      } catch (_) {}
                    }

                    // Upsert employee_profiles (blood_group, marital_status, nationality) with service role
                    if (patch.profile || patch.blood_group || patch.marital_status || patch.nationality) {
                      const prof = patch.profile || {};
                      const profPayload: any = {
                        employee_id: id,
                        organization_id: updatedEmp.organization_id || '0c621892-e938-4707-9957-13534ea32c19',
                        updated_at: now
                      };
                      if (prof.blood_group !== undefined || patch.blood_group !== undefined) profPayload.blood_group = prof.blood_group || patch.blood_group || null;
                      if (prof.marital_status !== undefined || patch.marital_status !== undefined) profPayload.marital_status = prof.marital_status || patch.marital_status || null;
                      if (prof.nationality !== undefined || patch.nationality !== undefined) profPayload.nationality = prof.nationality || patch.nationality || 'Indian';

                      await supabaseAdmin.from('employee_profiles').upsert(profPayload, { onConflict: 'employee_id' }).catch(() => {});
                    }

                    // Upsert/Update employee_salary_assignments with service role
                    if (patch.salary || patch.annual_ctc !== undefined || patch.monthly_ctc !== undefined) {
                      try {
                        const sal = patch.salary || {};
                        const annCtc = Number(sal.annual_ctc ?? patch.annual_ctc ?? 0);
                        const monGross = Number(sal.monthly_ctc ?? patch.monthly_ctc ?? (annCtc > 0 ? Math.round(annCtc / 12) : 0));
                        let structId = sal.salary_structure_id || patch.salary_structure_id;
                        if (!structId || !isUUID(structId)) {
                          const { data: stRow } = await supabaseAdmin.from('salary_structures').select('id').limit(1).maybeSingle();
                          structId = stRow?.id;
                        }

                        const { data: exSal } = await supabaseAdmin.from('employee_salary_assignments').select('id').eq('employee_id', id).maybeSingle();
                        const effDate = updatedEmp.doj || new Date().toISOString().split('T')[0];

                        if (exSal?.id) {
                          const salUpdate: any = {
                            annual_ctc: annCtc,
                            monthly_gross: monGross,
                            effective_from: effDate,
                            is_active: true,
                            updated_at: now
                          };
                          if (structId && isUUID(structId)) salUpdate.salary_structure_id = structId;
                          await supabaseAdmin.from('employee_salary_assignments').update(salUpdate).eq('id', exSal.id);
                        } else if (structId && isUUID(structId)) {
                          await supabaseAdmin.from('employee_salary_assignments').insert({
                            organization_id: updatedEmp.organization_id || '0c621892-e938-4707-9957-13534ea32c19',
                            employee_id: id,
                            salary_structure_id: structId,
                            annual_ctc: annCtc,
                            monthly_gross: monGross,
                            effective_from: effDate,
                            is_active: true
                          });
                        }
                      } catch (salErr) {
                        console.warn('[Vite Dev Gateway] Salary assignment notice:', salErr);
                      }
                    }

                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({ success: true, employee: updatedEmp }));
                  }

                  if (pathname === '/api/audit/log') {
                    const isUUID = (s: any) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
                    const orgId = isUUID(payload.organization_id) ? payload.organization_id : '0c621892-e938-4707-9957-13534ea32c19';
                    const entityId = isUUID(payload.entity_id) ? payload.entity_id : orgId;

                    const { data, error } = await supabaseAdmin.from('audit_logs').insert({
                      organization_id: orgId,
                      entity_type: payload.entity_type || 'AUTH_IDENTITY',
                      entity_id: entityId,
                      action: payload.action || 'PROFILE_UPDATED',
                      new_values: payload.new_values || {},
                      ip_address: payload.ip_address || (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1').toString().split(',')[0].trim(),
                      user_agent: payload.user_agent || req.headers['user-agent'] || null,
                      created_at: payload.created_at || new Date().toISOString()
                    });

                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({ success: !error, warning: error?.message, data }));
                  }

                  if (pathname === '/api/workforce/assign-location') {
                    const { employeeId, workLocationId, isPrimary = true } = payload;
                    const { data: emp } = await supabaseAdmin.from('employees').select('id, organization_id, company_id, doj').eq('id', employeeId).maybeSingle();
                    if (!emp) {
                      res.statusCode = 404;
                      res.setHeader('Content-Type', 'application/json');
                      return res.end(JSON.stringify({ success: false, error: 'Employee not found' }));
                    }

                    const now = new Date().toISOString();
                    const { data: assign, error: aErr } = await supabaseAdmin
                      .from('employee_work_location_assignments')
                      .upsert({
                        employee_id: employeeId,
                        work_location_id: workLocationId,
                        organization_id: emp.organization_id || '0c621892-e938-4707-9957-13534ea32c19',
                        company_id: emp.company_id || '2030277f-a6a1-427f-beaf-4fc677a3bae2',
                        is_primary: Boolean(isPrimary),
                        attendance_allowed: true,
                        is_active: true,
                        effective_from: emp.doj || new Date().toISOString().split('T')[0],
                        updated_at: now
                      }, { onConflict: 'employee_id,work_location_id' })
                      .select('*')
                      .single();

                    if (aErr) {
                      res.statusCode = 500;
                      res.setHeader('Content-Type', 'application/json');
                      return res.end(JSON.stringify({ success: false, error: aErr.message }));
                    }

                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({ success: true, assignment: assign }));
                  }

                  if (pathname === '/api/auth/suspend-employee') {
                    const { employeeId, email } = payload;
                    let q = supabaseAdmin.from('employees').update({
                      employment_status: 'SUSPENDED',
                      updated_at: new Date().toISOString()
                    });
                    if (employeeId) q = q.or(`id.eq.${employeeId},employee_code.eq.${employeeId}`);
                    else if (email) q = q.ilike('work_email', email);
                    await q;

                    if (email) {
                      const { data: userList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
                      const authUser = userList?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
                      if (authUser) {
                        await supabaseAdmin.auth.admin.updateUserById(authUser.id, { ban_duration: '876000h' });
                      }
                    }

                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({ success: true, status: 'SUSPENDED' }));
                  }

                  if (pathname === '/api/auth/reactivate-employee') {
                    const { employeeId, email } = payload;
                    let q = supabaseAdmin.from('employees').update({
                      employment_status: 'ACTIVE',
                      updated_at: new Date().toISOString()
                    });
                    if (employeeId) q = q.or(`id.eq.${employeeId},employee_code.eq.${employeeId}`);
                    else if (email) q = q.ilike('work_email', email);
                    await q;

                    if (email) {
                      const { data: userList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
                      const authUser = userList?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
                      if (authUser) {
                        await supabaseAdmin.auth.admin.updateUserById(authUser.id, { ban_duration: 'none' });
                      }
                    }

                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({ success: true, status: 'ACTIVE' }));
                  }

                  if (pathname === '/api/auth/reset-password-admin') {
                    const { email, newPassword = 'joypeoplehr' } = payload;
                    const cleanEmail = (email || '').trim().toLowerCase();
                    const cleanPass = (newPassword || 'joypeoplehr').trim();

                    const { data: userList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
                    const authUser = userList?.users?.find((u: any) => u.email?.toLowerCase() === cleanEmail);
                    if (authUser) {
                      await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
                        password: cleanPass,
                        email_confirm: true
                      });
                    }

                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({ success: true, message: `Password reset to ${cleanPass}` }));
                  }

                  if (pathname === '/api/auth/revoke-sessions') {
                    const { email } = payload;
                    if (email) {
                      const { data: userList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
                      const authUser = userList?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
                      if (authUser) {
                        await supabaseAdmin.auth.admin.signOut(authUser.id).catch(() => {});
                      }
                    }
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({ success: true, message: 'Sessions revoked' }));
                  }

                  if (pathname === '/api/auth/provision-user') {
                    const { email, password = 'joypeoplehr', fullName, employeeCode, phone } = payload;
                    const cleanEmail = (email || '').trim().toLowerCase();
                    const cleanPass = (password || 'joypeoplehr').trim();
                    const cleanName = (fullName || cleanEmail.split('@')[0]).trim();

                    const { data: userList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
                    let authUser = userList?.users?.find((u: any) => u.email?.toLowerCase() === cleanEmail);

                    if (authUser) {
                      await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
                        password: cleanPass,
                        email_confirm: true,
                      });
                    } else {
                      const { data: newUser } = await supabaseAdmin.auth.admin.createUser({
                        email: cleanEmail,
                        password: cleanPass,
                        email_confirm: true,
                        user_metadata: { full_name: cleanName, employee_code: employeeCode }
                      });
                      authUser = newUser?.user;
                    }

                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({ success: true, message: `User provisioned for ${cleanEmail}` }));
                  }
                } catch (err: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ success: false, error: err.message }));
                }
              });
            } else {
              next();
            }
          });
        }
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-runtime'],
      force: true,
    },
    test: {
      globals: true,
      environment: 'node',
      exclude: ['**/node_modules/**', '**/Essl Support files/**', '**/scratch/**', '**/.agents/**'],
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: false,
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Connection': 'keep-alive',
        'Keep-Alive': 'timeout=120, max=1000',
      },
      proxy: {
        '/api/connector': {
          target: 'http://127.0.0.1:11108',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/connector/, ''),
        },
      },
      // HMR configuration with explicit clientPort to stabilize socket during network throttling
      hmr: process.env.DISABLE_HMR === 'true' ? false : {
        clientPort: 3000,
        overlay: true,
      },
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: [
          '**/dist/**',
          '**/flutter_app/**',
          '**/scratch/**',
          '**/.agents/**',
          '**/.git/**',
          '**/Test Data/**',
          '**/*.pdf',
          '**/*.apk',
          '**/test-results/**',
          '**/playwright-report/**',
          '**/*.webm',
          '**/*.png',
          '**/*.log',
          '**/scripts/**',
          '**/tests/**',
        ],
      },
    },
    esbuild: mode === 'production' ? {
      pure: ['console.log', 'console.debug', 'console.info'],
      drop: ['debugger'],
    } : {},
    build: {
      sourcemap: false,
      modulePreload: false,
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('lucide-react')) return 'vendor-lucide';
              if (id.includes('@supabase')) return 'vendor-supabase';
              if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
              if (id.includes('@google/genai')) return 'vendor-genai';
              if (id.includes('motion')) return 'vendor-motion';
              if (id.includes('@radix-ui')) return 'vendor-radix';
              if (id.includes('pdfjs-dist')) return 'vendor-pdf';
              if (id.includes('xlsx') || id.includes('exceljs')) return 'vendor-excel';
              if (id.includes('jspdf') || id.includes('html2canvas')) return 'vendor-pdf-export';
              return 'vendor-libs';
            }
            if (
              id.includes('/src/features/payroll/') || id.includes('\\src\\features\\payroll\\') ||
              id.includes('/src/features/people/') || id.includes('\\src\\features\\people\\')
            ) {
              return 'module-workforce-payroll';
            }
            if (id.includes('/src/features/attendance/') || id.includes('\\src\\features\\attendance\\')) {
              return 'module-attendance';
            }
            if (id.includes('/src/features/leave/') || id.includes('\\src\\features\\leave\\')) {
              return 'module-leave';
            }
            if (id.includes('/src/features/lms/') || id.includes('\\src\\features\\lms\\')) {
              return 'module-lms';
            }
            if (id.includes('/src/features/performance/') || id.includes('\\src\\features\\performance\\')) {
              return 'module-performance';
            }
            if (id.includes('/src/features/platform/') || id.includes('\\src\\features\\platform\\')) {
              return 'module-platform';
            }
            if (id.includes('/src/features/analytics/') || id.includes('\\src\\features\\analytics\\')) {
              return 'module-analytics';
            }
            if (id.includes('/src/features/admin/') || id.includes('\\src\\features\\admin\\')) {
              return 'module-admin';
            }
          },
        },
      },
    },
  };
});
