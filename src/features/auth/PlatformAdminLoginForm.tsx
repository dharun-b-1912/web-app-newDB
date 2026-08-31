// src/features/auth/PlatformAdminLoginForm.tsx
// ============================================================
// Joy PeopleHR / WorkForceOS — Platform Admin Login Form Wrapper
// ============================================================

import React from 'react';
import { LoginForm } from './LoginForm';

export interface PlatformAdminLoginFormProps {
  onSwitchToCustomerLogin?: () => void;
  onForgotPassword?: () => void;
}

export const PlatformAdminLoginForm: React.FC<PlatformAdminLoginFormProps> = ({
  onForgotPassword = () => {},
}) => {
  return (
    <LoginForm
      authContext="platform"
      onForgotPassword={onForgotPassword}
    />
  );
};
