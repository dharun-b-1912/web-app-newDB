// src/features/people/idcard/idCardPdfEngine.ts
// ============================================================================
// Joy PeopleHR — Enterprise CMYK PDF Generator & Preflight Engine
// Generates print-ready PDF 1.4 documents with DeviceCMYK, Bleed, and Crop Marks
// Supports Landscape & Portrait layouts, QR codes, Rotations, and Duplex A4 sheets
// ============================================================================

import QRCode from 'qrcode';
import {
  MM,
  PT,
  CardGeometry,
  CardSideData,
  CardElement,
  TextElement,
  ImageElement,
  RectElement,
  QrElement,
  IdCardPersonRecord,
  PreflightIssue,
  ExportLayout,
  SheetPaperSize,
  ExportDpi,
  ExportSides,
  CardSide,
} from './idCardTypes';

// Color conversions
export function hex2rgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function cmykPct(hex: string): [number, number, number, number] {
  const [r, g, b] = hex2rgb(hex);
  const mx = Math.max(r, g, b);
  if (!mx) return [0, 0, 0, 100];
  return [
    Math.round(((mx - r) / mx) * 100),
    Math.round(((mx - g) / mx) * 100),
    Math.round(((mx - b) / mx) * 100),
    Math.round(((255 - mx) / 255) * 100),
  ];
}

export function cmykText(hex: string): string {
  const [c, m, y, k] = cmykPct(hex);
  return `C${c} M${m} Y${y} K${k}`;
}

export function toCmyk(rgba: Uint8Array): Uint8Array {
  const n = rgba.length / 4;
  const out = new Uint8Array(n * 4);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 4) {
    const r = rgba[i];
    const g = rgba[i + 1];
    const b = rgba[i + 2];
    const mx = Math.max(r, g, b);
    if (mx === 0) {
      out[j + 3] = 255;
      continue;
    }
    out[j] = Math.round(((mx - r) * 255) / mx);
    out[j + 1] = Math.round(((mx - g) * 255) / mx);
    out[j + 2] = Math.round(((mx - b) * 255) / mx);
    out[j + 3] = 255 - mx;
  }
  return out;
}

export async function deflate(u8: Uint8Array): Promise<{ data: Uint8Array; z: boolean }> {
  if (typeof CompressionStream === 'undefined') {
    return { data: u8, z: false };
  }
  try {
    const s = new Blob([u8 as any]).stream().pipeThrough(new CompressionStream('deflate'));
    const buf = await new Response(s).arrayBuffer();
    return { data: new Uint8Array(buf), z: true };
  } catch {
    return { data: u8, z: false };
  }
}

export function cropMarks(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  off: number,
  len: number
): [number, number, number, number][] {
  const m: [number, number, number, number][] = [];
  for (const cx of [x0, x1]) {
    for (const cy of [y0, y1]) {
      const dx = cx === x0 ? -1 : 1;
      const dy = cy === y0 ? -1 : 1;
      m.push([cx + dx * off, cy, cx + dx * (off + len), cy]);
      m.push([cx, cy + dy * off, cx, cy + dy * (off + len)]);
    }
  }
  return m;
}

export interface PdfImageItem {
  w: number;
  h: number;
  data: Uint8Array;
  z: boolean;
  x: number;
  y: number;
  mw: number;
  mh: number;
}

export class IdCardPdf {
  private parts: (Uint8Array | Blob)[] = [];
  private pos = 0;
  private off: number[] = [];
  private enc = new TextEncoder();
  private next = 3;
  public pageIds: number[] = [];

