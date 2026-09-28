async function test() {
  for (const domain of ['https://joypeoplehr.com', 'https://app.joypeoplehr.com', 'https://api.joypeoplehr.com']) {
    try {
      const res = await fetch(`${domain}/api/health`);
      console.log(domain, 'health:', res.status);
    } catch (e) {
      console.log(domain, 'error:', e.message);
    }
  }
}
test();
