async function checkLive() {
  try {
    const res = await fetch('https://mobile.joypeoplehr.com/version.json?nocache=' + Date.now());
    const data = await res.json();
    console.log('Live version.json:', data);

    const indexRes = await fetch('https://mobile.joypeoplehr.com/index.html?nocache=' + Date.now());
    const indexHtml = await indexRes.text();
    console.log('index.html length:', indexHtml.length, 'has joyPerformWebUpdate:', indexHtml.includes('joyPerformWebUpdate'));

    const bootRes = await fetch('https://mobile.joypeoplehr.com/flutter_bootstrap.js?nocache=' + Date.now());
    const bootJs = await bootRes.text();
    console.log('flutter_bootstrap.js length:', bootJs.length, 'headers:', Object.fromEntries(bootRes.headers.entries()));
    const swMatch = bootJs.match(/serviceWorkerVersion:\s*"([^"]+)"/);
    console.log('serviceWorkerVersion in bootstrap:', swMatch ? swMatch[1] : 'none');

    const swRes = await fetch('https://mobile.joypeoplehr.com/flutter_service_worker.js?nocache=' + Date.now());
    const swJs = await swRes.text();
    console.log('flutter_service_worker.js length:', swJs.length, 'status:', swRes.status);
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}
checkLive();
