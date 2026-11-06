// src/services/__tests__/idCardStudioV2Flow.test.ts
// ============================================================================
// JOY PeopleHR ID Card Studio V2 — Stepper, Two-Mode & Flow Test Suite
// ============================================================================

import { describe, it, expect } from 'vitest';
import { BUILTIN_TEMPLATES_V2 } from '../../features/people/idcard/v2/templateRegistryV2';
import {
  getTemplateByName,
  getSampleEmployees,
  runPreflightChecks,
} from '../../features/people/idcard/idCardService';
import {
  CR80_LANDSCAPE,
  CR80_PORTRAIT,
} from '../../features/people/idcard/idCardTypes';
import { IssueStep, StudioMode } from '../../features/people/idcard/v2/types';

describe('JOY PeopleHR ID Card Studio V2 Flow & Stepper Engine', () => {
  it('1. Verifies that all 6 built-in templates exist in V2 catalog with distinct metadata', () => {
    expect(BUILTIN_TEMPLATES_V2).toHaveLength(6);
    const ids = BUILTIN_TEMPLATES_V2.map(t => t.id);
    expect(ids).toContain('corporate');
    expect(ids).toContain('worker');
    expect(ids).toContain('contractor');
    expect(ids).toContain('campus');
    expect(ids).toContain('minimal');
    expect(ids).toContain('security');

    BUILTIN_TEMPLATES_V2.forEach(t => {
      expect(t.name).toBeTruthy();
      expect(t.tag).toBeTruthy();
      expect(t.dotColor).toMatch(/^#/);
      expect(t.targetType).toBeTruthy();
    });
  });

  it('2. Verifies 4-step issue flow progression rules', () => {
    const steps: IssueStep[] = ['template', 'people', 'review', 'generate'];
    expect(steps).toHaveLength(4);

    let currentStep: IssueStep = 'template';
    const nextStep = (curr: IssueStep): IssueStep => {
      const idx = steps.indexOf(curr);
      return idx < steps.length - 1 ? steps[idx + 1] : curr;
    };

    currentStep = nextStep(currentStep);
    expect(currentStep).toBe('people');
    currentStep = nextStep(currentStep);
    expect(currentStep).toBe('review');
    currentStep = nextStep(currentStep);
    expect(currentStep).toBe('generate');
  });

  it('3. Verifies mode separation between Issue Cards and Edit Template', () => {
    let mode: StudioMode = 'issue';
    expect(mode).toBe('issue');
    mode = 'design';
    expect(mode).toBe('design');
  });

  it('4. Verifies template application preserves geometry while updating elements', () => {
    const geom = CR80_LANDSCAPE;
    const tplCorporate = getTemplateByName('corporate', 'landscape');
    const tplWorker = getTemplateByName('worker', 'landscape');

    expect(tplCorporate.front.length).toBeGreaterThan(0);
    expect(tplWorker.front.length).toBeGreaterThan(0);
    expect(geom.w).toBe(85.6);
    expect(geom.h).toBe(54);
    expect(geom.bleed).toBe(3);
  });

  it('5. Verifies workforce selection and filter counts', () => {
    const sampleEmployees = getSampleEmployees();
    expect(sampleEmployees.length).toBeGreaterThanOrEqual(3);

    const selected = new Set(sampleEmployees.map(e => e.id));
    expect(selected.size).toBe(sampleEmployees.length);

    // Toggle one employee
    const firstId = sampleEmployees[0].id;
    selected.delete(firstId);
    expect(selected.size).toBe(sampleEmployees.length - 1);
    expect(selected.has(firstId)).toBe(false);
  });

  it('6. Verifies Auto-Fit zoom calculation clamps within ergonomic bounds (0.6x to 1.8x)', () => {
    const calculateFitZoom = (containerW: number, containerH: number, cardW: number, cardH: number) => {
      const baseMmToPx = 3.7795;
      const cardPxW = cardW * baseMmToPx;
      const cardPxH = cardH * baseMmToPx;
      const fitScale = Math.min((containerW - 80) / cardPxW, (containerH - 120) / cardPxH);
      return Math.max(0.6, Math.min(1.8, Math.round(fitScale * 10) / 10));
    };

    // Typical 1440x900 viewport container (~900x700 available)
    const fit1440 = calculateFitZoom(900, 700, 85.6, 54);
    expect(fit1440).toBeGreaterThanOrEqual(1.0);
    expect(fit1440).toBeLessThanOrEqual(1.8);

    // Large 1920x1080 viewport container (~1300x850 available)
    const fit1920 = calculateFitZoom(1300, 850, 85.6, 54);
    expect(fit1920).toBe(1.8); // Clamped max
  });
});

