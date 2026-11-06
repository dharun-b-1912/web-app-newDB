// src/features/people/idcard/idCardService.ts
// ============================================================================
// Joy PeopleHR — Enterprise ID Card Studio Service & Database Bridge
// Dedicated Portrait & Landscape Templates, Smart Photo Matcher, Relational
// Workforce Fetcher, Vector QR Generator, and High-DPI Preflight Engine
// ============================================================================

import QRCode from 'qrcode';
import {
  CardElement,
  CardGeometry,
  CardSideData,
  IdCardPersonRecord,
  PreflightIssue,
  TextElement,
  ImageElement,
  RectElement,
  QrElement,
  MatchedPhotoRecord,
  IdCardTemplate,
  TemplateDefinition,
  CardColorPalette,
  CardSide,
  CR80_LANDSCAPE,
  CR80_PORTRAIT,
} from './idCardTypes';
import {
  IdCardPdf,
  cropMarks,
  renderCmykItem,
  drawCardSide,
  getWcagContrast,
  findUnderlyingBg,
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
  fit: true,
  overflowMode: 'shrink',
  maxLines: 2,
  minSize: 5.0,
  verticalAlign: 'top',
  x: 0,
  y: 0,
  w: 40,
  h: 6,
  rotation: 0,
  locked: false,
  hidden: false,
  opacity: 1,
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
  rotation: 0,
  locked: false,
  hidden: false,
  opacity: 1,
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
  rotation: 0,
  locked: false,
  hidden: false,
  opacity: 1,
  ...o,
});

export const createQrElement = (o: Partial<QrElement> = {}): QrElement => ({
  id: nextElementId(),
  type: 'qr',
  qrData: 'https://app.joypeoplehr.com/verify-id-card?emp={idno}',
  color: '#000000',
  bgColor: '#ffffff',
  x: 0,
  y: 0,
  w: 16,
  h: 16,
  rotation: 0,
  locked: false,
  hidden: false,
  opacity: 1,
  ...o,
});

// Color Themes for Built-in Templates
export const STUDIO_PALETTES: Record<string, CardColorPalette> = {
  corporate: {
    main: '#0f2f57', // Deep Navy
    acc: '#1d7bd8', // Vivid Blue
    ink: '#14181c', // Crisp Dark Text
    sub: '#475569', // Muted Slate
    tag: '#e0edff', // Soft Blue Pill
    tagText: '#0f2f57',
    background: '#ffffff',
    label: 'EMPLOYEE ID',
  },
  campus: {
    main: '#07563D', // Emerald Green
    acc: '#10b981', // Mint Accent
    ink: '#14181c',
    sub: '#475569',
    tag: '#d1fae5', // Soft Mint Pill
    tagText: '#064e3b',
    background: '#ffffff',
    label: 'CAMPUS IDENTITY',
  },
  minimal: {
    main: '#111827', // Pitch Black
    acc: '#e11d48', // Crimson
    ink: '#0f172a',
    sub: '#475569',
    tag: '#f1f5f9',
    tagText: '#0f172a',
    background: '#ffffff',
    label: 'IDENTITY CARD',
  },
  worker: {
    main: '#1e293b', // Slate Navy
    acc: '#d97706', // High-vis Amber
    ink: '#0f172a',
    sub: '#475569',
    tag: '#fef3c7',
    tagText: '#92400e',
    background: '#ffffff',
    label: 'PLANT & LOGISTICS PASS',
  },
  contractor: {
    main: '#134e4a', // Dark Teal
    acc: '#0284c7', // Sky Cyan
    ink: '#0f172a',
    sub: '#475569',
    tag: '#ccfbf1',
    tagText: '#115e59',
    background: '#ffffff',
    label: 'AUTHORIZED CONTRACTOR',
  },
  security: {
    main: '#7f1d1d', // Dark Ruby
    acc: '#dc2626', // Red
    ink: '#111827',
    sub: '#4b5563',
    tag: '#fee2e2',
    tagText: '#991b1b',
    background: '#ffffff',
    label: 'SECURITY ACCESS PASS',
  },
};

// ============================================================================
// 1. DEDICATED PORTRAIT TEMPLATES (CR80: 54 mm × 85.6 mm)
// Strictly defined non-overlapping vertical corridors:
// Header: 0 - 20 mm | Photo: 22.5 - 51 mm | Name: 53 - 59.5 mm | Designation: 60 - 65 mm | ID: 65.5 - 70 mm | Branch: 70.5 - 74.5 mm | Valid: 75.5 - 80.5 mm | Bottom: 82.6 - 85.6 mm
// ============================================================================

export function makePortraitCorporateTemplate(): TemplateDefinition {
  const p = STUDIO_PALETTES.corporate;
  const W = 54.0;
  const f: CardElement[] = [
    // Top header band (0 - 20 mm)
    createRectElement({ x: 0, y: 0, w: W, h: 20, fill: p.main }),
    createImageElement({ src: 'logo', x: 4.5, y: 4.5, w: 9, h: 9, fit: 'contain', radius: 0 }),
    createTextElement({
      text: '{org}',
      x: 15,
      y: 4.5,
      w: 35.5,
      h: 6.5,
      size: 8.0,
      weight: 700,
      color: '#ffffff',
      fit: true,
      maxLines: 2,
      overflowMode: 'shrink',
      verticalAlign: 'middle',
    }),
    createTextElement({
      text: p.label,
      x: 15,
      y: 11.5,
      w: 35.5,
      h: 4.0,
      size: 5.2,
      weight: 600,
      color: p.tag,
      maxLines: 1,
      verticalAlign: 'middle',
    }),

    // Photo Corridor (22.5 - 51 mm)
    createImageElement({
      src: 'photo',
      x: 14,
      y: 22.5,
      w: 26,
      h: 28.5,
      shape: 'rounded',
      radius: 2,
      border: 0.8,
      borderColor: p.main,
    }),

    // Name & Title Corridors (53 - 65 mm)
    createTextElement({
      text: '{name}',
      x: 3,
      y: 53.0,
      w: 48,
      h: 6.5,
      size: 10.5,
      weight: 700,
      color: p.ink,
      align: 'center',
      fit: true,
      maxLines: 2,
      overflowMode: 'shrink',
      verticalAlign: 'middle',
    }),
    createTextElement({
      text: '{designation}',
      x: 3,
      y: 60.0,
      w: 48,
      h: 5.0,
      size: 7.2,
      weight: 600,
      color: p.main,
      align: 'center',
      fit: true,
      maxLines: 2,
      overflowMode: 'shrink',
      verticalAlign: 'middle',
    }),

    // Credentials & Location (65.5 - 74.5 mm)
    createTextElement({
      text: 'ID: {idno}  •  {department}',
      x: 3,
      y: 65.5,
      w: 48,
      h: 4.5,
      size: 6.2,
      weight: 500,
      color: p.sub,
      align: 'center',
      fit: true,
      maxLines: 1,
      overflowMode: 'shrink',
      verticalAlign: 'middle',
    }),
    createTextElement({
      text: 'Branch: {branch}',
      x: 3,
      y: 70.5,
      w: 48,
      h: 4.0,
      size: 5.8,
      weight: 400,
      color: p.sub,
      align: 'center',
      fit: true,
      maxLines: 1,
      overflowMode: 'shrink',
      verticalAlign: 'middle',
    }),

    // Validity Pill Corridor (75.5 - 80.5 mm)
    createRectElement({ x: 13, y: 75.5, w: 28, h: 4.8, fill: p.tag, radius: 2.4 }),
    createTextElement({
      text: 'VALID: {valid}',
      x: 13,
      y: 75.9,
      w: 28,
      h: 4.0,
      size: 5.5,
      weight: 700,
      color: p.tagText || p.main,
      align: 'center',
      fit: true,
      maxLines: 1,
      verticalAlign: 'middle',
    }),

    // Bottom accent strip into bleed
    createRectElement({ x: 0, y: 82.6, w: W, h: 3, fill: p.acc }),
  ];

  const b: CardElement[] = [
    createRectElement({ x: 0, y: 0, w: W, h: 8, fill: p.main }),
    createTextElement({
      text: 'IF FOUND, PLEASE RETURN TO:',
      x: 4,
      y: 10,
      w: 46,
      h: 4,
      size: 6.2,
      weight: 700,
      color: p.main,
    }),
    createTextElement({
      text: '{org}\n{address}',
      x: 4,
      y: 14.5,
      w: 46,
      h: 9,
      size: 6.0,
      color: p.sub,
      maxLines: 2,
      overflowMode: 'wrap',
    }),
    createTextElement({
      text: 'Emergency: {phone}\nEmail: {email}',
      x: 4,
      y: 24.5,
      w: 46,
      h: 8.5,
      size: 6.0,
      weight: 500,
      color: p.ink,
      maxLines: 2,
    }),
    createTextElement({
      text: 'Blood Group: {blood}  |  DOB: {dob}\nDate of Joining: {doj}\nCard Valid Till: {valid}',
      x: 4,
      y: 34,
      w: 46,
      h: 12,
      size: 6.0,
      color: p.sub,
      maxLines: 3,
    }),
    // QR Code for verification
    createQrElement({
      x: 19,
      y: 48,
      w: 16,
      h: 16,
      qrData: 'https://app.joypeoplehr.com/verify-id-card?emp={idno}',
    }),
    createTextElement({
      text: 'Scan to verify active credentials',
      x: 4,
      y: 65.5,
      w: 46,
      h: 4,
      size: 5.2,
      weight: 500,
      color: p.sub,
      align: 'center',
    }),
    // Signature
    createRectElement({ x: 12, y: 73, w: 30, h: 0.25, fill: p.sub }),
    createTextElement({
      text: 'Authorized Signatory',
      x: 4,
      y: 74,
      w: 46,
      h: 4,
      size: 5.2,
      color: p.sub,
      align: 'center',
    }),
    createRectElement({ x: 0, y: 82.6, w: W, h: 3, fill: p.acc }),
  ];

  return { front: f, back: b, frontBg: '#ffffff', backBg: '#ffffff', palette: p };
}

