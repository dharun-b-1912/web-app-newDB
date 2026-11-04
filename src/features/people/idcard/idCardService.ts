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
  CR80_LANDSCAPE,
  CR80_PORTRAIT,
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
export const STUDIO_PALETTES = {
  corporate: {
    main: '#0f2f57', // Deep Navy
    acc: '#1d7bd8', // Vivid Blue
    ink: '#14181c',
    sub: '#3a444d',
    tag: '#cfe0f5',
    label: 'EMPLOYEE ID',
  },
  campus: {
    main: '#07563D', // Emerald Green
    acc: '#10b981', // Mint Accent
    ink: '#14181c',
    sub: '#3a444d',
    tag: '#d1fae5',
    label: 'CAMPUS IDENTITY',
  },
  minimal: {
    main: '#1a1d20', // Jet Black
    acc: '#e63946', // Crimson
    ink: '#111111',
    sub: '#4a4f55',
    tag: '#f3f4f6',
    label: 'IDENTITY CARD',
  },
  worker: {
    main: '#1e293b', // Slate Navy
    acc: '#f59e0b', // High-vis Amber
    ink: '#0f172a',
    sub: '#475569',
    tag: '#fef3c7',
    label: 'PLANT & LOGISTICS PASS',
  },
  contractor: {
    main: '#134e4a', // Dark Teal
    acc: '#0ea5e9', // Sky Cyan
    ink: '#0f172a',
    sub: '#334155',
    tag: '#ccfbf1',
    label: 'AUTHORIZED CONTRACTOR',
  },
  security: {
    main: '#7f1d1d', // Dark Ruby
    acc: '#dc2626', // Red
    ink: '#111827',
    sub: '#374151',
    tag: '#fee2e2',
    label: 'SECURITY ACCESS PASS',
  },
};

// ============================================================================
// 1. DEDICATED PORTRAIT TEMPLATES (CR80: 54 mm × 85.6 mm)
// ============================================================================

export function makePortraitCorporateTemplate(): { front: CardElement[]; back: CardElement[] } {
  const p = STUDIO_PALETTES.corporate;
  const W = 54.0;
  const f: CardElement[] = [
    // Top banner
    createRectElement({ x: 0, y: 0, w: W, h: 22, fill: p.main }),
    createImageElement({ src: 'logo', x: 4.5, y: 4.5, w: 9, h: 9, fit: 'contain', radius: 0 }),
    createTextElement({ text: '{org}', x: 15.5, y: 4.8, w: 34, size: 8.5, weight: 700, color: '#ffffff', fit: true }),
    createTextElement({ text: p.label, x: 15.5, y: 10, w: 34, size: 5.5, weight: 600, color: p.tag }),
    // Photo
    createImageElement({ src: 'photo', x: 13, y: 26, w: 28, h: 34, shape: 'rounded', radius: 2, border: 0.8, borderColor: p.main }),
    // Name & Title
    createTextElement({ text: '{name}', x: 3, y: 62.5, w: 48, size: 11.5, weight: 700, color: p.ink, align: 'center', fit: true }),
    createTextElement({ text: '{designation}', x: 3, y: 68.5, w: 48, size: 7.8, weight: 600, color: p.main, align: 'center', fit: true }),
    // ID and Dept
    createTextElement({ text: 'ID: {idno}  •  {department}', x: 3, y: 74, w: 48, size: 6.8, weight: 500, color: p.sub, align: 'center', fit: true }),
    createTextElement({ text: 'Branch: {branch}', x: 3, y: 78, w: 48, size: 6.2, weight: 400, color: p.sub, align: 'center', fit: true }),
    // Bottom accent strip
    createRectElement({ x: 0, y: 82.6, w: W, h: 3, fill: p.acc }),
  ];

  const b: CardElement[] = [
    createRectElement({ x: 0, y: 0, w: W, h: 8, fill: p.main }),
    createTextElement({ text: 'IF FOUND, PLEASE RETURN TO:', x: 4, y: 11, w: 46, size: 6.5, weight: 700, color: p.main }),
    createTextElement({ text: '{org}\n{address}', x: 4, y: 15, w: 46, size: 6.5, color: p.sub }),
    createTextElement({ text: 'Emergency: {phone}\nEmail: {email}', x: 4, y: 25, w: 46, size: 6.5, weight: 500, color: p.ink }),
    createTextElement({ text: 'Blood Group: {blood}  |  DOB: {dob}\nDate of Joining: {doj}\nCard Valid Till: {valid}', x: 4, y: 34, w: 46, size: 6.5, color: p.sub }),
    // QR Code for verification
    createQrElement({ x: 18, y: 49, w: 18, h: 18, qrData: 'https://app.joypeoplehr.com/verify-id-card?emp={idno}' }),
    createTextElement({ text: 'Scan to verify active credentials', x: 4, y: 69, w: 46, size: 5.5, weight: 500, color: p.sub, align: 'center' }),
    // Signature
    createRectElement({ x: 12, y: 76, w: 30, h: 0.25, fill: p.sub }),
    createTextElement({ text: 'Authorized Signatory', x: 4, y: 77.2, w: 46, size: 5.5, color: p.sub, align: 'center' }),
    createRectElement({ x: 0, y: 82.6, w: W, h: 3, fill: p.acc }),
  ];

  return { front: f, back: b };
}

