import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
let token = '';
for (const line of env.split('\n')) {
  if (line.startsWith('VITE_META_WA_ACCESS_TOKEN=')) token = line.split('=')[1].trim();
  if (!token && line.startsWith('META_WA_ACCESS_TOKEN=')) token = line.split('=')[1].trim();
}
if (!token) {
  token = 'EAAVABkQlajUBSjPw0ZChZCPzoO3nFz2aI2tDnnkZBOsgUquxD0Dw8NZCIOKYfCr0vk7hDfWYyIiDuWkZCzqjhwU6CwnxnumN1IDlu9pKhAKFLOMUZAmGT0gOBZBhtcXZApEUGmUSHtNC7or1Nv3z9HKHtyvSVGF3dH5J2GbVGYKzsSMiuRvmJ8KhqdSIQV0kkAZDZD';
}

async function fetchTemplates() {
  for (const tId of ['1728820144855571', '1135734992129048']) {
    console.log(`\n==============================================`);
    console.log(`Fetching template ID: ${tId}`);
    console.log(`==============================================`);
    const res = await fetch(`https://graph.facebook.com/v20.0/${tId}?access_token=${token}`);
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
  }
}

fetchTemplates().catch(console.error);