  constructor() {
    // PDF 1.4 binary header
    this.bin(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));
  }

  public bin(u: Uint8Array) {
    this.parts.push(u);
    this.pos += u.length;
  }

  public txt(s: string) {
    this.bin(this.enc.encode(s));
  }

  public alloc(): number {
    return this.next++;
  }

  public obj(id: number, body: string) {
    this.off[id] = this.pos;
    this.txt(`${id} 0 obj\n${body}\nendobj\n`);
  }

  public stream(id: number, dict: string, data: Uint8Array) {
    this.off[id] = this.pos;
    this.txt(`${id} 0 obj\n<< ${dict} /Length ${data.length} >>\nstream\n`);
    this.bin(data);
    this.txt('\nendstream\nendobj\n');
  }

  public page(
    wMm: number,
    hMm: number,
    trimMm: { x: number; y: number; w: number; h: number } | null,
    bleedMm: number,
    images: PdfImageItem[],
    cropMarksMm: [number, number, number, number][] = []
  ) {
    const W = wMm * PT;
    const H = hMm * PT;
    const pid = this.alloc();
    const cid = this.alloc();
    const xobjs: string[] = [];

    let cs = '';
    for (const im of images) {
      const xid = this.alloc();
      const xname = `Im${xid}`;
      xobjs.push(`/${xname} ${xid} 0 R`);

      const dict =
        `/Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} ` +
        `/ColorSpace /DeviceCMYK /BitsPerComponent 8 ` +
        (im.z ? `/Filter /FlateDecode ` : '');

      this.stream(xid, dict, im.data);

      const ix = im.x * PT;
      const iy = H - (im.y + im.mh) * PT;
      const iw = im.mw * PT;
      const ih = im.mh * PT;
      cs += `q ${iw.toFixed(3)} 0 0 ${ih.toFixed(3)} ${ix.toFixed(3)} ${iy.toFixed(3)} cm /${xname} Do Q\n`;
    }

    if (cropMarksMm.length) {
      cs += `q 0.5 w 0 0 0 1 K\n`;
      for (const [x1, y1, x2, y2] of cropMarksMm) {
        cs += `${(x1 * PT).toFixed(3)} ${(H - y1 * PT).toFixed(3)} m ${(x2 * PT).toFixed(3)} ${(H - y2 * PT).toFixed(3)} l S\n`;
      }
      cs += `Q\n`;
    }

    this.stream(cid, '', this.enc.encode(cs));

    let boxes = `/MediaBox [0 0 ${W.toFixed(3)} ${H.toFixed(3)}]`;
    if (trimMm) {
      const tx = trimMm.x * PT;
      const ty = H - (trimMm.y + trimMm.h) * PT;
      const tw = trimMm.w * PT;
      const th = trimMm.h * PT;
      boxes += ` /TrimBox [${tx.toFixed(3)} ${ty.toFixed(3)} ${(tx + tw).toFixed(3)} ${(ty + th).toFixed(3)}]`;
      const bx = (trimMm.x - bleedMm) * PT;
      const by = H - (trimMm.y + trimMm.h + bleedMm) * PT;
      const bw = (trimMm.w + 2 * bleedMm) * PT;
      const bh = (trimMm.h + 2 * bleedMm) * PT;
      boxes += ` /BleedBox [${bx.toFixed(3)} ${by.toFixed(3)} ${(bx + bw).toFixed(3)} ${(by + bh).toFixed(3)}]`;
    }

    this.obj(
      pid,
      `<< /Type /Page /Parent 2 0 R ${boxes} /Contents ${cid} 0 R /Resources << /XObject << ${xobjs.join(' ')} >> >> >>`
    );

    this.pageIds.push(pid);
  }

  public finish(): Blob {
    this.obj(1, `<< /Type /Catalog /Pages 2 0 R >>`);
    this.obj(2, `<< /Type /Pages /Kids [${this.pageIds.map(i => `${i} 0 R`).join(' ')}] /Count ${this.pageIds.length} >>`);

    const xrefPos = this.pos;
    let xref = `xref\n0 ${this.next}\n0000000000 65535 f \n`;
    for (let i = 1; i < this.next; i++) {
      xref += `${String(this.off[i] || 0).padStart(10, '0')} 00000 n \n`;
    }
    this.txt(xref);
    this.txt(`trailer\n<< /Size ${this.next} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`);

    return new Blob(this.parts as BlobPart[], { type: 'application/pdf' });
  }
}

