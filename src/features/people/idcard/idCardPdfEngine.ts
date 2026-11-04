// src/features/people/idcard/idCardPdfEngine.ts
// ============================================================================
// Joy PeopleHR — Enterprise CMYK PDF Generator & Preflight Engine
// Generates print-ready PDF 1.4 documents with DeviceCMYK, Bleed, and Crop Marks
// ============================================================================

import {
  MM,
  PT,
  CardGeometry,
  CardSideData,
  CardElement,
  TextElement,
  ImageElement,
  RectElement,
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
    const s = new Blob([u8]).stream().pipeThrough(new CompressionStream('deflate'));
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
    pw: number,
    ph: number,
    trim: { x: number; y: number; w: number; h: number } | null,
    bl: number,
    items: PdfImageItem[],
    marks?: [number, number, number, number][]
  ) {
    const pt = (v: number) => (v * PT).toFixed(3);
    const res: string[] = [];
    let content = '';

    items.forEach((it, i) => {
      const id = this.alloc();
      this.stream(
        id,
        `/Type /XObject /Subtype /Image /Width ${it.w} /Height ${it.h} /ColorSpace /DeviceCMYK /BitsPerComponent 8${
          it.z ? ' /Filter /FlateDecode' : ''
        }`,
        it.data
      );
      res.push(`/Im${i} ${id} 0 R`);
      content += `q ${pt(it.mw)} 0 0 ${pt(it.mh)} ${pt(it.x)} ${pt(ph - it.y - it.mh)} cm /Im${i} Do Q\n`;
    });

    if (marks && marks.length) {
      content += '1 1 1 1 K 0.25 w\n';
      for (const [x1, y1, x2, y2] of marks) {
        content += `${pt(x1)} ${pt(ph - y1)} m ${pt(x2)} ${pt(ph - y2)} l S\n`;
      }
    }

    const cid = this.alloc();
    this.stream(cid, '', this.enc.encode(content));

    let boxes = '';
    if (trim) {
      const b = (x: number, y: number, w: number, h: number) =>
        `[${pt(x)} ${pt(ph - y - h)} ${pt(x + w)} ${pt(ph - y)}]`;
      boxes = `/TrimBox ${b(trim.x, trim.y, trim.w, trim.h)} /BleedBox ${b(
        Math.max(0, trim.x - bl),
        Math.max(0, trim.y - bl),
        Math.min(pw, trim.w + 2 * bl),
        Math.min(ph, trim.h + 2 * bl)
      )} `;
    }

    const pid = this.alloc();
    this.obj(
      pid,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pt(pw)} ${pt(ph)}] ${boxes}/Resources << /XObject << ${res.join(
        ' '
      )} >> >> /Contents ${cid} 0 R >>`
    );
    this.pageIds.push(pid);
  }

  public finish(): Blob {
    this.obj(
      2,
      `<< /Type /Pages /Kids [${this.pageIds.map(i => i + ' 0 R').join(' ')}] /Count ${this.pageIds.length} >>`
    );
    this.obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    const xref = this.pos;
    const N = this.next;
    let x = `xref\n0 ${N}\n0000000000 65535 f \n`;
    for (let i = 1; i < N; i++) {
      x += String(this.off[i]).padStart(10, '0') + ' 00000 n \n';
    }
    x += `trailer\n<< /Size ${N} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    this.txt(x);
    return new Blob(this.parts, { type: 'application/pdf' });
  }
}

// Canvas Rendering Helpers
export function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function expandPlaceholders(tpl: string, r: IdCardPersonRecord): string {
  return String(tpl || '')
    .split('\n')
    .map(line => {
      let had = false;
      let any = false;
      const out = line.replace(/\{([^}]+)\}/g, (_m, k) => {
        had = true;
        const v = String(r[k.trim()] ?? '');
        if (v) any = true;
        return v;
      });
      return had && !any ? null : out;
    })
    .filter(l => l !== null)
    .join('\n');
}

