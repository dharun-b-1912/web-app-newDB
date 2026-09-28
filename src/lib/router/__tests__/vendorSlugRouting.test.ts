import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { parseRouteFromUrl, ROUTE_ALIASES, ROUTE_TO_PATH } from '../urlRouter';
import { ROUTE_MANIFEST, findRouteDefinition } from '../routeRegistry';

describe('Vendor Management & Dedicated Vendor Portal Slug Routing Suite', () => {
  beforeEach(() => {
    (globalThis as any).window = {
      location: {
        pathname: '/',
        search: '',
      },
    };
  });

  afterAll(() => {
    delete (globalThis as any).window;
  });

  describe('1. Company HR Vendor Slugs', () => {
    it('resolves /vendors to vendors route', () => {
      window.location.pathname = '/vendors';
      const parsed = parseRouteFromUrl();
      expect(parsed.route).toBe('vendors');
      expect(ROUTE_TO_PATH['vendors']).toBe('/vendors');
    });

    it('resolves /vendors/directory to vendor-directory route', () => {
      window.location.pathname = '/vendors/directory';
      const parsed = parseRouteFromUrl();
      expect(parsed.route).toBe('vendor-directory');
      expect(ROUTE_TO_PATH['vendor-directory']).toBe('/vendors/directory');
    });

    it('resolves /vendors/purchase-orders to vendor-purchase-orders route', () => {
      window.location.pathname = '/vendors/purchase-orders';
      const parsed = parseRouteFromUrl();
      expect(parsed.route).toBe('vendor-purchase-orders');
      expect(ROUTE_TO_PATH['vendor-purchase-orders']).toBe('/vendors/purchase-orders');
    });

    it('resolves /vendors/invoices to vendor-invoices route', () => {
      window.location.pathname = '/vendors/invoices';
      const parsed = parseRouteFromUrl();
      expect(parsed.route).toBe('vendor-invoices');
      expect(ROUTE_TO_PATH['vendor-invoices']).toBe('/vendors/invoices');
    });

    it('resolves /vendors/attendance-recon to vendor-attendance-recon route', () => {
      window.location.pathname = '/vendors/attendance-recon';
      const parsed = parseRouteFromUrl();
      expect(parsed.route).toBe('vendor-attendance-recon');
      expect(ROUTE_TO_PATH['vendor-attendance-recon']).toBe('/vendors/attendance-recon');
    });
  });

  describe('2. Dedicated Vendor Portal Slugs', () => {
    it('resolves /vendor-portal to vendor-portal route without blank screen', () => {
      window.location.pathname = '/vendor-portal';
      const parsed = parseRouteFromUrl();
      expect(parsed.route).toBe('vendor-portal');
      expect(ROUTE_TO_PATH['vendor-portal']).toBe('/vendor-portal');
    });

    it('resolves /vendor-portal/dashboard to vendor-dashboard route', () => {
      window.location.pathname = '/vendor-portal/dashboard';
      const parsed = parseRouteFromUrl();
      expect(parsed.route).toBe('vendor-dashboard');
      expect(ROUTE_TO_PATH['vendor-dashboard']).toBe('/vendor-portal/dashboard');
    });

    it('resolves /vendor-portal/invoices to vendor-invoices route', () => {
      window.location.pathname = '/vendor-portal/invoices';
      const parsed = parseRouteFromUrl();
      expect(parsed.route).toBe('vendor-invoices');
    });

    it('resolves /vendor-portal/purchase-orders to vendor-purchase-orders route', () => {
      window.location.pathname = '/vendor-portal/purchase-orders';
      const parsed = parseRouteFromUrl();
      expect(parsed.route).toBe('vendor-purchase-orders');
    });

    it('resolves /vendor-portal/attendance-recon to vendor-attendance-recon route', () => {
      window.location.pathname = '/vendor-portal/attendance-recon';
      const parsed = parseRouteFromUrl();
      expect(parsed.route).toBe('vendor-attendance-recon');
    });

    it('resolves /vendor-portal/company and /vendor-portal/profile to vendor-company route', () => {
      window.location.pathname = '/vendor-portal/company';
      expect(parseRouteFromUrl().route).toBe('vendor-company');

      window.location.pathname = '/vendor-portal/profile';
      expect(parseRouteFromUrl().route).toBe('vendor-company');
    });
  });

  describe('3. Route Registry Manifest Validation', () => {
    it('contains registered manifest entries for both HR and Vendor Portal', () => {
      const hrVendorsDef = findRouteDefinition('/vendors');
      expect(hrVendorsDef).toBeDefined();
      expect(hrVendorsDef?.id).toBe('vendors');

      const portalDef = findRouteDefinition('/vendor-portal');
      expect(portalDef).toBeDefined();
      expect(portalDef?.id).toBe('vendor-portal');
    });
  });
});
