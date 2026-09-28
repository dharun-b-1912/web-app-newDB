const fs = require('fs');
const src = fs.readFileSync('scratch/exact_ot_export.ts', 'utf8');
fs.writeFileSync('src/services/vendor/fixtures/joySepOtBenchmarkFixture.ts', src);
console.log('Created joySepOtBenchmarkFixture.ts');
