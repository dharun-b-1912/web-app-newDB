const fs = require('fs');
const path = require('path');

// 1. Check template registry and service
console.log('=== 1. TEMPLATE STORAGE DISCOVERY ===');
const serviceCode = fs.readFileSync('src/features/people/idcard/idCardService.ts', 'utf8');
const typesCode = fs.readFileSync('src/features/people/idcard/idCardTypes.ts', 'utf8');
const registryCode = fs.readFileSync('src/features/people/idcard/v2/templateRegistryV2.ts', 'utf8');

// Find template functions
const tFuncs = serviceCode.match(/(?:export\s+)?(?:async\s+)?function\s+[a-zA-Z0-9_]*[Tt]emplate[a-zA-Z0-9_]*\s*\([^)]*\)/g);
console.log('Template functions in idCardService:', tFuncs);

// Check localStorage keys or Supabase tables for templates
const storageMatches = serviceCode.match(/localStorage\.[a-zA-Z]+|\.from\(['"][a-zA-Z0-9_]+['"]\)/g);
console.log('Storage calls in idCardService:', Array.from(new Set(storageMatches)));

// 2. Check CardSideData and CardElement schema in idCardTypes.ts
console.log('\n=== 2. SCHEMA: BACKGROUNDS & IMAGES ===');
const sideDataMatch = typesCode.match(/export\s+interface\s+CardSideData\s*\{[^}]+\}/);
console.log('CardSideData definition:', sideDataMatch ? sideDataMatch[0] : 'Not found');

const imgElemMatch = typesCode.match(/export\s+interface\s+ImageElement\s*\{[^}]+\}/);
console.log('ImageElement definition:', imgElemMatch ? imgElemMatch[0] : 'Not found');

// 3. Check PDF export and background drawing in idCardPdfEngine.ts
console.log('\n=== 3. PDF EXPORT & BACKGROUND RENDERING ===');
const engineCode = fs.readFileSync('src/features/people/idcard/idCardPdfEngine.ts', 'utf8');
const drawBgMatch = engineCode.match(/function\s+drawBackgroundArtwork\s*\([^)]*\)\s*\{[^}]*\}/);
console.log('drawBackgroundArtwork snippet:', drawBgMatch ? drawBgMatch[0].slice(0, 300) : 'Not found');

// Check renderCmykItem
const renderCmykMatch = engineCode.match(/export\s+async\s+function\s+renderCmykItem[\s\S]*?return\s+\{[\s\S]*?\};/);
if (renderCmykMatch) {
  console.log('renderCmykItem summary:', renderCmykMatch[0].split('\n').slice(0, 25).join('\n'));
}

// 4. File storage in codebase (Supabase storage buckets, S3, etc.)
console.log('\n=== 4. FILE STORAGE CAPABILITIES ===');
const filesInSrc = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      if (!p.includes('node_modules') && !p.includes('.git') && !p.includes('dist')) walk(p);
    } else if (f.endsWith('.ts') || f.endsWith('.tsx')) {
      const c = fs.readFileSync(p, 'utf8');
      if (c.includes('storage.from') || c.includes('upload(') || c.includes('S3Client') || c.includes('storageAdmin')) {
        filesInSrc.push({ file: p, match: c.match(/storage(?:\.from|Admin)[a-zA-Z0-9_.()'"\s]+/g) });
      }
    }
  }
}
walk('src');
console.log('Storage usages found in src:', filesInSrc.slice(0, 10));

// 5. Fonts in PDF
console.log('\n=== 5. FONTS IN PDF ENGINE ===');
const fontMatches = engineCode.match(/(?:font|Font|Helvetica|Noto|Plex)[a-zA-Z0-9_\-.'"\s:=,]+/g);
console.log('Font references in pdf engine:', Array.from(new Set(fontMatches?.slice(0, 10))));

