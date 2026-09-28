const token = 'EAAVABkQlajUBSjPw0ZChZCPzoO3nFz2aI2tDnnkZBOsgUquxD0Dw8NZCIOKYfCr0vk7hDfWYyIiDuWkZCzqjhwU6CwnxnumN1IDlu9pKhAKFLOMUZAmGT0gOBZBhtcXZApEUGmUSHtNC7or1Nv3z9HKHtyvSVGF3dH5J2GbVGYKzsSMiuRvmJ8KhqdSIQV0kkAZDZD';
const wabaId = '1550382319749383';

const templates = [
  {
    name: 'joy_attendance_anomaly_v1',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Attendance Alert: Missed Clock-In'
      },
      {
        type: 'BODY',
        text: 'Hello {{1}},\n\nOur system detected an attendance anomaly for {{2}}:\n- Shift: {{3}}\n- Grace Cutoff: {{4}}\n- Status: {{5}}\n\nIf you are on duty, please regularize your attendance through the portal or reply to this message.',
        example: {
          body_text: [
            ['Ramesh Kumar', '22 Sep 2026', 'General Shift (09:00 AM - 06:00 PM)', '09:30 AM', 'Missing In-Punch']
          ]
        }
      },
      {
        type: 'FOOTER',
        text: 'Joy PeopleHR Automated Workforce System'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Regularize Attendance',
            url: 'https://app.joypeoplehr.com/attendance/regularization'
          }
        ]
      }
    ]
  },
  {
    name: 'joy_company_announcement_v1',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Announcement: {{1}}'
      },
      {
        type: 'BODY',
        text: 'Dear {{1}},\n\n{{2}}\n\n{{3}}\n\nPublished by: {{4}}\nEffective Date: {{5}}',
        example: {
          header_text: ['Festival Holiday Notice'],
          body_text: [
            ['Team Member', 'Important Company Announcement', 'Office will remain closed on 2nd October on account of Gandhi Jayanti.', 'HR Department', '22 Sep 2026']
          ]
        }
      },
      {
        type: 'FOOTER',
        text: 'Joy PeopleHR Corporate Bulletin'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'View in Portal',
            url: 'https://app.joypeoplehr.com/announcements'
          }
        ]
      }
    ]
  },
  {
    name: 'joy_auth_otp_v1',
    category: 'AUTHENTICATION',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        add_security_recommendation: true
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'OTP',
            otp_type: 'COPY_CODE',
            text: 'Copy Code'
          }
        ]
      }
    ]
  }
];

async function registerTemplates() {
  for (const t of templates) {
    console.log(`Submitting template: ${t.name}...`);
    try {
      const res = await fetch(`https://graph.facebook.com/v20.0/${wabaId}/message_templates`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(t)
      });
      const data = await res.json();
      console.log(`Result for ${t.name}:`, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(`Error submitting ${t.name}:`, err);
    }
  }
}

registerTemplates();
