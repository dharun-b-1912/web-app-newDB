// src/features/people/idcard/v2/customTemplateService.ts
// ============================================================================
// JOY PeopleHR — Custom ID Card Template Service & Artwork Processing Engine
// Handles Bring-Your-Own Design persistence, fit & bleed calculations,
// and organization template libraries.
// ============================================================================

import { CardGeometry, CR80_LANDSCAPE, CR80_PORTRAIT, CardElement, IdCardPersonRecord, TextElement } from '../idCardTypes';
import {
  IdCardCustomTemplate,
  FitCheckResult,
  FitRemedyType,
  TemplateAssetRef,
  CustomCardSideDef,
  CollisionWarning,
  KeepOutZone,
  TemplateVersionRecord,
  IdTemplateBundle,
  DesignGuideSpecKit,
  TemplateCardInfo,
  DraftRecoverySnapshot,
  PrintProductionBatch,
  IccOutputIntentProfile,
  PrintOutputFormat,
} from './types';
import { supabase } from '../../../../lib/supabase';
import { getWcagContrast } from '../idCardPdfEngine';

const LOCAL_STORAGE_KEY = 'joy_id_card_org_templates_v2';

/**
 * Standard CR80 Bleed & Trim Constants at 300 DPI
 */
export const CR80_BLEED_PX = {
  landscape: { w: 1082, h: 709, trimW: 1011, trimH: 638 },
  portrait: { w: 709, h: 1082, trimW: 638, trimH: 1011 },
};

/**
 * Analyzes uploaded artwork against the physical card geometry + 3mm bleed.
 */
export function analyzeArtworkFit(
  img: HTMLImageElement,
  geometry: CardGeometry
): FitCheckResult {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const targetWmm = geometry.w + 2 * geometry.bleed;
  const targetHmm = geometry.h + 2 * geometry.bleed;

  const targetAspect = targetWmm / targetHmm;
  const imgAspect = w / h;

  // Effective DPI at card size + bleed: (px / mm) * 25.4
  const effDpi = Math.round(Math.min((w / targetWmm) * 25.4, (h / targetHmm) * 25.4));

  // Check if matches trim only (e.g. within 3% of trim ratio 85.6 / 54)
  const trimAspect = geometry.w / geometry.h;
  const trimDiff = Math.abs(imgAspect - trimAspect) / trimAspect;
  const bleedDiff = Math.abs(imgAspect - targetAspect) / targetAspect;

  if (bleedDiff <= 0.02) {
    return {
      status: 'exact_bleed',
      effDpi,
      widthPx: w,
      heightPx: h,
      aspectRatio: imgAspect,
      message: effDpi >= 280
        ? `Perfect Fit: ${w} × ${h} px matches full card artboard with 3 mm bleed (${effDpi} DPI).`
        : `Matches card bleed ratio, but resolution is ${effDpi} DPI (recommended $\\ge$ 300 DPI).`,
    };
  }

  if (trimDiff <= 0.03) {
    return {
      status: 'trim_only',
      effDpi,
      widthPx: w,
      heightPx: h,
      aspectRatio: imgAspect,
      message: `Artwork matches finished trim size (${geometry.w} × ${geometry.h} mm) but lacks the required 3 mm print bleed.`,
    };
  }

  return {
    status: 'ratio_mismatch',
    effDpi,
    widthPx: w,
    heightPx: h,
    aspectRatio: imgAspect,
    message: `Aspect ratio (${(w / h).toFixed(2)}) differs from card (${targetAspect.toFixed(2)}). Scale or fit options available.`,
  };
}

/**
 * Extends trim-only artwork into the bleed area (3mm outer margin)
 * using edge clamping / mirror reflection onto a high-DPI canvas.
 */
export function extendArtworkIntoBleed(
  img: HTMLImageElement,
  geometry: CardGeometry,
  remedy: FitRemedyType,
  fillColor = '#ffffff'
): string {
  const isLandscape = geometry.orientation === 'landscape';
  const targetPxW = isLandscape ? CR80_BLEED_PX.landscape.w : CR80_BLEED_PX.portrait.w;
  const targetPxH = isLandscape ? CR80_BLEED_PX.landscape.h : CR80_BLEED_PX.portrait.h;

  const canvas = document.createElement('canvas');
  canvas.width = targetPxW;
  canvas.height = targetPxH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return img.src;

  const bleedPxX = Math.round((geometry.bleed / (geometry.w + 2 * geometry.bleed)) * targetPxW);
  const bleedPxY = Math.round((geometry.bleed / (geometry.h + 2 * geometry.bleed)) * targetPxH);
  const trimPxW = targetPxW - 2 * bleedPxX;
  const trimPxH = targetPxH - 2 * bleedPxY;

  if (remedy === 'scale_fill') {
    // Cover the entire bleed area
    const scale = Math.max(targetPxW / img.naturalWidth, targetPxH / img.naturalHeight);
    const sw = img.naturalWidth * scale;
    const sh = img.naturalHeight * scale;
    const sx = (targetPxW - sw) / 2;
    const sy = (targetPxH - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh);
  } else if (remedy === 'mirror_bleed' || remedy === 'extend_bleed') {
    // 1. Draw central image into trim area
    ctx.drawImage(img, bleedPxX, bleedPxY, trimPxW, trimPxH);

    // 2. Mirror or stretch edges into outer bleed margin
    // Top bleed
    ctx.drawImage(img, 0, 0, img.naturalWidth, 2, bleedPxX, 0, trimPxW, bleedPxY);
    // Bottom bleed
    ctx.drawImage(img, 0, img.naturalHeight - 2, img.naturalWidth, 2, bleedPxX, targetPxH - bleedPxY, trimPxW, bleedPxY);
    // Left bleed
    ctx.drawImage(img, 0, 0, 2, img.naturalHeight, 0, bleedPxY, bleedPxX, trimPxH);
    // Right bleed
    ctx.drawImage(img, img.naturalWidth - 2, 0, 2, img.naturalHeight, targetPxW - bleedPxX, bleedPxY, bleedPxX, trimPxH);
    // 4 Corners
    ctx.drawImage(img, 0, 0, 2, 2, 0, 0, bleedPxX, bleedPxY);
    ctx.drawImage(img, img.naturalWidth - 2, 0, 2, 2, targetPxW - bleedPxX, 0, bleedPxX, bleedPxY);
    ctx.drawImage(img, 0, img.naturalHeight - 2, 2, 2, 0, targetPxH - bleedPxY, bleedPxX, bleedPxY);
    ctx.drawImage(img, img.naturalWidth - 2, img.naturalHeight - 2, 2, 2, targetPxW - bleedPxX, targetPxH - bleedPxY, bleedPxX, bleedPxY);
  } else {
    // Solid color background fill
    ctx.fillStyle = fillColor;
    ctx.fillRect(0, 0, targetPxW, targetPxH);
    ctx.drawImage(img, bleedPxX, bleedPxY, trimPxW, trimPxH);
  }

  return canvas.toDataURL('image/png', 0.95);
}

export interface DetectedPhotoFrame {
  detected: boolean;
  /** Exact inner cutout box (inside the colored frame border) — best when Photo is IN FRONT */
  innerBox: {
    x: number;
    y: number;
    w: number;
    h: number;
    radius: number;
    shape: 'rounded' | 'circle' | 'arch' | 'rect';
  };
  /** Slightly expanded box tucked under the artwork frame border — best when Photo is BEHIND BG Frame */
  behindFrameBox: {
    x: number;
    y: number;
    w: number;
    h: number;
    radius: number;
    shape: 'rounded' | 'circle' | 'arch' | 'rect';
  };
  borderThicknessMm: number;
  confidence: number;
  summary: string;
}

/**
 * Analyzes an uploaded ID card background artwork to automatically detect
 * the drawn photo frame's inner window, outer frame border, and corner radius.
 */
