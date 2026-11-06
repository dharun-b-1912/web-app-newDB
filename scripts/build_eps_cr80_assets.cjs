// scripts/build_eps_cr80_assets.cjs
// ============================================================================
// Builds CR80-proportioned (709 x 1082 px @ 300 DPI with 3mm bleed) front & back
// backgrounds from the extracted EPS WebP assets WITHOUT stretching:
// 1. Trims top/bottom/right artboard border lines cleanly (left: 4, top: 4, w: 686, h: 1242)
// 2. Scales uniformly (1:1 aspect ratio) to height = 1082 px (width = 598 px)
// 3. Extends left (55 px) and right (56 px) edges seamlessly from outer border strips
// 4. Cleans the inner checkerboard of the front gold circle & back sample QR/text
// ============================================================================

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const pkgDir = 'C:/Users/hp/.gemini/antigravity/brain/607f29a2-17c7-4b9c-b3a0-d4836a0335af/scratch/eps_pkg';
const outDir = path.join(__dirname, '..', 'public', 'templates', 'eps-yellow-geometric');

async function processSide(inputWebp, side) {
  fs.mkdirSync(outDir, { recursive: true });

  const cropLeft = 4;
  const cropTop = 4;
  const cropW = 686;
  const cropH = 1242;
  const scale = 1082 / cropH; // 0.8711755
  const scaledW = Math.round(cropW * scale); // 598 px
  const targetW = 709;
  const targetH = 1082;
  const padLeft = Math.floor((targetW - scaledW) / 2); // 55 px
  const padRight = targetW - scaledW - padLeft; // 56 px

  // Resize uniformly (no stretching!)
  const scaledBuf = await sharp(inputWebp)
    .extract({ left: cropLeft, top: cropTop, width: cropW, height: cropH })
    .resize(scaledW, targetH, { fit: 'fill', kernel: 'lanczos3' })
    .png()
    .toBuffer();

  const leftStrip = await sharp(scaledBuf)
    .extract({ left: 2, top: 0, width: 4, height: targetH })
    .resize(padLeft, targetH, { fit: 'fill' })
    .png()
    .toBuffer();

  const rightStrip = await sharp(scaledBuf)
    .extract({ left: scaledW - 6, top: 0, width: 4, height: targetH })
    .resize(padRight, targetH, { fit: 'fill' })
    .png()
    .toBuffer();

  // Compute exact transformed coordinates on the 709 x 1082 canvas:
  const cxPx = Math.round(padLeft + (348 - cropLeft) * scale);
  const cyPx = Math.round((615 - cropTop) * scale);
  const rInnerPx = Math.round(241 * scale);
  const rOuterPx = Math.round(268 * scale);

  const qrLeftPx = Math.round(padLeft + (172 - cropLeft) * scale);
  const qrTopPx = Math.round((452 - cropTop) * scale);
  const qrWidthPx = Math.round((511 - 172) * scale);
  const qrHeightPx = Math.round((792 - 452) * scale);

  let cleanupSvg = '';
  if (side === 'front') {
    const nameMaskTop = Math.round((938 - cropTop) * scale);
    const nameMaskH = Math.round(90 * scale);
    const headerMaskTop = Math.round((238 - cropTop) * scale);
    const headerMaskH = Math.round(80 * scale);

    cleanupSvg = `<svg width="${targetW}" height="${targetH}" xmlns="http://www.w3.org/2000/svg">
      <!-- Clean white interior inside the gold photo ring -->
      <circle cx="${cxPx}" cy="${cyPx}" r="${rInnerPx}" fill="#ffffff"/>
      <!-- Redraw crisp vector gold ring to ensure razor-sharp 300 DPI print edge -->
      <circle cx="${cxPx}" cy="${cyPx}" r="${Math.round((rInnerPx + rOuterPx) / 2)}" fill="none" stroke="#FDC827" stroke-width="${rOuterPx - rInnerPx}"/>
      <!-- Tight mask over static YOUR NAME / POSITION sample text (stays clear of yellow waves) -->
      <rect x="${Math.round(targetW * 0.30)}" y="${nameMaskTop}" width="${Math.round(targetW * 0.40)}" height="${nameMaskH}" rx="8" fill="#ffffff"/>
      <!-- Tight mask over static CREATING BRIGHTER FUTURE sample text -->
      <rect x="${Math.round(targetW * 0.36)}" y="${headerMaskTop}" width="${Math.round(targetW * 0.28)}" height="${headerMaskH}" rx="8" fill="#ffffff"/>
    </svg>`;
  } else {
    const termsMaskTop = Math.round((892 - cropTop) * scale);
    const termsMaskH = Math.round(78 * scale);
    const headerMaskTop = Math.round((262 - cropTop) * scale);
    const headerMaskH = Math.round(82 * scale);

    cleanupSvg = `<svg width="${targetW}" height="${targetH}" xmlns="http://www.w3.org/2000/svg">
      <!-- Clean white interior inside the gold QR frame -->
      <rect x="${qrLeftPx}" y="${qrTopPx}" width="${qrWidthPx}" height="${qrHeightPx}" fill="#ffffff"/>
      <!-- Tight mask over static Lorem ipsum text (stays clear of yellow waves) -->
      <rect x="${Math.round(targetW * 0.18)}" y="${termsMaskTop}" width="${Math.round(targetW * 0.64)}" height="${termsMaskH}" rx="8" fill="#ffffff"/>
      <!-- Tight mask over static CREATING BRIGHTER FUTURE header -->
      <rect x="${Math.round(targetW * 0.36)}" y="${headerMaskTop}" width="${Math.round(targetW * 0.28)}" height="${headerMaskH}" rx="8" fill="#ffffff"/>
    </svg>`;
  }

  const compositeImg = sharp({
    create: {
      width: targetW,
      height: targetH,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  }).composite([
    { input: leftStrip, left: 0, top: 0 },
    { input: scaledBuf, left: padLeft, top: 0 },
    { input: rightStrip, left: padLeft + scaledW, top: 0 },
    { input: Buffer.from(cleanupSvg), left: 0, top: 0 },
  ]);

  const webpOut = path.join(outDir, `${side}_background.webp`);
  const pngOut = path.join(outDir, `${side}_background.png`);
  await compositeImg.clone().webp({ quality: 92 }).toFile(webpOut);
  await compositeImg.clone().png().toFile(pngOut);

  const pxPerMm = 300 / 25.4;
  const bleedMm = 3.0;

  if (side === 'front') {
    const photoDiamPx = rInnerPx * 2;
    const photoLeftMm = (cxPx - rInnerPx) / pxPerMm - bleedMm;
    const photoTopMm = (cyPx - rInnerPx) / pxPerMm - bleedMm;
    const photoSizeMm = photoDiamPx / pxPerMm;
    console.log('Front CR80 Photo Circle (mm relative to trim):', {
      x: Number(photoLeftMm.toFixed(2)),
      y: Number(photoTopMm.toFixed(2)),
      w: Number(photoSizeMm.toFixed(2)),
      h: Number(photoSizeMm.toFixed(2)),
      radius: Number((photoSizeMm / 2).toFixed(2)),
    });
  } else {
    const qrLeftMm = qrLeftPx / pxPerMm - bleedMm;
    const qrTopMm = qrTopPx / pxPerMm - bleedMm;
    const qrWMm = qrWidthPx / pxPerMm;
    const qrHMm = qrHeightPx / pxPerMm;
    console.log('Back CR80 QR Frame Inner (mm relative to trim):', {
      x: Number(qrLeftMm.toFixed(2)),
      y: Number(qrTopMm.toFixed(2)),
      w: Number(qrWMm.toFixed(2)),
      h: Number(qrHMm.toFixed(2)),
    });
  }

  return { webpOut, pngOut };
}

async function run() {
  await processSide(path.join(pkgDir, 'front_background.webp'), 'front');
  await processSide(path.join(pkgDir, 'back_background.webp'), 'back');
  fs.copyFileSync(
    path.join(pkgDir, 'joy_eps_id_template_config.json'),
    path.join(outDir, 'joy_eps_id_template_config.json')
  );
  console.log('✓ Rebuilt clean CR80-proportioned EPS WebP & PNG backgrounds!');
}

run().catch(console.error);
