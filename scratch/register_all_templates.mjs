const token = 'EAAVABkQlajUBSjPw0ZChZCPzoO3nFz2aI2tDnnkZBOsgUquxD0Dw8NZCIOKYfCr0vk7hDfWYyIiDuWkZCzqjhwU6CwnxnumN1IDlu9pKhAKFLOMUZAmGT0gOBZBhtcXZApEUGmUSHtNC7or1Nv3z9HKHtyvSVGF3dH5J2GbVGYKzsSMiuRvmJ8KhqdSIQV0kkAZDZD';
const wabaId = '1550382319749383';

const templates = [
  {
    name: 'joy_monthly_payslip_v1',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'HEADER',
        format: 'DOCUMENT',
        example: {
          header_handle: ['https://app.joypeoplehr.com/sample_payslip.pdf']
        }
      },
      {
        type: 'BODY',
        text: 'Dear {{1}},\n\nYour salary for the month of {{2}} has been credited.\n\n*Payslip Summary:*\n- Net Disbursed: {{3}}\n- Account: {{4}}\n- Credit Date: {{5}}\n\nYour formal confidential payslip PDF is attached above. For detailed breakdowns or queries, visit your Joy PeopleHR ESS portal.',
        example: {
          body_text: [
            ['Ramesh Kumar', 'September 2026', '₹65,420.00', 'XXXX5012', '22-09-2026']
          ]
        }
      },
      {
        type: 'FOOTER',
        text: 'Joy PeopleHR Payroll • Joy Corporate Solutions'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'View Tax & Salary Slip',
            url: 'https://app.joypeoplehr.com/payroll/my-payslips'
          }
        ]
      }
    ]
  },
  {
    name: 'joy_leave_approval_action_v1',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Leave Request: Action Required'
      },
      {
        type: 'BODY',
        text: 'Hello {{1}},\n\n{{2}} has submitted a leave application requiring your managerial review.\n\n*Details:*\n- Leave Type: {{3}}\n- Duration: {{4}}\n- Reason: {{5}}\n- Remaining Balance: {{6}}\n\nPlease review and take action directly below.',
        example: {
          body_text: [
            ['Manager Name', 'Divya R', 'Casual Leave (CL)', '24 Sep 2026 to 25 Sep 2026 (2 Days)', 'Family function', '8 Days Available']
          ]
        }
      },
      {
        type: 'FOOTER',
        text: 'Joy PeopleHR Workforce Management'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Open Approval Center',
            url: 'https://app.joypeoplehr.com/approvals/leave'
          }
        ]
      }
    ]
  },
  {
    name: 'joy_onboarding_candidate_invite_v1',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Welcome to Joy Corporate Solutions'
      },
      {
        type: 'BODY',
        text: 'Dear {{1}},\n\nCongratulations! We are delighted to welcome you to {{2}} as {{3}}.\n\nTo ensure a seamless joining process, please complete your digital onboarding by {{4}}.\n\nClick the button below to submit your statutory documentation securely.',
        example: {
          body_text: [
            ['Karthik S', 'Joy Corporate Solutions Pvt Ltd', 'Senior Software Engineer', '25 Sep 2026']
          ]
        }
      },
      {
        type: 'FOOTER',
        text: 'Joy PeopleHR Digital Onboarding'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Complete Onboarding',
            url: 'https://app.joypeoplehr.com/onboarding/welcome'
          }
        ]
      }
    ]
  }
];

async function registerAll() {
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

registerAll();