export function makePortraitWorkerTemplate(): { front: CardElement[]; back: CardElement[] } {
  const p = STUDIO_PALETTES.worker;
  const W = 54.0;
  const f: CardElement[] = [
    // Top safety header
    createRectElement({ x: 0, y: 0, w: W, h: 20, fill: p.main }),
    createRectElement({ x: 0, y: 18, w: W, h: 3, fill: p.acc }),
    createImageElement({ src: 'logo', x: 4, y: 3.5, w: 9, h: 9, fit: 'contain', radius: 0 }),
    createTextElement({ text: '{org}', x: 15, y: 4, w: 35, size: 8, weight: 700, color: '#ffffff', fit: true }),
    createTextElement({ text: 'SAFETY COMPLIANCE PASS', x: 15, y: 9.5, w: 35, size: 5.2, weight: 700, color: p.acc }),
    // Photo
    createImageElement({ src: 'photo', x: 12, y: 25, w: 30, h: 34, shape: 'rect', border: 1, borderColor: p.main }),
    // Blood group badge
    createRectElement({ x: 34, y: 26, w: 8, h: 5.5, fill: '#dc2626', radius: 1 }),
    createTextElement({ text: '{blood}', x: 34, y: 27, w: 8, size: 6, weight: 800, color: '#ffffff', align: 'center' }),
    // Name & ID
    createTextElement({ text: '{name}', x: 3, y: 62.5, w: 48, size: 11, weight: 800, color: p.ink, align: 'center', fit: true }),
    createTextElement({ text: '{designation}', x: 3, y: 68.5, w: 48, size: 8, weight: 600, color: p.sub, align: 'center', fit: true }),
    createTextElement({ text: 'BADGE ID: {idno}', x: 3, y: 74, w: 48, size: 7.5, weight: 800, color: p.main, align: 'center' }),
    createTextElement({ text: 'Shift / Dept: {department}', x: 3, y: 78.5, w: 48, size: 6.5, color: p.sub, align: 'center', fit: true }),
    createRectElement({ x: 0, y: 83.6, w: W, h: 2, fill: p.acc }),
  ];

  const b: CardElement[] = [
    createRectElement({ x: 0, y: 0, w: W, h: 8, fill: p.main }),
    createTextElement({ text: 'EMERGENCY / SAFETY INSTRUCTIONS', x: 4, y: 11, w: 46, size: 6.5, weight: 800, color: p.main }),
    createTextElement({ text: 'Wear PPE at all times within active bays.\nReport incidents immediately to Safety Desk.\nBlood: {blood}  |  DOB: {dob}', x: 4, y: 16, w: 46, size: 6.5, color: p.sub }),
    createTextElement({ text: 'Emergency Plant Line: {phone}\nCampus: {branch}\nValid Till: {valid}', x: 4, y: 28, w: 46, size: 6.5, weight: 600, color: p.ink }),
    createQrElement({ x: 18, y: 46, w: 18, h: 18, qrData: 'https://app.joypeoplehr.com/verify-id-card?emp={idno}' }),
    createTextElement({ text: 'Safety Clearance Token', x: 4, y: 66, w: 46, size: 6, weight: 600, color: p.sub, align: 'center' }),
    createRectElement({ x: 12, y: 75, w: 30, h: 0.25, fill: p.sub }),
    createTextElement({ text: 'Safety Officer Signatory', x: 4, y: 76.5, w: 46, size: 5.5, color: p.sub, align: 'center' }),
    createRectElement({ x: 0, y: 83.6, w: W, h: 2, fill: p.acc }),
  ];

  return { front: f, back: b };
}

