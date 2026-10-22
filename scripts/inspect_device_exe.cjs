const fs = require('fs');
const buf = fs.readFileSync('d:\\web-app (2)\\Joy PeopleHR\\Essl Support files\\DeviceManagementEX\\DeviceManagementEX\\DeviceManagementEX_64\\Device.exe');
const str = buf.toString('utf8');

// Find strings or type names
const matches = str.match(/[A-Za-z0-9_]{4,}/g) || [];
const unique = new Set(matches);
console.log('Total words:', unique.size);

const relevant = Array.from(unique).filter(w => 
  /connect|user|attendance|device|access|finger|face|card|clear|download|upload|delete|restart|power|log|zkem/i.test(w)
);
console.log('Relevant terms:', relevant.slice(0, 50));
