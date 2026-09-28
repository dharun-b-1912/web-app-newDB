const fs = require('fs');
const content = fs.readFileSync('src/services/vendor/fixtures/joySepAttendanceBenchmarkFixture.ts', 'utf8');
const matches = content.match(/export const \w+/g);
console.log('Matches:', matches);
