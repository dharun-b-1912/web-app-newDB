#!/usr/bin/env node
// scripts/zk_super_password.cjs
// Calculates the ZKTeco / eSSL master super password based on terminal screen time

function calculateSuperPassword(hhmmStr) {
  let timeNum;
  if (!hhmmStr) {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    timeNum = parseInt(hours + mins, 10);
    hhmmStr = `${hours}:${mins}`;
  } else {
    timeNum = parseInt(hhmmStr.replace(/\D/g, ''), 10);
  }

  const diff = 9999 - timeNum;
  const password = diff * diff;

  return {
    time: hhmmStr,
    adminId: 8888,
    superPassword: String(password)
  };
}

const inputTime = process.argv[2];
const res = calculateSuperPassword(inputTime);

console.log('================================================================');
console.log(' 🔐 ZKTeco / eSSL Physical Device Super Password Calculator');
console.log('================================================================');
console.log(` Machine Displayed Time : ${res.time}`);
console.log(` Admin User ID          : ${res.adminId}`);
console.log(` Master Super Password  : ${res.superPassword}`);
console.log('================================================================');
console.log('\nInstructions for Physical Terminal:');
console.log('1. Press and hold [M/OK] on the device.');
console.log(`2. If prompted for ID / Admin ID, enter: ${res.adminId} and press [M/OK].`);
console.log(`3. When prompted for Password, enter: ${res.superPassword} and press [M/OK].`);
console.log('4. The main menu will open! Go to System/Users to clear admin or enable DHCP.');
console.log('================================================================\n');
