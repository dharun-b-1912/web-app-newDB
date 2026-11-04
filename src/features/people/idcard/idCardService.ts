// src/features/people/idcard/idCardService.ts
// ============================================================================
// Joy PeopleHR — Enterprise ID Card Press Service & Database Bridge
// ============================================================================

import {
  CardElement,
  CardGeometry,
  CardSideData,
  IdCardPersonRecord,
  PreflightIssue,
  DEFAULT_COLUMNS,
  TextElement,
  ImageElement,
  RectElement,
} from './idCardTypes';
import {
  IdCardPdf,
  cropMarks,
  renderCmykItem,
  drawCardSide,
} from './idCardPdfEngine';
import { supabase } from '../../../lib/supabase';

let uid = 1;
export const nextElementId = () => 'el_' + uid++;

export const createTextElement = (o: Partial<TextElement> = {}): TextElement => ({
  id: nextElementId(),
  type: 'text',
  font: 'IBM Plex Sans',
  size: 9,
  weight: 400,
  color: '#14181c',
  align: 'left',
  text: '',
  fit: false,
  x: 0,
  y: 0,
  w: 40,
  h: 6,
  ...o,
});

export const createRectElement = (o: Partial<RectElement> = {}): RectElement => ({
  id: nextElementId(),
  type: 'rect',
  fill: '#000000',
  radius: 0,
  x: 0,
  y: 0,
  w: 10,
  h: 10,
  ...o,
});

export const createImageElement = (o: Partial<ImageElement> = {}): ImageElement => ({
  id: nextElementId(),
  type: 'image',
  src: 'photo',
  shape: 'rect',
  fit: 'cover',
  radius: 1.5,
  border: 0,
  borderColor: '#ffffff',
  img: null,
  srcName: '',
  x: 0,
  y: 0,
  w: 20,
  h: 25,
  ...o,
});

// Built-in Templates
const PALETTES = {
  corporate: { main: '#0f2f57', acc: '#1d7bd8', ink: '#14181c', sub: '#3a444d', tag: '#cfe0f5', label: 'EMPLOYEE ID' },
  campus: { main: '#1b4332', acc: '#f4a261', ink: '#14181c', sub: '#3a444d', tag: '#d8f3dc', label: 'STAFF IDENTITY' },
  minimal: { main: '#111111', acc: '#e63946', ink: '#111111', sub: '#4a4f55', tag: '#ffffff', label: 'IDENTITY CARD' },
};

