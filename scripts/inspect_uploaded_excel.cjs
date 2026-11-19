const XLSX = require('xlsx');
const path = 'C:/Users/hp/.gemini/antigravity/brain/fd7ea8f7-0476-4a0b-851c-1c9b1ce88eb7/.user_uploaded/media_1795087557467_c402201a.xlsx';
try {
  const wb = XLSX.readFile(path);
  console.log('Sheet names:', wb.SheetNames);
  for (const name of wb.SheetNames) {
    const data = XLSX.utils.sheet_to_json(wb.Sheets[name]);
    console.log(`\n--- Sheet: ${name} (Total rows: ${data.length}) ---`);
    if (data.length > 0) {
      console.log('Columns:', Object.keys(data[0]));
      console.log('First 3 rows:', JSON.stringify(data.slice(0, 3), null, 2));
    }
  }
} catch (e) {
  console.error('Error reading xlsx:', e);
}
