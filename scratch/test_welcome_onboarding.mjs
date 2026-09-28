import 'dotenv/config';
import { whatsAppNotificationService } from '../src/services/whatsapp/whatsappNotificationService.js';

async function testWelcome() {
  const targetPhone = process.argv[2] || '9840209900';
  console.log(`Sending automated Employee Welcome Pack with Image to ${targetPhone}...`);

  const res = await whatsAppNotificationService.sendEmployeeWelcomeOnboarding({
    phone: targetPhone,
    employeeName: 'Thirumalai R K',
    employeeCode: 'WF-1001',
    companyName: 'Joy Corporate Solutions Pvt Ltd',
    designation: 'Senior HR & Operations Specialist',
    portalUrl: 'https://app.joypeoplehr.com',
    imageUrl: 'https://app.joypeoplehr.com/joy-people-hr-logo.png',
  });

  console.log('Result:', res);
}

testWelcome();