export function makeLandscapeTemplate(n: 'corporate' | 'campus' | 'minimal') {
  const p = PALETTES[n];
  const W = 85.6;
  const f: CardElement[] = [];
  const b: CardElement[] = [];

  if (n === 'corporate') {
    f.push(
      createRectElement({ x: 0, y: 0, w: W, h: 14, fill: p.main }),
      createImageElement({ src: 'logo', x: 5, y: 3, w: 8, h: 8, fit: 'contain', radius: 0 }),
      createTextElement({ text: '{org}', x: 15, y: 3.2, w: 66, size: 10, weight: 700, color: '#ffffff', fit: true }),
      createTextElement({ text: p.label, x: 15, y: 8.6, w: 66, size: 5.5, weight: 500, color: p.tag }),
      createImageElement({ x: 5, y: 18.5, w: 22, h: 28, shape: 'rounded', radius: 1.5 }),
      createTextElement({ text: '{name}', x: 31, y: 19, w: 50, size: 13, weight: 700, color: p.ink, fit: true }),
      createTextElement({ text: '{designation}', x: 31, y: 26, w: 50, size: 8.5, weight: 500, color: p.main }),
      createTextElement({ text: 'ID: {idno}\nDept: {department}\nPhone: {phone}', x: 31, y: 33, w: 50, size: 7.5, color: p.sub }),
      createRectElement({ x: 0, y: 51, w: W, h: 3, fill: p.acc })
    );
  } else if (n === 'campus') {
    f.push(
      createRectElement({ x: 0, y: 0, w: 28, h: 54, fill: p.main }),
      createImageElement({ x: 3, y: 8, w: 22, h: 22, shape: 'circle', border: 0.8, borderColor: '#ffffff' }),
      createTextElement({ text: '{idno}', x: 1, y: 34, w: 26, size: 8, weight: 700, color: '#ffffff', align: 'center', fit: true }),
      createTextElement({ text: 'Valid: {valid}', x: 1, y: 41, w: 26, size: 6, color: p.tag, align: 'center' }),
      createImageElement({ src: 'logo', x: 33, y: 5, w: 8, h: 8, fit: 'contain', radius: 0 }),
      createTextElement({ text: '{org}', x: 43, y: 6, w: 38, size: 9, weight: 700, color: p.main, fit: true }),
      createTextElement({ text: p.label, x: 43, y: 11, w: 38, size: 5.5, weight: 600, color: p.acc }),
      createTextElement({ text: '{name}', x: 33, y: 20, w: 48, size: 13, weight: 700, color: p.ink, fit: true }),
      createTextElement({ text: '{designation}', x: 33, y: 27, w: 48, size: 8.5, weight: 500, color: p.sub }),
      createTextElement({ text: '{department}\nPhone: {phone}\nBlood: {blood}', x: 33, y: 33.5, w: 48, size: 7.5, color: p.sub }),
      createRectElement({ x: 28, y: 51, w: W - 28, h: 3, fill: p.acc })
    );
  } else {
    f.push(
      createRectElement({ x: 0, y: 0, w: 3, h: 54, fill: p.acc }),
      createImageElement({ x: 9, y: 8, w: 24, h: 30, radius: 0, shape: 'rect' }),
      createTextElement({ text: '{org}', x: 38, y: 8, w: 42, size: 6.5, weight: 600, color: p.acc, fit: true }),
      createTextElement({ text: '{name}', x: 38, y: 13, w: 42, size: 13, weight: 700, color: p.ink, fit: true }),
      createTextElement({ text: '{designation}', x: 38, y: 20.5, w: 42, size: 8.5, color: p.sub }),
      createTextElement({ text: 'ID: {idno}\nPhone: {phone}\nValid: {valid}', x: 38, y: 29, w: 42, size: 7.5, color: p.ink }),
      createRectElement({ x: 9, y: 44, w: 70, h: 0.25, fill: p.ink }),
      createTextElement({ text: p.label, x: 9, y: 46, w: 70, size: 5.5, weight: 600, color: p.sub })
    );
  }

  b.push(
    createRectElement({ x: 0, y: 0, w: W, h: 8, fill: n === 'minimal' ? p.acc : p.main }),
    createTextElement({ text: 'If found, please return to:', x: 5, y: 11, w: 75, size: 7, weight: 700, color: p.ink }),
    createTextElement({ text: '{org}\n{address}', x: 5, y: 16, w: 75, size: 7.5, color: p.sub }),
    createTextElement({ text: 'Blood Group: {blood}\nDOB: {dob}\nValid Till: {valid}', x: 5, y: 28, w: 75, size: 7.5, color: p.ink }),
    createRectElement({ x: 5, y: 44, w: 28, h: 0.25, fill: p.ink }),
    createTextElement({ text: 'Authorised Signatory', x: 5, y: 45.2, w: 40, size: 6, color: p.sub }),
    createRectElement({ x: 0, y: 51, w: W, h: 3, fill: p.acc })
  );

  return { front: f, back: b };
}

