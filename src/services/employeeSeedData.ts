import { Branch, Location, Department, Designation } from '../types';

export const defaultBranches: Branch[] = [
  {
    id: 'br-cbe-01',
    company_id: 'comp-joy-01',
    name: 'Coimbatore HQ Campus',
    code: 'HQ-CBE',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    timezone: 'Asia/Kolkata',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'br-chn-02',
    company_id: 'comp-joy-01',
    name: 'Chennai Tech Park',
    code: 'TP-CHN',
    city: 'Chennai',
    state: 'Tamil Nadu',
    timezone: 'Asia/Kolkata',
    created_at: '2024-03-01T00:00:00Z',
  },
  {
    id: 'br-blr-03',
    company_id: 'comp-joy-01',
    name: 'Bengaluru Innovation Center',
    code: 'IN-BLR',
    city: 'Bengaluru',
    state: 'Karnataka',
    timezone: 'Asia/Kolkata',
    created_at: '2024-05-01T00:00:00Z',
  },
  {
    id: 'br-rem-04',
    company_id: 'comp-joy-01',
    name: 'Remote Distributed Hub',
    code: 'REM-IN',
    city: 'Remote',
    state: 'Distributed',
    timezone: 'Asia/Kolkata',
    created_at: '2024-06-01T00:00:00Z',
  },
];

export const defaultLocations: Location[] = [
  { id: 'loc-cbe-hq', name: 'Coimbatore HQ Campus', branch_id: 'br-cbe-01', address: 'Avinashi Road, Peelamedu, Coimbatore 641004' },
  { id: 'loc-chn-tp', name: 'Chennai OMR Tech Park', branch_id: 'br-chn-02', address: 'Old Mahabalipuram Road, Chennai 600096' },
  { id: 'loc-blr-ec', name: 'Bengaluru Electronic City', branch_id: 'br-blr-03', address: 'Phase 1, Electronic City, Bengaluru 560100' },
  { id: 'loc-rem-in', name: 'Remote / Distributed India', branch_id: 'br-rem-04', address: 'Distributed Workforce' },
];

export const defaultDepartments: Department[] = [
  { id: 'dept-eng', company_id: 'comp-joy-01', name: 'Engineering', code: 'ENG', employee_count: 0, cost_center_code: 'CC-ENG-101' },
  { id: 'dept-sales', company_id: 'comp-joy-01', name: 'Sales & Marketing', code: 'SALES', employee_count: 0, cost_center_code: 'CC-SALES-101' },
  { id: 'dept-hr', company_id: 'comp-joy-01', name: 'People & HR', code: 'HR', employee_count: 0, cost_center_code: 'CC-HR-101' },
  { id: 'dept-fin', company_id: 'comp-joy-01', name: 'Finance & Legal', code: 'FIN', employee_count: 0, cost_center_code: 'CC-FIN-101' },
  { id: 'dept-prod', company_id: 'comp-joy-01', name: 'Product & Design', code: 'PROD', employee_count: 0, cost_center_code: 'CC-PROD-101' },
];

export const defaultDesignations: Designation[] = [
  { id: 'desig-se', company_id: 'comp-joy-01', title: 'Software Engineer', code: 'SE', grade: 'G3' },
  { id: 'desig-sse', company_id: 'comp-joy-01', title: 'Senior Software Engineer', code: 'SSE', grade: 'G4' },
  { id: 'desig-tl', company_id: 'comp-joy-01', title: 'Engineering Lead', code: 'TL', grade: 'G5' },
  { id: 'desig-em', company_id: 'comp-joy-01', title: 'Engineering Manager', code: 'EM', grade: 'G6' },
  { id: 'desig-dir', company_id: 'comp-joy-01', title: 'Director of Engineering', code: 'DIR', grade: 'G7' },
  { id: 'desig-hr-exec', company_id: 'comp-joy-01', title: 'HR Operations Executive', code: 'HRE', grade: 'G2' },
  { id: 'desig-hr-lead', company_id: 'comp-joy-01', title: 'Lead HR Business Partner', code: 'HRL', grade: 'G5' },
  { id: 'desig-hr-head', company_id: 'comp-joy-01', title: 'Head of Human Resources', code: 'HRH', grade: 'G7' },
  { id: 'desig-prod-mgr', company_id: 'comp-joy-01', title: 'Senior Product Manager', code: 'SPM', grade: 'G5' },
  { id: 'desig-sales-mgr', company_id: 'comp-joy-01', title: 'Sales Regional Manager', code: 'SRM', grade: 'G5' },
  { id: 'desig-fin-mgr', company_id: 'comp-joy-01', title: 'Finance Controller', code: 'FC', grade: 'G6' },
];
