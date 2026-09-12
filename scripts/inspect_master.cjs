const xlsx = require('xlsx');

const masterWb = xlsx.readFile('D:/web-app (2)/Joy PeopleHR/Test Data/Master Data Final (4).xlsx');
const masterSheet = masterWb.Sheets['Master'];
const rows = xlsx.utils.sheet_to_json(masterSheet, { header: 1 });
rows.slice(0, 10).forEach((r, i) => console.log('Row ' + i + ':', JSON.stringify(r.slice(0, 12))));
