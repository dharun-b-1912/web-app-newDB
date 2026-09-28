async function testPayslipLatest() {
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
                      id: 'PAYSLIP_LATEST',
                      title: '⬇️ Latest Payslip'
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

  const res = await fetch('https://app.joypeoplehr.com/api/webhooks/whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  console.log('PAYSLIP_LATEST POST status:', res.status);
}

testPayslipLatest();
