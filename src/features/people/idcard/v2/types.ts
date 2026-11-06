// src/features/people/idcard/v2/types.ts
// ============================================================================
// JOY PeopleHR ID Card Studio V2 — Type Definitions & State Contracts
// ============================================================================

import {
  CardElement,
  CardGeometry,
  CardSide,
  CardSideData,
  IdCardPersonRecord,
  PreflightIssue,
} from '../idCardTypes';

export type StudioMode = 'issue' | 'design';

export type IssueStep = 'template' | 'people' | 'review' | 'generate';

export type TemplateCategory =
  | 'corporate'
  | 'campus'
  | 'minimal'
  | 'worker'
  | 'contractor'
  | 'security';

export type TargetWorkforceType =
  | 'ALL'
  | 'EMPLOYEE'
  | 'CONTRACTOR'
  | 'WORKER'
  | 'CAMPUS'
  | 'SECURITY';

export type StarterLayoutArchetype =
  | 'diagonal_corporate'
  | 'safety_band'
  | 'split_duo'
  | 'lanyard_arch'
  | 'minimal_monospace'
  | 'security_badge';

export interface TemplateCardInfo {
  id: TemplateCategory;
  name: string;
  tag: string;
  tagColor: string;
  dotColor: string;
  targetType: TargetWorkforceType;
  description: string;
  recommendedRole?: string;
  accentHex: string;
  secondaryHex?: string;
  frontBg: string;
  layoutArchetype: StarterLayoutArchetype;
  photoShape?: 'rounded' | 'circle' | 'arch' | 'square';
  orientation?: 'portrait' | 'landscape';
}

export type PrintOutputFormat =
  | 'single_pdf'
  | 'sheet_a4'
  | 'sheet_a3'
  | 'sheet_sra3'
  | 'high_res_png'
  | 'zip_archive';

export type IccOutputIntentProfile =
  | 'ISO_COATED_V2'
  | 'FOGRA39'
  | 'GRACOL_2013'
  | 'PVC_DIRECT_SRGB';

export interface PrintProductionBatch {
  batchId: string;
  idempotencyKey: string;
  templateId: string;
  templateName: string;
  templateVersion: number;
  cardsCount: number;
  format: PrintOutputFormat;
  dpi: 300 | 600;
  iccProfile: IccOutputIntentProfile;
  duplexAligned: boolean;
  createdAt: string;
  createdBy: string;
}

export interface DraftRecoverySnapshot {
  organizationId: string;
  templateId: string;
  templateName: string;
  savedAt: string;
  geometry: CardGeometry;
  front: CustomCardSideDef;
  back: CustomCardSideDef;
}

export interface IssueJobConfig {
  templateCategory: TemplateCategory;
  selectedEmployeeIds: string[];
  outputFormat: PrintOutputFormat;
  resolutionDpi: 300 | 600;
  sidesChoice: 'both' | 'front' | 'back';
  cropMarks: boolean;
}

export interface StudioV2State {
  mode: StudioMode;
  step: IssueStep;
  activeEmployeeIndex: number;
  selectedEmployeeIds: Set<string>;
  zoom: number;
  isFitZoom: boolean;
  showGuides: boolean;
  activeSide: CardSide;
}

// ============================================================================
// Bring-Your-Own Design & Custom Template Contracts
// ============================================================================

export type TemplateSource = 'upload' | 'editor' | 'starter' | 'import';

export type FitRemedyType = 'extend_bleed' | 'mirror_bleed' | 'scale_fill' | 'fit_color';

export interface FitCheckResult {
  status: 'exact_bleed' | 'trim_only' | 'ratio_mismatch';
  effDpi: number;
  widthPx: number;
  heightPx: number;
  aspectRatio: number;
  remedyApplied?: FitRemedyType;
  message: string;
}

export interface TemplatePlacement {
  scale: number;        // 1.0 = 100%
  offsetXmm: number;    // relative to bleed box
  offsetYmm: number;
  flipX?: boolean;
  edgeFill?: 'stretch' | 'mirror' | 'color';
  fillColor?: string;
}

export interface TemplateAssetRef {
  id: string;
  side: 'front' | 'back';
  role: 'base' | 'overlay' | 'mask';
  name: string;
  mime: string;
  widthPx: number;
  heightPx: number;
  effDpi: number;
  dataUrl?: string;     // Base64 data URL for instant rendering & local caching
  storagePath?: string; // Supabase private bucket path
  placement: TemplatePlacement;
}

export interface KeepOutZone {
  id: string;
  type: 'punch_slot' | 'chip_nfc' | 'magstripe' | 'signature';
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  bufferMm?: number;
}

export interface CollisionWarning {
  elementId: string;
  elementLabel: string;
  zoneId: string;
  zoneLabel: string;
  overlapMm: number;
  suggestedY: number;
}

export interface CustomCardSideDef {
  bg: string;
  bgName?: string;
  baseAsset?: TemplateAssetRef;
  overlayAsset?: TemplateAssetRef;
  elements: CardElement[];
  keepOutZones: KeepOutZone[];
}

export interface TemplateVersionRecord {
  version: number;
  publishedAt: string;
  publishedBy: string;
  notes?: string;
  issuedCardsCount: number;
}

export interface IdCardCustomTemplate {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  version: number;
  status: 'draft' | 'published' | 'archived';
  source: TemplateSource;
  geometry: CardGeometry;
  sides: {
    front: CustomCardSideDef;
    back: CustomCardSideDef;
  };
  targetEmployeeTypes: string[]; // ['ALL'] or ['DIRECT', 'CONTRACTOR']
  isDefault: boolean;
  rightsConfirmedBy?: string;
  rightsConfirmedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  versionHistory?: TemplateVersionRecord[];
  issuedCardsCount?: number;
}

export interface IdTemplateBundle {
  bundleFormat: 'joy-idtemplate-v1';
  exportedAt: string;
  exportedBy: string;
  checksum: string;
  template: IdCardCustomTemplate;
}

export interface DesignGuideSpecKit {
  orientation: 'portrait' | 'landscape';
  widthPx: number;
  heightPx: number;
  trimWidthMm: number;
  trimHeightMm: number;
  bleedMm: number;
  safeMarginMm: number;
  dpi: 300;
  svgGuideContent: string;
  svgDataUrl: string;
  readmeMarkdown: string;
}

export type UploadWizardStep = 'upload' | 'check_fit' | 'place_fields' | 'test' | 'publish';


