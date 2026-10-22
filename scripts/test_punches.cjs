fetch('http://127.0.0.1:11108/punches')
  .then(r => r.json())
  .then(d => {
    console.log('PUNCHES RETURNED:', Array.isArray(d.punches) ? d.punches.length : d);
    if (Array.isArray(d.punches) && d.punches.length > 0) {
      console.log('FIRST PUNCH:', d.punches[0]);
    }
  })
  .catch(e => console.error('PUNCHES ERROR:', e.message));