export function drawFitImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  fit: 'cover' | 'contain'
): number {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const s = fit === 'contain' ? Math.min(w / iw, h / ih) : Math.max(w / iw, h / ih);
  const dw = iw * s;
  const dh = ih * s;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  return MM / s; // Effective DPI
}

export function drawTextElement(
  ctx: CanvasRenderingContext2D,
  el: TextElement,
  r: IdCardPersonRecord,
  g: CardGeometry,
  collectIssues?: PreflightIssue[]
) {
  const txt = expandPlaceholders(el.text, r);
  if (!txt) {
    el._box = { x: el.x, y: el.y, w: el.w, h: 4 };
    return;
  }

  let size = (el.size * MM) / 72;
  const fam = `"${el.font}", Arial, sans-serif`;
  const setF = (s: number) => {
    ctx.font = `${el.weight} ${s}px ${fam}`;
  };
  setF(size);

  if (el.fit) {
    const longest = Math.max(...txt.split('\n').map(l => ctx.measureText(l).width));
    if (longest > el.w) {
      size = Math.max(size * 0.55, (size * el.w) / longest);
    }
    setF(size);
  }

  const lines: string[] = [];
  for (const para of txt.split('\n')) {
    let cur = '';
    for (const wd of para.split(' ')) {
      const t = cur ? cur + ' ' + wd : wd;
      if (cur && ctx.measureText(t).width > el.w) {
        lines.push(cur);
        cur = wd;
      } else {
        cur = t;
      }
    }
    lines.push(cur);
  }

  const lh = size * 1.3;
  const widest = Math.max(...lines.map(l => ctx.measureText(l).width));
  ctx.fillStyle = el.color;
  ctx.textBaseline = 'top';
  ctx.textAlign = el.align;
  const ax = el.align === 'center' ? el.x + el.w / 2 : el.align === 'right' ? el.x + el.w : el.x;

  lines.forEach((l, i) => ctx.fillText(l, ax, el.y + i * lh + (lh - size) / 2));
  const hh = lines.length * lh;
  el._box = { x: el.x, y: el.y, w: el.w, h: hh };

  if (collectIssues) {
    const x0 =
      el.align === 'center' ? el.x + el.w / 2 - widest / 2 : el.align === 'right' ? el.x + el.w - widest : el.x;
    const x1 = x0 + widest;
    const y0 = el.y;
    const y1 = el.y + hh;

    const label = el.text.split('\n')[0].slice(0, 24) || 'Text';

    if (x0 < -0.01 || y0 < -0.01 || x1 > g.w + 0.01 || y1 > g.h + 0.01) {
      collectIssues.push({ key: 'cut:' + el.id, lv: 'fix', t: `"${label}" runs past the cut line` });
    } else if (x0 < g.safe - 0.01 || y0 < g.safe - 0.01 || x1 > g.w - g.safe + 0.01 || y1 > g.h - g.safe + 0.01) {
      collectIssues.push({ key: 'safe:' + el.id, lv: 'check', t: `"${label}" is inside the ${g.safe} mm safe margin edge` });
    }
    if (widest > el.w + 0.2) {
      collectIssues.push({ key: 'fit:' + el.id, lv: 'check', t: `"${label}" is wider than its box` });
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
    // Elegant silhouette placeholder
    ctx.fillStyle = '#c9d1d8';
    ctx.fillRect(el.x, el.y, el.w, el.h);
    ctx.fillStyle = '#9aa6b0';
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
  el._box = { x: el.x, y: el.y, w: el.w, h: el.h };
}

export function drawCardSide(
  ctx: CanvasRenderingContext2D,
  sideData: CardSideData,
  record: IdCardPersonRecord,
  geometry: CardGeometry,
  ppm: number,
  options: {
    preview?: boolean;
    guides?: boolean;
    selId?: string | null;
    logo?: HTMLImageElement | null;
    photos?: Map<string, HTMLImageElement>;
    collectIssues?: PreflightIssue[];
  } = {}
) {
  ctx.save();
  ctx.setTransform(ppm, 0, 0, ppm, geometry.bleed * ppm, geometry.bleed * ppm);

  // Background
  ctx.fillStyle = sideData.bg;
  ctx.fillRect(-geometry.bleed, -geometry.bleed, geometry.w + 2 * geometry.bleed, geometry.h + 2 * geometry.bleed);

  if (sideData.bgImg) {
    const dpi = drawFitImage(
      ctx,
      sideData.bgImg,
      -geometry.bleed,
      -geometry.bleed,
      geometry.w + 2 * geometry.bleed,
      geometry.h + 2 * geometry.bleed,
      'cover'
    );
    if (options.collectIssues) {
      options.collectIssues.push({
        key: 'bgdpi',
        lv: dpi < 150 ? 'fix' : dpi < 250 ? 'check' : 'ok',
        dpi,
        t: 'Background artwork',
      });
    }
  }

  // Elements
  for (const el of sideData.els) {
    if (el.type === 'rect') {
      drawRectElement(ctx, el as RectElement, geometry);
    } else if (el.type === 'image') {
      drawImageElement(
        ctx,
        el as ImageElement,
        record,
        geometry,
        options.logo,
        options.photos,
        options.collectIssues,
        options.preview
      );
    } else {
      drawTextElement(ctx, el as TextElement, record, geometry, options.collectIssues);
    }
  }

  // Trim, Bleed & Safe Guides
  if (options.guides) {
    ctx.lineWidth = 0.22;
    ctx.strokeStyle = '#e5007d'; // Magenta trim
    ctx.setLineDash([]);
    ctx.strokeRect(0, 0, geometry.w, geometry.h);

    ctx.setLineDash([1, 0.8]);
    ctx.strokeStyle = '#00a6d6'; // Cyan bleed
    ctx.strokeRect(
      -geometry.bleed + 0.11,
      -geometry.bleed + 0.11,
      geometry.w + 2 * geometry.bleed - 0.22,
      geometry.h + 2 * geometry.bleed - 0.22
    );

    ctx.strokeStyle = '#2a9d4a'; // Green safe margin
    ctx.strokeRect(geometry.safe, geometry.safe, geometry.w - 2 * geometry.safe, geometry.h - 2 * geometry.safe);
    ctx.setLineDash([]);
  }

  // Selection box & corner handle
  if (options.selId) {
    const selectedEl = sideData.els.find(x => x.id === options.selId);
    if (selectedEl && selectedEl._box) {
      const b = selectedEl._box;
      ctx.lineWidth = 0.3;
      ctx.strokeStyle = '#1a8cff';
      ctx.setLineDash([]);
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = '#1a8cff';
      ctx.fillRect(b.x + b.w - 1.2, b.y + b.h - 1.2, 2.4, 2.4);
    }
  }

  ctx.restore();
}

// CMYK Canvas Render
export async function renderCmykItem(
  sideData: CardSideData,
  record: IdCardPersonRecord,
  geometry: CardGeometry,
  dpi: number,
  logoImg?: HTMLImageElement | null,
  photosMap?: Map<string, HTMLImageElement>
): Promise<PdfImageItem> {
  const tw = geometry.w + 2 * geometry.bleed;
  const th = geometry.h + 2 * geometry.bleed;
  const W = Math.round((tw * dpi) / MM);
  const H = Math.round((th * dpi) / MM);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not create 2D canvas context for CMYK render');

  drawCardSide(ctx, sideData, record, geometry, W / tw, { logo: logoImg, photos: photosMap });

  const rgba = ctx.getImageData(0, 0, W, H).data;
  const cmyk = toCmyk(new Uint8Array(rgba.buffer));
  const z = await deflate(cmyk);

  return {
    w: W,
    h: H,
    data: z.data,
    z: z.z,
    mw: tw,
    mh: th,
    x: 0,
    y: 0,
  };
}

