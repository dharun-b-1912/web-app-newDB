import React, { useState, useEffect } from 'react';
import { payrollApi } from '../../../services/payrollApi';
import { SalaryComponent, SalaryStructure, EmployeeSalaryAssignment, SalaryRevision } from '../../../types/payroll';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import {
  SlidersHorizontal,
  Building2,
  Users,
  TrendingUp,
  Plus,
  Search,
  CheckCircle,
  Clock,
  Layers,
  FileCheck,
  Edit,
} from 'lucide-react';

interface SalaryManagementViewProps {
  initialSubTab?: string;
  onOpenPayslip?: (employeeId: string) => void;
}

export const SalaryManagementView: React.FC<SalaryManagementViewProps> = ({ initialSubTab }) => {
  const [subTab, setSubTab] = useState<string>(initialSubTab || 'structures');
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [components, setComponents] = useState<SalaryComponent[]>([]);
  const [salaries, setSalaries] = useState<EmployeeSalaryAssignment[]>([]);
  const [revisions, setRevisions] = useState<SalaryRevision[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals State
  const [isComponentModalOpen, setIsComponentModalOpen] = useState(false);
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);

  useEffect(() => {
    setStructures(payrollApi.getStructures());
    setComponents(payrollApi.getComponents());
    setSalaries(payrollApi.getEmployeeSalaries());
    setRevisions(payrollApi.getSalaryRevisions());
  }, []);

  const subTabs = [
    { id: 'structures', label: 'Salary Structures', icon: Building2 },
    { id: 'components', label: 'Salary Components', icon: SlidersHorizontal },
    { id: 'employee-salary', label: 'Employee Salary Mapping', icon: Users },
    { id: 'revisions', label: 'Salary Revisions & Appraisals', icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      {/* Subnav Ribbon */}
      <div className="bg-white p-2 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 overflow-x-auto">
          {subTabs.map(t => {
            const Icon = t.icon;
            const isActive = subTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSubTab(t.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                  isActive ? 'bg-[#07563D] text-white shadow-2xs' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className="relative shrink-0">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-gray-50/50 w-48"
          />
        </div>
      </div>

      {/* 1. Salary Structures Subtab */}
      {subTab === 'structures' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-200/80">
            <div>
              <h3 className="text-sm font-black text-gray-900">CTC Salary Templates & Component Formulas</h3>
              <p className="text-xs text-gray-500">Define reusable salary templates linked to employee grades</p>
            </div>
            <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsStructureModalOpen(true)}>
              New Salary Structure
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {structures.map(str => (
              <div key={str.id} className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      {str.code}
                    </span>
                    <h4 className="text-base font-extrabold text-gray-900 mt-1">{str.name}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">{str.description}</p>
                  </div>
                  <Badge variant="emerald">{str.status}</Badge>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs font-mono">
                  <span className="text-gray-500 font-bold">Base CTC Benchmark:</span>
                  <span className="font-black text-gray-900 text-sm">₹ {str.base_annual_ctc.toLocaleString('en-IN')} / yr</span>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Component Composition</span>
                  <div className="divide-y divide-gray-100 text-xs border border-gray-100 rounded-xl overflow-hidden">
                    {str.components.map((c, idx) => (
                      <div key={idx} className="p-2.5 flex justify-between items-center">
                        <span className="font-semibold text-gray-800">{c.component_name}</span>
                        <span className="font-mono text-gray-600">
                          {c.calculation_type === 'PercentageOfGross' && `${c.value}% of Gross`}
                          {c.calculation_type === 'PercentageOfBasic' && `${c.value}% of Basic`}
                          {c.calculation_type === 'FixedAmount' && `Fixed ₹ ${c.value.toLocaleString('en-IN')}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Salary Components Subtab */}
      {subTab === 'components' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <span className="text-xs font-black text-gray-900 uppercase tracking-wider">Master Component Library ({components.length})</span>
            <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsComponentModalOpen(true)}>
              Add Component
            </Button>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                <th className="p-4">Code & Name</th>
                <th className="p-4">Type</th>
                <th className="p-4">Category</th>
                <th className="p-4">Calculation Mode</th>
                <th className="p-4 text-center">Taxable</th>
                <th className="p-4 text-center">PF Impact</th>
                <th className="p-4 text-center">ESIC Impact</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {components.map(cmp => (
                <tr key={cmp.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="p-4 font-extrabold text-gray-900">
                    {cmp.name}
                    <span className="block text-[10px] font-mono text-gray-400 font-normal">{cmp.code}</span>
                  </td>
                  <td className="p-4">
                    <Badge variant={cmp.type === 'Earning' ? 'emerald' : cmp.type === 'Deduction' ? 'danger' : 'info'}>
                      {cmp.type}
                    </Badge>
                  </td>
                  <td className="p-4 font-bold text-gray-700">{cmp.category}</td>
                  <td className="p-4 font-mono text-gray-600">{cmp.calculation_type}</td>
                  <td className="p-4 text-center font-bold">{cmp.is_taxable ? 'Yes' : 'No'}</td>
                  <td className="p-4 text-center font-bold">{cmp.is_pf_applicable ? 'Yes' : 'No'}</td>
                  <td className="p-4 text-center font-bold">{cmp.is_esi_applicable ? 'Yes' : 'No'}</td>
                  <td className="p-4 text-center"><Badge variant="emerald">Active</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. Employee Salary Mapping Subtab */}
      {subTab === 'employee-salary' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <span className="text-xs font-black text-gray-900 uppercase tracking-wider">Assigned Employee Compensation Matrix</span>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                <th className="p-4">Employee</th>
                <th className="p-4">Assigned Structure</th>
                <th className="p-4 text-right">Annual CTC</th>
                <th className="p-4 text-right">Gross Monthly</th>
                <th className="p-4 text-right">Basic Monthly</th>
                <th className="p-4 font-mono">Bank Details</th>
                <th className="p-4 font-mono">Tax Identifiers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {salaries.map(sal => (
                <tr key={sal.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="p-4 font-extrabold text-gray-900">
                    {sal.employee_name}
                    <span className="block text-[11px] text-gray-400 font-normal">{sal.department_name} • {sal.designation}</span>
                  </td>
                  <td className="p-4 font-bold text-gray-700">{sal.salary_structure_name}</td>
                  <td className="p-4 text-right font-mono font-black text-gray-900">₹ {sal.annual_ctc.toLocaleString('en-IN')}</td>
                  <td className="p-4 text-right font-mono font-bold text-emerald-800">₹ {sal.gross_monthly.toLocaleString('en-IN')}</td>
                  <td className="p-4 text-right font-mono font-bold text-gray-600">₹ {sal.basic_monthly.toLocaleString('en-IN')}</td>
                  <td className="p-4 font-mono text-[11px] text-gray-600">
                    <span className="font-bold text-gray-800 block">{sal.bank_name}</span>
                    <span>Acc: {sal.account_number}</span>
                  </td>
                  <td className="p-4 font-mono text-[11px] text-gray-600">
                    <span className="block">PAN: {sal.pan_number}</span>
                    <span>UAN: {sal.pf_uan}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. Salary Revisions Subtab */}
      {subTab === 'revisions' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <span className="text-xs font-black text-gray-900 uppercase tracking-wider">Salary Revisions & Appraisal History</span>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                <th className="p-4">Employee</th>
                <th className="p-4">Effective Date</th>
                <th className="p-4 text-right">Previous CTC</th>
                <th className="p-4 text-right">Revised CTC</th>
                <th className="p-4 text-center">Hike %</th>
                <th className="p-4">Reason</th>
                <th className="p-4">Approved By</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {revisions.map(rev => (
                <tr key={rev.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="p-4 font-extrabold text-gray-900">{rev.employee_name}</td>
                  <td className="p-4 font-mono text-gray-600">{rev.effective_date}</td>
                  <td className="p-4 text-right font-mono text-gray-500">₹ {rev.previous_ctc.toLocaleString('en-IN')}</td>
                  <td className="p-4 text-right font-mono font-black text-[#07563D]">₹ {rev.revised_ctc.toLocaleString('en-IN')}</td>
                  <td className="p-4 text-center font-bold text-emerald-700">+{rev.increment_percentage}%</td>
                  <td className="p-4 text-gray-600 max-w-xs truncate">{rev.reason}</td>
                  <td className="p-4 text-gray-700 font-medium">{rev.approved_by_name}</td>
                  <td className="p-4 text-center"><Badge variant="emerald">{rev.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
