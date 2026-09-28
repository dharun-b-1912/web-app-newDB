const appId = '1477770540837429';
const appSecret = 'b8b0290687a9f7dd78f6eaa4dba960a0';
const appAccessToken = `${appId}|${appSecret}`;
const callbackUrl = 'https://app.joypeoplehr.com/api/webhooks/whatsapp';
const verifyToken = 'joy_peoplehr_meta_webhook_secret_token';

async function updateSubscription() {
  console.log(`Updating Meta App webhook subscription to: ${callbackUrl}...`);

  const params = new URLSearchParams({
    object: 'whatsapp_business_account',
    callback_url: callbackUrl,
    verify_token: verifyToken,
    fields: 'messages,message_template_status_update,account_update,phone_number_quality_update',
    access_token: appAccessToken
  });

  const res = await fetch(`https://graph.facebook.com/v20.0/${appId}/subscriptions`, {
    method: 'POST',
    body: params
  });

  const data = await res.json();
  console.log('Update result:', JSON.stringify(data, null, 2));

  // Verify updated subscriptions
  const verifyRes = await fetch(`https://graph.facebook.com/v20.0/${appId}/subscriptions?access_token=${appAccessToken}`);
  console.log('Verified Subscriptions:', JSON.stringify(await verifyRes.json(), null, 2));
}

updateSubscription().catch(console.error);
