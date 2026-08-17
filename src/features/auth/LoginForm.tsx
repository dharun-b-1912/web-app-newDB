import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema, LoginInput } from '../../schemas';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Mail, Lock, KeyRound } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';

export interface LoginFormProps {
  onToggleSignup: () => void;
  onForgotPassword: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onToggleSignup, onForgotPassword }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: 'admin@acme.com',
      password: 'password123',
    },
  });

  // Standard form submit
  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    try {
      if (data.password !== 'password123') {
        showToast('Invalid password. Please check your credentials.', 'error');
        setIsLoading(false);
        return;
      }

      const users = await api.getUsers();
      const user = users.find(u => u.email.toLowerCase() === data.email.toLowerCase());
      if (user) {
        login(user);
        showToast(`Welcome back, ${user.name}!`);
      } else {
        const defaultAdmin = users[0];
        login({ ...defaultAdmin, email: data.email });
        showToast('Signed in successfully!');
      }
    } catch {
      showToast('Login failed. Please check credentials.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Populate credentials into form fields for validation & typing
  const fillCredentials = (email: string, pass: string = 'password123') => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', pass, { shouldValidate: true });
    showToast(`Filled credentials for ${email}`, 'info');
  };

  return (
    <div className="space-y-5">
      <div className="text-center sm:text-left">
        <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Sign in to WorkForceOS</h2>
        <p className="text-xs text-gray-500 mt-1">Access your enterprise workforce management platform</p>
      </div>

      {/* Quick Demo Credentials Selector (Fills Input Fields) */}
      <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100 text-xs space-y-2">
        <div className="font-bold text-[#07563D] mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <KeyRound className="w-3.5 h-3.5" /> Demo Company Accounts:
          </span>
          <span className="text-[10px] text-emerald-800 font-normal">Click to fill form</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: 'Company Admin', email: 'admin@acme.com' },
            { label: 'HR Head', email: 'arun.kumar@acme.com' },
            { label: 'Manager', email: 'karthik.n@acme.com' },
            { label: 'Team Lead', email: 'deepa.s@acme.com' },
            { label: 'Employee', email: 'priya.sharma@acme.com' },
          ].map(({ label, email }) => (
            <button
              key={email}
              type="button"
              onClick={() => fillCredentials(email)}
              className="px-2 py-1 bg-white hover:bg-emerald-100/80 active:bg-emerald-200 rounded border border-emerald-200 text-[11px] font-semibold text-gray-800 text-center cursor-pointer transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Work Email Address"
          type="email"
          placeholder="name@company.com"
          leftIcon={<Mail className="w-4 h-4" />}
          error={errors.email?.message}
          {...register('email')}
        />

        <div>
          <div className="flex items-center justify-between mb-1">
            <span />
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-xs font-semibold text-[#07563D] hover:underline cursor-pointer"
            >
              Forgot password?
            </button>
          </div>
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            leftIcon={<Lock className="w-4 h-4" />}
            error={errors.password?.message}
            {...register('password')}
          />
        </div>

        <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
          Sign In
        </Button>
      </form>

      <div className="text-center pt-2 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          New company onboarding?{' '}
          <button
            type="button"
            onClick={onToggleSignup}
            className="font-bold text-[#07563D] hover:underline cursor-pointer"
          >
            Register Organization
          </button>
        </p>
      </div>
    </div>
  );
};
