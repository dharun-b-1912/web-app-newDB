// src/features/auth/LoginForm.tsx
// ============================================================================
// Joy PeopleHR — Production Employee Authentication
// Supports Phone + Password & Phone + OTP with First-Time Account Activation
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Mail, Lock, Phone, KeyRound, ArrowRight, Sparkles, RotateCcw, ShieldCheck, UserPlus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';
import { employeeAuthService } from '../../services/auth/employeeAuthService';
import { EmployeeActivationModal } from './EmployeeActivationModal';

export interface LoginFormProps {
  onToggleSignup: () => void;
  onForgotPassword: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onToggleSignup, onForgotPassword }) => {
  const [authMethod, setAuthMethod] = useState<'PASSWORD' | 'OTP'>('PASSWORD');
  const [isLoading, setIsLoading] = useState(false);
  const [isActivationOpen, setIsActivationOpen] = useState(false);

  // Form states
  const [identifier, setIdentifier] = useState('haripriya@joycorporate.com');
  const [password, setPassword] = useState('joy@Hr2026');
  const [phoneForOtp, setPhoneForOtp] = useState('+919840122334');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Dev OTP auto-capture for developer convenience
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  const { login } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.otp) {
        setDevOtpHint(e.detail.otp);
      }
    };
    window.addEventListener('workforce:dev:sms_received', handler);
    return () => window.removeEventListener('workforce:dev:sms_received', handler);
  }, []);

  useEffect(() => {
    if (timerSeconds <= 0) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerSeconds]);

  // Standard Phone/Email + Password Login
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      showToast('Please enter your phone number/email and password.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const { user } = await employeeAuthService.signInWithPhonePassword(
        identifier,
        password,
        'org-joy-01'
      );
      login(user);
      showToast(`Welcome back, ${user.name}!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Login failed. Please verify credentials.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1 of OTP Login: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneForOtp.trim()) {
      showToast('Please enter your mobile phone number.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const res = await employeeAuthService.requestLoginOtp(phoneForOtp, 'org-joy-01');
      setPhoneForOtp(res.phone);
      setOtpSent(true);
      setTimerSeconds(60);
      showToast(`Verification code sent to ${res.phone}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to send OTP.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2 of OTP Login: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.trim().length !== 6) {
      showToast('Please enter the 6-digit verification code.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const { user } = await employeeAuthService.verifyLoginOtp(
        phoneForOtp,
        otpCode,
        'org-joy-01'
      );
      login(user);
      showToast(`Signed in successfully as ${user.name}!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Invalid or expired OTP code.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Fast Account Switcher for Test / Demo Workspaces
  const selectQuickAccount = (ident: string, pass: string, phone: string) => {
    setIdentifier(ident);
    setPassword(pass);
    setPhoneForOtp(phone);
    showToast(`Loaded credentials for ${ident}`, 'info');
  };

  return (
    <div className="space-y-5">
      <div className="text-center sm:text-left">
        <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Sign in to Joy PeopleHR</h2>
        <p className="text-xs text-gray-500 mt-1">
          Enter your employee credentials to access your tenant workspace.
        </p>
      </div>

      {/* Auth Method Selector */}
      <div className="grid grid-cols-2 p-1 bg-gray-100/80 rounded-xl text-xs font-bold text-gray-600">
        <button
          type="button"
          onClick={() => {
            setAuthMethod('PASSWORD');
            setOtpSent(false);
          }}
          className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            authMethod === 'PASSWORD'
              ? 'bg-white text-gray-900 shadow-xs'
              : 'hover:text-gray-900'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Phone / Password</span>
        </button>

        <button
          type="button"
          onClick={() => setAuthMethod('OTP')}
          className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            authMethod === 'OTP'
              ? 'bg-white text-gray-900 shadow-xs'
              : 'hover:text-gray-900'
          }`}
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Phone OTP Login</span>
        </button>
      </div>

      {/* METHOD 1: Phone / Email + Password */}
      {authMethod === 'PASSWORD' && (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Registered Phone / Email
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="+91 98401 22334 or name@joycorporate.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-3 py-2.5 pl-9 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
              />
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-gray-700">Password</label>
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-[11px] font-bold text-[#07563D] hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 pl-9 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
              />
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={isLoading}
            className="w-full justify-center bg-[#07563D] hover:bg-[#064e37] text-white py-2.5 text-xs font-bold shadow-sm"
          >
            {isLoading ? 'Authenticating...' : 'Sign In'}
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </form>
      )}

      {/* METHOD 2: Phone OTP Authentication */}
      {authMethod === 'OTP' && (
        <div className="space-y-4">
          {!otpSent ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Registered Mobile Number
                </label>
                <div className="flex rounded-xl shadow-xs overflow-hidden border border-gray-200 focus-within:ring-1 focus-within:ring-[#07563D]">
                  <span className="inline-flex items-center px-3 text-xs font-bold text-gray-600 bg-gray-50 border-r border-gray-200">
                    🇮🇳 +91
                  </span>
                  <input
                    type="tel"
                    required
                    placeholder="98401 22334"
                    value={phoneForOtp}
                    onChange={(e) => setPhoneForOtp(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-white focus:outline-none"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
                className="w-full justify-center bg-[#07563D] hover:bg-[#064e37] text-white py-2.5 text-xs font-bold shadow-sm"
              >
                {isLoading ? 'Sending SMS OTP...' : 'Request OTP Code'}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              {devOtpHint && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
                  <span>
                    🧪 <strong>Dev Auto-Capture OTP:</strong>{' '}
                    <code className="font-mono font-black text-amber-950 bg-white px-1.5 py-0.5 rounded border">
                      {devOtpHint}
                    </code>
                  </span>
                  <button
                    type="button"
                    onClick={() => setOtpCode(devOtpHint)}
                    className="text-[11px] font-bold text-[#07563D] underline ml-2"
                  >
                    Auto-fill
                  </button>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-gray-700">Enter 6-Digit OTP</label>
                  <span className="text-[11px] text-gray-500 font-mono">{phoneForOtp}</span>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2.5 text-center text-base font-mono font-black tracking-widest bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="font-bold text-gray-600 hover:underline"
                >
                  Change Phone
                </button>

                <button
                  type="button"
                  disabled={timerSeconds > 0 || isLoading}
                  onClick={handleRequestOtp}
                  className="font-bold text-[#07563D] hover:underline disabled:opacity-50 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  {timerSeconds > 0 ? `Resend in ${timerSeconds}s` : 'Resend OTP'}
                </button>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
                className="w-full justify-center bg-[#07563D] hover:bg-[#064e37] text-white py-2.5 text-xs font-bold shadow-sm"
              >
                {isLoading ? 'Verifying...' : 'Verify OTP & Sign In'}
              </Button>
            </form>
          )}
        </div>
      )}

      {/* First-Time Employee Activation Banner */}
      <div className="pt-2 border-t border-gray-100">
        <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="text-xs font-black text-emerald-950 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>First Time Logging In?</span>
            </div>
            <p className="text-[11px] text-emerald-800/80">
              Activate your employee login with your mobile phone.
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsActivationOpen(true)}
            className="text-[11px] font-bold bg-white text-[#07563D] border-emerald-200 hover:bg-emerald-100 shrink-0"
          >
            Activate Account
          </Button>
        </div>
      </div>

      {/* Quick Demo Identities Accordion (Clearly Labeled as Test Profiles) */}
      <div className="pt-2 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-gray-400 font-bold uppercase tracking-wider">
          <span>Enterprise Test Accounts</span>
          <span className="text-[9px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 font-mono">
            Auto-Sync
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => selectQuickAccount('haripriya@joycorporate.com', 'joy@Hr2026', '+919840122334')}
            className="p-2 text-left rounded-xl border border-gray-200 bg-white hover:border-[#07563D] hover:bg-emerald-50/30 transition-all text-xs"
          >
            <div className="font-extrabold text-gray-900 flex items-center justify-between">
              <span>Hari Priya</span>
              <span className="text-[9px] font-mono text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded font-bold">
                HR Head
              </span>
            </div>
            <div className="text-[10px] text-gray-400 font-mono truncate">+91 98401 22334</div>
          </button>

          <button
            type="button"
            onClick={() => selectQuickAccount('deepa.s@joycorporate.com', 'joy@Tl2026', '+919840233445')}
            className="p-2 text-left rounded-xl border border-gray-200 bg-white hover:border-[#07563D] hover:bg-emerald-50/30 transition-all text-xs"
          >
            <div className="font-extrabold text-gray-900 flex items-center justify-between">
              <span>Deepa S.</span>
              <span className="text-[9px] font-mono text-blue-700 bg-blue-100 px-1 py-0.2 rounded font-bold">
                Team Lead
              </span>
            </div>
            <div className="text-[10px] text-gray-400 font-mono truncate">+91 98402 33445</div>
          </button>

          <button
            type="button"
            onClick={() => selectQuickAccount('priya.sharma@joycorporate.com', 'joy@Emp2026', '+919840455667')}
            className="p-2 text-left rounded-xl border border-gray-200 bg-white hover:border-[#07563D] hover:bg-emerald-50/30 transition-all text-xs"
          >
            <div className="font-extrabold text-gray-900 flex items-center justify-between">
              <span>Priya Sharma</span>
              <span className="text-[9px] font-mono text-gray-700 bg-gray-100 px-1 py-0.2 rounded font-bold">
                Employee
              </span>
            </div>
            <div className="text-[10px] text-gray-400 font-mono truncate">+91 98404 55667</div>
          </button>

          <button
            type="button"
            onClick={() => selectQuickAccount('admin@joycorporate.com', 'joy@Admin2026', '+919840000001')}
            className="p-2 text-left rounded-xl border border-gray-200 bg-white hover:border-[#07563D] hover:bg-emerald-50/30 transition-all text-xs"
          >
            <div className="font-extrabold text-gray-900 flex items-center justify-between">
              <span>Dharun Joy</span>
              <span className="text-[9px] font-mono text-purple-700 bg-purple-100 px-1 py-0.2 rounded font-bold">
                Admin
              </span>
            </div>
            <div className="text-[10px] text-gray-400 font-mono truncate">+91 98400 00001</div>
          </button>
        </div>
      </div>

      {/* First-Time Activation Modal */}
      <EmployeeActivationModal
        isOpen={isActivationOpen}
        onClose={() => setIsActivationOpen(false)}
      />
    </div>
  );
};
