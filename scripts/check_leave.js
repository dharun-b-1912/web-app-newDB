const fs = require('fs');
const view = fs.readFileSync('src/features/attendance/subviews/EmployeeAttendanceView.tsx', 'utf8');
const lines = view.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('ON_LEAVE') || l.includes('On Leave') || l.includes('onLeaveCount') || l.includes('leaveCount')) {
    console.log((idx+1) + ': ' + l.trim());
  }
});
