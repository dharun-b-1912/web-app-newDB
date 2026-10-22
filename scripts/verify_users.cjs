const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, 'data', 'terminal-users.json');
if (!fs.existsSync(dataFile)) {
  console.log('terminal-users.json not found!');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
console.log('================================================================');
console.log(`📱 DEVICE: ${data.deviceSerial} (${data.ip})`);
console.log(`👥 TOTAL REAL ENROLLED EMPLOYEES: ${data.count}`);
console.log('================================================================');

console.table(data.users.map(u => ({
  PIN: u.pin,
  Name: u.name,
  Role: u.role,
  Card: u.card || 'None',
  Face: u.faceEnrolled ? 'Face Enrolled (📷)' : 'Awaiting Face',
  Fingerprint: u.fingerprintCount > 0 ? `${u.fingerprintCount} FP` : 'Awaiting FP'
})));