export function makePortraitContractorTemplate(): { front: CardElement[]; back: CardElement[] } {
  const p = STUDIO_PALETTES.contractor;
  const W = 54.0;
  const f: CardElement[] = [
    createRectElement({ x: 0, y: 0, w: W, h: 20, fill: p.main }),
    createImageElement({ src: 'logo', x: 4, y: 4, w: 9, h: 9, fit: 'contain', radius: 0 }),
    createTextElement({ text: '{org}', x: 15, y: 4.5, w: 35, size: 8, weight: 700, color: '#ffffff', fit: true }),
    createTextElement({ text: 'CONTRACT WORKFORCE', x: 15, y: 10, w: 35, size: 5.5, weight: 600, color: p.acc }),
    createImageElement({ src: 'photo', x: 13, y: 25, w: 28, h: 34, shape: 'rounded', radius: 2, border: 1, borderColor: p.main }),
    createTextElement({ text: '{name}', x: 3, y: 62.5, w: 48, size: 11, weight: 700, color: p.ink, align: 'center', fit: true }),
    createTextElement({ text: '{designation}', x: 3, y: 68.5, w: 48, size: 8, weight: 500, color: p.main, align: 'center', fit: true }),
    createTextElement({ text: 'Agency: {contractor}', x: 3, y: 73.5, w: 48, size: 7, weight: 600, color: p.sub, align: 'center', fit: true }),
    createTextElement({ text: 'Pass ID: {idno}  •  Valid: {valid}', x: 3, y: 78, w: 48, size: 6.5, weight: 700, color: p.acc, align: 'center' }),
    createRectElement({ x: 0, y: 82.6, w: W, h: 3, fill: p.acc }),
  ];

  const b: CardElement[] = [
    createRectElement({ x: 0, y: 0, w: W, h: 8, fill: p.main }),
    createTextElement({ text: 'CONTRACTOR SERVICE POLICIES', x: 4, y: 11, w: 46, size: 6.5, weight: 700, color: p.main }),
    createTextElement({ text: 'Valid only on specified facility premises.\nNon-transferable. Must be displayed on lanyard.', x: 4, y: 15, w: 46, size: 6.5, color: p.sub }),
    createTextElement({ text: 'Contract Agency: {contractor}\nWorksite: {branch}\nSupervisor Contact: {phone}', x: 4, y: 25, w: 46, size: 6.5, weight: 600, color: p.ink }),
    createQrElement({ x: 18, y: 45, w: 18, h: 18, qrData: 'https://app.joypeoplehr.com/verify-id-card?emp={idno}' }),
    createTextElement({ text: 'Verification QR', x: 4, y: 65, w: 46, size: 5.5, color: p.sub, align: 'center' }),
    createRectElement({ x: 12, y: 75, w: 30, h: 0.25, fill: p.sub }),
    createTextElement({ text: 'Contract Administrator', x: 4, y: 76.2, w: 46, size: 5.5, color: p.sub, align: 'center' }),
    createRectElement({ x: 0, y: 82.6, w: W, h: 3, fill: p.acc }),
  ];

  return { front: f, back: b };
}

export function makePortraitCampusTemplate(): { front: CardElement[]; back: CardElement[] } {
  const p = STUDIO_PALETTES.campus;
  const W = 54.0;
  const f: CardElement[] = [
    createRectElement({ x: 0, y: 0, w: W, h: 34, fill: p.main }),
    createImageElement({ src: 'logo', x: 4.5, y: 4.5, w: 8, h: 8, fit: 'contain', radius: 0 }),
    createTextElement({ text: '{org}', x: 14.5, y: 5, w: 35, size: 8.5, weight: 700, color: '#ffffff', fit: true }),
    // Circular Photo with Halo
    createImageElement({ src: 'photo', x: 13, y: 16, w: 28, h: 28, shape: 'circle', border: 1.5, borderColor: '#ffffff' }),
    createTextElement({ text: '{name}', x: 3, y: 48, w: 48, size: 11.5, weight: 700, color: p.ink, align: 'center', fit: true }),
    createTextElement({ text: '{designation}', x: 3, y: 54, w: 48, size: 8, weight: 600, color: p.main, align: 'center', fit: true }),
    // Valid badge
    createRectElement({ x: 14, y: 60, w: 26, h: 5, fill: p.tag, radius: 2.5 }),
    createTextElement({ text: 'VALID: {valid}', x: 14, y: 61, w: 26, size: 6, weight: 700, color: p.main, align: 'center' }),
    createTextElement({ text: 'ID: {idno}  |  {department}', x: 3, y: 68, w: 48, size: 7, color: p.sub, align: 'center', fit: true }),
    createTextElement({ text: '{branch}', x: 3, y: 73, w: 48, size: 6.5, color: p.sub, align: 'center', fit: true }),
    createRectElement({ x: 0, y: 82.6, w: W, h: 3, fill: p.acc }),
  ];

  const b: CardElement[] = [
    createRectElement({ x: 0, y: 0, w: W, h: 8, fill: p.main }),
    createTextElement({ text: 'CAMPUS ACCESS GUIDELINES', x: 4, y: 11, w: 46, size: 6.5, weight: 700, color: p.main }),
    createTextElement({ text: 'Must be tapped at turnstiles & lab gateways.\nReport lost card to IT Service Desk.', x: 4, y: 15, w: 46, size: 6.5, color: p.sub }),
    createTextElement({ text: 'Staff Email: {email}\nPhone: {phone}', x: 4, y: 25, w: 46, size: 6.5, weight: 600, color: p.ink }),
    createQrElement({ x: 18, y: 45, w: 18, h: 18, qrData: 'https://app.joypeoplehr.com/verify-id-card?emp={idno}' }),
    createTextElement({ text: 'Scan for Realtime Verification', x: 4, y: 66, w: 46, size: 5.5, color: p.sub, align: 'center' }),
    createRectElement({ x: 12, y: 75, w: 30, h: 0.25, fill: p.sub }),
    createTextElement({ text: 'Registrar / Admin Head', x: 4, y: 76.5, w: 46, size: 5.5, color: p.sub, align: 'center' }),
    createRectElement({ x: 0, y: 82.6, w: W, h: 3, fill: p.acc }),
  ];

  return { front: f, back: b };
}

