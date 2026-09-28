const { JOY_SEP_MASTER_WORKFORCE_44 } = require('../src/services/vendor/fixtures/joySepAttendanceBenchmarkFixture.ts');
console.log('Total workers in fixture:', JOY_SEP_MASTER_WORKFORCE_44.length);
JOY_SEP_MASTER_WORKFORCE_44.forEach(w => console.log(`SNo ${w.sno}: id=${w.employeeId} name=${w.employeeName}`));
