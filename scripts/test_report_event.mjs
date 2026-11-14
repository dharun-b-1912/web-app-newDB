async function run() {
  const res = await fetch('https://ysiajemrqakfngasehhi.supabase.co/functions/v1/telegram-webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'report_event',
      event: {
        eventCode: 'UI-001',
        severity: 'P1',
        serviceName: 'React Web Application',
        message: 'Uncaught TypeError: Cannot read properties of undefined (reading calculatePayrollNet)',
        sourceLocation: '/payroll/process',
        diagnosticPayload: {
          component: 'PayrollProcessingModal',
          tenantId: '0c621892-e938-4707-9957-13534ea32c19',
          browser: 'Chrome 131.0 Windows'
        },
        probableCause: 'Employee statutory benefits object was undefined for contractor profile.',
        recommendedAction: 'Add null-safe chaining to employee.statutoryBenefits.calculatePayrollNet().'
      }
    })
  });

  console.log('Report Event Response Status:', res.status);
  const data = await res.json();
  console.log('Response Data:', data);
}

run();
