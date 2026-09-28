import { VendorAttendanceEmailModal } from '../src/features/vendor/components/VendorAttendanceEmailModal';
import { VendorAttendanceEngineTab } from '../src/features/vendor/components/VendorAttendanceEngineTab';
import { resendEmailService } from '../src/services/email/resendEmailService';

console.log('✓ Components and services compiled and imported cleanly!');
console.log('VendorAttendanceEmailModal:', typeof VendorAttendanceEmailModal);
console.log('VendorAttendanceEngineTab:', typeof VendorAttendanceEngineTab);
console.log('resendEmailService:', typeof resendEmailService.sendAttendanceReconciliationReportEmail);