export function makePortraitTemplate(n: 'corporate' | 'campus' | 'minimal') {
  const p = PALETTES[n];
  const W = 54;
  const f: CardElement[] = [];
  const b: CardElement[] = [];

  if (n === 'corporate') {
    f.push(
      createRectElement({ x: 0, y: 0, w: W, h: 20, fill: p.main }),
      createImageElement({ src: 'logo', x: 4, y: 4, w: 9, h: 9, fit: 'contain', radius: 0 }),
      createTextElement({ text: '{org}', x: 15, y: 4.2, w: 35, size: 9, weight: 700, color: '#ffffff', fit: true }),
      createTextElement({ text: p.label, x: 15, y: 9.4, w: 35, size: 5.2, weight: 500, color: p.tag }),
      createImageElement({ x: 12, y: 24, w: 30, h: 36, shape: 'rounded', radius: 2 }),
      createTextElement({ text: '{name}', x: 4, y: 63, w: 46, size: 12, weight: 700, color: p.ink, align: 'center', fit: true }),
      createTextElement({ text: '{designation}', x: 4, y: 69.5, w: 46, size: 8, weight: 500, color: p.main, align: 'center', fit: true }),
      createTextElement({ text: 'ID: {idno} • {department}', x: 4, y: 75, w: 46, size: 7.5, color: p.sub, align: 'center' }),
      createRectElement({ x: 0, y: 82.6, w: W, h: 3, fill: p.acc })
    );
  } else if (n === 'campus') {
    f.push(
      createRectElement({ x: 0, y: 0, w: W, h: 34, fill: p.main }),
      createImageElement({ src: 'logo', x: 4, y: 4, w: 8, h: 8, fit: 'contain', radius: 0 }),
      createTextElement({ text: '{org}', x: 14, y: 5, w: 36, size: 8.5, weight: 700, color: '#ffffff', fit: true }),
      createImageElement({ x: 14, y: 17, w: 26, h: 26, shape: 'circle', border: 1, borderColor: '#ffffff' }),
      createTextElement({ text: '{name}', x: 4, y: 47, w: 46, size: 12, weight: 700, color: p.ink, align: 'center', fit: true }),
      createTextElement({ text: '{designation}', x: 4, y: 53.5, w: 46, size: 8, weight: 500, color: p.sub, align: 'center', fit: true }),
      createTextElement({ text: p.label, x: 4, y: 61, w: 46, size: 6, weight: 600, color: p.acc, align: 'center' }),
      createTextElement({ text: 'ID: {idno}\nPhone: {phone}', x: 4, y: 66, w: 46, size: 7.5, color: p.sub, align: 'center' }),
      createRectElement({ x: 0, y: 82.6, w: W, h: 3, fill: p.acc })
    );
  } else {
    f.push(
      createRectElement({ x: 0, y: 0, w: W, h: 3, fill: p.acc }),
      createTextElement({ text: '{org}', x: 7, y: 8, w: 40, size: 7, weight: 600, color: p.acc, fit: true }),
      createImageElement({ x: 9, y: 15, w: 36, h: 42, radius: 0, shape: 'rect' }),
      createTextElement({ text: '{name}', x: 7, y: 61, w: 40, size: 12.5, weight: 700, color: p.ink, fit: true }),
      createTextElement({ text: '{designation}', x: 7, y: 67.5, w: 40, size: 8.5, color: p.sub, fit: true }),
      createRectElement({ x: 7, y: 74, w: 40, h: 0.25, fill: p.ink }),
      createTextElement({ text: 'ID: {idno} • {valid}', x: 7, y: 76, w: 40, size: 7, color: p.ink, fit: true })
    );
  }

  b.push(
    createRectElement({ x: 0, y: 0, w: W, h: 8, fill: n === 'minimal' ? p.acc : p.main }),
    createTextElement({ text: 'If found, please return to:', x: 5, y: 12, w: 44, size: 7, weight: 700, color: p.ink }),
    createTextElement({ text: '{org}\n{address}', x: 5, y: 17, w: 44, size: 7.5, color: p.sub }),
    createTextElement({ text: 'Blood Group: {blood}\nDOB: {dob}\nValid: {valid}', x: 5, y: 40, w: 44, size: 7.5, color: p.ink }),
    createRectElement({ x: 5, y: 70, w: 30, h: 0.25, fill: p.ink }),
    createTextElement({ text: 'Authorised Signatory', x: 5, y: 71.2, w: 44, size: 6, color: p.sub }),
    createRectElement({ x: 0, y: 82.6, w: W, h: 3, fill: p.acc })
  );

  return { front: f, back: b };
}

export function buildTemplate(n: 'corporate' | 'campus' | 'minimal', W: number, H: number) {
  const isPortrait = H > W;
  const base = isPortrait ? makePortraitTemplate(n) : makeLandscapeTemplate(n);
  const bw = isPortrait ? 54 : 85.6;
  const bh = isPortrait ? 85.6 : 54;
  const sx = W / bw;
  const sy = H / bh;
  const ss = Math.min(sx, sy);

  const scaleElements = (els: CardElement[]) =>
    els.map(el => {
      const copy = { ...el, x: el.x * sx, y: el.y * sy, w: el.w * sx, h: el.h * sy };
      if (copy.type === 'text') {
        (copy as TextElement).size = (copy as TextElement).size * ss;
      }
      return copy;
    });

  return {
    front: scaleElements(base.front),
    back: scaleElements(base.back),
  };
}

export async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image from ' + file.name));
    img.src = url;
  });
}

export async function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image from ' + url));
    img.src = url;
  });
}

