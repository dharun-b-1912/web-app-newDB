const appId = '1477770540837429';
const appSecret = 'b8b0290687a9f7dd78f6eaa4dba960a0';
const appAccessToken = `${appId}|${appSecret}`;

async function main() {
  console.log('Querying App subscriptions with App Access Token...');
  const res = await fetch(`https://graph.facebook.com/v20.0/${appId}/subscriptions?access_token=${appAccessToken}`);
  const data = await res.json();
  console.log('App Subscriptions:', JSON.stringify(data, null, 2));
}

main().catch(console.error);
