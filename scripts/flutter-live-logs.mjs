#!/usr/bin/env node
/**
 * JOY PeopleHR — Clean Flutter & Supabase Realtime Live Terminal Monitor
 * - Reads the active Flutter Chrome session log in UTF-8
 * - Runs a local HTTP log receiver on 127.0.0.1:8089/log so ANY Chrome window
 *   open at http://localhost:8080 streams its logs to the terminal
 * - Connects to Supabase Realtime to stream live DB changes in real time
 */
import fs from 'fs';
import http from 'http';
import { createClient } from '@supabase/supabase-js';

const LOG_PATH =
  'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\4ab7eab8-5065-4d16-bcdf-5807d813d38a\\.system_generated\\tasks\\task-404.log';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function nowTs() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

function formatLine(rawLine) {
  const line = rawLine.replace(/\r$/, '');
  if (!line.trim()) return '';

  // Hide noisy internal flutter compiler / supabase SDK lines
  if (
    line.includes('supabase.supabase_flutter: INFO:') ||
    line.startsWith('Hot restarting application from main method') ||
    line.startsWith('Performing hot restart...') ||
    line.startsWith('Restarted application in') ||
    line.startsWith('Waiting for connection from debug service')
  ) {
    return null;
  }

  if (line.startsWith('===')) {
    return `${ANSI.cyan}${ANSI.bold}${line}${ANSI.reset}`;
  }
  if (
    line.includes('[SESSION & REALTIME TRACKER]') ||
    line.includes('[SESSION & ATTENDANCE TRACKER]') ||
    line.includes('JOY PEOPLEHR FLUTTER')
  ) {
    return `${ANSI.cyan}${ANSI.bold}${line}${ANSI.reset}`;
  }
  if (line.startsWith('TIME         | MODULE')) {
    return `${ANSI.bold}${ANSI.white}${line}${ANSI.reset}`;
  }
  if (line.startsWith('---')) {
    return `${ANSI.dim}${line}${ANSI.reset}`;
  }
  if (line.startsWith('!!!') || line.includes('| CRASH ') || line.includes('| FATAL ')) {
    return `${ANSI.red}${ANSI.bold}${line}${ANSI.reset}`;
  }
  if (line.includes('| ERROR ')) {
    return `${ANSI.red}${line}${ANSI.reset}`;
  }
  if (line.includes('| WARN ')) {
    return `${ANSI.yellow}${line}${ANSI.reset}`;
  }
  if (
    line.includes('LOGGED IN (Active') ||
    line.includes('CHECKED IN') ||
    line.includes('Realtime Sync    : ACTIVE')
  ) {
    return `${ANSI.green}${ANSI.bold}${line}${ANSI.reset}`;
  }
  if (line.includes('NOT LOGGED IN') || line.includes('NOT CHECKED IN')) {
    return `${ANSI.yellow}${line}${ANSI.reset}`;
  }
  if (line.includes('| REALTIME ')) {
    return `${ANSI.cyan}${line}${ANSI.reset}`;
  }
  if (line.includes('| OK ')) {
    return `${ANSI.green}${line}${ANSI.reset}`;
  }
  return line;
}

function getLatestBootSlice(content) {
  const lines = content.split('\n');
  let lastHeaderIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes('JOY PEOPLEHR FLUTTER')) {
      lastHeaderIdx = Math.max(0, i - 1);
      break;
    }
  }
  return lastHeaderIdx >= 0 ? lines.slice(lastHeaderIdx) : lines.slice(-35);
}

let lastSize = 0;
const recentSeen = new Set();

function rememberAndPrint(line) {
  const trimmed = line.trim();
  if (!trimmed) return;
  if (recentSeen.has(trimmed)) return;
  recentSeen.add(trimmed);
  if (recentSeen.size > 150) {
    const first = recentSeen.values().next().value;
    recentSeen.delete(first);
  }
  const formatted = formatLine(line);
  if (formatted !== null) console.log(formatted);
}

function printInitial() {
  if (!fs.existsSync(LOG_PATH)) {
    console.log('Waiting for Flutter Web log file...');
    return;
  }
  const content = fs.readFileSync(LOG_PATH, 'utf8');
  lastSize = Buffer.byteLength(content, 'utf8');
  const recentLines = getLatestBootSlice(content);
  for (const l of recentLines) {
    const formatted = formatLine(l);
    if (formatted !== null) console.log(formatted);
  }
}

printInitial();

// Watch log file for updates from flutter run
setInterval(() => {
  try {
    if (!fs.existsSync(LOG_PATH)) return;
    const stats = fs.statSync(LOG_PATH);
    if (stats.size < lastSize) {
      lastSize = 0;
    }
    if (stats.size > lastSize) {
      const fd = fs.openSync(LOG_PATH, 'r');
      const length = stats.size - lastSize;
      const buffer = Buffer.alloc(length);
      fs.readSync(fd, buffer, 0, length, lastSize);
      fs.closeSync(fd);
      lastSize = stats.size;

      const chunk = buffer.toString('utf8');
      for (const l of chunk.split('\n')) {
        if (!l) continue;
        rememberAndPrint(l);
      }
    }
  } catch {
    // ignore transient file read errors
  }
}, 200);

// Start local HTTP bridge on port 8089 so any browser tab at localhost:8080 can push logs
try {
  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.method === 'POST' && req.url === '/log') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed && typeof parsed.line === 'string') {
            rememberAndPrint(parsed.line);
          }
        } catch {}
        res.writeHead(200);
        res.end('ok');
      });
      return;
    }
    res.writeHead(404);
    res.end();
  });
  server.on('error', () => {
    // Port 8089 already bound by another log viewer instance — ignore
  });
  server.listen(8089, '127.0.0.1');
} catch {}

// Subscribe to live Supabase Realtime events so DB updates always appear in terminal
async function startSupabaseRealtimeMonitor() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await supabase.auth.signInWithPassword({
      email: 'marimuthu@joycorporatesolutions.com',
      password: 'joypeoplehr',
    });

    const channel = supabase.channel('terminal-live-monitor');
    const tables = [
      'attendance_punches',
      'attendance_daily',
      'employees',
      'leave_requests',
      'employee_requests',
      'employee_documents',
      'notification_events',
    ];

    for (const table of tables) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          const line = `${nowTs()} | REALTIME     | OK     | DB ${payload.eventType} on ${table}`;
          try {
            fs.appendFileSync(LOG_PATH, line + '\n', 'utf8');
          } catch {}
          rememberAndPrint(line);
        }
      );
    }

    channel.subscribe();
  } catch {}
}

startSupabaseRealtimeMonitor();
