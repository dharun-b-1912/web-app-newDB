fetch('http://127.0.0.1:11108/health')
  .then(r => r.json())
  .then(d => console.log('DAEMON HEALTH:', JSON.stringify(d, null, 2)))
  .catch(e => console.error('HEALTH ERROR:', e.message));
