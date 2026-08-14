import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Please enter a valid work email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const SignupSchema = z.object({
  organization_name: z.string().min(2, 'Organization name must be at least 2 characters'),
  company_legal_name: z.string().min(2, 'Company legal name is required'),
  full_name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid work email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  industry: z.string().min(1, 'Please select an industry'),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

export const OrganizationSchema = z.object({
  name: z.string().min(2, 'Organization name is required'),
  industry: z.string().min(1, 'Industry is required'),
  default_currency: z.string().min(1, 'Currency is required'),
  timezone: z.string().min(1, 'Timezone is required'),
});

export const CompanySchema = z.object({
  legal_name: z.string().min(2, 'Legal company name is required'),
  trade_name: z.string().optional(),
  statutory_registration_no: z.string().min(2, 'Statutory Registration number is required'),
  tax_id: z.string().optional(),
  country: z.string().min(2, 'Country is required'),
  city: z.string().min(2, 'City is required'),
});

export const BranchSchema = z.object({
  company_id: z.string().min(1, 'Company selection required'),
  name: z.string().min(2, 'Branch name required'),
  code: z.string().min(2, 'Branch code required (e.g., BR-COIM)'),
  city: z.string().min(2, 'City required'),
  state: z.string().min(2, 'State required'),
  timezone: z.string().min(1, 'Timezone required'),
});

export const LocationSchema = z.object({
  branch_id: z.string().min(1, 'Branch selection required'),
  name: z.string().min(2, 'Location name required'),
  building: z.string().optional(),
  address: z.string().min(5, 'Full address required'),
});

export const DepartmentSchema = z.object({
  company_id: z.string().min(1, 'Company selection required'),
  name: z.string().min(2, 'Department name required'),
  code: z.string().min(2, 'Department code required (e.g., ENG)'),
  parent_department_id: z.string().nullable().optional(),
  head_employee_id: z.string().nullable().optional(),
});

export const DesignationSchema = z.object({
  company_id: z.string().min(1, 'Company selection required'),
  title: z.string().min(2, 'Designation title required'),
  code: z.string().min(2, 'Designation code required (e.g., DES-01)'),
  grade: z.string().min(1, 'Grade required (e.g., L1, L2, L3)'),
});

export const EmployeeCreateSchema = z.object({
  company_id: z.string().min(1, 'Company required'),
  branch_id: z.string().optional(),
  department_id: z.string().min(1, 'Department required'),
  designation_id: z.string().min(1, 'Designation required'),
  employee_code: z.string().min(2, 'Employee code required'),
  first_name: z.string().min(1, 'First name required'),
  last_name: z.string().min(1, 'Last name required'),
  work_email: z.string().email('Valid work email required'),
  employment_type: z.enum(['Full Time', 'Part Time', 'Contract', 'Intern', 'Consultant']),
  status: z.enum(['Active', 'Probation', 'Notice Period', 'On Leave', 'Inactive']),
  doj: z.string().min(1, 'Date of joining required'),
  reporting_manager_id: z.string().optional(),
  phone: z.string().optional(),
  personal_email: z.string().email().optional().or(z.literal('')),
  work_location: z.string().optional(),
  shift_name: z.string().optional(),
  ctc: z.number().optional(),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type SignupInput = z.infer<typeof SignupSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type OrganizationInput = z.infer<typeof OrganizationSchema>;
export type CompanyInput = z.infer<typeof CompanySchema>;
export type BranchInput = z.infer<typeof BranchSchema>;
export type LocationInput = z.infer<typeof LocationSchema>;
export type DepartmentInput = z.infer<typeof DepartmentSchema>;
export type DesignationInput = z.infer<typeof DesignationSchema>;
export type EmployeeCreateInput = z.infer<typeof EmployeeCreateSchema>;
