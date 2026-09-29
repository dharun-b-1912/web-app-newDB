const dailyWage = 605;
const basicPct = 55;
const hraPct = 45;
const basicHourlyRate = (dailyWage * (basicPct / 100)) / 8; // 41.59375
const otRate = basicHourlyRate * 2; // 83.1875

console.log('Daily Wage:', dailyWage);
console.log('Basic (55%):', dailyWage * 0.55);
console.log('Basic Hourly Rate:', basicHourlyRate);
console.log('OT Rate (2x basic hourly):', otRate);

const totalPayDays = 880;
const totalOtHours = 1346;
const totalFA = 6460;
const totalNA = 6795;
const totalCanteen = 6240;

const basicTotal = Math.round(dailyWage * totalPayDays * 0.55);
const hraTotal = Math.round(dailyWage * totalPayDays * 0.45);
const baseWages = basicTotal + hraTotal;
const otStipend = Math.round(otRate * totalOtHours);
const gross = baseWages + otStipend + totalFA + totalNA;

const esiWage = gross - hraTotal;
const pf = Math.round(basicTotal * 0.12);
const esi = Math.ceil(esiWage * 0.0075);
const totalDeductions = pf + esi + totalCanteen;
const net = gross - totalDeductions;

console.log('--- RECONCILED TOTALS ---');
console.log('Base Wages:', baseWages, '(Excel: 532,409)');
console.log('OT Stipend:', otStipend, '(Excel: 111,973)');
console.log('Food Allowance:', totalFA, '(Excel: 6,460)');
console.log('Night Allowance:', totalNA, '(Excel: 6,795)');
console.log('Gross:', gross, '(Excel: 657,637)');
console.log('PF 12%:', pf, '(Excel: 35,138)');
console.log('ESI 0.75%:', esi, '(Excel: 3,153)');
console.log('Canteen:', totalCanteen, '(Excel: 6,240)');
console.log('Total Deductions:', totalDeductions, '(Excel: 44,531)');
console.log('Net Take-Home:', net, '(Excel: 613,106)');
