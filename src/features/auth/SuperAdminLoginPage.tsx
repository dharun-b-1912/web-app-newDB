// src/features/auth/SuperAdminLoginPage.tsx
// ============================================================================
// WorkForceOS / Joy PeopleHR — Dedicated Super Admin Gateway
// ============================================================================

import React from 'react';
import { AuthPage } from './AuthPage';

export interface SuperAdminLoginPageProps {
  onSwitchToCustomer?: () => void;
}

export const SuperAdminLoginPage: React.FC<SuperAdminLoginPageProps> = () => {
  return <AuthPage initialContext="platform" />;
};
