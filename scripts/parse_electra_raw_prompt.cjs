const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Let's read the raw text from transcript or file
const rawDataPath = path.join(__dirname, 'raw_electra_input.txt');

