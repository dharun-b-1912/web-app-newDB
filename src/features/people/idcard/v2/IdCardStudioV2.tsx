// src/features/people/idcard/v2/IdCardStudioV2.tsx
// ============================================================================
// JOY PeopleHR ID Card Studio V2 — Modern Two-Mode Production Workspace
// Mode A: Fast 4-Step Card Issuance (< 2 min workflow)
// Mode B: Precision 3-Pane Template Designer
// ============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { IdCardStudioHeaderV2 } from './components/IdCardStudioHeaderV2';
import { IdCardIssueStepper } from './components/IdCardIssueStepper';
import { IdCardTemplatePickerStep } from './components/steps/IdCardTemplatePickerStep';
import { IdCardPeopleSelectStep } from './components/steps/IdCardPeopleSelectStep';
import { IdCardReviewFixStep } from './components/steps/IdCardReviewFixStep';
import { IdCardGenerateStep } from './components/steps/IdCardGenerateStep';
import { IdCardTemplateDesignerV2 } from './components/IdCardTemplateDesignerV2';
import {
  buildCreativeStudioYellowBlackTemplate,
  CANVA_STUDIO_THEMES,
} from './canvaStudioThemes';
import { IdCardPreflightModal } from '../components/IdCardPreflightModal';
import { IdCardSaveTemplateModal } from '../components/IdCardSaveTemplateModal';
import {
  CardElement,
  CardGeometry,
  CardSide,
  CardSideData,
  CR80_LANDSCAPE,
  CR80_PORTRAIT,
  ElementType,
  IdCardPersonRecord,
  PreflightIssue,
} from '../idCardTypes';
import {
  fetchEmployeesForIdCards,
  getSampleEmployees,
  getTemplateByName,
  runPreflightChecks,
  exportCmykPdfFile,
  loadImageFromFile,
  createTextElement,
  createImageElement,
  createRectElement,
  createQrElement,
} from '../idCardService';
import {
  IssueStep,
  PrintOutputFormat,
  StudioMode,
  TemplateCategory,
  IdCardCustomTemplate,
  TemplateCardInfo,
  IccOutputIntentProfile,
  PrintProductionBatch,
  DraftRecoverySnapshot,
} from './types';
import { BUILTIN_TEMPLATES_V2 } from './templateRegistryV2';
import { supabase } from '../../../../lib/supabase';
import { IdCardUploadDesignWizard } from './components/wizard/IdCardUploadDesignWizard';
import {
  fetchOrganizationTemplates,
  saveCustomTemplate,
  createEmptyCustomTemplate,
  getDefaultEpsYellowGeometricTemplate,
  bumpTemplateVersion,
  importIdTemplateBundle,
  cloneStarterToCustomTemplate,
  cloneOrganizationTemplate,
  archiveOrganizationTemplate,
  saveDraftRecoverySnapshot,
  loadDraftRecoverySnapshot,
  clearDraftRecoverySnapshot,
  recordPrintProductionBatch,
  getPrintProductionBatches,
  recordTemplateIssuance,
} from './customTemplateService';

interface IdCardStudioV2Props {
  onBackToPeople: () => void;
  onToggleV1V2: () => void;
}