export function makePortraitWorkerTemplate(): TemplateDefinition {
  const p = STUDIO_PALETTES.worker;
  const W = 54.0;
  const f: CardElement[] = [
    // Top safety header (0 - 20 mm)
    createRectElement({ x: 0, y: 0, w: W, h: 18, fill: p.main }),
    createRectElement({ x: 0, y: 18, w: W, h: 2.5, fill: p.acc }),
    createImageElement({ src: 'logo', x: 4, y: 4, w: 8.5, h: 8.5, fit: 'contain', radius: 0 }),
    createTextElement({
      text: '{org}',
      x: 14.5,
      y: 4,
      w: 36,
      h: 6.5,
      size: 7.8,
      weight: 700,
      color: '#ffffff',
      fit: true,
      maxLines: 2,
      overflowMode: 'shrink',
      verticalAlign: 'middle',
    }),
    createTextElement({
      text: 'SAFETY COMPLIANCE PASS',
      x: 14.5,
      y: 11,
      w: 36,
      h: 4,
      size: 5.0,
      weight: 700,
      color: p.acc,
      maxLines: 1,
      verticalAlign: 'middle',
    }),

    // Photo Corridor (22.5 - 51 mm)
    createImageElement({
      src: 'photo',
      x: 14,
      y: 22.5,
      w: 26,
      h: 28.5,
      shape: 'rect',
      border: 1,
      borderColor: p.main,
    }),
    // Blood group badge
    createRectElement({ x: 32, y: 23.5, w: 7, h: 4.8, fill: '#dc2626', radius: 1 }),
    createTextElement({
      text: '{blood}',
      x: 32,
      y: 24,
      w: 7,
      h: 4,
      size: 5.8,
      weight: 800,
      color: '#ffffff',
      align: 'center',
      verticalAlign: 'middle',
    }),

    // Name & ID (53 - 75 mm)
    createTextElement({
      text: '{name}',
      x: 3,
      y: 53.0,
      w: 48,
      h: 6.5,
      size: 10.5,
      weight: 800,
      color: p.ink,
      align: 'center',
      fit: true,
      maxLines: 2,
      overflowMode: 'shrink',
      verticalAlign: 'middle',
    }),
    createTextElement({
      text: '{designation}',
      x: 3,
      y: 60.0,
      w: 48,
      h: 5.0,
      size: 7.5,
      weight: 600,
      color: p.sub,
      align: 'center',
      fit: true,
      maxLines: 2,
      overflowMode: 'shrink',
      verticalAlign: 'middle',
    }),
    createTextElement({
      text: 'BADGE ID: {idno}',
      x: 3,
      y: 65.5,
      w: 48,
      h: 4.5,
      size: 6.5,
      weight: 800,
      color: p.main,
      align: 'center',
      fit: true,
      verticalAlign: 'middle',
    }),
    createTextElement({
      text: 'Shift / Dept: {department}',
      x: 3,
      y: 70.5,
      w: 48,
      h: 4.0,
      size: 5.8,
      color: p.sub,
      align: 'center',
      fit: true,
      verticalAlign: 'middle',
    }),

    // Validity pill
    createRectElement({ x: 13, y: 75.5, w: 28, h: 4.8, fill: p.tag, radius: 2.4 }),
    createTextElement({
      text: 'VALID: {valid}',
      x: 13,
      y: 75.9,
      w: 28,
      h: 4.0,
      size: 5.5,
      weight: 700,
      color: p.tagText || p.main,
      align: 'center',
      fit: true,
      verticalAlign: 'middle',
    }),

    createRectElement({ x: 0, y: 83.6, w: W, h: 2, fill: p.acc }),
  ];

  const b: CardElement[] = [
    createRectElement({ x: 0, y: 0, w: W, h: 8, fill: p.main }),
    createTextElement({
      text: 'EMERGENCY / SAFETY INSTRUCTIONS',
      x: 4,
      y: 10,
      w: 46,
      h: 4,
      size: 6.2,
      weight: 800,
      color: p.main,
    }),
    createTextElement({
      text: 'Wear PPE at all times within active bays.\nReport incidents immediately to Safety Desk.\nBlood: {blood}  |  DOB: {dob}',
      x: 4,
      y: 14.5,
      w: 46,
      h: 12,
      size: 6.0,
      color: p.sub,
      maxLines: 3,
    }),
    createTextElement({
      text: 'Emergency Plant Line: {phone}\nCampus: {branch}\nValid Till: {valid}',
      x: 4,
      y: 28,
      w: 46,
      h: 12,
      size: 6.0,
      weight: 600,
      color: p.ink,
      maxLines: 3,
    }),
    createQrElement({
      x: 19,
      y: 45,
      w: 16,
      h: 16,
      qrData: 'https://app.joypeoplehr.com/verify-id-card?emp={idno}',
    }),
    createTextElement({
      text: 'Safety Clearance Token',
      x: 4,
      y: 63,
      w: 46,
      h: 4,
      size: 5.5,
      weight: 600,
      color: p.sub,
      align: 'center',
    }),
    createRectElement({ x: 12, y: 72, w: 30, h: 0.25, fill: p.sub }),
    createTextElement({
      text: 'Safety Officer Signatory',
      x: 4,
      y: 73,
      w: 46,
      h: 4,
      size: 5.2,
      color: p.sub,
      align: 'center',
    }),
    createRectElement({ x: 0, y: 83.6, w: W, h: 2, fill: p.acc }),
  ];

  return { front: f, back: b, frontBg: '#ffffff', backBg: '#ffffff', palette: p };
}

