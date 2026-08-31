// src/features/auth/LoginForm.tsx
// ============================================================
// Joy PeopleHR / WorkForceOS — Production Enterprise Login Form
// ============================================================

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Lock,
  Mail,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';
import { AuthContextMode } from '../../services/auth/authService';
import { EmployeeActivationModal } from './EmployeeActivationModal';

const LoginSchema = z.object({
  identifier: z.string().min(1, 'Please enter your work email or mobile number'),
  password: z.string().min(1, 'Please enter your password'),
});

type LoginFormData = z.infer<typeof LoginSchema>;

export interface LoginFormProps {
  authContext?: AuthContextMode;
  onForgotPassword: () => void;
  onSuccessRoute?: (route: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  authContext = 'tenant',
  onForgotPassword,
  onSuccessRoute,
}) => {
  const { signIn } = useAuth();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isActivationOpen, setIsActivationOpen] = useState(false);

  // Auto-detect invitation/reset-password URLs and open the password setup modal
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const search = window.location.search;
      const params = new URLSearchParams(search);
      const urlEmail = params.get('email') || '';

      if (
        path.includes('reset-password') ||
        path.includes('activate') ||
        path.includes('accept-invite') ||
        search.includes('token=') ||
        search.includes('code=')
      ) {
        setIsActivationOpen(true);
      }
    }
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      identifier:
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('email') || ''
          : '',
      password: '',
    },
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState && e.getModifierState('CapsLock')) {
      setCapsLockOn(true);
    } else {
      setCapsLockOn(false);
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setAuthError(null);

    try {
      const res = await signIn(data.identifier, data.password, authContext);

      if (res.success && res.user) {
        showToast(`Welcome back, ${res.user.name}`, 'success');
        if (res.destinationRoute && onSuccessRoute) {
          onSuccessRoute(res.destinationRoute);
        }
      } else {
        const errorText =
          res.errorMessage ||
          'Unable to sign in. Please verify your credentials and try again.';
        setAuthError(errorText);
      }
    } catch (err: any) {
      setAuthError(err.message || 'An unexpected error occurred during sign-in.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Title and context indicator */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">
          {authContext === 'platform'
            ? 'Platform Administration'
            : authContext === 'vendor'
            ? 'Vendor & Contractor Sign In'
            : 'Sign In to Workspace'}
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          {authContext === 'platform'
            ? 'Authorized personnel only. All access attempts are recorded.'
            : authContext === 'vendor'
            ? 'Access your vendor self-service portal, contractor workforce & invoice matching.'
            : 'Enter your credentials to access your organization portal.'}
        </p>
      </div>

      {/* 1-Click Vendor Demo Test Box */}
      {authContext === 'vendor' && (
        <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Live Demo Testing Account
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-200/60 text-indigo-800 font-mono font-semibold">
              Apex Staffing
            </span>
          </div>
          <p className="text-[11px] text-indigo-800/80">
            Sign in as <strong>Rajesh Kumar</strong> (Vendor Admin) to test contractor onboarding, licenses, Form V, and invoices.
          </p>
          <Button
            type="button"
            onClick={() => {
              setValue('identifier', 'vendor@apexstaffing.in');
              setValue('password', 'demo1234');
              onSubmit({ identifier: 'vendor@apexstaffing.in', password: 'demo1234' });
            }}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-1.5"
          >
            ⚡ 1-Click Live Test Vendor Login
          </Button>
        </div>
      )}

      {/* Global Error Banner */}
      {authError && (
        <div
          role="alert"
          className="p-3.5 bg-red-50/90 border border-red-200 rounded-2xl flex items-start gap-3 animate-in fade-in duration-200"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs text-red-800 font-medium leading-relaxed">{authError}</div>
        </div>
      )}

      {/* Main Authentication Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Identifier Field */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            {authContext === 'platform'
              ? 'Staff Email'
              : authContext === 'vendor'
              ? 'Vendor Contact Email'
              : 'Work Email or Mobile Number'}
          </label>
          <div className="relative">
            <Input
              type={authContext === 'platform' || authContext === 'vendor' ? 'email' : 'text'}
              placeholder={
                authContext === 'platform'
                  ? 'admin@joypeople.com'
                  : authContext === 'vendor'
                  ? 'vendor@apexstaffing.in'
                  : 'name@company.com or +91 98765 43210'
              }
              {...register('identifier')}
              disabled={isLoading}
              className="pl-3 pr-3 text-xs h-10 rounded-xl"
              autoComplete="username"
              autoFocus
            />
          </div>
          {errors.identifier && (
            <p className="mt-1 text-[11px] text-red-600 font-medium">{errors.identifier.message}</p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-gray-700">Password</label>
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-[11px] font-semibold text-gray-500 hover:text-indigo-600 transition"
            >
              Forgot Password?
            </button>
          </div>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••••••"
              {...register('password')}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="pl-3 pr-10 text-xs h-10 rounded-xl"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {capsLockOn && (
            <p className="mt-1 text-[11px] text-amber-600 font-medium flex items-center gap-1">
              <span>⚠️ Caps Lock is ON</span>
            </p>
          )}
          {errors.password && (
            <p className="mt-1 text-[11px] text-red-600 font-medium">{errors.password.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all duration-200 flex items-center justify-center gap-2 ${
            authContext === 'platform'
              ? 'bg-[#0f172a] hover:bg-[#1e293b] text-white'
              : authContext === 'vendor'
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
              : 'bg-[#073B2A] hover:bg-[#052b1e] text-white'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Signing you in...</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <span>Sign In as {authContext === 'vendor' ? 'Vendor' : 'User'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          )}
        </Button>
      </form>

      {/* First-Time Employee Activation Banner (Only in Tenant Context) */}
      {authContext === 'tenant' && (
        <div className="pt-2 border-t border-gray-100">
          <div className="p-3 bg-emerald-50/80 border border-emerald-100 rounded-2xl flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-[#065f46] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>First Time Here?</span>
              </div>
              <p className="text-[11px] text-emerald-800/80">
                Activate your account using your invitation code.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setIsActivationOpen(true)}
              className="text-[11px] font-bold bg-white text-[#047857] border-emerald-200 hover:bg-emerald-100 shrink-0"
            >
              Activate Account
            </Button>
          </div>
        </div>
      )}

      {/* Security Footer Note */}
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>End-to-end encrypted enterprise access</span>
      </div>

      {/* Activation Modal */}
      <EmployeeActivationModal
        isOpen={isActivationOpen}
        onClose={() => setIsActivationOpen(false)}
      />
    </div>
  );
};
