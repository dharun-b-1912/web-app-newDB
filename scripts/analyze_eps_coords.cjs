const sharp = require('sharp');
const path = require('path');

const pkgDir = 'C:/Users/hp/.gemini/antigravity/brain/607f29a2-17c7-4b9c-b3a0-d4836a0335af/scratch/eps_pkg';

async function measureExact() {
  const { data, info } = await sharp(path.join(pkgDir, 'front_background.webp'))
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width, ch = info.channels;

  // Scan vertical line x = 350 from y = 320 to 900 for gold pixels (R > 235, G > 175, B < 70)
  const goldY = [];
  for (let y = 320; y < 900; y++) {
    const idx = (y * w + 350) * ch;
    if (data[idx] > 235 && data[idx + 1] > 175 && data[idx + 2] < 80) {
      goldY.push(y);
    }
  }
  console.log('Gold Y segments at x=350:', {
    topOuter: goldY[0],
    topInner: goldY.find((y, i) => goldY[i + 1] > y + 5),
    bottomInner: goldY.find((y, i) => i > 0 && y > goldY[i - 1] + 5),
    bottomOuter: goldY[goldY.length - 1],
  });

  // Scan horizontal line y = 614 from x = 50 to 650 for gold pixels
  const goldX = [];
  for (let x = 50; x < 650; x++) {
    const idx = (614 * w + x) * ch;
    if (data[idx] > 235 && data[idx + 1] > 175 && data[idx + 2] < 80) {
      goldX.push(x);
    }
  }
  console.log('Gold X segments at y=614:', {
    leftOuter: goldX[0],
    leftInner: goldX.find((x, i) => goldX[i + 1] > x + 5),
    rightInner: goldX.find((x, i) => i > 0 && x > goldX[i - 1] + 5),
    rightOuter: goldX[goldX.length - 1],
  });

  // Also check Back QR box inner and outer borders at y = 622 and x = 342
  const backRaw = await sharp(path.join(pkgDir, 'back_background.webp'))
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bGoldX = [];
  for (let x = 150; x < 550; x++) {
    const idx = (622 * w + x) * backRaw.info.channels;
    if (backRaw.data[idx] > 235 && backRaw.data[idx + 1] > 175 && backRaw.data[idx + 2] < 80) {
      bGoldX.push(x);
    }
  }
  const bGoldY = [];
  for (let y = 430; y < 820; y++) {
    const idx = (y * w + 342) * backRaw.info.channels;
    if (backRaw.data[idx] > 235 && backRaw.data[idx + 1] > 175 && backRaw.data[idx + 2] < 80) {
      bGoldY.push(y);
    }
  }
  console.log('Back QR Gold X:', {
    leftOuter: bGoldX[0],
    leftInner: bGoldX.find((x, i) => bGoldX[i + 1] > x + 5),
    rightInner: bGoldX.find((x, i) => i > 0 && x > bGoldX[i - 1] + 5),
    rightOuter: bGoldX[bGoldX.length - 1],
  });
  console.log('Back QR Gold Y:', {
    topOuter: bGoldY[0],
    topInner: bGoldY.find((y, i) => bGoldY[i + 1] > y + 5),
    bottomInner: bGoldY.find((y, i) => i > 0 && y > bGoldY[i - 1] + 5),
    bottomOuter: bGoldY[bGoldY.length - 1],
  });
}

measureExact().catch(console.error);
