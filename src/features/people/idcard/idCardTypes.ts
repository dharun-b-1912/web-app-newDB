// src/features/people/idcard/idCardTypes.ts
// ============================================================================
// Joy PeopleHR — Enterprise ID Card Studio Types & Models
// Precision Placement, CMYK Print PDF, Bleed, Duplex Sheets, Photo Matching,
// Landscape & Portrait Card Support, and Real HRMS Database Integration
// ============================================================================

export const MM = 25.4;
export const PT = 72 / 25.4;

export type CardOrientation = 'landscape' | 'portrait' | 'custom';
export type CardSide = 'front' | 'back';

export type ElementType = 'text' | 'image' | 'rect' | 'qr';
export type ImageShape = 'rect' | 'rounded' | 'circle';
export type ImageFit = 'cover' | 'contain' | 'fill';
export type TextAlign = 'left' | 'center' | 'right';

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number; // in mm
  y: number; // in mm
  w: number; // in mm
  h: number; // in mm
  rotation?: number; // in degrees (0 - 360)
  locked?: boolean;
  hidden?: boolean;
  opacity?: number; // 0 - 1
  _box?: { x: number; y: number; w: number; h: number };
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  font: string;
  size: number; // in pt
  weight: number; // 300, 400, 500, 600, 700, 800
  color: string; // hex #rrggbba
  align: TextAlign;
  letterSpacing?: number; // in pt
  lineHeight?: number; // multiplier e.g. 1.2
  fit: boolean; // Auto-shrink text if longer than width
  uppercase?: boolean;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: 'photo' | 'logo' | 'custom' | 'qr';
  shape: ImageShape;
  fit: ImageFit;
  radius: number; // in mm (for rounded corners)
  border: number; // in mm
  borderColor: string;
  img?: HTMLImageElement | null;
  srcName?: string;
  customDataUrl?: string;
  crop?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

export interface RectElement extends BaseElement {
  type: 'rect';
  fill: string; // hex
  stroke?: string;
  strokeWidth?: number; // in mm
  radius: number; // in mm
}

