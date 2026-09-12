/**
 * JOY PeopleHR — Flutter Mobile QA & Firebase App Distribution Automation
 *
 * Automates:
 * 1. Quality Gates (Analysis + 92 Test Suite verification)
 * 2. Dynamic Release Notes Generation
 * 3. Flutter Release APK compilation
 * 4. Firebase App Distribution upload & tester notification
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { generateReleaseNotes } = require('./generate_release_notes.cjs');

const FIREBASE_ANDROID_APP_ID = '1:683368772742:android:73cf4484df3f2b06898d07';
const FLUTTER_DIR = path.resolve(__dirname, '..', 'flutter_app');
const ROOT_DIR = path.resolve(__dirname, '..');

function runStep(title, command, cwd = ROOT_DIR) {
  console.log(`\n============================================================`);
  console.log(`▶ [STEP] ${title}`);
  console.log(`  Command: ${command}`);
  console.log(`============================================================`);
  
  const envPath = `${process.env.PATH};C:\\Windows\\System32\\WindowsPowerShell\\v1.0;C:\\src\\flutter\\bin;${process.env.USERPROFILE}\\AppData\\Local\\Pub\\Cache\\bin`;
  
  try {
    execSync(command, {
      cwd,
      stdio: 'inherit',
      env: { ...process.env, PATH: envPath }
    });
    console.log(`✓ [SUCCESS] ${title}`);
    return true;
  } catch (error) {
    console.error(`✗ [FAILED] ${title}`);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const environment = (args.find(a => a.startsWith('--env=')) || '--env=QA').split('=')[1].toUpperCase();
  const testersArg = args.find(a => a.startsWith('--testers='))?.split('=')[1] || 'dharunjoysolutions@gmail.com';
  const groupsArg = args.find(a => a.startsWith('--groups='))?.split('=')[1];
  const skipBuild = args.includes('--skip-build');
  const skipTests = args.includes('--skip-tests');

  const targetLabel = groupsArg ? `Group: ${groupsArg}` : `Testers: ${testersArg}`;

  console.log(`
┌───────────────────────────────────────────────────────────┐
│ JOY PeopleHR — Mobile CI/CD & Firebase Distribution       │
├───────────────────────────────────────────────────────────┤
│ Target Project : joy-peoplehr-mobile-app                  │
│ Android App ID : ${FIREBASE_ANDROID_APP_ID}   │
│ Environment    : ${environment.padEnd(41)}│
│ Destination    : ${targetLabel.slice(0, 41).padEnd(41)}│
└───────────────────────────────────────────────────────────┘
`);

  // 1. Run Quality Gates
  if (!skipTests) {
    const analyzeOk = runStep(
      'Flutter Static Analysis Quality Gate',
      'flutter analyze --no-pub',
      FLUTTER_DIR
    );
    if (!analyzeOk) {
      console.error('❌ Flutter analysis failed. Distribution aborted.');
      process.exit(1);
    }

    const testsOk = runStep(
      'Flutter 92-Test Suite Execution',
      'flutter test',
      FLUTTER_DIR
    );
    if (!testsOk) {
      console.error('❌ Flutter unit/widget/e2e tests failed. Distribution aborted.');
      process.exit(1);
    }
  }

  // 2. Generate Release Notes
  console.log('\n▶ [STEP] Generating Release Notes...');
  const releaseNotesPath = path.join(ROOT_DIR, 'RELEASE_NOTES.txt');
  const releaseNotesContent = generateReleaseNotes({
    environment,
    channel: 'INTERNAL'
  });
  fs.writeFileSync(releaseNotesPath, releaseNotesContent, 'utf8');
  console.log(`✓ Release notes generated at ${releaseNotesPath}`);

  // 3. Build Release APK
  const apkPath = path.join(FLUTTER_DIR, 'build', 'app', 'outputs', 'flutter-apk', 'app-release.apk');
  if (!skipBuild) {
    const buildOk = runStep(
      'Compiling Flutter Release APK',
      'flutter build apk --release',
      FLUTTER_DIR
    );
    if (!buildOk) {
      console.error('❌ Flutter APK build failed. Distribution aborted.');
      process.exit(1);
    }
  }

  if (!fs.existsSync(apkPath)) {
    console.error(`❌ APK not found at expected path: ${apkPath}`);
    process.exit(1);
  }

  // 4. Distribute to Firebase App Distribution
  let distributeCmd = `firebase appdistribution:distribute "${apkPath}" --app "${FIREBASE_ANDROID_APP_ID}" --release-notes-file "${releaseNotesPath}"`;
  if (testersArg) {
    distributeCmd += ` --testers "${testersArg}"`;
  } else if (groupsArg) {
    distributeCmd += ` --groups "${groupsArg}"`;
  }

  const distributeOk = runStep(
    'Distributing APK to Firebase App Distribution',
    distributeCmd,
    ROOT_DIR
  );

  if (distributeOk) {
    console.log(`
🎉 ============================================================
   JOY PeopleHR Mobile App Successfully Distributed!
   Firebase Project : joy-peoplehr-mobile-app
   ${targetLabel}
============================================================
`);
  } else {
    console.error('❌ Firebase App Distribution upload encountered an issue.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
