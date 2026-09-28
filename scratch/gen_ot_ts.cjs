const fs = require('fs');
const exactOt = JSON.parse(fs.readFileSync('scratch/exact_ot_records.json', 'utf8'));

console.log('Number of OT records:', exactOt.length);
let code = 'export const JOY_SEP_EXACT_OT_31 = ' + JSON.stringify(exactOt, null, 2) + ';\n';
fs.writeFileSync('scratch/exact_ot_export.ts', code);
console.log('Saved scratch/exact_ot_export.ts');