export function analyzeArtworkPhotoFrame(
  img: HTMLImageElement,
  geometry: CardGeometry
): DetectedPhotoFrame {
  const isLand = geometry.orientation === 'landscape';
  const scale = 5; // 5 px per mm
  const cw = Math.round(geometry.w * scale);
  const ch = Math.round(geometry.h * scale);

  const defaultInner = {
    x: isLand ? 6.5 : Number(((geometry.w - 22.6) / 2).toFixed(1)),
    y: isLand ? Number(((geometry.h - 27.6) / 2).toFixed(1)) : 30.2,
    w: 22.6,
    h: 26.8,
    radius: 3.8,
    shape: 'rounded' as const,
  };

  try {
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return {
        detected: false,
        innerBox: defaultInner,
        behindFrameBox: { ...defaultInner, x: defaultInner.x - 0.8, y: defaultInner.y - 0.8, w: defaultInner.w + 1.6, h: defaultInner.h + 1.6 },
        borderThicknessMm: 1.2,
        confidence: 0,
        summary: 'Default CR80 photo corridor selected.',
      };
    }

    ctx.drawImage(img, 0, 0, cw, ch);
    const imgData = ctx.getImageData(0, 0, cw, ch).data;

    const getRgb = (x: number, y: number): [number, number, number] => {
      const ix = Math.max(0, Math.min(cw - 1, Math.round(x)));
      const iy = Math.max(0, Math.min(ch - 1, Math.round(y)));
      const idx = (iy * cw + ix) * 4;
      return [imgData[idx], imgData[idx + 1], imgData[idx + 2]];
    };

    const colorDist = (a: [number, number, number], b: [number, number, number]) => {
      const dr = a[0] - b[0];
      const dg = a[1] - b[1];
      const db = a[2] - b[2];
      return Math.sqrt(dr * dr + dg * dg + db * db);
    };

    const getSaturation = (rgb: [number, number, number]) => {
      const max = Math.max(rgb[0], rgb[1], rgb[2]);
      const min = Math.min(rgb[0], rgb[1], rgb[2]);
      return max === 0 ? 0 : (max - min) / max;
    };

    // Candidate centers to probe (in mm)
    const candidateCentersMm: Array<[number, number]> = isLand
      ? [
          [18, geometry.h * 0.5],
          [20, geometry.h * 0.52],
          [22, geometry.h * 0.48],
          [geometry.w * 0.25, geometry.h * 0.5],
        ]
      : [
          [geometry.w * 0.5, 42.5],
          [geometry.w * 0.5, 39.5],
          [geometry.w * 0.5, 36.0],
          [geometry.w * 0.5, 45.0],
          [geometry.w * 0.5, 33.0],
        ];

    let bestScore = -1;
    let bestBoxPx = {
      left: Math.round(defaultInner.x * scale),
      right: Math.round((defaultInner.x + defaultInner.w) * scale),
      top: Math.round(defaultInner.y * scale),
      bottom: Math.round((defaultInner.y + defaultInner.h) * scale),
      borderPx: Math.round(1.2 * scale),
      centerColor: [255, 255, 255] as [number, number, number],
    };

    for (const [cxMm, cyMm] of candidateCentersMm) {
      const cx = Math.round(cxMm * scale);
      const cy = Math.round(cyMm * scale);
      const cColor = getRgb(cx, cy);
      const maxRayPx = Math.round(23 * scale);
      const minRayPx = Math.round(7 * scale);

      const castRay = (dx: number, dy: number) => {
        let innerEdge = -1;
        let outerEdge = -1;
        for (let step = minRayPx; step <= maxRayPx; step++) {
          const px = cx + dx * step;
          const py = cy + dy * step;
          if (px <= 4 || px >= cw - 4 || py <= 4 || py >= ch - 4) break;
          const rgb = getRgb(px, py);
          const dist = colorDist(rgb, cColor);
          const satJump = Math.abs(getSaturation(rgb) - getSaturation(cColor));
          if (innerEdge === -1) {
            if (dist > 34 || satJump > 0.22) {
              innerEdge = step;
            }
          } else if (step - innerEdge <= Math.round(4.0 * scale)) {
            if (dist < 28 && satJump <= 0.18) {
              outerEdge = step;
              break;
            }
          }
        }
        return { innerEdge, outerEdge };
      };

      const leftRay = castRay(-1, 0);
      const rightRay = castRay(1, 0);
      const upRay = castRay(0, -1);
      const downRay = castRay(0, 1);

      const edgesFound = [leftRay, rightRay, upRay, downRay].filter(r => r.innerEdge > 0).length;
      if (edgesFound < 3) continue;

      const halfW =
        leftRay.innerEdge > 0 && rightRay.innerEdge > 0
          ? Math.min(leftRay.innerEdge, rightRay.innerEdge)
          : leftRay.innerEdge > 0
          ? leftRay.innerEdge
          : rightRay.innerEdge;

      const leftPx = cx - (leftRay.innerEdge > 0 ? leftRay.innerEdge : halfW);
      const rightPx = cx + (rightRay.innerEdge > 0 ? rightRay.innerEdge : halfW);
      const topPx = cy - (upRay.innerEdge > 0 ? upRay.innerEdge : Math.round(halfW * 1.18));
      const bottomPx = cy + (downRay.innerEdge > 0 ? downRay.innerEdge : Math.round(halfW * 1.18));

      const wMm = (rightPx - leftPx) / scale;
      const hMm = (bottomPx - topPx) / scale;
      if (wMm < 15 || wMm > 42 || hMm < 16 || hMm > 48) continue;

      const aspect = wMm / hMm;
      if (aspect < 0.58 || aspect > 1.25) continue;

      // Symmetry bonus for portrait cards
      const boxCenterXmm = (leftPx + rightPx) / 2 / scale;
      const centerBonus = isLand ? 10 : Math.max(0, 20 - Math.abs(boxCenterXmm - geometry.w / 2) * 4);
      const borderStrokes = [leftRay, rightRay, upRay, downRay].filter(r => r.outerEdge > r.innerEdge).length;
      const score = edgesFound * 25 + borderStrokes * 15 + centerBonus;

      if (score > bestScore) {
        bestScore = score;
        const borderSamples = [leftRay, rightRay, upRay, downRay]
          .filter(r => r.outerEdge > r.innerEdge)
          .map(r => r.outerEdge - r.innerEdge);
        const avgBorderPx =
          borderSamples.length > 0
            ? Math.round(borderSamples.reduce((a, b) => a + b, 0) / borderSamples.length)
            : Math.round(1.2 * scale);

        bestBoxPx = {
          left: leftPx,
          right: rightPx,
          top: topPx,
          bottom: bottomPx,
          borderPx: Math.max(3, Math.min(12, avgBorderPx)),
          centerColor: cColor,
        };
      }
    }

    if (bestScore < 50) {
      return {
        detected: false,
        innerBox: defaultInner,
        behindFrameBox: {
          ...defaultInner,
          x: Number((defaultInner.x - 0.8).toFixed(1)),
          y: Number((defaultInner.y - 0.8).toFixed(1)),
          w: Number((defaultInner.w + 1.6).toFixed(1)),
          h: Number((defaultInner.h + 1.6).toFixed(1)),
        },
        borderThicknessMm: 1.2,
        confidence: 45,
        summary: 'Standard centered photo frame corridor applied.',
      };
    }

    // Measure corner radius along the 4 diagonals of bestBoxPx
    const measureCornerInsetPx = (cornerX: number, cornerY: number, dirX: number, dirY: number) => {
      for (let d = 0; d <= 28; d++) {
        const rgb = getRgb(cornerX + dirX * d, cornerY + dirY * d);
        if (colorDist(rgb, bestBoxPx.centerColor) <= 32) {
          return d;
        }
      }
      return 4;
    };

    const dTL = measureCornerInsetPx(bestBoxPx.left, bestBoxPx.top, 1, 1);
    const dTR = measureCornerInsetPx(bestBoxPx.right, bestBoxPx.top, -1, 1);
    const dBL = measureCornerInsetPx(bestBoxPx.left, bestBoxPx.bottom, 1, -1);
    const dBR = measureCornerInsetPx(bestBoxPx.right, bestBoxPx.bottom, -1, -1);
    const avgDiagPx = (dTL + dTR + dBL + dBR) / 4;
    // For a circle of radius R inscribed in a corner, diagonal distance to arc is R * (sqrt(2) - 1) ≈ 0.4142 * R
    const rawRadiusMm = (avgDiagPx / 0.4142) / scale;

    const innerW = Number(((bestBoxPx.right - bestBoxPx.left) / scale).toFixed(1));
    const innerH = Number(((bestBoxPx.bottom - bestBoxPx.top) / scale).toFixed(1));
    const innerX = Number((bestBoxPx.left / scale).toFixed(1));
    const innerY = Number((bestBoxPx.top / scale).toFixed(1));
    const borderMm = Number((bestBoxPx.borderPx / scale).toFixed(1));

    const isCircle = Math.abs(innerW - innerH) < 2.8 && rawRadiusMm >= innerW * 0.35;
    const radiusMm = isCircle
      ? Number((Math.min(innerW, innerH) / 2).toFixed(1))
      : Number(Math.max(2.0, Math.min(8.5, rawRadiusMm || 4.0)).toFixed(1));
    const shape: 'circle' | 'rounded' = isCircle ? 'circle' : 'rounded';

    // Behind-frame box expands into the frame border so there's zero gap when masked
    const expandMm = Number(Math.max(0.6, Math.min(1.4, borderMm * 0.65)).toFixed(1));
    const behindBox = {
      x: Number((innerX - expandMm).toFixed(1)),
      y: Number((innerY - expandMm).toFixed(1)),
      w: Number((innerW + expandMm * 2).toFixed(1)),
      h: Number((innerH + expandMm * 2).toFixed(1)),
      radius: Number((radiusMm + expandMm * 0.5).toFixed(1)),
      shape,
    };

    return {
      detected: true,
      innerBox: {
        x: innerX,
        y: innerY,
        w: innerW,
        h: innerH,
        radius: radiusMm,
        shape,
      },
      behindFrameBox: behindBox,
      borderThicknessMm: borderMm,
      confidence: Math.min(99, bestScore),
      summary: `Detected ${innerW}×${innerH}mm ${shape} frame at (${innerX}, ${innerY}mm) with ${radiusMm}mm corner radius.`,
    };
  } catch {
    return {
      detected: false,
      innerBox: defaultInner,
      behindFrameBox: {
        ...defaultInner,
        x: Number((defaultInner.x - 0.8).toFixed(1)),
        y: Number((defaultInner.y - 0.8).toFixed(1)),
        w: Number((defaultInner.w + 1.6).toFixed(1)),
        h: Number((defaultInner.h + 1.6).toFixed(1)),
      },
      borderThicknessMm: 1.2,
      confidence: 0,
      summary: 'Standard photo frame coordinates loaded.',
    };
  }
}

/**
 * Generates a high-DPI Foreground Cutout Mask (Layer 4) from the uploaded background artwork.
 * Punches out the interior window of the photo frame using connected flood-fill + rounded mask
 * while preserving the artwork's decorative frame border (e.g. teal/orange border) and overlapping
 * logos IN FRONT OF the employee photo.
 */