// Canvas Rendering Helpers
export function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawFitImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  fit: string
): number {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return 0;

  let sx = 0;
  let sy = 0;
  let sw = iw;
  let sh = ih;
  let dx = x;
  let dy = y;
  let dw = w;
  let dh = h;

  if (fit === 'cover') {
    const ir = iw / ih;
    const tr = w / h;
    if (ir > tr) {
      sw = ih * tr;
      sx = (iw - sw) / 2;
    } else {
      sh = iw / tr;
      sy = (ih - sh) / 2;
    }
  } else if (fit === 'contain') {
    const ir = iw / ih;
    const tr = w / h;
    if (ir > tr) {
      dh = w / ir;
      dy = y + (h - dh) / 2;
    } else {
      dw = h * ir;
      dx = x + (w - dw) / 2;
    }
  }

  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  const dpiX = (sw / (dw / MM)) * (72 / PT);
  const dpiY = (sh / (dh / MM)) * (72 / PT);
  return Math.round(Math.min(dpiX, dpiY));
}

// Substitute placeholders
export function substituteField(templateStr: string, r: IdCardPersonRecord): string {
  let s = templateStr;
  const mapping: Record<string, string> = {
    '{name}': r.name || r.display_name || 'Muthu Kumar P',
    '{idno}': r.idno || r.employee_code || 'EMP-20418',
    '{designation}': r.designation || 'Software Engineer',
    '{department}': r.department || 'Product Engineering',
    '{branch}': r.branch || 'Coimbatore HQ',
    '{worksite}': r.worksite || r.branch || 'Coimbatore HQ',
    '{org}': r.org || 'Joy PeopleHR',
    '{phone}': r.phone || '+91 98765 43210',
    '{email}': r.email || 'employee@joypeoplehr.com',
    '{blood}': r.blood || 'B+',
    '{dob}': r.dob || '09 Dec 2003',
    '{doj}': r.doj || '24 Nov 2025',
    '{valid}': r.valid || 'Dec 2028',
    '{reporting_manager}': r.reporting_manager || 'HR Operations',
    '{contractor}': r.contractor || 'Joy Workforce Solutions',
    '{address}': r.address || 'Joy Tower, 12 Mill Road, Coimbatore 641001',
  };

  Object.entries(mapping).forEach(([token, val]) => {
    s = s.split(token).join(val);
  });

  return s;
}