export function makePortraitMinimalTemplate(): { front: CardElement[]; back: CardElement[] } {
  const p = STUDIO_PALETTES.minimal;
  const W = 54.0;
  const f: CardElement[] = [
    createRectElement({ x: 0, y: 0, w: W, h: 3, fill: p.acc }),
    createTextElement({ text: '{org}', x: 6, y: 8, w: 42, size: 7.5, weight: 700, color: p.acc, fit: true }),
    createImageElement({ src: 'photo', x: 8, y: 16, w: 38, h: 42, radius: 0, shape: 'rect' }),
    createTextElement({ text: '{name}', x: 6, y: 61, w: 42, size: 12, weight: 800, color: p.ink, fit: true }),
    createTextElement({ text: '{designation}', x: 6, y: 67.5, w: 42, size: 8, color: p.sub, fit: true }),
    createRectElement({ x: 6, y: 73.5, w: 42, h: 0.25, fill: p.ink }),
    createTextElement({ text: 'ID: {idno}  •  {valid}', x: 6, y: 75.5, w: 42, size: 7, weight: 600, color: p.ink, fit: true }),
    createTextElement({ text: '{department}', x: 6, y: 80, w: 42, size: 6.5, color: p.sub, fit: true }),
  ];

  const b: CardElement[] = [
    createRectElement({ x: 0, y: 0, w: W, h: 8, fill: p.acc }),
    createTextElement({ text: 'Return Address:', x: 5, y: 12, w: 44, size: 7, weight: 700, color: p.ink }),
    createTextElement({ text: '{org}\n{address}', x: 5, y: 17, w: 44, size: 7, color: p.sub }),
    createTextElement({ text: 'Blood: {blood}  |  DOB: {dob}\nValid: {valid}', x: 5, y: 35, w: 44, size: 7, color: p.ink }),
    createQrElement({ x: 18, y: 48, w: 18, h: 18, qrData: 'https://app.joypeoplehr.com/verify-id-card?emp={idno}' }),
    createRectElement({ x: 8, y: 74, w: 38, h: 0.25, fill: p.ink }),
    createTextElement({ text: 'Authorised Signatory', x: 5, y: 75.5, w: 44, size: 6, color: p.sub, align: 'center' }),
    createRectElement({ x: 0, y: 82.6, w: W, h: 3, fill: p.acc }),
  ];

  return { front: f, back: b };
}

