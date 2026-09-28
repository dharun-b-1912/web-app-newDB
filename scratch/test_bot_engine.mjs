// scratch/test_bot_engine.mjs
// Test command normalization and flow logic
function normalizeCommand(raw) {
  const t = raw.trim().toUpperCase().replace(/\s+/g, '');
  if (['1', 'PAYSLIP', 'PAY', 'SALARY', 'SLIP'].includes(t)) return 'PAYSLIP';
  if (['2', 'LEAVE', 'LEAVES'].includes(t)) return 'LEAVE';
  if (['3', 'ATTENDANCE', 'ATTEND', 'PUNCH', 'CLOCKIN', 'ATT'].includes(t)) return 'ATTENDANCE';
  if (['4', 'NEWS', 'ANNOUNCEMENT', 'ANNOUNCEMENTS', 'CIRCULAR'].includes(t)) return 'NEWS';
  if (['5', 'PORTAL', 'HRPORTAL', 'DASHBOARD', 'LOGIN', 'LINK'].includes(t)) return 'PORTAL';
  if (['0', 'MENU', 'MAIN', 'HOME', 'START', 'BACK'].includes(t)) return 'MENU';
  if (['HI', 'HELLO', 'HEY', 'NAMASTE', 'VANAKKAM'].includes(t)) return 'MENU';
  if (['HELP', '?', 'COMMANDS', 'WHAT'].includes(t)) return 'HELP';
  if (['APPLY', 'APPLYLEAVE', 'APPLYFORLEAVE', 'LEAVEAPPLY'].includes(t)) return 'APPLY_LEAVE';
  if (['BALANCE', 'LEAVEBALANCE', 'LEAVBAL'].includes(t)) return 'LEAVE_BAL';
  if (['STATUS', 'LEAVESTATUS', 'MYLEAVES'].includes(t)) return 'LEAVE_STATUS';
  return t;
}

const testInputs = [
  '1', 'payslip', 'PAYSLIP', 'Payslip', 'salary',
  '2', 'leave', 'LEAVE', 'Leave',
  '3', 'attendance', 'ATTENDANCE', 'punch', 'clock in',
  '4', 'news', 'NEWS', 'announcements',
  '5', 'portal', 'PORTAL', 'dashboard',
  '0', 'menu', 'MENU', 'home', 'back',
  'help', 'HELP', '?'
];

console.log('Testing normalization:');
for (const inp of testInputs) {
  console.log(`"${inp}" -> ${normalizeCommand(inp)}`);
}