export function getWcagContrast(hex1: string, hex2: string): number {
  try {
    const [r1, g1, b1] = hex2rgb(hex1);
    const [r2, g2, b2] = hex2rgb(hex2);
    const lum = (r: number, g: number, b: number) => {
      const a = [r, g, b].map(v => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    };
    const l1 = lum(r1, g1, b1);
    const l2 = lum(r2, g2, b2);
    const brightest = Math.max(l1, l2);
    const darkest = Math.min(l1, l2);
    return (brightest + 0.05) / (darkest + 0.05);
  } catch {
    return 21;
  }
}

export function findUnderlyingBg(el: CardElement, side?: CardSideData | null): string {
  if (!side || !Array.isArray(side.els)) {
    return '#ffffff';
  }
  const elIndex = side.els.indexOf(el);
  const elementsBelow = elIndex > 0 ? side.els.slice(0, elIndex) : [];
  for (let i = elementsBelow.length - 1; i >= 0; i--) {
    const b = elementsBelow[i];
    if (b && b.type === 'rect' && !b.hidden && b.fill) {
      if (el.x >= b.x && el.x <= b.x + b.w && el.y >= b.y && el.y <= b.y + b.h) {
        return b.fill;
      }
    }
  }
  return side.bg && side.bg !== 'transparent' ? side.bg : '#ffffff';
}

export function drawTextElement(
  ctx: CanvasRenderingContext2D,
  el: TextElement,
  r: IdCardPersonRecord,
  g: CardGeometry,
  collectIssues?: PreflightIssue[],
  backgroundHex = '#ffffff'
) {
  let txt = substituteField(el.text, r);
  if (el.uppercase) {
    txt = txt.toUpperCase();
  }

  // 1. Authoritative Physical Scaling: 1 pt = MM / 72 mm (approx 0.3528 mm)
  const ptToMm = MM / 72;
  const targetBoxW = el.w > 0 ? el.w : 30;
  const targetBoxH = el.h > 0 ? el.h : 6;

  let sizePt = el.size || 10;
  const minSizePt = el.minSize || 5.0;
  const fontFam = `"${el.font || 'IBM Plex Sans'}", sans-serif`;

  const setFont = (szPt: number) => {
    const szMm = szPt * ptToMm;
    ctx.font = `${el.weight || 400} ${szMm}px ${fontFam}`;
    return szMm;
  };

  let currentSzMm = setFont(sizePt);

  // Helper: word-wrap paragraphs given a font size in pt
  const breakLines = (szPt: number): string[] => {
    setFont(szPt);
    const lines: string[] = [];
    for (const para of txt.split('\n')) {
      if (!para) {
        lines.push('');
        continue;
      }
      let cur = '';
      for (const wd of para.split(' ')) {
        const candidate = cur ? `${cur} ${wd}` : wd;
        if (cur && ctx.measureText(candidate).width > targetBoxW) {
          lines.push(cur);
          cur = wd;
        } else {
          cur = candidate;
        }
      }
      if (cur) lines.push(cur);
    }
    return lines;
  };

  // 2. Text layout & overflow engine
  const overflowMode = el.overflowMode || (el.fit !== false ? 'shrink' : 'wrap');
  let lines = breakLines(sizePt);
  const lhMultiplier = el.lineHeight || 1.25;
  let lh = currentSzMm * lhMultiplier;
  let totalTextHeight = lines.length * lh;
  let longestLine = Math.max(...lines.map(l => ctx.measureText(l).width), 0);

  if (overflowMode === 'shrink' || el.fit) {
    // If text exceeds width OR exceeds height, scale down until it fits
    let attempts = 0;
    while (
      (longestLine > targetBoxW || (el.h > 0 && totalTextHeight > targetBoxH)) &&
      sizePt > minSizePt &&
      attempts < 10
    ) {
      attempts++;
      const wRatio = targetBoxW / Math.max(longestLine, 0.1);
      const hRatio = targetBoxH / Math.max(totalTextHeight, 0.1);
      const scaleDown = Math.min(wRatio, hRatio);
      sizePt = Math.max(minSizePt, sizePt * Math.max(0.7, scaleDown));
      currentSzMm = setFont(sizePt);
      lines = breakLines(sizePt);
      lh = currentSzMm * lhMultiplier;
      totalTextHeight = lines.length * lh;
      longestLine = Math.max(...lines.map(l => ctx.measureText(l).width), 0);
    }
  }

  // 3. Max lines & Ellipsis truncation
  if (el.maxLines && lines.length > el.maxLines) {
    lines = lines.slice(0, el.maxLines);
    let last = lines[lines.length - 1];
    while (ctx.measureText(last + '...').width > targetBoxW && last.length > 3) {
      last = last.slice(0, -1);
    }
    lines[lines.length - 1] = last.trim() + '...';
    totalTextHeight = lines.length * lh;
  } else if (overflowMode === 'ellipsis') {
    lines = lines.map(line => {
      if (ctx.measureText(line).width <= targetBoxW) return line;
      let l = line;
      while (ctx.measureText(l + '...').width > targetBoxW && l.length > 3) {
        l = l.slice(0, -1);
      }
      return l.trim() + '...';
    });
  }

  // 4. Vertical Alignment inside el.h
  let startY = el.y;
  if (el.h && el.h > totalTextHeight) {
    if (el.verticalAlign === 'middle') {
      startY = el.y + (el.h - totalTextHeight) / 2;
    } else if (el.verticalAlign === 'bottom') {
      startY = el.y + (el.h - totalTextHeight);
    }
  }

  // 5. Render Text
  ctx.fillStyle = el.color || '#111827';
  ctx.textBaseline = 'top';
  ctx.textAlign = el.align || 'left';
  const ax =
    el.align === 'center'
      ? el.x + targetBoxW / 2
      : el.align === 'right'
      ? el.x + targetBoxW
      : el.x;

  lines.forEach((l, i) => {
    ctx.fillText(l, ax, startY + i * lh);
  });

  // Track physical bounding box for collision detection & resize handles
  const effectiveBoxH = Math.max(targetBoxH, totalTextHeight);
  el._box = { x: el.x, y: el.y, w: targetBoxW, h: effectiveBoxH };

  // 6. Preflight Audits
  if (collectIssues) {
    const widest = Math.max(...lines.map(l => ctx.measureText(l).width), 0);
    const x0 =
      el.align === 'center'
        ? el.x + targetBoxW / 2 - widest / 2
        : el.align === 'right'
        ? el.x + targetBoxW - widest
        : el.x;
    const x1 = x0 + widest;
    const y0 = el.y;
    const y1 = el.y + totalTextHeight;

    const label = el.text.split('\n')[0].slice(0, 24) || 'Text';

    // A. Boundary & Cut Line Check
    if (x0 < -0.01 || y0 < -0.01 || x1 > g.w + 0.01 || y1 > g.h + 0.01) {
      collectIssues.push({
        key: `cut:${el.id}`,
        lv: 'fix',
        t: `"${label}" extends past the cut line (${x1.toFixed(1)} x ${y1.toFixed(1)} mm)`,
        elementId: el.id,
        category: 'layout',
      });
    } else if (
      x0 < g.safe - 0.01 ||
      y0 < g.safe - 0.01 ||
      x1 > g.w - g.safe + 0.01 ||
      y1 > g.h - g.safe + 0.01
    ) {
      collectIssues.push({
        key: `safe:${el.id}`,
        lv: 'check',
        t: `"${label}" enters the ${g.safe} mm safe margin`,
        elementId: el.id,
        category: 'layout',
      });
    }

    // B. Contrast check
    if (el.color && backgroundHex) {
      const contrast = getWcagContrast(el.color, backgroundHex);
      if (contrast < 3.0) {
        collectIssues.push({
          key: `contrast:${el.id}`,
          lv: 'fix',
          t: `"${label}" has low contrast (${contrast.toFixed(1)}:1) against background`,
          elementId: el.id,
          category: 'contrast',
        });
      }
    }
  }
}

export function drawImageElement(
  ctx: CanvasRenderingContext2D,
  el: ImageElement,
  r: IdCardPersonRecord,
  _g: CardGeometry,
  logoImg?: HTMLImageElement | null,
  photosMap?: Map<string, HTMLImageElement>,
  collectIssues?: PreflightIssue[],
  isPreview = false
) {
  let img: HTMLImageElement | null | undefined = null;

  if (el.src === 'photo') {
    img = r.__img;
    if (!img && photosMap && r.photo) {
      const n = String(r.photo).trim().toLowerCase();
      img = photosMap.get(n) || photosMap.get(n.replace(/\.[a-z0-9]+$/, '')) || null;
    }
  } else if (el.src === 'logo') {
    img = logoImg;
  } else {
    img = el.img;
  }

  el._box = { x: el.x, y: el.y, w: el.w, h: el.h };

  const applyPath = () => {
    if (el.shape === 'circle') {
      ctx.beginPath();
      ctx.ellipse(el.x + el.w / 2, el.y + el.h / 2, el.w / 2, el.h / 2, 0, 0, Math.PI * 2);
    } else {
      drawRoundRect(ctx, el.x, el.y, el.w, el.h, el.shape === 'rounded' ? el.radius : 0);
    }
  };

  ctx.save();
  applyPath();
  ctx.clip();

  if (img) {
    const dpi = drawFitImage(ctx, img, el.x, el.y, el.w, el.h, el.fit);
    if (collectIssues) {
      collectIssues.push({
        key: 'dpi:' + el.id,
        lv: dpi < 150 ? 'fix' : dpi < 250 ? 'check' : 'ok',
        dpi,
        t: `${el.src === 'photo' ? 'Photo' : el.src === 'logo' ? 'Logo' : 'Image'} resolution`,
      });
    }
  } else if (isPreview) {
    if (el.src === 'logo') {
      // Modern corporate emblem / badge placeholder for logo
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(el.x, el.y, el.w, el.h);
      ctx.fillStyle = '#64748b';
      const cx = el.x + el.w / 2;
      const cy = el.y + el.h / 2;
      const s = Math.min(el.w, el.h) * 0.32;
      ctx.fillRect(cx - s, cy - s * 0.7, s * 2, s * 1.4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - s * 0.5, cy - s * 0.3, s, s * 0.7);
    } else {
      // Modern stylized silhouette placeholder for employee photo
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(el.x, el.y, el.w, el.h);
      ctx.fillStyle = '#94a3b8';
      const cx = el.x + el.w / 2;
      const cy = el.y + el.h * 0.38;
      const rad = Math.min(el.w, el.h) * 0.2;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx, el.y + el.h * 0.92, el.w * 0.36, el.h * 0.3, 0, Math.PI, 0);
      ctx.fill();
    }
  }
  ctx.restore();

  if (el.border > 0) {
    applyPath();
    ctx.lineWidth = el.border;
    ctx.strokeStyle = el.borderColor;
    ctx.stroke();
  }
}

