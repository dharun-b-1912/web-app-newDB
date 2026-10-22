// scripts/test_airtel_checkout_template.cjs
const https = require('https');
require('dotenv').config();

const {
  AIRTEL_IQ_USERNAME,
  AIRTEL_IQ_PASSWORD,
  AIRTEL_CUSTOMER_ID,
  AIRTEL_DLT_PE_ID,
  VITE_AIRTEL_SENDER_ID,
} = process.env;

const DLT_CHECKOUT_TEMPLATE_ID = '1077188040062422070';
const SENDER_ID = VITE_AIRTEL_SENDER_ID || 'JCSPRL';
const TEST_PHONE = '919944399088'; // Dharun B

const now = new Date();
const timeStr = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
const messageText = `Dear Dharun, your check-out has been recorded at ${timeStr} today. Your total logged time is 8 hrs 30 mins. Status: Present. - Joy PeopleHR.`;

console.log('Testing Approved Airtel Check-Out Template:');
console.log('Template ID:', DLT_CHECKOUT_TEMPLATE_ID);
console.log('Rendered Message:', messageText);

const authHeader = 'Basic ' + Buffer.from(`${AIRTEL_IQ_USERNAME}:${AIRTEL_IQ_PASSWORD}`).toString('base64');
const postData = JSON.stringify({
  customerId: AIRTEL_CUSTOMER_ID,
  destinationAddress: [TEST_PHONE],
  message: messageText,
  sourceAddress: SENDER_ID,
  messageType: 'SERVICE_IMPLICIT',
  dltTemplateId: DLT_CHECKOUT_TEMPLATE_ID,
  entityId: AIRTEL_DLT_PE_ID,
});

const options = {
  hostname: 'iqsms.airtel.in',
  port: 443,
  path: '/api/v1/send-prepaid-sms',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': authHeader,
    'Content-Length': Buffer.byteLength(postData),
  },
  timeout: 8000,
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log('HTTP Status:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (err) => console.error('Error:', err.message));
req.write(postData);
req.end();