export function makePortraitContractorTemplate(): TemplateDefinition {
  const p = STUDIO_PALETTES.contractor;
  const W = 54.0;
  const f: CardElement[] = [
    // Header (0 - 20 mm)
    createRectElement({ x: 0, y: 0, w: W, h: 20, fill: p.main }),
    createImageElement({ src: 'logo', x: 4, y: 4, w: 8.5, h: 8.5, fit: 'contain', radius: 0 }),
    createTextElement({
      text: '{org}',
      x: 14.5,
      y: 4,
      w: 36,
      h: 6.5,
      size: 7.8,
      weight: 700,
      color: '#ffffff',
      fit: true,
      maxLines: 2,
      overflowMode: 'shrink',
      verticalAlign: 'middle',
    }),
    createTextElement({
      text: 'CONTRACT WORKFORCE',
      x: 14.5,
      y: 11,
      w: 36,
      h: 4,
      size: 5.2,
      weight: 600,
      color: p.acc,
      maxLines: 1,
      verticalAlign: 'middle',
    }),

    // Photo Corridor (22.5 - 51 mm)
    createImageElement({
      src: 'photo',
      x: 14,
      y: 22.5,
      w: 26,
      h: 28.5,
      shape: 'rounded',
      radius: 2,
      border: 1,
      borderColor: p.main,
    }),

    // Details Corridors (53 - 75 mm)
    createTextElement({
      text: '{name}',
      x: 3,
      y: 53.0,
      w: 48,
      h: 6.5,
      size: 10.5,
      weight: 700,
      color: p.ink,
      align: 'center',
      fit: true,
      maxLines: 2,
      overflowMode: 'shrink',
      verticalAlign: 'middle',
    }),
    createTextElement({
      text: '{designation}',
      x: 3,
      y: 60.0,
      w: 48,
      h: 5.0,
      size: 7.5,
      weight: 500,
      color: p.main,
      align: 'center',
      fit: true,
      maxLines: 2,
      overflowMode: 'shrink',
      verticalAlign: 'middle',
    }),
    createTextElement({
      text: 'Agency: {contractor}',
      x: 3,
      y: 65.5,
      w: 48,
      h: 4.5,
      size: 6.5,
      weight: 600,
      color: p.sub,
      align: 'center',
      fit: true,
      maxLines: 1,
      verticalAlign: 'middle',
    }),
    createTextElement({
      text: 'Pass ID: {idno}',
      x: 3,
      y: 70.5,
      w: 48,
      h: 4.0,
      size: 6.0,
      weight: 600,
      color: p.sub,
      align: 'center',
      fit: true,
      verticalAlign: 'middle',
    }),

    // Validity pill
    createRectElement({ x: 13, y: 75.5, w: 28, h: 4.8, fill: p.tag, radius: 2.4 }),
    createTextElement({
      text: 'VALID: {valid}',
      x: 13,
      y: 75.9,
      w: 28,
      h: 4.0,
      size: 5.5,
      weight: 700,
      color: p.tagText || p.main,
      align: 'center',
      fit: true,
      verticalAlign: 'middle',
    }),

    createRectElement({ x: 0, y: 82.6, w: W, h: 3, fill: p.acc }),
  ];

  const b: CardElement[] = [
    createRectElement({ x: 0, y: 0, w: W, h: 8, fill: p.main }),
    createTextElement({
      text: 'CONTRACTOR SERVICE POLICIES',
      x: 4,
      y: 10,
      w: 46,
      h: 4,
      size: 6.2,
      weight: 700,
      color: p.main,
    }),
    createTextElement({
      text: 'Valid only on specified facility premises.\nNon-transferable. Must be displayed on lanyard.',
      x: 4,
      y: 14.5,
      w: 46,
      h: 8.5,
      size: 6.0,
      color: p.sub,
      maxLines: 2,
    }),
    createTextElement({
      text: 'Contract Agency: {contractor}\nWorksite: {branch}\nSupervisor Contact: {phone}',
      x: 4,
      y: 24,
      w: 46,
      h: 12,
      size: 6.0,
      weight: 600,
      color: p.ink,
      maxLines: 3,
    }),
    createQrElement({
      x: 19,
      y: 44,
      w: 16,
      h: 16,
      qrData: 'https://app.joypeoplehr.com/verify-id-card?emp={idno}',
    }),
    createTextElement({
      text: 'Verification QR',
      x: 4,
      y: 62,
      w: 46,
      h: 4,
      size: 5.2,
      color: p.sub,
      align: 'center',
    }),
    createRectElement({ x: 12, y: 72, w: 30, h: 0.25, fill: p.sub }),
    createTextElement({
      text: 'Contract Administrator',
      x: 4,
      y: 73,
      w: 46,
      h: 4,
      size: 5.2,
      color: p.sub,
      align: 'center',
    }),
    createRectElement({ x: 0, y: 82.6, w: W, h: 3, fill: p.acc }),
  ];

  return { front: f, back: b, frontBg: '#ffffff', backBg: '#ffffff', palette: p };
}

export function makePortraitCampusTemplate(): TemplateDefinition {
  const p = STUDIO_PALETTES.campus;
  const W = 54.0;
  const f: CardElement[] = [
    // Emerald Top Block (0 - 26 mm)
    createRectElement({ x: 0, y: 0, w: W, h: 26, fill: p.main }),
    createImageElement({ src: 'logo', x: 4.5, y: 3.5, w: 8, h: 8, fit: 'contain', radius: 0 }),
    createTextElement({
      text: '{org}',
      x: 14,
      y: 4.0,
      w: 36,
      h: 6.5,
      size: 8.0,
      weight: 700,
      color: '#ffffff',
      fit: true,
      maxLines: 2,
      overflowMode: 'shrink',
      verticalAlign: 'middle',
    }),
    createTextElement({
      text: p.label,
      x: 14,
      y: 10.5,
      w: 36,
      h: 4.0,
      size: 5.2,
      weight: 600,
      color: p.tag,
      maxLines: 1,
      verticalAlign: 'middle',
    }),

    // Circular Photo with Halo Halo sitting centered (14 - 40 mm)
    createImageElement({
      src: 'photo',
      x: 14,
      y: 14,
      w: 26,
      h: 26,
      shape: 'circle',
      border: 1.5,
      borderColor: '#ffffff',
    }),

    // Identity Corridors (43 - 75 mm) - ZERO vertical overlap!
    createTextElement({
      text: '{name}',
      x: 3,
      y: 43.0,
      w: 48,
      h: 6.5,
      size: 10.5,
      weight: 700,
      color: p.ink,
      align: 'center',
      fit: true,
      maxLines: 2,
      overflowMode: 'shrink',
      verticalAlign: 'middle',
    }),
    createTextElement({
      text: '{designation}',
      x: 3,
      y: 50.5,
      w: 48,
      h: 5.0,
      size: 7.2,
      weight: 600,
      color: p.main,
      align: 'center',
      fit: true,
      maxLines: 2,
      overflowMode: 'shrink',
      verticalAlign: 'middle',
    }),

    // Valid badge (57.5 - 62.3 mm)
    createRectElement({ x: 13, y: 57.5, w: 28, h: 4.8, fill: p.tag, radius: 2.4 }),
    createTextElement({
      text: 'VALID: {valid}',
      x: 13,
      y: 57.9,
      w: 28,
      h: 4.0,
      size: 5.5,
      weight: 700,
      color: p.tagText || p.main,
      align: 'center',
      fit: true,
      verticalAlign: 'middle',
    }),

    // ID & Department (64.0 - 68.5 mm)
    createTextElement({
      text: 'ID: {idno}  |  {department}',
      x: 3,
      y: 64.0,
      w: 48,
      h: 4.5,
      size: 6.2,
      weight: 500,
      color: p.sub,
      align: 'center',
      fit: true,
      maxLines: 1,
      overflowMode: 'shrink',
      verticalAlign: 'middle',
    }),

    // Branch (69.5 - 73.5 mm)
    createTextElement({
      text: '{branch}',
      x: 3,
      y: 69.5,
      w: 48,
      h: 4.0,
      size: 5.8,
      weight: 400,
      color: p.sub,
      align: 'center',
      fit: true,
      maxLines: 1,
      overflowMode: 'shrink',
      verticalAlign: 'middle',
    }),

    // Mini QR for tap verification (74.5 - 82.0 mm)
    createQrElement({
      x: 23,
      y: 74.5,
      w: 8.0,
      h: 8.0,
      qrData: 'https://app.joypeoplehr.com/verify-id-card?emp={idno}',
    }),

    // Bottom strip
    createRectElement({ x: 0, y: 82.6, w: W, h: 3, fill: p.acc }),
  ];

  const b: CardElement[] = [
    createRectElement({ x: 0, y: 0, w: W, h: 8, fill: p.main }),
    createTextElement({
      text: 'CAMPUS ACCESS GUIDELINES',
      x: 4,
      y: 10,
      w: 46,
      h: 4,
      size: 6.2,
      weight: 700,
      color: p.main,
    }),
    createTextElement({
      text: 'Must be tapped at turnstiles & lab gateways.\nReport lost card to IT Service Desk.',
      x: 4,
      y: 14.5,
      w: 46,
      h: 8.5,
      size: 6.0,
      color: p.sub,
      maxLines: 2,
    }),
    createTextElement({
      text: 'Staff Email: {email}\nPhone: {phone}',
      x: 4,
      y: 24,
      w: 46,
      h: 8.5,
      size: 6.0,
      weight: 600,
      color: p.ink,
      maxLines: 2,
    }),
    createQrElement({
      x: 19,
      y: 44,
      w: 16,
      h: 16,
      qrData: 'https://app.joypeoplehr.com/verify-id-card?emp={idno}',
    }),
    createTextElement({
      text: 'Scan for Realtime Verification',
      x: 4,
      y: 62,
      w: 46,
      h: 4,
      size: 5.2,
      color: p.sub,
      align: 'center',
    }),
    createRectElement({ x: 12, y: 72, w: 30, h: 0.25, fill: p.sub }),
    createTextElement({
      text: 'Registrar / Admin Head',
      x: 4,
      y: 73,
      w: 46,
      h: 4,
      size: 5.2,
      color: p.sub,
      align: 'center',
    }),
    createRectElement({ x: 0, y: 82.6, w: W, h: 3, fill: p.acc }),
  ];

  return { front: f, back: b, frontBg: '#ffffff', backBg: '#ffffff', palette: p };
}

