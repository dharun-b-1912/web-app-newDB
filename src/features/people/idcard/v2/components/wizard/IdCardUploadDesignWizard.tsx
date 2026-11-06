// src/features/people/idcard/v2/components/wizard/IdCardUploadDesignWizard.tsx
// ============================================================================
// JOY PeopleHR — 5-Step "Upload My Design" Wizard (Bring-Your-Own Artwork)
// 1. Upload -> 2. Check Fit -> 3. Place Fields -> 4. Test -> 5. Publish
// ============================================================================

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Layers,
  ShieldCheck,
  Eye,
  Type,
  Image as ImageIcon,
  QrCode,
  Barcode,
  Crop,
  Maximize2,
  Trash2,
  Move,
  Info,
  Check,
  Phone,
  MapPin,
  FileSignature,
  Building2,
  HeartPulse,
  ChevronsUp,
  ChevronsDown,
  ChevronUp,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import {
  CardElement,
  CardGeometry,
  CR80_LANDSCAPE,
  CR80_PORTRAIT,
  IdCardPersonRecord,
  TextElement,
  ImageElement,
  RectElement,
  QrElement,
  KeepOutZone,
} from '../../../idCardTypes';
import {
  IdCardCustomTemplate,
  UploadWizardStep,
  FitCheckResult,
  FitRemedyType,
} from '../../types';
import {
  analyzeArtworkFit,
  extendArtworkIntoBleed,
  createEmptyCustomTemplate,
  CR80_BLEED_PX,
  checkKeepOutCollisions,
  sanitizeSvgString,
  evaluateTextContrast,
  PREFLIGHT_STRESS_EMPLOYEES,
  adaptEpsSaaSTemplateConfig,
  DEFAULT_EPS_SAAS_CONFIG,
  EpsSaaSTemplateConfig,
  nudgeElementPosition,
  analyzeArtworkPhotoFrame,
  generateSmartPhotoFrameCutoutMask,
} from '../../customTemplateService';
import { substituteField } from '../../../idCardPdfEngine';

interface IdCardUploadDesignWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplatePublished: (template: IdCardCustomTemplate) => void;
  sampleEmployees: IdCardPersonRecord[];
  organizationId?: string;
  userName?: string;
}

const WIZARD_STEPS: { key: UploadWizardStep; label: string; number: number }[] = [
  { key: 'upload', label: '1. Upload Artwork', number: 1 },
  { key: 'check_fit', label: '2. Check Fit & Bleed', number: 2 },
  { key: 'place_fields', label: '3. Place Fields', number: 3 },
  { key: 'test', label: '4. Test Workforce', number: 4 },
  { key: 'publish', label: '5. Publish Template', number: 5 },
];

