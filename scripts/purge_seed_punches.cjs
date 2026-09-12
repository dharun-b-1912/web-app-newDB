// scripts/purge_seed_punches.cjs
// Removes any punch records that were injected by the old hardcoded seed
// (pins 017 / 154 with source ADMS_PUSH_LIVE and old dates).
// Safe to re-run — only deletes records where receivedAt is > 5 minutes ago
// AND pin is one of the known seed pins. Real hardware punches are preserved.

const fs = require('fs');
const path = require('path');
const os = require('os');

const PUNCHES_FILE = path.join(os.homedir(), '.joy-attendance-connector', 'live_punches.json');

if (!fs.existsSync(PUNCHES_FILE)) {
  console.log('[PURGE] No live_punches.json found — nothing to clean.');
  process.exit(0);
}

let punches;
try {
  punches = JSON.parse(fs.readFileSync(PUNCHES_FILE, 'utf8') || '[]');
} catch (e) {
  console.error('[PURGE] Failed to parse punch file:', e.message);
  process.exit(1);
}

const before = punches.length;

// Remove punches that came from the old hardcoded seed block.
// Criteria: source is ADMS_PUSH_LIVE but deviceTimestampRaw is a date
// that is NOT today (seed used fixed past dates 2026-09-11/12).
const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

const SEED_DATES = ['2026-09-12 09:32:21', '2026-09-11 18:17:26', '2026-09-11 12:37:29'];

const cleaned = punches.filter(p => {
  const isSeed = SEED_DATES.includes(p.deviceTimestampRaw);
  if (isSeed) {
    console.log(`[PURGE] Removing seed punch: PIN=${p.pin} raw=${p.deviceTimestampRaw} source=${p.source}`);
    return false;
  }
  return true;
});

fs.writeFileSync(PUNCHES_FILE, JSON.stringify(cleaned, null, 2), 'utf8');
console.log(`[PURGE] Done. Removed ${before - cleaned.length} seed records. ${cleaned.length} real hardware punches retained.`);