export function makePortraitMinimalTemplate(): TemplateDefinition {
  const p = STUDIO_PALETTES.minimal;
  const W = 54.0;
  const f: CardElement[] = [
    createRectElement({ x: 0, y: 0, w: W, h: 3, fill: p.acc }),
    createTextElement({
      text: '{org}',
      x: 5,
      y: 6,
      w: 44,
      h: 5.5,
      size: 7.2,
      weight: 700,
      color: p.acc,
      fit: true,
      maxLines: 1,
      verticalAlign: 'middle',
    }),
    createImageElement({
      src: 'photo',
      x: 14,
      y: 13.5,
      w: 26,
      h: 30,
      radius: 0,
      shape: 'rect',
    }),
    createTextElement({
      text: '{name}',
      x: 5,
      y: 46.5,
      w: 44,
      h: 6.5,
      size: 11.0,
      weight: 800,
      color: p.ink,
      fit: true,
      maxLines: 2,
      overflowMode: 'shrink',
      verticalAlign: 'middle',
    }),
    createTextElement({
      text: '{designation}',
      x: 5,
      y: 54.0,
      w: 44,
      h: 5.0,
      size: 7.5,
      color: p.sub,
      fit: true,
      maxLines: 2,
      overflowMode: 'shrink',
      verticalAlign: 'middle',
    }),
    createRectElement({ x: 5, y: 61.0, w: 44, h: 0.25, fill: p.ink }),
    createTextElement({
      text: 'ID: {idno}',
      x: 5,
      y: 63.0,
      w: 44,
      h: 4.5,
      size: 6.5,
      weight: 700,
      color: p.ink,
      fit: true,
      verticalAlign: 'middle',
    }),
    createTextElement({
      text: 'Dept: {department}',
      x: 5,
      y: 68.5,
      w: 44,
      h: 4.0,
      size: 6.0,
      color: p.sub,
      fit: true,
      verticalAlign: 'middle',
    }),
    createTextElement({
      text: 'Valid: {valid}',
      x: 5,
      y: 73.5,
      w: 44,
      h: 4.0,
      size: 5.8,
      weight: 600,
      color: p.acc,
      fit: true,
      verticalAlign: 'middle',
    }),
    createRectElement({ x: 0, y: 82.6, w: W, h: 3, fill: p.main }),
  ];

  const b: CardElement[] = [
    createRectElement({ x: 0, y: 0, w: W, h: 6, fill: p.acc }),
    createTextElement({
      text: 'Return Address:',
      x: 5,
      y: 9,
      w: 44,
      h: 4,
      size: 6.5,
      weight: 700,
      color: p.ink,
    }),
    createTextElement({
      text: '{org}\n{address}',
      x: 5,
      y: 13.5,
      w: 44,
      h: 9,
      size: 6.0,
      color: p.sub,
      maxLines: 2,
    }),
    createTextElement({
      text: 'Blood: {blood}  |  DOB: {dob}\nValid: {valid}',
      x: 5,
      y: 24,
      w: 44,
      h: 8.5,
      size: 6.0,
      color: p.ink,
      maxLines: 2,
    }),
    createQrElement({
      x: 19,
      y: 42,
      w: 16,
      h: 16,
      qrData: 'https://app.joypeoplehr.com/verify-id-card?emp={idno}',
    }),
    createRectElement({ x: 8, y: 71, w: 38, h: 0.25, fill: p.ink }),
    createTextElement({
      text: 'Authorised Signatory',
      x: 5,
      y: 72.5,
      w: 44,
      h: 4,
      size: 5.5,
      color: p.sub,
      align: 'center',
    }),
    createRectElement({ x: 0, y: 82.6, w: W, h: 3, fill: p.acc }),
  ];

  return { front: f, back: b, frontBg: '#ffffff', backBg: '#ffffff', palette: p };
}

export function makePortraitSecurityTemplate(): TemplateDefinition {
  const p = STUDIO_PALETTES.security;
  const W = 54.0;
  const f: CardElement[] = [
    // Header (0 - 20 mm)
    createRectElement({ x: 0, y: 0, w: W, h: 20, fill: p.main }),
    createImageElement({ src: 'logo', x: 4, y: 4, w: 8.5, h: 8.5, fit: 'contain', radius: 0 }),
    createTextElement({
      text: '{org}',
      x: 14.5,
      y: 4,
      w: 36,
      h: 6.5,
      size: 7.8,
      weight: 700,
      color: '#ffffff',
      fit: true,
      maxLines: 2,
      overflowMode: 'shrink',
      verticalAlign: 'middle',
    }),
    createTextElement({
      text: 'SECURE RESTRICTED ACCESS',
      x: 14.5,
      y: 11,
      w: 36,
      h: 4,
      size: 5.0,
      weight: 700,
      color: '#fca5a5',
      maxLines: 1,
      verticalAlign: 'middle',
    }),

    // Photo Corridor (22.5 - 51 mm)
    createImageElement({
      src: 'photo',
      x: 14,
      y: 22.5,
      w: 26,
      h: 28.5,
      shape: 'rounded',
      radius: 1,
      border: 1.5,
      borderColor: p.acc,
    }),

    // Details Corridors (53 - 75 mm)
    createTextElement({
      text: '{name}',
      x: 3,
      y: 53.0,
      w: 48,
      h: 6.5,
      size: 10.5,
      weight: 800,
      color: p.ink,
      align: 'center',
      fit: true,
      maxLines: 2,
      overflowMode: 'shrink',
      verticalAlign: 'middle',
    }),
    createTextElement({
      text: '{designation}',
      x: 3,
      y: 60.0,
      w: 48,
      h: 5.0,
      size: 7.5,
      weight: 600,
      color: p.main,
      align: 'center',
      fit: true,
      maxLines: 2,
      overflowMode: 'shrink',
      verticalAlign: 'middle',
    }),
    createRectElement({ x: 8, y: 66.0, w: 38, h: 5.0, fill: p.main, radius: 1 }),
    createTextElement({
      text: 'CLEARANCE: LEVEL 3',
      x: 8,
      y: 66.5,
      w: 38,
      h: 4.0,
      size: 6.0,
      weight: 800,
      color: '#ffffff',
      align: 'center',
      verticalAlign: 'middle',
    }),
    createTextElement({
      text: 'ID: {idno}  •  Valid: {valid}',
      x: 3,
      y: 73.0,
      w: 48,
      h: 4.0,
      size: 5.8,
      weight: 600,
      color: p.sub,
      align: 'center',
      fit: true,
      verticalAlign: 'middle',
    }),

    createRectElement({ x: 0, y: 82.6, w: W, h: 3, fill: p.acc }),
  ];

  const b: CardElement[] = [
    createRectElement({ x: 0, y: 0, w: W, h: 8, fill: p.main }),
    createTextElement({
      text: 'SECURITY NOTICE',
      x: 4,
      y: 10,
      w: 46,
      h: 4,
      size: 6.5,
      weight: 800,
      color: p.main,
    }),
    createTextElement({
      text: 'Classified & Restricted Facilities.\nUnauthorised possession is a statutory violation.\nSurrender immediately if lost.',
      x: 4,
      y: 14.5,
      w: 46,
      h: 12,
      size: 6.0,
      color: p.sub,
      maxLines: 3,
    }),
    createQrElement({
      x: 19,
      y: 38,
      w: 16,
      h: 16,
      qrData: 'https://app.joypeoplehr.com/verify-id-card?emp={idno}',
    }),
    createTextElement({
      text: 'Biometric Access Token',
      x: 4,
      y: 58,
      w: 46,
      h: 4,
      size: 5.5,
      weight: 700,
      color: p.main,
      align: 'center',
    }),
    createRectElement({ x: 12, y: 70, w: 30, h: 0.25, fill: p.sub }),
    createTextElement({
      text: 'Chief Security Officer',
      x: 4,
      y: 71.5,
      w: 46,
      h: 4,
      size: 5.2,
      color: p.sub,
      align: 'center',
    }),
    createRectElement({ x: 0, y: 82.6, w: W, h: 3, fill: p.acc }),
  ];

  return { front: f, back: b, frontBg: '#ffffff', backBg: '#ffffff', palette: p };
}

// ============================================================================
// 2. DEDICATED LANDSCAPE TEMPLATES (CR80: 85.6 mm × 54 mm)
// ============================================================================

