(async () => {
  try {
    const res = await fetch('http://localhost:3000/src/services/attendance/biometricGatewayService.ts');
    const text = await res.text();
    const match = text.match(/const error = (\{[\s\S]*?\n\s*\});/);
    if (match) {
      console.log('VITE ERROR:', match[1]);
    } else {
      console.log('FULL BODY:\n', text.slice(0, 2000));
    }
  } catch (e) {
    console.error(e);
  }
})();
