import { whatsAppNotificationService } from '../src/services/whatsapp/whatsappNotificationService.js';

// Test dispatching welcome with exact employee code & designation for Thirumalai R K
async function run() {
  console.log('Sending authoritative welcome message with interactive buttons...');
  const res = await whatsAppNotificationService.sendEmployeeWelcomeOnboarding({
    phone: '9384125278',
    employeeName: 'Thirumalai R K',
    employeeCode: 'WF-1001',
    companyName: 'Joy Corporate Solutions Pvt. Ltd.',
    designation: 'Senior Software Engineer',
    organizationId: '0c621892-e938-4707-9957-13534ea32c19',
    employeeId: '0dc8993f-c0cc-4143-aedc-d4893e41b001',
  });

  console.log('Result:', JSON.stringify(res, null, 2));
}

run().catch(console.error);