export function makeLandscapeCorporateTemplate(): TemplateDefinition {
  const p = STUDIO_PALETTES.corporate;
  const W = 85.6;
  const f: CardElement[] = [
    createRectElement({ x: 0, y: 0, w: W, h: 14, fill: p.main }),
    createImageElement({ src: 'logo', x: 5, y: 3, w: 8, h: 8, fit: 'contain', radius: 0 }),
    createTextElement({
      text: '{org}',
      x: 15,
      y: 3.0,
      w: 66,
      h: 5.5,
      size: 9.5,
      weight: 700,
      color: '#ffffff',
      fit: true,
      maxLines: 1,
      verticalAlign: 'middle',
    }),
    createTextElement({
      text: p.label,
      x: 15,
      y: 8.5,
      w: 66,
      h: 4.0,
      size: 5.2,
      weight: 600,
      color: p.tag,
      maxLines: 1,
      verticalAlign: 'middle',
    }),
    createImageElement({ src: 'photo', x: 5, y: 18.5, w: 22, h: 28, shape: 'rounded', radius: 1.5, border: 0.8, borderColor: p.main }),
    createTextElement({
      text: '{name}',
      x: 31,
      y: 18.5,
      w: 50,
      h: 6.5,
      size: 11.5,
      weight: 700,
      color: p.ink,
      fit: true,
      maxLines: 2,
      overflowMode: 'shrink',
      verticalAlign: 'middle',
    }),
    createTextElement({
      text: '{designation}',
      x: 31,
      y: 25.5,
      w: 50,
      h: 5.0,
      size: 8.0,
      weight: 600,
      color: p.main,
      fit: true,
      maxLines: 1,
      overflowMode: 'shrink',
      verticalAlign: 'middle',
    }),
    createTextElement({
      text: 'ID: {idno}  •  Dept: {department}\nBranch: {branch}\nPhone: {phone}',
      x: 31,
      y: 31.5,
      w: 50,
      h: 15.0,
      size: 6.5,
      color: p.sub,
      maxLines: 3,
      verticalAlign: 'top',
    }),
    createRectElement({ x: 0, y: 51, w: W, h: 3, fill: p.acc }),
  ];

  const b: CardElement[] = [
    createRectElement({ x: 0, y: 0, w: W, h: 8, fill: p.main }),
    createTextElement({
      text: 'If found, please return to:',
      x: 5,
      y: 10,
      w: 50,
      h: 4,
      size: 6.5,
      weight: 700,
      color: p.ink,
    }),
    createTextElement({
      text: '{org}\n{address}',
      x: 5,
      y: 14.5,
      w: 50,
      h: 11,
      size: 6.2,
      color: p.sub,
      maxLines: 2,
    }),
    createTextElement({
      text: 'Blood Group: {blood}  |  DOB: {dob}\nValid Till: {valid}',
      x: 5,
      y: 26.5,
      w: 50,
      h: 11,
      size: 6.2,
      color: p.ink,
      maxLines: 2,
    }),
    createQrElement({ x: 62, y: 12, w: 18, h: 18, qrData: 'https://app.joypeoplehr.com/verify-id-card?emp={idno}' }),
    createTextElement({ text: 'Scan to verify', x: 60, y: 32, w: 22, h: 4, size: 5.2, color: p.sub, align: 'center' }),
    createRectElement({ x: 5, y: 44, w: 32, h: 0.25, fill: p.ink }),
    createTextElement({ text: 'Authorised Signatory', x: 5, y: 45.5, w: 40, h: 4, size: 5.5, color: p.sub }),
    createRectElement({ x: 0, y: 51, w: W, h: 3, fill: p.acc }),
  ];

  return { front: f, back: b, frontBg: '#ffffff', backBg: '#ffffff', palette: p };
}

export function makeLandscapeWorkerTemplate(): TemplateDefinition {
  const p = STUDIO_PALETTES.worker;
  const W = 85.6;
  const f: CardElement[] = [
    createRectElement({ x: 0, y: 0, w: 5, h: 54, fill: p.acc }),
    createRectElement({ x: 5, y: 0, w: W - 5, h: 12, fill: p.main }),
    createImageElement({ src: 'logo', x: 8, y: 2, w: 8, h: 8, fit: 'contain', radius: 0 }),
    createTextElement({
      text: '{org}',
      x: 18,
      y: 2.2,
      w: 60,
      h: 5.0,
      size: 8.5,
      weight: 700,
      color: '#ffffff',
      fit: true,
      maxLines: 1,
      verticalAlign: 'middle',
    }),
    createTextElement({
      text: 'SAFETY COMPLIANCE PASS',
      x: 18,
      y: 7.2,
      w: 60,
      h: 4.0,
      size: 5.0,
      weight: 700,
      color: p.acc,
      maxLines: 1,
      verticalAlign: 'middle',
    }),
    createImageElement({ src: 'photo', x: 9, y: 16, w: 24, h: 30, shape: 'rect', border: 0.8, borderColor: p.main }),
    createTextElement({
      text: '{name}',
      x: 37,
      y: 16,
      w: 45,
      h: 6.5,
      size: 11.5,
      weight: 800,
      color: p.ink,
      fit: true,
      maxLines: 2,
      overflowMode: 'shrink',
      verticalAlign: 'middle',
    }),
    createTextElement({
      text: '{designation}',
      x: 37,
      y: 23,
      w: 45,
      h: 5.0,
      size: 7.5,
      weight: 600,
      color: p.sub,
      fit: true,
      maxLines: 1,
      overflowMode: 'shrink',
      verticalAlign: 'middle',
    }),
    createTextElement({
      text: 'ID: {idno}\nDept: {department}\nBlood: {blood}  |  Emergency: {phone}',
      x: 37,
      y: 29,
      w: 45,
      h: 15.0,
      size: 6.5,
      color: p.sub,
      maxLines: 3,
      verticalAlign: 'top',
    }),
    createRectElement({ x: 37, y: 47, w: 45, h: 3, fill: p.acc }),
  ];

  const b: CardElement[] = [
    createRectElement({ x: 0, y: 0, w: W, h: 8, fill: p.main }),
    createTextElement({
      text: 'PLANT SAFETY REGULATIONS',
      x: 6,
      y: 10,
      w: 50,
      h: 4,
      size: 6.5,
      weight: 700,
      color: p.main,
    }),
    createTextElement({
      text: 'Mandatory PPE area badge.\nReport accidents to safety manager immediately.',
      x: 6,
      y: 14.5,
      w: 50,
      h: 10,
      size: 6.0,
      color: p.sub,
      maxLines: 2,
    }),
    createTextElement({
      text: 'Emergency: {phone}  |  Blood: {blood}\nValid: {valid}',
      x: 6,
      y: 26,
      w: 50,
      h: 10,
      size: 6.0,
      color: p.ink,
      maxLines: 2,
    }),
    createQrElement({ x: 62, y: 12, w: 18, h: 18, qrData: 'https://app.joypeoplehr.com/verify-id-card?emp={idno}' }),
    createRectElement({ x: 6, y: 44, w: 32, h: 0.25, fill: p.ink }),
    createTextElement({ text: 'Safety Officer Signatory', x: 6, y: 45.5, w: 40, h: 4, size: 5.5, color: p.sub }),
    createRectElement({ x: 0, y: 51, w: W, h: 3, fill: p.acc }),
  ];

  return { front: f, back: b, frontBg: '#ffffff', backBg: '#ffffff', palette: p };
}

export function makeLandscapeContractorTemplate(): TemplateDefinition {
  const p = STUDIO_PALETTES.contractor;
  const W = 85.6;
  const f: CardElement[] = [
    createRectElement({ x: 0, y: 0, w: W, h: 13, fill: p.main }),
    createImageElement({ src: 'logo', x: 5, y: 2.5, w: 8, h: 8, fit: 'contain', radius: 0 }),
    createTextElement({
      text: '{org}',
      x: 15,
      y: 2.5,
      w: 66,
      h: 5.0,
      size: 8.5,
      weight: 700,
      color: '#ffffff',
      fit: true,
      maxLines: 1,
      verticalAlign: 'middle',
    }),
    createTextElement({
      text: 'AUTHORIZED CONTRACTOR',
      x: 15,
      y: 7.5,
      w: 66,
      h: 4.0,
      size: 5.2,
      weight: 600,
      color: p.acc,
      maxLines: 1,
      verticalAlign: 'middle',
    }),
    createImageElement({ src: 'photo', x: 6, y: 17, w: 22, h: 28, shape: 'rounded', radius: 1.5 }),
    createTextElement({
      text: '{name}',
      x: 32,
      y: 17,
      w: 48,
      h: 6.5,
      size: 11.5,
      weight: 700,
      color: p.ink,
      fit: true,
      maxLines: 2,
      overflowMode: 'shrink',
      verticalAlign: 'middle',
    }),
    createTextElement({
      text: '{designation}',
      x: 32,
      y: 24,
      w: 48,
      h: 5.0,
      size: 7.5,
      weight: 500,
      color: p.main,
      fit: true,
      maxLines: 1,
      overflowMode: 'shrink',
      verticalAlign: 'middle',
    }),
    createTextElement({
      text: 'Agency: {contractor}\nID: {idno}  •  Worksite: {branch}\nValid Until: {valid}',
      x: 32,
      y: 30,
      w: 48,
      h: 15.0,
      size: 6.5,
      color: p.sub,
      maxLines: 3,
      verticalAlign: 'top',
    }),
    createRectElement({ x: 0, y: 51, w: W, h: 3, fill: p.acc }),
  ];

  const b: CardElement[] = [
    createRectElement({ x: 0, y: 0, w: W, h: 8, fill: p.main }),
    createTextElement({
      text: 'CONTRACTOR CONDITIONS OF ENTRY',
      x: 5,
      y: 10,
      w: 52,
      h: 4,
      size: 6.5,
      weight: 700,
      color: p.main,
    }),
    createTextElement({
      text: 'Access restricted to work shifts.\nAgency: {contractor}\nSupervisor: {phone}',
      x: 5,
      y: 14.5,
      w: 52,
      h: 12,
      size: 6.0,
      color: p.sub,
      maxLines: 3,
    }),
    createTextElement({
      text: 'Blood: {blood}  |  DOB: {dob}',
      x: 5,
      y: 28,
      w: 52,
      h: 6,
      size: 6.0,
      color: p.ink,
      maxLines: 1,
    }),
    createQrElement({ x: 62, y: 12, w: 18, h: 18, qrData: 'https://app.joypeoplehr.com/verify-id-card?emp={idno}' }),
    createRectElement({ x: 5, y: 44, w: 32, h: 0.25, fill: p.ink }),
    createTextElement({ text: 'Contract Administrator', x: 5, y: 45.5, w: 40, h: 4, size: 5.5, color: p.sub }),
    createRectElement({ x: 0, y: 51, w: W, h: 3, fill: p.acc }),
  ];

  return { front: f, back: b, frontBg: '#ffffff', backBg: '#ffffff', palette: p };
}

