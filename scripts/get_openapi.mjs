const key = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';
fetch('https://ysiajemrqakfngasehhi.supabase.co/rest/v1/', {
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: 'application/openapi+json'
  }
})
  .then(r => r.json())
  .then(d => {
    console.log('OpenAPI definitions:', Object.keys(d.definitions || {}));
  })
  .catch(console.error);