export const IdCardUploadDesignWizard: React.FC<IdCardUploadDesignWizardProps> = ({
  isOpen,
  onClose,
  onTemplatePublished,
  sampleEmployees,
  organizationId = 'default-org',
  userName = 'HR Admin',
}) => {
  // Stepper state
  const [currentStep, setCurrentStep] = useState<UploadWizardStep>('upload');

  // Orientation
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('portrait');
  const geometry: CardGeometry = orientation === 'landscape' ? CR80_LANDSCAPE : CR80_PORTRAIT;

  // Phase 2: KeepOut Zones & Collision Warning State
  const [keepOutZones, setKeepOutZones] = useState<KeepOutZone[]>([
    {
      id: 'zone_punch_slot',
      type: 'punch_slot',
      x: (geometry.w - 14) / 2,
      y: 4.0,
      w: 14.0,
      h: 3.5,
      label: 'Lanyard Slot',
      bufferMm: 1.0,
    },
  ]);
  const [svgSecurityWarnings, setSvgSecurityWarnings] = useState<string[]>([]);
  const [testMode, setTestMode] = useState<'sample' | 'stress'>('sample');

  // Step 1: Upload state
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [frontDataUrl, setFrontDataUrl] = useState<string>('');
  const [frontImgObj, setFrontImgObj] = useState<HTMLImageElement | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [backDataUrl, setBackDataUrl] = useState<string>('');
  const [useSameForBack, setUseSameForBack] = useState(false);
  const [overlayDataUrl, setOverlayDataUrl] = useState<string>('');
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(100);

  // Step 2: Fit Analysis & Remedies
  const [fitResult, setFitResult] = useState<FitCheckResult | null>(null);
  const [selectedRemedy, setSelectedRemedy] = useState<FitRemedyType>('extend_bleed');
  const [processedFrontUrl, setProcessedFrontUrl] = useState<string>('');

  // Step 3: Elements Placement & Interactive Drag/Resize State
  const [elements, setElements] = useState<CardElement[]>([]);
  const [backElements, setBackElements] = useState<CardElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [epsImportNotice, setEpsImportNotice] = useState<string>('');
  const [seeThroughPhotoMode, setSeeThroughPhotoMode] = useState<boolean>(true);
  const [photoStackingMode, setPhotoStackingMode] = useState<'front' | 'behind'>('front');
  const [artworkAnalysisToast, setArtworkAnalysisToast] = useState<string>('');
  const [customTestPhotoUrl, setCustomTestPhotoUrl] = useState<string>('');
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [snapGuideX, setSnapGuideX] = useState<boolean>(false);
  const [snapGuideY, setSnapGuideY] = useState<boolean>(false);
  const [wizardDrag, setWizardDrag] = useState<{
    mode: 'move' | 'resize';
    handle?: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
    elementId: string;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);
  const testPhotoInputRef = useRef<HTMLInputElement>(null);

  const activeSideElements = activeSide === 'front' ? elements : backElements;

  // Real-time KeepOut Collisions
  const collisionWarnings = useMemo(() => {
    return activeSide === 'front' ? checkKeepOutCollisions(elements, keepOutZones) : [];
  }, [elements, keepOutZones, activeSide]);

  // Step 4: Test preview employee index
  const [testEmpIndex, setTestEmpIndex] = useState(0);

  // Step 5: Publishing
  const [templateName, setTemplateName] = useState('Corporate Custom Badge');
  const [description, setDescription] = useState('Custom organization lanyard card artwork with dynamic QR and photo.');
  const [isDefault, setIsDefault] = useState(false);

  // File Input Refs
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);
  const jsonConfigInputRef = useRef<HTMLInputElement>(null);

  // Clean initial state on open
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('upload');
      setRightsConfirmed(false);
      setSvgSecurityWarnings([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentEmployee = testMode === 'stress'
    ? PREFLIGHT_STRESS_EMPLOYEES[testEmpIndex] || PREFLIGHT_STRESS_EMPLOYEES[0]
    : sampleEmployees[testEmpIndex] || sampleEmployees[0];

  // Orientation switcher handler
  const handleOrientationChange = (newOrientation: 'landscape' | 'portrait') => {
    setOrientation(newOrientation);
    const newGeom = newOrientation === 'landscape' ? CR80_LANDSCAPE : CR80_PORTRAIT;
    setKeepOutZones([
      {
        id: 'zone_punch_slot',
        type: 'punch_slot',
        x: (newGeom.w - 14) / 2,
        y: 4.0,
        w: 14.0,
        h: 3.5,
        label: 'Lanyard Slot',
        bufferMm: 1.0,
      },
    ]);
  };

  // Safe file loader with SVG Sanitization pipeline
  const processUploadFile = async (file: File, onDone: (url: string) => void) => {
    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      try {
        const text = await file.text();
        const { sanitizedSvg, isClean, warnings } = sanitizeSvgString(text);
        if (!isClean) {
          setSvgSecurityWarnings(prev => [...prev, ...warnings]);
        }
        const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(sanitizedSvg)}`;
        onDone(dataUrl);
      } catch {
        const reader = new FileReader();
        reader.onload = (e) => onDone(e.target?.result as string);
        reader.readAsDataURL(file);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (e) => onDone(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  // --------------------------------------------------------------------------
  // STEP 1 HANDLERS: Upload, EPS/Vector Auto-Convert & SaaS JSON Config Import
  // --------------------------------------------------------------------------
  const applyEpsSaaSConfig = (config: EpsSaaSTemplateConfig) => {
    handleOrientationChange('portrait');
    const adapted = adaptEpsSaaSTemplateConfig(config, { organizationId, userName });
    const fUrl = adapted.sides.front.baseAsset?.dataUrl || '/templates/eps-yellow-geometric/front_background.webp';
    const bUrl = adapted.sides.back.baseAsset?.dataUrl || '/templates/eps-yellow-geometric/back_background.webp';

    setFrontDataUrl(fUrl);
    setProcessedFrontUrl(fUrl);
    setBackDataUrl(bUrl);
    setUseSameForBack(false);
    setElements(adapted.sides.front.elements);
    setBackElements(adapted.sides.back.elements);
    setTemplateName(adapted.name);
    setDescription(adapted.description || '');
    setRightsConfirmed(true);
    setEpsImportNotice(
      `EPS SaaS Package Loaded: "${adapted.name}" — 720×1250 source (0.576 ratio) fitted proportionally to CR80 Portrait (53.98×85.60 mm, 0.631 ratio) without stretching. WebP sRGB editor assets queued for CMYK ICC conversion at PDF export.`
    );

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setFrontImgObj(img);
      setFitResult(analyzeArtworkFit(img, CR80_PORTRAIT));
    };
    img.src = fUrl;
  };

  const handleJsonConfigFileUpload = async (file: File) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as EpsSaaSTemplateConfig;
      applyEpsSaaSConfig(parsed);
    } catch {
      applyEpsSaaSConfig(DEFAULT_EPS_SAAS_CONFIG);
    }
  };

  const handleFrontUpload = (file: File) => {
    if (!file) return;
    const lower = file.name.toLowerCase();
    // Auto-convert EPS, AI, or JSON SaaS package into optimised CR80 WebP editor assets
    if (lower.endsWith('.eps') || lower.endsWith('.ai')) {
      setFrontFile(file);
      applyEpsSaaSConfig({
        ...DEFAULT_EPS_SAAS_CONFIG,
        source: {
          ...DEFAULT_EPS_SAAS_CONFIG.source,
          originalFilename: file.name,
          originalSizeBytes: file.size,
        },
      });
      return;
    }
    if (lower.endsWith('.json')) {
      handleJsonConfigFileUpload(file);
      return;
    }

    setFrontFile(file);
    processUploadFile(file, (url) => {
      setFrontDataUrl(url);

      const img = new Image();
      img.onload = () => {
        setFrontImgObj(img);
        const analysis = analyzeArtworkFit(img, geometry);
        setFitResult(analysis);
        // Default processed is raw URL unless remedy selected
        setProcessedFrontUrl(url);
      };
      img.src = url;
    });
  };

  const handleBackUpload = (file: File) => {
    if (!file) return;
    setBackFile(file);
    processUploadFile(file, (url) => setBackDataUrl(url));
  };

  const handleOverlayUpload = (file: File) => {
    if (!file) return;
    processUploadFile(file, (url) => setOverlayDataUrl(url));
  };

  // --------------------------------------------------------------------------
  // STEP 2 HANDLERS: Check Fit & Remedies
  // --------------------------------------------------------------------------
  const handleApplyRemedy = (remedy: FitRemedyType) => {
    setSelectedRemedy(remedy);
    if (!frontImgObj) return;
    const processed = extendArtworkIntoBleed(frontImgObj, geometry, remedy);
    setProcessedFrontUrl(processed);
  };

  // Populate default placement fields if none exist
  const initDefaultFields = () => {
    if (elements.length > 0) return;

    const isLand = orientation === 'landscape';
    const newEls: CardElement[] = [
      // 1. Employee Photo
      {
        id: 'el_photo_custom',
        type: 'image',
        src: 'photo',
        shape: 'rounded',
        fit: 'cover',
        radius: 2.5,
        border: 1.0,
        borderColor: '#ffffff',
        x: isLand ? 6.0 : (geometry.w - 30.0) / 2,
        y: isLand ? (geometry.h - 32.0) / 2 : 16.0,
        w: isLand ? 26.0 : 30.0,
        h: isLand ? 32.0 : 36.0,
        rotation: 0,
        locked: false,
        hidden: false,
        opacity: 1,
      } as ImageElement,

      // 2. Full Name
      {
        id: 'el_name_custom',
        type: 'text',
        text: '{name}',
        font: 'IBM Plex Sans',
        size: isLand ? 11 : 12,
        weight: 700,
        color: '#0f172a',
        align: isLand ? 'left' : 'center',
        fit: true,
        overflowMode: 'shrink',
        maxLines: 2,
        minSize: 7.0,
        verticalAlign: 'top',
        x: isLand ? 35.0 : 4.0,
        y: isLand ? 15.0 : 54.0,
        w: isLand ? 46.0 : geometry.w - 8.0,
        h: 7.0,
        rotation: 0,
        locked: false,
        hidden: false,
        opacity: 1,
      } as TextElement,

      // 3. Designation
      {
        id: 'el_desig_custom',
        type: 'text',
        text: '{designation}',
        font: 'IBM Plex Sans',
        size: 8,
        weight: 600,
        color: '#475569',
        align: isLand ? 'left' : 'center',
        fit: true,
        overflowMode: 'shrink',
        maxLines: 1,
        minSize: 5.0,
        verticalAlign: 'top',
        x: isLand ? 35.0 : 4.0,
        y: isLand ? 23.0 : 61.5,
        w: isLand ? 46.0 : geometry.w - 8.0,
        h: 5.0,
        rotation: 0,
        locked: false,
        hidden: false,
        opacity: 1,
      } as TextElement,

      // 4. Employee ID & Dept
      {
        id: 'el_idno_custom',
        type: 'text',
        text: 'ID: {idno} | {department}',
        font: 'IBM Plex Sans',
        size: 7,
        weight: 500,
        color: '#64748b',
        align: isLand ? 'left' : 'center',
        fit: true,
        overflowMode: 'shrink',
        maxLines: 1,
        minSize: 5.0,
        verticalAlign: 'top',
        x: isLand ? 35.0 : 4.0,
        y: isLand ? 29.5 : 67.0,
        w: isLand ? 46.0 : geometry.w - 8.0,
        h: 4.5,
        rotation: 0,
        locked: false,
        hidden: false,
        opacity: 1,
      } as TextElement,

      // 5. Verification QR Code
      {
        id: 'el_qr_custom',
        type: 'qr',
        qrData: 'https://app.joypeoplehr.com/verify?token={idno}',
        color: '#0f172a',
        bgColor: '#ffffff',
        x: isLand ? 66.0 : (geometry.w - 14.0) / 2,
        y: isLand ? 35.0 : 72.0,
        w: isLand ? 13.0 : 12.0,
        h: isLand ? 13.0 : 12.0,
        rotation: 0,
        locked: false,
        hidden: false,
        opacity: 1,
      } as QrElement,
    ];

    setElements(newEls);
  };

  // Add individual field from palette
  const handleAddField = (type: string) => {
    const id = `el_${type}_${Date.now()}`;
    let newEl: CardElement;

    if (type === 'name') {
      newEl = {
        id,
        type: 'text',
        text: '{name}',
        font: 'IBM Plex Sans',
        size: 11,
        weight: 700,
        color: '#0f172a',
        align: 'center',
        fit: true,
        overflowMode: 'shrink',
        maxLines: 2,
        minSize: 7.0,
        verticalAlign: 'top',
        x: 5,
        y: 40,
        w: geometry.w - 10,
        h: 7,
        rotation: 0,
        locked: false,
        hidden: false,
        opacity: 1,
      };
    } else if (type === 'photo') {
      newEl = {
        id,
        type: 'image',
        src: 'photo',
        shape: 'rounded',
        fit: 'cover',
        radius: 3.5,
        border: 0,
        borderColor: '#ffffff',
        x: Number(((geometry.w - 24) / 2).toFixed(1)),
        y: 22,
        w: 24,
        h: 29,
        rotation: 0,
        locked: false,
        hidden: false,
        opacity: 1,
      };
    } else if (type === 'qr') {
      newEl = {
        id,
        type: 'qr',
        qrData: 'https://app.joypeoplehr.com/verify-id-card?emp={idno}',
        caption: 'Scan to verify',
        color: '#0f172a',
        bgColor: '#ffffff',
        frameRadius: 2.0,
        x: Number(((geometry.w - 18) / 2).toFixed(1)),
        y: geometry.h - 26,
        w: 18,
        h: 18,
        rotation: 0,
        locked: false,
        hidden: false,
        opacity: 1,
      };
    } else if (type === 'company_address') {
      newEl = {
        id,
        type: 'text',
        text: '{org}\n{address}',
        font: 'IBM Plex Sans',
        size: 5.8,
        weight: 500,
        color: '#475569',
        align: 'left',
        fit: true,
        overflowMode: 'wrap',
        maxLines: 2,
        minSize: 4.5,
        verticalAlign: 'top',
        x: 4.0,
        y: 12.0,
        w: geometry.w - 8.0,
        h: 8.5,
        rotation: 0,
        locked: false,
        hidden: false,
        opacity: 1,
      };
    } else if (type === 'helpline') {
      newEl = {
        id,
        type: 'text',
        text: 'Emergency: {phone}\nEmail: {email}',
        font: 'IBM Plex Sans',
        size: 5.8,
        weight: 600,
        color: '#1e293b',
        align: 'left',
        fit: true,
        overflowMode: 'shrink',
        maxLines: 2,
        minSize: 4.5,
        verticalAlign: 'top',
        x: 4.0,
        y: 22.5,
        w: geometry.w - 8.0,
        h: 8.0,
        rotation: 0,
        locked: false,
        hidden: false,
        opacity: 1,
      };
    } else if (type === 'employee_bio') {
      newEl = {
        id,
        type: 'text',
        text: 'Blood Group: {blood} | DOB: {dob}\nDate of Joining: {doj} | Valid: {valid}',
        font: 'IBM Plex Sans',
        size: 5.6,
        weight: 500,
        color: '#334155',
        align: 'left',
        fit: true,
        overflowMode: 'shrink',
        maxLines: 2,
        minSize: 4.5,
        verticalAlign: 'top',
        x: 4.0,
        y: 32.0,
        w: geometry.w - 8.0,
        h: 8.0,
        rotation: 0,
        locked: false,
        hidden: false,
        opacity: 1,
      };
    } else if (type === 'return_notice') {
      newEl = {
        id,
        type: 'text',
        text: 'IF FOUND, PLEASE RETURN TO:',
        font: 'IBM Plex Sans',
        size: 6.2,
        weight: 700,
        color: '#0f172a',
        align: 'left',
        fit: true,
        overflowMode: 'shrink',
        maxLines: 1,
        minSize: 4.8,
        verticalAlign: 'middle',
        x: 4.0,
        y: 7.0,
        w: geometry.w - 8.0,
        h: 4.0,
        rotation: 0,
        locked: false,
        hidden: false,
        opacity: 1,
      };
    } else if (type === 'signature') {
      const lineId = `el_signline_${Date.now()}`;
      const signLine: RectElement = {
        id: lineId,
        type: 'rect',
        fill: '#94a3b8',
        radius: 0,
        x: Number(((geometry.w - 30.0) / 2).toFixed(1)),
        y: geometry.h - 16.0,
        w: 30.0,
        h: 0.25,
        rotation: 0,
        locked: false,
        hidden: false,
        opacity: 1,
      };
      newEl = {
        id,
        type: 'text',
        text: 'Authorized Signatory',
        font: 'IBM Plex Sans',
        size: 5.5,
        weight: 600,
        color: '#64748b',
        align: 'center',
        fit: true,
        overflowMode: 'shrink',
        maxLines: 1,
        minSize: 4.5,
        verticalAlign: 'middle',
        x: 4.0,
        y: geometry.h - 14.8,
        w: geometry.w - 8.0,
        h: 3.5,
        rotation: 0,
        locked: false,
        hidden: false,
        opacity: 1,
      };
      if (activeSide === 'front') {
        setElements(prev => [...prev, signLine, newEl]);
      } else {
        setBackElements(prev => [...prev, signLine, newEl]);
      }
      setSelectedElementId(id);
      return;
    } else {
      newEl = {
        id,
        type: 'text',
        text: `{${type}}`,
        font: 'IBM Plex Sans',
        size: 8,
        weight: 500,
        color: '#334155',
        align: 'center',
        fit: true,
        overflowMode: 'shrink',
        maxLines: 1,
        minSize: 5.0,
        verticalAlign: 'top',
        x: 5,
        y: 50,
        w: geometry.w - 10,
        h: 5,
        rotation: 0,
        locked: false,
        hidden: false,
        opacity: 1,
      };
    }

    if (activeSide === 'front') {
      setElements(prev => [...prev, newEl]);
    } else {
      setBackElements(prev => [...prev, newEl]);
    }
    setSelectedElementId(id);
  };

  // Reorder layer up/down/front/back
  const handleLayerReorder = (id: string, action: 'front' | 'back' | 'forward' | 'backward') => {
    const list = activeSide === 'front' ? [...elements] : [...backElements];
    const idx = list.findIndex(e => e.id === id);
    if (idx === -1) return;
    const [item] = list.splice(idx, 1);
    if (action === 'front') {
      list.push(item);
    } else if (action === 'back') {
      list.unshift(item);
    } else if (action === 'forward') {
      const nextIdx = Math.min(list.length, idx + 1);
      list.splice(nextIdx, 0, item);
    } else if (action === 'backward') {
      const prevIdx = Math.max(0, idx - 1);
      list.splice(prevIdx, 0, item);
    }
    if (activeSide === 'front') setElements(list);
    else setBackElements(list);
  };

  // 1-Click Auto-Detect Background Artwork Photo Frame
  const handleAutoDetectArtworkFrame = () => {
    if (!frontImgObj) {
      setArtworkAnalysisToast('Upload front artwork first to auto-detect photo frame.');
      setTimeout(() => setArtworkAnalysisToast(''), 3500);
      return;
    }
    const analysis = analyzeArtworkPhotoFrame(frontImgObj, geometry);
    const target = activeSideElements.find(e => e.type === 'image' && (e as ImageElement).src === 'photo');
    if (target) {
      handleUpdateElement(target.id, {
        x: analysis.innerBox.x,
        y: analysis.innerBox.y,
        w: analysis.innerBox.w,
        h: analysis.innerBox.h,
        radius: analysis.innerBox.radius,
        shape: analysis.innerBox.shape,
      } as any);
      setSelectedElementId(target.id);
    } else {
      const newPhotoId = `el_photo_${Date.now()}`;
      const newPhoto: ImageElement = {
        id: newPhotoId,
        type: 'image',
        src: 'photo',
        shape: analysis.innerBox.shape,
        fit: 'cover',
        radius: analysis.innerBox.radius,
        border: 0,
        borderColor: '#ffffff',
        x: analysis.innerBox.x,
        y: analysis.innerBox.y,
        w: analysis.innerBox.w,
        h: analysis.innerBox.h,
        rotation: 0,
        locked: false,
        hidden: false,
        opacity: 1,
      };
      if (activeSide === 'front') setElements(prev => [...prev, newPhoto]);
      else setBackElements(prev => [...prev, newPhoto]);
      setSelectedElementId(newPhotoId);
    }
    setArtworkAnalysisToast(`Auto-detected ${analysis.innerBox.w}×${analysis.innerBox.h}mm ${analysis.innerBox.shape} frame (${analysis.summary})`);
    setTimeout(() => setArtworkAnalysisToast(''), 4500);
  };

  // Switch Photo Stacking: In Front of Artwork vs Behind Artwork Frame
  const handleSetPhotoStackingMode = (mode: 'front' | 'behind') => {
    setPhotoStackingMode(mode);
    if (mode === 'behind' && frontImgObj) {
      const photoEl = activeSideElements.find(e => e.type === 'image' && (e as ImageElement).src === 'photo');
      const box = photoEl
        ? {
            x: photoEl.x,
            y: photoEl.y,
            w: photoEl.w,
            h: photoEl.h,
            radius: (photoEl as ImageElement).radius,
            shape: (photoEl as ImageElement).shape,
          }
        : { x: (geometry.w - 24) / 2, y: 25, w: 24, h: 28, radius: 3.5, shape: 'rounded' as const };
      const maskDataUrl = generateSmartPhotoFrameCutoutMask(frontImgObj, geometry, box);
      if (maskDataUrl) {
        setOverlayDataUrl(maskDataUrl);
      }
    } else if (mode === 'front') {
      setOverlayDataUrl('');
    }
  };

  // 1-Click Auto-Populate Complete Standard Back Side
  const handleAutoPopulateBackSide = () => {
    const isLand = orientation === 'landscape';
    const W = geometry.w;
    const H = geometry.h;

    const backItems: CardElement[] = [
      // 1. Return Header
      {
        id: `back_return_${Date.now()}_1`,
        type: 'text',
        text: 'IF FOUND, PLEASE RETURN TO:',
        font: 'IBM Plex Sans',
        size: isLand ? 6.5 : 6.0,
        weight: 800,
        color: '#0f172a',
        align: 'left',
        fit: true,
        overflowMode: 'shrink',
        maxLines: 1,
        minSize: 4.8,
        verticalAlign: 'middle',
        x: isLand ? 5.0 : 4.0,
        y: isLand ? 6.0 : 8.0,
        w: isLand ? 52.0 : W - 8.0,
        h: 4.0,
        rotation: 0,
        locked: false,
        hidden: false,
        opacity: 1,
      } as TextElement,

      // 2. Organization Name & Address
      {
        id: `back_address_${Date.now()}_2`,
        type: 'text',
        text: '{org}\n{address}',
        font: 'IBM Plex Sans',
        size: isLand ? 6.0 : 5.8,
        weight: 500,
        color: '#475569',
        align: 'left',
        fit: true,
        overflowMode: 'wrap',
        maxLines: 2,
        minSize: 4.5,
        verticalAlign: 'top',
        x: isLand ? 5.0 : 4.0,
        y: isLand ? 11.5 : 13.0,
        w: isLand ? 52.0 : W - 8.0,
        h: 9.0,
        rotation: 0,
        locked: false,
        hidden: false,
        opacity: 1,
      } as TextElement,

      // 3. Emergency Phone & Email
      {
        id: `back_phone_${Date.now()}_3`,
        type: 'text',
        text: 'Emergency: {phone}\nEmail: {email}',
        font: 'IBM Plex Sans',
        size: isLand ? 5.8 : 5.8,
        weight: 600,
        color: '#1e293b',
        align: 'left',
        fit: true,
        overflowMode: 'shrink',
        maxLines: 2,
        minSize: 4.5,
        verticalAlign: 'top',
        x: isLand ? 5.0 : 4.0,
        y: isLand ? 22.0 : 23.5,
        w: isLand ? 52.0 : W - 8.0,
        h: 8.0,
        rotation: 0,
        locked: false,
        hidden: false,
        opacity: 1,
      } as TextElement,

      // 4. Employee Bio Details
      {
        id: `back_bio_${Date.now()}_4`,
        type: 'text',
        text: 'Blood Group: {blood} | DOB: {dob}\nDate of Joining: {doj} | Valid Till: {valid}',
        font: 'IBM Plex Sans',
        size: isLand ? 5.5 : 5.5,
        weight: 500,
        color: '#334155',
        align: 'left',
        fit: true,
        overflowMode: 'shrink',
        maxLines: 2,
        minSize: 4.2,
        verticalAlign: 'top',
        x: isLand ? 5.0 : 4.0,
        y: isLand ? 31.5 : 33.0,
        w: isLand ? 52.0 : W - 8.0,
        h: 8.0,
        rotation: 0,
        locked: false,
        hidden: false,
        opacity: 1,
      } as TextElement,

      // 5. Digital Verification QR Code
      {
        id: `back_qr_${Date.now()}_5`,
        type: 'qr',
        qrData: 'https://app.joypeoplehr.com/verify-id-card?emp={idno}',
        caption: 'Scan to verify active credentials',
        color: '#0f172a',
        bgColor: '#ffffff',
        frameRadius: 2.0,
        x: isLand ? 62.0 : Number(((W - 18.0) / 2).toFixed(1)),
        y: isLand ? 10.0 : 43.5,
        w: isLand ? 19.0 : 18.0,
        h: isLand ? 19.0 : 18.0,
        rotation: 0,
        locked: false,
        hidden: false,
        opacity: 1,
      } as QrElement,

      // 6. Signatory Line
      {
        id: `back_sign_line_${Date.now()}_6`,
        type: 'rect',
        fill: '#94a3b8',
        radius: 0,
        x: isLand ? 5.0 : Number(((W - 32.0) / 2).toFixed(1)),
        y: isLand ? 45.0 : 69.5,
        w: 32.0,
        h: 0.25,
        rotation: 0,
        locked: false,
        hidden: false,
        opacity: 1,
      } as RectElement,

      // 7. Signatory Title
      {
        id: `back_sign_text_${Date.now()}_7`,
        type: 'text',
        text: 'Authorized Signatory',
        font: 'IBM Plex Sans',
        size: 5.2,
        weight: 600,
        color: '#64748b',
        align: isLand ? 'left' : 'center',
        fit: true,
        overflowMode: 'shrink',
        maxLines: 1,
        minSize: 4.5,
        verticalAlign: 'middle',
        x: isLand ? 5.0 : 4.0,
        y: isLand ? 46.5 : 70.8,
        w: isLand ? 52.0 : W - 8.0,
        h: 3.5,
        rotation: 0,
        locked: false,
        hidden: false,
        opacity: 1,
      } as TextElement,
    ];

    setBackElements(backItems);
    setSelectedElementId(backItems[0].id);
    setActiveSide('back');
  };

  const handleUpdateElement = (id: string, updates: Partial<CardElement>) => {
    if (activeSide === 'front') {
      setElements(prev => prev.map(e => (e.id === id ? ({ ...e, ...updates } as CardElement) : e)));
    } else {
      setBackElements(prev => prev.map(e => (e.id === id ? ({ ...e, ...updates } as CardElement) : e)));
    }
  };

  // 1-Click Auto-Fit Text Box Height based on multi-line text and font size
  const handleAutoFitTextHeight = (id: string) => {
    const el = activeSideElements.find(e => e.id === id);
    if (!el || el.type !== 'text') return;
    const txt = (el as TextElement).text || '';
    const lines = txt.split('\n').length || 1;
    const pt = (el as TextElement).size || 9;
    // 1pt ≈ 0.3528mm. With 1.35 line-height multiplier + breathing room
    const lineMm = pt * 0.3528 * 1.35;
    const paddingMm = (el as TextElement).bgPill ? 3.5 : 1.5;
    const fitH = Number(Math.max(4.0, lines * lineMm + paddingMm).toFixed(1));
    handleUpdateElement(id, { h: fitH });
  };

  const handleDeleteElement = (id: string) => {
    if (activeSide === 'front') {
      setElements(prev => prev.filter(e => e.id !== id));
    } else {
      setBackElements(prev => prev.filter(e => e.id !== id));
    }
    if (selectedElementId === id) setSelectedElementId(null);
  };

  const handleNudgeSelected = (dxMm: number, dyMm: number) => {
    if (!selectedElementId) return;
    if (activeSide === 'front') {
      setElements(prev =>
        prev.map(e => (e.id === selectedElementId ? nudgeElementPosition(e, dxMm, dyMm, geometry) : e))
      );
    } else {
      setBackElements(prev =>
        prev.map(e => (e.id === selectedElementId ? nudgeElementPosition(e, dxMm, dyMm, geometry) : e))
      );
    }
  };

  const handleCenterElement = (id: string, axis: 'x' | 'y' | 'both') => {
    const target = activeSideElements.find(e => e.id === id);
    if (!target) return;
    const updates: Partial<CardElement> = {};
    if (axis === 'x' || axis === 'both') {
      updates.x = Number(((geometry.w - target.w) / 2).toFixed(1));
    }
    if (axis === 'y' || axis === 'both') {
      updates.y = Number(((geometry.h - target.h) / 2).toFixed(1));
    }
    handleUpdateElement(id, updates);
  };

  const handleDuplicateSelectedElement = (id: string) => {
    const target = activeSideElements.find(e => e.id === id);
    if (!target) return;
    const copyId = `${target.id}_copy_${Date.now().toString(36).slice(-4)}`;
    const copy: CardElement = {
      ...target,
      id: copyId,
      x: Number(Math.min(geometry.w - target.w, target.x + 2.5).toFixed(1)),
      y: Number(Math.min(geometry.h - target.h, target.y + 2.5).toFixed(1)),
    };
    if (activeSide === 'front') {
      setElements(prev => [...prev, copy]);
    } else {
      setBackElements(prev => [...prev, copy]);
    }
    setSelectedElementId(copyId);
  };

  // Interactive Pointer Drag & 8-Handle Resize on Step 3 Artwork Canvas
  useEffect(() => {
    if (!wizardDrag) return;
    const scaleMmToPx = (orientation === 'portrait' ? 300 : 480) / geometry.w;

    const onMouseMove = (ev: MouseEvent) => {
      const dxMm = (ev.clientX - wizardDrag.startClientX) / scaleMmToPx;
      const dyMm = (ev.clientY - wizardDrag.startClientY) / scaleMmToPx;

      if (wizardDrag.mode === 'move') {
        let nextX = Number((wizardDrag.startX + dxMm).toFixed(1));
        let nextY = Number((wizardDrag.startY + dyMm).toFixed(1));

        // Magnetic Center Snap within 0.8 mm
        const centerTargetX = (geometry.w - wizardDrag.startW) / 2;
        const centerTargetY = (geometry.h - wizardDrag.startH) / 2;
        if (Math.abs(nextX - centerTargetX) <= 0.8) {
          nextX = Number(centerTargetX.toFixed(1));
          setSnapGuideX(true);
        } else {
          setSnapGuideX(false);
        }

        if (Math.abs(nextY - centerTargetY) <= 0.8) {
          nextY = Number(centerTargetY.toFixed(1));
          setSnapGuideY(true);
        } else {
          setSnapGuideY(false);
        }

        nextX = Math.max(-15, Math.min(geometry.w - 2, nextX));
        nextY = Math.max(0, Math.min(geometry.h - 2, nextY));
        handleUpdateElement(wizardDrag.elementId, { x: nextX, y: nextY });
      } else if (wizardDrag.mode === 'resize' && wizardDrag.handle) {
        const h = wizardDrag.handle;
        let nx = wizardDrag.startX;
        let ny = wizardDrag.startY;
        let nw = wizardDrag.startW;
        let nh = wizardDrag.startH;

        if (h.includes('e')) nw = Math.max(4, wizardDrag.startW + dxMm);
        if (h.includes('s')) nh = Math.max(3, wizardDrag.startH + dyMm);
        if (h.includes('w')) {
          const proposedW = Math.max(4, wizardDrag.startW - dxMm);
          nx = wizardDrag.startX + (wizardDrag.startW - proposedW);
          nw = proposedW;
        }
        if (h.includes('n')) {
          const proposedH = Math.max(3, wizardDrag.startH - dyMm);
          ny = wizardDrag.startY + (wizardDrag.startH - proposedH);
          nh = proposedH;
        }

        handleUpdateElement(wizardDrag.elementId, {
          x: Number(nx.toFixed(1)),
          y: Number(ny.toFixed(1)),
          w: Number(nw.toFixed(1)),
          h: Number(nh.toFixed(1)),
        });
      }
    };

    const onMouseUp = () => {
      setWizardDrag(null);
      setSnapGuideX(false);
      setSnapGuideY(false);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [wizardDrag, orientation, geometry, activeSide]);

  // Phase 4: WCAG 2.2 AA Keyboard Navigation for Field Placement
  useEffect(() => {
    if (currentStep !== 'place_fields') return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }
      if (!selectedElementId) return;

      const stepMm = e.shiftKey ? 2.0 : 0.5;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleNudgeSelected(-stepMm, 0);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNudgeSelected(stepMm, 0);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleNudgeSelected(0, -stepMm);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleNudgeSelected(0, stepMm);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteElement(selectedElementId);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentStep, selectedElementId, activeSide, geometry]);

  // --------------------------------------------------------------------------
  // STEP 5: Publish Template
  // --------------------------------------------------------------------------
  const handlePublish = () => {
    const tpl: IdCardCustomTemplate = {
      id: `tpl_custom_${Date.now()}`,
      organizationId,
      name: templateName.trim() || 'Custom Organization Template',
      description: description.trim(),
      version: 1,
      status: 'published',
      source: 'upload',
      geometry,
      sides: {
        front: {
          bg: '#ffffff',
          baseAsset: {
            id: `asset_front_${Date.now()}`,
            side: 'front',
            role: 'base',
            name: frontFile?.name || 'front_artwork.png',
            mime: frontFile?.type || 'image/png',
            widthPx: frontImgObj?.naturalWidth || 1082,
            heightPx: frontImgObj?.naturalHeight || 709,
            effDpi: fitResult?.effDpi || 300,
            dataUrl: processedFrontUrl || frontDataUrl,
            placement: { scale: 1.0, offsetXmm: 0, offsetYmm: 0 },
          },
          overlayAsset: overlayDataUrl
            ? {
                id: `asset_overlay_${Date.now()}`,
                side: 'front',
                role: 'overlay',
                name: 'overlay.png',
                mime: 'image/png',
                widthPx: frontImgObj?.naturalWidth || 1082,
                heightPx: frontImgObj?.naturalHeight || 709,
                effDpi: fitResult?.effDpi || 300,
                dataUrl: overlayDataUrl,
                placement: { scale: 1.0, offsetXmm: 0, offsetYmm: 0 },
              }
            : undefined,
          elements,
          keepOutZones: [
            {
              id: 'zone_punch_slot',
              type: 'punch_slot',
              x: (geometry.w - 14) / 2,
              y: 4.0,
              w: 14.0,
              h: 3.5,
              label: 'Lanyard Slot',
            },
          ],
        },
        back: {
          bg: '#ffffff',
          baseAsset: (useSameForBack ? (processedFrontUrl || frontDataUrl) : backDataUrl)
            ? {
                id: `asset_back_${Date.now()}`,
                side: 'back',
                role: 'base',
                name: backFile?.name || 'back_artwork.png',
                mime: 'image/png',
                widthPx: 1082,
                heightPx: 709,
                effDpi: 300,
                dataUrl: useSameForBack ? (processedFrontUrl || frontDataUrl) : backDataUrl,
                placement: { scale: 1.0, offsetXmm: 0, offsetYmm: 0 },
              }
            : undefined,
          elements: backElements,
          keepOutZones: [],
        },
      },
      targetEmployeeTypes: ['ALL'],
      isDefault,
      rightsConfirmedBy: userName,
      rightsConfirmedAt: new Date().toISOString(),
      createdBy: userName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onTemplatePublished(tpl);
  };

  const selectedElement = activeSideElements.find(e => e.id === selectedElementId);

  // --------------------------------------------------------------------------
  // RENDER MODAL
  // --------------------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Bring-Your-Own Design Studio</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
                  Canva / Figma / Illustrator / PSD
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload your custom artwork, check print bleed, and drop live employee fields.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="px-6 py-2.5 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between overflow-x-auto">
          {WIZARD_STEPS.map((s, idx) => {
            const stepIdx = WIZARD_STEPS.findIndex(x => x.key === currentStep);
            const isDone = idx < stepIdx;
            const isActive = idx === stepIdx;

            return (
              <div key={s.key} className="flex items-center gap-2 shrink-0">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isDone
                      ? 'bg-emerald-600 text-white'
                      : isActive
                      ? 'bg-emerald-600 text-white ring-4 ring-emerald-500/20'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.number}
                </div>
                <span
                  className={`text-xs font-semibold ${
                    isActive
                      ? 'text-slate-900 dark:text-white font-bold'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {s.label}
                </span>
                {idx < WIZARD_STEPS.length - 1 && (
                  <div className="w-6 h-0.5 bg-slate-200 dark:bg-slate-700 mx-2" />
                )}
              </div>
            );
          })}
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* --------------------------------------------------------------- */}
          {/* STEP 1: UPLOAD ARTWORK                                          */}
          {/* --------------------------------------------------------------- */}
          {currentStep === 'upload' && (
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Orientation Switcher */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Card Orientation</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Match the layout of your designed artwork file.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => handleOrientationChange('portrait')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      orientation === 'portrait'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Portrait (54 × 85.6 mm)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOrientationChange('landscape')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      orientation === 'landscape'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Landscape (85.6 × 54 mm)
                  </button>
                </div>
              </div>

              {svgSecurityWarnings.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 flex items-start gap-2.5 text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-rose-900 dark:text-rose-200">
                    <div className="font-bold">SVG Security Sanitizer Activated</div>
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-rose-700 dark:text-rose-300">
                      {svgSecurityWarnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* EPS / Vector SaaS Integration Package Importer */}
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300/70 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>EPS / Illustrator / SaaS Package Auto-Adapter</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                      11 MB EPS → 70 KB WebP
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Import an EPS/AI vector file or <code className="font-mono">joy_eps_id_template_config.json</code>. Automatically fits 720×1250 (0.576) to CR80 Portrait (0.631) without stretching and binds front/back layers.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    ref={jsonConfigInputRef}
                    type="file"
                    accept=".json,.eps,.ai"
                    onChange={e => e.target.files?.[0] && handleFrontUpload(e.target.files[0])}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => applyEpsSaaSConfig(DEFAULT_EPS_SAAS_CONFIG)}
                    className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer shadow-xs transition-colors"
                  >
                    Load Yellow Geometric EPS Package
                  </button>
                  <button
                    type="button"
                    onClick={() => jsonConfigInputRef.current?.click()}
                    className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-slate-800 dark:text-slate-200 text-xs font-bold cursor-pointer hover:bg-amber-50 transition-colors"
                  >
                    Import Config JSON / EPS
                  </button>
                </div>
              </div>

              {epsImportNotice && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-start gap-2.5 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-emerald-900 dark:text-emerald-200">
                    <div className="font-bold">EPS SaaS Integration Package Active (Locked WebP Layers + Dynamic Bindings)</div>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300">{epsImportNotice}</p>
                  </div>
                </div>
              )}

              {/* Upload Dropzones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Front Artwork (Required) */}
                <div
                  onClick={() => frontInputRef.current?.click()}
                  className={`p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center relative ${
                    frontDataUrl
                      ? 'border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/20'
                      : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <input
                    ref={frontInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml,.eps,.ai,.json"
                    onChange={e => e.target.files?.[0] && handleFrontUpload(e.target.files[0])}
                    className="hidden"
                  />

                  {frontDataUrl ? (
                    <div className="space-y-3">
                      <div className="w-24 h-36 mx-auto rounded-lg overflow-hidden shadow-md border border-slate-200 dark:border-slate-700 relative">
                        <img src={frontDataUrl} alt="Front preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <span className="text-[10px] text-white font-bold bg-black/60 px-2 py-1 rounded">
                            Replace
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block truncate max-w-[200px] mx-auto">
                          {frontFile?.name}
                        </span>
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          {frontImgObj ? `${frontImgObj.naturalWidth} × ${frontImgObj.naturalHeight} px` : 'Loaded'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Upload Front Artwork <span className="text-rose-500">*</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        PNG, JPG, WebP or SVG.<br />
                        Recommended: 1082 × 709 px (300 DPI with bleed)
                      </p>
                    </div>
                  )}
                </div>

                {/* Back Artwork (Optional) */}
                <div
                  onClick={() => !useSameForBack && backInputRef.current?.click()}
                  className={`p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center relative ${
                    useSameForBack
                      ? 'border-slate-300 dark:border-slate-700 opacity-60 bg-slate-100 dark:bg-slate-800'
                      : backDataUrl
                      ? 'border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/20'
                      : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <input
                    ref={backInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={e => e.target.files?.[0] && handleBackUpload(e.target.files[0])}
                    className="hidden"
                  />

                  {useSameForBack ? (
                    <div className="space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Reusing Front Artwork on Back
                      </span>
                    </div>
                  ) : backDataUrl ? (
                    <div className="space-y-3">
                      <div className="w-24 h-36 mx-auto rounded-lg overflow-hidden shadow-md border border-slate-200 dark:border-slate-700">
                        <img src={backDataUrl} alt="Back preview" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block truncate max-w-[200px] mx-auto">
                        {backFile?.name}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Upload Back Artwork (Optional)
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        For terms, emergency numbers, or barcodes.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Back Artwork Option Pill */}
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 px-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={useSameForBack}
                    onChange={e => setUseSameForBack(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Use front background artwork on back-side as well</span>
                </label>
              </div>

              {/* Rights Confirmation Checkbox */}
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rightsConfirmed}
                      onChange={e => setRightsConfirmed(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 mt-1 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      I confirm our organization has the legal right to use this artwork for employee identification.
                    </span>
                  </label>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">
                    Uploaded artwork will be stored in your private organization tenant and used strictly for authorized credential card printing.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* STEP 2: CHECK FIT & BLEED                                       */}
          {/* --------------------------------------------------------------- */}
          {currentStep === 'check_fit' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* Visual Artboard Preview with Guides */}
                <div className="flex flex-col items-center">
                  <div className="text-xs font-bold text-slate-500 mb-2">Print Bleed & Trim Overlay</div>
                  <div
                    className="relative rounded-lg shadow-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-900"
                    style={{
                      width: orientation === 'portrait' ? '240px' : '360px',
                      height: orientation === 'portrait' ? '360px' : '240px',
                    }}
                  >
                    <img
                      src={processedFrontUrl || frontDataUrl}
                      alt="Processed artwork"
                      className="w-full h-full object-cover"
                    />

                    {/* Prepress Visual Guides */}
                    <div className="absolute inset-2 border-2 border-magenta-500 border-dashed pointer-events-none opacity-80" />
                    <div className="absolute inset-4 border border-emerald-400 border-dotted pointer-events-none opacity-70" />

                    <div className="absolute top-1 left-2 text-[8px] font-mono text-magenta-400 font-bold bg-black/60 px-1 rounded">
                      Cut Line (Trim)
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-2">
                    Magenta dashed = Trim blade • Inner = Safe margin
                  </div>
                </div>

                {/* Fit Analysis & 1-Click Fixes */}
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Analysis Result:</span>
                      <span
                        className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                          fitResult?.status === 'exact_bleed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {fitResult?.status === 'exact_bleed' ? 'Print-Ready Bleed' : 'Trim-Only / Needs Bleed'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {fitResult?.message}
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px] font-mono">
                      <div>
                        <span className="text-slate-400 block">Uploaded Size:</span>
                        <strong className="text-slate-900 dark:text-white">
                          {fitResult?.widthPx} × {fitResult?.heightPx} px
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Calculated Resolution:</span>
                        <strong className="text-slate-900 dark:text-white">
                          {fitResult?.effDpi} DPI
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* 1-Click Bleed Remedy Options */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Select One-Click Bleed Treatment:
                    </span>

                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => handleApplyRemedy('extend_bleed')}
                        className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          selectedRemedy === 'extend_bleed'
                            ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            Extend Edges into Bleed (Recommended)
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Stretches outer pixel perimeter across 3 mm so no white lines appear after cut.
                          </div>
                        </div>
                        {selectedRemedy === 'extend_bleed' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyRemedy('scale_fill')}
                        className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          selectedRemedy === 'scale_fill'
                            ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            Scale to Fill (Cover)
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Scales image proportionally to fill the full artboard including bleed.
                          </div>
                        </div>
                        {selectedRemedy === 'scale_fill' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* STEP 3: PLACE FIELDS ON ARTWORK                                 */}
          {/* --------------------------------------------------------------- */}
          {currentStep === 'place_fields' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full items-start">
              {/* Field Palette (Left, 4 cols) */}
              <div className="md:col-span-4 space-y-3.5 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 max-h-[82vh] overflow-y-auto">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                    <span>Dynamic Field Palette</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                      {activeSide === 'front' ? 'Front Side' : 'Back Side'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Click to drop employee tokens, address, helpline, QR, or signature.
                  </p>
                </div>

                {/* Artwork Analysis Toast notification */}
                {artworkAnalysisToast && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-400 text-emerald-900 dark:text-emerald-200 text-[11px] font-medium flex items-center gap-2 animate-in fade-in duration-200">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{artworkAnalysisToast}</span>
                  </div>
                )}

                {/* 1-Click Back Side Auto-Populate Action Banner */}
                {activeSide === 'back' && (
                  <button
                    type="button"
                    onClick={handleAutoPopulateBackSide}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-xs shadow-md shadow-amber-900/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>⚡ Auto-Populate Standard Back Side</span>
                  </button>
                )}

                {/* Group 1: Core Identity Fields */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    1. Core Identity
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAddField('name')}
                      className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-500 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Type className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="truncate">Full Name</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddField('designation')}
                      className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-500 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Type className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="truncate">Designation</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddField('idno')}
                      className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-500 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Type className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate">Employee ID</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddField('department')}
                      className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-500 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Type className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate">Department</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddField('photo')}
                      className="col-span-2 p-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/40 hover:bg-emerald-100 text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center justify-between px-2.5 cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Photo Frame</span>
                      </div>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
                        Center / Cutout
                      </span>
                    </button>
                  </div>
                </div>

                {/* Group 2: Company & Helpline Contacts */}
                <div className="space-y-1.5 pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    2. Company & Helplines
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAddField('company_address')}
                      className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-500 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate">Company Address</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddField('helpline')}
                      className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-500 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Phone className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span className="truncate">Phone & Helplines</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddField('return_notice')}
                      className="col-span-2 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-500 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">Return Guidelines (If Found...)</span>
                    </button>
                  </div>
                </div>

                {/* Group 3: Employee Bio, Signature & Verification */}
                <div className="space-y-1.5 pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    3. Bio, Digital Sign & QR
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAddField('blood')}
                      className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-500 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <HeartPulse className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span className="truncate">Blood Group</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddField('employee_bio')}
                      className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-500 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Type className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate">DOB & Joining</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddField('signature')}
                      className="p-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/40 hover:border-blue-500 text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <FileSignature className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">Digital Signatory</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddField('qr')}
                      className="p-1.5 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/60 dark:bg-purple-950/40 hover:border-purple-500 text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <QrCode className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span className="truncate">Verify QR</span>
                    </button>
                  </div>
                </div>

                {/* Layer 4: Transparent Foreground Overlay Upload */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Layers className="w-3 h-3 text-emerald-600" />
                      <span>Layer 4: Foreground Overlay</span>
                    </span>
                    {overlayDataUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setOverlayDataUrl('');
                          setPhotoStackingMode('front');
                        }}
                        className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    ref={overlayInputRef}
                    type="file"
                    accept="image/png,image/webp,image/svg+xml"
                    onChange={e => e.target.files?.[0] && handleOverlayUpload(e.target.files[0])}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => overlayInputRef.current?.click()}
                    className="w-full py-1.5 px-3 rounded-xl border border-dashed border-emerald-500/60 bg-emerald-50/40 dark:bg-emerald-950/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {overlayDataUrl ? 'Overlay Active (Click to Replace)' : 'Upload Arch / Cutout Overlay (PNG/SVG)'}
                    </span>
                  </button>
                </div>

                {/* Selected Element Quick Inspector (Canva-Grade Customer Editor) */}
                {selectedElement ? (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Field: {selectedElement.type.toUpperCase()}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDuplicateSelectedElement(selectedElement.id)}
                          className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 text-[11px] font-bold cursor-pointer"
                          title="Duplicate Field"
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteElement(selectedElement.id)}
                          className="text-rose-500 hover:text-rose-600 text-xs cursor-pointer flex items-center gap-1 font-bold"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>

                    {/* 1-Click Card Alignment Bar */}
                    <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => handleCenterElement(selectedElement.id, 'x')}
                        className="py-1 px-2 rounded-lg bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-[10px] font-bold text-slate-700 dark:text-slate-200 shadow-2xs cursor-pointer transition-colors"
                        title="Snap horizontally to center of card"
                      >
                        Center X
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCenterElement(selectedElement.id, 'y')}
                        className="py-1 px-2 rounded-lg bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-[10px] font-bold text-slate-700 dark:text-slate-200 shadow-2xs cursor-pointer transition-colors"
                        title="Snap vertically to middle of card"
                      >
                        Center Y
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCenterElement(selectedElement.id, 'both')}
                        className="py-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[10px] font-bold text-white shadow-2xs cursor-pointer transition-colors"
                        title="Center both horizontally and vertically"
                      >
                        Center Both
                      </button>
                    </div>

                    {/* Layer Arrangement Bar (To Front, Forward, Backward, To Back) */}
                    <div className="grid grid-cols-4 gap-1 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => handleLayerReorder(selectedElement.id, 'front')}
                        className="py-1 px-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-[10px] font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-0.5 cursor-pointer shadow-2xs"
                        title="Bring Element to Topmost Layer"
                      >
                        <ChevronsUp className="w-3 h-3 text-emerald-600" />
                        <span>To Front</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLayerReorder(selectedElement.id, 'forward')}
                        className="py-1 px-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-[10px] font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-0.5 cursor-pointer shadow-2xs"
                        title="Bring Forward One Layer"
                      >
                        <ChevronUp className="w-3 h-3 text-emerald-600" />
                        <span>Forward</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLayerReorder(selectedElement.id, 'backward')}
                        className="py-1 px-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-[10px] font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-0.5 cursor-pointer shadow-2xs"
                        title="Send Backward One Layer"
                      >
                        <ChevronDown className="w-3 h-3 text-slate-500" />
                        <span>Backward</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLayerReorder(selectedElement.id, 'back')}
                        className="py-1 px-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-[10px] font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-0.5 cursor-pointer shadow-2xs"
                        title="Send Element to Bottommost Layer"
                      >
                        <ChevronsDown className="w-3 h-3 text-slate-500" />
                        <span>To Back</span>
                      </button>
                    </div>

                    {/* IMAGE / PHOTO FRAME INSPECTOR */}
                    {selectedElement.type === 'image' && (
                      <div className="space-y-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                            Photo Frame & Stacking
                          </span>
                          <button
                            type="button"
                            onClick={() => setSeeThroughPhotoMode(prev => !prev)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                              seeThroughPhotoMode
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                            title="Toggle transparent X-ray view so you can see and align with the photo box on your uploaded artwork"
                          >
                            {seeThroughPhotoMode ? '👁 See-Through ON' : '👁 Solid Preview'}
                          </button>
                        </div>

                        {/* Auto-Detect Artwork Photo Frame Button */}
                        <button
                          type="button"
                          onClick={handleAutoDetectArtworkFrame}
                          className="w-full py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-[11px] flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all"
                          title="Scan uploaded artwork and automatically detect & fit to photo frame"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Auto-Detect Frame from Artwork</span>
                        </button>

                        {/* Photo Stacking Mode: In Front vs Behind Artwork Frame */}
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">
                            Layer Stacking: Front vs Behind Frame:
                          </label>
                          <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                            <button
                              type="button"
                              onClick={() => handleSetPhotoStackingMode('front')}
                              className={`py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                                photoStackingMode === 'front'
                                  ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-2xs font-extrabold'
                                  : 'text-slate-500'
                              }`}
                            >
                              In Front (Over Artwork)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetPhotoStackingMode('behind')}
                              className={`py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                                photoStackingMode === 'behind'
                                  ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-2xs font-extrabold'
                                  : 'text-slate-500'
                              }`}
                              title="Tuck photo behind the uploaded artwork's decorative borders using smart foreground cutout mask"
                            >
                              Behind Frame (Cutout)
                            </button>
                          </div>
                        </div>

                        {/* 1-Click Artwork Frame Presets */}
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">
                            1-Click Photo Frame Presets:
                          </label>
                          <div className="grid grid-cols-2 gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateElement(selectedElement.id, {
                                  shape: 'rounded',
                                  w: 22.0,
                                  h: 27.0,
                                  x: Number(((geometry.w - 22.0) / 2).toFixed(1)),
                                  y: 23.5,
                                  radius: 3.5,
                                } as any)
                              }
                              className="py-1 px-2 rounded-lg bg-slate-50 hover:bg-emerald-50 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 cursor-pointer text-left"
                            >
                              Artwork Inner (22×27)
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateElement(selectedElement.id, {
                                  shape: 'rounded',
                                  w: 26.0,
                                  h: 32.0,
                                  x: Number(((geometry.w - 26.0) / 2).toFixed(1)),
                                  y: 20.0,
                                  radius: 2.5,
                                } as any)
                              }
                              className="py-1 px-2 rounded-lg bg-slate-50 hover:bg-emerald-50 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 cursor-pointer text-left"
                            >
                              Standard ID (26×32)
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateElement(selectedElement.id, {
                                  shape: 'circle',
                                  w: 26.0,
                                  h: 26.0,
                                  x: Number(((geometry.w - 26.0) / 2).toFixed(1)),
                                  y: 21.0,
                                  radius: 13.0,
                                } as any)
                              }
                              className="py-1 px-2 rounded-lg bg-slate-50 hover:bg-emerald-50 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 cursor-pointer text-left"
                            >
                              Circle Halo (26×26)
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateElement(selectedElement.id, {
                                  shape: 'arch',
                                  w: 36.0,
                                  h: 50.0,
                                  x: Number((geometry.w - 38.0).toFixed(1)),
                                  y: Number((geometry.h - 50.0).toFixed(1)),
                                  radius: 18.0,
                                  border: 1.2,
                                  borderColor: '#ffffff',
                                } as any)
                              }
                              className="py-1 px-2 rounded-lg bg-slate-50 hover:bg-emerald-50 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 cursor-pointer text-left"
                            >
                              Canva Arch Cutout
                            </button>
                          </div>
                        </div>

                        {/* Shape & Photo Filter */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Frame Shape:</label>
                            <select
                              value={(selectedElement as ImageElement).shape || 'rounded'}
                              onChange={e =>
                                handleUpdateElement(selectedElement.id, { shape: e.target.value as any } as any)
                              }
                              className="w-full px-2 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold"
                            >
                              <option value="rounded">Rounded Frame</option>
                              <option value="circle">Circle / Badge</option>
                              <option value="arch">Arch Cutout</option>
                              <option value="hexagon">Hexagon</option>
                              <option value="rect">Sharp Square</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Photo Filter:</label>
                            <select
                              value={(selectedElement as ImageElement).filter || 'none'}
                              onChange={e =>
                                handleUpdateElement(selectedElement.id, { filter: e.target.value as any } as any)
                              }
                              className="w-full px-2 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold"
                            >
                              <option value="none">Original Color</option>
                              <option value="contrast_bw">Canva B&W Contrast</option>
                              <option value="grayscale">Grayscale</option>
                              <option value="warm">Warm Studio</option>
                            </select>
                          </div>
                        </div>

                        {/* Corner Radius & Border */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-0.5">
                              Corner Radius ({(selectedElement as ImageElement).radius ?? 2.5} mm)
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="16"
                              step="0.5"
                              value={(selectedElement as ImageElement).radius ?? 2.5}
                              onChange={e =>
                                handleUpdateElement(selectedElement.id, {
                                  radius: parseFloat(e.target.value) || 0,
                                } as any)
                              }
                              className="w-full accent-emerald-600 cursor-pointer"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-0.5">
                              Border ({(selectedElement as ImageElement).border ?? 0} mm)
                            </label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="0"
                                max="4"
                                step="0.2"
                                value={(selectedElement as ImageElement).border ?? 0}
                                onChange={e =>
                                  handleUpdateElement(selectedElement.id, {
                                    border: parseFloat(e.target.value) || 0,
                                  } as any)
                                }
                                className="w-14 px-1.5 py-0.5 text-xs font-mono rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                              />
                              <input
                                type="color"
                                value={(selectedElement as ImageElement).borderColor || '#ffffff'}
                                onChange={e =>
                                  handleUpdateElement(selectedElement.id, {
                                    borderColor: e.target.value,
                                  } as any)
                                }
                                className="w-6 h-6 rounded cursor-pointer border border-slate-300"
                                title="Border Color"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Upload Custom Test Photo */}
                        <div className="pt-1">
                          <input
                            ref={testPhotoInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={e => {
                              const f = e.target.files?.[0];
                              if (f) {
                                processUploadFile(f, url => {
                                  setCustomTestPhotoUrl(url);
                                  setSeeThroughPhotoMode(false);
                                });
                              }
                            }}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => testPhotoInputRef.current?.click()}
                            className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300/70 dark:border-emerald-800 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Upload className="w-3 h-3" />
                            <span>{customTestPhotoUrl ? 'Replace Test Photo' : 'Upload Sample Employee Photo'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* TEXT FIELD INSPECTOR */}
                    {selectedElement.type === 'text' && (
                      <div className="space-y-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">
                            Text Content / Dynamic Placeholder:
                          </label>
                          <textarea
                            rows={3}
                            value={(selectedElement as TextElement).text || ''}
                            onChange={e =>
                              handleUpdateElement(selectedElement.id, { text: e.target.value } as any)
                            }
                            className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                            placeholder="e.g. {name} or {org}&#10;{address}"
                          />
                          {/* 1-Click Dynamic Token Chips */}
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {[
                              '{name}',
                              '{idno}',
                              '{designation}',
                              '{department}',
                              '{branch}',
                              '{org}',
                              '{phone}',
                              '{emergency_phone}',
                              '{email}',
                              '{blood}',
                              '{blood_group}',
                              '{dob}',
                              '{doj}',
                              '{issue_date}',
                              '{valid}',
                              '{father_name}',
                              '{uan}',
                              '{address}',
                            ].map(token => (
                              <button
                                key={token}
                                type="button"
                                onClick={() =>
                                  handleUpdateElement(selectedElement.id, {
                                    text: (selectedElement as TextElement).text
                                      ? `${(selectedElement as TextElement).text} ${token}`
                                      : token,
                                  } as any)
                                }
                                className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-emerald-100 dark:bg-slate-800 text-[9px] font-mono font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                              >
                                {token}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Signatory Quick Roles for Signature Text */}
                        {(selectedElement as TextElement).text?.toLowerCase().includes('sign') && (
                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-1">Signatory Title Presets:</label>
                            <div className="grid grid-cols-2 gap-1">
                              {['Authorized Signatory', 'HR Operations Head', 'Plant Safety Officer', 'Managing Director'].map(title => (
                                <button
                                  key={title}
                                  type="button"
                                  onClick={() => handleUpdateElement(selectedElement.id, { text: title } as any)}
                                  className="py-1 px-1.5 text-[9px] font-bold rounded bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 truncate cursor-pointer"
                                >
                                  {title}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block">Font Family:</label>
                            <select
                              aria-label="Font Family"
                              value={(selectedElement as TextElement).font || 'IBM Plex Sans'}
                              onChange={e =>
                                handleUpdateElement(selectedElement.id, { font: e.target.value } as any)
                              }
                              className="w-full px-2 py-1 text-xs rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                            >
                              <option value="IBM Plex Sans">IBM Plex Sans</option>
                              <option value="Poppins">Poppins (Canva Modern)</option>
                              <option value="Montserrat">Montserrat (Geometric)</option>
                              <option value="Inter">Inter (Clean UI)</option>
                              <option value="Barlow Condensed">Barlow Condensed (Badge)</option>
                              <option value="IBM Plex Mono">IBM Plex Mono (Serial)</option>
                            </select>
                          </div>

                          <div>
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] text-slate-400 font-bold block">Font Size:</label>
                              <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {(selectedElement as TextElement).size || 10} pt
                              </span>
                            </div>
                            <input
                              aria-label="Font Size Number"
                              type="number"
                              min="4"
                              max="36"
                              step="0.5"
                              value={(selectedElement as TextElement).size || 10}
                              onChange={e =>
                                handleUpdateElement(selectedElement.id, {
                                  size: parseFloat(e.target.value) || 10,
                                } as any)
                              }
                              className="w-full px-2 py-1 text-xs rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                            />
                            <input
                              aria-label="Font Size Range"
                              type="range"
                              min="4"
                              max="32"
                              step="0.5"
                              value={(selectedElement as TextElement).size || 10}
                              onChange={e =>
                                handleUpdateElement(selectedElement.id, {
                                  size: parseFloat(e.target.value) || 10,
                                } as any)
                              }
                              className="w-full accent-emerald-600 cursor-pointer mt-1"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block">Weight:</label>
                            <select
                              aria-label="Font Weight"
                              value={(selectedElement as TextElement).weight || 600}
                              onChange={e =>
                                handleUpdateElement(selectedElement.id, {
                                  weight: parseInt(e.target.value) || 600,
                                } as any)
                              }
                              className="w-full px-2 py-1 text-xs rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                            >
                              <option value={400}>Regular (400)</option>
                              <option value={500}>Medium (500)</option>
                              <option value={600}>SemiBold (600)</option>
                              <option value={700}>Bold (700)</option>
                              <option value={800}>ExtraBold (800)</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block">Color:</label>
                            <div className="flex items-center gap-1.5">
                              <input
                                aria-label="Text Color"
                                type="color"
                                value={(selectedElement as TextElement).color || '#000000'}
                                onChange={e =>
                                  handleUpdateElement(selectedElement.id, { color: e.target.value } as any)
                                }
                                className="w-7 h-7 rounded border-0 cursor-pointer"
                              />
                              <span className="text-[11px] font-mono text-slate-500">
                                {(selectedElement as TextElement).color}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Horizontal & Vertical Alignment */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-1">Text Alignment:</label>
                            <div className="grid grid-cols-3 gap-1">
                              {['left', 'center', 'right'].map(align => (
                                <button
                                  key={align}
                                  type="button"
                                  aria-label={`Align text ${align}`}
                                  onClick={() => handleUpdateElement(selectedElement.id, { align } as any)}
                                  className={`py-1 text-[11px] font-bold rounded capitalize cursor-pointer ${
                                    (selectedElement as TextElement).align === align
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  {align}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-1">Vertical Align:</label>
                            <div className="grid grid-cols-3 gap-1">
                              {[
                                { id: 'top', label: 'Top' },
                                { id: 'middle', label: 'Mid' },
                                { id: 'bottom', label: 'Btm' },
                              ].map(v => (
                                <button
                                  key={v.id}
                                  type="button"
                                  aria-label={`Vertical align ${v.id}`}
                                  onClick={() => handleUpdateElement(selectedElement.id, { verticalAlign: v.id } as any)}
                                  className={`py-1 text-[11px] font-bold rounded cursor-pointer ${
                                    ((selectedElement as TextElement).verticalAlign || 'middle') === v.id
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  {v.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Auto-Fit Box Height Action */}
                        <button
                          type="button"
                          aria-label="Auto-Fit Box Height"
                          onClick={() => handleAutoFitTextHeight(selectedElement.id)}
                          className="w-full py-1 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          title="Recalculate millimeter height so multi-line text fits without clipping"
                        >
                          <span>⚡ Auto-Fit Box Height ({selectedElement.h} mm)</span>
                        </button>

                        {/* Letter Spacing & Uppercase Toggle */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                          <div>
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] text-slate-400 font-bold block">Letter Spacing:</label>
                              <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400">
                                {(selectedElement as TextElement).letterSpacing || 0} pt
                              </span>
                            </div>
                            <input
                              aria-label="Text Letter Spacing"
                              type="range"
                              min="0"
                              max="4"
                              step="0.2"
                              value={(selectedElement as TextElement).letterSpacing || 0}
                              onChange={e =>
                                handleUpdateElement(selectedElement.id, {
                                  letterSpacing: parseFloat(e.target.value) || 0,
                                } as any)
                              }
                              className="w-full accent-emerald-600 cursor-pointer mt-0.5"
                            />
                          </div>

                          <div className="flex flex-col justify-end">
                            <label className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 cursor-pointer hover:bg-slate-200/70 transition-colors">
                              <input
                                type="checkbox"
                                checked={!!(selectedElement as TextElement).uppercase}
                                onChange={e =>
                                  handleUpdateElement(selectedElement.id, {
                                    uppercase: e.target.checked,
                                  } as any)
                                }
                                className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                ALL CAPS
                              </span>
                            </label>
                          </div>
                        </div>

                        {/* Soft Legibility Pill Assistant */}
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                          <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 cursor-pointer hover:bg-slate-200/70 transition-colors">
                            <input
                              type="checkbox"
                              checked={!!(selectedElement as TextElement).bgPill}
                              onChange={e =>
                                handleUpdateElement(selectedElement.id, {
                                  bgPill: e.target.checked,
                                  bgPillColor: 'rgba(255, 255, 255, 0.92)',
                                  bgPillRadius: 1.8,
                                } as any)
                              }
                              className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <div>
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                                Soft Legibility Pill
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                                Prevents text blending into dark/textured artwork.
                              </span>
                            </div>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* RECT / SHAPE INSPECTOR */}
                    {selectedElement.type === 'rect' && (
                      <div className="space-y-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                            Shape / Background Bar
                          </span>
                          <span className="text-[9px] font-mono text-slate-400">
                            {selectedElement.w} × {selectedElement.h} mm
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Fill Color:</label>
                            <div className="flex items-center gap-1.5">
                              <input
                                aria-label="Shape Fill Color"
                                type="color"
                                value={(selectedElement as RectElement).fill || '#ffffff'}
                                onChange={e => handleUpdateElement(selectedElement.id, { fill: e.target.value } as any)}
                                className="w-7 h-7 rounded border-0 cursor-pointer"
                              />
                              <span className="text-[11px] font-mono text-slate-500">{(selectedElement as RectElement).fill}</span>
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Border Color:</label>
                            <div className="flex items-center gap-1.5">
                              <input
                                aria-label="Shape Border Color"
                                type="color"
                                value={(selectedElement as RectElement).stroke || '#000000'}
                                onChange={e => handleUpdateElement(selectedElement.id, { stroke: e.target.value } as any)}
                                className="w-7 h-7 rounded border-0 cursor-pointer"
                              />
                              <span className="text-[11px] font-mono text-slate-500">{(selectedElement as RectElement).stroke || 'None'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] text-slate-400 font-bold block">Corner Radius:</label>
                              <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400">{(selectedElement as RectElement).radius || 0} mm</span>
                            </div>
                            <input
                              aria-label="Shape Corner Radius"
                              type="range"
                              min="0"
                              max="16"
                              step="0.5"
                              value={(selectedElement as RectElement).radius || 0}
                              onChange={e => handleUpdateElement(selectedElement.id, { radius: parseFloat(e.target.value) || 0 } as any)}
                              className="w-full accent-amber-600 cursor-pointer mt-0.5"
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] text-slate-400 font-bold block">Border Width:</label>
                              <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400">{(selectedElement as RectElement).strokeWidth || 0} mm</span>
                            </div>
                            <input
                              aria-label="Shape Border Width"
                              type="range"
                              min="0"
                              max="4"
                              step="0.2"
                              value={(selectedElement as RectElement).strokeWidth || 0}
                              onChange={e => handleUpdateElement(selectedElement.id, { strokeWidth: parseFloat(e.target.value) || 0 } as any)}
                              className="w-full accent-amber-600 cursor-pointer mt-0.5"
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] text-slate-400 font-bold block">Opacity:</label>
                            <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400">{Math.round((selectedElement.opacity ?? 1) * 100)}%</span>
                          </div>
                          <input
                            aria-label="Shape Opacity"
                            type="range"
                            min="0.05"
                            max="1"
                            step="0.05"
                            value={selectedElement.opacity ?? 1}
                            onChange={e => handleUpdateElement(selectedElement.id, { opacity: parseFloat(e.target.value) || 1 } as any)}
                            className="w-full accent-amber-600 cursor-pointer mt-0.5"
                          />
                        </div>
                      </div>
                    )}

                    {/* QR CODE INSPECTOR */}
                    {selectedElement.type === 'qr' && (
                      <div className="space-y-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                            Digital Verification QR
                          </span>
                          <span className="text-[9px] font-mono text-slate-400">
                            {selectedElement.w} × {selectedElement.h} mm
                          </span>
                        </div>

                        {/* Sizing Presets */}
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">
                            QR Sizing Presets:
                          </label>
                          <div className="grid grid-cols-3 gap-1">
                            {[
                              { label: 'Compact 14mm', w: 14.0, h: 14.0 },
                              { label: 'Standard 18mm', w: 18.0, h: 18.0 },
                              { label: 'Prominent 22mm', w: 22.0, h: 22.0 },
                            ].map(p => (
                              <button
                                key={p.label}
                                type="button"
                                onClick={() =>
                                  handleUpdateElement(selectedElement.id, {
                                    w: p.w,
                                    h: p.h,
                                    x: Number(((geometry.w - p.w) / 2).toFixed(1)),
                                  } as any)
                                }
                                className="py-1 px-1 rounded-lg bg-slate-50 hover:bg-purple-50 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 cursor-pointer text-center"
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Foreground & Background Colors */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-0.5">QR Color:</label>
                            <div className="flex items-center gap-1.5">
                              <input
                                aria-label="QR Foreground Color"
                                type="color"
                                value={(selectedElement as QrElement).color || '#0f172a'}
                                onChange={e => handleUpdateElement(selectedElement.id, { color: e.target.value } as any)}
                                className="w-7 h-7 rounded border-0 cursor-pointer"
                              />
                              <span className="text-[11px] font-mono text-slate-500">{(selectedElement as QrElement).color}</span>
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Backing Color:</label>
                            <div className="flex items-center gap-1.5">
                              <input
                                aria-label="QR Background Color"
                                type="color"
                                value={(selectedElement as QrElement).bgColor || '#ffffff'}
                                onChange={e => handleUpdateElement(selectedElement.id, { bgColor: e.target.value } as any)}
                                className="w-7 h-7 rounded border-0 cursor-pointer"
                              />
                              <span className="text-[11px] font-mono text-slate-500">{(selectedElement as QrElement).bgColor}</span>
                            </div>
                          </div>
                        </div>

                        {/* Frame Radius Slider */}
                        <div>
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] text-slate-400 font-bold block">Frame Corner Radius:</label>
                            <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400">
                              {(selectedElement as QrElement).frameRadius || 2} mm
                            </span>
                          </div>
                          <input
                            aria-label="QR Frame Corner Radius"
                            type="range"
                            min="0"
                            max="8"
                            step="0.5"
                            value={(selectedElement as QrElement).frameRadius || 2}
                            onChange={e => handleUpdateElement(selectedElement.id, { frameRadius: parseFloat(e.target.value) || 0 } as any)}
                            className="w-full accent-purple-600 cursor-pointer mt-0.5"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-0.5">
                            Verification Target URL:
                          </label>
                          <input
                            type="text"
                            value={(selectedElement as QrElement).qrData || ''}
                            onChange={e =>
                              handleUpdateElement(selectedElement.id, { qrData: e.target.value } as any)
                            }
                            className="w-full px-2 py-1 text-[11px] font-mono rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                          />
                          <div className="flex items-center gap-1.5 mt-1">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateElement(selectedElement.id, {
                                  qrData: 'https://app.joypeoplehr.com/verify-id-card?emp={idno}',
                                } as any)
                              }
                              className="text-[9px] font-mono text-purple-600 dark:text-purple-400 underline cursor-pointer"
                            >
                              Standard Live URL
                            </button>
                            <span className="text-[9px] text-slate-400">•</span>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateElement(selectedElement.id, {
                                  caption: 'Scan to verify active credentials',
                                } as any)
                              }
                              className="text-[9px] font-mono text-purple-600 dark:text-purple-400 underline cursor-pointer"
                            >
                              Add Verification Label
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-0.5">
                            QR Badge Caption:
                          </label>
                          <input
                            type="text"
                            value={(selectedElement as QrElement).caption || ''}
                            onChange={e =>
                              handleUpdateElement(selectedElement.id, { caption: e.target.value } as any)
                            }
                            placeholder="e.g. Scan to verify active credentials"
                            className="w-full px-2 py-1 text-xs rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                          />
                        </div>
                      </div>
                    )}

                    {/* Position & Dimensions (X, Y, W, H in mm) for ALL Elements */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 font-bold block mb-0.5">X Position (mm):</span>
                        <input
                          type="number"
                          step="0.5"
                          value={selectedElement.x}
                          onChange={e =>
                            handleUpdateElement(selectedElement.id, { x: parseFloat(e.target.value) || 0 })
                          }
                          className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 font-bold block mb-0.5">Y Position (mm):</span>
                        <input
                          type="number"
                          step="0.5"
                          value={selectedElement.y}
                          onChange={e =>
                            handleUpdateElement(selectedElement.id, { y: parseFloat(e.target.value) || 0 })
                          }
                          className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 font-bold block mb-0.5">Width W (mm):</span>
                        <input
                          type="number"
                          step="0.5"
                          min="3"
                          max={geometry.w}
                          value={selectedElement.w}
                          onChange={e =>
                            handleUpdateElement(selectedElement.id, {
                              w: Math.max(3, parseFloat(e.target.value) || 10),
                            })
                          }
                          className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 font-bold block mb-0.5">Height H (mm):</span>
                        <input
                          type="number"
                          step="0.5"
                          min="3"
                          max={geometry.h}
                          value={selectedElement.h}
                          onChange={e =>
                            handleUpdateElement(selectedElement.id, {
                              h: Math.max(3, parseFloat(e.target.value) || 10),
                            })
                          }
                          className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic text-center py-2">
                    Click or drag any field on the card to adjust position, size (W × H), shape, font, or color.
                  </p>
                )}
              </div>

              {/* Live Canvas Placement View (Right, 8 cols) */}
              <div className="md:col-span-8 flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                {/* Front / Back Side Toggle Bar + Live Employee Switcher */}
                <div className="w-full mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSide('front');
                        setSelectedElementId(null);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                        activeSide === 'front'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Front Side ({elements.length} layers)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSide('back');
                        setSelectedElementId(null);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                        activeSide === 'back'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Back Side ({backElements.length} layers)
                    </button>
                  </div>

                  {/* 1-Click Back Side Population Pill when on Back Side */}
                  {activeSide === 'back' && (
                    <button
                      type="button"
                      onClick={handleAutoPopulateBackSide}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-[11px] shadow-xs cursor-pointer transition-all"
                      title="Automatically place Company Address, Helplines, Employee Bio, QR, and Digital Signatory on Back Side"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>⚡ Auto-Populate Back Side</span>
                    </button>
                  )}

                  {/* Quick Employee Preview Switcher + See-Through Toggle */}
                  <div className="flex items-center gap-1.5">
                    {activeSide === 'front' && (
                      <button
                        type="button"
                        onClick={handleAutoDetectArtworkFrame}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 cursor-pointer flex items-center gap-1"
                        title="Auto-detect photo frame from front artwork"
                      >
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        <span>Detect Frame</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSeeThroughPhotoMode(prev => !prev)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-all ${
                        seeThroughPhotoMode
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 text-emerald-700 dark:text-emerald-300'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                      title="See through the photo box to align perfectly with your uploaded artwork frame"
                    >
                      {seeThroughPhotoMode ? '👁 X-Ray Align Mode' : '🖼 Photo Preview Mode'}
                    </button>

                    <select
                      value={testEmpIndex}
                      onChange={e => setTestEmpIndex(Number(e.target.value) || 0)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                      title="Switch sample employee while placing fields"
                    >
                      {sampleEmployees.slice(0, 8).map((emp, i) => (
                        <option key={emp.id} value={i}>
                          Preview: {emp.name} ({emp.idno})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Lanyard Punch Collision Banner (Phase 2) */}
                {collisionWarnings.length > 0 && (
                  <div className="w-full mb-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        <strong>Lanyard Punch Collision:</strong> "{collisionWarnings[0].elementLabel}" enters the punch hole zone ({collisionWarnings[0].overlapMm} mm overlap).
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleUpdateElement(collisionWarnings[0].elementId, {
                          y: collisionWarnings[0].suggestedY,
                        });
                      }}
                      className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shrink-0 cursor-pointer shadow-xs transition-colors"
                    >
                      Nudge Below Slot (1-Click)
                    </button>
                  </div>
                )}

                <div
                  onClick={() => setSelectedElementId(null)}
                  className="relative rounded-2xl shadow-2xl overflow-hidden select-none"
                  style={{
                    width: orientation === 'portrait' ? '300px' : '480px',
                    height: orientation === 'portrait' ? '480px' : '300px',
                    backgroundImage: `url(${
                      activeSide === 'front'
                        ? processedFrontUrl || frontDataUrl
                        : useSameForBack
                        ? processedFrontUrl || frontDataUrl
                        : backDataUrl || processedFrontUrl || frontDataUrl
                    })`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  {/* Magnetic Center Snap Guide Lines */}
                  {snapGuideX && (
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-cyan-400 shadow-[0_0_8px_#22d3ee] pointer-events-none z-30" />
                  )}
                  {snapGuideY && (
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-cyan-400 shadow-[0_0_8px_#22d3ee] pointer-events-none z-30" />
                  )}

                  {/* Keep-Out Zone: Punch Slot Visual Marker (Phase 2) */}
                  {activeSide === 'front' &&
                    keepOutZones.map(zone => {
                      const scaleMmToPx = (orientation === 'portrait' ? 300 : 480) / geometry.w;
                      const zLeft = zone.x * scaleMmToPx;
                      const zTop = zone.y * scaleMmToPx;
                      const zWidth = zone.w * scaleMmToPx;
                      const zHeight = zone.h * scaleMmToPx;

                      return (
                        <div
                          key={zone.id}
                          style={{
                            left: `${zLeft}px`,
                            top: `${zTop}px`,
                            width: `${zWidth}px`,
                            height: `${zHeight}px`,
                            borderRadius: `${zHeight / 2}px`,
                          }}
                          className="absolute border-2 border-dashed border-rose-500 bg-rose-500/20 pointer-events-none flex items-center justify-center z-20"
                        >
                          <span className="text-[8px] font-bold text-rose-700 dark:text-rose-200 uppercase tracking-tighter truncate px-1">
                            Punch Slot
                          </span>
                        </div>
                      );
                    })}

                  {/* Layer 4: Transparent Overlay Artwork if loaded */}
                  {activeSide === 'front' && overlayDataUrl && (
                    <img
                      src={overlayDataUrl}
                      alt="Overlay layer"
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
                    />
                  )}

                  {/* Interactive Draggable & Resizable Elements on Artwork */}
                  {activeSideElements.map(el => {
                    const isSelected = el.id === selectedElementId;
                    const scaleMmToPx = (orientation === 'portrait' ? 300 : 480) / geometry.w;

                    const leftPx = el.x * scaleMmToPx;
                    const topPx = el.y * scaleMmToPx;
                    const widthPx = el.w * scaleMmToPx;
                    const heightPx = el.h * scaleMmToPx;

                    const imgEl = el.type === 'image' ? (el as ImageElement) : null;
                    const textEl = el.type === 'text' ? (el as TextElement) : null;
                    const vAlign = textEl?.verticalAlign || 'middle';
                    const flexAlignClass = vAlign === 'top' ? 'items-start' : vAlign === 'bottom' ? 'items-end' : 'items-center';
                    const activePhotoSrc = customTestPhotoUrl || currentEmployee.avatar_url;
                    const borderRadiusStyle =
                      imgEl?.shape === 'circle'
                        ? '9999px'
                        : imgEl?.shape === 'arch'
                        ? `${Math.min(widthPx / 2, heightPx * 0.48)}px ${Math.min(widthPx / 2, heightPx * 0.48)}px 0px 0px`
                        : `${(imgEl?.radius ?? 2.5) * scaleMmToPx}px`;

                    return (
                      <div
                        key={el.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Canvas field ${el.type} ${el.id} at X ${el.x}mm Y ${el.y}mm`}
                        onFocus={() => setSelectedElementId(el.id)}
                        onDoubleClick={e => {
                          e.stopPropagation();
                          if (el.type === 'text') {
                            setEditingTextId(el.id);
                          }
                        }}
                        onMouseDown={e => {
                          e.stopPropagation();
                          setSelectedElementId(el.id);
                          setWizardDrag({
                            mode: 'move',
                            elementId: el.id,
                            startClientX: e.clientX,
                            startClientY: e.clientY,
                            startX: el.x,
                            startY: el.y,
                            startW: el.w,
                            startH: el.h,
                          });
                        }}
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedElementId(el.id);
                        }}
                        style={{
                          left: `${leftPx}px`,
                          top: `${topPx}px`,
                          width: `${widthPx}px`,
                          height: `${heightPx}px`,
                        }}
                        className={`absolute cursor-move flex ${flexAlignClass} focus:outline-none z-20 ${
                          isSelected
                            ? 'ring-2 ring-emerald-500 shadow-[0_0_0_1px_rgba(255,255,255,0.9)]'
                            : 'hover:ring-1 hover:ring-blue-400'
                        }`}
                      >
                        {el.type === 'rect' && (
                          <div
                            style={{
                              backgroundColor: el.fill || '#ffffff',
                              borderRadius: `${(el.radius || 0) * scaleMmToPx}px`,
                              borderWidth: (el as RectElement).strokeWidth ? `${(el as RectElement).strokeWidth! * scaleMmToPx}px` : undefined,
                              borderColor: (el as RectElement).stroke || undefined,
                              borderStyle: (el as RectElement).strokeWidth ? 'solid' : undefined,
                              opacity: el.opacity ?? 1,
                            }}
                            className="w-full h-full pointer-events-none"
                          />
                        )}

                        {el.type === 'text' && (
                          editingTextId === el.id ? (
                            <textarea
                              autoFocus
                              value={(el as TextElement).text || ''}
                              onChange={e =>
                                handleUpdateElement(el.id, { text: e.target.value } as any)
                              }
                              onBlur={() => setEditingTextId(null)}
                              onKeyDown={e => {
                                if (e.key === 'Escape') setEditingTextId(null);
                              }}
                              onClick={e => e.stopPropagation()}
                              onMouseDown={e => e.stopPropagation()}
                              style={{
                                color: (el as TextElement).color,
                                fontFamily: (el as TextElement).font || 'IBM Plex Sans',
                                fontSize: `${((el as TextElement).size || 9) * (scaleMmToPx / 2.83)}px`,
                                fontWeight: (el as TextElement).weight || 500,
                                textAlign: (el as TextElement).align || 'left',
                                letterSpacing: (el as TextElement).letterSpacing ? `${(el as TextElement).letterSpacing}pt` : undefined,
                                textTransform: (el as TextElement).uppercase ? 'uppercase' : 'none',
                                backgroundColor: (el as TextElement).bgPill
                                  ? (el as TextElement).bgPillColor || 'rgba(255, 255, 255, 0.95)'
                                  : 'rgba(255, 255, 255, 0.95)',
                                resize: 'none',
                              }}
                              className="w-full h-full p-1 rounded border-2 border-emerald-500 shadow-md outline-none whitespace-pre-wrap break-words leading-snug cursor-text text-slate-900"
                            />
                          ) : (
                            <div
                              title="Double-click to edit text directly on canvas"
                              onDoubleClick={e => {
                                e.stopPropagation();
                                setEditingTextId(el.id);
                              }}
                              style={{
                                color: (el as TextElement).color,
                                fontFamily: (el as TextElement).font || 'IBM Plex Sans',
                                fontSize: `${((el as TextElement).size || 9) * (scaleMmToPx / 2.83)}px`,
                                fontWeight: (el as TextElement).weight || 500,
                                textAlign: (el as TextElement).align || 'left',
                                letterSpacing: (el as TextElement).letterSpacing ? `${(el as TextElement).letterSpacing}pt` : undefined,
                                textTransform: (el as TextElement).uppercase ? 'uppercase' : 'none',
                                backgroundColor: (el as TextElement).bgPill
                                  ? (el as TextElement).bgPillColor || 'rgba(255, 255, 255, 0.92)'
                                  : 'transparent',
                                borderRadius: (el as TextElement).bgPill ? '4px' : '0px',
                                width: '100%',
                              }}
                              className={`leading-snug whitespace-pre-wrap break-words cursor-text select-text ${
                                (el as TextElement).bgPill ? 'px-2 py-0.5 shadow-xs' : 'px-1'
                              }`}
                            >
                              {substituteField((el as TextElement).text, currentEmployee)}
                            </div>
                          )
                        )}

                        {el.type === 'image' && (
                          <div
                            style={{
                              borderRadius: borderRadiusStyle,
                              borderWidth: imgEl?.border ? `${imgEl.border * scaleMmToPx}px` : undefined,
                              borderColor: imgEl?.borderColor || '#ffffff',
                              filter:
                                imgEl?.filter === 'contrast_bw'
                                  ? 'grayscale(100%) contrast(122%)'
                                  : imgEl?.filter === 'grayscale'
                                  ? 'grayscale(100%)'
                                  : imgEl?.filter === 'warm'
                                  ? 'sepia(18%) saturate(118%)'
                                  : 'none',
                            }}
                            className={`w-full h-full overflow-hidden flex flex-col items-center justify-center relative pointer-events-none transition-all ${
                              seeThroughPhotoMode
                                ? 'bg-emerald-500/15 backdrop-blur-[0.5px] border-2 border-dashed border-emerald-400 text-emerald-950'
                                : 'bg-slate-200 dark:bg-slate-800 border border-white/70'
                            }`}
                          >
                            {seeThroughPhotoMode ? (
                              <>
                                {activePhotoSrc && (
                                  <img
                                    src={activePhotoSrc}
                                    alt="Ghost align preview"
                                    className="absolute inset-0 w-full h-full object-cover opacity-35"
                                  />
                                )}
                                {/* Crosshair Target so user can align directly over artwork photo frame */}
                                <div className="absolute inset-x-2 top-1/2 h-px bg-emerald-500/60" />
                                <div className="absolute inset-y-2 left-1/2 w-px bg-emerald-500/60" />
                                <span className="relative z-10 px-1.5 py-0.5 rounded bg-slate-950/80 text-[9px] font-mono font-extrabold text-emerald-300 shadow-xs">
                                  PHOTO ({el.w}×{el.h}mm)
                                </span>
                                <span className="relative z-10 text-[8px] font-bold text-white bg-emerald-700/85 px-1 rounded mt-0.5">
                                  Drag or Resize Corner
                                </span>
                              </>
                            ) : activePhotoSrc ? (
                              <img
                                src={activePhotoSrc}
                                alt={currentEmployee.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              /* Crisp Editorial Studio Portrait Avatar Silhouette */
                              <div className="w-full h-full bg-gradient-to-b from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex flex-col items-center justify-end relative overflow-hidden">
                                <div className="w-9 h-9 rounded-full bg-slate-500/80 dark:bg-slate-400/80 mb-1" />
                                <div className="w-16 h-10 rounded-t-full bg-slate-600/85 dark:bg-slate-500/85" />
                                <span className="absolute top-1.5 right-1.5 px-1 py-0.5 rounded bg-black/50 text-[8px] font-mono font-bold text-white">
                                  {currentEmployee.name.slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {el.type === 'qr' && (
                          <div
                            style={{
                              backgroundColor: (el as QrElement).bgColor || '#ffffff',
                              borderRadius: `${((el as QrElement).frameRadius ?? 2) * scaleMmToPx}px`,
                              color: (el as QrElement).color || '#0f172a',
                            }}
                            className="w-full h-full p-1 shadow-xs flex flex-col items-center justify-center pointer-events-none overflow-hidden"
                          >
                            <QrCode className="w-full h-full" style={{ color: (el as QrElement).color || '#0f172a' }} />
                            {(el as QrElement).caption && (
                              <span
                                style={{
                                  fontSize: `${Math.max(6, (el.w * scaleMmToPx) / 6)}px`,
                                  color: (el as QrElement).color || '#0f172a',
                                }}
                                className="font-mono font-bold truncate max-w-full text-center px-0.5"
                              >
                                {substituteField((el as QrElement).caption!, currentEmployee)}
                              </span>
                            )}
                          </div>
                        )}

                        {/* 8-Point Interactive Resize Handles when Selected */}
                        {isSelected &&
                          (['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const).map(handle => {
                            const posStyle: React.CSSProperties = {
                              top: handle.includes('n') ? -5 : handle.includes('s') ? 'calc(100% - 5px)' : 'calc(50% - 5px)',
                              left: handle.includes('w') ? -5 : handle.includes('e') ? 'calc(100% - 5px)' : 'calc(50% - 5px)',
                              cursor: `${handle}-resize`,
                            };
                            return (
                              <div
                                key={handle}
                                onMouseDown={e => {
                                  e.stopPropagation();
                                  setWizardDrag({
                                    mode: 'resize',
                                    handle,
                                    elementId: el.id,
                                    startClientX: e.clientX,
                                    startClientY: e.clientY,
                                    startX: el.x,
                                    startY: el.y,
                                    startW: el.w,
                                    startH: el.h,
                                  });
                                }}
                                style={posStyle}
                                className="absolute w-2.5 h-2.5 rounded-full bg-white border-2 border-emerald-600 shadow-md z-30 hover:scale-125 transition-transform"
                                title={`Drag to resize (${handle.toUpperCase()})`}
                              />
                            );
                          })}
                      </div>
                    );
                  })}
                </div>

                {/* Phase 4: Keyboard Precision Nudge Bar & Shortcuts */}
                <div className="mt-3 w-full flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">Drag, Resize or Nudge:</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[10px]">
                      Mouse Drag / 8-Handles
                    </kbd>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[10px]">
                      ↑↓←→ 0.5mm
                    </kbd>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={!selectedElementId}
                      onClick={() => handleNudgeSelected(-0.5, 0)}
                      title="Nudge Left 0.5mm (ArrowLeft)"
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 text-xs font-bold disabled:opacity-40 cursor-pointer"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      disabled={!selectedElementId}
                      onClick={() => handleNudgeSelected(0, -0.5)}
                      title="Nudge Up 0.5mm (ArrowUp)"
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 text-xs font-bold disabled:opacity-40 cursor-pointer"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={!selectedElementId}
                      onClick={() => handleNudgeSelected(0, 0.5)}
                      title="Nudge Down 0.5mm (ArrowDown)"
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 text-xs font-bold disabled:opacity-40 cursor-pointer"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      disabled={!selectedElementId}
                      onClick={() => handleNudgeSelected(0.5, 0)}
                      title="Nudge Right 0.5mm (ArrowRight)"
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 text-xs font-bold disabled:opacity-40 cursor-pointer"
                    >
                      →
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 font-mono mt-2">
                  Drag any field or pull its green corner handles to fit your artwork. Previewing: <strong>{currentEmployee.name}</strong>
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* STEP 4: TEST WITH WORKFORCE & STRESS CASES                      */}
          {/* --------------------------------------------------------------- */}
          {currentStep === 'test' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Step 4: Pre-Flight Workforce & Edge-Case Validation</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      Phase 2 Prepress
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Verify how your template handles long names, Tamil script, no-photo monograms, and missing fields.
                  </p>
                </div>

                {/* Mode Switcher: Sample Staff vs Edge Cases */}
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setTestMode('sample');
                      setTestEmpIndex(0);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      testMode === 'sample'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Active Workforce (3 Sample)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTestMode('stress');
                      setTestEmpIndex(0);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      testMode === 'stress'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Preflight Stress Tests (4 Cases)
                  </button>
                </div>
              </div>

              {/* Visual Multi-Card Comparison Strip */}
              {(() => {
                const displayRecords = testMode === 'stress'
                  ? PREFLIGHT_STRESS_EMPLOYEES
                  : sampleEmployees.slice(0, 3);

                return (
                  <div className={`grid gap-4 ${testMode === 'stress' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
                    {displayRecords.map((emp, idx) => (
                      <div
                        key={emp.id}
                        onClick={() => setTestEmpIndex(idx)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                          testEmpIndex === idx
                            ? 'border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/20 shadow-md ring-2 ring-emerald-500/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div
                          className="rounded-xl shadow-lg overflow-hidden relative mx-auto"
                          style={{
                            width: testMode === 'stress' ? '160px' : '180px',
                            height: testMode === 'stress' ? '250px' : '280px',
                            backgroundImage: `url(${processedFrontUrl || frontDataUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }}
                        >
                          {/* Punch Slot Marker */}
                          {keepOutZones.map(zone => {
                            const scaleMmToPx = (testMode === 'stress' ? 160 : 180) / geometry.w;
                            return (
                              <div
                                key={zone.id}
                                style={{
                                  left: `${zone.x * scaleMmToPx}px`,
                                  top: `${zone.y * scaleMmToPx}px`,
                                  width: `${zone.w * scaleMmToPx}px`,
                                  height: `${zone.h * scaleMmToPx}px`,
                                  borderRadius: `${(zone.h * scaleMmToPx) / 2}px`,
                                }}
                                className="absolute border border-dashed border-rose-500/80 bg-rose-500/15 pointer-events-none z-20"
                              />
                            );
                          })}

                          {/* Overlay Layer */}
                          {overlayDataUrl && (
                            <img
                              src={overlayDataUrl}
                              alt="Overlay"
                              className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
                            />
                          )}

                          {elements.map(el => {
                            const scaleMmToPx = (testMode === 'stress' ? 160 : 180) / geometry.w;
                            const leftPx = el.x * scaleMmToPx;
                            const topPx = el.y * scaleMmToPx;
                            const widthPx = el.w * scaleMmToPx;
                            const heightPx = el.h * scaleMmToPx;
                            const imgEl = el.type === 'image' ? (el as ImageElement) : null;
                            const step4BorderRadius =
                              imgEl?.shape === 'circle'
                                ? '9999px'
                                : imgEl?.shape === 'arch'
                                ? `${Math.min(widthPx / 2, heightPx * 0.48)}px ${Math.min(widthPx / 2, heightPx * 0.48)}px 0px 0px`
                                : `${(imgEl?.radius ?? 2.5) * scaleMmToPx}px`;
                            const empPhotoUrl = emp.avatar_url || (idx === 0 && customTestPhotoUrl ? customTestPhotoUrl : '');

                            const textEl = el.type === 'text' ? (el as TextElement) : null;
                            const vAlign4 = textEl?.verticalAlign || 'middle';
                            const flexAlignClass4 = vAlign4 === 'top' ? 'items-start' : vAlign4 === 'bottom' ? 'items-end' : 'items-center';

                            return (
                              <div
                                key={el.id}
                                style={{
                                  left: `${leftPx}px`,
                                  top: `${topPx}px`,
                                  width: `${widthPx}px`,
                                  height: `${heightPx}px`,
                                }}
                                className={`absolute flex ${flexAlignClass4}`}
                              >
                                {el.type === 'rect' && (
                                  <div
                                    style={{
                                      backgroundColor: el.fill || '#ffffff',
                                      borderRadius: `${(el.radius || 0) * scaleMmToPx}px`,
                                      borderWidth: (el as RectElement).strokeWidth ? `${(el as RectElement).strokeWidth! * scaleMmToPx}px` : undefined,
                                      borderColor: (el as RectElement).stroke || undefined,
                                      borderStyle: (el as RectElement).strokeWidth ? 'solid' : undefined,
                                      opacity: el.opacity ?? 1,
                                    }}
                                    className="w-full h-full pointer-events-none"
                                  />
                                )}

                                {el.type === 'text' && (
                                  <div
                                    style={{
                                      color: (el as TextElement).color,
                                      fontFamily: (el as TextElement).font || 'IBM Plex Sans',
                                      fontSize: `${((el as TextElement).size || 9) * (scaleMmToPx / 2.83)}px`,
                                      fontWeight: (el as TextElement).weight || 500,
                                      textAlign: (el as TextElement).align || 'left',
                                      letterSpacing: (el as TextElement).letterSpacing ? `${(el as TextElement).letterSpacing}pt` : undefined,
                                      textTransform: (el as TextElement).uppercase ? 'uppercase' : 'none',
                                      backgroundColor: (el as TextElement).bgPill
                                        ? (el as TextElement).bgPillColor || 'rgba(255, 255, 255, 0.92)'
                                        : 'transparent',
                                      borderRadius: (el as TextElement).bgPill ? '3px' : '0px',
                                      width: '100%',
                                    }}
                                    className={`leading-snug whitespace-pre-wrap break-words ${
                                      (el as TextElement).bgPill ? 'px-1.5 py-0.5 shadow-2xs' : 'px-0.5'
                                    }`}
                                  >
                                    {substituteField((el as TextElement).text, emp)}
                                  </div>
                                )}

                                {el.type === 'image' && (
                                  <div
                                    style={{
                                      borderRadius: step4BorderRadius,
                                      borderWidth: imgEl?.border ? `${imgEl.border * scaleMmToPx}px` : undefined,
                                      borderColor: imgEl?.borderColor || '#ffffff',
                                      filter:
                                        imgEl?.filter === 'contrast_bw'
                                          ? 'grayscale(100%) contrast(122%)'
                                          : imgEl?.filter === 'grayscale'
                                          ? 'grayscale(100%)'
                                          : imgEl?.filter === 'warm'
                                          ? 'sepia(18%) saturate(118%)'
                                          : 'none',
                                    }}
                                    className="w-full h-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex items-center justify-center text-[8px] font-bold text-slate-700 dark:text-slate-200 border border-white/60 shadow-xs"
                                  >
                                    {empPhotoUrl ? (
                                      <img src={empPhotoUrl} alt="Photo" className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full bg-gradient-to-b from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex flex-col items-center justify-end relative overflow-hidden">
                                        <div className="w-6 h-6 rounded-full bg-slate-500/80 dark:bg-slate-400/80 mb-0.5" />
                                        <div className="w-11 h-7 rounded-t-full bg-slate-600/85 dark:bg-slate-500/85" />
                                        <span className="absolute top-1 right-1 px-1 py-0.2 rounded bg-black/55 text-[7px] font-mono font-bold text-white">
                                          {emp.name ? emp.name.slice(0, 2).toUpperCase() : 'ID'}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {el.type === 'qr' && (
                                  <div
                                    style={{
                                      backgroundColor: (el as QrElement).bgColor || '#ffffff',
                                      borderRadius: `${((el as QrElement).frameRadius ?? 2) * scaleMmToPx}px`,
                                      color: (el as QrElement).color || '#0f172a',
                                    }}
                                    className="w-full h-full p-0.5 shadow-2xs flex flex-col items-center justify-center overflow-hidden"
                                  >
                                    <QrCode className="w-full h-full" style={{ color: (el as QrElement).color || '#0f172a' }} />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-3 text-center">
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{emp.name}</div>
                          <div className="text-[11px] text-slate-500 truncate">{emp.designation || 'Staff'}</div>
                          {testMode === 'stress' && (
                            <span className="inline-block mt-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {emp.id === 'emp_stress_long_name'
                                ? '28 Chars Name'
                                : emp.id === 'emp_stress_tamil_name'
                                ? 'Tamil Script'
                                : emp.id === 'emp_stress_no_photo'
                                ? 'No Photo Fallback'
                                : 'Missing Optional'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* STEP 5: PUBLISH TEMPLATE                                        */}
          {/* --------------------------------------------------------------- */}
          {currentStep === 'publish' && (
            <div className="max-w-xl mx-auto space-y-5">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Publish Custom Template (Version 1.0)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Save this template to your organization library. Ready to issue print-grade cards immediately.
                </p>
              </div>

              <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Template Display Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={e => setTemplateName(e.target.value)}
                    placeholder="e.g. 2026 Executive Lanyard Card"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Description & Usage Notes
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Describe which departments or branches use this badge..."
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isDefault}
                      onChange={e => setIsDefault(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Set as default template for all workforce card issuance
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Action Controls */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            {currentStep !== 'upload' && (
              <button
                type="button"
                onClick={() => {
                  const idx = WIZARD_STEPS.findIndex(s => s.key === currentStep);
                  if (idx > 0) setCurrentStep(WIZARD_STEPS[idx - 1].key);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              Cancel
            </button>

            {currentStep === 'upload' && (
              <button
                type="button"
                disabled={!frontDataUrl || !rightsConfirmed}
                onClick={() => {
                  initDefaultFields();
                  setCurrentStep('check_fit');
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Continue to Check Fit</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {currentStep === 'check_fit' && (
              <button
                type="button"
                onClick={() => {
                  initDefaultFields();
                  setCurrentStep('place_fields');
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <span>Continue to Place Fields</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {currentStep === 'place_fields' && (
              <button
                type="button"
                onClick={() => setCurrentStep('test')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <span>Continue to Test</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {currentStep === 'test' && (
              <button
                type="button"
                onClick={() => setCurrentStep('publish')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <span>Review & Publish</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {currentStep === 'publish' && (
              <button
                type="button"
                onClick={handlePublish}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-900/30 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Publish Version 1.0</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
