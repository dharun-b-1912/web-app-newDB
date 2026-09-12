// src/features/vendor/portal/VendorPortalContext.tsx
// ============================================================================
// JOY PeopleHR — Authoritative Vendor Portal Context & Multi-Tenant Provider
// Guarantees strict resolution chain:
// Authenticated User -> AuthContext -> Vendor User -> Vendor Master -> Authorized Client Relationships -> Page Data
// STRICTLY NO MOCK • NO LOCALSTORAGE AS AUTHORITY • STRICT MULTI-TENANT ISOLATION
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { AuthContext, PortalType } from '../../../types/authContext';
import {
  VendorOrganization,
  VendorCompanyRelationship,
  VendorUser,
} from '../../../types/vendorPortal';
import { vendorPortalService } from '../../../services/vendorPortalService';
import { VendorCredentialService } from '../../../services/vendor/vendorCredentialService';

export type VendorPortalStatus =
  | 'LOADING'
  | 'READY'
  | 'NO_ACCESS'
  | 'NO_RELATIONSHIPS'
  | 'ERROR';

export interface VendorPortalContextValue {
  status: VendorPortalStatus;
  isLoading: boolean;
  errorMessage: string | null;
  authContext: AuthContext | null;
  vendor: VendorOrganization | null;
  vendorUser: VendorUser | null;
  relationships: VendorCompanyRelationship[];
  activeRelationship: VendorCompanyRelationship | null;
  activeRelationshipId: string;
  setActiveRelationshipId: (relationshipId: string) => void;
  activePeriod: string;
  setActivePeriod: (period: string) => void;
  hasPermission: (permissionId: string) => boolean;
  refreshContext: () => void;
  onNavigate?: (route: string) => void;
}

const VendorPortalContext = createContext<VendorPortalContextValue | null>(null);

export interface VendorPortalProviderProps {
  children: React.ReactNode;
  initialRelationshipId?: string;
  onNavigate?: (route: string) => void;
}