// Supabase HRMS Integration
export async function fetchEmployeesForIdCards(organizationId?: string): Promise<IdCardPersonRecord[]> {
  try {
    let query = supabase
      .from('employees')
      .select('id, employee_code, first_name, last_name, email, phone, department, designation, blood_group, date_of_birth, avatar_url, current_address, organization_id')
      .eq('status', 'ACTIVE')
      .order('first_name', { ascending: true });

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      console.warn('Fallback to sample employees:', error?.message);
      return getSampleEmployees();
    }

    const mapped: IdCardPersonRecord[] = data.map(emp => {
      const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Employee';
      return {
        id: emp.id,
        name: fullName,
        designation: emp.designation || 'Staff Member',
        idno: emp.employee_code || `EMP-${emp.id.slice(0, 5).toUpperCase()}`,
        department: emp.department || 'Operations',
        phone: emp.phone || '+91 98765 43210',
        blood: emp.blood_group || 'O+',
        dob: emp.date_of_birth ? new Date(emp.date_of_birth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '01 Jan 1995',
        address: emp.current_address || 'HQ Corporate Campus, Coimbatore',
        valid: 'Dec 2028',
        org: 'JOY Corporate Solutions Pvt Ltd',
        avatar_url: emp.avatar_url,
        photo: emp.avatar_url ? `emp_${emp.id}.jpg` : '',
      };
    });

    // Try pre-caching avatar pictures
    mapped.forEach(rec => {
      if (rec.avatar_url) {
        loadImageFromUrl(rec.avatar_url)
          .then(img => {
            rec.__img = img;
          })
          .catch(() => {});
      }
    });

    return mapped;
  } catch (err) {
    console.error('fetchEmployeesForIdCards error:', err);
    return getSampleEmployees();
  }
}

export function getSampleEmployees(): IdCardPersonRecord[] {
  return [
    {
      id: 'demo-1',
      name: 'Aarav Menon',
      designation: 'Senior Lead Architect',
      idno: 'EMP-20418',
      department: 'Engineering & Product',
      phone: '+91 98765 43210',
      blood: 'B+',
      dob: '14 Mar 1992',
      address: 'Joy Tower, 12 Mill Road, Coimbatore 641001',
      valid: 'Dec 2028',
      org: 'JOY Corporate Solutions',
      photo: '',
    },
    {
      id: 'demo-2',
      name: 'Meera Krishnan',
      designation: 'VP People & Culture',
      idno: 'EMP-20533',
      department: 'Human Resources',
      phone: '+91 99440 11872',
      blood: 'O+',
      dob: '02 Nov 1988',
      address: 'Joy Tower, 12 Mill Road, Coimbatore 641001',
      valid: 'Dec 2028',
      org: 'JOY Corporate Solutions',
      photo: '',
    },
    {
      id: 'demo-3',
      name: 'Joseph Anthony Fernandes',
      designation: 'Operations Director',
      idno: 'EMP-20907',
      department: 'Enterprise Logistics',
      phone: '+91 90030 55621',
      blood: 'A-',
      dob: '29 Jul 1995',
      address: 'Joy Tower, 12 Mill Road, Coimbatore 641001',
      valid: 'Dec 2028',
      org: 'JOY Corporate Solutions',
      photo: '',
    },
  ];
}

