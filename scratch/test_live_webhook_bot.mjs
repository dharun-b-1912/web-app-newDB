async function testLiveWebhook() {
  const webhookUrl = 'https://api.joypeoplehr.com/api/webhooks/whatsapp';
  console.log('Sending live webhook test payload to:', webhookUrl);

  const payload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '1550382319749383',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '9043022330',
                phone_number_id: '1352826481241407'
              },
              contacts: [
                {
                  profile: { name: 'Thirumalai R K' },
                  wa_id: '919384125278'
                }
              ],
              messages: [
                {
                  from: '919384125278',
                  id: `wamid.TEST_${Date.now()}`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: 'interactive',
                  interactive: {
                    type: 'button_reply',
                    button_reply: {
                      id: 'MENU_PAYSLIP',
                      title: '📄 Payslip'
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    ]
  };

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  console.log('Response Status:', res.status);
  console.log('Response Body:', await res.json());
}

testLiveWebhook().catch(console.error);