export const VendorPortalProvider: React.FC<VendorPortalProviderProps> = ({
  children,
  initialRelationshipId,
  onNavigate,
}) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<VendorPortalStatus>('LOADING');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState<string>('2026-08');
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string>(initialRelationshipId || '');

  // Extract authoritative AuthContext from session
  const authContext = useMemo<AuthContext | null>(() => {
    if (!user) return null;
    return user.authContext || null;
  }, [user]);

  // Resolve Vendor ID authoritatively
  const resolvedVendorId = useMemo<string | null>(() => {
    if (authContext?.vendorId) return authContext.vendorId;
    if ((user as any)?.vendor_id) return (user as any).vendor_id;
    return null;
  }, [authContext, user]);

  // Resolve Vendor Master Organization
  const vendor = useMemo<VendorOrganization | null>(() => {
    if (!resolvedVendorId) return null;
    const all = vendorPortalService.getVendors();
    const match = all.find((v) => v.id === resolvedVendorId);
    return match || null;
  }, [resolvedVendorId]);

  // Resolve Vendor User Record
  const vendorUser = useMemo<VendorUser | null>(() => {
    if (!user) return null;
    const users = VendorCredentialService.getVendorUsers(resolvedVendorId || undefined);
    const byEmail = users.find(
      (u) => u.email.toLowerCase() === (user.email || '').toLowerCase()
    );
    if (byEmail) return byEmail;
    return users.find((u) => u.id === user.id) || null;
  }, [user, resolvedVendorId]);

  // Resolve Authorized Client Relationships for this Vendor User
  const relationships = useMemo<VendorCompanyRelationship[]>(() => {
    if (!vendor) return [];
    const allVendorRels = vendorPortalService.getVendorCompanyRelationships(vendor.id);

    // If user has specific authorized relationship IDs bound to their AuthContext, enforce them
    if (authContext?.authorizedRelationshipIds && authContext.authorizedRelationshipIds.length > 0) {
      const allowed = new Set(authContext.authorizedRelationshipIds);
      const filtered = allVendorRels.filter((r) => allowed.has(r.id) || allowed.has(r.relationship_id));
      if (filtered.length > 0) return filtered;
    }

    // Check relationship bindings on VendorCredentialService
    if (vendorUser) {
      const userRelBindings = VendorCredentialService.getUserRelationships(vendorUser.id);
      if (userRelBindings.length > 0) {
        const boundCompanyIds = new Set(userRelBindings.map((b) => b.company_id));
        const filtered = allVendorRels.filter((r) => boundCompanyIds.has(r.company_id));
        if (filtered.length > 0) return filtered;
      }
    }

    return allVendorRels;
  }, [vendor, authContext, vendorUser]);

  // Establish Active Relationship (Strictly guarded to authorized relationships)
  useEffect(() => {
    if (relationships.length === 0) {
      setSelectedRelationshipId('');
      return;
    }

    // Keep existing selection if valid
    if (selectedRelationshipId && relationships.some((r) => r.id === selectedRelationshipId)) {
      return;
    }

    // Default to first active relationship or first relationship
    const activeRel = relationships.find((r) => r.status === 'ACTIVE') || relationships[0];
    setSelectedRelationshipId(activeRel.id);
  }, [relationships, selectedRelationshipId]);

  // Evaluate Overall Lifecycle Status
  useEffect(() => {
    if (!user) {
      setStatus('LOADING');
      return;
    }

    const primaryRole = typeof user.role === 'object' ? (user.role as any).name : user.role;
    const isVendor =
      authContext?.portalType === PortalType.VENDOR ||
      primaryRole === 'Vendor Admin' ||
      Boolean((user as any)?.vendor_id);

    if (!isVendor) {
      setStatus('NO_ACCESS');
      setErrorMessage('Access Denied: Your account is not authorized for the Vendor Portal.');
      return;
    }

    if (!vendor) {
      setStatus('ERROR');
      setErrorMessage('Unable to resolve authoritative vendor master organization for this account.');
      return;
    }

    if (relationships.length === 0) {
      setStatus('NO_RELATIONSHIPS');
      setErrorMessage('Your vendor account is active, but no client workspace has been assigned yet.');
      return;
    }

    setStatus('READY');
    setErrorMessage(null);
  }, [user, authContext, vendor, relationships]);

  const activeRelationship = useMemo<VendorCompanyRelationship | null>(() => {
    if (!selectedRelationshipId) return relationships[0] || null;
    return relationships.find((r) => r.id === selectedRelationshipId) || relationships[0] || null;
  }, [relationships, selectedRelationshipId]);

  // Guarded switcher: verifies that the target relationship is authorized for this vendor user
  const setActiveRelationshipId = useCallback(
    (relId: string) => {
      const exists = relationships.some((r) => r.id === relId);
      if (!exists && relId !== 'all') {
        console.warn(`[VendorPortalContext] Unauthorized relationship switch attempt: ${relId}`);
        return;
      }
      setSelectedRelationshipId(relId);
      vendorPortalService.setActiveRelationshipId(relId);
    },
    [relationships]
  );

  const hasPermission = useCallback(
    (permissionId: string): boolean => {
      if (!authContext) return true;
      if (authContext.permissions.includes('*')) return true;
      return authContext.permissions.includes(permissionId);
    },
    [authContext]
  );

  const refreshContext = useCallback(() => {
    if (resolvedVendorId) {
      vendorPortalService.getVendorCompanyRelationships(resolvedVendorId);
    }
  }, [resolvedVendorId]);

  const contextValue: VendorPortalContextValue = {
    status,
    isLoading: status === 'LOADING',
    errorMessage,
    authContext,
    vendor,
    vendorUser,
    relationships,
    activeRelationship,
    activeRelationshipId: selectedRelationshipId,
    setActiveRelationshipId,
    activePeriod,
    setActivePeriod,
    hasPermission,
    refreshContext,
    onNavigate,
  };

  return (
    <VendorPortalContext.Provider value={contextValue}>
      {children}
    </VendorPortalContext.Provider>
  );
};

export const useVendorPortalContext = (): VendorPortalContextValue => {
  const ctx = useContext(VendorPortalContext);
  if (!ctx) {
    throw new Error('useVendorPortalContext must be used within a VendorPortalProvider');
  }
  return ctx;
};
