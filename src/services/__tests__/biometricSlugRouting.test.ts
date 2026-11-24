import { describe, it, expect } from 'vitest';
import { parseRouteFromUrl, syncUrlWithRoute, ROUTE_ALIASES, ROUTE_TO_PATH } from '../../lib/router/urlRouter';
import { findRouteDefinition } from '../../lib/router/routeRegistry';

describe('Biometric Terminal Ledger & Enrolment Directory Slug Router Verification', () => {
  it('correctly maps all Terminal Ledger URL aliases to terminal-ledger route', () => {
    expect(ROUTE_ALIASES['/biometric/terminal-ledger']).toBe('terminal-ledger');
    expect(ROUTE_ALIASES['/biometric/ledger']).toBe('terminal-ledger');
    expect(ROUTE_ALIASES['/biometric/terminal-logs']).toBe('terminal-ledger');
    expect(ROUTE_ALIASES['/terminal-ledger']).toBe('terminal-ledger');
    expect(ROUTE_ALIASES['/terminal-logs']).toBe('terminal-ledger');
    expect(ROUTE_ALIASES['/biometric-ledger']).toBe('terminal-ledger');
  });

  it('correctly maps all Enrolment Directory URL aliases to enrolment route', () => {
    expect(ROUTE_ALIASES['/biometric/enrolment']).toBe('enrolment');
    expect(ROUTE_ALIASES['/biometric/enrollment']).toBe('enrolment');
    expect(ROUTE_ALIASES['/biometric/enrolment-directory']).toBe('enrolment');
    expect(ROUTE_ALIASES['/biometric-enrolment']).toBe('enrolment');
    expect(ROUTE_ALIASES['/enrolment']).toBe('enrolment');
    expect(ROUTE_ALIASES['/enrollment']).toBe('enrolment');
    expect(ROUTE_ALIASES['/enrolment-directory']).toBe('enrolment');
  });

  it('correctly returns canonical paths in ROUTE_TO_PATH', () => {
    expect(ROUTE_TO_PATH['terminal-ledger']).toBe('/biometric/terminal-ledger');
    expect(ROUTE_TO_PATH['enrolment']).toBe('/biometric/enrolment');
    expect(ROUTE_TO_PATH['biometric']).toBe('/biometric');
  });

  it('finds registry route definitions with correct section and canonicalPath', () => {
    const termDef = findRouteDefinition('terminal-ledger');
    expect(termDef).toBeDefined();
    expect(termDef?.canonicalPath).toBe('/biometric/terminal-ledger');
    expect(termDef?.section).toBe('CLOCKING & DEVICES');

    const enrollDef = findRouteDefinition('enrolment');
    expect(enrollDef).toBeDefined();
    expect(enrollDef?.canonicalPath).toBe('/biometric/enrolment');
    expect(enrollDef?.section).toBe('CLOCKING & DEVICES');
  });

  it('parses URL path /biometric/terminal-ledger accurately on browser cold start', () => {
    const res = parseRouteFromUrl('/biometric/terminal-ledger');
    expect(res.route).toBe('terminal-ledger');
  });

  it('parses URL path /biometric/enrolment accurately on browser cold start', () => {
    const res = parseRouteFromUrl('/biometric/enrolment');
    expect(res.route).toBe('enrolment');
  });

  it('parses standalone path /terminal-ledger accurately on browser cold start', () => {
    const res = parseRouteFromUrl('/terminal-ledger');
    expect(res.route).toBe('terminal-ledger');
  });

  it('parses standalone path /enrolment accurately on browser cold start', () => {
    const res = parseRouteFromUrl('/enrolment');
    expect(res.route).toBe('enrolment');
  });

  it('parses query param ?tab=terminal-ledger under /biometric accurately', () => {
    const res = parseRouteFromUrl('/biometric?tab=terminal-ledger');
    expect(res.route).toBe('terminal-ledger');
  });

  it('parses query param ?tab=enrolment under /biometric accurately', () => {
    const res = parseRouteFromUrl('/biometric?tab=enrolment');
    expect(res.route).toBe('enrolment');
  });
});

