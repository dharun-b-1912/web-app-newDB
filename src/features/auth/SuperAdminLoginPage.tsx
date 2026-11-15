// src/features/auth/SuperAdminLoginPage.tsx
// ============================================================================
// WorkForceOS / Joy PeopleHR — Dedicated Super Admin Gateway
// ============================================================================

import React from 'react';
import { PlatformSuperAdminLoginPage } from '../platform/auth/PlatformSuperAdminLoginPage';

export interface SuperAdminLoginPageProps {
  onSwitchToCustomer?: () => void;
  onSuccessRoute?: (route: string) => void;
}

export const SuperAdminLoginPage: React.FC<SuperAdminLoginPageProps> = ({
  onSwitchToCustomer,
  onSuccessRoute,
}) => {
  return (
    <PlatformSuperAdminLoginPage
      onBackToCustomer={onSwitchToCustomer}
      onSuccessRoute={onSuccessRoute}
    />
  );
};
