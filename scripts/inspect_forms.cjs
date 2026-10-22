const fs = require('fs');
const buf = fs.readFileSync('d:\\web-app (2)\\Joy PeopleHR\\Essl Support files\\DeviceManagementEX\\DeviceManagementEX\\DeviceManagementEX_64\\Device.exe');
const str = buf.toString('utf8');

// Find all form names, button names, method names
const matches = str.match(/frm_[A-Za-z0-9_]+|btn_[A-Za-z0-9_]+|[A-Za-z]+Form/g) || [];
console.log('Forms & Controls in Device.exe:', Array.from(new Set(matches)));
