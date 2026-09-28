// tests/unit/routeRegistry.test.ts
// ============================================================
// Joy PeopleHR — Comprehensive Slug, Matcher, and Route Engine Tests
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  normalizePath,
  matchRoute,
  isActiveRoute,
  isGroupActive,
  canonicalizeRoute,
  resolveRouteId,
  findRouteDefinition,
  getNavigationState,
} from '../../src/lib/router/routeRegistry';

describe('Joy PeopleHR Route Engine — Unit Tests', () => {
  describe('normalizePath()', () => {
    it('normalizes trailing slashes, whitespace, and casing', () => {
      expect(normalizePath('/payroll/')).toBe('/payroll');
      expect(normalizePath('/payroll/statutory/')).toBe('/payroll/statutory');
      expect(normalizePath(' /PAYROLL/STATUTORY ')).toBe('/payroll/statutory');
      expect(normalizePath('people')).toBe('/people');
      expect(normalizePath('')).toBe('/');
      expect(normalizePath('///payroll//statutory///')).toBe('/payroll/statutory');
    });
  });

  describe('canonicalizeRoute()', () => {
    it('resolves internal IDs to canonical URL slugs', () => {
      expect(canonicalizeRoute('payroll-statutory')).toBe('/payroll/statutory');
      expect(canonicalizeRoute('payroll-processing')).toBe('/payroll/runs');
      expect(canonicalizeRoute('attendance-employees')).toBe('/attendance/employees');
      expect(canonicalizeRoute('history')).toBe('/attendance/history');
      expect(canonicalizeRoute('biometric')).toBe('/biometric');
      expect(canonicalizeRoute('attendance-rules')).toBe('/biometric/rules');
      expect(canonicalizeRoute('vendor-settlement-workspace')).toBe('/vendors/billing');
      expect(canonicalizeRoute('people')).toBe('/people');
      expect(canonicalizeRoute('dashboard')).toBe('/dashboard');
    });

    it('resolves legacy aliases to canonical URLs', () => {
      expect(canonicalizeRoute('/payroll-statutory')).toBe('/payroll/statutory');
      expect(canonicalizeRoute('/payroll-processing')).toBe('/payroll/runs');
      expect(canonicalizeRoute('/attendance-employees')).toBe('/attendance/employees');
      expect(canonicalizeRoute('/vendor-settlement-workspace')).toBe('/vendors/billing');
    });
  });

  describe('resolveRouteId()', () => {
    it('resolves canonical slugs to internal route IDs', () => {
      expect(resolveRouteId('/payroll/statutory')).toBe('payroll-statutory');
      expect(resolveRouteId('/payroll/runs')).toBe('payroll-processing');
      expect(resolveRouteId('/attendance/employees')).toBe('attendance-employees');
      expect(resolveRouteId('/attendance/history')).toBe('history');
      expect(resolveRouteId('/biometric/rules')).toBe('attendance-rules');
      expect(resolveRouteId('/vendors/billing')).toBe('vendor-settlement-workspace');
    });
  });

  describe('matchRoute() — Path Collision Prevention', () => {
    it('matches exact routes and legitimate sub-paths without false positives', () => {
      // Direct exact match
      expect(matchRoute('/payroll/statutory', '/payroll/statutory')).toBe(true);
      expect(matchRoute('/payroll/statutory/', '/payroll/statutory')).toBe(true);

      // Hierarchical parent prefix match
      expect(matchRoute('/payroll/statutory', '/payroll')).toBe(true);
      expect(matchRoute('/payroll/runs/123', '/payroll/runs')).toBe(true);
      expect(matchRoute('/payroll/runs/123/', '/payroll/runs')).toBe(true);

      // CRITICAL: Must NEVER falsely match hyphenated sibling routes
      expect(matchRoute('/payroll-settings', '/payroll')).toBe(false);
      expect(matchRoute('/payroll-statutory', '/payroll')).toBe(false);
      expect(matchRoute('/payroll-stat', '/payroll')).toBe(false);
      expect(matchRoute('/attendance-history', '/attendance')).toBe(false);
    });

    it('handles exact flag appropriately', () => {
      expect(matchRoute('/payroll/statutory', '/payroll', true)).toBe(false);
      expect(matchRoute('/payroll', '/payroll', true)).toBe(true);
    });
  });

  describe('isActiveRoute() — Sidebar Active Item Highlighting', () => {
    it('activates Statutory & Tax Rules when current path is /payroll/statutory', () => {
      expect(isActiveRoute('payroll-statutory', '/payroll/statutory')).toBe(true);
      expect(isActiveRoute('payroll-statutory', 'payroll-statutory')).toBe(true);
      expect(isActiveRoute('payroll-statutory', '/payroll-statutory')).toBe(true);

      // Other payroll items must NOT be active
      expect(isActiveRoute('payroll-dashboard', '/payroll/statutory')).toBe(false);
      expect(isActiveRoute('payroll-settings', '/payroll/statutory')).toBe(false);
      expect(isActiveRoute('payroll-processing', '/payroll/statutory')).toBe(false);
    });

    it('activates Payroll Processing & Runs on /payroll/runs', () => {
      expect(isActiveRoute('payroll-processing', '/payroll/runs')).toBe(true);
      expect(isActiveRoute('payroll-processing', '/payroll/runs/123')).toBe(true);
      expect(isActiveRoute('payroll-dashboard', '/payroll/runs')).toBe(false);
    });

    it('activates Attendance Dashboard only on exact /attendance', () => {
      expect(isActiveRoute('attendance', '/attendance')).toBe(true);
      expect(isActiveRoute('attendance', 'attendance')).toBe(true);
      expect(isActiveRoute('attendance', '/attendance/employees')).toBe(false);
      expect(isActiveRoute('attendance-employees', '/attendance/employees')).toBe(true);
      expect(isActiveRoute('attendance-employees', '/attendance')).toBe(false);
    });
  });

  describe('isGroupActive() and getNavigationState()', () => {
    const mockGroups = [
      {
        groupName: 'DASHBOARD',
        items: [{ id: 'dashboard' }, { id: 'workforce-overview' }],
      },
      {
        groupName: 'PAYROLL',
        items: [
          { id: 'payroll-dashboard' },
          { id: 'payroll-settings' },
          { id: 'payroll-statutory' },
          { id: 'payroll-processing' },
        ],
      },
      {
        groupName: 'CORE ATTENDANCE',
        items: [
          { id: 'attendance' },
          { id: 'attendance-employees' },
          { id: 'history' },
        ],
      },
    ];

    it('correctly derives active section and keeps parent expanded for nested child routes', () => {
      const state1 = getNavigationState('/payroll/statutory', mockGroups);
      expect(state1.activeItemId).toBe('payroll-statutory');
      expect(state1.activeSectionId).toBe('PAYROLL');
      expect(state1.expandedSectionIds).toContain('PAYROLL');
      expect(state1.expandedSectionIds).not.toContain('CORE ATTENDANCE');

      const state2 = getNavigationState('/attendance/employees', mockGroups);
      expect(state2.activeItemId).toBe('attendance-employees');
      expect(state2.activeSectionId).toBe('CORE ATTENDANCE');
      expect(state2.expandedSectionIds).toContain('CORE ATTENDANCE');
      expect(state2.expandedSectionIds).not.toContain('PAYROLL');
    });
  });
});