export function drawRectElement(ctx: CanvasRenderingContext2D, el: RectElement, g: CardGeometry) {
  const b = g.bleed;
  let x1 = el.x;
  let y1 = el.y;
  let x2 = el.x + el.w;
  let y2 = el.y + el.h;

  if (!el.radius) {
    if (x1 <= 0.01) x1 = -b;
    if (y1 <= 0.01) y1 = -b;
    if (x2 >= g.w - 0.01) x2 = g.w + b;
    if (y2 >= g.h - 0.01) y2 = g.h + b;
  }

  ctx.fillStyle = el.fill;
  if (el.radius) {
    drawRoundRect(ctx, x1, y1, x2 - x1, y2 - y1, el.radius);
    ctx.fill();
  } else {
    ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
  }

  if (el.stroke && el.strokeWidth && el.strokeWidth > 0) {
    ctx.lineWidth = el.strokeWidth;
    ctx.strokeStyle = el.stroke;
    if (el.radius) {
      drawRoundRect(ctx, x1, y1, x2 - x1, y2 - y1, el.radius);
      ctx.stroke();
    } else {
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    }
  }

  el._box = { x: el.x, y: el.y, w: el.w, h: el.h };
}

// Synchronous QR Drawing using pre-rendered canvas or simplified vector grid
const qrImageCache = new Map<string, HTMLImageElement>();

