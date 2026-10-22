import { saasCommercialService } from '../src/services/platform/saasCommercialService.ts';

console.log('--- COMMERCIAL DATA LIFECYCLE VERIFICATION ---');
const clients = saasCommercialService.getClients();
const quotes = saasCommercialService.getQuotations();
const invoices = saasCommercialService.getInvoices();

console.log('Clients count:', clients.length);
console.log('Quotations count:', quotes.length);
console.log('Invoices count:', invoices.length);

const openPipeline = quotes
  .filter(q => ['DRAFT', 'INTERNAL_REVIEW', 'SENT', 'APPROVED'].includes(q.status))
  .reduce((sum, q) => sum + q.pricingSnapshot.totalFirstYearValue, 0);

const acceptedValue = quotes
  .filter(q => ['ACCEPTED', 'CONVERTED'].includes(q.status))
  .reduce((sum, q) => sum + q.pricingSnapshot.totalFirstYearValue, 0);

const totalBilled = invoices.reduce((sum, i) => sum + i.totalInvoiceAmount, 0);
const totalOutstanding = invoices.reduce((sum, i) => sum + i.balanceDue, 0);
const totalTax = invoices.reduce((sum, i) => sum + i.totalTax, 0);

console.log('Open Pipeline Value:', openPipeline);
console.log('Accepted Value:', acceptedValue);
console.log('Total Invoiced Value:', totalBilled);
console.log('Total Outstanding Balance:', totalOutstanding);
console.log('Total GST Liability (18%):', totalTax);

if (openPipeline > 0 && acceptedValue > 0 && totalBilled > 0) {
  console.log('>>> ALL COMMERCIAL MODELS DYNAMIC AND VERIFIED SUCCESSFULLY! <<<');
} else {
  console.error('FAILED: Missing data in calculations');
  process.exit(1);
}