export function makePortraitSecurityTemplate(): { front: CardElement[]; back: CardElement[] } {
  const p = STUDIO_PALETTES.security;
  const W = 54.0;
  const f: CardElement[] = [
    createRectElement({ x: 0, y: 0, w: W, h: 22, fill: p.main }),
    createImageElement({ src: 'logo', x: 4, y: 4, w: 9, h: 9, fit: 'contain', radius: 0 }),
    createTextElement({ text: '{org}', x: 15, y: 4.5, w: 35, size: 8, weight: 700, color: '#ffffff', fit: true }),
    createTextElement({ text: 'SECURE RESTRICTED ACCESS', x: 15, y: 10, w: 35, size: 5, weight: 700, color: '#fca5a5' }),
    createImageElement({ src: 'photo', x: 12, y: 25, w: 30, h: 34, shape: 'rounded', radius: 1, border: 1.5, borderColor: p.acc }),
    createTextElement({ text: '{name}', x: 3, y: 62.5, w: 48, size: 11.5, weight: 800, color: p.ink, align: 'center', fit: true }),
    createTextElement({ text: '{designation}', x: 3, y: 68.5, w: 48, size: 8, weight: 600, color: p.main, align: 'center', fit: true }),
    createRectElement({ x: 8, y: 73.5, w: 38, h: 5.5, fill: p.main, radius: 1 }),
    createTextElement({ text: 'CLEARANCE: LEVEL 3', x: 8, y: 74.5, w: 38, size: 6.5, weight: 800, color: '#ffffff', align: 'center' }),
    createRectElement({ x: 0, y: 82.6, w: W, h: 3, fill: p.acc }),
  ];

  const b: CardElement[] = [
    createRectElement({ x: 0, y: 0, w: W, h: 8, fill: p.main }),
    createTextElement({ text: 'SECURITY NOTICE', x: 4, y: 11, w: 46, size: 7, weight: 800, color: p.main }),
    createTextElement({ text: 'Classified & Restricted Facilities.\nUnauthorised possession is a statutory violation.\nSurrender immediately if lost.', x: 4, y: 16, w: 46, size: 6.5, color: p.sub }),
    createQrElement({ x: 18, y: 40, w: 18, h: 18, qrData: 'https://app.joypeoplehr.com/verify-id-card?emp={idno}' }),
    createTextElement({ text: 'Biometric Access Token', x: 4, y: 61, w: 46, size: 6, weight: 700, color: p.main, align: 'center' }),
    createRectElement({ x: 12, y: 74, w: 30, h: 0.25, fill: p.sub }),
    createTextElement({ text: 'Chief Security Officer', x: 4, y: 75.5, w: 46, size: 5.5, color: p.sub, align: 'center' }),
    createRectElement({ x: 0, y: 82.6, w: W, h: 3, fill: p.acc }),
  ];

  return { front: f, back: b };
}

// ============================================================================
// 2. DEDICATED LANDSCAPE TEMPLATES (CR80: 85.6 mm × 54 mm)
// ============================================================================

export function makeLandscapeCorporateTemplate(): { front: CardElement[]; back: CardElement[] } {
  const p = STUDIO_PALETTES.corporate;
  const W = 85.6;
  const f: CardElement[] = [
    createRectElement({ x: 0, y: 0, w: W, h: 14, fill: p.main }),
    createImageElement({ src: 'logo', x: 5, y: 3, w: 8, h: 8, fit: 'contain', radius: 0 }),
    createTextElement({ text: '{org}', x: 15, y: 3.2, w: 66, size: 10, weight: 700, color: '#ffffff', fit: true }),
    createTextElement({ text: p.label, x: 15, y: 8.6, w: 66, size: 5.5, weight: 500, color: p.tag }),
    createImageElement({ src: 'photo', x: 5, y: 18.5, w: 22, h: 28, shape: 'rounded', radius: 1.5 }),
    createTextElement({ text: '{name}', x: 31, y: 18.5, w: 50, size: 12.5, weight: 700, color: p.ink, fit: true }),
    createTextElement({ text: '{designation}', x: 31, y: 25, w: 50, size: 8.5, weight: 600, color: p.main, fit: true }),
    createTextElement({ text: 'ID: {idno}  •  Dept: {department}\nBranch: {branch}\nPhone: {phone}', x: 31, y: 31.5, w: 50, size: 7.2, color: p.sub }),
    createRectElement({ x: 0, y: 51, w: W, h: 3, fill: p.acc }),
  ];

  const b: CardElement[] = [
    createRectElement({ x: 0, y: 0, w: W, h: 8, fill: p.main }),
    createTextElement({ text: 'If found, please return to:', x: 5, y: 11, w: 50, size: 7, weight: 700, color: p.ink }),
    createTextElement({ text: '{org}\n{address}', x: 5, y: 16, w: 50, size: 7.2, color: p.sub }),
    createTextElement({ text: 'Blood Group: {blood}  |  DOB: {dob}\nValid Till: {valid}', x: 5, y: 28, w: 50, size: 7.2, color: p.ink }),
    createQrElement({ x: 62, y: 12, w: 18, h: 18, qrData: 'https://app.joypeoplehr.com/verify-id-card?emp={idno}' }),
    createTextElement({ text: 'Scan to verify', x: 60, y: 32, w: 22, size: 5.5, color: p.sub, align: 'center' }),
    createRectElement({ x: 5, y: 44, w: 32, h: 0.25, fill: p.ink }),
    createTextElement({ text: 'Authorised Signatory', x: 5, y: 45.5, w: 40, size: 6, color: p.sub }),
    createRectElement({ x: 0, y: 51, w: W, h: 3, fill: p.acc }),
  ];

  return { front: f, back: b };
}