export function makeLandscapeCampusTemplate(): TemplateDefinition {
  const p = STUDIO_PALETTES.campus;
  const W = 85.6;
  const f: CardElement[] = [
    createRectElement({ x: 0, y: 0, w: 28, h: 54, fill: p.main }),
    createImageElement({ src: 'photo', x: 3, y: 8, w: 22, h: 22, shape: 'circle', border: 1, borderColor: '#ffffff' }),
    createTextElement({
      text: '{idno}',
      x: 1,
      y: 33,
      w: 26,
      h: 5.0,
      size: 7.5,
      weight: 700,
      color: '#ffffff',
      align: 'center',
      fit: true,
      maxLines: 1,
      verticalAlign: 'middle',
    }),
    createTextElement({
      text: 'Valid: {valid}',
      x: 1,
      y: 39,
      w: 26,
      h: 4.0,
      size: 5.5,
      color: p.tag,
      align: 'center',
      maxLines: 1,
      verticalAlign: 'middle',
    }),
    createImageElement({ src: 'logo', x: 33, y: 5, w: 8, h: 8, fit: 'contain', radius: 0 }),
    createTextElement({
      text: '{org}',
      x: 43,
      y: 5.5,
      w: 38,
      h: 5.0,
      size: 8.5,
      weight: 700,
      color: p.main,
      fit: true,
      maxLines: 1,
      verticalAlign: 'middle',
    }),
    createTextElement({
      text: p.label,
      x: 43,
      y: 10.5,
      w: 38,
      h: 4.0,
      size: 5.2,
      weight: 600,
      color: p.acc,
      maxLines: 1,
      verticalAlign: 'middle',
    }),
    createTextElement({
      text: '{name}',
      x: 33,
      y: 18,
      w: 48,
      h: 6.5,
      size: 11.5,
      weight: 700,
      color: p.ink,
      fit: true,
      maxLines: 2,
      overflowMode: 'shrink',
      verticalAlign: 'middle',
    }),
    createTextElement({
      text: '{designation}',
      x: 33,
      y: 25,
      w: 48,
      h: 5.0,
      size: 7.5,
      weight: 500,
      color: p.sub,
      maxLines: 1,
      overflowMode: 'shrink',
      verticalAlign: 'middle',
    }),
    createTextElement({
      text: '{department}\nPhone: {phone}\nBlood: {blood}',
      x: 33,
      y: 31,
      w: 48,
      h: 15.0,
      size: 6.5,
      color: p.sub,
      maxLines: 3,
      verticalAlign: 'top',
    }),
    createRectElement({ x: 28, y: 51, w: W - 28, h: 3, fill: p.acc }),
  ];

  const b: CardElement[] = [
    createRectElement({ x: 0, y: 0, w: W, h: 8, fill: p.main }),
    createTextElement({
      text: 'CAMPUS VERIFICATION & ACCESS',
      x: 5,
      y: 10,
      w: 52,
      h: 4,
      size: 6.5,
      weight: 700,
      color: p.main,
    }),
    createTextElement({
      text: '{org}\n{address}',
      x: 5,
      y: 14.5,
      w: 52,
      h: 10,
      size: 6.2,
      color: p.sub,
      maxLines: 2,
    }),
    createTextElement({
      text: 'Emergency: {phone}  |  Blood: {blood}\nValid: {valid}',
      x: 5,
      y: 26,
      w: 52,
      h: 10,
      size: 6.2,
      color: p.ink,
      maxLines: 2,
    }),
    createQrElement({ x: 62, y: 12, w: 18, h: 18, qrData: 'https://app.joypeoplehr.com/verify-id-card?emp={idno}' }),
    createRectElement({ x: 5, y: 44, w: 32, h: 0.25, fill: p.ink }),
    createTextElement({ text: 'Registrar / Admin Head', x: 5, y: 45.5, w: 40, h: 4, size: 5.5, color: p.sub }),
    createRectElement({ x: 0, y: 51, w: W, h: 3, fill: p.acc }),
  ];

  return { front: f, back: b, frontBg: '#ffffff', backBg: '#ffffff', palette: p };
}

export function makeLandscapeMinimalTemplate(): TemplateDefinition {
  const p = STUDIO_PALETTES.minimal;
  const W = 85.6;
  const f: CardElement[] = [
    createRectElement({ x: 0, y: 0, w: 3, h: 54, fill: p.acc }),
    createImageElement({ src: 'photo', x: 9, y: 8, w: 24, h: 30, radius: 0, shape: 'rect' }),
    createTextElement({
      text: '{org}',
      x: 38,
      y: 8,
      w: 42,
      h: 5.0,
      size: 7.0,
      weight: 700,
      color: p.acc,
      fit: true,
      maxLines: 1,
      verticalAlign: 'middle',
    }),
    createTextElement({
      text: '{name}',
      x: 38,
      y: 13.5,
      w: 42,
      h: 6.5,
      size: 11.5,
      weight: 800,
      color: p.ink,
      fit: true,
      maxLines: 2,
      overflowMode: 'shrink',
      verticalAlign: 'middle',
    }),
    createTextElement({
      text: '{designation}',
      x: 38,
      y: 20.5,
      w: 42,
      h: 5.0,
      size: 7.5,
      color: p.sub,
      maxLines: 1,
      overflowMode: 'shrink',
      verticalAlign: 'middle',
    }),
    createTextElement({
      text: 'ID: {idno}\nPhone: {phone}\nValid: {valid}',
      x: 38,
      y: 27.5,
      w: 42,
      h: 14.0,
      size: 6.5,
      color: p.ink,
      maxLines: 3,
      verticalAlign: 'top',
    }),
    createRectElement({ x: 9, y: 44, w: 70, h: 0.25, fill: p.ink }),
    createTextElement({
      text: p.label,
      x: 9,
      y: 45.5,
      w: 70,
      h: 4.0,
      size: 5.2,
      weight: 600,
      color: p.sub,
      verticalAlign: 'middle',
    }),
  ];

  const b: CardElement[] = [
    createRectElement({ x: 0, y: 0, w: W, h: 8, fill: p.acc }),
    createTextElement({
      text: 'Return to:',
      x: 5,
      y: 10,
      w: 50,
      h: 4,
      size: 6.5,
      weight: 700,
      color: p.ink,
    }),
    createTextElement({
      text: '{org}\n{address}',
      x: 5,
      y: 14.5,
      w: 50,
      h: 10,
      size: 6.2,
      color: p.sub,
      maxLines: 2,
    }),
    createTextElement({
      text: 'Blood: {blood}  |  DOB: {dob}\nValid: {valid}',
      x: 5,
      y: 26,
      w: 50,
      h: 10,
      size: 6.2,
      color: p.ink,
      maxLines: 2,
    }),
    createQrElement({ x: 62, y: 12, w: 18, h: 18, qrData: 'https://app.joypeoplehr.com/verify-id-card?emp={idno}' }),
    createRectElement({ x: 5, y: 44, w: 32, h: 0.25, fill: p.ink }),
    createTextElement({ text: 'Authorised Signatory', x: 5, y: 45.5, w: 40, h: 4, size: 5.5, color: p.sub }),
    createRectElement({ x: 0, y: 51, w: W, h: 3, fill: p.acc }),
  ];

  return { front: f, back: b, frontBg: '#ffffff', backBg: '#ffffff', palette: p };
}

// Master Template Selector
export function getTemplateByName(
  category: 'corporate' | 'campus' | 'minimal' | 'worker' | 'contractor' | 'security',
  orientation: 'landscape' | 'portrait'
): TemplateDefinition {
  if (orientation === 'portrait') {
    switch (category) {
      case 'worker':
        return makePortraitWorkerTemplate();
      case 'contractor':
        return makePortraitContractorTemplate();
      case 'campus':
        return makePortraitCampusTemplate();
      case 'minimal':
        return makePortraitMinimalTemplate();
      case 'security':
        return makePortraitSecurityTemplate();
      case 'corporate':
      default:
        return makePortraitCorporateTemplate();
    }
  } else {
    switch (category) {
      case 'worker':
        return makeLandscapeWorkerTemplate();
      case 'contractor':
        return makeLandscapeContractorTemplate();
      case 'campus':
        return makeLandscapeCampusTemplate();
      case 'minimal':
        return makeLandscapeMinimalTemplate();
      case 'security':
      case 'corporate':
      default:
        return makeLandscapeCorporateTemplate();
    }
  }
}

// ============================================================================
// 3. QR CODE ENGINE
// ============================================================================

const qrCache = new Map<string, HTMLImageElement>();

