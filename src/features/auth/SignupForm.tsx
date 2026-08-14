import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SignupSchema, SignupInput } from '../../schemas';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Building2, Mail, Lock, User, Globe } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';

export interface SignupFormProps {
  onToggleLogin: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onToggleLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(SignupSchema),
    defaultValues: {
      industry: 'Software & Technology Services',
    },
  });

  const onSubmit = async (data: SignupInput) => {
    setIsLoading(true);
    try {
      // Create Organization
      await api.updateOrganization({
        name: data.organization_name,
        industry: data.industry,
      });

      // Create Legal Company Entity
      const newCompany = await api.createCompany({
        organization_id: 'org-acme-01',
        legal_name: data.company_legal_name,
        statutory_registration_no: `CIN-U${Math.floor(10000 + Math.random() * 90000)}TN2026PTC034120`,
        country: 'India',
        city: 'Coimbatore',
      });

      api.setActiveCompany(newCompany);

      // Create Admin User
      const users = await api.getUsers();
      const adminUser = {
        id: `user-${Date.now()}`,
        organization_id: 'org-acme-01',
        email: data.email,
        name: `${data.full_name} (Company Admin)`,
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        status: 'Active' as const,
        roles: users[0].roles,
        created_at: new Date().toISOString(),
      };

      login(adminUser);
      showToast('Organization onboarded successfully!');
    } catch (err) {
      showToast('Failed to onboard organization.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Onboard Your Organization</h2>
        <p className="text-xs text-gray-500 mt-0.5">Setup tenant isolation & primary company entity</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
        <Input
          label="Organization Name"
          placeholder="e.g. Acme Group Enterprise"
          leftIcon={<Globe className="w-4 h-4" />}
          error={errors.organization_name?.message}
          {...register('organization_name')}
        />

        <Input
          label="Primary Legal Entity Name"
          placeholder="e.g. Acme Technologies Pvt Ltd"
          leftIcon={<Building2 className="w-4 h-4" />}
          error={errors.company_legal_name?.message}
          {...register('company_legal_name')}
        />

        <Select
          label="Industry Sector"
          options={[
            { value: 'Software & Technology Services', label: 'Software & Technology Services' },
            { value: 'Financial Services & Banking', label: 'Financial Services & Banking' },
            { value: 'Manufacturing & Industrial', label: 'Manufacturing & Industrial' },
            { value: 'Healthcare & Life Sciences', label: 'Healthcare & Life Sciences' },
            { value: 'Retail & E-Commerce', label: 'Retail & E-Commerce' },
          ]}
          error={errors.industry?.message}
          {...register('industry')}
        />

        <div className="pt-2 border-t border-gray-100">
          <Input
            label="Admin Full Name"
            placeholder="Dharun Joy"
            leftIcon={<User className="w-4 h-4" />}
            error={errors.full_name?.message}
            {...register('full_name')}
          />
        </div>

        <Input
          label="Work Email"
          type="email"
          placeholder="admin@company.com"
          leftIcon={<Mail className="w-4 h-4" />}
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Secure Password"
          type="password"
          placeholder="••••••••"
          leftIcon={<Lock className="w-4 h-4" />}
          error={errors.password?.message}
          {...register('password')}
        />

        <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
          Create Tenant & Account
        </Button>
      </form>

      <div className="text-center pt-2 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          Already registered?{' '}
          <button
            type="button"
            onClick={onToggleLogin}
            className="font-bold text-[#07563D] hover:underline cursor-pointer"
          >
            Sign in here
          </button>
        </p>
      </div>
    </div>
  );
};
