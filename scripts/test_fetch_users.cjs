(async () => {
  try {
    const res = await fetch('http://127.0.0.1:11108/users?ip=192.168.1.201&port=4370');
    const data = await res.json();
    console.log(`\n========================================`);
    console.log(`✓ GATEWAY RETURNED ${data.users.length} USERS:`);
    console.log(`========================================`);
    data.users.forEach((u, i) => {
      console.log(`${i + 1}. PIN #${u.pin} | Name: ${u.name} | Face: ${u.faceEnrolled ? 'YES' : 'NO'} | FP: ${u.fingerprintCount} | Card: ${u.cardNumber || 'None'} | Role: ${u.privilege}`);
    });
  } catch (err) {
    console.error('Error fetching users:', err);
  }
})();
