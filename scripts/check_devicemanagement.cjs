const fs = require('fs');
const path = 'd:\\web-app (2)\\Joy PeopleHR\\Essl Support files\\DeviceManagementEX\\DeviceManagementEX\\DeviceManagementEX_64';
const files = fs.readdirSync(path);
console.log('Files in DeviceManagementEX_64:');
files.forEach(f => {
  const stat = fs.statSync(path + '\\' + f);
  console.log(`- ${f} (${stat.size} bytes)`);
});