export function drawQrElement(
  ctx: CanvasRenderingContext2D,
  el: QrElement,
  r: IdCardPersonRecord
) {
  const rawData = substituteField(el.qrData, r);
  el._box = { x: el.x, y: el.y, w: el.w, h: el.h };

  // Draw background
  ctx.fillStyle = el.bgColor || '#ffffff';
  ctx.fillRect(el.x, el.y, el.w, el.h);

  // If cached image exists, draw it
  const cacheKey = `${rawData}|${el.color}|${el.bgColor}`;
  if (qrImageCache.has(cacheKey)) {
    const cached = qrImageCache.get(cacheKey)!;
    ctx.drawImage(cached, el.x, el.y, el.w, el.h);
    return;
  }

  // Otherwise trigger async generation and draw fallback placeholder
  QRCode.toDataURL(rawData, {
    margin: 1,
    color: {
      dark: el.color || '#000000',
      light: el.bgColor || '#ffffff',
    },
    errorCorrectionLevel: 'M',
  }).then(url => {
    const img = new Image();
    img.onload = () => {
      qrImageCache.set(cacheKey, img);
    };
    img.src = url;
  }).catch(() => {});

  // Clean fallback pattern while QR dataURL prepares
  ctx.strokeStyle = el.color || '#000000';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(el.x + 1, el.y + 1, el.w - 2, el.h - 2);
  ctx.fillStyle = el.color || '#000000';
  ctx.fillRect(el.x + 2, el.y + 2, 4, 4);
  ctx.fillRect(el.x + el.w - 6, el.y + 2, 4, 4);
  ctx.fillRect(el.x + 2, el.y + el.h - 6, 4, 4);
}