export const IdCardStudioV2: React.FC<IdCardStudioV2Props> = ({
  onBackToPeople,
  onToggleV1V2,
}) => {
  // 1. Workspace Navigation State
  const [mode, setMode] = useState<StudioMode>('issue');
  const [step, setStep] = useState<IssueStep>('template');

  // 2. Workforce & Photos
  const [employees, setEmployees] = useState<IdCardPersonRecord[]>(getSampleEmployees());
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
  const [activeEmployeeIndex, setActiveEmployeeIndex] = useState<number>(0);
  const [photosMap, setPhotosMap] = useState<Map<string, HTMLImageElement>>(new Map());
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);

  // 3. Card Geometry & Templates (V2.1: No auto-selected demo template)
  const [geometry, setGeometry] = useState<CardGeometry>(CR80_PORTRAIT);
  const [activeSide, setActiveSide] = useState<CardSide>('front');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateCategory>('corporate');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [customTemplates, setCustomTemplates] = useState<IdCardCustomTemplate[]>([]);
  const [isUploadWizardOpen, setIsUploadWizardOpen] = useState<boolean>(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [lastAutosavedAt, setLastAutosavedAt] = useState<string | null>(null);
  const [draftRecovery, setDraftRecovery] = useState<DraftRecoverySnapshot | null>(() =>
    loadDraftRecoverySnapshot('default-org')
  );
  const [recentBatches, setRecentBatches] = useState<PrintProductionBatch[]>(() =>
    getPrintProductionBatches()
  );

  const initialCanvaTpl = buildCreativeStudioYellowBlackTemplate('portrait');
  const [frontSide, setFrontSide] = useState<CardSideData>({
    bg: initialCanvaTpl.sides.front.bg || '#ffe600',
    bgImg: null,
    bgName: '',
    els: initialCanvaTpl.sides.front.elements,
    keepOutZones: initialCanvaTpl.sides.front.keepOutZones,
  });
  const [backSide, setBackSide] = useState<CardSideData>({
    bg: initialCanvaTpl.sides.back.bg || '#0a0a0a',
    bgImg: null,
    bgName: '',
    els: initialCanvaTpl.sides.back.elements,
    keepOutZones: initialCanvaTpl.sides.back.keepOutZones,
  });

  // 4. Viewport & Prepress Controls (Finished View default: showGuides = false)
  const [zoom, setZoom] = useState<number>(1.0);
  const [showGuides, setShowGuides] = useState<boolean>(false);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [designerTab, setDesignerTab] = useState<'properties' | 'layers'>('properties');

  // 5. Preflight & Modals
  const [isPreflightOpen, setIsPreflightOpen] = useState(false);
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);

  // 6. Production Export Progress & Cache
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [lastGeneratedBlobUrl, setLastGeneratedBlobUrl] = useState<string | null>(null);
  const [includeSeparated, setIncludeSeparated] = useState(false);

  // Apply Organization Custom Template
  const applyCustomTemplate = useCallback((tpl: IdCardCustomTemplate) => {
    setSelectedTemplateId(tpl.id);
    setGeometry(tpl.geometry);

    // Front side loading
    let frontBgImg: HTMLImageElement | null = null;
    const frontAssetUrl = tpl.sides.front.baseAsset?.dataUrl;
    if (frontAssetUrl) {
      frontBgImg = new Image();
      frontBgImg.crossOrigin = 'anonymous';
      frontBgImg.onload = () => {
        setFrontSide(prev => ({ ...prev, bgImg: frontBgImg }));
      };
      frontBgImg.src = frontAssetUrl;
    }

    let frontOverlayImg: HTMLImageElement | null = null;
    const frontOverlayUrl = tpl.sides.front.overlayAsset?.dataUrl;
    if (frontOverlayUrl) {
      frontOverlayImg = new Image();
      frontOverlayImg.crossOrigin = 'anonymous';
      frontOverlayImg.onload = () => {
        setFrontSide(prev => ({ ...prev, overlayImg: frontOverlayImg }));
      };
      frontOverlayImg.src = frontOverlayUrl;
    }

    setFrontSide({
      bg: tpl.sides.front.bg || '#ffffff',
      bgImg: frontBgImg,
      bgName: tpl.sides.front.baseAsset?.name || '',
      overlayImg: frontOverlayImg,
      overlayName: tpl.sides.front.overlayAsset?.name || '',
      els: tpl.sides.front.elements || [],
      keepOutZones: tpl.sides.front.keepOutZones,
    });

    // Back side loading
    let backBgImg: HTMLImageElement | null = null;
    const backAssetUrl = tpl.sides.back.baseAsset?.dataUrl;
    if (backAssetUrl) {
      backBgImg = new Image();
      backBgImg.crossOrigin = 'anonymous';
      backBgImg.onload = () => {
        setBackSide(prev => ({ ...prev, bgImg: backBgImg }));
      };
      backBgImg.src = backAssetUrl;
    }

    let backOverlayImg: HTMLImageElement | null = null;
    const backOverlayUrl = tpl.sides.back.overlayAsset?.dataUrl;
    if (backOverlayUrl) {
      backOverlayImg = new Image();
      backOverlayImg.crossOrigin = 'anonymous';
      backOverlayImg.onload = () => {
        setBackSide(prev => ({ ...prev, overlayImg: backOverlayImg }));
      };
      backOverlayImg.src = backOverlayUrl;
    }

    setBackSide({
      bg: tpl.sides.back.bg || '#ffffff',
      bgImg: backBgImg,
      bgName: tpl.sides.back.baseAsset?.name || '',
      overlayImg: backOverlayImg,
      overlayName: tpl.sides.back.overlayAsset?.name || '',
      els: tpl.sides.back.elements || [],
      keepOutZones: tpl.sides.back.keepOutZones,
    });
  }, []);

  const handleTemplatePublished = useCallback((newTpl: IdCardCustomTemplate) => {
    setCustomTemplates(prev => [newTpl, ...prev.filter(t => t.id !== newTpl.id)]);
    saveCustomTemplate(newTpl).catch(err => console.warn('Could not persist template:', err));
    applyCustomTemplate(newTpl);
    setIsUploadWizardOpen(false);
  }, [applyCustomTemplate]);

  const handleBumpTemplateVersion = useCallback(async (tpl: IdCardCustomTemplate) => {
    const now = new Date().toISOString();
    const optimisticBumped: IdCardCustomTemplate = {
      ...tpl,
      version: tpl.version + 1,
      updatedAt: now,
      versionHistory: [
        ...(tpl.versionHistory || []),
        {
          version: tpl.version,
          publishedAt: tpl.updatedAt || tpl.createdAt || now,
          publishedBy: tpl.createdBy || 'Mari Muthu',
          issuedCardsCount: tpl.issuedCardsCount || 0,
        },
      ],
    };
    setCustomTemplates(prev => prev.map(t => (t.id === tpl.id ? optimisticBumped : t)));
    if (selectedTemplateId === tpl.id) {
      applyCustomTemplate(optimisticBumped);
    }
    bumpTemplateVersion(tpl, 'Mari Muthu').catch(() => {});
  }, [selectedTemplateId, applyCustomTemplate]);

  const handleImportTemplateBundle = useCallback(async (file: File) => {
    try {
      setImportError(null);
      const text = await file.text();
      const imported = await importIdTemplateBundle(text, 'default-org', 'Mari Muthu');
      setCustomTemplates(prev => [imported, ...prev.filter(t => t.id !== imported.id)]);
      applyCustomTemplate(imported);
    } catch (err: any) {
      console.warn('Failed to import .idtemplate bundle:', err);
      setImportError(err?.message || 'Corrupted or invalid template JSON file.');
    }
  }, [applyCustomTemplate]);

  const handleCloneStarterTemplate = useCallback(async (starter: TemplateCardInfo) => {
    try {
      const cloned = await cloneStarterToCustomTemplate(starter, 'default-org', 'Mari Muthu');
      setCustomTemplates(prev => [cloned, ...prev.filter(t => t.id !== cloned.id)]);
      applyCustomTemplate(cloned);
    } catch (err) {
      console.warn('Failed to clone starter template:', err);
    }
  }, [applyCustomTemplate]);

  const handleCreateBlankDesign = useCallback(() => {
    const orient = geometry.orientation === 'portrait' ? 'portrait' : 'landscape';
    const studioDesign = buildCreativeStudioYellowBlackTemplate(orient, 'default-org', 'Mari Muthu');
    const customStudio: IdCardCustomTemplate = {
      ...studioDesign,
      id: `tpl_canva_studio_${Date.now()}`,
      name: `Creative Studio — Cyber Yellow & Matte Black (${orient})`,
      status: 'draft',
    };
    setCustomTemplates(prev => [customStudio, ...prev.filter(t => t.id !== customStudio.id)]);
    saveCustomTemplate(customStudio).catch(() => {});
    applyCustomTemplate(customStudio);
    setMode('design');
  }, [geometry.orientation, applyCustomTemplate]);

  const handleApplyStudioTheme = useCallback(
    (themeId: string) => {
      const descriptor = CANVA_STUDIO_THEMES.find(t => t.id === themeId);
      if (!descriptor) return;
      const orient = geometry.orientation === 'portrait' ? 'portrait' : 'landscape';
      const built = descriptor.buildTemplate(orient, 'default-org', 'Mari Muthu');
      const themed: IdCardCustomTemplate = {
        ...built,
        id: selectedTemplateId || built.id,
      };
      setCustomTemplates(prev => {
        const exists = prev.some(t => t.id === themed.id);
        return exists ? prev.map(t => (t.id === themed.id ? themed : t)) : [themed, ...prev];
      });
      saveCustomTemplate(themed).catch(() => {});
      applyCustomTemplate(themed);
    },
    [geometry.orientation, selectedTemplateId, applyCustomTemplate]
  );

  const handleCloneOrganizationTemplate = useCallback((tpl: IdCardCustomTemplate) => {
    const now = new Date().toISOString();
    const optimisticClone: IdCardCustomTemplate = {
      ...JSON.parse(JSON.stringify(tpl)),
      id: `tpl_org_clone_${Date.now()}`,
      name: `${tpl.name} (Copy)`,
      version: 1,
      status: 'draft',
      isDefault: false,
      issuedCardsCount: 0,
      versionHistory: [],
      createdAt: now,
      updatedAt: now,
    };
    setCustomTemplates(prev => [optimisticClone, ...prev]);
    applyCustomTemplate(optimisticClone);
    cloneOrganizationTemplate(tpl, 'default-org', 'Mari Muthu').catch(() => {});
  }, [applyCustomTemplate]);

  const handleArchiveOrganizationTemplate = useCallback((tpl: IdCardCustomTemplate) => {
    const now = new Date().toISOString();
    const optimisticArchived: IdCardCustomTemplate = {
      ...tpl,
      status: 'archived',
      isDefault: false,
      updatedAt: now,
    };
    setCustomTemplates(prev => {
      const next = prev.map(t => (t.id === tpl.id ? optimisticArchived : t));
      if (selectedTemplateId === tpl.id) {
        const nextActive = next.find(t => t.status !== 'archived');
        if (nextActive) {
          applyCustomTemplate(nextActive);
        } else {
          setSelectedTemplateId('');
        }
      }
      return next;
    });
    archiveOrganizationTemplate(tpl, 'Mari Muthu').catch(() => {});
  }, [selectedTemplateId, applyCustomTemplate]);

  const handleEditOrganizationTemplate = useCallback((tpl: IdCardCustomTemplate) => {
    applyCustomTemplate(tpl);
    setMode('design');
  }, [applyCustomTemplate]);

  const handleImportDefaultEpsPackage = useCallback(() => {
    const epsTpl = getDefaultEpsYellowGeometricTemplate('default-org');
    setCustomTemplates(prev => [epsTpl, ...prev.filter(t => t.id !== epsTpl.id)]);
    saveCustomTemplate(epsTpl).catch(() => {});
    applyCustomTemplate(epsTpl);
  }, [applyCustomTemplate]);

  // Debounced Draft Autosave in Mode B (Designer)
  useEffect(() => {
    if (mode !== 'design' || !selectedTemplateId) return;
    const activeTpl = customTemplates.find(t => t.id === selectedTemplateId);
    const timer = setTimeout(() => {
      const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      saveDraftRecoverySnapshot({
        organizationId: 'default-org',
        templateId: selectedTemplateId,
        templateName: activeTpl?.name || 'Organization Design Draft',
        savedAt: new Date().toISOString(),
        geometry,
        front: {
          bg: frontSide.bg,
          elements: frontSide.els,
          keepOutZones: frontSide.keepOutZones || [],
          baseAsset: activeTpl?.sides.front.baseAsset,
          overlayAsset: activeTpl?.sides.front.overlayAsset,
        },
        back: {
          bg: backSide.bg,
          elements: backSide.els,
          keepOutZones: backSide.keepOutZones || [],
          baseAsset: activeTpl?.sides.back.baseAsset,
          overlayAsset: activeTpl?.sides.back.overlayAsset,
        },
      });
      setLastAutosavedAt(timeLabel);
    }, 600);
    return () => clearTimeout(timer);
  }, [mode, selectedTemplateId, frontSide, backSide, geometry, customTemplates]);

  const handleSaveDesignerDraft = useCallback(() => {
    const activeTpl = customTemplates.find(t => t.id === selectedTemplateId);
    const now = new Date().toISOString();
    const updatedTpl: IdCardCustomTemplate = activeTpl
      ? {
          ...activeTpl,
          geometry,
          updatedAt: now,
          sides: {
            front: {
              ...activeTpl.sides.front,
              bg: frontSide.bg,
              elements: frontSide.els,
            },
            back: {
              ...activeTpl.sides.back,
              bg: backSide.bg,
              elements: backSide.els,
            },
          },
        }
      : {
          ...createEmptyCustomTemplate(
            'Organization Custom Design',
            geometry.orientation === 'portrait' ? 'portrait' : 'landscape',
            'default-org',
            'Mari Muthu'
          ),
          geometry,
          sides: {
            front: { bg: frontSide.bg, elements: frontSide.els, keepOutZones: frontSide.keepOutZones || [] },
            back: { bg: backSide.bg, elements: backSide.els, keepOutZones: backSide.keepOutZones || [] },
          },
        };
    setCustomTemplates(prev => [updatedTpl, ...prev.filter(t => t.id !== updatedTpl.id)]);
    setSelectedTemplateId(updatedTpl.id);
    saveCustomTemplate(updatedTpl).catch(() => {});
    clearDraftRecoverySnapshot('default-org');
    setDraftRecovery(null);
    setLastAutosavedAt('Saved');
  }, [customTemplates, selectedTemplateId, geometry, frontSide, backSide]);

  const handlePublishDesignerVersion = useCallback(() => {
    const activeTpl = customTemplates.find(t => t.id === selectedTemplateId);
    if (activeTpl) {
      const synced: IdCardCustomTemplate = {
        ...activeTpl,
        geometry,
        sides: {
          front: { ...activeTpl.sides.front, bg: frontSide.bg, elements: frontSide.els },
          back: { ...activeTpl.sides.back, bg: backSide.bg, elements: backSide.els },
        },
      };
      handleBumpTemplateVersion(synced);
      clearDraftRecoverySnapshot('default-org');
      setDraftRecovery(null);
    } else {
      handleSaveDesignerDraft();
    }
  }, [customTemplates, selectedTemplateId, geometry, frontSide, backSide, handleBumpTemplateVersion, handleSaveDesignerDraft]);

  // Auto-load Tenant Logo & Active Workforce
  useEffect(() => {
    let isMounted = true;

    // 1. Auto-load Organization Corporate Logo
    const logo = new Image();
    logo.crossOrigin = 'anonymous';
    logo.onload = () => {
      if (isMounted) {
        setLogoImg(logo);
      }
    };
    logo.onerror = () => {
      logo.src = '/joy-logo.svg';
    };
    logo.src = '/joy-corporate-logo-transparent.png';

    // 2. Load Workforce matching Sidebar Employee Management filter (19 Active)
    fetchEmployeesForIdCards(undefined, { includeInactive: includeSeparated })
      .then(loaded => {
        if (isMounted && loaded && loaded.length > 0) {
          setEmployees(loaded);
          setSelectedEmployeeIds(new Set(loaded.map(e => e.id)));
        }
      })
      .catch(() => {});

    // 3. V2.1: Load Organization Custom Templates & auto-upgrade any legacy V1 flat skeletons
    fetchOrganizationTemplates()
      .then(list => {
        if (!isMounted) return;
        const rawList = Array.isArray(list) ? list : [];
        // Upgrade any legacy flat 2D 'Organization Custom Design' skeleton to Canva Creative Studio
        const validList = rawList.map(tpl => {
          const hasLegacyFlatHeader = tpl.sides?.front?.elements?.some(
            (e: any) => e.type === 'text' && e.text === 'EMPLOYEE ID'
          );
          if (tpl.name === 'Organization Custom Design' || hasLegacyFlatHeader) {
            const upgraded = buildCreativeStudioYellowBlackTemplate(
              tpl.geometry?.orientation === 'landscape' ? 'landscape' : 'portrait',
              tpl.organizationId || 'default-org',
              tpl.createdBy || 'Mari Muthu'
            );
            return { ...upgraded, id: tpl.id };
          }
          return tpl;
        });
        setCustomTemplates(validList);
        const activeList = validList.filter(t => t.status !== 'archived');
        const defaultTpl = activeList.find(t => t.isDefault) || activeList[0];
        if (defaultTpl) {
          applyCustomTemplate(defaultTpl);
        } else {
          setSelectedTemplateId('');
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setCustomTemplates([]);
        setSelectedTemplateId('');
      });

    return () => {
      isMounted = false;
    };
  }, [includeSeparated, applyCustomTemplate]);

  // Compute Active Selected Employees
  const selectedEmployees = useMemo(() => {
    return employees.filter(e => selectedEmployeeIds.has(e.id));
  }, [employees, selectedEmployeeIds]);

  const activeEmployee =
    selectedEmployees[activeEmployeeIndex] ||
    selectedEmployees[0] ||
    employees[0] ||
    getSampleEmployees()[0];

  // Preflight Quality Audit
  const preflightReport = useMemo(() => {
    return runPreflightChecks(
      { front: frontSide, back: backSide },
      selectedEmployees.length > 0 ? selectedEmployees : employees,
      geometry,
      logoImg,
      photosMap
    );
  }, [frontSide, backSide, selectedEmployees, employees, geometry, logoImg, photosMap]);

  // Handle Template Selection
  const handleSelectTemplate = useCallback(
    (category: TemplateCategory) => {
      setSelectedTemplate(category);
      setSelectedTemplateId(category);
      const tpl = getTemplateByName(
        category,
        geometry.orientation === 'portrait' ? 'portrait' : 'landscape'
      );
      setFrontSide(prev => ({
        ...prev,
        bg: tpl.frontBg || '#ffffff',
        bgImg: null,
        bgName: '',
        overlayImg: null,
        overlayName: '',
        els: tpl.front,
      }));
      setBackSide(prev => ({
        ...prev,
        bg: tpl.backBg || '#ffffff',
        bgImg: null,
        bgName: '',
        overlayImg: null,
        overlayName: '',
        els: tpl.back,
      }));
    },
    [geometry.orientation]
  );

  const handleSelectTemplateId = useCallback(
    (id: string) => {
      setSelectedTemplateId(id);
      const builtin = BUILTIN_TEMPLATES_V2.find(t => t.id === id);
      if (builtin) {
        handleSelectTemplate(builtin.id as TemplateCategory);
        return;
      }
      const custom = customTemplates.find(t => t.id === id);
      if (custom) {
        applyCustomTemplate(custom);
      }
    },
    [customTemplates, handleSelectTemplate, applyCustomTemplate]
  );

  // Handle Orientation Switch (Uses Canva Creative Studio layout instead of legacy V1 flat box)
  const handleOrientationChange = useCallback(
    (newOrientation: 'landscape' | 'portrait') => {
      const newGeom = newOrientation === 'portrait' ? CR80_PORTRAIT : CR80_LANDSCAPE;
      setGeometry(newGeom);
      const canvaTpl = buildCreativeStudioYellowBlackTemplate(newOrientation);
      setFrontSide(prev => ({
        ...prev,
        bg: canvaTpl.sides.front.bg || '#ffe600',
        els: canvaTpl.sides.front.elements,
        keepOutZones: canvaTpl.sides.front.keepOutZones,
      }));
      setBackSide(prev => ({
        ...prev,
        bg: canvaTpl.sides.back.bg || '#0a0a0a',
        els: canvaTpl.sides.back.elements,
        keepOutZones: canvaTpl.sides.back.keepOutZones,
      }));
    },
    []
  );

  // Toggle Employee Selection
  const handleToggleEmployee = useCallback((id: string) => {
    setSelectedEmployeeIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((ids: string[]) => {
    setSelectedEmployeeIds(new Set(ids));
  }, []);

  const handleDeselectAll = useCallback(() => {
    setSelectedEmployeeIds(new Set());
  }, []);

  // Upload Photo for a Specific Person
  const handleUploadPhotoForPerson = useCallback(
    async (personId: string, file: File) => {
      try {
        const img = await loadImageFromFile(file);
        const targetEmp = employees.find(e => e.id === personId);
        if (targetEmp) {
          targetEmp.__img = img;
          targetEmp.photo_matched = true;
          setPhotosMap(prev => {
            const next = new Map(prev);
            next.set(targetEmp.photo.toLowerCase(), img);
            if (targetEmp.idno) {
              next.set(`${targetEmp.idno.toLowerCase()}.jpg`, img);
              next.set(`${targetEmp.idno.toLowerCase()}.png`, img);
            }
            return next;
          });
          setEmployees([...employees]);
        }
      } catch (err) {
        console.error('Error loading employee photo:', err);
      }
    },
    [employees]
  );

  // Upload Logo
  const handleUploadLogo = useCallback(async (file: File) => {
    try {
      const img = await loadImageFromFile(file);
      setLogoImg(img);
    } catch (err) {
      console.error('Error loading company logo:', err);
    }
  }, []);

  // Primary Contextual Action Handler
  const handlePrimaryAction = useCallback(() => {
    if (mode === 'design') {
      setIsSaveTemplateOpen(true);
      return;
    }

    switch (step) {
      case 'template':
        setStep('people');
        break;
      case 'people':
        setStep('review');
        break;
      case 'review':
        setStep('generate');
        break;
      case 'generate':
        // Trigger export with default PDF format
        handleGenerate('single_pdf', 300, 'both', true);
        break;
    }
  }, [mode, step]);

  // CMYK PDF & Print Production Export Orchestrator
  const handleGenerate = async (
    format: PrintOutputFormat,
    dpi: 300 | 600,
    sides: 'both' | 'front' | 'back',
    cropMarks: boolean,
    iccProfile: IccOutputIntentProfile = 'ISO_COATED_V2'
  ) => {
    if (isExporting || selectedEmployees.length === 0) return;

    try {
      setIsExporting(true);
      setExportProgress(0);

      const paperChoice = format === 'sheet_a3' ? '297x420' : format === 'sheet_sra3' ? '320x450' : '210x297';
      const layoutChoice = format.startsWith('sheet_') ? 'sheet' : 'card';

      const blob = await exportCmykPdfFile(
        { front: frontSide, back: backSide },
        selectedEmployees,
        geometry,
        {
          dpi,
          layout: layoutChoice,
          paper: paperChoice,
          sides,
          cropMarks,
          logo: logoImg,
          photos: photosMap,
          onProgress: (pct) => setExportProgress(pct),
        }
      );

      const url = URL.createObjectURL(blob);
      setLastGeneratedBlobUrl(url);

      const a = document.createElement('a');
      a.href = url;
      a.download = `Joy_PeopleHR_ID_Cards_${selectedEmployees.length}_Cards_${iccProfile}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Record Idempotent Production Batch & Update Template Issuance Count
      const activeOrgTpl = customTemplates.find(t => t.id === selectedTemplateId);
      const { isDuplicate } = recordPrintProductionBatch({
        templateId: activeOrgTpl?.id || selectedTemplateId || 'org-custom',
        templateName: activeOrgTpl?.name || 'Organization ID Design',
        templateVersion: activeOrgTpl?.version || 1,
        employeeIds: selectedEmployees.map(e => e.id),
        format,
        dpi,
        iccProfile,
        createdBy: 'Mari Muthu',
      });
      setRecentBatches(getPrintProductionBatches());

      if (!isDuplicate && activeOrgTpl) {
        const updatedCount = (activeOrgTpl.issuedCardsCount || 0) + selectedEmployees.length;
        setCustomTemplates(prev =>
          prev.map(t => (t.id === activeOrgTpl.id ? { ...t, issuedCardsCount: updatedCount } : t))
        );
        recordTemplateIssuance(activeOrgTpl, selectedEmployees.length).catch(() => {});
      }

      // Security & Compliance Audit Log
      try {
        await supabase.from('audit_logs').insert({
          action: 'ID_CARDS_ISSUED',
          module: 'ID_CARD_STUDIO_V2',
          details: {
            card_count: selectedEmployees.length,
            employee_ids: selectedEmployees.map(e => e.idno),
            format,
            dpi,
            icc_profile: iccProfile,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (logErr) {
        console.warn('Audit log write skipped:', logErr);
      }
    } catch (err: any) {
      console.error('ID Card export failed:', err);
      alert(`Export error: ${err?.message || 'Could not compile CMYK print file.'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadAgain = () => {
    if (lastGeneratedBlobUrl) {
      const a = document.createElement('a');
      a.href = lastGeneratedBlobUrl;
      a.download = `Joy_PeopleHR_ID_Cards_${selectedEmployees.length}_Cards.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Element Manipulation Handlers for Mode B (Designer)
  const currentSideData = activeSide === 'front' ? frontSide : backSide;
  const setCurrentSideData = activeSide === 'front' ? setFrontSide : setBackSide;

  const handleUpdateElement = (id: string, updates: Partial<CardElement>) => {
    setCurrentSideData(prev => ({
      ...prev,
      els: prev.els.map(e => (e.id === id ? ({ ...e, ...updates } as CardElement) : e)),
    }));
  };

  const handleDeleteElement = (id: string) => {
    setCurrentSideData(prev => ({
      ...prev,
      els: prev.els.filter(e => e.id !== id),
    }));
    if (selectedElementId === id) setSelectedElementId(null);
  };

  const handleDuplicateElement = (id: string) => {
    const el = currentSideData.els.find(e => e.id === id);
    if (!el) return;
    const duplicated: CardElement = {
      ...JSON.parse(JSON.stringify(el)),
      id: 'el_' + Date.now(),
      x: el.x + 2,
      y: el.y + 2,
    };
    setCurrentSideData(prev => ({
      ...prev,
      els: [...prev.els, duplicated],
    }));
    setSelectedElementId(duplicated.id);
  };

  const handleReorderElements = (reordered: CardElement[]) => {
    setCurrentSideData(prev => ({
      ...prev,
      els: reordered,
    }));
  };

  const handleAddElement = (type: ElementType) => {
    let newEl: CardElement;
    if (type === 'text') newEl = createTextElement({ x: 10, y: 20 });
    else if (type === 'image') newEl = createImageElement({ x: 10, y: 10 });
    else if (type === 'rect') newEl = createRectElement({ x: 0, y: 0, w: geometry.w, h: 12 });
    else newEl = createQrElement({ x: geometry.w - 22, y: geometry.h - 22 });

    setCurrentSideData(prev => ({ ...prev, els: [...prev.els, newEl] }));
    setSelectedElementId(newEl.id);
  };

  const handleAlignElement = (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (!selectedElementId) return;
    setCurrentSideData(prev => ({
      ...prev,
      els: prev.els.map(el => {
        if (el.id !== selectedElementId) return el;
        let x = el.x;
        let y = el.y;
        if (alignment === 'left') x = geometry.safe;
        else if (alignment === 'center') x = (geometry.w - el.w) / 2;
        else if (alignment === 'right') x = geometry.w - geometry.safe - el.w;
        else if (alignment === 'top') y = geometry.safe;
        else if (alignment === 'middle') y = (geometry.h - el.h) / 2;
        else if (alignment === 'bottom') y = geometry.h - geometry.safe - el.h;
        return { ...el, x, y };
      }),
    }));
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs mt-1">
      {/* 1. Universal Top Header */}
      <IdCardStudioHeaderV2
        mode={mode}
        onModeChange={setMode}
        step={step}
        onStepChange={setStep}
        activeSide={activeSide}
        onSideChange={setActiveSide}
        zoom={zoom}
        onZoomChange={setZoom}
        onZoomFit={() => setZoom(1.0)}
        showGuides={showGuides}
        onToggleGuides={() => setShowGuides(g => !g)}
        issues={preflightReport.issues}
        onOpenWarnings={() => setIsPreflightOpen(true)}
        selectedPeopleCount={selectedEmployees.length}
        isGenerating={isExporting}
        onPrimaryAction={handlePrimaryAction}
        onBackToPeople={onBackToPeople}
        onToggleV1V2={onToggleV1V2}
      />

      {/* 2. Mode A: 4-Step Stepper Navigation Bar */}
      {mode === 'issue' && (
        <IdCardIssueStepper
          currentStep={step}
          onStepClick={setStep}
          selectedPeopleCount={selectedEmployees.length}
          warningsCount={preflightReport.issues.filter(i => i.lv === 'check' || i.lv === 'fix').length}
        />
      )}

      {/* 2b. V2.1 Crash-Prevention Draft Recovery Banner */}
      {draftRecovery && mode === 'issue' && step === 'template' && (
        <div className="px-6 py-2.5 bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs">
          <span className="text-amber-900 dark:text-amber-200 font-semibold">
            Unsaved draft recovery available for <strong>{draftRecovery.templateName}</strong> (saved at{' '}
            {new Date(draftRecovery.savedAt).toLocaleTimeString()}).
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setGeometry(draftRecovery.geometry);
                setFrontSide(prev => ({
                  ...prev,
                  bg: draftRecovery.front.bg,
                  els: draftRecovery.front.elements,
                }));
                setBackSide(prev => ({
                  ...prev,
                  bg: draftRecovery.back.bg,
                  els: draftRecovery.back.elements,
                }));
                setSelectedTemplateId(draftRecovery.templateId);
                setMode('design');
                setDraftRecovery(null);
              }}
              className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer"
            >
              Restore Unsaved Draft
            </button>
            <button
              type="button"
              onClick={() => {
                clearDraftRecoverySnapshot('default-org');
                setDraftRecovery(null);
              }}
              className="px-2.5 py-1 rounded-lg text-amber-800 dark:text-amber-300 hover:underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* 3. Main Workspace Body */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        {mode === 'design' ? (
          /* Mode B: Professional 3-Pane Template Designer */
          <IdCardTemplateDesignerV2
            sideData={currentSideData}
            companionSideData={activeSide === 'front' ? backSide : frontSide}
            activeEmployee={activeEmployee}
            geometry={geometry}
            activeSide={activeSide}
            onSideChange={setActiveSide}
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            onUpdateElement={handleUpdateElement}
            onDeleteElement={handleDeleteElement}
            onDuplicateElement={handleDuplicateElement}
            onAddElement={handleAddElement}
            onInsertCustomElement={el => {
              setCurrentSideData(prev => ({ ...prev, els: [...prev.els, el] }));
              setSelectedElementId(el.id);
            }}
            onChangeSideBg={bg => {
              setCurrentSideData(prev => ({ ...prev, bg }));
            }}
            onApplyStudioTheme={handleApplyStudioTheme}
            onReorderElements={handleReorderElements}
            onAlignElement={handleAlignElement}
            onUndo={() => {}}
            onRedo={() => {}}
            zoom={zoom}
            showGuides={showGuides}
            onToggleGuides={() => setShowGuides(g => !g)}
            snapToGrid={snapToGrid}
            logoImg={logoImg}
            photosMap={photosMap}
            activeTab={designerTab}
            onTabChange={setDesignerTab}
            templateName={
              customTemplates.find(t => t.id === selectedTemplateId)?.name ||
              'Creative Studio — Cyber Yellow & Matte Black'
            }
            templateVersion={
              customTemplates.find(t => t.id === selectedTemplateId)?.version || 1
            }
            lastAutosavedAt={lastAutosavedAt}
            onSaveDraft={handleSaveDesignerDraft}
            onPublishVersion={handlePublishDesignerVersion}
          />
        ) : (
          /* Mode A: 4-Step Flow Steps */
          <>
            {step === 'template' && (
              <IdCardTemplatePickerStep
                selectedTemplateId={selectedTemplateId}
                onSelectTemplateId={handleSelectTemplateId}
                geometry={geometry}
                onOrientationChange={handleOrientationChange}
                sampleEmployee={activeEmployee}
                onProceed={() => setStep('people')}
                onOpenUploadWizard={() => setIsUploadWizardOpen(true)}
                onOpenDesigner={() => setMode('design')}
                customTemplates={customTemplates}
                onSelectCustomTemplate={applyCustomTemplate}
                onBumpTemplateVersion={handleBumpTemplateVersion}
                onImportTemplateBundle={handleImportTemplateBundle}
                onCloneStarterTemplate={handleCloneStarterTemplate}
                onCreateBlankDesign={handleCreateBlankDesign}
                onCloneOrganizationTemplate={handleCloneOrganizationTemplate}
                onArchiveOrganizationTemplate={handleArchiveOrganizationTemplate}
                onEditOrganizationTemplate={handleEditOrganizationTemplate}
                onImportDefaultEpsPackage={handleImportDefaultEpsPackage}
                importError={importError}
              />
            )}

            {step === 'people' && (
              <IdCardPeopleSelectStep
                employees={employees}
                selectedEmployeeIds={selectedEmployeeIds}
                onToggleEmployee={handleToggleEmployee}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                onProceed={() => setStep('review')}
                photosMap={photosMap}
                includeSeparated={includeSeparated}
                onToggleSeparated={setIncludeSeparated}
              />
            )}

            {step === 'review' && (
              <IdCardReviewFixStep
                sideData={currentSideData}
                activeEmployee={activeEmployee}
                employeeIndex={activeEmployeeIndex}
                totalEmployees={selectedEmployees.length}
                geometry={geometry}
                zoom={zoom}
                onZoomChange={setZoom}
                showGuides={showGuides}
                onToggleGuides={() => setShowGuides(g => !g)}
                activeSide={activeSide}
                onToggleSide={() => setActiveSide(s => (s === 'front' ? 'back' : 'front'))}
                onPrevEmployee={() =>
                  setActiveEmployeeIndex(i =>
                    i > 0 ? i - 1 : Math.max(0, selectedEmployees.length - 1)
                  )
                }
                onNextEmployee={() =>
                  setActiveEmployeeIndex(i =>
                    i < selectedEmployees.length - 1 ? i + 1 : 0
                  )
                }
                onSelectEmployeeIndex={setActiveEmployeeIndex}
                logoImg={logoImg}
                photosMap={photosMap}
                issues={preflightReport.issues}
                onUploadPhotoForPerson={handleUploadPhotoForPerson}
                onUploadLogo={handleUploadLogo}
                onProceed={() => setStep('generate')}
              />
            )}

            {step === 'generate' && (
              <IdCardGenerateStep
                selectedEmployees={selectedEmployees}
                geometry={geometry}
                templateName={
                  customTemplates.find(t => t.id === selectedTemplateId)?.name ||
                  'Organization Custom Template'
                }
                templateVersion={
                  customTemplates.find(t => t.id === selectedTemplateId)?.version || 1
                }
                isExporting={isExporting}
                exportProgress={exportProgress}
                onGenerate={handleGenerate}
                lastGeneratedBlobUrl={lastGeneratedBlobUrl}
                onDownloadAgain={handleDownloadAgain}
                recentBatches={recentBatches}
              />
            )}
          </>
        )}
      </main>

      {/* Preflight Modal */}
      <IdCardPreflightModal
        isOpen={isPreflightOpen}
        onClose={() => setIsPreflightOpen(false)}
        issues={preflightReport.issues}
      />

      {/* Save Template Modal */}
      <IdCardSaveTemplateModal
        isOpen={isSaveTemplateOpen}
        onClose={() => setIsSaveTemplateOpen(false)}
        frontSide={frontSide}
        backSide={backSide}
        geometry={geometry}
        onSaveSuccess={() => {}}
      />

      {/* 5-Step Bring-Your-Own Design Wizard Modal */}
      {isUploadWizardOpen && (
        <IdCardUploadDesignWizard
          isOpen={isUploadWizardOpen}
          onClose={() => setIsUploadWizardOpen(false)}
          onTemplatePublished={handleTemplatePublished}
          sampleEmployees={employees}
        />
      )}
    </div>
  );
};