export interface QrElement extends BaseElement {
  type: 'qr';
  qrData: string; // Template string or raw data, e.g. "https://app.joypeoplehr.com/verify-id-card?emp={employee_id}"
  color: string; // Foreground hex
  bgColor: string; // Background hex
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

export type CardElement = TextElement | ImageElement | RectElement | QrElement;

export interface CardSideData {
  bg: string; // hex
  bgImg: HTMLImageElement | null;
  bgName: string;
  els: CardElement[];
}

export interface CardGeometry {
  w: number; // in mm
  h: number; // in mm
  bleed: number; // in mm (typically 3mm)
  safe: number; // in mm (typically 3mm inside trim)
  orientation: CardOrientation;
}

export const CR80_LANDSCAPE: CardGeometry = {
  w: 85.6,
  h: 54.0,
  bleed: 3.0,
  safe: 3.0,
  orientation: 'landscape',
};

export const CR80_PORTRAIT: CardGeometry = {
  w: 54.0,
  h: 85.6,
  bleed: 3.0,
  safe: 3.0,
  orientation: 'portrait',
};

// Enterprise HR Person Record (Integrated with JOY PeopleHR Supabase)
export interface IdCardPersonRecord {
  id?: string;
  name: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  designation: string;
  idno: string; // Employee Code e.g. JCS-012 or EMP-20418
  department: string;
  branch: string;
  worksite?: string;
  phone: string;
  email?: string;
  blood: string;
  dob: string;
  doj?: string;
  address: string;
  valid: string;
  org: string;
  reporting_manager?: string;
  contractor?: string;
  status?: string;
  photo?: string; // Filename or matched key
  avatar_url?: string; // Supabase signed media URL
  photo_matched?: boolean;
  __img?: HTMLImageElement | null;
  qr_token?: string;
  [key: string]: any;
}

// Preflight validation issues
export interface PreflightIssue {
  key: string;
  lv: 'ok' | 'check' | 'fix';
  t: string;
  side?: CardSide;
  dpi?: number;
  recs?: number[];
}

export type ExportLayout = 'card' | 'sheet';
export type SheetPaperSize = '210x297' | '297x420' | '320x450' | '215.9x279.4';
export type ExportDpi = 300 | 600;
export type ExportSides = 'both' | 'front' | 'back';
export type ExportRecordsMode = 'all' | 'cur' | 'selected';

// Available Studio Fonts
export const ID_CARD_FONTS = [
  'IBM Plex Sans',
  'Barlow Condensed',
  'Poppins',
  'Inter',
  'Roboto',
  'Source Serif 4',
  'Roboto Slab',
  'Arial',
  'Montserrat',
];

// Available Dynamic HR Fields & Chips
export const DYNAMIC_FIELD_CHIPS = [
  { field: '{name}', label: 'Full Name', example: 'Muthu Kumar P' },
  { field: '{idno}', label: 'Employee ID', example: 'JCS-012' },
  { field: '{designation}', label: 'Designation', example: 'Lead Developer' },
  { field: '{department}', label: 'Department', example: 'Product Engineering' },
  { field: '{branch}', label: 'Branch / City', example: 'Coimbatore HQ' },
  { field: '{org}', label: 'Organization', example: 'Joy PeopleHR' },
  { field: '{phone}', label: 'Work Phone', example: '+91 98765 43210' },
  { field: '{email}', label: 'Work Email', example: 'muthu@joypeoplehr.com' },
  { field: '{blood}', label: 'Blood Group', example: 'B+ Positive' },
  { field: '{dob}', label: 'Date of Birth', example: '09 Dec 2003' },
  { field: '{doj}', label: 'Date of Joining', example: '24 Nov 2025' },
  { field: '{valid}', label: 'Card Valid Until', example: 'Dec 2028' },
  { field: '{reporting_manager}', label: 'Reporting Manager', example: 'Dharun B' },
  { field: '{contractor}', label: 'Contractor Agency', example: 'Joy Manpower' },
  { field: '{address}', label: 'Company Address', example: '12 Mill Rd, Coimbatore' },
];

export const DEFAULT_COLUMNS = [
  'name',
  'designation',
  'idno',
  'department',
  'branch',
  'phone',
  'email',
  'blood',
  'dob',
  'doj',
  'address',
  'valid',
  'org',
  'photo',
];

// Reusable Templates Definition
export interface IdCardTemplate {
  id: string;
  name: string;
  description: string;
  category: 'corporate' | 'campus' | 'minimal' | 'worker' | 'contractor' | 'security';
  orientation: CardOrientation;
  geometry: CardGeometry;
  front: CardSideData;
  back: CardSideData;
  is_default?: boolean;
}

// Photo Matching Models
export interface MatchedPhotoRecord {
  id: string;
  fileName: string;
  fileSize: number;
  dataUrl: string;
  img: HTMLImageElement;
  matchedEmployeeId?: string;
  matchedEmployeeCode?: string;
  matchedEmployeeName?: string;
  matchScore: number; // 0 - 100
  matchMethod: 'EXACT_CODE' | 'NORMALIZED_CODE' | 'EXACT_ID' | 'NAME_SUBSTRING' | 'MANUAL' | 'NONE';
  hash?: string;
}

// Card Lifecycle Tracking Record
export type CardLifecycleStatus = 'DRAFT' | 'GENERATED' | 'APPROVED' | 'ISSUED' | 'ACTIVE' | 'EXPIRED' | 'LOST' | 'DAMAGED' | 'REPLACED' | 'REVOKED';

export interface IdCardIssueRecord {
  id: string;
  cardNumber: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  templateId: string;
  templateName: string;
  status: CardLifecycleStatus;
  issueDate: string;
  expiryDate: string;
  issuedBy: string;
  reprintReason?: string;
  previousCardNumber?: string;
  qrVerificationToken: string;
  createdAt: string;
  updatedAt: string;
}