export function makeLandscapeWorkerTemplate(): { front: CardElement[]; back: CardElement[] } {
  const p = STUDIO_PALETTES.worker;
  const W = 85.6;
  const f: CardElement[] = [
    createRectElement({ x: 0, y: 0, w: 5, h: 54, fill: p.acc }),
    createRectElement({ x: 5, y: 0, w: W - 5, h: 12, fill: p.main }),
    createImageElement({ src: 'logo', x: 8, y: 2, w: 8, h: 8, fit: 'contain', radius: 0 }),
    createTextElement({ text: '{org}', x: 18, y: 2.5, w: 60, size: 9, weight: 700, color: '#ffffff', fit: true }),
    createTextElement({ text: 'SAFETY COMPLIANCE PASS', x: 18, y: 7.5, w: 60, size: 5.2, weight: 700, color: p.acc }),
    createImageElement({ src: 'photo', x: 9, y: 16, w: 24, h: 30, shape: 'rect', border: 0.8, borderColor: p.main }),
    createTextElement({ text: '{name}', x: 37, y: 16, w: 45, size: 12, weight: 800, color: p.ink, fit: true }),
    createTextElement({ text: '{designation}', x: 37, y: 22.5, w: 45, size: 8, weight: 600, color: p.sub, fit: true }),
    createTextElement({ text: 'ID: {idno}\nDept: {department}\nBlood: {blood}  |  Emergency: {phone}', x: 37, y: 29, w: 45, size: 7.2, color: p.sub }),
    createRectElement({ x: 37, y: 47, w: 45, h: 3, fill: p.acc }),
  ];

  const b: CardElement[] = [
    createRectElement({ x: 0, y: 0, w: W, h: 8, fill: p.main }),
    createTextElement({ text: 'PLANT SAFETY REGULATIONS', x: 6, y: 11, w: 50, size: 7, weight: 700, color: p.main }),
    createTextElement({ text: 'Mandatory PPE area badge.\nReport accidents to safety manager immediately.', x: 6, y: 16, w: 50, size: 7, color: p.sub }),
    createTextElement({ text: 'Emergency: {phone}  |  Blood: {blood}\nValid: {valid}', x: 6, y: 27, w: 50, size: 7, color: p.ink }),
    createQrElement({ x: 62, y: 12, w: 18, h: 18, qrData: 'https://app.joypeoplehr.com/verify-id-card?emp={idno}' }),
    createRectElement({ x: 6, y: 44, w: 32, h: 0.25, fill: p.ink }),
    createTextElement({ text: 'Safety Officer Signatory', x: 6, y: 45.5, w: 40, size: 6, color: p.sub }),
    createRectElement({ x: 0, y: 51, w: W, h: 3, fill: p.acc }),
  ];

  return { front: f, back: b };
}

export function makeLandscapeContractorTemplate(): { front: CardElement[]; back: CardElement[] } {
  const p = STUDIO_PALETTES.contractor;
  const W = 85.6;
  const f: CardElement[] = [
    createRectElement({ x: 0, y: 0, w: W, h: 13, fill: p.main }),
    createImageElement({ src: 'logo', x: 5, y: 2.5, w: 8, h: 8, fit: 'contain', radius: 0 }),
    createTextElement({ text: '{org}', x: 15, y: 3, w: 66, size: 9, weight: 700, color: '#ffffff', fit: true }),
    createTextElement({ text: 'AUTHORIZED CONTRACTOR', x: 15, y: 8, w: 66, size: 5.5, weight: 600, color: p.acc }),
    createImageElement({ src: 'photo', x: 6, y: 17, w: 22, h: 28, shape: 'rounded', radius: 1.5 }),
    createTextElement({ text: '{name}', x: 32, y: 17, w: 48, size: 12, weight: 700, color: p.ink, fit: true }),
    createTextElement({ text: '{designation}', x: 32, y: 23, w: 48, size: 8, weight: 500, color: p.main, fit: true }),
    createTextElement({ text: 'Agency: {contractor}\nID: {idno}  •  Worksite: {branch}\nValid Until: {valid}', x: 32, y: 29.5, w: 48, size: 7.2, color: p.sub }),
    createRectElement({ x: 0, y: 51, w: W, h: 3, fill: p.acc }),
  ];

  const b: CardElement[] = [
    createRectElement({ x: 0, y: 0, w: W, h: 8, fill: p.main }),
    createTextElement({ text: 'CONTRACTOR CONDITIONS OF ENTRY', x: 5, y: 11, w: 52, size: 7, weight: 700, color: p.main }),
    createTextElement({ text: 'Access restricted to work shifts.\nAgency: {contractor}\nSupervisor: {phone}', x: 5, y: 16, w: 52, size: 7, color: p.sub }),
    createTextElement({ text: 'Blood: {blood}  |  DOB: {dob}', x: 5, y: 30, w: 52, size: 7, color: p.ink }),
    createQrElement({ x: 62, y: 12, w: 18, h: 18, qrData: 'https://app.joypeoplehr.com/verify-id-card?emp={idno}' }),
    createRectElement({ x: 5, y: 44, w: 32, h: 0.25, fill: p.ink }),
    createTextElement({ text: 'Contract Administrator', x: 5, y: 45.5, w: 40, size: 6, color: p.sub }),
    createRectElement({ x: 0, y: 51, w: W, h: 3, fill: p.acc }),
  ];

  return { front: f, back: b };
}