export function generateSmartPhotoFrameCutoutMask(
  img: HTMLImageElement,
  geometry: CardGeometry,
  photoBox: {
    x: number;
    y: number;
    w: number;
    h: number;
    radius?: number;
    shape?: 'rounded' | 'circle' | 'arch' | 'rect' | 'hexagon';
  }
): string {
  const isLand = geometry.orientation === 'landscape';
  const outW = isLand ? CR80_BLEED_PX.landscape.trimW : CR80_BLEED_PX.portrait.trimW;
  const outH = isLand ? CR80_BLEED_PX.landscape.trimH : CR80_BLEED_PX.portrait.trimH;

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.drawImage(img, 0, 0, outW, outH);

  const scaleX = outW / geometry.w;
  const scaleY = outH / geometry.h;
  const bx0 = Math.max(0, Math.floor(photoBox.x * scaleX));
  const by0 = Math.max(0, Math.floor(photoBox.y * scaleY));
  const bx1 = Math.min(outW - 1, Math.ceil((photoBox.x + photoBox.w) * scaleX));
  const by1 = Math.min(outH - 1, Math.ceil((photoBox.y + photoBox.h) * scaleY));
  const bw = bx1 - bx0;
  const bh = by1 - by0;
  if (bw <= 8 || bh <= 8) return '';

  const imgDataObj = ctx.getImageData(0, 0, outW, outH);
  const data = imgDataObj.data;

  const cx = Math.round((bx0 + bx1) / 2);
  const cy = Math.round((by0 + by1) / 2);
  const cIdx = (cy * outW + cx) * 4;
  const cR = data[cIdx];
  const cG = data[cIdx + 1];
  const cB = data[cIdx + 2];

  const radPx =
    photoBox.shape === 'circle'
      ? Math.min(bw, bh) / 2
      : Math.min(Math.min(bw, bh) / 2, (photoBox.radius ?? 3.5) * ((scaleX + scaleY) / 2));

  // Helper to check if (px, py) is inside the rounded rectangle / circle of photoBox
  const isInsideShape = (px: number, py: number, insetPx = 0) => {
    const left = bx0 + insetPx;
    const right = bx1 - insetPx;
    const top = by0 + insetPx;
    const bottom = by1 - insetPx;
    if (px < left || px > right || py < top || py > bottom) return false;
    const r = Math.max(0, radPx - insetPx);
    if (r <= 0.5) return true;

    // Check 4 rounded corners
    let dx = 0;
    let dy = 0;
    if (px < left + r) dx = left + r - px;
    else if (px > right - r) dx = px - (right - r);
    if (py < top + r) dy = top + r - py;
    else if (py > bottom - r) dy = py - (bottom - r);

    if (dx > 0 && dy > 0) {
      return dx * dx + dy * dy <= r * r;
    }
    return true;
  };

  // Connected-component flood fill from center of the photo frame
  const visited = new Uint8Array(outW * outH);
  const queue = new Int32Array(bw * bh + 4096);
  let qHead = 0;
  let qTail = 0;
  let filledCount = 0;

  // Seed a small 7x7 patch around the center of the photo frame
  for (let sy = -3; sy <= 3; sy++) {
    for (let sx = -3; sx <= 3; sx++) {
      const px = cx + sx;
      const py = cy + sy;
      if (px >= bx0 && px <= bx1 && py >= by0 && py <= by1) {
        const pPos = py * outW + px;
        if (!visited[pPos]) {
          visited[pPos] = 1;
          queue[qTail++] = pPos;
        }
      }
    }
  }

  const colorTolSq = 46 * 46;
  while (qHead < qTail) {
    const pos = queue[qHead++];
    const py = Math.floor(pos / outW);
    const px = pos - py * outW;
    filledCount++;

    // 4-neighbors
    const neighbors = [pos - 1, pos + 1, pos - outW, pos + outW];
    for (let i = 0; i < 4; i++) {
      const nPos = neighbors[i];
      if (nPos < 0 || nPos >= outW * outH || visited[nPos]) continue;
      const ny = Math.floor(nPos / outW);
      const nx = nPos - ny * outW;
      if (!isInsideShape(nx, ny, 0)) continue;

      const idx = nPos * 4;
      const dr = data[idx] - cR;
      const dg = data[idx + 1] - cG;
      const db = data[idx + 2] - cB;
      const distSq = dr * dr + dg * dg + db * db;

      // Also avoid crossing into saturated frame borders when center is white/neutral
      const maxC = Math.max(data[idx], data[idx + 1], data[idx + 2]);
      const minC = Math.min(data[idx], data[idx + 1], data[idx + 2]);
      const isBorderColor = maxC - minC > 48 && distSq > 26 * 26;

      if (distSq <= colorTolSq && !isBorderColor) {
        visited[nPos] = 1;
        queue[qTail++] = nPos;
      }
    }
  }

  const boxArea = bw * bh;
  if (filledCount >= boxArea * 0.22) {
    // Knock out all flood-filled interior pixels and apply a 1px anti-aliased edge feather
    for (let py = by0; py <= by1; py++) {
      for (let px = bx0; px <= bx1; px++) {
        const pos = py * outW + px;
        if (visited[pos]) {
          // Check if on boundary with unvisited frame border pixel
          const onEdge =
            (px > bx0 && !visited[pos - 1]) ||
            (px < bx1 && !visited[pos + 1]) ||
            (py > by0 && !visited[pos - outW]) ||
            (py < by1 && !visited[pos + outW]);
          data[pos * 4 + 3] = onEdge ? 55 : 0;
        }
      }
    }
    ctx.putImageData(imgDataObj, 0, 0);
  } else {
    // Fallback: punch out a clean inset rounded window (inset by 1.0mm)
    const insetPx = Math.round(1.0 * ((scaleX + scaleY) / 2));
    for (let py = by0; py <= by1; py++) {
      for (let px = bx0; px <= bx1; px++) {
        if (isInsideShape(px, py, insetPx)) {
          data[(py * outW + px) * 4 + 3] = 0;
        }
      }
    }
    ctx.putImageData(imgDataObj, 0, 0);
  }

  return canvas.toDataURL('image/png');
}

/**
 * Loads organization custom templates from Supabase with localStorage resilience.
 */
export async function fetchOrganizationTemplates(organizationId?: string): Promise<IdCardCustomTemplate[]> {
  try {
    if (organizationId) {
      const { data, error } = await supabase
        .from('id_card_templates')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as IdCardCustomTemplate[];
      }
    }
  } catch {
    // Supabase table may not exist yet; fall through to local cache
  }

  // Local storage fallback
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed: IdCardCustomTemplate[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Ignore parse error
  }

  return [];
}

/**
 * Saves or updates a custom template in local storage and Supabase.
 */
export async function saveCustomTemplate(template: IdCardCustomTemplate): Promise<IdCardCustomTemplate> {
  const updated: IdCardCustomTemplate = {
    ...template,
    updatedAt: new Date().toISOString(),
  };

  // 1. Save to LocalStorage
  try {
    const current = await fetchOrganizationTemplates(template.organizationId);
    const existingIdx = current.findIndex(t => t.id === template.id);
    let nextList: IdCardCustomTemplate[];

    if (existingIdx >= 0) {
      nextList = [...current];
      nextList[existingIdx] = updated;
    } else {
      nextList = [updated, ...current];
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextList));
  } catch (err) {
    console.warn('LocalStorage template save failed:', err);
  }

  // 2. Try Supabase upsert
  try {
    if (template.organizationId) {
      await supabase.from('id_card_templates').upsert({
        id: updated.id,
        organization_id: updated.organizationId,
        name: updated.name,
        description: updated.description,
        version: updated.version,
        status: updated.status,
        geometry: updated.geometry,
        sides: updated.sides,
        target_employee_types: updated.targetEmployeeTypes,
        is_default: updated.isDefault,
        rights_confirmed_by: updated.rightsConfirmedBy,
        rights_confirmed_at: updated.rightsConfirmedAt,
        created_by: updated.createdBy,
        updated_at: updated.updatedAt,
      });
    }
  } catch {
    // Silently continue with local storage
  }

  return updated;
}

/**
 * Creates a blank custom template skeleton.
 */
