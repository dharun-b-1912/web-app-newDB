import React, { useState, useEffect } from 'react';
import { payrollApi } from '../../../services/payrollApi';
import {
  SalaryComponent,
  SalaryStructure,
  EmployeeSalaryAssignment,
  OrgTagRuleAssignment,
  ComponentType,
  ComponentCategory,
  CalculationType,
} from '../../../types/payroll';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
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
  Edit2,
  DollarSign,
  Check,
  Copy,
  Archive,
  RotateCcw,
  Sparkles,
  HelpCircle,
  ShieldCheck,
  AlertTriangle,
  Play,
  ArrowRight,
  Filter,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useToast } from '../../../components/ui/Toast';
import { hrEventBus } from '../../../services/hrEventBus';

interface SalaryManagementViewProps {
  initialSubTab?: string;
  onOpenPayslip?: (employeeId: string) => void;
}

export const SalaryManagementView: React.FC<SalaryManagementViewProps> = ({ initialSubTab }) => {
  const { showToast } = useToast();
  const [subTab, setSubTab] = useState<string>(initialSubTab || 'structures');
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [components, setComponents] = useState<SalaryComponent[]>([]);
  const [salaries, setSalaries] = useState<EmployeeSalaryAssignment[]>([]);
  const [tagRules, setTagRules] = useState<OrgTagRuleAssignment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isComponentModalOpen, setIsComponentModalOpen] = useState(false);
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);
  const [isRuleSimModalOpen, setIsRuleSimModalOpen] = useState(false);
  const [isWhyRuleModalOpen, setIsWhyRuleModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'structure' | 'component' | 'rule';
    id: string;
    name: string;
    code?: string;
  } | null>(null);

  const [selectedComponent, setSelectedComponent] = useState<SalaryComponent | null>(null);
  const [selectedStructure, setSelectedStructure] = useState<SalaryStructure | null>(null);
  const [selectedEmpSal, setSelectedEmpSal] = useState<EmployeeSalaryAssignment | null>(null);

  // Component Builder Form State
  const [compName, setCompName] = useState('');
  const [compCode, setCompCode] = useState('');
  const [compType, setCompType] = useState<ComponentType>('Earning');
  const [compCategory, setCompCategory] = useState<ComponentCategory>('Basic');
  const [compCalcType, setCompCalcType] = useState<CalculationType>('PercentageOfGross');
  const [compDefaultVal, setCompDefaultVal] = useState(50);
  const [compFormula, setCompFormula] = useState('Basic * 0.40');
  const [compDailyBasis, setCompDailyBasis] = useState<'CalendarDays' | 'Fixed30Days' | 'WorkingDays26' | 'ActualMonthDays'>('CalendarDays');
  const [compOtMultiplier, setCompOtMultiplier] = useState(1.5);
  const [compIsTaxable, setCompIsTaxable] = useState(true);
  const [compIsPf, setCompIsPf] = useState(true);
  const [compIsEsi, setCompIsEsi] = useState(true);
  const [compIsPt, setCompIsPt] = useState(true);
  const [compIsTds, setCompIsTds] = useState(true);
  const [compPayslipName, setCompPayslipName] = useState('');
  const [compPayslipGroup, setCompPayslipGroup] = useState('Earnings');
  const [compDesc, setCompDesc] = useState('');

  // Structure Builder Form State
  const [strCode, setStrCode] = useState('');
  const [strName, setStrName] = useState('');
  const [strGrade, setStrGrade] = useState('');
  const [strCtc, setStrCtc] = useState(1200000);
  const [selectedCompIds, setSelectedCompIds] = useState<string[]>([]);
  const [sandboxCtc, setSandboxCtc] = useState(1200000);

  // Revision Form State
  const [revNewCtc, setRevNewCtc] = useState(0);
  const [revReason, setRevReason] = useState('Annual Performance Appraisal 2026');

  // Bulk Assignment Form State
  const [bulkTargetStructureId, setBulkTargetStructureId] = useState('');
  const [bulkEffectiveFrom, setBulkEffectiveFrom] = useState('2026-09-01');
  const [bulkSelectedEmpIds, setBulkSelectedEmpIds] = useState<string[]>([]);

  // Simulation State
  const [simEmpId, setSimEmpId] = useState('');
  const [simResult, setSimResult] = useState<any>(null);

  const loadData = async () => {
    setStructures(payrollApi.getSalaryStructures());
    setComponents(payrollApi.getComponents());
    setTagRules(payrollApi.getOrgTagRuleAssignments());
    const salList = await payrollApi.getEmployeeSalaries();
    setSalaries(salList);
    if (salList.length > 0 && !simEmpId) {
      setSimEmpId(salList[0].employee_id);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = hrEventBus.subscribe('*', () => loadData());
    return () => unsub();
  }, []);

  // 1. COMPONENT BUILDER
  const handleOpenComponentModal = (comp?: SalaryComponent) => {
    if (comp) {
      setSelectedComponent(comp);
      setCompName(comp.name);
      setCompCode(comp.code);
      setCompType(comp.type);
      setCompCategory(comp.category);
      setCompCalcType(comp.calculation_type);
      setCompDefaultVal(comp.default_value);
      setCompFormula(comp.formula_expression || '');
      setCompDailyBasis(comp.daily_basis || 'CalendarDays');
      setCompOtMultiplier(comp.ot_multiplier || 1.5);
      setCompIsTaxable(comp.is_taxable);
      setCompIsPf(comp.is_pf_applicable);
      setCompIsEsi(comp.is_esi_applicable);
      setCompIsPt(comp.is_pt_applicable !== undefined ? comp.is_pt_applicable : true);
      setCompIsTds(comp.is_tds_applicable !== undefined ? comp.is_tds_applicable : true);
      setCompPayslipName(comp.payslip_display_name || comp.name);
      setCompPayslipGroup(comp.payslip_group || (comp.type === 'Deduction' ? 'Deductions' : 'Earnings'));
      setCompDesc(comp.description || '');
    } else {
      setSelectedComponent(null);
      setCompName('');
      setCompCode('');
      setCompType('Earning');
      setCompCategory('Allowance');
      setCompCalcType('FixedAmount');
      setCompDefaultVal(5000);
      setCompFormula('');
      setCompDailyBasis('CalendarDays');
      setCompOtMultiplier(1.5);
      setCompIsTaxable(true);
      setCompIsPf(false);
      setCompIsEsi(true);
      setCompIsPt(false);
      setCompIsTds(true);
      setCompPayslipName('');
      setCompPayslipGroup('Earnings');
      setCompDesc('');
    }
    setIsComponentModalOpen(true);
  };

  const handleSaveComponent = () => {
    if (!compCode.trim() || !compName.trim()) {
      showToast('Component code and name are required', 'error');
      return;
    }

    const payload: SalaryComponent = {
      id: selectedComponent?.id || `cmp-${Date.now()}`,
      tenant_id: 'org-joy-01',
      code: compCode.toUpperCase().trim(),
      name: compName.trim(),
      type: compType,
      category: compCategory,
      calculation_type: compCalcType,
      default_value: compDefaultVal,
      formula_expression: compFormula,
      daily_basis: compDailyBasis,
      ot_multiplier: compOtMultiplier,
      is_taxable: compIsTaxable,
      is_pf_applicable: compIsPf,
      is_esi_applicable: compIsEsi,
      is_pt_applicable: compIsPt,
      is_tds_applicable: compIsTds,
      payslip_display_name: compPayslipName || compName,
      payslip_group: compPayslipGroup,
      show_on_payslip: true,
      status: 'Active',
      is_active: true,
      description: compDesc,
      version: selectedComponent ? (selectedComponent.version || 1) + 1 : 1,
      effective_from: new Date().toISOString().split('T')[0],
    };

    payrollApi.saveComponent(payload);
    loadData();
    setIsComponentModalOpen(false);
    showToast(`✓ Salary Component ${payload.code} (${payload.name}) saved successfully.`);
  };

  const handleDuplicateComponent = (comp: SalaryComponent) => {
    const duplicated = payrollApi.duplicateComponent(comp.id, `${comp.code}_COPY`, `${comp.name} (Copy)`);
    loadData();
    showToast(`✓ Duplicated ${comp.code} into ${duplicated.code}`);
  };

  const handleArchiveComponent = (compId: string) => {
    payrollApi.archiveComponent(compId);
    loadData();
    showToast(`✓ Component archived. Historical payroll records remain intact.`);
  };

  // 2. STRUCTURE BUILDER
  const handleOpenStructureModal = (str?: SalaryStructure) => {
    if (str) {
      setSelectedStructure(str);
      setStrCode(str.code);
      setStrName(str.name);
      setStrGrade(str.applicable_grade);
      setStrCtc(str.base_annual_ctc);
      setSelectedCompIds(str.components.map(c => c.component_id));
      setSandboxCtc(str.base_annual_ctc);
    } else {
      setSelectedStructure(null);
      setStrCode(`STR_${Date.now().toString().slice(-4)}`);
      setStrName('Industrial Plant Staff Package');
      setStrGrade('Grade L1 - L4');
      setStrCtc(900000);
      setSelectedCompIds(components.slice(0, 4).map(c => c.id));
      setSandboxCtc(900000);
    }
    setIsStructureModalOpen(true);
  };

  const handleSaveStructure = () => {
    if (!strCode.trim() || !strName.trim()) {
      showToast('Structure Code and Name are required', 'error');
      return;
    }

    const activeSelectedComps = components.filter(c => selectedCompIds.includes(c.id));
    const hasBasic = activeSelectedComps.some(c => c.category === 'Basic');
    const hasHra = activeSelectedComps.some(c => c.category === 'HRA');

    if (hasHra && !hasBasic) {
      showToast('Dependency Error: HRA requires Basic Salary in the structure!', 'error');
      return;
    }

    const structureComponents = activeSelectedComps.map(c => ({
      component_id: c.id,
      component_code: c.code,
      component_name: c.name,
      type: c.type,
      calculation_type: c.calculation_type,
      value: c.default_value,
      is_taxable: c.is_taxable,
    }));

    const newStr: SalaryStructure = {
      id: selectedStructure?.id || `str-${Date.now()}`,
      tenant_id: 'org-joy-01',
      code: strCode.toUpperCase().trim(),
      name: strName.trim(),
      description: 'Configurable formula-based CTC package',
      company_id: 'comp-01',
      applicable_grade: strGrade || 'All Grades',
      base_annual_ctc: strCtc,
      components: structureComponents,
      status: 'Active',
      version: selectedStructure ? (selectedStructure.version || 1) + 1 : 1,
      effective_from: '2026-04-01',
      created_at: selectedStructure?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    payrollApi.saveSalaryStructure(newStr);
    loadData();
    setIsStructureModalOpen(false);
    showToast(`✓ Salary Structure ${newStr.code} published successfully.`);
  };

  const handleDuplicateStructure = (str: SalaryStructure) => {
    const duplicated = payrollApi.duplicateSalaryStructure(str.id, `${str.code}_2026`, `${str.name} (Revised)`);
    loadData();
    showToast(`✓ Duplicated structure ${str.code} to ${duplicated.code}`);
  };

  const handleDeleteStructure = (str: SalaryStructure) => {
    setDeleteTarget({
      type: 'structure',
      id: str.id,
      name: str.name,
      code: str.code,
    });
    setIsDeleteModalOpen(true);
  };

  const handleDeleteComponent = (comp: SalaryComponent) => {
    setDeleteTarget({
      type: 'component',
      id: comp.id,
      name: comp.name,
      code: comp.code,
    });
    setIsDeleteModalOpen(true);
  };

  const handleDeleteRule = (rule: OrgTagRuleAssignment) => {
    setDeleteTarget({
      type: 'rule',
      id: rule.id,
      name: rule.rule_name,
    });
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'structure') {
      payrollApi.deleteSalaryStructure(deleteTarget.id);
      showToast(`✓ Salary Structure "${deleteTarget.name}" (${deleteTarget.code || ''}) deleted successfully.`);
    } else if (deleteTarget.type === 'component') {
      payrollApi.deleteComponent(deleteTarget.id);
      showToast(`✓ Salary Component "${deleteTarget.name}" (${deleteTarget.code || ''}) deleted successfully.`);
    } else if (deleteTarget.type === 'rule') {
      payrollApi.deleteOrgTagRuleAssignment(deleteTarget.id);
      showToast(`✓ Tag Rule "${deleteTarget.name}" deleted successfully.`);
    }

    loadData();
    setIsDeleteModalOpen(false);
    setDeleteTarget(null);
  };

  // 3. EMPLOYEE REVISION & BULK ASSIGNMENT
  const handleOpenRevisionModal = (sal: EmployeeSalaryAssignment) => {
    setSelectedEmpSal(sal);
    setRevNewCtc(Math.round(sal.annual_ctc * 1.15));
    setIsRevisionModalOpen(true);
  };

  const handleSaveRevision = () => {
    if (!selectedEmpSal) return;
    const grossMonthly = Math.round(revNewCtc / 12);
    const basicMonthly = Math.round(grossMonthly * 0.5);
    const netEstimate = grossMonthly - Math.round(basicMonthly * 0.12) - 208;

    const updated: EmployeeSalaryAssignment = {
      ...selectedEmpSal,
      annual_ctc: revNewCtc,
      gross_monthly: grossMonthly,
      basic_monthly: basicMonthly,
      net_monthly_estimate: netEstimate,
      effective_from: '2026-09-01',
      status: 'Revised',
      updated_at: new Date().toISOString(),
    };

    payrollApi.saveEmployeeSalary(updated);
    loadData();
    setIsRevisionModalOpen(false);
    showToast(`✓ Revised salary for ${selectedEmpSal.employee_name} to ₹${revNewCtc.toLocaleString('en-IN')}/yr.`);
  };

  const handleBulkAssign = () => {
    if (!bulkTargetStructureId) {
      showToast('Please select a target salary structure', 'error');
      return;
    }
    const empIds = bulkSelectedEmpIds.length > 0 ? bulkSelectedEmpIds : salaries.map(s => s.employee_id);
    const res = payrollApi.bulkAssignSalaryStructure(empIds, bulkTargetStructureId, bulkEffectiveFrom);
    loadData();
    setIsBulkAssignModalOpen(false);
    showToast(`✓ Successfully assigned structure to ${res.assignedCount} employees effective ${bulkEffectiveFrom}.`);
  };

  // 4. RULE SIMULATION
  const handleRunSimulation = () => {
    if (!simEmpId) return;
    const res = payrollApi.testRuleSimulation(simEmpId);
    setSimResult(res);
  };

  const subTabs = [
    { id: 'structures', label: 'Salary Structures', icon: Building2 },
    { id: 'components', label: 'Salary Components Master', icon: SlidersHorizontal },
    { id: 'employee-salary', label: 'Employee Salary Mapping', icon: Users },
    { id: 'tag-rules', label: 'Org Tag Rules Matrix', icon: Layers },
  ];

  const filteredComponents = components.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
  });

  const filteredStructures = structures.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.applicable_grade.toLowerCase().includes(q);
  });

  const filteredSalaries = salaries.filter(sal => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      sal.employee_name.toLowerCase().includes(q) ||
      sal.employee_code.toLowerCase().includes(q) ||
      sal.department_name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* ─── LEVEL 1: SEGMENTED CAPSULES BAR ───────────────────────────── */}
      <div className="bg-white p-2 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 bg-gray-100/80 rounded-xl overflow-x-auto">
          {subTabs.map(t => {
            const Icon = t.icon;
            const isActive = subTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSubTab(t.id)}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all duration-150 cursor-pointer",
                  isActive
                    ? "bg-[#07563D] text-white shadow-sm font-bold"
                    : "text-gray-600 hover:text-gray-900 hover:bg-white/70"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Level 1 Right Actions */}
        <div className="flex items-center gap-2.5 px-1">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search components, rules, staff..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#07563D]/20 focus:border-[#07563D] transition-all w-52 sm:w-64"
            />
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              handleRunSimulation();
              setIsRuleSimModalOpen(true);
            }}
            className="text-purple-700 hover:bg-purple-50 border-purple-200 font-semibold px-3 py-1.5 h-8 text-xs rounded-xl"
          >
            <Play className="w-3.5 h-3.5 mr-1 text-purple-600" /> Test Rule
          </Button>

          {subTab === 'components' && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleOpenComponentModal()}
              className="bg-[#07563D] hover:bg-[#064e37] text-white font-semibold px-3.5 py-1.5 h-8 text-xs rounded-xl shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> New Salary Component
            </Button>
          )}

          {subTab === 'structures' && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleOpenStructureModal()}
              className="bg-[#07563D] hover:bg-[#064e37] text-white font-semibold px-3.5 py-1.5 h-8 text-xs rounded-xl shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> New Salary Structure
            </Button>
          )}

          {subTab === 'employee-salary' && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsBulkAssignModalOpen(true)}
              className="bg-[#07563D] hover:bg-[#064e37] text-white font-semibold px-3.5 py-1.5 h-8 text-xs rounded-xl shadow-xs"
            >
              <Users className="w-3.5 h-3.5 mr-1" /> Bulk Assign Staff
            </Button>
          )}
        </div>
      </div>

      {/* ─── 1. SUBTAB: SALARY STRUCTURES ─────────────────────────────────── */}
      {subTab === 'structures' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="text-sm font-bold text-gray-900 tracking-tight">CTC Salary Templates & Component Formulas</h3>
              <p className="text-xs text-gray-500 mt-0.5">Reusable compensation packages with formula validation and sandbox preview</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-[#07563D] border border-emerald-200">
              {structures.length} Active Templates
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStructures.map(str => (
              <div key={str.id} className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col justify-between space-y-4 hover:border-emerald-300 hover:shadow-xs transition-all">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold font-mono px-2.5 py-0.5 rounded-lg bg-emerald-50 text-[#07563D] border border-emerald-200 uppercase tracking-wide inline-block">
                        {str.code}
                      </span>
                      <h4 className="font-bold text-gray-900 text-sm mt-2 tracking-tight">{str.name}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">{str.applicable_grade} • Base CTC: ₹{str.base_annual_ctc.toLocaleString('en-IN')}</p>
                    </div>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[11px] font-semibold inline-flex items-center gap-1.5 shrink-0",
                      str.status === 'Active' ? "bg-emerald-50 text-emerald-900 border border-emerald-200" : "bg-gray-100 text-gray-700 border border-gray-200"
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", str.status === 'Active' ? "bg-emerald-500" : "bg-gray-400")} />
                      {str.status}
                    </span>
                  </div>

                  {/* Components breakdown */}
                  <div className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-200/80 text-xs space-y-2">
                    <span className="font-bold text-gray-500 block uppercase text-[10px] tracking-wider mb-1 font-sans">Formula Breakdown</span>
                    {str.components.map((c, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs text-gray-700">
                        <span className="font-medium text-gray-800">{c.component_name}</span>
                        <span className="font-bold font-mono text-gray-900">
                          {c.calculation_type === 'PercentageOfGross' ? `${c.value}% of Gross` :
                           c.calculation_type === 'PercentageOfBasic' ? `${c.value}% of Basic` :
                           `₹ ${c.value.toLocaleString('en-IN')}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100 flex-wrap gap-2">
                  <span className="text-[10px] text-gray-400 font-mono">v{str.version || 1} • {str.effective_from || 'Active'}</span>
                  <div className="flex items-center gap-1.5">
                    <Button size="xs" variant="outline" onClick={() => handleDuplicateStructure(str)} className="text-gray-700 hover:bg-gray-100 rounded-lg text-xs">
                      <Copy className="w-3 h-3 mr-1 text-gray-500" /> Duplicate
                    </Button>
                    <Button size="xs" variant="outline" onClick={() => handleOpenStructureModal(str)} className="text-[#07563D] hover:bg-emerald-50 border-emerald-200 font-semibold rounded-lg text-xs">
                      <Edit2 className="w-3 h-3 mr-1" /> Edit
                    </Button>
                    <Button size="xs" variant="outline" onClick={() => handleDeleteStructure(str)} className="text-rose-700 hover:bg-rose-50 border-rose-200 font-semibold rounded-lg text-xs">
                      <Trash2 className="w-3 h-3 mr-1 text-rose-600" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── 2. SUBTAB: SALARY COMPONENTS MASTER ──────────────────────────── */}
      {subTab === 'components' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900 tracking-tight">Salary Components Master Library</h3>
              <p className="text-xs text-gray-500 mt-0.5">Configurable earnings, statutory withholdings, deductions, and tax treatments</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-[#07563D] border border-emerald-200">
              {components.length} Configured Components
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 text-gray-500 font-semibold uppercase text-[10px] tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3.5">Component Code & Name</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Calculation Rule</th>
                  <th className="px-4 py-3.5">Statutory Applicability</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredComponents.map(comp => (
                  <tr key={comp.id} className="hover:bg-emerald-50/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-gray-900 text-xs">{comp.name}</div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">{comp.code} • v{comp.version || 1}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn(
                        "px-2.5 py-0.5 text-[10px] font-semibold rounded-full",
                        comp.type === 'Earning' ? "bg-emerald-50 text-emerald-800 border border-emerald-200/60" :
                        comp.type === 'Statutory' ? "bg-blue-50 text-blue-800 border border-blue-200/60" :
                        "bg-rose-50 text-rose-800 border border-rose-200/60"
                      )}>
                        {comp.type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-700 font-medium">{comp.category}</td>
                    <td className="px-4 py-3.5 font-mono text-gray-900 font-medium">
                      {comp.calculation_type === 'PercentageOfGross' ? `${comp.default_value}% of Gross` :
                       comp.calculation_type === 'PercentageOfBasic' ? `${comp.default_value}% of Basic` :
                       comp.calculation_type === 'FixedAmount' ? `₹ ${comp.default_value.toLocaleString('en-IN')}` :
                       comp.calculation_type === 'Formula' ? comp.formula_expression :
                       comp.calculation_type}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {comp.is_pf_applicable && <span className="text-[9px] font-mono font-bold bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 border border-gray-200/60">PF</span>}
                        {comp.is_esi_applicable && <span className="text-[9px] font-mono font-bold bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 border border-gray-200/60">ESI</span>}
                        {comp.is_taxable && <span className="text-[9px] font-mono font-bold bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 border border-gray-200/60">TAX</span>}
                        {!comp.is_pf_applicable && !comp.is_esi_applicable && !comp.is_taxable && <span className="text-[10px] text-gray-400">None</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-semibold",
                        comp.status === 'Archived' ? "bg-gray-100 text-gray-600 border border-gray-200" : "bg-emerald-50 text-[#07563D] border border-emerald-200"
                      )}>
                        {comp.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleDuplicateComponent(comp)}
                          title="Duplicate Component"
                          className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenComponentModal(comp)}
                          className="px-2.5 py-1 text-xs font-semibold text-[#07563D] hover:bg-emerald-50 rounded-lg border border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteComponent(comp)}
                          title="Delete Component"
                          className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200/60 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── 3. SUBTAB: EMPLOYEE SALARY MAPPING ────────────────────────────── */}
      {subTab === 'employee-salary' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900 tracking-tight">Employee Salary Mapping & Wage Assignment</h3>
              <p className="text-xs text-gray-500 mt-0.5">Live compensation records mapped to salary structures and tax regimes</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-[#07563D] border border-emerald-200">
              {salaries.length} Mapped Employees
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 text-gray-500 font-semibold uppercase text-[10px] tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-4 py-3.5">Assigned Structure</th>
                  <th className="px-4 py-3.5 font-mono">Annual CTC</th>
                  <th className="px-4 py-3.5 font-mono">Monthly Gross</th>
                  <th className="px-4 py-3.5 font-mono">Basic (50%)</th>
                  <th className="px-4 py-3.5 font-mono">Net Take-Home</th>
                  <th className="px-4 py-3.5 font-mono">Bank Account</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSalaries.map(sal => (
                  <tr key={sal.id} className="hover:bg-emerald-50/20 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-gray-900">
                      <div>{sal.employee_name}</div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">{sal.employee_code} • {sal.department_name}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-gray-900 block">{sal.salary_structure_name || 'Corporate Standard'}</span>
                      <button
                        onClick={() => {
                          setSelectedEmpSal(sal);
                          setIsWhyRuleModalOpen(true);
                        }}
                        className="text-[10px] text-[#07563D] hover:underline flex items-center gap-0.5 mt-0.5 cursor-pointer font-semibold"
                      >
                        <HelpCircle className="w-3 h-3" /> Why this rule?
                      </button>
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-gray-900">₹ {sal.annual_ctc.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3.5 font-mono text-gray-800">₹ {sal.gross_monthly.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3.5 font-mono text-gray-800">₹ {sal.basic_monthly.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3.5 font-mono font-black text-[#07563D]">₹ {sal.net_monthly_estimate.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3.5 font-mono text-gray-600">
                      <div>{sal.bank_name}</div>
                      <div className="text-[10px] text-gray-400 font-mono">•••• {sal.account_number.slice(-4)} • {sal.ifsc_code}</div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => handleOpenRevisionModal(sal)}
                        className="text-[#07563D] hover:bg-emerald-50 border-emerald-200 font-semibold rounded-lg"
                      >
                        <Edit2 className="w-3 h-3 mr-1" /> Revise Salary
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── 4. SUBTAB: ORG TAG RULES MATRIX ──────────────────────────────── */}
      {subTab === 'tag-rules' && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900 tracking-tight">Organization Tag & Rule Assignment Matrix</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-[#07563D] border border-emerald-200">
                  Rule-Engine Active
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Assign salary structures, OT multiplier policies, LOP basis, PT jurisdictions, and approval chains based on hierarchical tags.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                handleRunSimulation();
                setIsRuleSimModalOpen(true);
              }}
              className="text-purple-700 hover:bg-purple-50 border-purple-200 font-semibold rounded-xl text-xs h-8 px-3"
            >
              <Play className="w-3.5 h-3.5 mr-1" /> Test Rule Matcher
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {tagRules.map(rule => (
              <div key={rule.id} className="p-4 rounded-2xl border border-gray-200/80 bg-gray-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 text-sm tracking-tight">{rule.rule_name}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-[#07563D] border border-emerald-200">
                    Active
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white border border-gray-200 space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between text-gray-700">
                    <span className="text-gray-500 font-sans">Tags:</span>
                    <span className="font-bold text-gray-900">{rule.location_tag} → {rule.department_tag} → {rule.grade_tag}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span className="text-gray-500 font-sans">Overtime Policy:</span>
                    <span className="font-bold text-emerald-800">{rule.ot_rule}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span className="text-gray-500 font-sans">Loss of Pay Basis:</span>
                    <span className="font-bold text-gray-800">{rule.lop_rule}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span className="text-gray-500 font-sans">PT Jurisdiction:</span>
                    <span className="font-bold text-gray-800">{rule.pt_jurisdiction_id}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span className="text-gray-500 font-sans">Approval Chain:</span>
                    <span className="font-bold text-purple-800">{rule.maker_role} → {rule.checker_role}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-200/60">
                  <span className="text-[10px] text-gray-400 font-mono">Rule ID: {rule.id}</span>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => handleDeleteRule(rule)}
                    className="text-rose-700 hover:bg-rose-50 border-rose-200 rounded-lg text-xs"
                  >
                    <Trash2 className="w-3 h-3 mr-1 text-rose-600" /> Delete Rule
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── MODALS ──────────────────────────────────────────────────────── */}

      {/* MODAL 1: SALARY COMPONENT BUILDER */}
      {isComponentModalOpen && (
        <Modal
          isOpen={isComponentModalOpen}
          onClose={() => setIsComponentModalOpen(false)}
          title={selectedComponent ? `Edit Salary Component: ${compCode}` : 'Create New Salary Component'}
          size="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Component Name *</label>
                <input
                  type="text"
                  value={compName}
                  onChange={e => setCompName(e.target.value)}
                  placeholder="e.g. Production Incentive"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Component Code (Unique) *</label>
                <input
                  type="text"
                  value={compCode}
                  onChange={e => setCompCode(e.target.value)}
                  placeholder="e.g. PROD_INC"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono uppercase font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Component Type</label>
                <select
                  value={compType}
                  onChange={e => setCompType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold"
                >
                  <option value="Earning">Earning</option>
                  <option value="Deduction">Deduction</option>
                  <option value="Statutory">Statutory</option>
                  <option value="Employer Contribution">Employer Contribution</option>
                  <option value="Reimbursement">Reimbursement</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Category</label>
                <select
                  value={compCategory}
                  onChange={e => setCompCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold"
                >
                  <option value="Basic">Basic</option>
                  <option value="HRA">HRA</option>
                  <option value="SpecialAllowance">Special Allowance</option>
                  <option value="Allowance">General Allowance</option>
                  <option value="Overtime">Overtime</option>
                  <option value="Incentive">Incentive</option>
                  <option value="Bonus">Bonus</option>
                  <option value="PF">PF</option>
                  <option value="ESI">ESI</option>
                  <option value="ProfessionalTax">Professional Tax</option>
                  <option value="TDS">TDS</option>
                  <option value="LOP">LOP</option>
                  <option value="Loan">Loan</option>
                  <option value="Advance">Advance</option>
                </select>
              </div>
            </div>

            {/* Calculation Builder */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
              <span className="font-bold text-gray-900 block uppercase text-[10px]">Calculation Rule Builder</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Calculation Type</label>
                  <select
                    value={compCalcType}
                    onChange={e => setCompCalcType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold"
                  >
                    <option value="FixedAmount">Fixed Amount (₹)</option>
                    <option value="PercentageOfGross">Percentage of Gross (%)</option>
                    <option value="PercentageOfBasic">Percentage of Basic (%)</option>
                    <option value="PercentageOfCTC">Percentage of CTC (%)</option>
                    <option value="Formula">Custom Formula Builder</option>
                    <option value="PerDay">Per Day Attendance Basis</option>
                    <option value="PerHour">Per Hour Overtime Basis</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Rate / Value</label>
                  <input
                    type="number"
                    value={compDefaultVal}
                    onChange={e => setCompDefaultVal(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {compCalcType === 'Formula' && (
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Formula Expression</label>
                  <input
                    type="text"
                    value={compFormula}
                    onChange={e => setCompFormula(e.target.value)}
                    placeholder="e.g. (Gross - Basic - HRA)"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-mono"
                  />
                  <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-gray-500 font-mono">
                    <span>Variables:</span>
                    {['Basic', 'Gross', 'CTC', 'HRA', 'OT_Hours', 'LOP_Days'].map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setCompFormula(prev => `${prev} ${v}`)}
                        className="px-1.5 py-0.5 bg-gray-200 rounded hover:bg-gray-300 font-bold cursor-pointer"
                      >
                        +{v}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Statutory Checkboxes */}
            <div className="space-y-2">
              <span className="font-bold text-gray-700 block">Statutory Compliance Applicability</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <label className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200 cursor-pointer">
                  <input type="checkbox" checked={compIsPf} onChange={e => setCompIsPf(e.target.checked)} className="rounded text-[#07563D]" />
                  <span>PF Applicable</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200 cursor-pointer">
                  <input type="checkbox" checked={compIsEsi} onChange={e => setCompIsEsi(e.target.checked)} className="rounded text-[#07563D]" />
                  <span>ESI Applicable</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200 cursor-pointer">
                  <input type="checkbox" checked={compIsPt} onChange={e => setCompIsPt(e.target.checked)} className="rounded text-[#07563D]" />
                  <span>PT Applicable</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200 cursor-pointer">
                  <input type="checkbox" checked={compIsTds} onChange={e => setCompIsTds(e.target.checked)} className="rounded text-[#07563D]" />
                  <span>TDS Taxable</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setIsComponentModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={handleSaveComponent} className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold">
                Save Component
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 2: SALARY STRUCTURE BUILDER */}
      {isStructureModalOpen && (
        <Modal
          isOpen={isStructureModalOpen}
          onClose={() => setIsStructureModalOpen(false)}
          title={selectedStructure ? `Edit Salary Structure: ${strCode}` : 'Create Salary Structure Template'}
          size="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Structure Code *</label>
                <input
                  type="text"
                  value={strCode}
                  onChange={e => setStrCode(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono uppercase font-bold"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Structure Name *</label>
                <input
                  type="text"
                  value={strName}
                  onChange={e => setStrName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Applicable Grade / Category</label>
                <input
                  type="text"
                  value={strGrade}
                  onChange={e => setStrGrade(e.target.value)}
                  placeholder="e.g. Grade L1 - L5"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Benchmark Annual CTC (₹)</label>
                <input
                  type="number"
                  value={strCtc}
                  onChange={e => {
                    setStrCtc(Number(e.target.value));
                    setSandboxCtc(Number(e.target.value));
                  }}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono font-bold"
                />
              </div>
            </div>

            {/* Selectable Components Checklist */}
            <div className="space-y-2">
              <span className="font-bold text-gray-700 block">Select Included Wage Components</span>
              <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto border border-gray-200 p-2 rounded-xl">
                {components.map(comp => (
                  <label key={comp.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCompIds.includes(comp.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedCompIds([...selectedCompIds, comp.id]);
                        } else {
                          setSelectedCompIds(selectedCompIds.filter(id => id !== comp.id));
                        }
                      }}
                      className="rounded text-[#07563D]"
                    />
                    <div className="min-w-0">
                      <span className="font-bold text-gray-900 block truncate">{comp.name}</span>
                      <span className="text-[10px] text-gray-500 font-mono">{comp.code} • {comp.category}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Interactive Salary Calculation Sandbox Preview */}
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-950 block text-[11px] uppercase">
                  Sandbox Calculation Simulation (Sample CTC: ₹{sandboxCtc.toLocaleString('en-IN')})
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900">
                  SIMULATION ONLY
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="bg-white p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-gray-500 block font-sans">Monthly Gross</span>
                  <span className="font-bold text-gray-900">₹{Math.round(sandboxCtc / 12).toLocaleString('en-IN')}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-gray-500 block font-sans">Est. Deductions</span>
                  <span className="font-bold text-rose-700">₹{Math.round((sandboxCtc / 12) * 0.08).toLocaleString('en-IN')}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-gray-500 block font-sans">Est. Net Take-Home</span>
                  <span className="font-black text-[#07563D]">₹{Math.round((sandboxCtc / 12) * 0.92).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setIsStructureModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={handleSaveStructure} className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold">
                Publish Structure
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 3: BULK SALARY ASSIGNMENT */}
      {isBulkAssignModalOpen && (
        <Modal
          isOpen={isBulkAssignModalOpen}
          onClose={() => setIsBulkAssignModalOpen(false)}
          title="Bulk Assign Salary Structure"
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="font-bold text-gray-900 block">Total Staff Selected: {salaries.length} Employees</span>
              <p className="text-gray-500 text-[11px]">Assign all active tenant staff to a target salary structure with a scheduled effective date.</p>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Target Salary Structure *</label>
              <select
                value={bulkTargetStructureId}
                onChange={e => setBulkTargetStructureId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold"
              >
                <option value="">-- Select Structure --</option>
                {structures.map(str => (
                  <option key={str.id} value={str.id}>{str.code} — {str.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Effective Start Date *</label>
              <input
                type="date"
                value={bulkEffectiveFrom}
                onChange={e => setBulkEffectiveFrom(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setIsBulkAssignModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={handleBulkAssign} className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold">
                Apply Bulk Assignment
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 4: RULE SIMULATION ("TEST RULE") */}
      {isRuleSimModalOpen && (
        <Modal
          isOpen={isRuleSimModalOpen}
          onClose={() => setIsRuleSimModalOpen(false)}
          title="Organization Rule Matcher & Priority Simulator"
          size="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-3">
              <label className="font-bold text-gray-700 whitespace-nowrap">Select Employee to Test:</label>
              <select
                value={simEmpId}
                onChange={e => {
                  setSimEmpId(e.target.value);
                  const res = payrollApi.testRuleSimulation(e.target.value);
                  setSimResult(res);
                }}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold"
              >
                {salaries.map(s => (
                  <option key={s.employee_id} value={s.employee_id}>{s.employee_name} ({s.department_name})</option>
                ))}
              </select>
            </div>

            {simResult && (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="font-bold text-emerald-950 block text-xs">
                    Winning Rule: {simResult.winning_rule?.rule_name}
                  </span>
                  <div className="text-[11px] text-emerald-800 mt-1 font-mono">
                    Tags: {simResult.winning_rule?.location_tag} → {simResult.winning_rule?.department_tag} → {simResult.winning_rule?.grade_tag}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="font-bold text-gray-700 block uppercase text-[10px]">Evaluated Candidate Rules:</span>
                  {simResult.evaluated_rules.map((evalRule: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-gray-900">{evalRule.rule_name}</span>
                        <span className="block text-[10px] text-gray-500">{evalRule.match_reason}</span>
                      </div>
                      <Badge variant={evalRule.matched ? 'emerald' : 'gray'}>
                        {evalRule.matched ? 'Matched' : 'Skipped'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setIsRuleSimModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 5: "WHY THIS RULE?" RESOLUTION LADDER */}
      {isWhyRuleModalOpen && selectedEmpSal && (
        <Modal
          isOpen={isWhyRuleModalOpen}
          onClose={() => setIsWhyRuleModalOpen(false)}
          title={`Rule Resolution Ladder: ${selectedEmpSal.employee_name}`}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <p className="text-gray-600 text-xs">
              WorkForceOS resolved the winning compensation package using the tenant's hierarchical priority chain:
            </p>

            <div className="space-y-2 border-l-2 border-[#07563D] pl-4 ml-2">
              <div className="relative">
                <span className="w-2.5 h-2.5 rounded-full bg-[#07563D] absolute -left-[21px] top-1"></span>
                <span className="font-bold text-gray-900 block">1. Company Global Default</span>
                <span className="text-[10px] text-gray-500 font-mono">Priority: 100 • Evaluated (Passed)</span>
              </div>
              <div className="relative">
                <span className="w-2.5 h-2.5 rounded-full bg-[#07563D] absolute -left-[21px] top-1"></span>
                <span className="font-bold text-gray-900 block">2. Location Rule (Tamil Nadu / Hosur Plant)</span>
                <span className="text-[10px] text-gray-500 font-mono">Priority: 400 • Evaluated (Passed)</span>
              </div>
              <div className="relative">
                <span className="w-2.5 h-2.5 rounded-full bg-[#07563D] absolute -left-[21px] top-1"></span>
                <span className="font-bold text-gray-900 block">3. Department & Grade ({selectedEmpSal.department_name})</span>
                <span className="text-[10px] text-gray-500 font-mono">Priority: 800 • Winning Rule Match</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="font-bold text-emerald-950 block">Assigned Structure: {selectedEmpSal.salary_structure_name || 'Corporate Standard'}</span>
              <span className="text-emerald-800 text-[11px]">Monthly Gross: ₹{selectedEmpSal.gross_monthly.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" variant="outline" onClick={() => setIsWhyRuleModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 6: SALARY REVISION */}
      {isRevisionModalOpen && selectedEmpSal && (
        <Modal
          isOpen={isRevisionModalOpen}
          onClose={() => setIsRevisionModalOpen(false)}
          title={`Revise Salary: ${selectedEmpSal.employee_name}`}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="font-bold text-emerald-900 block">{selectedEmpSal.employee_name} ({selectedEmpSal.employee_code})</span>
              <span className="text-emerald-700 text-[11px] font-mono">
                Current CTC: ₹{selectedEmpSal.annual_ctc.toLocaleString('en-IN')}/yr (₹{selectedEmpSal.gross_monthly.toLocaleString('en-IN')}/mo)
              </span>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">New Annual CTC (INR) *</label>
              <input
                type="number"
                value={revNewCtc}
                onChange={e => setRevNewCtc(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono font-bold text-gray-900"
              />
              <span className="text-[10px] text-gray-400 mt-1 block">
                Calculated Monthly Gross: ₹{Math.round(revNewCtc / 12).toLocaleString('en-IN')}/mo
              </span>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Reason for Revision</label>
              <input
                type="text"
                value={revReason}
                onChange={e => setRevReason(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setIsRevisionModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={handleSaveRevision} className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold">
                Apply Revision
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {isDeleteModalOpen && deleteTarget && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirm Deletion"
          size="sm"
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">
                  Delete {deleteTarget.type === 'structure' ? 'Salary Structure' : deleteTarget.type === 'component' ? 'Salary Component' : 'Org Tag Rule'}?
                </p>
                <p className="text-xs text-rose-700 mt-1">
                  Are you sure you want to permanently delete <strong className="font-semibold text-rose-950">"{deleteTarget.name}"</strong>{deleteTarget.code ? ` (${deleteTarget.code})` : ''}?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsDeleteModalOpen(false)}
                className="text-gray-700 border-gray-200 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleConfirmDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Permanently
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