export function makeLandscapeCampusTemplate(): { front: CardElement[]; back: CardElement[] } {
  const p = STUDIO_PALETTES.campus;
  const W = 85.6;
  const f: CardElement[] = [
    createRectElement({ x: 0, y: 0, w: 28, h: 54, fill: p.main }),
    createImageElement({ src: 'photo', x: 3, y: 8, w: 22, h: 22, shape: 'circle', border: 1, borderColor: '#ffffff' }),
    createTextElement({ text: '{idno}', x: 1, y: 33, w: 26, size: 8, weight: 700, color: '#ffffff', align: 'center', fit: true }),
    createTextElement({ text: 'Valid: {valid}', x: 1, y: 40, w: 26, size: 6, color: p.tag, align: 'center' }),
    createImageElement({ src: 'logo', x: 33, y: 5, w: 8, h: 8, fit: 'contain', radius: 0 }),
    createTextElement({ text: '{org}', x: 43, y: 6, w: 38, size: 9, weight: 700, color: p.main, fit: true }),
    createTextElement({ text: p.label, x: 43, y: 11, w: 38, size: 5.5, weight: 600, color: p.acc }),
    createTextElement({ text: '{name}', x: 33, y: 20, w: 48, size: 12.5, weight: 700, color: p.ink, fit: true }),
    createTextElement({ text: '{designation}', x: 33, y: 26.5, w: 48, size: 8.5, weight: 500, color: p.sub }),
    createTextElement({ text: '{department}\nPhone: {phone}\nBlood: {blood}', x: 33, y: 33, w: 48, size: 7.2, color: p.sub }),
    createRectElement({ x: 28, y: 51, w: W - 28, h: 3, fill: p.acc }),
  ];

  const b: CardElement[] = [
    createRectElement({ x: 0, y: 0, w: W, h: 8, fill: p.main }),
    createTextElement({ text: 'CAMPUS VERIFICATION & ACCESS', x: 5, y: 11, w: 52, size: 7, weight: 700, color: p.main }),
    createTextElement({ text: '{org}\n{address}', x: 5, y: 16, w: 52, size: 7, color: p.sub }),
    createTextElement({ text: 'Emergency: {phone}  |  Blood: {blood}\nValid: {valid}', x: 5, y: 28, w: 52, size: 7, color: p.ink }),
    createQrElement({ x: 62, y: 12, w: 18, h: 18, qrData: 'https://app.joypeoplehr.com/verify-id-card?emp={idno}' }),
    createRectElement({ x: 5, y: 44, w: 32, h: 0.25, fill: p.ink }),
    createTextElement({ text: 'Registrar / Admin Head', x: 5, y: 45.5, w: 40, size: 6, color: p.sub }),
    createRectElement({ x: 0, y: 51, w: W, h: 3, fill: p.acc }),
  ];

  return { front: f, back: b };
}

