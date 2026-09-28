import { AttendanceMasterService } from '../src/services/vendor/attendanceMasterService';

const master = AttendanceMasterService.getActiveMaster();
console.log('Master workers:', master.stats.totalMasterWorkers);
console.log('Attendance records:', master.stats.attendanceRecordCount);
console.log('Total OT hours:', master.stats.totalOtHours);
console.log('Employee summaries count:', master.employeeSummaries.length);
console.log('First employee:', master.employeeSummaries[0]);
console.log('Validation:', AttendanceMasterService.validateForExport(master));
