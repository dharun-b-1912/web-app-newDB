// src/features/people/idcard/idCardTypes.ts
// ============================================================================
// Joy PeopleHR — Enterprise ID Card Press Types & Template Definitions
// Print-ready CMYK PDF, Bleed, Crop Marks, and Dynamic HR Data Mapping
// ============================================================================

export const MM = 25.4;
export const PT = 72 / 25.4;

export type CardOrientation = 'landscape' | 'portrait' | 'custom';
export type CardSide = 'front' | 'back';

export type ElementType = 'text' | 'image' | 'rect';
export type ImageShape = 'rect' | 'rounded' | 'circle';
export type ImageFit = 'cover' | 'contain';
export type TextAlign = 'left' | 'center' | 'right';

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number; // in mm
  y: number; // in mm
  w: number; // in mm
  h: number; // in mm
  _box?: { x: number; y: number; w: number; h: number };
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  font: string;
  size: number; // in pt
  weight: number;
  color: string; // hex
  align: TextAlign;
  fit: boolean; // Auto-shrink text if longer than width
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: 'photo' | 'logo' | 'custom';
  shape: ImageShape;
  fit: ImageFit;
  radius: number; // in mm
  border: number; // in mm
  borderColor: string;
  img?: HTMLImageElement | null;
  srcName?: string;
}

export interface RectElement extends BaseElement {
  type: 'rect';
  fill: string; // hex
  radius: number; // in mm
}

export type CardElement = TextElement | ImageElement | RectElement;

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
}

export interface IdCardPersonRecord {
  id?: string;
  name: string;
  designation: string;
  idno: string;
  department: string;
  phone: string;
  blood: string;
  dob: string;
  address: string;
  valid: string;
  org: string;
  photo?: string;
  avatar_url?: string;
  __img?: HTMLImageElement | null;
  [key: string]: any;
}

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

export const ID_CARD_FONTS = [
  'IBM Plex Sans',
  'Barlow Condensed',
  'Poppins',
  'Source Serif 4',
  'Roboto Slab',
  'Arial',
];

export const DEFAULT_COLUMNS = [
  'name',
  'designation',
  'idno',
  'department',
  'phone',
  'blood',
  'dob',
  'address',
  'valid',
  'org',
  'photo',
];

