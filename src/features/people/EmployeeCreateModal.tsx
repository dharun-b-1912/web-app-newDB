import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EmployeeCreateSchema, EmployeeCreateInput } from '../../schemas';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { User, Mail, Briefcase, Building2, MapPin, Calendar, CreditCard, Hash } from 'lucide-react';
import { useTenant } from '../../hooks/useTenant';
import { api } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { Employee } from '../../types';

export interface EmployeeCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (emp: Employee) => void;
}

export const EmployeeCreateModal: React.FC<EmployeeCreateModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const { activeCompany, companies } = useTenant();
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<EmployeeCreateInput>({
    resolver: zodResolver(EmployeeCreateSchema),
    defaultValues: {
      company_id: activeCompany?.id || 'comp-01',
      employment_type: 'Full Time',
      status: 'Active',
      employee_code: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      doj: new Date().toISOString().split('T')[0],
      department_id: 'dept-eng',
      designation_id: 'desig-staffeng',
    },
  });

  const onSubmit = async (data: EmployeeCreateInput) => {
    try {
      const newEmp = await api.createEmployee({
        organization_id: 'org-joy-01',
        company_id: data.company_id || activeCompany?.id || 'comp-01',
        department_id: data.department_id,
        designation_id: data.designation_id,
        employee_code: data.employee_code,
        first_name: data.first_name,
        last_name: data.last_name,
        work_email: data.work_email,
        status: data.status,
        employment_type: data.employment_type,
        profile: {
          phone: data.phone,
        },
        employment: {
          doj: data.doj || new Date().toISOString().split('T')[0],
          work_location: data.work_location || 'Coimbatore HQ Campus',
          ctc: data.ctc || 1800000,
        },
      });

      showToast(`Employee ${newEmp.first_name} ${newEmp.last_name} onboarded!`);
      onCreated(newEmp);
      reset();
      onClose();
    } catch {
      showToast('Error onboarding employee', 'error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Onboard New Employee"
      description="Create employee master profile, department mapping, and compensation details"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="First Name"
            placeholder="John"
            leftIcon={<User className="w-4 h-4" />}
            error={errors.first_name?.message}
            {...register('first_name')}
          />
          <Input
            label="Last Name"
            placeholder="Doe"
            leftIcon={<User className="w-4 h-4" />}
            error={errors.last_name?.message}
            {...register('last_name')}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Work Email Address"
            type="email"
            placeholder="john.doe@company.com"
            leftIcon={<Mail className="w-4 h-4" />}
            error={errors.work_email?.message}
            {...register('work_email')}
          />
          <Input
            label="Employee Code"
            placeholder="EMP-1024"
            leftIcon={<Hash className="w-4 h-4" />}
            error={errors.employee_code?.message}
            {...register('employee_code')}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Department"
            options={[
              { value: 'dept-eng', label: 'Engineering & Product' },
              { value: 'dept-hr', label: 'Human Resources & People Ops' },
              { value: 'dept-fin', label: 'Finance & Legal Operations' },
              { value: 'dept-sales', label: 'Sales & Business Growth' },
            ]}
            error={errors.department_id?.message}
            {...register('department_id')}
          />

          <Select
            label="Designation"
            options={[
              { value: 'desig-staffeng', label: 'Senior Full Stack Engineer' },
              { value: 'desig-hrdir', label: 'HR Director' },
              { value: 'desig-hrbp', label: 'HR Business Partner' },
              { value: 'desig-pm', label: 'Lead Product Manager' },
              { value: 'desig-fin', label: 'Financial Analyst' },
            ]}
            error={errors.designation_id?.message}
            {...register('designation_id')}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Date of Joining"
            type="date"
            leftIcon={<Calendar className="w-4 h-4" />}
            error={errors.doj?.message}
            {...register('doj')}
          />

          <Select
            label="Employment Type"
            options={[
              { value: 'Full Time', label: 'Full Time Regular' },
              { value: 'Part Time', label: 'Part Time' },
              { value: 'Contract', label: 'Contractor' },
              { value: 'Intern', label: 'Intern' },
              { value: 'Consultant', label: 'Consultant' },
            ]}
            error={errors.employment_type?.message}
            {...register('employment_type')}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Annual CTC (INR)"
            type="number"
            placeholder="1800000"
            leftIcon={<CreditCard className="w-4 h-4" />}
            error={errors.ctc?.message}
            {...register('ctc', { valueAsNumber: true })}
          />

          <Select
            label="Employment Status"
            options={[
              { value: 'Active', label: 'Active' },
              { value: 'Probation', label: 'Probation' },
              { value: 'Notice Period', label: 'Notice Period' },
              { value: 'On Leave', label: 'On Leave' },
            ]}
            error={errors.status?.message}
            {...register('status')}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Complete Onboarding
          </Button>
        </div>
      </form>
    </Modal>
  );
};