export function parseDelimitedText(t: string): string[][] {
  t = t.replace(/^\uFEFF/, '');
  const first = t.split(/\r?\n/)[0] || '';
  const d = first.includes('\t') ? '\t' : first.split(';').length > first.split(',').length ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let q = false;

  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          q = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      q = true;
    } else if (c === d) {
      row.push(cur);
      cur = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      row.push(cur);
      rows.push(row);
      row = [];
      cur = '';
    } else {
      cur += c;
    }
  }
  if (cur !== '' || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

export function runPreflightChecks(
  sides: { front: CardSideData; back: CardSideData },
  records: IdCardPersonRecord[],
  geometry: CardGeometry,
  logoImg: HTMLImageElement | null,
  photosMap: Map<string, HTMLImageElement>
): { issues: PreflightIssue[]; fixCount: number; checkCount: number } {
  const issues: PreflightIssue[] = [];
  const add = (lv: 'ok' | 'check' | 'fix', t: string) => issues.push({ key: `gen_${issues.length}`, lv, t });

  if (geometry.bleed < 2) {
    add('check', `Bleed is ${geometry.bleed} mm. Most commercial card printers ask for 3.0 mm.`);
  } else {
    add('ok', `Bleed verified at ${geometry.bleed} mm across all card edges.`);
  }

  // Check card elements across records
  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = 400;
  sampleCanvas.height = 300;
  const cx = sampleCanvas.getContext('2d');

  if (cx) {
    for (const side of ['front', 'back'] as const) {
      const sideIssues: PreflightIssue[] = [];
      drawCardSide(cx, sides[side], records[0] || {}, geometry, 3, {
        logo: logoImg,
        photos: photosMap,
        collectIssues: sideIssues,
      });
      issues.push(...sideIssues);
    }
  }

  // Check photos
  const hasPhotoEl = Object.values(sides).some(s => s.els.some(e => e.type === 'image' && e.src === 'photo'));
  if (hasPhotoEl) {
    const missing = records.filter(r => !r.__img && (!r.photo || !photosMap.has(r.photo.toLowerCase())));
    if (missing.length > 0) {
      add('check', `${missing.length} employee card(s) have no photo attached. The photo area will print empty.`);
    } else {
      add('ok', 'Every employee card has an attached verified photo.');
    }
  }

  // Check logos
  const hasLogoEl = Object.values(sides).some(s => s.els.some(e => e.type === 'image' && e.src === 'logo'));
  if (hasLogoEl && !logoImg) {
    add('check', 'A company logo placeholder is present on the card, but no logo artwork is uploaded.');
  }

  const fixCount = issues.filter(i => i.lv === 'fix').length;
  const checkCount = issues.filter(i => i.lv === 'check').length;

  return { issues, fixCount, checkCount };
}

export async function exportCmykPdfFile(
  sides: { front: CardSideData; back: CardSideData },
  records: IdCardPersonRecord[],
  geometry: CardGeometry,
  options: {
    dpi: number;
    layout: 'card' | 'sheet';
    paper: string;
    sides: 'both' | 'front' | 'back';
    cropMarks: boolean;
    logo: HTMLImageElement | null;
    photos: Map<string, HTMLImageElement>;
    onProgress?: (progressPct: number, statusText: string) => void;
  }
): Promise<Blob> {
  const { dpi, layout, paper, sides: sideChoice, cropMarks: hasMarks, logo, photos, onProgress } = options;

  const targetSides: ('front' | 'back')[] =
    sideChoice === 'both' ? ['front', 'back'] : [sideChoice];
  const total = records.length * targetSides.length;
  let done = 0;

  const pdf = new IdCardPdf();
  const tw = geometry.w + 2 * geometry.bleed;
  const th = geometry.h + 2 * geometry.bleed;

  const tick = () => new Promise(res => setTimeout(res, 0));

  if (layout === 'card') {
    const slug = hasMarks ? geometry.bleed + 5 : geometry.bleed;
    const pw = geometry.w + 2 * slug;
    const ph = geometry.h + 2 * slug;

    for (const r of records) {
      for (const s of targetSides) {
        const item = await renderCmykItem(sides[s], r, geometry, dpi, logo, photos);
        done++;
        if (onProgress) {
          onProgress(Math.round((done / total) * 100), `Rendering card ${done} of ${total}…`);
        }

        pdf.page(
          pw,
          ph,
          { x: slug, y: slug, w: geometry.w, h: geometry.h },
          geometry.bleed,
          [{ ...item, x: slug - geometry.bleed, y: slug - geometry.bleed }],
          hasMarks
            ? cropMarks(slug, slug, slug + geometry.w, slug + geometry.h, geometry.bleed + 0.5, 3.5)
            : []
        );
        await tick();
      }
    }
  } else {
    // Sheet layout with duplex back-side mirroring
    const [PW, PH] = paper.split('x').map(Number);
    const gut = 6.5;
    const mrg = 8;
    const cols = Math.floor((PW - 2 * mrg + gut) / (tw + gut));
    const rows = Math.floor((PH - 2 * mrg + gut) / (th + gut));

    if (cols < 1 || rows < 1) {
      throw new Error('Card size is too large for the selected sheet paper. Select a larger sheet size (A3/SRA3) or 1 Card Per Page layout.');
    }

    const perPage = cols * rows;
    const gw = cols * tw + (cols - 1) * gut;
    const gh = rows * th + (rows - 1) * gut;
    const ox = (PW - gw) / 2;
    const oy = (PH - gh) / 2;

    for (let s0 = 0; s0 < records.length; s0 += perPage) {
      const chunk = records.slice(s0, s0 + perPage);

      for (const s of targetSides) {
        const items: any[] = [];
        const mk: [number, number, number, number][] = [];

        for (let i = 0; i < chunk.length; i++) {
          const item = await renderCmykItem(sides[s], chunk[i], geometry, dpi, logo, photos);
          done++;
          if (onProgress) {
            onProgress(Math.round((done / total) * 100), `Rendering sheet element ${done} of ${total}…`);
          }

          let c = i % cols;
          const rw = Math.floor(i / cols);

          // Mirror column index on the back side for precise duplex registration
          if (s === 'back' && targetSides.length === 2) {
            c = cols - 1 - c;
          }

          const x = ox + c * (tw + gut);
          const y = oy + rw * (th + gut);

          items.push({ ...item, x, y });

          if (hasMarks) {
            mk.push(
              ...cropMarks(
                x + geometry.bleed,
                y + geometry.bleed,
                x + geometry.bleed + geometry.w,
                y + geometry.bleed + geometry.h,
                geometry.bleed + 0.5,
                2.5
              )
            );
          }
          await tick();
        }

        pdf.page(PW, PH, null, geometry.bleed, items, mk);
      }
    }
  }

  return pdf.finish();
}

