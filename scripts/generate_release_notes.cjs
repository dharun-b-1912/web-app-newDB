/**
 * JOY PeopleHR — Production Release Notes Generator
 *
 * Extracts commit metadata, environment tags, and categorizes changes
 * into structured release notes for Firebase App Distribution & Google Play.
 */
const fs = require('fs');
const { execSync } = require('child_process');

function getGitMetadata() {
  try {
    const commitSha = execSync('git rev-parse --short HEAD').toString().trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    const commitMsg = execSync('git log -1 --pretty=%B').toString().trim();
    return { commitSha, branch, commitMsg };
  } catch (_) {
    return { commitSha: 'HEAD', branch: 'main', commitMsg: 'Release update' };
  }
}

function generateReleaseNotes({
  version = '1.0.3',
  buildNumber = '184',
  environment = 'QA',
  channel = 'INTERNAL',
  testFocus = [
    'Unified Multi-Mode Attendance Engine (Biometric + Mobile GPS)',
    'Attendance Source Locking Invariant (Single session per day)',
    'Dynamic Live Working Timer from hardware timestamp',
    'eSSL AI-FACE MAGNUM ADMS Realtime push integration'
  ]
} = {}) {
  const { commitSha, branch, commitMsg } = getGitMetadata();
  const dateStr = new Date().toISOString().split('T')[0];

  const content = `============================================================
JOY PeopleHR — ${environment.toUpperCase()} Build (v${version}+${buildNumber})
============================================================
Environment : ${environment}
Channel     : ${channel}
Build Number: ${buildNumber}
Version     : ${version}
Commit SHA  : ${commitSha} (${branch})
Release Date: ${dateStr}

HIGHLIGHTS & KEY DELIVERABLES:
- Unified Multi-Mode Attendance Engine: One employee = One attendance record per day.
- Attendance Source Locking: Biometric first locks to BIOMETRIC, Mobile first locks to MOBILE.
- Dynamic Working Timer: Computes duration dynamically from server first_check_in.
- eSSL AI-FACE MAGNUM Integration: Sub-second real-time ingestion via port 11108.
- Privacy-Hardened Crashlytics: Zero-PII sanitization for tokens, passwords, biometric templates.

LATEST COMMIT:
${commitMsg}

TARGET TEST FOCUS:
${testFocus.map(item => `• ${item}`).join('\n')}

KNOWN ISSUES / WORKAROUNDS:
• None

DISTRIBUTION:
• Managed by Firebase App Distribution (Group: joy-${environment.toLowerCase()})
============================================================`;

  return content;
}

if (require.main === module) {
  const envArg = process.argv[2] || 'QA';
  const notes = generateReleaseNotes({ environment: envArg });
  console.log(notes);
  fs.writeFileSync('RELEASE_NOTES.txt', notes, 'utf8');
}

module.exports = { generateReleaseNotes };