export function createEmptyCustomTemplate(
  name: string,
  orientation: 'landscape' | 'portrait' = 'portrait',
  organizationId = 'default-org',
  userName = 'Admin'
): IdCardCustomTemplate {
  const geometry = orientation === 'landscape' ? CR80_LANDSCAPE : CR80_PORTRAIT;
  return {
    id: `tpl_custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    organizationId,
    name,
    description: 'Custom client artwork template with live data fields.',
    version: 1,
    status: 'draft',
    source: 'upload',
    geometry,
    sides: {
      front: {
        bg: '#ffffff',
        elements: [],
        keepOutZones: [
          // Default lanyard punch slot at top center
          {
            id: 'zone_punch_slot',
            type: 'punch_slot',
            x: (geometry.w - 14) / 2,
            y: 4.0,
            w: 14.0,
            h: 3.5,
            label: 'Lanyard Slot (Keep clear)',
          },
        ],
      },
      back: {
        bg: '#ffffff',
        elements: [],
        keepOutZones: [],
      },
    },
    targetEmployeeTypes: ['ALL'],
    isDefault: false,
    createdBy: userName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * --------------------------------------------------------------------------
 * PHASE 2: PREPRESS COLLISION ENGINE & KEEPOUT ZONES
 * --------------------------------------------------------------------------
 */

/**
 * Checks for collisions between placed elements and punch slot / chip keep-out zones.
 */
export function checkKeepOutCollisions(
  elements: CardElement[],
  keepOutZones: KeepOutZone[],
  defaultBufferMm = 1.0
): CollisionWarning[] {
  const warnings: CollisionWarning[] = [];

  for (const el of elements) {
    if (el.hidden) continue;

    const elX = el.x;
    const elY = el.y;
    const elW = el.w;
    const elH = el.h;

    for (const zone of keepOutZones) {
      const buf = zone.bufferMm ?? defaultBufferMm;
      const zoneLeft = zone.x - buf;
      const zoneTop = zone.y - buf;
      const zoneRight = zone.x + zone.w + buf;
      const zoneBottom = zone.y + zone.h + buf;

      // AABB Box intersection check
      const overlapsX = elX < zoneRight && elX + elW > zoneLeft;
      const overlapsY = elY < zoneBottom && elY + elH > zoneTop;

      if (overlapsX && overlapsY) {
        const overlapX = Math.min(elX + elW, zoneRight) - Math.max(elX, zoneLeft);
        const overlapY = Math.min(elY + elH, zoneBottom) - Math.max(elY, zoneTop);
        const overlapMm = parseFloat(Math.min(overlapX, overlapY).toFixed(1));

        let elementLabel = el.type.toUpperCase();
        if (el.type === 'text') {
          elementLabel = (el as TextElement).text?.split('\n')[0]?.slice(0, 20) || 'Text Field';
        } else if (el.type === 'image') {
          elementLabel = el.src === 'photo' ? 'Employee Photo' : 'Logo';
        }

        warnings.push({
          elementId: el.id,
          elementLabel,
          zoneId: zone.id,
          zoneLabel: zone.label,
          overlapMm,
          suggestedY: parseFloat((zone.y + zone.h + buf + 1.5).toFixed(1)),
        });
      }
    }
  }

  return warnings;
}

/**
 * --------------------------------------------------------------------------
 * PHASE 2: SVG SANITIZATION & SECURITY AUDIT
 * --------------------------------------------------------------------------
 */

/**
 * Sanitizes an uploaded SVG string, stripping executable scripts, event handlers,
 * foreignObject, and entity attacks.
 */
export function sanitizeSvgString(svgText: string): {
  sanitizedSvg: string;
  isClean: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  let isClean = true;
  let clean = svgText;

  // 1. Check & Strip <script> tags
  if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(clean)) {
    isClean = false;
    warnings.push('Embedded <script> tags detected and removed.');
    clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }

  // 2. Check & Strip <foreignObject> tags (often used for XSS in SVG)
  if (/<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi.test(clean)) {
    isClean = false;
    warnings.push('Embedded <foreignObject> elements detected and removed.');
    clean = clean.replace(/<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi, '');
  }

  // 3. Strip inline event handlers (onload, onclick, onerror, etc.)
  const eventHandlerRegex = /\son[a-zA-Z]+\s*=\s*(['"]).*?\1/gi;
  if (eventHandlerRegex.test(clean)) {
    isClean = false;
    warnings.push('Inline JavaScript event handlers (on*) detected and stripped.');
    clean = clean.replace(eventHandlerRegex, '');
  }

  // 4. Strip javascript: URLs in href/xlink:href
  const jsUrlRegex = /(href|xlink:href)\s*=\s*(['"])javascript:.*?\2/gi;
  if (jsUrlRegex.test(clean)) {
    isClean = false;
    warnings.push('Dangerous javascript: URIs detected and removed.');
    clean = clean.replace(jsUrlRegex, '');
  }

  // 5. Strip dangerous external entity declarations (XXE)
  if (/<!ENTITY/gi.test(clean)) {
    isClean = false;
    warnings.push('XML external entity (XXE) definitions stripped.');
    clean = clean.replace(/<!ENTITY.*?>/gi, '');
  }

  return {
    sanitizedSvg: clean,
    isClean,
    warnings,
  };
}

/**
 * --------------------------------------------------------------------------
 * PHASE 2: WCAG 2.2 AA TEXT CONTRAST EVALUATOR
 * --------------------------------------------------------------------------
 */

export function evaluateTextContrast(
  textHex: string,
  bgHex = '#ffffff'
): {
  ratio: number;
  passesAA: boolean;
  suggestedPillColor: string;
} {
  const ratio = getWcagContrast(textHex, bgHex);
  const passesAA = ratio >= 4.5;

  // If dark text (contrasts better with white than black), suggest white pill; if light text, suggest dark navy pill
  const isTextDark = getWcagContrast(textHex, '#ffffff') >= getWcagContrast(textHex, '#000000');
  const suggestedPillColor = isTextDark
    ? 'rgba(255, 255, 255, 0.92)'
    : 'rgba(15, 23, 42, 0.90)';

  return {
    ratio: parseFloat(ratio.toFixed(1)),
    passesAA,
    suggestedPillColor,
  };
}

/**
 * --------------------------------------------------------------------------
 * PHASE 2: PREFLIGHT STRESS TEST CASES (WORKFORCE EDGE-CASES)
 * --------------------------------------------------------------------------
 */
export const PREFLIGHT_STRESS_EMPLOYEES: IdCardPersonRecord[] = [
  // 1. Long South Indian Name (28 characters)
  {
    id: 'emp_stress_long_name',
    name: 'Shri Saravanakumar Balasubramanian',
    designation: 'Senior Principal Industrial Automation Architect',
    idno: 'JCS-AUTO-099',
    dept: 'Engineering & Advanced Plant Robotics',
    department: 'Engineering & Advanced Plant Robotics',
    branch: 'Coimbatore Plant',
    phone: '+91 98406 22600',
    blood: 'AB+ve',
    dob: '14-08-1988',
    address: '102 Avinashi Road, Peelamedu, Coimbatore 641004',
    valid: 'Dec 2029',
    org: 'Joy Corporate Solutions Pvt Ltd',
    photo: 'photo_long_name.jpg',
    photo_matched: false,
    avatar_url: '/haripriya-avatar.jpg',
  },
  // 2. Bilingual Tamil Script Name
  {
    id: 'emp_stress_tamil_name',
    name: 'மாரிமுத்து (Mari Muthu)',
    designation: 'Head of People Operations',
    idno: 'JCS-HR-001',
    dept: 'People & Culture Desk',
    department: 'People & Culture Desk',
    branch: 'HQ - Joy Office',
    phone: '+91 99946 99044',
    blood: 'O+ve',
    dob: '22-05-1982',
    address: '44 Trichy Road, Coimbatore 641018',
    valid: 'Dec 2028',
    org: 'Joy Corporate Solutions Pvt Ltd',
    photo: 'photo_tamil.jpg',
    photo_matched: false,
    avatar_url: '/muthu-kumar-avatar.jpg',
  },
  // 3. Missing Photo Fallback (Tests elegant monogram avatar generation)
  {
    id: 'emp_stress_no_photo',
    name: 'Ananya Deshmukh',
    designation: 'Executive Trainee',
    idno: 'JCS-TR-412',
    dept: 'Quality Assurance',
    department: 'Quality Assurance',
    branch: 'Campus Unit',
    phone: '+91 91234 56789',
    blood: 'B+ve',
    dob: '05-11-2001',
    address: 'Joy Campus, Pollachi Road, Coimbatore',
    valid: 'Nov 2027',
    org: 'Joy Corporate Solutions Pvt Ltd',
    photo: '', // Empty photo triggers fallback
    photo_matched: false,
    avatar_url: '',
  },
  // 4. Missing Optional Fields (Null blood group, blank department, blank phone)
  {
    id: 'emp_stress_missing_fields',
    name: 'Karthik Raja',
    designation: 'Contract Worker',
    idno: 'JCS-CTR-881',
    dept: '',
    department: '',
    branch: '',
    phone: '',
    blood: '',
    dob: '',
    address: '',
    valid: 'Dec 2026',
    org: 'Joy Corporate Solutions Pvt Ltd',
    photo: 'karthik.jpg',
    photo_matched: false,
    avatar_url: '',
  },
];

/**
 * --------------------------------------------------------------------------
 * EPS / VECTOR SAAS PACKAGE ADAPTER & BUILT-IN EPS TEMPLATE
 * Maps neutral percentage-based SaaS JSON configs (joy_eps_id_template_config.json)
 * to Joy PeopleHR's physical millimetre CR80 template schema without stretching.
 * --------------------------------------------------------------------------
 */

export interface EpsSaaSLayerDef {
  id: string;
  type: 'image' | 'shape' | 'text' | 'qr';
  binding?: string;
  fallback?: string;
  shape?: 'rect' | 'circle';
  x: number;
  y: number;
  width: number;
  height: number;
  fit?: string;
  mask?: 'circle' | 'rect';
  fill?: string;
  fontFamily?: string;
  fontSizePt?: number;
  fontWeight?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
  quietZoneModules?: number;
  zIndex?: number;
  locked?: boolean;
  note?: string;
}

export interface EpsSaaSTemplateConfig {
  schemaVersion?: string;
  templateId: string;
  name: string;
  description?: string;
  source?: {
    format?: string;
    originalFilename?: string;
    originalSizeBytes?: number;
    convertedFrom?: string;
    sourceColourSpace?: string;
  };
  assets?: {
    frontBackground?: string;
    backBackground?: string;
    backgroundFormat?: string;
    renderedPixels?: { width: number; height: number };
    fit?: string;
    position?: string;
  };
  card?: {
    standard?: string;
    widthMm?: number;
    heightMm?: number;
    portrait?: { widthMm: number; heightMm: number };
    sourceArtworkAspectRatio?: number;
    note?: string;
  };
  front?: {
    background?: string;
    layers?: EpsSaaSLayerDef[];
  };
  back?: {
    background?: string;
    layers?: EpsSaaSLayerDef[];
  };
  print?: {
    colourMode?: string;
    iccProfile?: string;
    pdfStandard?: string;
    bleedMm?: number;
    safeMarginMm?: number;
    warning?: string;
  };
}

export const DEFAULT_EPS_SAAS_CONFIG: EpsSaaSTemplateConfig = {
  schemaVersion: '1.0.0',
  templateId: 'joy-eps-yellow-geometric-portrait',
  name: 'Yellow Geometric Corporate ID — EPS Import',
  description:
    'Optimised front/back WebP backgrounds (70 KB total from 11 MB EPS) adapted proportionally to CR80 Portrait (54 × 85.6 mm) without stretching. Includes circular gold-ring photo mask, dynamic employee bindings, and back verification QR.',
  source: {
    format: 'EPS',
    originalFilename: 'vecteezy_trendy-colorfull-id-card-background-template-vector_.eps',
    originalSizeBytes: 11534336,
    convertedFrom: 'Ghostscript EPS render + CR80 Non-Stretched Side Extension',
    sourceColourSpace: 'sRGB WebP Editor Asset -> ISO Coated v2 300% CMYK ICC on PDF Export',
  },
  assets: {
    frontBackground: '/templates/eps-yellow-geometric/front_background.webp',
    backBackground: '/templates/eps-yellow-geometric/back_background.webp',
    backgroundFormat: 'image/webp',
    renderedPixels: { width: 709, height: 1082 },
    fit: 'contain',
    position: 'center',
  },
  card: {
    standard: 'CR80 / ID-1',
    widthMm: 54.0,
    heightMm: 85.6,
    portrait: { widthMm: 53.98, heightMm: 85.6 },
    sourceArtworkAspectRatio: 0.576,
    note: 'Source artwork (720×1250, 0.576 ratio) fitted proportionally to CR80 portrait (0.631 ratio) with side background extension.',
  },
  front: {
    background: '/templates/eps-yellow-geometric/front_background.webp',
    layers: [
      {
        id: 'employee-photo',
        type: 'image',
        binding: 'candidate.photoUrl',
        x: 17.18,
        y: 28.34,
        width: 65.85,
        height: 41.54,
        fit: 'cover',
        mask: 'circle',
        zIndex: 20,
      },
      {
        id: 'employee-name-mask',
        type: 'shape',
        shape: 'rect',
        x: 27.0,
        y: 74.0,
        width: 46.0,
        height: 9.0,
        fill: '#FFFFFF',
        zIndex: 25,
        locked: true,
      },
      {
        id: 'employee-name',
        type: 'text',
        binding: 'candidate.fullName',
        x: 8.0,
        y: 75.0,
        width: 84.0,
        height: 4.5,
        fontFamily: 'Inter',
        fontSizePt: 11,
        fontWeight: 700,
        color: '#171717',
        align: 'center',
        zIndex: 30,
      },
      {
        id: 'employee-designation',
        type: 'text',
        binding: 'candidate.designation',
        x: 10.0,
        y: 80.0,
        width: 80.0,
        height: 3.5,
        fontFamily: 'Inter',
        fontSizePt: 7.5,
        fontWeight: 600,
        color: '#171717',
        align: 'center',
        zIndex: 31,
      },
    ],
  },
  back: {
    background: '/templates/eps-yellow-geometric/back_background.webp',
    layers: [
      {
        id: 'qr-white-mask',
        type: 'shape',
        shape: 'rect',
        x: 26.5,
        y: 35.5,
        width: 45.0,
        height: 28.5,
        fill: '#FFFFFF',
        zIndex: 20,
        locked: true,
      },
      {
        id: 'verification-qr',
        type: 'qr',
        binding: 'candidate.verificationUrl',
        x: 28.5,
        y: 37.0,
        width: 41.0,
        height: 25.5,
        errorCorrection: 'H',
        quietZoneModules: 4,
        zIndex: 25,
      },
      {
        id: 'terms-mask',
        type: 'shape',
        shape: 'rect',
        x: 14.0,
        y: 72.0,
        width: 72.0,
        height: 9.0,
        fill: '#FFFFFF',
        zIndex: 26,
        locked: true,
      },
      {
        id: 'back-note',
        type: 'text',
        binding: 'organization.cardBackText',
        fallback: 'If found, please return this card to the issuing organisation.',
        x: 12.0,
        y: 73.0,
        width: 76.0,
        height: 7.0,
        fontFamily: 'Inter',
        fontSizePt: 5.5,
        color: '#333333',
        align: 'center',
        zIndex: 30,
      },
    ],
  },
};

function mapSaaSBindingToToken(binding?: string, fallback?: string): string {
  switch (binding) {
    case 'candidate.fullName':
      return '{name}';
    case 'candidate.designation':
      return '{designation}';
    case 'candidate.employeeCode':
      return '{idno}';
    case 'candidate.department':
      return '{dept}';
    case 'candidate.verificationUrl':
      return '{VerifyURL}';
    case 'organization.cardBackText':
      return fallback
        ? `${fallback}\nEmergency: {phone} • Blood: {blood}`
        : 'If found, please return this card to {org}.\nEmergency: {phone} • Blood: {blood}';
    default:
      return fallback || '{name}';
  }
}

/**
 * Converts a neutral SaaS percentage-based JSON config (such as joy_eps_id_template_config.json)
 * into Joy PeopleHR's internal CR80 millimetre IdCardCustomTemplate model.
 */
export function adaptEpsSaaSTemplateConfig(
  config: EpsSaaSTemplateConfig,
  options: {
    frontAssetUrl?: string;
    backAssetUrl?: string;
    organizationId?: string;
    userName?: string;
  } = {}
): IdCardCustomTemplate {
  const geometry = CR80_PORTRAIT; // 54.0 x 85.6 mm
  const isKnownEpsGeometric =
    config.templateId === 'joy-eps-yellow-geometric-portrait' ||
    config.source?.originalFilename?.includes('trendy-colorfull-id-card');

  const frontUrl =
    options.frontAssetUrl ||
    (config.assets?.frontBackground?.startsWith('/') || config.assets?.frontBackground?.startsWith('data:')
      ? config.assets.frontBackground
      : '/templates/eps-yellow-geometric/front_background.webp');

  const backUrl =
    options.backAssetUrl ||
    (config.assets?.backBackground?.startsWith('/') || config.assets?.backBackground?.startsWith('data:')
      ? config.assets.backBackground
      : '/templates/eps-yellow-geometric/back_background.webp');

  const convertSideLayers = (layers: EpsSaaSLayerDef[] = [], side: 'front' | 'back'): CardElement[] => {
    const sorted = [...layers].sort((a, b) => (a.zIndex ?? 10) - (b.zIndex ?? 10));
    const elements: CardElement[] = [];

    // Add Organization Header branding at top of front card (replaces static CREATING BRIGHTER FUTURE)
    if (side === 'front') {
      elements.push({
        id: 'eps-org-header',
        type: 'text',
        text: '{org}',
        font: 'Inter',
        size: 6.5,
        weight: 800,
        color: '#334155',
        align: 'center',
        fit: true,
        overflowMode: 'shrink',
        maxLines: 2,
        minSize: 5.0,
        verticalAlign: 'middle',
        x: 11.0,
        y: 16.0,
        w: 32.0,
        h: 5.5,
        rotation: 0,
        locked: false,
        hidden: false,
        opacity: 1,
      });
    }

    for (const layer of sorted) {
      const rawX = (layer.x / 100) * geometry.w;
      const rawY = (layer.y / 100) * geometry.h;
      const rawW = (layer.width / 100) * geometry.w;
      const rawH = (layer.height / 100) * geometry.h;

      if (layer.type === 'image') {
        // Preserve 1:1 circular geometry inside the unstretched CR80 gold ring
        const x = isKnownEpsGeometric ? 9.28 : Number(rawX.toFixed(2));
        const y = isKnownEpsGeometric ? 24.26 : Number(rawY.toFixed(2));
        const size = isKnownEpsGeometric ? 35.56 : Number(Math.min(rawW, rawH).toFixed(2));
        const radius = layer.mask === 'circle' ? Number((size / 2).toFixed(2)) : 2.0;

        elements.push({
          id: layer.id || 'employee-photo',
          type: 'image',
          src: 'photo',
          shape: layer.mask === 'circle' ? 'circle' : 'rounded',
          fit: 'cover',
          radius,
          border: 0,
          borderColor: '#FDC827',
          x,
          y,
          w: size,
          h: size,
          rotation: 0,
          locked: !!layer.locked,
          hidden: false,
          opacity: 1,
        });
      } else if (layer.type === 'shape') {
        elements.push({
          id: layer.id,
          type: 'rect',
          fill: layer.fill || '#FFFFFF',
          radius: 1.5,
          strokeWidth: 0,
          stroke: 'transparent',
          x: Number(rawX.toFixed(2)),
          y: Number(rawY.toFixed(2)),
          w: Number(rawW.toFixed(2)),
          h: Number(rawH.toFixed(2)),
          rotation: 0,
          locked: layer.locked ?? true,
          hidden: false,
          opacity: 1,
        });
      } else if (layer.type === 'text') {
        elements.push({
          id: layer.id,
          type: 'text',
          text: mapSaaSBindingToToken(layer.binding, layer.fallback),
          font: (layer.fontFamily as any) || 'Inter',
          size: layer.fontSizePt || 9,
          weight: (layer.fontWeight as any) || 600,
          color: layer.color || '#171717',
          align: layer.align || 'center',
          fit: true,
          overflowMode: 'shrink',
          maxLines: layer.binding === 'organization.cardBackText' ? 3 : 1,
          minSize: 5.0,
          verticalAlign: 'top',
          x: Number(rawX.toFixed(2)),
          y: Number(rawY.toFixed(2)),
          w: Number(rawW.toFixed(2)),
          h: Number(rawH.toFixed(2)),
          rotation: 0,
          locked: !!layer.locked,
          hidden: false,
          opacity: 1,
        });
      } else if (layer.type === 'qr') {
        // Preserve 1:1 square QR inside the gold QR frame on the back side
        const qrSize = isKnownEpsGeometric ? 22.0 : Number(Math.min(rawW, rawH).toFixed(2));
        const qrX = isKnownEpsGeometric ? 15.5 : Number((rawX + (rawW - qrSize) / 2).toFixed(2));
        const qrY = isKnownEpsGeometric ? 31.5 : Number((rawY + (rawH - qrSize) / 2).toFixed(2));

        elements.push({
          id: layer.id || 'verification-qr',
          type: 'qr',
          qrData: mapSaaSBindingToToken(layer.binding, '{VerifyURL}'),
          color: '#111827',
          bgColor: '#FFFFFF',
          errorCorrectionLevel: layer.errorCorrection || 'H',
          x: qrX,
          y: qrY,
          w: qrSize,
          h: qrSize,
          rotation: 0,
          locked: !!layer.locked,
          hidden: false,
          opacity: 1,
        });
      }
    }

    // Add Employee ID & Department line under designation on Front side
    if (side === 'front') {
      elements.push({
        id: 'employee-id-dept',
        type: 'text',
        text: 'ID: {idno} • {department}',
        font: 'IBM Plex Mono',
        size: 6.2,
        weight: 600,
        color: '#475569',
        align: 'center',
        fit: true,
        overflowMode: 'shrink',
        maxLines: 1,
        minSize: 5.0,
        verticalAlign: 'top',
        x: 6.0,
        y: 72.5,
        w: 42.0,
        h: 3.2,
        rotation: 0,
        locked: false,
        hidden: false,
        opacity: 1,
      });
    }

    return elements;
  };

  return {
    id: config.templateId || 'joy-eps-yellow-geometric-portrait',
    organizationId: options.organizationId || 'default-org',
    name: config.name || 'Yellow Geometric Corporate ID — EPS Import',
    description:
      config.description ||
      'Optimised WebP front/back backgrounds converted from 11 MB EPS and proportionally extended to CR80 Portrait.',
    version: 1,
    status: 'published',
    source: 'upload',
    geometry,
    sides: {
      front: {
        bg: '#FDC827',
        baseAsset: {
          id: 'asset_eps_front_webp',
          side: 'front',
          role: 'base',
          name: 'front_background.webp (34 KB CR80 Adapted)',
          mime: 'image/webp',
          widthPx: 709,
          heightPx: 1082,
          effDpi: 300,
          dataUrl: frontUrl,
          placement: { scale: 1.0, offsetXmm: 0, offsetYmm: 0 },
        },
        elements: convertSideLayers(config.front?.layers || DEFAULT_EPS_SAAS_CONFIG.front?.layers, 'front'),
        keepOutZones: [
          {
            id: 'zone_punch_slot',
            type: 'punch_slot',
            x: (geometry.w - 14) / 2,
            y: 4.0,
            w: 14.0,
            h: 3.5,
            bufferMm: 1.0,
            label: 'Lanyard Slot (14×3.5mm)',
          },
        ],
      },
      back: {
        bg: '#FDC827',
        baseAsset: {
          id: 'asset_eps_back_webp',
          side: 'back',
          role: 'base',
          name: 'back_background.webp (35 KB CR80 Adapted)',
          mime: 'image/webp',
          widthPx: 709,
          heightPx: 1082,
          effDpi: 300,
          dataUrl: backUrl,
          placement: { scale: 1.0, offsetXmm: 0, offsetYmm: 0 },
        },
        elements: convertSideLayers(config.back?.layers || DEFAULT_EPS_SAAS_CONFIG.back?.layers, 'back'),
        keepOutZones: [],
      },
    },
    targetEmployeeTypes: ['ALL', 'EMPLOYEE'],
    isDefault: true,
    rightsConfirmedBy: options.userName || 'System EPS Importer',
    rightsConfirmedAt: new Date().toISOString(),
    createdBy: options.userName || 'EPS Vector Pipeline',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function getDefaultEpsYellowGeometricTemplate(organizationId = 'default-org'): IdCardCustomTemplate {
  return adaptEpsSaaSTemplateConfig(DEFAULT_EPS_SAAS_CONFIG, { organizationId });
}

/**
 * --------------------------------------------------------------------------
 * PHASE 3: TEMPLATE VERSIONING, IMMUTABLE ISSUANCE SNAPSHOTS,
 * .idtemplate BUNDLE IMPORT/EXPORT & DESIGNER SPEC KIT GENERATOR
 * --------------------------------------------------------------------------
 */

/**
 * Increments a template's version (e.g. v1.0 -> v2.0) while locking the prior
 * version in `versionHistory` so cards already issued retain their printed version.
 */
export async function bumpTemplateVersion(
  template: IdCardCustomTemplate,
  publishedBy = 'HR Admin',
  notes = 'Updated field layout and prepress settings'
): Promise<IdCardCustomTemplate> {
  const now = new Date().toISOString();
  const priorRecord: TemplateVersionRecord = {
    version: template.version,
    publishedAt: template.updatedAt || template.createdAt || now,
    publishedBy: template.createdBy || publishedBy,
    notes,
    issuedCardsCount: template.issuedCardsCount || 0,
  };

  const existingHistory = template.versionHistory || [];
  const nextVersion = template.version + 1;

  const bumped: IdCardCustomTemplate = {
    ...template,
    version: nextVersion,
    status: 'published',
    updatedAt: now,
    versionHistory: [...existingHistory, priorRecord],
  };

  return saveCustomTemplate(bumped);
}

/**
 * Records an immutable issuance count against the template's current version.
 */
export async function recordTemplateIssuance(
  template: IdCardCustomTemplate,
  cardsCount: number
): Promise<IdCardCustomTemplate> {
  const updated: IdCardCustomTemplate = {
    ...template,
    issuedCardsCount: (template.issuedCardsCount || 0) + cardsCount,
    updatedAt: new Date().toISOString(),
  };
  return saveCustomTemplate(updated);
}

function computeSimpleChecksum(payload: string): string {
  let hash = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

/**
 * Exports a custom template as a portable `.idtemplate.json` bundle for multi-branch sharing.
 */
export function exportIdTemplateBundle(
  template: IdCardCustomTemplate,
  exportedBy = 'HR Admin'
): string {
  const serializedTemplate = JSON.stringify(template);
  const checksum = computeSimpleChecksum(serializedTemplate);

  const bundle: IdTemplateBundle = {
    bundleFormat: 'joy-idtemplate-v1',
    exportedAt: new Date().toISOString(),
    exportedBy,
    checksum,
    template,
  };

  return JSON.stringify(bundle, null, 2);
}

/**
 * Imports a `.idtemplate.json` bundle (or a raw `joy_eps_id_template_config.json`)
 * into the target organization's template library.
 */
export async function importIdTemplateBundle(
  jsonText: string,
  targetOrgId = 'default-org',
  importedBy = 'HR Admin'
): Promise<IdCardCustomTemplate> {
  const parsed = JSON.parse(jsonText);

  // Case 1: Portable .idtemplate bundle
  if (parsed && parsed.bundleFormat === 'joy-idtemplate-v1' && parsed.template) {
    const check = validateTemplatePayload(parsed.template);
    if (!check.valid || !check.template) {
      throw new Error(`Invalid .idtemplate payload: ${check.errors.join(' ')}`);
    }
    const incoming = check.template;
    const now = new Date().toISOString();
    const importedTpl: IdCardCustomTemplate = {
      ...incoming,
      organizationId: targetOrgId,
      source: 'import',
      updatedAt: now,
    };
    return saveCustomTemplate(importedTpl);
  }

  // Case 2: Neutral EPS SaaS JSON Config (joy_eps_id_template_config.json)
  if (parsed && (parsed.templateId || parsed.front?.layers)) {
    const adapted = adaptEpsSaaSTemplateConfig(parsed as EpsSaaSTemplateConfig, {
      organizationId: targetOrgId,
      userName: importedBy,
    });
    return saveCustomTemplate(adapted);
  }

  throw new Error('Invalid .idtemplate bundle format: missing bundleFormat or template payload.');
}

/**
 * Generates a downloadable 300 DPI Prepress Design Guide Kit (SVG/PNG guide + 1-page Spec README)
 * for Canva, Figma, Adobe Illustrator, and Photoshop designers.
 */
export function generateDesignGuideSpecKit(
  orientation: 'portrait' | 'landscape' = 'portrait'
): DesignGuideSpecKit {
  const isPortrait = orientation === 'portrait';
  const widthPx = isPortrait ? 709 : 1082;
  const heightPx = isPortrait ? 1082 : 709;
  const trimWidthMm = isPortrait ? 54.0 : 85.6;
  const trimHeightMm = isPortrait ? 85.6 : 54.0;
  const bleedMm = 3.0;
  const safeMarginMm = 2.5;
  const pxPerMm = 300 / 25.4; // 11.811 px/mm

  const bleedPx = Math.round(bleedMm * pxPerMm); // 35 px
  const safePx = Math.round((bleedMm + safeMarginMm) * pxPerMm); // 65 px
  const trimW = widthPx - 2 * bleedPx;
  const trimH = heightPx - 2 * bleedPx;
  const safeW = widthPx - 2 * safePx;
  const safeH = heightPx - 2 * safePx;

  // Lanyard punch slot (14 x 3.5 mm at Y = 4.0 mm from top trim)
  const slotW = Math.round(14.0 * pxPerMm);
  const slotH = Math.round(3.5 * pxPerMm);
  const slotX = Math.round((widthPx - slotW) / 2);
  const slotY = bleedPx + Math.round(4.0 * pxPerMm);

  const svgGuideContent = `<svg width="${widthPx}" height="${heightPx}" viewBox="0 0 ${widthPx} ${heightPx}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${widthPx}" height="${heightPx}" fill="#0f172a"/>
  <!-- Outer 3mm Bleed Zone -->
  <rect x="2" y="2" width="${widthPx - 4}" height="${heightPx - 4}" fill="none" stroke="#ef4444" stroke-width="4"/>
  <!-- Magenta Dashed Trim Cut Line (CR80 ${trimWidthMm} x ${trimHeightMm} mm) -->
  <rect x="${bleedPx}" y="${bleedPx}" width="${trimW}" height="${trimH}" fill="#1e293b" stroke="#d946ef" stroke-width="3" stroke-dasharray="14,8"/>
  <!-- Emerald Dotted Safe Margin (2.5mm inside Trim) -->
  <rect x="${safePx}" y="${safePx}" width="${safeW}" height="${safeH}" fill="none" stroke="#10b981" stroke-width="2" stroke-dasharray="6,6"/>
  <!-- Lanyard Punch Slot Keep-Out Zone (14 x 3.5 mm) -->
  <rect x="${slotX}" y="${slotY}" width="${slotW}" height="${slotH}" rx="${Math.round(slotH / 2)}" fill="#f43f5e" fill-opacity="0.25" stroke="#f43f5e" stroke-width="2.5" stroke-dasharray="6,4"/>
  <text x="${Math.round(widthPx / 2)}" y="${slotY + slotH + 22}" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#fda4af" text-anchor="middle">LANYARD PUNCH KEEP-OUT (14 × 3.5 mm)</text>
  <!-- Spec Annotations -->
  <text x="${Math.round(widthPx / 2)}" y="${Math.round(heightPx * 0.44)}" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#ffffff" text-anchor="middle">JOY PEOPLEHR — CR80 ${orientation.toUpperCase()} GUIDE</text>
  <text x="${Math.round(widthPx / 2)}" y="${Math.round(heightPx * 0.49)}" font-family="Arial, sans-serif" font-size="16" fill="#34d399" text-anchor="middle">Canvas with 3mm Bleed: ${widthPx} × ${heightPx} px @ 300 DPI (${trimWidthMm + 6} × ${trimHeightMm + 6} mm)</text>
  <text x="${Math.round(widthPx / 2)}" y="${Math.round(heightPx * 0.53)}" font-family="Arial, sans-serif" font-size="15" fill="#f0abfc" text-anchor="middle">Finished Trim Size: ${trimWidthMm} × ${trimHeightMm} mm (${trimW} × ${trimH} px)</text>
  <text x="${Math.round(widthPx / 2)}" y="${Math.round(heightPx * 0.57)}" font-family="Arial, sans-serif" font-size="14" fill="#94a3b8" text-anchor="middle">Leave photo, name, designation &amp; QR areas empty — Studio binds live employee data.</text>
</svg>`;

  const readmeMarkdown = `# JOY PeopleHR — ID Card Prepress Designer Specification (${orientation.toUpperCase()})

## 1. Artboard Dimensions (300 DPI Standard CR80 / ISO 7810 ID-1)
- **Full Bleed Canvas Size**: \`${widthPx} × ${heightPx} px\` (\`${trimWidthMm + 6} × ${trimHeightMm + 6} mm\` at 300 DPI)
- **Finished Trim Cut Size**: \`${trimW} × ${trimH} px\` (\`${trimWidthMm} × ${trimHeightMm} mm\`)
- **Outer Bleed Margin**: \`3.0 mm\` (\`35 px\`) on all 4 sides — extend background colours and waves all the way to the outer edge!
- **Inner Safe Margin**: \`2.5 mm\` (\`30 px\`) inside the trim line — keep all logos, text, and QR frames inside the green safe zone.
- **Lanyard Punch Slot Keep-Out**: \`14.0 × 3.5 mm\` centered at \`4.0 mm\` below top trim edge.

## 2. How to Export from Canva / Figma / Illustrator / Photoshop
1. Place this guide on your top layer and lock it while designing.
2. **Hide or delete the guide layer** and any sample placeholder text/photos before exporting.
3. Export as **300 DPI PNG, WebP, or SVG** (\`${widthPx} × ${heightPx} px\`).
4. Optional Layer 4 Foreground Frame: Export any circular/arch photo cutout frame as a separate transparent PNG (\`${widthPx} × ${heightPx} px\`).
`;

  return {
    orientation,
    widthPx,
    heightPx,
    trimWidthMm,
    trimHeightMm,
    bleedMm,
    safeMarginMm,
    dpi: 300,
    svgGuideContent,
    svgDataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svgGuideContent)}`,
    readmeMarkdown,
  };
}

/**
 * --------------------------------------------------------------------------
 * PHASE 4: KEYBOARD NUDGE ENGINE & STARTER-TO-CUSTOM TEMPLATE CLONER
 * --------------------------------------------------------------------------
 */

/**
 * Nudges a placed card element by (dxMm, dyMm) while clamping cleanly inside
 * the card's physical trim boundaries [0, geometry.w - el.w] x [0, geometry.h - el.h].
 */
export function nudgeElementPosition(
  el: CardElement,
  dxMm: number,
  dyMm: number,
  geometry: CardGeometry = CR80_PORTRAIT
): CardElement {
  const maxX = Math.max(0, geometry.w - el.w);
  const maxY = Math.max(0, geometry.h - el.h);
  const nextX = Number(Math.max(0, Math.min(maxX, el.x + dxMm)).toFixed(2));
  const nextY = Number(Math.max(0, Math.min(maxY, el.y + dyMm)).toFixed(2));
  return {
    ...el,
    x: nextX,
    y: nextY,
  };
}

/**
 * Generates a 300 DPI SVG background data URL matching one of the 6 distinct
 * Phase 4 Starter Layout Archetypes.
 */
export function generateStarterBackgroundSvgDataUrl(starter: TemplateCardInfo): string {
  const w = 709;
  const h = 1082;
  const accent = starter.accentHex || '#1d7bd8';
  const secondary = starter.secondaryHex || '#0f172a';
  const bg = starter.frontBg || '#ffffff';

  let bodySvg = `<rect width="${w}" height="${h}" fill="${bg}"/>`;

  switch (starter.layoutArchetype) {
    case 'diagonal_corporate':
      bodySvg += `
        <polygon points="0,0 ${w},0 ${w},320 0,430" fill="${secondary}"/>
        <polygon points="0,330 ${w},230 ${w},350 0,450" fill="${accent}"/>
        <rect x="0" y="${h - 46}" width="${w}" height="46" fill="${secondary}"/>
      `;
      break;
    case 'safety_band':
      bodySvg += `
        <rect x="0" y="0" width="${w}" height="210" fill="${accent}"/>
        <rect x="0" y="210" width="${w}" height="32" fill="#0f172a"/>
        <rect x="0" y="${h - 90}" width="${w}" height="90" fill="${secondary}"/>
        <rect x="0" y="${h - 32}" width="${w}" height="32" fill="${accent}"/>
      `;
      break;
    case 'split_duo':
      bodySvg += `
        <rect x="0" y="0" width="175" height="${h}" fill="${secondary}"/>
        <rect x="175" y="0" width="16" height="${h}" fill="${accent}"/>
        <rect x="191" y="${h - 36}" width="${w - 191}" height="36" fill="${accent}"/>
      `;
      break;
    case 'lanyard_arch':
      bodySvg += `
        <path d="M0,0 L${w},0 L${w},340 Q${Math.round(w / 2)},450 0,340 Z" fill="${secondary}"/>
        <path d="M0,315 Q${Math.round(w / 2)},425 ${w},315 L${w},355 Q${Math.round(w / 2)},465 0,355 Z" fill="${accent}"/>
        <rect x="0" y="${h - 40}" width="${w}" height="40" fill="${secondary}"/>
      `;
      break;
    case 'minimal_monospace':
      bodySvg += `
        <rect x="0" y="0" width="${w}" height="18" fill="${accent}"/>
        <line x1="48" y1="150" x2="${w - 48}" y2="150" stroke="#cbd5e1" stroke-width="3"/>
        <line x1="48" y1="730" x2="${w - 48}" y2="730" stroke="#cbd5e1" stroke-width="3"/>
        <rect x="48" y="${h - 140}" width="${w - 96}" height="80" rx="12" fill="${secondary}"/>
      `;
      break;
    case 'security_badge':
      bodySvg += `
        <rect x="0" y="0" width="${w}" height="${h}" fill="#0f172a"/>
        <rect x="0" y="0" width="${w}" height="150" fill="${accent}"/>
        <rect x="0" y="${h - 135}" width="${w}" height="95" fill="${accent}"/>
      `;
      break;
  }

  const svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${bodySvg}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Clones one of the 6 distinct Starter Templates into an editable Organization
 * Custom Template (`IdCardCustomTemplate`) and persists it.
 */
export async function cloneStarterToCustomTemplate(
  starter: TemplateCardInfo,
  organizationId = 'default-org',
  userName = 'HR Admin'
): Promise<IdCardCustomTemplate> {
  const geometry = CR80_PORTRAIT;
  const frontDataUrl = generateStarterBackgroundSvgDataUrl(starter);
  const isDark = starter.layoutArchetype === 'security_badge';
  const isSplit = starter.layoutArchetype === 'split_duo';
  const textX = isSplit ? 16.0 : 5.0;
  const textW = isSplit ? 34.0 : 44.0;
  const photoX = isSplit ? 20.0 : 14.5;

  const tpl: IdCardCustomTemplate = {
    id: `starter_${starter.id}_${Date.now()}`,
    organizationId,
    name: `${starter.name} (Custom Copy)`,
    description: starter.description,
    version: 1,
    status: 'published',
    source: 'starter',
    geometry,
    sides: {
      front: {
        bg: starter.frontBg || '#ffffff',
        baseAsset: {
          id: `asset_starter_${starter.id}_front`,
          side: 'front',
          role: 'base',
          name: `${starter.id}_300dpi_guide.svg`,
          mime: 'image/svg+xml',
          widthPx: 709,
          heightPx: 1082,
          effDpi: 300,
          dataUrl: frontDataUrl,
          placement: { scale: 1.0, offsetXmm: 0, offsetYmm: 0 },
        },
        elements: [
          {
            id: `el_${starter.id}_org`,
            type: 'text',
            text: '{org}',
            font: 'Plus Jakarta Sans',
            size: 6.5,
            weight: 800,
            color: isDark ? '#ffffff' : '#0f172a',
            bgPill: !isDark,
            bgPillColor: 'rgba(255, 255, 255, 0.92)',
            bgPillRadius: 1.5,
            align: isSplit ? 'left' : 'center',
            fit: true,
            overflowMode: 'shrink',
            maxLines: 1,
            minSize: 5.0,
            verticalAlign: 'middle',
            x: textX,
            y: 9.5,
            w: textW,
            h: 4.5,
            rotation: 0,
            locked: false,
            hidden: false,
            opacity: 1,
          },
          {
            id: `el_${starter.id}_photo`,
            type: 'image',
            src: 'photo',
            shape: starter.photoShape === 'circle' ? 'circle' : 'rounded',
            fit: 'cover',
            radius: starter.photoShape === 'circle' ? 12.5 : starter.photoShape === 'arch' ? 10.0 : 2.5,
            border: 0.6,
            borderColor: starter.accentHex,
            x: photoX,
            y: 20.0,
            w: 25.0,
            h: 28.0,
            rotation: 0,
            locked: false,
            hidden: false,
            opacity: 1,
          },
          {
            id: `el_${starter.id}_name`,
            type: 'text',
            text: '{name}',
            font: 'Plus Jakarta Sans',
            size: 10.5,
            weight: 800,
            color: isDark ? '#ffffff' : '#0f172a',
            align: isSplit ? 'left' : 'center',
            fit: true,
            overflowMode: 'shrink',
            maxLines: 2,
            minSize: 6.5,
            verticalAlign: 'middle',
            x: textX,
            y: 52.0,
            w: textW,
            h: 6.0,
            rotation: 0,
            locked: false,
            hidden: false,
            opacity: 1,
          },
          {
            id: `el_${starter.id}_desig`,
            type: 'text',
            text: '{designation}',
            font: 'Inter',
            size: 7.5,
            weight: 700,
            color: isDark ? '#fda4af' : '#065f46',
            align: isSplit ? 'left' : 'center',
            fit: true,
            overflowMode: 'shrink',
            maxLines: 1,
            minSize: 5.5,
            verticalAlign: 'middle',
            x: textX,
            y: 59.0,
            w: textW,
            h: 4.0,
            rotation: 0,
            locked: false,
            hidden: false,
            opacity: 1,
          },
          {
            id: `el_${starter.id}_meta`,
            type: 'text',
            text: 'ID: {idno} • BLOOD: {blood}',
            font: 'IBM Plex Mono',
            size: 6.2,
            weight: 700,
            color: isDark ? '#cbd5e1' : '#475569',
            align: isSplit ? 'left' : 'center',
            fit: true,
            overflowMode: 'shrink',
            maxLines: 1,
            minSize: 5.0,
            verticalAlign: 'middle',
            x: textX,
            y: 65.5,
            w: textW,
            h: 3.5,
            rotation: 0,
            locked: false,
            hidden: false,
            opacity: 1,
          },
        ],
        keepOutZones: [
          {
            id: 'zone_punch_slot',
            type: 'punch_slot',
            x: (geometry.w - 14) / 2,
            y: 4.0,
            w: 14.0,
            h: 3.5,
            bufferMm: 1.0,
            label: 'Lanyard Slot (14×3.5mm)',
          },
        ],
      },
      back: {
        bg: '#f8fafc',
        elements: [
          {
            id: `el_${starter.id}_back_qr`,
            type: 'qr',
            qrData: '{VerifyURL}',
            color: '#0f172a',
            bgColor: '#ffffff',
            errorCorrectionLevel: 'M',
            x: 16.0,
            y: 26.0,
            w: 22.0,
            h: 22.0,
            rotation: 0,
            locked: false,
            hidden: false,
            opacity: 1,
          },
          {
            id: `el_${starter.id}_back_return`,
            type: 'text',
            text: 'If found, please return to {org}',
            font: 'Inter',
            size: 6.5,
            weight: 600,
            color: '#475569',
            align: 'center',
            fit: true,
            overflowMode: 'shrink',
            maxLines: 2,
            minSize: 5.0,
            verticalAlign: 'middle',
            x: 6.0,
            y: 56.0,
            w: 42.0,
            h: 8.0,
            rotation: 0,
            locked: false,
            hidden: false,
            opacity: 1,
          },
        ],
        keepOutZones: [],
      },
    },
    targetEmployeeTypes: ['ALL', starter.targetType],
    isDefault: false,
    rightsConfirmedBy: userName,
    rightsConfirmedAt: new Date().toISOString(),
    createdBy: userName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return saveCustomTemplate(tpl);
}

/**
 * --------------------------------------------------------------------------
 * V2.1 ENTERPRISE REDESIGN: DEFENSIVE VALIDATION, ORG CLONING, NON-DESTRUCTIVE
 * ARCHIVING, DRAFT AUTOSAVE RECOVERY & IDEMPOTENT PRINT BATCH LEDGER
 * --------------------------------------------------------------------------
 */

const DRAFT_RECOVERY_STORAGE_KEY = 'joy_id_card_draft_recovery_v2_1';
const PRINT_BATCH_LEDGER_KEY = 'joy_id_card_print_batches_v2_1';

/**
 * Defensively validates an imported or persisted template JSON payload before
 * applying it to prevent corrupted JSON or malformed coordinates from crashing the studio.
 */
export function validateTemplatePayload(raw: unknown): {
  valid: boolean;
  errors: string[];
  template?: IdCardCustomTemplate;
} {
  const errors: string[] = [];
  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['Template payload must be a valid JSON object.'] };
  }

  const candidate = raw as Partial<IdCardCustomTemplate>;
  if (!candidate.id || typeof candidate.id !== 'string') {
    errors.push('Missing or invalid template "id".');
  }
  if (!candidate.name || typeof candidate.name !== 'string') {
    errors.push('Missing or invalid template "name".');
  }
  if (
    !candidate.geometry ||
    typeof candidate.geometry.w !== 'number' ||
    typeof candidate.geometry.h !== 'number' ||
    candidate.geometry.w <= 0 ||
    candidate.geometry.h <= 0
  ) {
    errors.push('Invalid card geometry: width and height must be positive millimetre values.');
  }
  if (
    !candidate.sides ||
    !candidate.sides.front ||
    !Array.isArray(candidate.sides.front.elements) ||
    !candidate.sides.back ||
    !Array.isArray(candidate.sides.back.elements)
  ) {
    errors.push('Invalid template sides: both "front.elements" and "back.elements" arrays are required.');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    template: candidate as IdCardCustomTemplate,
  };
}

/**
 * Clones an organization-owned template as a new editable Draft (`v1.0`, `status: 'draft'`).
 */
export async function cloneOrganizationTemplate(
  sourceTemplate: IdCardCustomTemplate,
  organizationId = sourceTemplate.organizationId || 'default-org',
  userName = 'HR Admin'
): Promise<IdCardCustomTemplate> {
  const now = new Date().toISOString();
  const cloned: IdCardCustomTemplate = {
    ...JSON.parse(JSON.stringify(sourceTemplate)),
    id: `tpl_org_clone_${Date.now()}`,
    organizationId,
    name: `${sourceTemplate.name} (Copy)`,
    version: 1,
    status: 'draft',
    isDefault: false,
    issuedCardsCount: 0,
    versionHistory: [],
    createdBy: userName,
    createdAt: now,
    updatedAt: now,
  };
  return saveCustomTemplate(cloned);
}

/**
 * Non-destructively archives an organization template (`status: 'archived'`)
 * while preserving its issuance history and version snapshots.
 */
export async function archiveOrganizationTemplate(
  template: IdCardCustomTemplate,
  archivedBy = 'HR Admin'
): Promise<IdCardCustomTemplate> {
  const now = new Date().toISOString();
  const archived: IdCardCustomTemplate = {
    ...template,
    status: 'archived',
    isDefault: false,
    updatedAt: now,
    versionHistory: [
      ...(template.versionHistory || []),
      {
        version: template.version,
        publishedAt: template.updatedAt || template.createdAt || now,
        publishedBy: archivedBy,
        notes: 'Archived template (issuance history preserved)',
        issuedCardsCount: template.issuedCardsCount || 0,
      },
    ],
  };
  return saveCustomTemplate(archived);
}

/**
 * Saves a debounced draft recovery snapshot to localStorage so unsaved work
 * survives an accidental browser refresh or tab closure.
 */
export function saveDraftRecoverySnapshot(snapshot: DraftRecoverySnapshot): void {
  try {
    localStorage.setItem(
      `${DRAFT_RECOVERY_STORAGE_KEY}_${snapshot.organizationId || 'default-org'}`,
      JSON.stringify(snapshot)
    );
  } catch (err) {
    console.warn('Could not save draft recovery snapshot:', err);
  }
}

/**
 * Loads the most recent unsaved draft recovery snapshot for the organization.
 */
export function loadDraftRecoverySnapshot(organizationId = 'default-org'): DraftRecoverySnapshot | null {
  try {
    const raw = localStorage.getItem(`${DRAFT_RECOVERY_STORAGE_KEY}_${organizationId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftRecoverySnapshot;
    if (parsed && parsed.templateId && parsed.front && parsed.back) {
      return parsed;
    }
  } catch {
    // Ignore corrupted recovery entry
  }
  return null;
}

