import { saasPricingEngine } from '../src/services/platform/saasPricingEngine';

console.log('=== VERIFYING SAAS PRICING ENGINE WITH HANDWRITTEN SLAB MODEL ===\n');

// Test 1: Starter with 40 employees, Monthly
const q1 = saasPricingEngine.calculateQuote({
  planCode: 'STARTER',
  employeeCount: 40,
  billingCycle: 'Monthly',
  selectedAddonKeys: [],
});
console.log('1. Starter (40 emp, Monthly):');
console.log(`   Applied PEPM: ₹${q1.appliedPepmRate}/mo`);
console.log(`   Net Pre-tax:  ₹${q1.netPreTaxAmount}`);
console.log(`   Grand Total:  ₹${q1.grandTotal} (inc 18% GST)`);

// Test 2: Starter with 40 employees, Annual
const q2 = saasPricingEngine.calculateQuote({
  planCode: 'STARTER',
  employeeCount: 40,
  billingCycle: 'Annual',
  selectedAddonKeys: [],
});
console.log('\n2. Starter (40 emp, Annual):');
console.log(`   Applied PEPM: ₹${q2.appliedPepmRate}/mo`);
console.log(`   Net Pre-tax:  ₹${q2.netPreTaxAmount}`);
console.log(`   Grand Total:  ₹${q2.grandTotal} (inc 18% GST)`);

// Test 3: Premium with 150 employees, Monthly
const q3 = saasPricingEngine.calculateQuote({
  planCode: 'PREMIUM',
  employeeCount: 150,
  billingCycle: 'Monthly',
  selectedAddonKeys: [],
});
console.log('\n3. Premium (150 emp, Monthly):');
console.log(`   Applied PEPM: ₹${q3.appliedPepmRate}/mo`);
console.log(`   Net Pre-tax:  ₹${q3.netPreTaxAmount}`);
console.log(`   Grand Total:  ₹${q3.grandTotal} (inc 18% GST)`);

// Test 4: Premium with 150 employees, Annual (should include ₹6,999 setup fee)
const q4 = saasPricingEngine.calculateQuote({
  planCode: 'PREMIUM',
  employeeCount: 150,
  billingCycle: 'Annual',
  selectedAddonKeys: [],
});
console.log('\n4. Premium (150 emp, Annual):');
console.log(`   Applied PEPM: ₹${q4.appliedPepmRate}/mo`);
console.log(`   Setup Fee:    ₹${q4.appliedSetupFee}`);
console.log(`   Net Pre-tax:  ₹${q4.netPreTaxAmount} (150 * 80 * 12 + 6999 = 150999)`);
console.log(`   Grand Total:  ₹${q4.grandTotal} (inc 18% GST)`);

// Test 5: Enterprise with 350 employees, Annual (should include ₹4,999 setup fee)
const q5 = saasPricingEngine.calculateQuote({
  planCode: 'ENTERPRISE',
  employeeCount: 350,
  billingCycle: 'Annual',
  selectedAddonKeys: ['extra_hr_user', 'whatsapp_meter_bundle'],
});
console.log('\n5. Enterprise (350 emp, Annual + 2 Add-ons):');
console.log(`   Applied PEPM: ₹${q5.appliedPepmRate}/mo`);
console.log(`   Setup Fee:    ₹${q5.appliedSetupFee}`);
console.log(`   Add-ons/mo:   ₹${q5.addonsMonthlyTotal}/mo`);
console.log(`   Net Pre-tax:  ₹${q5.netPreTaxAmount}`);
console.log(`   Grand Total:  ₹${q5.grandTotal} (inc 18% GST)`);

console.log('\nCalculation Steps for Test 4:');
q4.calculationSteps.forEach(s => console.log(' • ' + s));
