import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
const envLines = fs.readFileSync('.env', 'utf-8').split('\n');
const keyNames = envLines.map(l => l.split('=')[0].trim()).filter(k => k && !k.startsWith('#'));
console.log('Keys in .env:', keyNames);