/**
 * Clears the draft recovery snapshot once changes are explicitly saved or published.
 */
export function clearDraftRecoverySnapshot(organizationId = 'default-org'): void {
  try {
    localStorage.removeItem(`${DRAFT_RECOVERY_STORAGE_KEY}_${organizationId}`);
  } catch {
    // Ignore
  }
}

/**
 * Verifies Front and Back duplex trim & full-bleed alignment before commercial printing.
 */
export function verifyDuplexAlignment(
  frontGeometry: CardGeometry,
  backGeometry: CardGeometry = frontGeometry
): {
  aligned: boolean;
  trimWidthMm: number;
  trimHeightMm: number;
  fullBleedWidthMm: number;
  fullBleedHeightMm: number;
  message: string;
} {
  const isPortrait = frontGeometry.orientation === 'portrait';
  const exactTrimW = isPortrait ? 53.98 : 85.6;
  const exactTrimH = isPortrait ? 85.6 : 53.98;
  const bleed = frontGeometry.bleed || 3.0;
  const fullBleedW = Number((exactTrimW + bleed * 2).toFixed(2));
  const fullBleedH = Number((exactTrimH + bleed * 2).toFixed(2));

  const aligned =
    Math.abs(frontGeometry.w - backGeometry.w) < 0.05 &&
    Math.abs(frontGeometry.h - backGeometry.h) < 0.05 &&
    frontGeometry.orientation === backGeometry.orientation &&
    Math.abs((frontGeometry.bleed || 3) - (backGeometry.bleed || 3)) < 0.05;

  return {
    aligned,
    trimWidthMm: exactTrimW,
    trimHeightMm: exactTrimH,
    fullBleedWidthMm: fullBleedW,
    fullBleedHeightMm: fullBleedH,
    message: aligned
      ? `Front & Back Duplex Aligned: Trim ${exactTrimW.toFixed(2)} × ${exactTrimH.toFixed(2)} mm | Full Bleed ${fullBleedW.toFixed(2)} × ${fullBleedH.toFixed(2)} mm (+${bleed} mm bleed)`
      : 'Front and Back card geometries do not match for duplex registration.',
  };
}

