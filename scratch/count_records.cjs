const fs = require('fs');
const content = fs.readFileSync('src/services/vendor/fixtures/joySepAttendanceBenchmarkFixture.ts', 'utf8');
const idMatches = content.match(/"attendance_id":/g);
console.log('Attendance records count in fixture:', idMatches ? idMatches.length : 0);