export function drawBackgroundArtwork(
  ctx: CanvasRenderingContext2D,
  side: CardSideData,
  g: CardGeometry,
  collectIssues?: PreflightIssue[]
) {
  const b = g.bleed;
  const tw = g.w + 2 * b;
  const th = g.h + 2 * b;

  // 1. Draw base solid background color
  if (side.bg && side.bg !== 'transparent') {
    ctx.fillStyle = side.bg;
    ctx.fillRect(-b, -b, tw, th);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-b, -b, tw, th);
  }

  // 2. Draw uploaded background image with advanced transformation & fitting
  if (side.bgImg && side.artwork?.visible !== false) {
    const art = side.artwork || {
      fit: 'cover' as const,
      x: 0,
      y: 0,
      scale: 1.0,
      rotation: 0,
      opacity: 1.0,
    };

    ctx.save();
    // Clip to bleed box so background never bleeds outside card bleed margin
    ctx.beginPath();
    ctx.rect(-b, -b, tw, th);
    ctx.clip();

    // Apply background image opacity
    if (typeof art.opacity === 'number' && art.opacity < 1) {
      ctx.globalAlpha = Math.max(0, art.opacity);
    }

    // Apply rotation around card center
    if (art.rotation && art.rotation !== 0) {
      const cx = g.w / 2;
      const cy = g.h / 2;
      ctx.translate(cx, cy);
      ctx.rotate((art.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    const iw = side.bgImg.naturalWidth || side.bgImg.width || 800;
    const ih = side.bgImg.naturalHeight || side.bgImg.height || 600;
    const userScale = typeof art.scale === 'number' && art.scale > 0 ? art.scale : 1.0;

    let dw = tw;
    let dh = th;

    if (art.fit === 'contain') {
      const s = Math.min(tw / iw, th / ih) * userScale;
      dw = iw * s;
      dh = ih * s;
    } else if (art.fit === 'stretch') {
      dw = tw * userScale;
      dh = th * userScale;
    } else if (art.fit === 'original') {
      // Physical scale at 300 DPI base
      const s = (25.4 / 300) * userScale;
      dw = iw * s;
      dh = ih * s;
    } else {
      // Default: 'cover'
      const s = Math.max(tw / iw, th / ih) * userScale;
      dw = iw * s;
      dh = ih * s;
    }

    // Centered base position + user millimeter offsets
    const userX = typeof art.x === 'number' ? art.x : 0;
    const userY = typeof art.y === 'number' ? art.y : 0;
    const dx = -b + (tw - dw) / 2 + userX;
    const dy = -b + (th - dh) / 2 + userY;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Check if non-destructive crop is defined
    if (art.crop && art.crop.w > 0 && art.crop.h > 0) {
      // Calculate source crop coordinates from natural image dimensions
      const sx = Math.max(0, (art.crop.x / g.w) * iw);
      const sy = Math.max(0, (art.crop.y / g.h) * ih);
      const sw = Math.min(iw - sx, (art.crop.w / g.w) * iw);
      const sh = Math.min(ih - sy, (art.crop.h / g.h) * ih);
      ctx.drawImage(side.bgImg, sx, sy, sw, sh, dx, dy, dw, dh);
    } else {
      ctx.drawImage(side.bgImg, dx, dy, dw, dh);
    }

    // Effective DPI calculation for preflight
    const effectiveDpi = Math.round(iw / (dw / 25.4));
    if (collectIssues) {
      collectIssues.push({
        key: 'bgdpi',
        lv: effectiveDpi < 150 ? 'fix' : effectiveDpi < 250 ? 'check' : 'ok',
        dpi: effectiveDpi,
        t: `Background artwork print resolution (${effectiveDpi} DPI)`,
        category: 'print',
      });
    }

    ctx.restore();
  }

  // 3. Draw background overlay if configured (strictly over background, under foreground)
  const overlayOp = side.artwork?.overlayOpacity;
  if (typeof overlayOp === 'number' && overlayOp > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, Math.max(0, overlayOp));

    if (side.artwork?.overlayGradient?.enabled) {
      const grad = side.artwork.overlayGradient;
      const angleRad = ((grad.angle || 0) * Math.PI) / 180;
      const x1 = -b + (tw / 2) * (1 - Math.cos(angleRad));
      const y1 = -b + (th / 2) * (1 - Math.sin(angleRad));
      const x2 = -b + (tw / 2) * (1 + Math.cos(angleRad));
      const y2 = -b + (th / 2) * (1 + Math.sin(angleRad));
      const lg = ctx.createLinearGradient(x1, y1, x2, y2);
      lg.addColorStop(0, grad.startColor || '#000000');
      lg.addColorStop(1, grad.endColor || '#000000');
      ctx.fillStyle = lg;
    } else {
      ctx.fillStyle = side.artwork?.overlayColor || '#000000';
    }

    ctx.fillRect(-b, -b, tw, th);
    ctx.restore();
  }
}

export function drawCardSide(
  ctx: CanvasRenderingContext2D,
  side: CardSideData,
  r: IdCardPersonRecord,
  g: CardGeometry,
  scale: number,
  options: {
    logo?: HTMLImageElement | null;
    photos?: Map<string, HTMLImageElement>;
    collectIssues?: PreflightIssue[];
    isPreview?: boolean;
  } = {}
) {
  const { logo, photos, collectIssues, isPreview } = options;
  const b = g.bleed;

  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(b, b);

  // 1. Draw card background with advanced artwork & overlay
  drawBackgroundArtwork(ctx, side, g, collectIssues);

  // 2. Draw card elements
  for (const el of side.els) {
    if (el.hidden) continue;

    ctx.save();

    // Opacity
    if (typeof el.opacity === 'number' && el.opacity < 1) {
      ctx.globalAlpha = el.opacity;
    }

    // Rotation around center
    if (el.rotation && el.rotation !== 0) {
      const cx = el.x + el.w / 2;
      const cy = el.y + el.h / 2;
      ctx.translate(cx, cy);
      ctx.rotate((el.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    if (el.type === 'rect') {
      drawRectElement(ctx, el, g);
    } else if (el.type === 'image') {
      drawImageElement(ctx, el, r, g, logo, photos, collectIssues, isPreview);
    } else if (el.type === 'text') {
      const underlyingBg = findUnderlyingBg(el, side);
      drawTextElement(ctx, el, r, g, collectIssues, underlyingBg);
    } else if (el.type === 'qr') {
      drawQrElement(ctx, el, r);
    }

    ctx.restore();
  }

  ctx.restore();
}

export async function renderCmykItem(
  side: CardSideData,
  r: IdCardPersonRecord,
  geometry: CardGeometry,
  dpi: number,
  logoImg: HTMLImageElement | null,
  photosMap: Map<string, HTMLImageElement>
): Promise<PdfImageItem> {
  const scale = dpi / MM;
  const tw = geometry.w + 2 * geometry.bleed;
  const th = geometry.h + 2 * geometry.bleed;

  const cv = document.createElement('canvas');
  cv.width = Math.round(tw * scale);
  cv.height = Math.round(th * scale);
  const cx = cv.getContext('2d');
  if (!cx) throw new Error('Could not create canvas context');

  drawCardSide(cx, side, r, geometry, scale, {
    logo: logoImg,
    photos: photosMap,
  });

  const imgData = cx.getImageData(0, 0, cv.width, cv.height);
  const cmykBytes = toCmyk(new Uint8Array(imgData.data.buffer));
  const { data, z } = await deflate(cmykBytes);

  return {
    w: cv.width,
    h: cv.height,
    data,
    z,
    x: 0,
    y: 0,
    mw: tw,
    mh: th,
  };
}
