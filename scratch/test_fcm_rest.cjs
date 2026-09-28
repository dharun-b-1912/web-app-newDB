const fs = require('fs');
const path = require('path');
const file = path.join(process.env.USERPROFILE, '.config', 'configstore', 'firebase-tools.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const accessToken = data.tokens.access_token;

async function testFCM() {
  const url = 'https://fcm.googleapis.com/v1/projects/joy-peoplehr-mobile-app/messages:send';
  const payload = {
    message: {
      topic: 'all_employees',
      notification: {
        title: 'JOY PeopleHR Test',
        body: 'Testing FCM delivery to all employees'
      },
      android: {
        priority: 'HIGH',
        notification: {
          channel_id: 'joy_peoplehr_high_importance',
          sound: 'default',
          default_vibrate_timings: true,
          notification_priority: 'PRIORITY_MAX'
        }
      },
      data: {
        route: 'home',
        timestamp: Date.now().toString()
      }
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const resData = await res.json();
  console.log('Status:', res.status);
  console.log('Result:', JSON.stringify(resData, null, 2));
}

testFCM();