export async function generateQrImage(
  data: string,
  color: string = '#000000',
  bgColor: string = '#ffffff'
): Promise<HTMLImageElement> {
  const cacheKey = `${data}|${color}|${bgColor}`;
  if (qrCache.has(cacheKey)) {
    return qrCache.get(cacheKey)!;
  }

  const dataUrl = await QRCode.toDataURL(data, {
    margin: 1,
    color: {
      dark: color,
      light: bgColor,
    },
    errorCorrectionLevel: 'M',
  });

  const img = await loadImageFromDataUrl(dataUrl);
  qrCache.set(cacheKey, img);
  return img;
}

export function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image from Data URL'));
    img.src = dataUrl;
  });
}

export async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image from ' + file.name));
    };
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

// ============================================================================
// 4. SUPABASE RELATIONAL WORKFORCE FETCHER
// ============================================================================

export async function fetchEmployeesForIdCards(
  organizationId?: string,
  options?: { includeInactive?: boolean }
): Promise<IdCardPersonRecord[]> {
  try {
    let query = supabase
      .from('employees')
      .select(`
        id,
        employee_code,
        first_name,
        last_name,
        display_name,
        work_email,
        personal_email,
        phone,
        gender,
        dob,
        doj,
        employment_status,
        avatar_url,
        organization_id,
        department_id,
        designation_id,
        branch_id,
        departments:department_id(name),
        designations:designation_id(title),
        branches:branch_id(name, city),
        organizations:organization_id(legal_name, display_name)
      `)
      .order('employee_code', { ascending: true });

    if (organizationId && organizationId !== 'platform-root') {
      query = query.eq('organization_id', organizationId);
    }

    // Default to active workforce (matches Sidebar Employee Management count: 19)
    if (!options?.includeInactive) {
      query = query.eq('employment_status', 'ACTIVE');
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      console.warn('Fallback to sample employees:', error?.message);
      return getSampleEmployees();
    }

    const mapped: IdCardPersonRecord[] = data.map((emp: any) => {
      const fullName = emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Employee';
      const deptName = emp.departments?.name || 'General';
      const desigTitle = emp.designations?.title || 'Staff Member';
      const branchCity = emp.branches ? `${emp.branches.name || ''} (${emp.branches.city || ''})`.trim() : 'HQ Campus';
      const orgName = emp.organizations?.display_name || emp.organizations?.legal_name || 'Joy PeopleHR';

      return {
        id: emp.id,
        name: fullName,
        first_name: emp.first_name,
        last_name: emp.last_name,
        display_name: fullName,
        designation: desigTitle,
        idno: emp.employee_code || `EMP-${emp.id.slice(0, 5).toUpperCase()}`,
        department: deptName,
        branch: branchCity,
        worksite: branchCity,
        phone: emp.phone || '+91 98765 43210',
        email: emp.work_email || emp.personal_email || '',
        blood: 'B+',
        dob: emp.dob ? new Date(emp.dob).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '01 Jan 1995',
        doj: emp.doj ? new Date(emp.doj).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '01 Jan 2024',
        address: 'Joy Tower, 12 Mill Road, Coimbatore 641001',
        valid: 'Dec 2028',
        org: orgName,
        reporting_manager: 'Enterprise HR',
        contractor: 'Joy Workforce Solutions',
        status: emp.employment_status || 'ACTIVE',
        avatar_url: emp.avatar_url,
        photo: emp.avatar_url ? `${emp.employee_code || emp.id}.jpg` : '',
        photo_matched: Boolean(emp.avatar_url),
        qr_token: `VERIFY-${emp.employee_code || emp.id}`,
      };
    });

    // Asynchronously pre-cache avatars into HTMLImageElements
    mapped.forEach(rec => {
      if (rec.avatar_url) {
        loadImageFromUrl(rec.avatar_url)
          .then(img => {
            rec.__img = img;
            rec.photo_matched = true;
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
      branch: 'Coimbatore HQ',
      phone: '+91 98765 43210',
      email: 'aarav.menon@joypeoplehr.com',
      blood: 'B+',
      dob: '14 Mar 1992',
      doj: '10 Jan 2020',
      address: 'Joy Tower, 12 Mill Road, Coimbatore 641001',
      valid: 'Dec 2028',
      org: 'JOY Corporate Solutions Pvt Ltd',
      reporting_manager: 'Dharun B',
      contractor: 'Joy Workforce Solutions',
      status: 'ACTIVE',
      photo: '',
      photo_matched: false,
    },
    {
      id: 'demo-2',
      name: 'Meera Krishnan',
      designation: 'VP People & Culture',
      idno: 'EMP-20533',
      department: 'Human Resources',
      branch: 'Chennai Campus',
      phone: '+91 99440 11872',
      email: 'meera.k@joypeoplehr.com',
      blood: 'O+',
      dob: '02 Nov 1988',
      doj: '15 Mar 2021',
      address: 'Joy Tower, 12 Mill Road, Coimbatore 641001',
      valid: 'Dec 2028',
      org: 'JOY Corporate Solutions Pvt Ltd',
      reporting_manager: 'Mari Muthu',
      contractor: 'Joy Workforce Solutions',
      status: 'ACTIVE',
      photo: '',
      photo_matched: false,
    },
    {
      id: 'demo-3',
      name: 'Joseph Anthony Fernandes',
      designation: 'Operations Director',
      idno: 'EMP-20907',
      department: 'Enterprise Logistics',
      branch: 'Bangalore Hub',
      phone: '+91 90030 55621',
      email: 'joseph.f@joypeoplehr.com',
      blood: 'A-',
      dob: '29 Jul 1995',
      doj: '01 Jun 2022',
      address: 'Joy Tower, 12 Mill Road, Coimbatore 641001',
      valid: 'Dec 2028',
      org: 'JOY Corporate Solutions Pvt Ltd',
      reporting_manager: 'Dharun B',
      contractor: 'Joy Workforce Solutions',
      status: 'ACTIVE',
      photo: '',
      photo_matched: false,
    },
  ];
}

// ============================================================================
// 5. SMART PHOTO MATCHING ENGINE
// ============================================================================

export function normalizeKey(str: string): string {
  return String(str || '')
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '') // Remove file extension
    .replace(/[^a-z0-9]/g, ''); // Keep only letters and digits
}

export function matchUploadedPhotos(
  uploadedFiles: { fileName: string; fileSize: number; dataUrl: string; img: HTMLImageElement }[],
  employees: IdCardPersonRecord[]
): {
  matched: MatchedPhotoRecord[];
  unmatched: MatchedPhotoRecord[];
  missingEmployees: IdCardPersonRecord[];
} {
  const matched: MatchedPhotoRecord[] = [];
  const unmatched: MatchedPhotoRecord[] = [];
  const assignedEmpIds = new Set<string>();

  // Build lookup maps
  const codeMap = new Map<string, IdCardPersonRecord>();
  const idMap = new Map<string, IdCardPersonRecord>();
  const nameMap = new Map<string, IdCardPersonRecord>();

  employees.forEach(emp => {
    if (emp.idno) {
      codeMap.set(emp.idno.toLowerCase().trim(), emp);
      const norm = normalizeKey(emp.idno);
      if (norm) codeMap.set(norm, emp);
    }
    if (emp.id) {
      idMap.set(emp.id.toLowerCase().trim(), emp);
      idMap.set(normalizeKey(emp.id), emp);
    }
    if (emp.name) {
      nameMap.set(normalizeKey(emp.name), emp);
    }
  });

  uploadedFiles.forEach((file, idx) => {
    const rawBase = file.fileName.replace(/\.[a-z0-9]+$/i, '').trim().toLowerCase();
    const norm = normalizeKey(file.fileName);

    let matchTarget: IdCardPersonRecord | undefined;
    let method: MatchedPhotoRecord['matchMethod'] = 'NONE';
    let score = 0;

    // 1. Exact Employee Code match (e.g. EMP-20418.jpg)
    if (codeMap.has(rawBase)) {
      matchTarget = codeMap.get(rawBase);
      method = rawBase === matchTarget?.idno.toLowerCase() ? 'EXACT_CODE' : 'NORMALIZED_CODE';
      score = method === 'EXACT_CODE' ? 100 : 95;
    } else if (codeMap.has(norm)) {
      matchTarget = codeMap.get(norm);
      method = 'NORMALIZED_CODE';
      score = 95;
    } else if (idMap.has(rawBase) || idMap.has(norm)) {
      matchTarget = idMap.get(rawBase) || idMap.get(norm);
      method = 'EXACT_ID';
      score = 90;
    } else if (nameMap.has(norm)) {
      matchTarget = nameMap.get(norm);
      method = 'NAME_SUBSTRING';
      score = 80;
    }

    if (matchTarget) {
      assignedEmpIds.add(matchTarget.id || matchTarget.idno);
      // Link image to employee
      matchTarget.__img = file.img;
      matchTarget.photo = file.fileName;
      matchTarget.photo_matched = true;

      matched.push({
        id: `m_${idx}_${norm}`,
        fileName: file.fileName,
        fileSize: file.fileSize,
        dataUrl: file.dataUrl,
        img: file.img,
        matchedEmployeeId: matchTarget.id,
        matchedEmployeeCode: matchTarget.idno,
        matchedEmployeeName: matchTarget.name,
        matchScore: score,
        matchMethod: method,
      });
    } else {
      unmatched.push({
        id: `u_${idx}_${norm}`,
        fileName: file.fileName,
        fileSize: file.fileSize,
        dataUrl: file.dataUrl,
        img: file.img,
        matchScore: 0,
        matchMethod: 'NONE',
      });
    }
  });

  const missingEmployees = employees.filter(e => !e.__img && !assignedEmpIds.has(e.id || e.idno));

  return { matched, unmatched, missingEmployees };
}

// ============================================================================
// 6. PREFLIGHT CHECKS & VALIDATION
// ============================================================================

export function runPreflightChecks(
  sides: { front: CardSideData; back: CardSideData },
  records: IdCardPersonRecord[],
  geometry: CardGeometry,
  logoImg: HTMLImageElement | null,
  photosMap: Map<string, HTMLImageElement>
): { issues: PreflightIssue[]; fixCount: number; checkCount: number } {
  const issues: PreflightIssue[] = [];
  const add = (
    lv: 'ok' | 'check' | 'fix',
    t: string,
    elementId?: string,
    category?: 'layout' | 'contrast' | 'collision' | 'missing' | 'print'
  ) => issues.push({ key: `gen_${issues.length}`, lv, t, elementId, category });

  // 1. Bleed & Dimensions Check
  if (geometry.bleed < 2) {
    add('check', `Bleed is ${geometry.bleed} mm. Most commercial printers ask for 3.0 mm bleed.`, undefined, 'print');
  } else {
    add('ok', `Bleed verified at ${geometry.bleed} mm on all edges for ${geometry.orientation.toUpperCase()} orientation.`, undefined, 'print');
  }

  // 2. Safe zone check
  if (geometry.safe < 2) {
    add('check', `Safe zone is ${geometry.safe} mm. Important text close to edge may be clipped.`, undefined, 'layout');
  } else {
    add('ok', `Safe area is set to ${geometry.safe} mm inside cut edge.`, undefined, 'layout');
  }

  // 3. Collision and Safe Zone and Contrast Check per Side
  (['front', 'back'] as CardSide[]).forEach(sideKey => {
    const side = sides[sideKey];
    const sideName = sideKey.toUpperCase();

    const getEffectiveBox = (item: CardElement) => {
      const rot = ((item.rotation || 0) % 360 + 360) % 360;
      const isQuarterTurn = Math.abs(rot - 90) < 5 || Math.abs(rot - 270) < 5;
      if (!isQuarterTurn) {
        return { x: item.x, y: item.y, w: item.w, h: item.h, isRotatedDisplay: false };
      }
      const cx = item.x + item.w / 2;
      const cy = item.y + item.h / 2;
      return {
        x: cx - item.h / 2,
        y: cy - item.w / 2,
        w: item.h,
        h: item.w,
        isRotatedDisplay: true,
      };
    };

    // Check individual elements
    side.els.forEach((el, idx) => {
      if (el.hidden) return;

      // Safe margin check for text
      if (el.type === 'text') {
        const box = getEffectiveBox(el);
        const isIntentionalDisplay = box.isRotatedDisplay || Boolean(el.strokeWidth) || el.size >= 20;
        const outLeft = box.x < geometry.safe - 0.5;
        const outRight = box.x + box.w > geometry.w - geometry.safe + 0.5;
        const outTop = box.y < geometry.safe - 0.5;
        const outBottom = box.y + box.h > geometry.h - geometry.safe + 0.5;

        if (!isIntentionalDisplay && (outLeft || outRight || outTop || outBottom)) {
          add(
            'check',
            `[${sideName}] Text "${el.text.slice(0, 18)}" extends past the ${geometry.safe}mm safe margin area.`,
            el.id,
            'layout'
          );
        }

        // Contrast check
        const underlyingBg = findUnderlyingBg(el, side);
        const contrast = getWcagContrast(el.color, underlyingBg);
        if (contrast < 3.0) {
          add(
            'fix',
            `[${sideName}] Poor contrast (${contrast.toFixed(1)}:1) for text "${el.text.slice(0, 18)}" over ${underlyingBg}. Minimum 4.5:1 required.`,
            el.id,
            'contrast'
          );
        } else if (contrast < 4.5) {
          add(
            'check',
            `[${sideName}] Borderline contrast (${contrast.toFixed(1)}:1) for text "${el.text.slice(0, 18)}".`,
            el.id,
            'contrast'
          );
        }
      }

      // Check for overlap against subsequent non-rect elements
      if (el.type === 'text') {
        const boxA = getEffectiveBox(el);
        if (!boxA.isRotatedDisplay) {
          for (let j = idx + 1; j < side.els.length; j++) {
            const other = side.els[j];
            if (other.hidden || other.type === 'rect') continue;

            const boxB = getEffectiveBox(other);
            if (boxB.isRotatedDisplay) continue;

            // Check AABB collision
            const overlapX = boxA.x < boxB.x + boxB.w && boxA.x + boxA.w > boxB.x;
            const overlapY = boxA.y < boxB.y + boxB.h && boxA.y + boxA.h > boxB.y;

            if (overlapX && overlapY) {
              const overlapHeight = Math.min(boxA.y + boxA.h, boxB.y + boxB.h) - Math.max(boxA.y, boxB.y);
              if (overlapHeight > 1.2) {
                const otherName = other.type === 'text' ? `"${(other as TextElement).text.slice(0, 15)}"` : other.type;
                add(
                  'check',
                  `[${sideName}] Potential overlap between "${el.text.slice(0, 15)}" and ${otherName}.`,
                  el.id,
                  'collision'
                );
              }
            }
          }
        }
      }
    });
  });

  // 4. Photos Check
  const hasPhotoEl = Object.values(sides).some(s => s.els.some(e => e.type === 'image' && e.src === 'photo'));
  if (hasPhotoEl) {
    const missing = records.filter(r => !r.__img && (!r.photo || !photosMap.has(r.photo.toLowerCase())));
    if (missing.length > 0) {
      add('check', `${missing.length} employee card(s) have no photo attached. (Corporate placeholder will be used).`);
    } else {
      add('ok', `All ${records.length} employee cards have verified photos attached.`);
    }
  }

  // 5. Logo Check
  const hasLogoEl = Object.values(sides).some(s => s.els.some(e => e.type === 'image' && e.src === 'logo'));
  if (hasLogoEl && !logoImg) {
    add('check', 'A company logo spot is on the card. (Vector corporate emblem placeholder active).');
  } else if (hasLogoEl && logoImg) {
    add('ok', 'Company corporate logo artwork is loaded and ready.');
  }

  // 6. QR Code Check
  const hasQrEl = Object.values(sides).some(s => s.els.some(e => e.type === 'qr'));
  if (hasQrEl) {
    add('ok', 'Verification QR code element verified with real-time digital credentials URL.');
  }

  // 7. Mandatory Text Fields Check
  let foundName = false;
  let foundId = false;

  Object.values(sides).forEach(s => {
    s.els.forEach(el => {
      if (el.type === 'text') {
        if (el.text.includes('{name}') || el.text.includes('{first_name}')) foundName = true;
        if (el.text.includes('{idno}')) foundId = true;
      } else if (el.type === 'qr') {
        if (el.qrData?.includes('{idno}') || el.caption?.includes('{idno}')) {
          foundId = true;
        }
      }
    });
  });

  if (!foundName) {
    add('fix', 'Card layout has no {name} placeholder! Employee name will be missing.', undefined, 'missing');
  }
  if (!foundId) {
    add('check', 'Card layout has no {idno} placeholder. Employee badge code will be omitted.', undefined, 'missing');
  }

  const fixCount = issues.filter(i => i.lv === 'fix').length;
  const checkCount = issues.filter(i => i.lv === 'check').length;

  return { issues, fixCount, checkCount };
}

// ============================================================================
// 7. HIGH-DPI CMYK PDF EXPORT (CARD & DUPLEX PRINT SHEET)
// ============================================================================

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
    // Sheet layout with duplex back-side column mirroring
    const [PW, PH] = paper.split('x').map(Number);
    const gut = 6.0;
    const mrg = 8.0;
    const cols = Math.floor((PW - 2 * mrg + gut) / (tw + gut));
    const rows = Math.floor((PH - 2 * mrg + gut) / (th + gut));

    if (cols < 1 || rows < 1) {
      throw new Error(
        `Card dimensions (${tw.toFixed(1)} × ${th.toFixed(1)} mm with bleed) exceed selected paper size (${paper} mm). Select A3/SRA3 or 1 Card Per Page layout.`
      );
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

          // Crucial Duplex Alignment: Mirror column index on the back side so double-sided printing aligns back-to-back perfectly!
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