/**
 * Records an idempotent print production batch so duplicate clicks do not double-count
 * issued cards and production history is auditable.
 */
export function recordPrintProductionBatch(params: {
  templateId: string;
  templateName: string;
  templateVersion: number;
  employeeIds: string[];
  format: PrintOutputFormat;
  dpi: 300 | 600;
  iccProfile: IccOutputIntentProfile;
  createdBy?: string;
}): { batch: PrintProductionBatch; isDuplicate: boolean } {
  const sortedEmpKey = [...params.employeeIds].sort().join(',');
  const idempotencyKey = computeSimpleChecksum(
    `${params.templateId}|v${params.templateVersion}|${sortedEmpKey}|${params.format}|${params.dpi}|${params.iccProfile}`
  );

  const existingBatches = getPrintProductionBatches();
  const duplicate = existingBatches.find(b => b.idempotencyKey === idempotencyKey);
  if (duplicate) {
    return { batch: duplicate, isDuplicate: true };
  }

  const batch: PrintProductionBatch = {
    batchId: `BATCH-${Date.now().toString(36).toUpperCase()}`,
    idempotencyKey,
    templateId: params.templateId,
    templateName: params.templateName,
    templateVersion: params.templateVersion,
    cardsCount: params.employeeIds.length,
    format: params.format,
    dpi: params.dpi,
    iccProfile: params.iccProfile,
    duplexAligned: true,
    createdAt: new Date().toISOString(),
    createdBy: params.createdBy || 'HR Admin',
  };

  try {
    localStorage.setItem(PRINT_BATCH_LEDGER_KEY, JSON.stringify([batch, ...existingBatches].slice(0, 50)));
  } catch {
    // Ignore storage quota
  }

  return { batch, isDuplicate: false };
}

export function getPrintProductionBatches(): PrintProductionBatch[] {
  try {
    const raw = localStorage.getItem(PRINT_BATCH_LEDGER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore
  }
  return [];
}






