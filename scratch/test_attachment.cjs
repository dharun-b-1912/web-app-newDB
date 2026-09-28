const { jsPDF } = require('jspdf');

const apiKey = 're_mock_dummy_resend_api_key_sanitized';
const targetEmail = 'thirumalairk28@gmail.com';

async function test() {
  const doc = new jsPDF();
  doc.text('Joy PeopleHR Attendance Miss Report - Test PDF Attachment', 20, 20);
  const base64 = Buffer.from(doc.output('arraybuffer')).toString('base64');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey,
    },
    body: JSON.stringify({
      from: 'Joy PeopleHR <noreply@joypeoplehr.com>',
      to: [targetEmail],
      subject: '📎 [PDF Attachment] Attendance Miss Report - 19 Sep 2026',
      html: '<p>Please find attached the official Attendance Miss Report PDF for printing.</p>',
      attachments: [
        {
          filename: 'Attendance-Miss-Report-2026-09-19.pdf',
          content: base64
        }
      ]
    })
  });

  const data = await res.json();
  console.log('Status:', res.status, data);
}

test().catch(console.error);