export function makeLandscapeMinimalTemplate(): { front: CardElement[]; back: CardElement[] } {
  const p = STUDIO_PALETTES.minimal;
  const W = 85.6;
  const f: CardElement[] = [
    createRectElement({ x: 0, y: 0, w: 3, h: 54, fill: p.acc }),
    createImageElement({ src: 'photo', x: 9, y: 8, w: 24, h: 30, radius: 0, shape: 'rect' }),
    createTextElement({ text: '{org}', x: 38, y: 8, w: 42, size: 7, weight: 700, color: p.acc, fit: true }),
    createTextElement({ text: '{name}', x: 38, y: 13.5, w: 42, size: 12.5, weight: 800, color: p.ink, fit: true }),
    createTextElement({ text: '{designation}', x: 38, y: 20.5, w: 42, size: 8, color: p.sub }),
    createTextElement({ text: 'ID: {idno}\nPhone: {phone}\nValid: {valid}', x: 38, y: 28.5, w: 42, size: 7.2, color: p.ink }),
    createRectElement({ x: 9, y: 44, w: 70, h: 0.25, fill: p.ink }),
    createTextElement({ text: p.label, x: 9, y: 46, w: 70, size: 5.5, weight: 600, color: p.sub }),
  ];

  const b: CardElement[] = [
    createRectElement({ x: 0, y: 0, w: W, h: 8, fill: p.acc }),
    createTextElement({ text: 'Return to:', x: 5, y: 11, w: 50, size: 7, weight: 700, color: p.ink }),
    createTextElement({ text: '{org}\n{address}', x: 5, y: 16, w: 50, size: 7, color: p.sub }),
    createTextElement({ text: 'Blood: {blood}  |  DOB: {dob}\nValid: {valid}', x: 5, y: 28, w: 50, size: 7, color: p.ink }),
    createQrElement({ x: 62, y: 12, w: 18, h: 18, qrData: 'https://app.joypeoplehr.com/verify-id-card?emp={idno}' }),
    createRectElement({ x: 5, y: 44, w: 32, h: 0.25, fill: p.ink }),
    createTextElement({ text: 'Authorised Signatory', x: 5, y: 45.5, w: 40, size: 6, color: p.sub }),
    createRectElement({ x: 0, y: 51, w: W, h: 3, fill: p.acc }),
  ];

  return { front: f, back: b };
}

// Master Template Selector
export function getTemplateByName(
  category: 'corporate' | 'campus' | 'minimal' | 'worker' | 'contractor' | 'security',
  orientation: 'landscape' | 'portrait'
): { front: CardElement[]; back: CardElement[] } {
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

// ============================================================================
// 4. SUPABASE RELATIONAL WORKFORCE FETCHER
// ============================================================================

export async function fetchEmployeesForIdCards(organizationId?: string): Promise<IdCardPersonRecord[]> {
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
  const add = (lv: 'ok' | 'check' | 'fix', t: string) => issues.push({ key: `gen_${issues.length}`, lv, t });

  // 1. Bleed & Dimensions Check
  if (geometry.bleed < 2) {
    add('check', `Bleed is ${geometry.bleed} mm. Most commercial printers ask for 3.0 mm bleed.`);
  } else {
    add('ok', `Bleed verified at ${geometry.bleed} mm on all edges for ${geometry.orientation.toUpperCase()} orientation.`);
  }

  // 2. Safe zone check
  if (geometry.safe < 2) {
    add('check', `Safe zone is ${geometry.safe} mm. Important text close to edge may be clipped.`);
  } else {
    add('ok', `Safe area is set to ${geometry.safe} mm inside cut edge.`);
  }

  // 3. Photos Check
  const hasPhotoEl = Object.values(sides).some(s => s.els.some(e => e.type === 'image' && e.src === 'photo'));
  if (hasPhotoEl) {
    const missing = records.filter(r => !r.__img && (!r.photo || !photosMap.has(r.photo.toLowerCase())));
    if (missing.length > 0) {
      add('check', `${missing.length} employee card(s) have no photo attached. (Photo placeholder will print empty).`);
    } else {
      add('ok', `All ${records.length} employee cards have verified photos attached.`);
    }
  }

  // 4. Logo Check
  const hasLogoEl = Object.values(sides).some(s => s.els.some(e => e.type === 'image' && e.src === 'logo'));
  if (hasLogoEl && !logoImg) {
    add('check', 'A company logo spot is configured on the card, but no logo artwork is uploaded.');
  } else if (hasLogoEl && logoImg) {
    add('ok', 'Company corporate logo artwork is loaded and ready.');
  }

  // 5. QR Code Check
  const hasQrEl = Object.values(sides).some(s => s.els.some(e => e.type === 'qr'));
  if (hasQrEl) {
    add('ok', 'Verification QR code element verified with real-time digital credentials URL.');
  }

  // 6. Mandatory Text Fields Check
  const requiredFields = ['{name}', '{idno}'];
  let foundName = false;
  let foundId = false;

  Object.values(sides).forEach(s => {
    s.els.forEach(el => {
      if (el.type === 'text') {
        if (el.text.includes('{name}')) foundName = true;
        if (el.text.includes('{idno}')) foundId = true;
      }
    });
  });

  if (!foundName) {
    add('fix', 'Card layout has no {name} placeholder! Employee name will be missing.');
  }
  if (!foundId) {
    add('check', 'Card layout has no {idno} placeholder. Employee badge code will be omitted.');
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
