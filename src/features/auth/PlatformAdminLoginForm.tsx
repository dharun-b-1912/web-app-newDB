// src/features/auth/PlatformAdminLoginForm.tsx
// ============================================================
// WorkForceOS — Dedicated Platform Control Plane Staff Authentication Portal
// ============================================================

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Building2,
  CheckCircle2,
  Layers,
  Key,
} from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';
import { platformAuditService } from '../../services/platform/platformAuditService';
import { cn } from '../../lib/utils';

// Authorized Platform Staff Accounts with required passwords
export const PLATFORM_STAFF_ACCOUNTS = [
  {
    role: 'Super Admin',
    name: 'THIRUMALAI R K',
    email: 'superadmin@workforceos.com',
    password: 'password123',
    roleBadge: 'Root Platform Owner',
    color: 'border-emerald-300 bg-emerald-50 text-emerald-800',
    description: 'Unrestricted control plane access across all tenants & infrastructure.',
  },
  {
    role: 'Assistant Admin',
    name: 'Karthik Natarajan',
    email: 'assistant.admin@workforceos.com',
    password: 'password123',
    roleBadge: 'Delegated Operations',
    color: 'border-blue-300 bg-blue-50 text-blue-800',
    description: 'Customer workspace diagnostics, tenant health, and support operations.',
  },
  {
    role: 'Billing Admin',
    name: 'Pooja Agarwal',
    email: 'finance@workforceos.com',
    password: 'password123',
    roleBadge: 'FinOps & Invoicing',
    color: 'border-purple-300 bg-purple-50 text-purple-800',
    description: 'Commercial billing, GST invoices, refunds, and financial reconciliations.',
  },
  {
    role: 'Security Officer',
    name: 'Vikram Sethi',
    email: 'security@workforceos.com',
    password: 'password123',
    roleBadge: 'Compliance & IAM',
    color: 'border-amber-300 bg-amber-50 text-amber-800',
    description: 'Forensic audit trails, active sessions, and delegated staff IAM.',
  },
];

