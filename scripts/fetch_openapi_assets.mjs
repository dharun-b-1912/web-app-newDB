import https from 'https';
import dotenv from 'dotenv';
dotenv.config();

const url = 'https://ysiajemrqakfngasehhi.supabase.co/rest/v1/';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const req = https.get(url, {
  headers: {
    'apikey': key,
    'Authorization': `Bearer ${key}`
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const openapi = JSON.parse(body);
      console.log('OpenAPI version:', openapi.openapi || openapi.swagger);
      console.log('Top keys:', Object.keys(openapi));
      const paths = Object.keys(openapi.paths || {});
      const assetPaths = paths.filter(p => p.includes('asset'));
      console.log('Asset paths in OpenAPI:', assetPaths);
      if (openapi.paths?.['/assets']) {
        console.log('/assets methods:', Object.keys(openapi.paths['/assets']));
        const postParams = openapi.paths['/assets']?.post?.parameters;
        console.log('/assets POST params:', JSON.stringify(postParams, null, 2));
      }
      if (openapi.components?.schemas?.assets) {
        console.log('components.schemas.assets:', Object.keys(openapi.components.schemas.assets.properties || {}));
      }
    } catch (e) {
      console.error('Error parsing OpenAPI:', e.message);
    }
  });
});

req.on('error', err => console.error('Fetch error:', err.message));
