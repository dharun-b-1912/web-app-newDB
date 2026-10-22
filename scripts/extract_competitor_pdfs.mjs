import fs from 'fs';
import path from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const pdfDir = 'd:/web-app (2)/Joy PeopleHR/Test Data/Other compitetiors Quotes';
const files = [
  'greytHR Corporate Plans and Features 2026.pdf',
  'EZHRM_Suite _Jay_corporation Quarterly docx.pdf',
  'JOY CORPORATE SOLUTIONS HR NG_On-SaaS_2026.pdf',
];

async function extractTextFromPDF(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdfDocument = await loadingTask.promise;
  const numPages = pdfDocument.numPages;
  let fullText = `=== Document: ${path.basename(filePath)} (Pages: ${numPages}) ===\n`;

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDocument.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += `\n--- Page ${i} ---\n${pageText}\n`;
  }
  return fullText;
}

async function run() {
  for (const file of files) {
    const filePath = path.join(pdfDir, file);
    try {
      console.log(`Extracting: ${file}...`);
      const text = await extractTextFromPDF(filePath);
      const outPath = path.join('d:/web-app (2)/Joy PeopleHR/scratch', `${file}.txt`);
      if (!fs.existsSync('d:/web-app (2)/Joy PeopleHR/scratch')) {
        fs.mkdirSync('d:/web-app (2)/Joy PeopleHR/scratch', { recursive: true });
      }
      fs.writeFileSync(outPath, text, 'utf8');
      console.log(`Saved: ${outPath} (${text.length} chars)`);
    } catch (err) {
      console.error(`Error on ${file}:`, err);
    }
  }
}

run();
