import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import {
  Building2,
  Users,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Info,
  Check,
  Layers,
  HelpCircle,
  AlertTriangle,
  FileCheck,
  Zap,
  DollarSign,
  Plus,
  Trash2,
  Scale,
  Calculator,
  Settings,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useToast } from '../../../components/ui/Toast';
import { SalaryStructure, StructureComponentRule } from '../../../types/payroll';
import { payrollApi } from '../../../services/payrollApi';
import { PayrollCalculationEngine } from '../../../services/payroll/payrollCalculationEngine';
import { api } from '../../../services/api';
import { getActiveOrgId } from '../../../services/attendance/biometricCommandService';
import { Department } from '../../../types';

export interface CustomStructureComponent {
  id: string;
  code: string;
  name: string;
  type: 'Earning' | 'Deduction';
  calculation_type: 'FixedAmount' | 'PerDay' | 'PercentageOfBasic' | 'PercentageOfGross';
  value: number;
  is_taxable: boolean;
  is_active: boolean;
}

interface IntelligentSalaryStructureBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onStructureSaved: (structure: SalaryStructure) => void;
  existingStructure?: SalaryStructure | null;
}

export const IntelligentSalaryStructureBuilder: React.FC<IntelligentSalaryStructureBuilderProps> = ({
  isOpen,
  onClose,
  onStructureSaved,
  existingStructure,
}) => {
  const { showToast } = useToast();

  // Wizard Step (1 to 7)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);
  const [isSaving, setIsSaving] = useState(false);

  const isInitialDaily = Boolean(
    existingStructure?.code?.toLowerCase().includes('daily') ||
    existingStructure?.name?.toLowerCase().includes('daily') ||
    existingStructure?.components?.some((c: any) =>
      c.calculation_type === 'FixedDailyAmount' || c.calculation_type === 'PerDay'
    )
  );

  const initialDailyWage = (() => {
    if (existingStructure?.components) {
      const dailyComps = existingStructure.components.filter((c: any) =>
        c.calculation_type === 'FixedDailyAmount' || c.calculation_type === 'PerDay'
      );
      if (dailyComps.length > 0) {
        return dailyComps.reduce((sum: number, c: any) => sum + (c.value ?? c.default_value ?? 0), 0);
      }
    }
    if (existingStructure?.base_annual_ctc) {
      return Math.round(existingStructure.base_annual_ctc / (26 * 12));
    }
    return 600;
  })();

  // Step 1: Structure Profile
  const [workforceCategory, setWorkforceCategory] = useState<'manufacturing' | 'corporate' | 'contract' | 'daily' | 'custom'>(
    isInitialDaily ? 'daily' : 'corporate'
  );
  const [structureName, setStructureName] = useState(
    existingStructure?.name || (isInitialDaily ? 'Daily Wage / Field Operations Structure' : 'Corporate Standard Structure')
  );
  const [structureCode, setStructureCode] = useState(
    existingStructure?.code || (isInitialDaily ? 'STR_DAILY_OPS' : 'CORP_STD_02')
  );
  const [applicableGrade, setApplicableGrade] = useState(
    existingStructure?.applicable_grade || (isInitialDaily ? 'Daily Worker / Field Grade L1' : 'Corporate Staff / Grade L1 - L4')
  );
  const [payFrequency, setPayFrequency] = useState<'Monthly' | 'Daily' | 'Hourly'>(
    isInitialDaily ? 'Daily' : 'Monthly'
  );
  const [location, setLocation] = useState('All Operating Locations');
  const [effectiveFrom, setEffectiveFrom] = useState(
    existingStructure?.effective_from || new Date().toISOString().split('T')[0]
  );

  // Step 2: Pay Basis & Base Amount
  const [payBasisType, setPayBasisType] = useState<'annual_ctc' | 'monthly_gross' | 'daily_wage'>(
    isInitialDaily ? 'daily_wage' : 'annual_ctc'
  );
  const [compensationBasis, setCompensationBasis] = useState<'CTC_INCLUSIVE' | 'GROSS_BASED'>(
    (existingStructure as any)?.compensation_basis || (isInitialDaily ? 'GROSS_BASED' : 'CTC_INCLUSIVE')
  );
  const [annualCtcInput, setAnnualCtcInput] = useState<number>(
    existingStructure?.base_annual_ctc || (isInitialDaily ? 187200 : 900000)
  );
  const [monthlyGrossInput, setMonthlyGrossInput] = useState<number>(
    isInitialDaily ? 15600 : 75000
  );
  const [dailyWageInput, setDailyWageInput] = useState<number>(initialDailyWage);
  const [workingDaysPerMonth, setWorkingDaysPerMonth] = useState<number>(26);

  // Step 3 & 4: Selected Components & Formulas
  const findExistingComp = (code: string) => existingStructure?.components?.find(
    (c: any) => (c.component_code && c.component_code.toUpperCase() === code) || (c.code && c.code.toUpperCase() === code)
  );

  const [basicPct, setBasicPct] = useState<number>(() => {
    const bComp = findExistingComp('BASIC');
    if (bComp?.value && bComp.value <= 100) return bComp.value;
    return isInitialDaily ? 70 : 50;
  });
  const [hraPct, setHraPct] = useState<number>(() => {
    const hComp = findExistingComp('HRA');
    if (hComp?.value && hComp.value <= 100) return hComp.value;
    return isInitialDaily ? 30 : 40;
  });
  const [includeConveyance, setIncludeConveyance] = useState<boolean>(
    existingStructure ? Boolean(findExistingComp('CONV') || findExistingComp('CONVEYANCE')) : !isInitialDaily
  );
  const [conveyanceMonthly, setConveyanceMonthly] = useState<number>(
    findExistingComp('CONV')?.value ?? findExistingComp('CONVEYANCE')?.value ?? 1600
  );
  const [includeFoodAllowance, setIncludeFoodAllowance] = useState<boolean>(
    existingStructure ? Boolean(findExistingComp('FOOD') || findExistingComp('MEAL_ALLOW')) : false
  );
  const [foodAllowanceMonthly, setFoodAllowanceMonthly] = useState<number>(
    findExistingComp('FOOD')?.value ?? findExistingComp('MEAL_ALLOW')?.value ?? 1500
  );
  const [includeAttendanceBonus, setIncludeAttendanceBonus] = useState<boolean>(
    existingStructure ? Boolean(findExistingComp('ATTN_BONUS') || findExistingComp('ATT_BONUS')) : false
  );
  const [attendanceBonusMonthly, setAttendanceBonusMonthly] = useState<number>(
    findExistingComp('ATTN_BONUS')?.value ?? findExistingComp('ATT_BONUS')?.value ?? 1000
  );
  const [includeNightAllowance, setIncludeNightAllowance] = useState<boolean>(
    existingStructure ? Boolean(findExistingComp('NIGHT_ALLOW')) : false
  );
  const [nightAllowancePerShift, setNightAllowancePerShift] = useState<number>(150);
  const [includeSiteAllowance, setIncludeSiteAllowance] = useState<boolean>(
    existingStructure ? Boolean(findExistingComp('SITE_ALLOW')) : false
  );
  const [siteAllowanceMonthly, setSiteAllowanceMonthly] = useState<number>(2000);
  const [includeUniformAllowance, setIncludeUniformAllowance] = useState<boolean>(
    existingStructure ? Boolean(findExistingComp('UNIFORM_ALLOW')) : false
  );
  const [uniformAllowanceMonthly, setUniformAllowanceMonthly] = useState<number>(
    findExistingComp('UNIFORM_ALLOW')?.value ?? 800
  );
  const [includeOtWages, setIncludeOtWages] = useState<boolean>(
    existingStructure ? Boolean(findExistingComp('OT_WAGES')) : false
  );
  const [otHourlyRate, setOtHourlyRate] = useState<number>(75);

  // Custom User-Defined Components
  const [customComponents, setCustomComponents] = useState<CustomStructureComponent[]>(() => {
    if (!existingStructure?.components) return [];
    const standardCodes = new Set([
      'BASIC', 'HRA', 'CONV', 'CONVEYANCE', 'FOOD', 'MEAL_ALLOW',
      'SPL_ALLOW', 'SA', 'SPECIAL_ALLOWANCE',
      'PF_EMP', 'PT', 'TDS', 'ER_PF', 'ESI_EMP', 'ER_ESI', 'LWF', 'GRATUITY',
      'OT_WAGES', 'NIGHT_ALLOW', 'ATTN_BONUS', 'ATT_BONUS', 'SITE_ALLOW', 'UNIFORM_ALLOW',
      'COMM_ALLOW', 'MED'
    ]);
    return existingStructure.components
      .filter((c: any) => {
        const cCode = (c.component_code || c.code || '').toUpperCase();
        return !standardCodes.has(cCode);
      })
      .map((c: any) => ({
        id: c.component_id || `cust-${Date.now()}-${Math.random()}`,
        code: c.component_code || c.code || 'CUSTOM',
        name: c.component_name || c.name || 'Custom Component',
        type: c.type === 'Deduction' ? 'Deduction' : 'Earning',
        calculation_type: (c.calculation_type as any) || 'FixedAmount',
        value: c.value ?? c.default_value ?? 0,
        is_taxable: c.is_taxable !== false,
        is_active: true,
      }));
  });

  // State for new custom component form
  const [isAddingCustom, setIsAddingCustom] = useState<boolean>(false);
  const [newCustomName, setNewCustomName] = useState<string>('');
  const [newCustomCode, setNewCustomCode] = useState<string>('');
  const [newCustomType, setNewCustomType] = useState<'Earning' | 'Deduction'>('Earning');
  const [newCustomCalcType, setNewCustomCalcType] = useState<'FixedAmount' | 'PerDay' | 'PercentageOfBasic' | 'PercentageOfGross'>('FixedAmount');
  const [newCustomValue, setNewCustomValue] = useState<number>(1000);
  const [newCustomTaxable, setNewCustomTaxable] = useState<boolean>(true);

  // Statutory Deductions (Separate from earnings!)
  const [includePfEmployee, setIncludePfEmployee] = useState<boolean>(true);
  const [includeEsiEmployee, setIncludeEsiEmployee] = useState<boolean>(true);
  const [includePt, setIncludePt] = useState<boolean>(true);
  const [includeLwf, setIncludeLwf] = useState<boolean>(true);

  // Employer Contributions (Cost to company side)
  const [includePfEmployer, setIncludePfEmployer] = useState<boolean>(true);
  const [includeEsiEmployer, setIncludeEsiEmployer] = useState<boolean>(true);
  const [includeGratuity, setIncludeGratuity] = useState<boolean>(true);

  // Step 6: Employee Applicability
  const [assignedPayrollGroup, setAssignedPayrollGroup] = useState(
    existingStructure?.payroll_group || 'Monthly Main Payroll (All Corporate & Operations Staff)'
  );
  const [assignedDepartment, setAssignedDepartment] = useState(
    existingStructure?.department || 'All Departments'
  );
  const [departmentsList, setDepartmentsList] = useState<Department[]>([]);
  const [payrollGroupsWithCount, setPayrollGroupsWithCount] = useState<Array<{ id: string; name: string; count: number }>>([]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      api.getDepartments().catch(() => []),
      api.getEmployees().catch(() => []),
    ]).then(([depts, emps]) => {
      if (!isMounted) return;
      if (Array.isArray(depts) && depts.length > 0) {
        setDepartmentsList(depts);
      }
      const activeEmps = (emps || []).filter((e: any) => e.status !== 'Terminated');
      const groupCounts: Record<string, number> = {
        'pg-monthly-main': 0,
        'pg-exec-mgmt': 0,
        'pg-field-staff': 0,
      };

      activeEmps.forEach((e: any) => {
        const pgId = e.payroll_group_id || 'pg-monthly-main';
        if (groupCounts[pgId] !== undefined) {
          groupCounts[pgId]++;
        } else {
          groupCounts['pg-monthly-main']++;
        }
      });

      setPayrollGroupsWithCount([
        { id: 'pg-monthly-main', name: 'Monthly Main Payroll (All Corporate & Operations Staff)', count: groupCounts['pg-monthly-main'] },
        { id: 'pg-exec-mgmt', name: 'Executive & Management Payroll', count: groupCounts['pg-exec-mgmt'] },
        { id: 'pg-field-staff', name: 'Weekly / Bi-Weekly Field Staff', count: groupCounts['pg-field-staff'] },
      ]);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Dynamic Live Calculation Engine synced with Authoritative Payroll Engine
  const calculations = useMemo(() => {
    const isCtcInclusive = compensationBasis === 'CTC_INCLUSIVE';
    
    // Determine effective monthly base pool
    let effectiveMonthlyPool = 0;
    if (payBasisType === 'annual_ctc') {
      effectiveMonthlyPool = Math.round(annualCtcInput / 12);
    } else if (payBasisType === 'daily_wage') {
      effectiveMonthlyPool = Math.round(dailyWageInput * workingDaysPerMonth);
    } else {
      effectiveMonthlyPool = monthlyGrossInput;
    }

    const breakdown = PayrollCalculationEngine.calculateCtcBreakdown({
      monthlyCtc: isCtcInclusive ? effectiveMonthlyPool : undefined,
      monthlyGross: !isCtcInclusive ? effectiveMonthlyPool : undefined,
      compensationBasis,
      pfApplicable: includePfEmployee || includePfEmployer,
      esiApplicable: includeEsiEmployee || includeEsiEmployer,
      ptApplicable: includePt,
      lwfApplicable: includeLwf,
    });

    const monthlyCtc = breakdown.monthlyCtc;
    const annualCtc = breakdown.annualCtc;
    const finalMonthlyGross = breakdown.monthlyGrossEarnings;

    // Determine basic and HRA
    let basicMonthly = 0;
    let hraMonthly = 0;

    if (payBasisType === 'daily_wage') {
      const dailyBasic = Math.round(dailyWageInput * (basicPct / 100));
      const dailyHra = Math.max(0, dailyWageInput - dailyBasic);
      basicMonthly = dailyBasic * workingDaysPerMonth;
      hraMonthly = dailyHra * workingDaysPerMonth;
    } else {
      basicMonthly = Math.round(finalMonthlyGross * (basicPct / 100));
      hraMonthly = Math.round(basicMonthly * (hraPct / 100));
    }

    const convMonthly = includeConveyance ? conveyanceMonthly : 0;
    const foodMonthly = includeFoodAllowance ? foodAllowanceMonthly : 0;
    const attnBonusMonthly = includeAttendanceBonus ? attendanceBonusMonthly : 0;
    const siteMonthly = includeSiteAllowance ? siteAllowanceMonthly : 0;
    const uniformMonthly = includeUniformAllowance ? uniformAllowanceMonthly : 0;

    // Custom earnings monthly total
    const customEarningsTotal = customComponents
      .filter(c => c.is_active && c.type === 'Earning')
      .reduce((sum, c) => {
        if (c.calculation_type === 'FixedAmount') return sum + c.value;
        if (c.calculation_type === 'PerDay') return sum + (c.value * workingDaysPerMonth);
        if (c.calculation_type === 'PercentageOfBasic') return sum + Math.round((basicMonthly * c.value) / 100);
        if (c.calculation_type === 'PercentageOfGross') return sum + Math.round((finalMonthlyGross * c.value) / 100);
        return sum + c.value;
      }, 0);

    // Balancing component (Special Allowance absorbs remainder)
    const fixedEarningsTotal = basicMonthly + hraMonthly + convMonthly + foodMonthly + attnBonusMonthly + siteMonthly + uniformMonthly + customEarningsTotal;
    const specialAllowanceBalancing = Math.max(0, finalMonthlyGross - fixedEarningsTotal);

    // Employer cost
    const erPfMonthly = includePfEmployer ? breakdown.epfEmployer : 0;
    const erEsiMonthly = includeEsiEmployer ? breakdown.esicEmployer : 0;
    const gratuityMonthly = includeGratuity ? breakdown.gratuityProvision : 0;
    const totalEmployerCost = erPfMonthly + erEsiMonthly + gratuityMonthly;

    // Employee Deductions
    const eePfMonthly = includePfEmployee ? breakdown.epfEmployee : 0;
    const eeEsiMonthly = includeEsiEmployee ? breakdown.esicEmployee : 0;
    const ptMonthly = includePt ? breakdown.professionalTax : 0;
    const lwfMonthly = includeLwf ? (breakdown.lwfEmployee || 20) : 0;

    const customDeductionsTotal = customComponents
      .filter(c => c.is_active && c.type === 'Deduction')
      .reduce((sum, c) => {
        if (c.calculation_type === 'FixedAmount') return sum + c.value;
        if (c.calculation_type === 'PerDay') return sum + (c.value * workingDaysPerMonth);
        if (c.calculation_type === 'PercentageOfBasic') return sum + Math.round((basicMonthly * c.value) / 100);
        if (c.calculation_type === 'PercentageOfGross') return sum + Math.round((finalMonthlyGross * c.value) / 100);
        return sum + c.value;
      }, 0);

    const totalEmployeeDeductions = eePfMonthly + eeEsiMonthly + ptMonthly + lwfMonthly + customDeductionsTotal;
    const netTakeHomeMonthly = Math.max(0, finalMonthlyGross - totalEmployeeDeductions);

    return {
      annualCtc,
      monthlyCtc,
      finalMonthlyGross,
      basicMonthly,
      hraMonthly,
      convMonthly,
      foodMonthly,
      attnBonusMonthly,
      siteMonthly,
      uniformMonthly,
      customEarningsTotal,
      customDeductionsTotal,
      specialAllowanceBalancing,
      erPfMonthly,
      erEsiMonthly,
      gratuityMonthly,
      totalEmployerCost: Math.round(isCtcInclusive ? Math.max(0, monthlyCtc - finalMonthlyGross) : totalEmployerCost),
      totalCtc: isCtcInclusive ? monthlyCtc : (finalMonthlyGross + totalEmployerCost),
      eePfMonthly,
      eeEsiMonthly,
      ptMonthly,
      lwfMonthly,
      totalEmployeeDeductions,
      netTakeHomeMonthly,
      isBalanced: true,
    };
  }, [
    compensationBasis,
    payBasisType,
    annualCtcInput,
    monthlyGrossInput,
    dailyWageInput,
    workingDaysPerMonth,
    basicPct,
    hraPct,
    includeConveyance,
    conveyanceMonthly,
    includeFoodAllowance,
    foodAllowanceMonthly,
    includeAttendanceBonus,
    attendanceBonusMonthly,
    includeNightAllowance,
    nightAllowancePerShift,
    includeSiteAllowance,
    siteAllowanceMonthly,
    includeUniformAllowance,
    uniformAllowanceMonthly,
    customComponents,
    includePfEmployee,
    includeEsiEmployee,
    includePt,
    includeLwf,
    includePfEmployer,
    includeEsiEmployer,
    includeGratuity,
  ]);

  const handleSelectWorkforceCategory = (id: 'manufacturing' | 'corporate' | 'contract' | 'daily' | 'custom') => {
    setWorkforceCategory(id);
    if (id === 'daily') {
      setPayBasisType('daily_wage');
      setPayFrequency('Daily');
      setCompensationBasis('GROSS_BASED');
      setBasicPct(70);
      setHraPct(30);
      setIncludeConveyance(false);
      setIncludeAttendanceBonus(true);
      if (!existingStructure) {
        setStructureName('Daily Wage / Field Operations Structure');
        setStructureCode('STR_DAILY_OPS');
        setApplicableGrade('Daily Worker / Field Grade L1');
        setDailyWageInput(600);
      }
    } else if (id === 'corporate') {
      setPayBasisType('annual_ctc');
      setPayFrequency('Monthly');
      setCompensationBasis('CTC_INCLUSIVE');
      setBasicPct(50);
      setHraPct(40);
      setIncludeConveyance(true);
      if (!existingStructure) {
        setStructureName('Corporate / Office Staff Structure');
        setStructureCode('CORP_MONTHLY_01');
        setApplicableGrade('Executive / Staff L1 - L3');
      }
    } else if (id === 'contract') {
      setPayBasisType('daily_wage');
      setPayFrequency('Daily');
      setCompensationBasis('GROSS_BASED');
      setBasicPct(70);
      setHraPct(30);
      setIncludeAttendanceBonus(true);
      if (!existingStructure) {
        setStructureName('Contract Labour Compensation Structure');
        setStructureCode('CONTRACT_LABOUR_01');
        setApplicableGrade('Contract Labour Level 1');
        setDailyWageInput(550);
      }
    } else if (id === 'manufacturing') {
      setPayFrequency('Monthly');
      setCompensationBasis('CTC_INCLUSIVE');
      setBasicPct(50);
      setHraPct(40);
      setIncludeConveyance(true);
      setIncludeAttendanceBonus(true);
      if (!existingStructure) {
        setStructureName('Manufacturing & Operations Monthly Staff');
        setStructureCode('OPS_MONTHLY_01');
        setApplicableGrade('Operations / Grade L1 - L4');
      }
    }
  };

  const handleAddCustomComponent = () => {
    if (!newCustomName.trim()) {
      showToast('Please provide a component name');
      return;
    }
    const code = (newCustomCode.trim() || newCustomName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()).slice(0, 15);
    const item: CustomStructureComponent = {
      id: `cust-${Date.now()}`,
      code,
      name: newCustomName.trim(),
      type: newCustomType,
      calculation_type: newCustomCalcType,
      value: Number(newCustomValue) || 0,
      is_taxable: newCustomTaxable,
      is_active: true,
    };
    setCustomComponents(prev => [...prev, item]);
    setNewCustomName('');
    setNewCustomCode('');
    setNewCustomValue(1000);
    setIsAddingCustom(false);
    showToast(`✓ Added custom component: ${item.name}`);
  };

  const handleRemoveCustomComponent = (id: string) => {
    setCustomComponents(prev => prev.filter(c => c.id !== id));
  };

  if (!isOpen) return null;

  const handlePublish = async () => {
    const componentsList: StructureComponentRule[] = [];
    let order = 1;

    // 1. Basic & HRA
    if (payBasisType === 'daily_wage') {
      const dailyBasic = Math.round(dailyWageInput * (basicPct / 100));
      componentsList.push({
        component_id: 'cmp-basic',
        component_code: 'BASIC',
        component_name: 'Basic Wages',
        name: 'Basic Wages',
        type: 'Earning',
        calculation_type: 'PerDay',
        value: dailyBasic,
        default_value: dailyBasic,
        basis: 'DailyRate',
        is_taxable: true,
        statutory_flags: ['PF', 'ESI', 'PT', 'TDS'],
        display_order: order++,
      });

      const dailyHra = Math.max(0, dailyWageInput - dailyBasic);
      componentsList.push({
        component_id: 'cmp-hra',
        component_code: 'HRA',
        component_name: 'House Rent Allowance',
        name: 'House Rent Allowance',
        type: 'Earning',
        calculation_type: 'PerDay',
        value: dailyHra,
        default_value: dailyHra,
        basis: 'DailyRate',
        is_taxable: true,
        statutory_flags: ['PT', 'TDS'],
        display_order: order++,
      });
    } else {
      componentsList.push({
        component_id: 'cmp-basic',
        component_code: 'BASIC',
        component_name: 'Basic Wages',
        name: 'Basic Wages',
        type: 'Earning',
        calculation_type: 'PercentageOfGross',
        value: basicPct,
        default_value: basicPct,
        basis: 'Gross',
        is_taxable: true,
        statutory_flags: ['PF', 'ESI', 'PT', 'TDS'],
        display_order: order++,
      });

      componentsList.push({
        component_id: 'cmp-hra',
        component_code: 'HRA',
        component_name: 'House Rent Allowance',
        name: 'House Rent Allowance',
        type: 'Earning',
        calculation_type: 'PercentageOfBasic',
        value: hraPct,
        default_value: hraPct,
        basis: 'Basic',
        is_taxable: true,
        statutory_flags: ['PT', 'TDS'],
        display_order: order++,
      });
    }

    // 2. Standard Allowances
    if (includeConveyance) {
      componentsList.push({
        component_id: 'cmp-conv',
        component_code: 'CONV',
        component_name: 'Conveyance Allowance',
        name: 'Conveyance Allowance',
        type: 'Earning',
        calculation_type: 'FixedAmount',
        value: conveyanceMonthly,
        default_value: conveyanceMonthly,
        is_taxable: true,
        statutory_flags: ['TDS'],
        display_order: order++,
      });
    }

    if (includeFoodAllowance) {
      componentsList.push({
        component_id: 'cmp-food',
        component_code: 'FOOD',
        component_name: 'Food / Canteen Allowance',
        name: 'Food / Canteen Allowance',
        type: 'Earning',
        calculation_type: 'FixedAmount',
        value: foodAllowanceMonthly,
        default_value: foodAllowanceMonthly,
        is_taxable: true,
        statutory_flags: ['TDS'],
        display_order: order++,
      });
    }

    if (includeAttendanceBonus) {
      componentsList.push({
        component_id: 'cmp-attn',
        component_code: 'ATTN_BONUS',
        component_name: 'Attendance Regularity Bonus',
        name: 'Attendance Regularity Bonus',
        type: 'Earning',
        calculation_type: 'FixedAmount',
        value: attendanceBonusMonthly,
        default_value: attendanceBonusMonthly,
        is_taxable: true,
        display_order: order++,
      });
    }

    if (includeNightAllowance) {
      componentsList.push({
        component_id: 'cmp-night',
        component_code: 'NIGHT_ALLOW',
        component_name: 'Night Shift Allowance',
        name: 'Night Shift Allowance',
        type: 'Earning',
        calculation_type: 'PerDay',
        value: nightAllowancePerShift,
        default_value: nightAllowancePerShift,
        is_taxable: true,
        display_order: order++,
      });
    }

    if (includeSiteAllowance) {
      componentsList.push({
        component_id: 'cmp-site',
        component_code: 'SITE_ALLOW',
        component_name: 'Site / Hardship Allowance',
        name: 'Site / Hardship Allowance',
        type: 'Earning',
        calculation_type: 'FixedAmount',
        value: siteAllowanceMonthly,
        default_value: siteAllowanceMonthly,
        is_taxable: true,
        display_order: order++,
      });
    }

    if (includeUniformAllowance) {
      componentsList.push({
        component_id: 'cmp-uniform',
        component_code: 'UNIFORM_ALLOW',
        component_name: 'Uniform & Washing Allowance',
        name: 'Uniform & Washing Allowance',
        type: 'Earning',
        calculation_type: 'FixedAmount',
        value: uniformAllowanceMonthly,
        default_value: uniformAllowanceMonthly,
        is_taxable: false,
        display_order: order++,
      });
    }

    if (includeOtWages) {
      const otVal = payBasisType === 'daily_wage' ? Math.round(dailyWageInput / 8) : otHourlyRate;
      componentsList.push({
        component_id: 'cmp-ot',
        component_code: 'OT_WAGES',
        component_name: 'Overtime Wages (OT)',
        name: 'Overtime Wages (OT)',
        type: 'Earning',
        calculation_type: 'Formula',
        formula_expression: `OT_HOURS * ${otVal}`,
        value: otVal,
        default_value: otVal,
        is_taxable: true,
        display_order: order++,
      });
    }

    // 3. User-Defined Custom Components
    customComponents.forEach(c => {
      if (c.is_active) {
        componentsList.push({
          component_id: c.id,
          component_code: c.code,
          component_name: c.name,
          name: c.name,
          type: c.type,
          calculation_type: c.calculation_type as any,
          value: c.value,
          default_value: c.value,
          is_taxable: c.is_taxable,
          display_order: order++,
        });
      }
    });

    // 4. Special Allowance (Balancing Residual)
    if (calculations.specialAllowanceBalancing > 0 || payBasisType !== 'daily_wage') {
      componentsList.push({
        component_id: 'cmp-spl',
        component_code: 'SPL_ALLOW',
        component_name: 'Special Allowance (Balancing)',
        name: 'Special Allowance (Balancing)',
        type: 'Earning',
        calculation_type: 'FixedAmount',
        value: Math.round(calculations.specialAllowanceBalancing),
        default_value: Math.round(calculations.specialAllowanceBalancing),
        is_taxable: true,
        statutory_flags: ['TDS'],
        display_order: order++,
      });
    }

    // 5. Employee Deductions
    if (includePfEmployee) {
      componentsList.push({
        component_id: 'cmp-pf-ee',
        component_code: 'PF_EMP',
        component_name: 'Provident Fund (EPF 12%)',
        name: 'Provident Fund (EPF 12%)',
        type: 'Deduction',
        calculation_type: 'PercentageOfBasic',
        value: 12,
        default_value: 12,
        basis: 'Basic',
        statutory_flags: ['PF'],
        display_order: order++,
      });
    }

    if (includeEsiEmployee) {
      componentsList.push({
        component_id: 'cmp-esi-ee',
        component_code: 'ESI_EMP',
        component_name: 'Employee ESIC (0.75%)',
        name: 'Employee ESIC (0.75%)',
        type: 'Deduction',
        calculation_type: 'PercentageOfGross',
        value: 0.75,
        default_value: 0.75,
        basis: 'Gross',
        statutory_flags: ['ESI'],
        display_order: order++,
      });
    }

    if (includePt) {
      componentsList.push({
        component_id: 'cmp-pt',
        component_code: 'PT',
        component_name: 'Professional Tax (TN)',
        name: 'Professional Tax (TN)',
        type: 'Deduction',
        calculation_type: 'FixedAmount',
        value: 208,
        default_value: 208,
        statutory_flags: ['PT'],
        display_order: order++,
      });
    }

    if (includeLwf) {
      componentsList.push({
        component_id: 'cmp-lwf',
        component_code: 'LWF',
        component_name: 'Labour Welfare Fund (LWF)',
        name: 'Labour Welfare Fund (LWF)',
        type: 'Deduction',
        calculation_type: 'FixedAmount',
        value: 20,
        default_value: 20,
        statutory_flags: ['LWF'],
        display_order: order++,
      });
    }

    // 6. Employer Contributions
    if (includePfEmployer) {
      componentsList.push({
        component_id: 'cmp-pf-er',
        component_code: 'ER_PF',
        component_name: 'Employer EPF (12%)',
        name: 'Employer EPF (12%)',
        type: 'Employer Contribution',
        calculation_type: 'PercentageOfBasic',
        value: 12,
        default_value: 12,
        basis: 'Basic',
        statutory_flags: ['PF'],
        display_order: order++,
      });
    }

    if (includeEsiEmployer) {
      componentsList.push({
        component_id: 'cmp-esi-er',
        component_code: 'ER_ESI',
        component_name: 'Employer ESIC (3.25%)',
        name: 'Employer ESIC (3.25%)',
        type: 'Employer Contribution',
        calculation_type: 'PercentageOfGross',
        value: 3.25,
        default_value: 3.25,
        basis: 'Gross',
        statutory_flags: ['ESI'],
        display_order: order++,
      });
    }

    if (includeGratuity) {
      componentsList.push({
        component_id: 'cmp-gratuity',
        component_code: 'GRATUITY',
        component_name: 'Gratuity Provision (4.81%)',
        name: 'Gratuity Provision (4.81%)',
        type: 'Employer Contribution',
        calculation_type: 'PercentageOfBasic',
        value: 4.81,
        default_value: 4.81,
        basis: 'Basic',
        statutory_flags: ['GRATUITY'],
        display_order: order++,
      });
    }

    const activeTenant = getActiveOrgId();
    const newStructure: SalaryStructure = {
      id: existingStructure?.id || `str-${Date.now()}`,
      tenant_id: activeTenant,
      code: structureCode.toUpperCase().trim(),
      name: structureName.trim(),
      description: `${workforceCategory.toUpperCase()} compensation package for ${applicableGrade}`,
      company_id: activeTenant,
      applicable_grade: applicableGrade,
      base_annual_ctc: calculations.annualCtc,
      compensation_basis: compensationBasis,
      payroll_group: assignedPayrollGroup,
      department: assignedDepartment,
      components: componentsList,
      status: 'Active',
      version: existingStructure ? (existingStructure.version || 1) + 1 : 1,
      effective_from: effectiveFrom,
      created_at: existingStructure?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      setIsSaving(true);
      const saved = await payrollApi.saveSalaryStructureAsync(newStructure);
      onStructureSaved(saved);
      showToast(`✓ Published Salary Structure: ${saved.name} (${saved.code})`);
      onClose();
    } catch (err: any) {
      console.error('[Builder] Failed to publish structure to database:', err);
      showToast(`Error publishing structure: ${err.message || 'Database error'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const stepsList = [
    { num: 1, label: 'Profile' },
    { num: 2, label: 'Pay Basis' },
    { num: 3, label: 'Components' },
    { num: 4, label: 'Formulas' },
    { num: 5, label: 'Live Breakdown' },
    { num: 6, label: 'Applicability' },
    { num: 7, label: 'Review & Publish' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header & Wizard Stepper */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#07563D] via-[#096a4b] to-[#0a7352] text-white flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-white/10 text-emerald-200">
                <Sparkles className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  Intelligent Salary Structure Builder
                </h2>
                <p className="text-xs text-emerald-100/85 mt-0.5">
                  Automated category-based compensation modeling with transparent formula building and live CTC balancing.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Stepper Progress Bar */}
          <div className="flex items-center justify-between gap-1 overflow-x-auto pt-2 border-t border-white/15">
            {stepsList.map(step => (
              <button
                key={step.num}
                onClick={() => setCurrentStep(step.num as any)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                  currentStep === step.num
                    ? "bg-white text-[#07563D] shadow-md"
                    : currentStep > step.num
                    ? "bg-white/20 text-white"
                    : "text-emerald-200/70 hover:bg-white/10"
                )}
              >
                <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[10px]">
                  {currentStep > step.num ? '✓' : step.num}
                </span>
                <span>{step.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Wizard Body (Scrollable) */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs text-gray-700">
          {/* ========================================================================= */}
          {/* STEP 1: STRUCTURE PROFILE */}
          {/* ========================================================================= */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-black text-gray-900">Step 1: Tell us about this salary structure</h3>
                <p className="text-xs text-gray-500 mt-1">
                  We will recommend a starting configuration based on your workforce profile. You can customize every component before publishing.
                </p>
              </div>

              {/* Workforce Type Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'manufacturing', title: 'Factory / Manufacturing', desc: 'Shift staff, Overtime, Attendance bonus, Canteen' },
                  { id: 'corporate', title: 'Corporate / Office Staff', desc: 'Basic, HRA, Special allowance, TDS, Variable CTC' },
                  { id: 'contract', title: 'Contract Labour', desc: 'Daily/Monthly wage, statutory contractor registers' },
                  { id: 'daily', title: 'Daily Wage Workers', desc: 'Daily attendance punch basis, OT multipliers' },
                  { id: 'custom', title: 'Custom Organization Policy', desc: 'Define clean customized formula rules from scratch' },
                ].map(wf => (
                  <div
                    key={wf.id}
                    onClick={() => handleSelectWorkforceCategory(wf.id as any)}
                    className={cn(
                      "p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-1.5",
                      workforceCategory === wf.id
                        ? "border-[#07563D] bg-emerald-50/50 shadow-xs"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 text-xs">{wf.title}</span>
                      {workforceCategory === wf.id && <CheckCircle2 className="w-4 h-4 text-[#07563D]" />}
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed">{wf.desc}</p>
                  </div>
                ))}
              </div>

              {/* Structure Profile Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-gray-50 border border-gray-200">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Structure Display Name *</label>
                  <input
                    type="text"
                    value={structureName}
                    onChange={e => setStructureName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Structure Internal Code *</label>
                  <input
                    type="text"
                    value={structureCode}
                    onChange={e => setStructureCode(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-mono uppercase font-bold text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Target Worker Grade / Level</label>
                  <input
                    type="text"
                    value={applicableGrade}
                    onChange={e => setApplicableGrade(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-medium text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Operating Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-medium text-gray-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: COMPENSATION BASIS */}
          {/* ========================================================================= */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-black text-gray-900">Step 2: How do you want to define this salary?</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Choose whether the starting anchor is an Annual Cost-to-Company (CTC) package, a fixed monthly gross, or a daily wage.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { id: 'annual_ctc', label: 'Annual CTC (Cost to Company)', desc: 'Package includes employer PF, ESI, Gratuity & Gross salary' },
                  { id: 'monthly_gross', label: 'Monthly Gross Salary', desc: 'Earnings pool before employee deductions (Basic + Allowances)' },
                  { id: 'daily_wage', label: 'Daily Wage Rate', desc: 'Daily rate multiplied by payable attendance days' },
                ].map(b => (
                  <div
                    key={b.id}
                    onClick={() => setPayBasisType(b.id as any)}
                    className={cn(
                      "p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-2",
                      payBasisType === b.id
                        ? "border-[#07563D] bg-emerald-50/50 shadow-xs"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    )}
                  >
                    <div className="font-bold text-gray-900 text-xs flex items-center justify-between">
                      <span>{b.label}</span>
                      {payBasisType === b.id && <CheckCircle2 className="w-4 h-4 text-[#07563D]" />}
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed">{b.desc}</p>
                  </div>
                ))}
              </div>

              {/* Compensation Basis Selector: CTC Inclusive vs Gross Based */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Compensation Basis
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setCompensationBasis('CTC_INCLUSIVE')}
                    className={cn(
                      "p-3.5 rounded-xl border-2 transition-all cursor-pointer space-y-1",
                      compensationBasis === 'CTC_INCLUSIVE'
                        ? "border-[#07563D] bg-emerald-50/50 shadow-xs"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    )}
                  >
                    <div className="font-bold text-gray-900 text-xs flex items-center justify-between">
                      <span>CTC Inclusive</span>
                      {compensationBasis === 'CTC_INCLUSIVE' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      Employer statutory contributions are included within CTC. Gross is derived from CTC.
                    </p>
                  </div>

                  <div
                    onClick={() => setCompensationBasis('GROSS_BASED')}
                    className={cn(
                      "p-3.5 rounded-xl border-2 transition-all cursor-pointer space-y-1",
                      compensationBasis === 'GROSS_BASED'
                        ? "border-[#07563D] bg-emerald-50/50 shadow-xs"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    )}
                  >
                    <div className="font-bold text-gray-900 text-xs flex items-center justify-between">
                      <span>Gross Salary Based</span>
                      {compensationBasis === 'GROSS_BASED' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      Gross is fixed and authoritative. Employer contributions are added to determine CTC.
                    </p>
                  </div>
                </div>
              </div>

              {/* Amount Inputs with Clear Frequency Units */}
              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-4">
                {payBasisType === 'annual_ctc' && (
                  <div className="space-y-3">
                    <label className="block text-gray-900 font-bold">
                      Enter Baseline Annual CTC Package:
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-2.5 text-gray-400 font-bold">₹</span>
                        <input
                          type="number"
                          value={annualCtcInput}
                          onChange={e => setAnnualCtcInput(Number(e.target.value))}
                          className="w-full pl-8 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl font-mono text-base font-black text-gray-900"
                        />
                      </div>
                      <span className="font-bold text-gray-600 font-mono">/ Year</span>
                    </div>

                    <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-100/60 text-[#07563D] font-bold text-xs">
                      <Zap className="w-4 h-4 text-emerald-700" />
                      <span>Equivalent Monthly CTC Anchor: ₹ {(annualCtcInput / 12).toLocaleString('en-IN')} / month</span>
                    </div>
                  </div>
                )}

                {payBasisType === 'monthly_gross' && (
                  <div className="space-y-3">
                    <label className="block text-gray-900 font-bold">
                      Enter Baseline Monthly Gross Salary:
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-2.5 text-gray-400 font-bold">₹</span>
                        <input
                          type="number"
                          value={monthlyGrossInput}
                          onChange={e => setMonthlyGrossInput(Number(e.target.value))}
                          className="w-full pl-8 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl font-mono text-base font-black text-gray-900"
                        />
                      </div>
                      <span className="font-bold text-gray-600 font-mono">/ Month</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-100/60 text-blue-900 font-bold text-xs">
                      <TrendingUp className="w-4 h-4 text-blue-700" />
                      <span>Annual Gross Earnings: ₹ {(monthlyGrossInput * 12).toLocaleString('en-IN')} / year</span>
                    </div>
                  </div>
                )}

                {payBasisType === 'daily_wage' && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="block text-gray-900 font-bold text-sm">
                        Enter Baseline Daily Wage Rate:
                      </label>
                      <span className="text-[11px] text-emerald-800 bg-emerald-100/70 font-semibold px-2.5 py-0.5 rounded-full">
                        Indian Minimum Wages & Factories Act Standard
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <span className="absolute left-3.5 top-2.5 text-gray-400 font-bold text-base">₹</span>
                        <input
                          type="number"
                          min="1"
                          value={dailyWageInput}
                          onChange={e => setDailyWageInput(Math.max(0, Number(e.target.value)))}
                          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl font-mono text-lg font-black text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:border-[#07563D]"
                          placeholder="e.g. 600"
                        />
                      </div>
                      <span className="font-black text-gray-700 font-mono text-sm shrink-0">/ Day</span>
                    </div>

                    {/* Quick Presets for Plant & Factory Workers */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">
                        Quick Presets (Standard Plant Slabs):
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        {[
                          { label: 'Unskilled (₹450/d)', rate: 450 },
                          { label: 'Semi-Skilled (₹600/d)', rate: 600 },
                          { label: 'Plant Grade L1 (₹650/d)', rate: 650 },
                          { label: 'Skilled (₹800/d)', rate: 800 },
                          { label: 'Highly Skilled (₹1,000/d)', rate: 1000 },
                        ].map(preset => (
                          <button
                            key={preset.rate}
                            type="button"
                            onClick={() => setDailyWageInput(preset.rate)}
                            className={cn(
                              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border",
                              dailyWageInput === preset.rate
                                ? "bg-[#07563D] text-white border-[#07563D] shadow-xs"
                                : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            )}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Payable Days Selector */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-white border border-gray-200 gap-2">
                      <div>
                        <span className="font-bold text-gray-800 text-xs block">Standard Monthly Working Days:</span>
                        <span className="text-[11px] text-gray-500">Determines regular full-month payable wage base</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={workingDaysPerMonth}
                          onChange={e => setWorkingDaysPerMonth(Number(e.target.value))}
                          className="px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-xl font-mono font-bold text-gray-900 text-xs focus:ring-1 focus:ring-[#07563D]"
                        >
                          <option value={26}>26 Days (Factories Act Standard)</option>
                          <option value={25}>25 Days (Plant Calendar)</option>
                          <option value={30}>30 Days (Full Month Base)</option>
                        </select>
                      </div>
                    </div>

                    {/* Live Projections */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-100/70 text-[#07563D] font-bold text-xs">
                        <Zap className="w-4 h-4 text-emerald-800 shrink-0" />
                        <span>Monthly Gross Base: ₹ {(dailyWageInput * workingDaysPerMonth).toLocaleString('en-IN')} / month ({workingDaysPerMonth} days)</span>
                      </div>
                      <div className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-100/70 text-blue-900 font-bold text-xs">
                        <TrendingUp className="w-4 h-4 text-blue-800 shrink-0" />
                        <span>Annualized Equivalent: ₹ {(dailyWageInput * workingDaysPerMonth * 12).toLocaleString('en-IN')} / year</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: RECOMMENDED & CUSTOMIZABLE COMPONENTS */}
          {/* ========================================================================= */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-gray-900">Step 3: Wage Components & Custom Allowances</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Pre-configured statutory allowances with editable values plus unlimited custom earnings and deductions.
                  </p>
                </div>
                <Button
                  size="xs"
                  variant="primary"
                  onClick={() => setIsAddingCustom(true)}
                  className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs self-start sm:self-auto shrink-0 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Custom Component
                </Button>
              </div>

              {/* Earnings & Allowances Section */}
              <div className="space-y-3">
                <div className="font-black text-xs text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  <span>Wage & Allowance Components (Earnings)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Basic Wages */}
                  <div className="p-3.5 rounded-2xl border border-emerald-300 bg-emerald-50/60 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-gray-900">Basic Wages (BASIC)</div>
                      <span className="text-[11px] text-gray-600">
                        {payBasisType === 'daily_wage'
                          ? `₹ ${Math.round(dailyWageInput * (basicPct / 100))} / day (${basicPct}% of Daily Rate)`
                          : `${basicPct}% of Gross (Statutory Wage Base)`}
                      </span>
                    </div>
                    <Badge variant="emerald">Required</Badge>
                  </div>

                  {/* HRA */}
                  <div className="p-3.5 rounded-2xl border border-emerald-300 bg-emerald-50/60 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-gray-900">House Rent Allowance (HRA)</div>
                      <span className="text-[11px] text-gray-600">
                        {payBasisType === 'daily_wage'
                          ? `₹ ${Math.max(0, dailyWageInput - Math.round(dailyWageInput * (basicPct / 100)))} / day (${hraPct}% of Daily Rate)`
                          : `${hraPct}% of Basic (Non-Metro Base)`}
                      </span>
                    </div>
                    <Badge variant="emerald">Recommended</Badge>
                  </div>

                  {/* Conveyance Allowance */}
                  <div className="p-3.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={includeConveyance}
                        onChange={e => setIncludeConveyance(e.target.checked)}
                        className="accent-[#07563D] w-4 h-4 rounded"
                      />
                      <div>
                        <div className="font-bold text-gray-900">Conveyance Allowance</div>
                        <span className="text-[11px] text-gray-500">Travel & commute assistance</span>
                      </div>
                    </label>
                    {includeConveyance && (
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-gray-400 font-bold">₹</span>
                        <input
                          type="number"
                          value={conveyanceMonthly}
                          onChange={e => setConveyanceMonthly(Math.max(0, Number(e.target.value)))}
                          className="w-20 px-2 py-1 bg-gray-50 border border-gray-300 rounded-lg text-right font-mono font-bold text-gray-900 text-xs"
                        />
                        <span className="text-[10px] text-gray-500 font-mono">/mo</span>
                      </div>
                    )}
                  </div>

                  {/* Food / Canteen Allowance */}
                  <div className="p-3.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={includeFoodAllowance}
                        onChange={e => setIncludeFoodAllowance(e.target.checked)}
                        className="accent-[#07563D] w-4 h-4 rounded"
                      />
                      <div>
                        <div className="font-bold text-gray-900">Food / Canteen Allowance</div>
                        <span className="text-[11px] text-gray-500">Subsidy or plant meal allowance</span>
                      </div>
                    </label>
                    {includeFoodAllowance && (
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-gray-400 font-bold">₹</span>
                        <input
                          type="number"
                          value={foodAllowanceMonthly}
                          onChange={e => setFoodAllowanceMonthly(Math.max(0, Number(e.target.value)))}
                          className="w-20 px-2 py-1 bg-gray-50 border border-gray-300 rounded-lg text-right font-mono font-bold text-gray-900 text-xs"
                        />
                        <span className="text-[10px] text-gray-500 font-mono">/mo</span>
                      </div>
                    )}
                  </div>

                  {/* Attendance Bonus */}
                  <div className="p-3.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={includeAttendanceBonus}
                        onChange={e => setIncludeAttendanceBonus(e.target.checked)}
                        className="accent-[#07563D] w-4 h-4 rounded"
                      />
                      <div>
                        <div className="font-bold text-gray-900">Attendance Regularity Bonus</div>
                        <span className="text-[11px] text-gray-500">Monthly full-shift incentive</span>
                      </div>
                    </label>
                    {includeAttendanceBonus && (
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-gray-400 font-bold">₹</span>
                        <input
                          type="number"
                          value={attendanceBonusMonthly}
                          onChange={e => setAttendanceBonusMonthly(Math.max(0, Number(e.target.value)))}
                          className="w-20 px-2 py-1 bg-gray-50 border border-gray-300 rounded-lg text-right font-mono font-bold text-gray-900 text-xs"
                        />
                        <span className="text-[10px] text-gray-500 font-mono">/mo</span>
                      </div>
                    )}
                  </div>

                  {/* Night Shift Allowance */}
                  <div className="p-3.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={includeNightAllowance}
                        onChange={e => setIncludeNightAllowance(e.target.checked)}
                        className="accent-[#07563D] w-4 h-4 rounded"
                      />
                      <div>
                        <div className="font-bold text-gray-900">Night Shift Allowance</div>
                        <span className="text-[11px] text-gray-500">Punch-based rotational shift</span>
                      </div>
                    </label>
                    {includeNightAllowance && (
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-gray-400 font-bold">₹</span>
                        <input
                          type="number"
                          value={nightAllowancePerShift}
                          onChange={e => setNightAllowancePerShift(Math.max(0, Number(e.target.value)))}
                          className="w-20 px-2 py-1 bg-gray-50 border border-gray-300 rounded-lg text-right font-mono font-bold text-gray-900 text-xs"
                        />
                        <span className="text-[10px] text-gray-500 font-mono">/shift</span>
                      </div>
                    )}
                  </div>

                  {/* Site / Hardship Allowance */}
                  <div className="p-3.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={includeSiteAllowance}
                        onChange={e => setIncludeSiteAllowance(e.target.checked)}
                        className="accent-[#07563D] w-4 h-4 rounded"
                      />
                      <div>
                        <div className="font-bold text-gray-900">Site / Hardship Allowance</div>
                        <span className="text-[11px] text-gray-500">Field work & plant floor allowance</span>
                      </div>
                    </label>
                    {includeSiteAllowance && (
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-gray-400 font-bold">₹</span>
                        <input
                          type="number"
                          value={siteAllowanceMonthly}
                          onChange={e => setSiteAllowanceMonthly(Math.max(0, Number(e.target.value)))}
                          className="w-20 px-2 py-1 bg-gray-50 border border-gray-300 rounded-lg text-right font-mono font-bold text-gray-900 text-xs"
                        />
                        <span className="text-[10px] text-gray-500 font-mono">/mo</span>
                      </div>
                    )}
                  </div>

                  {/* Uniform & Washing Allowance */}
                  <div className="p-3.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={includeUniformAllowance}
                        onChange={e => setIncludeUniformAllowance(e.target.checked)}
                        className="accent-[#07563D] w-4 h-4 rounded"
                      />
                      <div>
                        <div className="font-bold text-gray-900">Uniform & Washing Allowance</div>
                        <span className="text-[11px] text-gray-500">PPE and maintenance</span>
                      </div>
                    </label>
                    {includeUniformAllowance && (
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-gray-400 font-bold">₹</span>
                        <input
                          type="number"
                          value={uniformAllowanceMonthly}
                          onChange={e => setUniformAllowanceMonthly(Math.max(0, Number(e.target.value)))}
                          className="w-20 px-2 py-1 bg-gray-50 border border-gray-300 rounded-lg text-right font-mono font-bold text-gray-900 text-xs"
                        />
                        <span className="text-[10px] text-gray-500 font-mono">/mo</span>
                      </div>
                    )}
                  </div>

                  {/* Overtime (OT) Wages */}
                  <div className="p-3.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-between gap-3 sm:col-span-2">
                    <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={includeOtWages}
                        onChange={e => setIncludeOtWages(e.target.checked)}
                        className="accent-[#07563D] w-4 h-4 rounded"
                      />
                      <div>
                        <div className="font-bold text-gray-900">Overtime Wages (OT Multiplier)</div>
                        <span className="text-[11px] text-gray-500">
                          {payBasisType === 'daily_wage'
                            ? `Computed on daily wage (₹${Math.round(dailyWageInput / 8)}/hr standard 8hr shift)`
                            : `Configurable per-hour OT rate`}
                        </span>
                      </div>
                    </label>
                    {includeOtWages && payBasisType !== 'daily_wage' && (
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-gray-400 font-bold">₹</span>
                        <input
                          type="number"
                          value={otHourlyRate}
                          onChange={e => setOtHourlyRate(Math.max(0, Number(e.target.value)))}
                          className="w-20 px-2 py-1 bg-gray-50 border border-gray-300 rounded-lg text-right font-mono font-bold text-gray-900 text-xs"
                        />
                        <span className="text-[10px] text-gray-500 font-mono">/hr</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Dynamic User Custom Components */}
              <div className="space-y-3 pt-2">
                <div className="font-black text-xs text-purple-900 uppercase tracking-wider flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-600" />
                    <span>Custom Configured Components ({customComponents.length})</span>
                  </div>
                  {!isAddingCustom && (
                    <button
                      type="button"
                      onClick={() => setIsAddingCustom(true)}
                      className="text-purple-700 hover:text-purple-900 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> New Custom Component
                    </button>
                  )}
                </div>

                {/* Inline Form to Add Custom Component */}
                {isAddingCustom && (
                  <div className="p-4 rounded-2xl bg-purple-50/70 border-2 border-purple-300 space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-950 text-xs">Add New Custom Compensation Component</span>
                      <span className="text-[10px] text-purple-700">Earnings or Deductions</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-gray-700 font-bold text-[11px] mb-1">Component Name *</label>
                        <input
                          type="text"
                          value={newCustomName}
                          onChange={e => setNewCustomName(e.target.value)}
                          placeholder="e.g. Production Incentive"
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-xl font-bold text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-bold text-[11px] mb-1">Internal Code</label>
                        <input
                          type="text"
                          value={newCustomCode}
                          onChange={e => setNewCustomCode(e.target.value)}
                          placeholder="AUTO_GENERATED"
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-xl font-mono uppercase font-bold text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-bold text-[11px] mb-1">Type</label>
                        <select
                          value={newCustomType}
                          onChange={e => setNewCustomType(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-xl font-bold text-xs"
                        >
                          <option value="Earning">Earning (Adds to Gross)</option>
                          <option value="Deduction">Deduction (Subtracted from Gross)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-gray-700 font-bold text-[11px] mb-1">Calculation Method</label>
                        <select
                          value={newCustomCalcType}
                          onChange={e => setNewCustomCalcType(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-xl font-bold text-xs"
                        >
                          <option value="FixedAmount">Fixed Monthly Amount (₹/mo)</option>
                          <option value="PerDay">Daily Rate (₹/day)</option>
                          <option value="PercentageOfBasic">% of Basic Salary</option>
                          <option value="PercentageOfGross">% of Monthly Gross</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-gray-700 font-bold text-[11px] mb-1">
                          Amount / Rate Value *
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={newCustomValue}
                            onChange={e => setNewCustomValue(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-xl font-mono font-bold text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-5">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newCustomTaxable}
                            onChange={e => setNewCustomTaxable(e.target.checked)}
                            className="accent-purple-700 w-4 h-4 rounded"
                          />
                          <span className="font-bold text-gray-700 text-xs">Taxable / Subject to TDS</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-purple-200">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setIsAddingCustom(false)}
                        className="text-gray-600 font-bold text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="xs"
                        variant="primary"
                        onClick={handleAddCustomComponent}
                        className="bg-purple-800 hover:bg-purple-900 text-white font-bold text-xs shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" /> Add Component
                      </Button>
                    </div>
                  </div>
                )}

                {/* Custom Components List */}
                {customComponents.length === 0 && !isAddingCustom && (
                  <div className="p-4 rounded-xl border border-dashed border-gray-300 text-center text-xs text-gray-500 bg-gray-50/50">
                    No custom components defined yet. Click <strong>+ Add Custom Component</strong> to customize specific factory, plant or branch rules.
                  </div>
                )}

                {customComponents.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {customComponents.map(item => (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-2xl border border-purple-200 bg-purple-50/30 flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{item.name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 font-bold">
                              {item.code}
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-500">
                            {item.type} • {item.calculation_type === 'FixedAmount' ? `₹${item.value.toLocaleString('en-IN')}/mo` :
                             item.calculation_type === 'PerDay' ? `₹${item.value.toLocaleString('en-IN')}/day` :
                             item.calculation_type === 'PercentageOfBasic' ? `${item.value}% of Basic` :
                             `${item.value}% of Gross`}
                            {item.is_taxable ? ' • Taxable' : ' • Non-Taxable'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomComponent(item.id)}
                          className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                          title="Remove custom component"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Deductions Section (Deduction, NOT earning!) */}
              <div className="space-y-3 pt-2">
                <div className="font-black text-xs text-rose-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-600" />
                  <span>Employee-Side Deductions (Subtracted from Gross)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="p-3.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-between cursor-pointer">
                    <div>
                      <div className="font-bold text-gray-900">Provident Fund (EPF Employee 12%)</div>
                      <span className="text-[11px] text-gray-500">12% on Basic (Max ₹15,000 statutory ceiling)</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={includePfEmployee}
                      onChange={e => setIncludePfEmployee(e.target.checked)}
                      className="accent-[#07563D] w-4 h-4 rounded"
                    />
                  </label>

                  <label className="p-3.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-between cursor-pointer">
                    <div>
                      <div className="font-bold text-gray-900">ESIC Employee (0.75%)</div>
                      <span className="text-[11px] text-gray-500">0.75% of Gross (Applies if Gross ≤ ₹21,000/mo)</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={includeEsiEmployee}
                      onChange={e => setIncludeEsiEmployee(e.target.checked)}
                      className="accent-[#07563D] w-4 h-4 rounded"
                    />
                  </label>

                  <label className="p-3.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-between cursor-pointer">
                    <div>
                      <div className="font-bold text-gray-900">Professional Tax (PT TN Slab)</div>
                      <span className="text-[11px] text-gray-500">State statutory deduction slab</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={includePt}
                      onChange={e => setIncludePt(e.target.checked)}
                      className="accent-[#07563D] w-4 h-4 rounded"
                    />
                  </label>

                  <label className="p-3.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-between cursor-pointer">
                    <div>
                      <div className="font-bold text-gray-900">Labour Welfare Fund (LWF)</div>
                      <span className="text-[11px] text-gray-500">State labor board statutory welfare fund</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={includeLwf}
                      onChange={e => setIncludeLwf(e.target.checked)}
                      className="accent-[#07563D] w-4 h-4 rounded"
                    />
                  </label>
                </div>
              </div>

              {/* Employer Side Cost Section */}
              <div className="space-y-3 pt-2">
                <div className="font-black text-xs text-blue-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <span>Employer Contributions (Included in Total CTC Cost)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="p-3.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-between cursor-pointer">
                    <div>
                      <div className="font-bold text-gray-900">Employer EPF (12%)</div>
                      <span className="text-[11px] text-gray-500">3.67% EPF + 8.33% EPS + 1.0% EDLI/Admin</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={includePfEmployer}
                      onChange={e => setIncludePfEmployer(e.target.checked)}
                      className="accent-[#07563D] w-4 h-4 rounded"
                    />
                  </label>

                  <label className="p-3.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-between cursor-pointer">
                    <div>
                      <div className="font-bold text-gray-900">Employer ESIC (3.25%)</div>
                      <span className="text-[11px] text-gray-500">3.25% of Gross (If Gross ≤ ₹21,000)</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={includeEsiEmployer}
                      onChange={e => setIncludeEsiEmployer(e.target.checked)}
                      className="accent-[#07563D] w-4 h-4 rounded"
                    />
                  </label>

                  <label className="p-3.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-between cursor-pointer sm:col-span-2">
                    <div>
                      <div className="font-bold text-gray-900">Gratuity Provision (4.81%)</div>
                      <span className="text-[11px] text-gray-500">15/26 days per year statutory calculation basis</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={includeGratuity}
                      onChange={e => setIncludeGratuity(e.target.checked)}
                      className="accent-[#07563D] w-4 h-4 rounded"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: FORMULAS & BALANCING COMPONENT */}
          {/* ========================================================================= */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-black text-gray-900">Step 4: Visual Formula Configuration</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Fine-tune calculation ratios and percentages. Special Allowance will dynamically absorb residual CTC.
                </p>
              </div>

              <div className="space-y-4">
                {/* Basic Formula */}
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-gray-900">Basic Salary</div>
                    <span className="text-[11px] text-gray-500">
                      {payBasisType === 'daily_wage' ? 'Suggested: 70% of Daily Wage' : 'Suggested: 50% of Gross'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={basicPct}
                      onChange={e => setBasicPct(Number(e.target.value))}
                      className="w-20 px-2.5 py-1.5 bg-white border border-gray-300 rounded-xl text-right font-mono font-bold"
                    />
                    <span className="font-bold text-gray-700">
                      {payBasisType === 'daily_wage' ? '% of Daily Wage' : '% of Gross'}
                    </span>
                  </div>
                </div>

                {/* HRA Formula */}
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-gray-900">House Rent Allowance (HRA)</div>
                    <span className="text-[11px] text-gray-500">
                      {payBasisType === 'daily_wage' ? 'Suggested: 30% of Daily Wage' : 'Suggested: 40% (Non-Metro) or 50% (Metro) of Basic'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={hraPct}
                      onChange={e => setHraPct(Number(e.target.value))}
                      className="w-20 px-2.5 py-1.5 bg-white border border-gray-300 rounded-xl text-right font-mono font-bold"
                    />
                    <span className="font-bold text-gray-700">
                      {payBasisType === 'daily_wage' ? '% of Daily Wage' : '% of Basic'}
                    </span>
                  </div>
                </div>

                {/* Conveyance */}
                {includeConveyance && (
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-gray-900">Conveyance Allowance</div>
                      <span className="text-[11px] text-gray-500">Fixed monthly allowance</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">₹</span>
                      <input
                        type="number"
                        value={conveyanceMonthly}
                        onChange={e => setConveyanceMonthly(Number(e.target.value))}
                        className="w-24 px-2.5 py-1.5 bg-white border border-gray-300 rounded-xl text-right font-mono font-bold"
                      />
                      <span className="font-bold text-gray-500">/ month</span>
                    </div>
                  </div>
                )}

                {/* Food */}
                {includeFoodAllowance && (
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-gray-900">Food / Canteen Allowance</div>
                      <span className="text-[11px] text-gray-500">Monthly subsidy amount</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">₹</span>
                      <input
                        type="number"
                        value={foodAllowanceMonthly}
                        onChange={e => setFoodAllowanceMonthly(Number(e.target.value))}
                        className="w-24 px-2.5 py-1.5 bg-white border border-gray-300 rounded-xl text-right font-mono font-bold"
                      />
                      <span className="font-bold text-gray-500">/ month</span>
                    </div>
                  </div>
                )}

                {/* Attendance Bonus */}
                {includeAttendanceBonus && (
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-gray-900">Attendance Regularity Bonus</div>
                      <span className="text-[11px] text-gray-500">Monthly full-shift regularity payout</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">₹</span>
                      <input
                        type="number"
                        value={attendanceBonusMonthly}
                        onChange={e => setAttendanceBonusMonthly(Number(e.target.value))}
                        className="w-24 px-2.5 py-1.5 bg-white border border-gray-300 rounded-xl text-right font-mono font-bold"
                      />
                      <span className="font-bold text-gray-500">/ month</span>
                    </div>
                  </div>
                )}

                {/* Balancing Component Explainer */}
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-gray-900 text-xs">
                    <Scale className="w-4 h-4 text-[#07563D]" />
                    <span>Special Allowance (Balancing Residual Component)</span>
                    <Badge variant="emerald">Auto-Balanced</Badge>
                  </div>
                  <p className="text-[11px] text-gray-700 leading-relaxed font-mono">
                    ₹ {Math.round(calculations.specialAllowanceBalancing).toLocaleString('en-IN')} = Monthly Gross (₹ {Math.round(calculations.finalMonthlyGross).toLocaleString('en-IN')}) − Fixed Earnings (₹ {Math.round(calculations.basicMonthly + calculations.hraMonthly + calculations.convMonthly + calculations.foodMonthly + calculations.attnBonusMonthly + calculations.siteMonthly + calculations.uniformMonthly + calculations.customEarningsTotal).toLocaleString('en-IN')})
                  </p>
                  {compensationBasis === 'CTC_INCLUSIVE' && (
                    <p className="text-[10px] text-gray-500 font-mono">
                      * Monthly Gross ₹ {Math.round(calculations.finalMonthlyGross).toLocaleString('en-IN')} = Monthly CTC (₹ {Math.round(calculations.monthlyCtc).toLocaleString('en-IN')}) − Employer Statutory Cost (₹ {Math.round(calculations.totalEmployerCost).toLocaleString('en-IN')})
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 5: LIVE BREAKDOWN */}
          {/* ========================================================================= */}
          {currentStep === 5 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-black text-gray-900">Step 5: Live Salary Calculation Breakdown</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Complete transparent reconciliation from Annual CTC down to Gross Earnings and Net Take-Home Pay.
                </p>
              </div>

              {/* 1. Visual Flow Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-gray-100 border border-gray-200">
                  <span className="text-[10px] uppercase font-bold text-gray-500 block">1. Monthly CTC</span>
                  <span className="font-mono font-black text-xs text-gray-900 mt-0.5 block">
                    ₹{Math.round(calculations.monthlyCtc).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-[10px] uppercase font-bold text-amber-700 block">2. Employer Cost</span>
                  <span className="font-mono font-black text-xs text-amber-900 mt-0.5 block">
                    -₹{Math.round(calculations.totalEmployerCost).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
                  <span className="text-[10px] uppercase font-bold text-blue-700 block">3. Monthly Gross</span>
                  <span className="font-mono font-black text-xs text-blue-900 mt-0.5 block">
                    = ₹{Math.round(calculations.finalMonthlyGross).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                  <span className="text-[10px] uppercase font-bold text-rose-700 block">4. Deductions</span>
                  <span className="font-mono font-black text-xs text-rose-900 mt-0.5 block">
                    -₹{Math.round(calculations.totalEmployeeDeductions).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 col-span-2 sm:col-span-1">
                  <span className="text-[10px] uppercase font-bold text-[#07563D] block">5. Net Take-Home</span>
                  <span className="font-mono font-black text-xs text-[#07563D] mt-0.5 block">
                    = ₹{Math.round(calculations.netTakeHomeMonthly).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* 2. Detailed Breakdown Cards */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-200 text-xs">
                {/* CTC Header */}
                <div className="p-3.5 bg-gray-50 flex justify-between items-center font-bold">
                  <span className="text-gray-700">ANNUAL COST TO COMPANY (CTC):</span>
                  <span className="text-sm font-black text-gray-900 font-mono">
                    ₹ {Math.round(calculations.annualCtc).toLocaleString('en-IN')} / year
                    <span className="text-xs font-medium text-gray-500 ml-2">(₹ {Math.round(calculations.monthlyCtc).toLocaleString('en-IN')} / mo)</span>
                  </span>
                </div>

                {/* Section A: Employer Statutory Contributions */}
                <div className="p-4 bg-amber-50/30 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-amber-900 uppercase tracking-wider block font-mono text-[10px]">
                      A. Employer Statutory Contributions (Deducted from CTC Pool)
                    </span>
                    <span className="text-[10px] font-mono text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full font-bold">
                      Cost to Company Side
                    </span>
                  </div>
                  <div className="space-y-1.5 pl-2">
                    {calculations.erPfMonthly > 0 && (
                      <div className="flex justify-between text-gray-700">
                        <span>Employer Provident Fund (EPF 12%):</span>
                        <span className="font-mono font-bold text-amber-900">₹ {Math.round(calculations.erPfMonthly).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {calculations.erEsiMonthly > 0 && (
                      <div className="flex justify-between text-gray-700">
                        <span>Employer ESIC Contribution (3.25%):</span>
                        <span className="font-mono font-bold text-amber-900">₹ {Math.round(calculations.erEsiMonthly).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {calculations.gratuityMonthly > 0 && (
                      <div className="flex justify-between text-gray-700">
                        <span>Gratuity Provision (4.81% of Basic):</span>
                        <span className="font-mono font-bold text-amber-900">₹ {Math.round(calculations.gratuityMonthly).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-amber-200/60 pt-1.5 font-black text-amber-950">
                      <span>Total Employer Contributions:</span>
                      <span className="font-mono">₹ {Math.round(calculations.totalEmployerCost).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Section B: Employee Monthly Gross Earnings */}
                <div className="p-4 bg-white space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-800 uppercase tracking-wider block font-mono text-[10px]">
                      B. Employee Monthly Gross Earnings Breakdown
                    </span>
                    <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-bold">
                      CTC (₹{Math.round(calculations.monthlyCtc).toLocaleString('en-IN')}) − Employer Cost (₹{Math.round(calculations.totalEmployerCost).toLocaleString('en-IN')})
                    </span>
                  </div>
                  <div className="space-y-1.5 pl-2">
                    <div className="flex justify-between">
                      <span>Basic Wages:</span>
                      <span className="font-mono font-bold text-gray-900">₹ {Math.round(calculations.basicMonthly).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>House Rent Allowance (HRA):</span>
                      <span className="font-mono font-bold text-gray-900">₹ {Math.round(calculations.hraMonthly).toLocaleString('en-IN')}</span>
                    </div>
                    {calculations.convMonthly > 0 && (
                      <div className="flex justify-between">
                        <span>Conveyance Allowance:</span>
                        <span className="font-mono font-bold text-gray-900">₹ {Math.round(calculations.convMonthly).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {calculations.foodMonthly > 0 && (
                      <div className="flex justify-between">
                        <span>Food / Canteen Allowance:</span>
                        <span className="font-mono font-bold text-gray-900">₹ {Math.round(calculations.foodMonthly).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {calculations.attnBonusMonthly > 0 && (
                      <div className="flex justify-between">
                        <span>Attendance Regularity Bonus:</span>
                        <span className="font-mono font-bold text-gray-900">₹ {Math.round(calculations.attnBonusMonthly).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {calculations.siteMonthly > 0 && (
                      <div className="flex justify-between">
                        <span>Site / Hardship Allowance:</span>
                        <span className="font-mono font-bold text-gray-900">₹ {Math.round(calculations.siteMonthly).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {calculations.uniformMonthly > 0 && (
                      <div className="flex justify-between">
                        <span>Uniform Allowance:</span>
                        <span className="font-mono font-bold text-gray-900">₹ {Math.round(calculations.uniformMonthly).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {calculations.customEarningsTotal > 0 && (
                      <div className="flex justify-between text-purple-900 font-medium">
                        <span>Custom Configured Earnings ({customComponents.filter(c => c.type === 'Earning').length}):</span>
                        <span className="font-mono font-bold">₹ {Math.round(calculations.customEarningsTotal).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[#07563D] font-semibold">
                      <span>Special Allowance (Residual Balance):</span>
                      <span className="font-mono font-bold">₹ {Math.round(calculations.specialAllowanceBalancing).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-100 pt-1.5 font-black text-gray-900 text-sm">
                      <span>Total Employee Monthly Gross:</span>
                      <span className="font-mono text-blue-800">₹ {Math.round(calculations.finalMonthlyGross).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Section C: Employee-Side Statutory Deductions */}
                <div className="p-4 bg-rose-50/30 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-rose-900 uppercase tracking-wider block font-mono text-[10px]">
                      C. Employee-Side Deductions & Withholdings
                    </span>
                    <span className="text-[10px] font-mono text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full font-bold">
                      Employee Pay Deductions
                    </span>
                  </div>
                  <div className="space-y-1.5 pl-2">
                    {calculations.eePfMonthly > 0 && (
                      <div className="flex justify-between text-gray-700">
                        <span>Provident Fund (EPF 12% of Basic):</span>
                        <span className="font-mono font-bold text-rose-700">-₹ {Math.round(calculations.eePfMonthly).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {calculations.eeEsiMonthly > 0 && (
                      <div className="flex justify-between text-gray-700">
                        <span>Employee ESIC (0.75% of Gross):</span>
                        <span className="font-mono font-bold text-rose-700">-₹ {Math.round(calculations.eeEsiMonthly).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {calculations.ptMonthly > 0 && (
                      <div className="flex justify-between text-gray-700">
                        <span>Professional Tax (Tamil Nadu Slab):</span>
                        <span className="font-mono font-bold text-rose-700">-₹ {Math.round(calculations.ptMonthly).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {calculations.lwfMonthly > 0 && (
                      <div className="flex justify-between text-gray-700">
                        <span>Labour Welfare Fund (LWF):</span>
                        <span className="font-mono font-bold text-rose-700">-₹ {Math.round(calculations.lwfMonthly).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {calculations.customDeductionsTotal > 0 && (
                      <div className="flex justify-between text-rose-800 font-medium">
                        <span>Custom Configured Deductions ({customComponents.filter(c => c.type === 'Deduction').length}):</span>
                        <span className="font-mono font-bold text-rose-700">-₹ {Math.round(calculations.customDeductionsTotal).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-rose-200/60 pt-1.5 font-black text-rose-900">
                      <span>Total Employee Deductions:</span>
                      <span className="font-mono text-rose-700">-₹ {Math.round(calculations.totalEmployeeDeductions).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Section D: Net Take-Home Pay Result */}
                <div className="p-4 bg-emerald-50 flex flex-col sm:flex-row justify-between sm:items-center gap-2 font-black text-sm">
                  <div>
                    <span className="text-[#07563D] uppercase tracking-wide block text-xs font-black">
                      Estimated Net Monthly Take-Home:
                    </span>
                    <span className="text-[10px] text-emerald-700 font-normal font-mono">
                      Gross (₹{Math.round(calculations.finalMonthlyGross).toLocaleString('en-IN')}) − Deductions (₹{Math.round(calculations.totalEmployeeDeductions).toLocaleString('en-IN')})
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[#07563D] font-mono text-lg font-black block">
                      ₹ {Math.round(calculations.netTakeHomeMonthly).toLocaleString('en-IN')} <span className="text-xs font-normal text-emerald-800">/ mo</span>
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono font-normal">
                      Annual: ₹ {Math.round(calculations.netTakeHomeMonthly * 12).toLocaleString('en-IN')} / yr
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 6: WHO GETS THIS? */}
          {/* ========================================================================= */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-black text-gray-900">Step 6: Employee Applicability</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Specify the target payroll group, department, or grade assigned to this structure.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Target Payroll Group</label>
                  <select
                    value={assignedPayrollGroup}
                    onChange={e => setAssignedPayrollGroup(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-gray-900"
                  >
                    {payrollGroupsWithCount.length > 0 ? (
                      payrollGroupsWithCount.map(pg => (
                        <option key={pg.id} value={pg.name}>
                          {pg.name} ({pg.count} Staff)
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Monthly Main Payroll (All Corporate & Operations Staff)">
                          Monthly Main Payroll (All Corporate & Operations Staff)
                        </option>
                        <option value="Executive & Management Payroll">
                          Executive & Management Payroll
                        </option>
                        <option value="Weekly / Bi-Weekly Field Staff">
                          Weekly / Bi-Weekly Field Staff
                        </option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Applicable Department</label>
                  <select
                    value={assignedDepartment}
                    onChange={e => setAssignedDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-medium text-gray-900"
                  >
                    <option value="All Departments">All Departments (Organization-Wide)</option>
                    {departmentsList.map(d => (
                      <option key={d.id} value={d.name}>
                        {d.name} {d.code ? `(${d.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-blue-50 text-blue-900 text-[11px] font-medium leading-relaxed">
                  ⓘ <strong>Priority Rule:</strong> Existing employee assignments will be updated for future cycles. Historical finalized payslips remain locked and unchanged.
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 7: REVIEW & PUBLISH */}
          {/* ========================================================================= */}
          {currentStep === 7 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-black text-gray-900">Step 7: Final Review & Publish</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Please review the structure summary before publishing to active payroll operations.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-4">
                <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">{structureName}</h4>
                    <span className="text-[11px] text-gray-500 font-mono">{structureCode} • Effective from {effectiveFrom}</span>
                  </div>
                  <Badge variant="emerald">Validation Passed ✓</Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-gray-200">
                    <span className="text-gray-400 font-bold block text-[10px]">ANNUAL CTC</span>
                    <span className="font-black text-gray-900 font-mono">₹ {Math.round(calculations.annualCtc).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-gray-200">
                    <span className="text-gray-400 font-bold block text-[10px]">MONTHLY GROSS</span>
                    <span className="font-black text-gray-900 font-mono">₹ {Math.round(calculations.finalMonthlyGross).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-gray-200">
                    <span className="text-gray-400 font-bold block text-[10px]">ESTIMATED NET PAY</span>
                    <span className="font-black text-[#07563D] font-mono">₹ {Math.round(calculations.netTakeHomeMonthly).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-gray-200">
                    <span className="text-gray-400 font-bold block text-[10px]">TARGET WORKFORCE</span>
                    <span className="font-bold text-gray-900">{assignedPayrollGroup}</span>
                  </div>
                </div>

                {payBasisType === 'daily_wage' && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                    <span className="font-bold text-[#07563D]">Daily Wage Structure Anchor:</span>
                    <span className="font-mono font-black text-gray-900">
                      ₹ {dailyWageInput.toLocaleString('en-IN')} / day ({workingDaysPerMonth} days base)
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Action Strip */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
          <Button
            size="sm"
            variant="outline"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep(prev => (prev > 1 ? ((prev - 1) as any) : prev))}
            className="text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>

          <div className="flex items-center gap-2">
            {currentStep < 7 ? (
              <Button
                size="sm"
                variant="primary"
                onClick={() => setCurrentStep(prev => ((prev + 1) as any))}
                className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="primary"
                onClick={handlePublish}
                disabled={isSaving}
                className="bg-[#07563D] hover:bg-[#064e37] text-white font-black text-xs shadow-md disabled:opacity-50"
              >
                {isSaving ? (
                  <span>Saving to Database...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1" /> Publish Structure
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
