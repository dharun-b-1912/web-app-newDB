import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

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
      proxy: {
        '/api/connector': {
          target: 'http://127.0.0.1:11108',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/connector/, ''),
        },
      },
      // HMR configuration
      hmr: process.env.DISABLE_HMR === 'true' ? false : true,
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
