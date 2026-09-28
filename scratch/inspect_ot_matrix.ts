import { AttendanceMasterService } from '../src/services/vendor/attendanceMasterService';

const master = AttendanceMasterService.buildCanonicalBenchmarkMaster();
console.log('otMatrixRecords length:', master.otMatrixRecords.length);
const total = master.otMatrixRecords.reduce((s, r) => s + r.total_ot_hours, 0);
console.log('Total OT hours:', total);
master.otMatrixRecords.forEach(r => console.log(r.employee_id, r.employee_name, r.total_ot_hours));