const PlatformLoginSchema = z.object({
  email: z.string().email('Please enter a valid platform staff email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  twoFactorCode: z.string().optional(),
});

type PlatformLoginInput = z.infer<typeof PlatformLoginSchema>;

export interface PlatformAdminLoginFormProps {
  onSwitchToCustomerLogin: () => void;
}

export const PlatformAdminLoginForm: React.FC<PlatformAdminLoginFormProps> = ({
  onSwitchToCustomerLogin,
}) => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PlatformLoginInput>({
    resolver: zodResolver(PlatformLoginSchema),
    defaultValues: {
      email: 'assistant.admin@workforceos.com',
      password: 'password123',
    },
  });

  const selectedEmail = watch('email');

  const onSubmit = async (data: PlatformLoginInput) => {
    setIsLoading(true);
    setAuthError(null);

    try {
      // Find matching platform staff account
      const matchedAccount = PLATFORM_STAFF_ACCOUNTS.find(
        (acc) => acc.email.toLowerCase() === data.email.trim().toLowerCase()
      );

      if (!matchedAccount) {
        setAuthError('Access Denied: This email is not authorized for the Platform Control Plane.');
        showToast('Unauthorized platform access attempt.', 'error');
        setIsLoading(false);
        return;
      }

      // Check password (supports 'password123' or configured password)
      if (data.password !== matchedAccount.password && data.password !== 'password123') {
        setAuthError('Invalid credentials: The password you entered is incorrect.');
        showToast('Authentication failed. Check your password.', 'error');
        setIsLoading(false);
        return;
      }

      // Fetch users from API and match staff
      const users = await api.getUsers();
      const user = users.find((u) => u.email.toLowerCase() === data.email.toLowerCase()) || {
        id: `user-platform-${Date.now()}`,
        name: matchedAccount.name,
        email: matchedAccount.email,
        organization_id: 'org-platform',
        employee_id: 'emp-staff-001',
        status: 'Active' as const,
        roles: [{ id: 'role-001', organization_id: 'org-platform', name: matchedAccount.role, description: matchedAccount.roleBadge, permissions: [] }],
        created_at: new Date().toISOString(),
      };

      // Perform login
      login(user);

      // Forensic Audit Log
      await platformAuditService.logEvent({
        actor_id: user.id,
        actor_name: user.name,
        actor_role: matchedAccount.role,
        organization_id: 'org-platform',
        organization_name: 'WorkForceOS Control Plane',
        action: 'PLATFORM_STAFF_LOGIN_SUCCESS',
        resource_type: 'AuthSession',
        resource_id: `session-${Date.now()}`,
        severity: 'Normal',
        reason: `Authenticated as ${matchedAccount.role} via Dedicated Platform Portal`,
      });

      showToast(`Authenticated as ${matchedAccount.name} (${matchedAccount.role})`, 'success');
    } catch (err: any) {
      setAuthError(err.message || 'Platform login failed.');
      showToast('Login failed.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillCredentials = (email: string, pass: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', pass, { shouldValidate: true });
    setAuthError(null);
    showToast(`Credentials filled for ${email}. Click "Verify & Sign In" to authenticate.`, 'info');
  };

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* Portal Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold tracking-wider uppercase border border-indigo-200 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-indigo-700" /> Platform Staff Portal
          </span>
          <span className="text-[10px] font-semibold text-gray-500">Tier-1 Admin Access</span>
        </div>
        <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Platform Control Center Login</h2>
        <p className="text-xs text-gray-500">
          Strict credential authentication for SaaS platform administrators & operations staff.
        </p>
      </div>

      {/* Staff Account Selector (Pre-fills Form for Easy Typing / Testing) */}
      <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-gray-800 flex items-center gap-1">
            <KeyRound className="w-3.5 h-3.5 text-indigo-700" /> Select Staff Persona to Fill:
          </span>
          <span className="text-[10px] text-gray-500">Password: <code className="bg-white px-1.5 py-0.5 rounded border font-bold">password123</code></span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {PLATFORM_STAFF_ACCOUNTS.map((acc) => {
            const isSelected = selectedEmail?.toLowerCase() === acc.email.toLowerCase();
            return (
              <button
                key={acc.email}
                type="button"
                onClick={() => handleFillCredentials(acc.email, acc.password)}
                className={cn(
                  'p-2.5 rounded-xl border text-left transition-all cursor-pointer space-y-0.5',
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/80 shadow-xs ring-1 ring-indigo-600'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60'
                )}
              >
                <div className="flex items-center justify-between">
                  <strong className="text-gray-900 font-bold text-[11px] block">{acc.name}</strong>
                  <span className={cn('text-[9px] font-bold px-1.5 py-0.2 rounded', acc.color)}>
                    {acc.role}
                  </span>
                </div>
                <div className="text-[10px] text-gray-500 font-mono truncate">{acc.email}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Auth Error Banner */}
      {authError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2 animate-in shake">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{authError}</span>
        </div>
      )}

      {/* Credentials Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
        <div>
          <label className="block font-bold text-gray-700 mb-1">Staff Email Address *</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              placeholder="staff@workforceos.com"
              {...register('email')}
              className={cn(
                'w-full pl-9 pr-3 py-2 rounded-xl bg-gray-50 border text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600',
                errors.email ? 'border-rose-400' : 'border-gray-200'
              )}
            />
          </div>
          {errors.email && <span className="text-[10px] text-rose-600 font-medium mt-0.5 block">{errors.email.message}</span>}
        </div>

        <div>
          <label className="block font-bold text-gray-700 mb-1">Security Passkey / Password *</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              {...register('password')}
              className={cn(
                'w-full pl-9 pr-9 py-2 rounded-xl bg-gray-50 border text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600',
                errors.password ? 'border-rose-400' : 'border-gray-200'
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <span className="text-[10px] text-rose-600 font-medium mt-0.5 block">{errors.password.message}</span>}
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#073B2A] hover:bg-[#052C20] text-white font-bold py-2.5 rounded-xl shadow-md text-xs cursor-pointer flex items-center justify-center gap-1.5"
        >
          {isLoading ? 'Verifying Staff Credentials...' : 'Verify & Sign In to Platform'}
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </form>

      {/* Switch to Customer HRMS Login */}
      <div className="text-center pt-3 border-t border-gray-100">
        <button
          type="button"
          onClick={onSwitchToCustomerLogin}
          className="text-xs font-semibold text-gray-600 hover:text-[#07563D] hover:underline flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
        >
          <Building2 className="w-3.5 h-3.5 text-gray-400" />
          <span>Switch to Customer HRMS Tenant Login →</span>
        </button>
      </div>
    </div>
  );
};
