import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function processLogos() {
  const masterPath = 'assets/JOY PeopleHR Corporate Logo (1).png';
  if (!fs.existsSync(masterPath)) {
    console.error('Master logo not found at:', masterPath);
    process.exit(1);
  }

  // 1. Copy master asset directly to public
  fs.copyFileSync(masterPath, 'public/joy-corporate-logo-master.png');
  console.log('Copied master to public/joy-corporate-logo-master.png');

  // 2. High-res Trimmed version (tight bounding box)
  await sharp(masterPath)
    .trim({ threshold: 10 })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile('public/joy-corporate-logo.png');
  
  const metaTrimmed = await sharp('public/joy-corporate-logo.png').metadata();
  console.log('Created public/joy-corporate-logo.png:', metaTrimmed.width, 'x', metaTrimmed.height);

  // 3. Transparent background version
  const { data, info } = await sharp(masterPath)
    .trim({ threshold: 10 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Convert white background to transparent while preserving anti-aliased text edges
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const minVal = Math.min(r, g, b);
    const maxVal = Math.max(r, g, b);
    const avg = (r + g + b) / 3;

    // White or near-white background
    if (minVal > 248) {
      data[i + 3] = 0;
    } else if (minVal > 235 && (maxVal - minVal) < 15) {
      // Near-neutral light grey antialiased edge
      const factor = (248 - minVal) / 13;
      data[i + 3] = Math.min(255, Math.max(0, Math.round(factor * 255)));
    }
  }

  await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile('public/joy-corporate-logo-transparent.png');

  console.log('Created public/joy-corporate-logo-transparent.png:', info.width, 'x', info.height);

  // 4. Also generate a compact version optimized for 40-50px height display
  await sharp('public/joy-corporate-logo-transparent.png')
    .resize({ height: 96, fit: 'inside' })
    .png({ quality: 100 })
    .toFile('public/joy-corporate-logo-sm.png');

  console.log('Created public/joy-corporate-logo-sm.png for fast high-DPI rendering');
}

processLogos().catch(console.error);
