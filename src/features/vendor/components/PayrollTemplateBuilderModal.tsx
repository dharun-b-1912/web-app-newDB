// src/features/vendor/components/PayrollTemplateBuilderModal.tsx
// ============================================================================
// Joy PeopleHR — Company-Format Configurable Payroll Template Builder
// Spec Section 8 & 19: Allows vendors/companies to configure their Excel presentation,
// add custom earning & deduction components, set calculation functions/percentages,
// and preview 2-tier headers with live calculated sample worker rows.
// Features separated tabs for Statutory, Asset & PPE, Canteen/Meals, and Advances.
// ============================================================================

import React, { useState, useMemo, useEffect } from 'react';
import {
  FileSpreadsheet,
  Check,
  MoveUp,
  MoveDown,
  Eye,
  Sliders,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Plus,
  Trash2,
  Calculator,
  Percent,
  Coins,
  Clock,
  HelpCircle,
  X,
  ChevronRight,
  Filter,
  Moon,
  Utensils,
  Shield,
  Shirt,
  Footprints,
  HeartHandshake,
  UserCheck,
  DollarSign,
  Database,
  Loader2,
  Server,
  Scale
} from 'lucide-react';
import {
  JOY_MANPOWER_SALARY_STATEMENT_TEMPLATE,
  PayrollTemplateService
} from '../../../services/vendor/payrollTemplateService';
import { VendorPayrollTemplateDbService } from '../../../services/vendor/vendorPayrollTemplateDbService';
import {
  PayrollTemplate,
  TemplateColumnDefinition,
  TemplateSection,
  CalculationMethodType,
  TemplateSectionCategory
} from '../../../types/payrollTemplate';
import { AttendanceOTPolicyModal } from '../AttendanceOTPolicyModal';
import { OTPolicyEngine } from '../../../services/payroll/otPolicyEngine';
import { OTPolicyRecord } from '../../../types/otPolicy';
import { AttendanceMasterService } from '../../../services/vendor/attendanceMasterService';

interface PayrollTemplateBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateUpdated?: (template: PayrollTemplate) => void;
  companyId?: string;
  companyName?: string;
  vendorId?: string;
  vendorName?: string;
}

const CALCULATION_METHOD_LABELS: Record<CalculationMethodType, { label: string; desc: string; icon: string }> = {
  PERCENTAGE_OF_BASE: {
    label: '% of Base Wage (Daily × Days)',
    desc: 'Calculated as % of (Daily Wage × Pay Days)',
    icon: '%'
  },
  PERCENTAGE_OF_BASIC: {
    label: '% of Basic Wage',
    desc: 'Calculated as % of employee basic wage (e.g. PF 12%)',
    icon: '%'
  },
  PERCENTAGE_OF_GROSS: {
    label: '% of Gross Wage (ESI)',
    desc: 'Calculated as % of employee gross earnings (e.g. ESI 0.75%)',
    icon: '%'
  },
  STATUTORY_2X_BASIC: {
    label: 'Statutory 2× Basic Rate',
    desc: 'Statutory standard: 2 × (Daily × Basic% / 8) = ₹83.19/hr (Factories Act Sec 59)',
    icon: '⚖️'
  },
  HOURLY_OT_RATE: {
    label: 'Fixed OT Rate / Hour (₹)',
    desc: 'Multiplied by approved overtime hours (e.g. ₹70/hr contractual rate card)',
    icon: '₹/h'
  },
  COMPANY_OT_POLICY: {
    label: 'Company Norm (1.50× Multiplier)',
    desc: 'Company Overtime Policy Engine (Monthly Basis / 26 / 8 × 1.5) = ₹122.68/hr',
    icon: '⚡'
  },
  DOUBLE_ORDINARY_RATE: {
    label: '2.00× Double Ordinary Rate',
    desc: 'Double rate on daily wage: 2 × (Daily / 8) = ₹151.25/hr',
    icon: '2×'
  },
  FIXED_PER_MONTH: {
    label: 'Fixed Monthly Amount (₹)',
    desc: 'Flat monthly fixed allowance or deduction regardless of days',
    icon: '₹'
  },
  FIXED_PER_DAY: {
    label: 'Fixed Rate / Working Day (₹)',
    desc: 'Multiplied by actual present/working days (e.g. Food Allowance ₹50/day)',
    icon: '₹/d'
  },
  PER_SHIFT_COUNT: {
    label: 'Night Shift Rate (₹ / Shift)',
    desc: 'Multiplied by approved night shifts worked (e.g. 4 shifts × ₹150)',
    icon: '🌙'
  },
  ATTENDANCE_DRIVEN: {
    label: 'Attendance Milestone Bonus',
    desc: 'Awarded when monthly present days reach threshold (e.g. >= 26 days)',
    icon: '★'
  },
  MANUAL_ENTRY: {
    label: 'Manual / Variable Input',
    desc: 'Imported from attendance master or entered manually',
    icon: '✎'
  },
  COMPUTED_SUM: {
    label: 'Computed Aggregate Sum',
    desc: 'Sum of components (e.g. Wages = Basic + HRA, Gross = Total Earnings)',
    icon: '∑'
  }
};

export function PayrollTemplateBuilderModal({
  isOpen,
  onClose,
  onTemplateUpdated,
  companyId = 'comp-01',
  companyName = 'Joy Corporate Solutions Pvt Ltd',
  vendorId = 'VND-JOY-01',
  vendorName = 'Joy Manpower Services',
}: PayrollTemplateBuilderModalProps) {
  const [template, setTemplate] = useState<PayrollTemplate>(() => {
    // Populate default calculation methods on initialization
    const cloned = JSON.parse(JSON.stringify(JOY_MANPOWER_SALARY_STATEMENT_TEMPLATE)) as PayrollTemplate;
    cloned.companyId = companyId;
    cloned.vendorId = vendorId;
    cloned.sections.forEach((sec) => {
      sec.columns.forEach((col) => {
        if (!col.calculationMethod) {
          if (col.fieldKey === 'basic_55') {
            col.calculationMethod = 'PERCENTAGE_OF_BASE';
            col.calculationValue = 55;
          } else if (col.fieldKey === 'hra_45') {
            col.calculationMethod = 'PERCENTAGE_OF_BASE';
            col.calculationValue = 45;
          } else if (col.fieldKey === 'food_allowance') {
            col.calculationMethod = 'FIXED_PER_DAY';
            col.calculationValue = 50;
          } else if (col.fieldKey === 'night_allowance') {
            col.calculationMethod = 'PER_SHIFT_COUNT';
            col.calculationValue = 150;
          } else if (col.fieldKey === 'pf_employee') {
            col.calculationMethod = 'PERCENTAGE_OF_BASIC';
            col.calculationValue = 12;
          } else if (col.fieldKey === 'esi_employee') {
            col.calculationMethod = 'PERCENTAGE_OF_GROSS';
            col.calculationValue = 0.75;
          } else if (col.fieldKey === 'canteen') {
            col.calculationMethod = 'FIXED_PER_MONTH';
            col.calculationValue = 1693.5;
          } else if (col.fieldKey === 'advance') {
            col.calculationMethod = 'FIXED_PER_MONTH';
            col.calculationValue = 500;
          } else if (col.fieldKey === 'wages' || col.fieldKey === 'gross_earnings' || col.fieldKey === 'total_deductions') {
            col.calculationMethod = 'COMPUTED_SUM';
          } else {
            col.calculationMethod = col.isCalculated ? 'PERCENTAGE_OF_BASE' : 'MANUAL_ENTRY';
          }
        }
        if (col.isEnabled === undefined) {
          if (col.fieldKey === 'pt' || col.fieldKey === 'lwf') {
            col.isEnabled = false;
          } else {
            col.isEnabled = true;
          }
        }
      });
    });
    return cloned;
  });

  const [activeSectionId, setActiveSectionId] = useState<string>('SEC_EARN');
  const [previewFilter, setPreviewFilter] = useState<'ALL' | 'EARNINGS' | 'STATUTORY' | 'ASSETS' | 'MEALS' | 'ADVANCES' | 'ATTENDANCE' | 'EMPLOYEE'>('ALL');
  const [saveToast, setSaveToast] = useState(false);
  const [isAddingComponent, setIsAddingComponent] = useState(false);
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [isSavingDb, setIsSavingDb] = useState(false);
  const [dbStatusMsg, setDbStatusMsg] = useState<string>('Connected to PostgreSQL Multi-Tenant DB');

  // Load authoritative company/vendor configuration directly from PostgreSQL
  useEffect(() => {
    if (!isOpen) return;
    let isCurrent = true;
    setIsLoadingDb(true);
    VendorPayrollTemplateDbService.fetchTemplate({ companyId, vendorId })
      .then((loaded) => {
        if (isCurrent && loaded && loaded.sections && loaded.sections.length > 0) {
          setTemplate(loaded);
          setDbStatusMsg(`Loaded from PostgreSQL (Company: ${companyName}, Vendor: ${vendorId})`);
        }
      })
      .catch((err) => {
        console.warn('[PayrollTemplateBuilderModal] PostgreSQL fetch notice:', err);
      })
      .finally(() => {
        if (isCurrent) setIsLoadingDb(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [isOpen, companyId, vendorId, companyName]);

  // Overtime Policy Configuration & Engine Sync State
  const [isOtPolicyModalOpen, setIsOtPolicyModalOpen] = useState(false);
  const [otConfigTargetColIdx, setOtConfigTargetColIdx] = useState<number | null>(null);
  const [activeOtPolicy, setActiveOtPolicy] = useState<Partial<OTPolicyRecord>>(() => {
    return OTPolicyEngine.getActivePolicy() || OTPolicyEngine.resolvePolicyForDate({ policyId: 'pol-std-1.5x' }) || {};
  });
  const [activeOtWageBasis, setActiveOtWageBasis] = useState<number>(17000);

  const handleApplyOtPolicyFromModal = (policy: OTPolicyRecord, wageBasis: number) => {
    setActiveOtPolicy(policy);
    setActiveOtWageBasis(wageBasis);
    setIsOtPolicyModalOpen(false);

    if (otConfigTargetColIdx !== null) {
      const updated = JSON.parse(JSON.stringify(template)) as PayrollTemplate;
      const sec = updated.sections.find((s) => s.id === activeSectionId);
      if (sec && sec.columns[otConfigTargetColIdx]) {
        const targetCol = sec.columns[otConfigTargetColIdx];
        if (policy.calculation_method === 'STRICT_GOVERNMENT_NORM' || (policy.calculation_method as string) === 'STRICT_DOUBLE_RATE') {
          targetCol.calculationMethod = 'STATUTORY_2X_BASIC';
          targetCol.calculationValue = 83.19;
        } else if (policy.calculation_method === 'FIXED_HOURLY_RATE') {
          targetCol.calculationMethod = 'HOURLY_OT_RATE';
          targetCol.calculationValue = policy.fixed_hourly_rate || 70;
        } else {
          targetCol.calculationMethod = 'COMPANY_OT_POLICY';
          const rate = (wageBasis / (policy.working_days_divisor || 26) / (policy.working_hours_per_day || 8)) * (policy.company_multiplier || 1.5);
          targetCol.calculationValue = Math.round(rate * 100) / 100;
        }
      }
      setTemplate(updated);
    }

    try {
      OTPolicyEngine.setActivePolicyId(policy.id);
      const master = AttendanceMasterService.getActiveMaster();
      if (master) {
        const updatedMaster = AttendanceMasterService.applyOtPolicyToMaster(master, policy, wageBasis);
        AttendanceMasterService.setActiveMaster(updatedMaster);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('joy_ot_policy_changed', { detail: { policy, wageBasis } }));
        window.dispatchEvent(new CustomEvent('joy_master_dataset_updated', { detail: master }));
      }
    } catch (e) {
      console.warn('Failed to sync OT policy with master:', e);
    }
  };

  // New Component Creation Form State
  const [newCompLabel, setNewCompLabel] = useState('');
  const [newCompMethod, setNewCompMethod] = useState<CalculationMethodType>('PERCENTAGE_OF_BASE');
  const [newCompValue, setNewCompValue] = useState<number>(10);
  const [newCompFormat, setNewCompFormat] = useState<'INR' | 'NUMBER' | 'PERCENT'>('INR');
  const [newCompRequired, setNewCompRequired] = useState(false);

  const currentSection = template.sections.find((s) => s.id === activeSectionId) || template.sections[0];

  const handleToggleColumnEnabled = (colIdx: number) => {
    const updated = JSON.parse(JSON.stringify(template)) as PayrollTemplate;
    const sec = updated.sections.find((s) => s.id === activeSectionId);
    if (!sec || !sec.columns[colIdx]) return;
    const current = sec.columns[colIdx].isEnabled !== false;
    sec.columns[colIdx].isEnabled = !current;
    setTemplate(updated);
  };

  const handleHeaderNameChange = (colIdx: number, newName: string) => {
    const updated = JSON.parse(JSON.stringify(template)) as PayrollTemplate;
    const sec = updated.sections.find((s) => s.id === activeSectionId);
    if (!sec) return;
    sec.columns[colIdx].headerLabel = newName;
    setTemplate(updated);
  };

  const handleCalculationValueChange = (colIdx: number, val: number) => {
    const updated = JSON.parse(JSON.stringify(template)) as PayrollTemplate;
    const sec = updated.sections.find((s) => s.id === activeSectionId);
    if (!sec) return;
    sec.columns[colIdx].calculationValue = val;

    // Auto-update header percentage label if following pattern (e.g. "BASIC 55%" -> "BASIC 50%")
    const currentLabel = sec.columns[colIdx].headerLabel;
    if (sec.columns[colIdx].calculationMethod === 'PERCENTAGE_OF_BASE' && /\d+%/.test(currentLabel)) {
      sec.columns[colIdx].headerLabel = currentLabel.replace(/\d+%/, `${val}%`);
    }

    setTemplate(updated);
  };

  const handleCalculationMethodChange = (colIdx: number, method: CalculationMethodType) => {
    const updated = JSON.parse(JSON.stringify(template)) as PayrollTemplate;
    const sec = updated.sections.find((s) => s.id === activeSectionId);
    if (!sec) return;
    sec.columns[colIdx].calculationMethod = method;
    setTemplate(updated);
  };

  const handleMoveColumn = (colIdx: number, direction: 'UP' | 'DOWN') => {
    const updated = JSON.parse(JSON.stringify(template)) as PayrollTemplate;
    const sec = updated.sections.find((s) => s.id === activeSectionId);
    if (!sec) return;
    const targetIdx = direction === 'UP' ? colIdx - 1 : colIdx + 1;
    if (targetIdx < 0 || targetIdx >= sec.columns.length) return;
    const temp = sec.columns[colIdx];
    sec.columns[colIdx] = sec.columns[targetIdx];
    sec.columns[targetIdx] = temp;
    setTemplate(updated);
  };

  const handleDeleteColumn = (colIdx: number) => {
    const updated = JSON.parse(JSON.stringify(template)) as PayrollTemplate;
    const sec = updated.sections.find((s) => s.id === activeSectionId);
    if (!sec) return;
    sec.columns.splice(colIdx, 1);
    setTemplate(updated);
  };

  const handleAddNewComponent = () => {
    if (!newCompLabel.trim()) return;

    const updated = JSON.parse(JSON.stringify(template)) as PayrollTemplate;
    const sec = updated.sections.find((s) => s.id === activeSectionId);
    if (!sec) return;

    const slug = newCompLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const newCol: TemplateColumnDefinition = {
      fieldKey: `custom_${slug}_${Date.now()}`,
      headerLabel: newCompLabel.trim(),
      category: sec.category,
      width: 13,
      format: newCompFormat,
      isCalculated: newCompMethod !== 'MANUAL_ENTRY',
      required: newCompRequired,
      align: newCompFormat === 'INR' || newCompFormat === 'NUMBER' ? 'right' : 'center',
      calculationMethod: newCompMethod,
      calculationValue: newCompValue,
      isCustom: true,
      description: `Custom ${sec.title} component`,
    };

    sec.columns.push(newCol);
    setTemplate(updated);
    setIsAddingComponent(false);
    setNewCompLabel('');
    setNewCompValue(10);
  };

  const handleSave = async () => {
    setIsSavingDb(true);
    try {
      const result = await VendorPayrollTemplateDbService.saveTemplate(template, { companyId, vendorId });
      PayrollTemplateService.updateTemplateInMemory(result.template);
      if (onTemplateUpdated) onTemplateUpdated(result.template);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('joy_payroll_template_changed', { detail: result.template }));
        window.dispatchEvent(new CustomEvent('joy_master_dataset_updated', { detail: null }));
      }
      setSaveToast(true);
      setDbStatusMsg(`Saved to PostgreSQL Database (${companyName})`);
      setTimeout(() => {
        setSaveToast(false);
        onClose();
      }, 850);
    } catch (err: any) {
      console.error('[PayrollTemplateBuilderModal] Save to DB failed:', err);
      alert('Failed to save to PostgreSQL database: ' + (err?.message || 'Network error'));
    } finally {
      setIsSavingDb(false);
    }
  };

  const handleReset = async () => {
    setIsLoadingDb(true);
    try {
      const reset = await VendorPayrollTemplateDbService.resetTemplate({ companyId, vendorId });
      setTemplate(reset);
      PayrollTemplateService.updateTemplateInMemory(reset);
      if (onTemplateUpdated) onTemplateUpdated(reset);
      setDbStatusMsg(`Reset to company default in PostgreSQL`);
    } catch (err) {
      console.error('[PayrollTemplateBuilderModal] Reset failed:', err);
    } finally {
      setIsLoadingDb(false);
    }
  };


  // ── LIVE SAMPLE ROW CALCULATOR (SAKTHI S · 25 PAY DAYS · ₹605/DAY RATE) ───
  const sampleWorker = useMemo(() => {
    const dailyWage = 605;
    const payDays = 25;
    const baseWages = dailyWage * payDays; // ₹15,125.00
    const otHours = 92;
    const nightShifts = 4; // 4 approved night shifts

    // Read configured Basic % and HRA %
    const earnSec = template.sections.find((s) => s.category === 'EARNINGS');
    const deductionSections = template.sections.filter((s) => s.category === 'DEDUCTIONS');

    // Dynamic Overtime Rate Calculation
    // Ordinary 1x Gross Rate: 605 / 8 = 75.625/hr -> 92h = ₹6,958 (Causes ₹10,176 discrepancy across workforce)
    // Statutory 2x Basic Rate: (605 * 55% / 8) * 2 = 83.1875/hr -> 92h = ₹7,653 (Reconciles exactly to D WAGES ₹1,11,973)
    // Company Norm (1.5x Multiplier): (17000 / 26 / 8) * 1.5 = 122.68/hr
    let effectiveOtRate = dailyWage / 8; // default 1x gross rate: 75.625
    const otCol = earnSec?.columns.find(
      (c) =>
        (c.fieldKey === 'ot_amount' || c.fieldKey === 'ot_stipend' || /\b(OT|OVERTIME)\b/i.test(c.headerLabel)) &&
        c.fieldKey !== 'other_earnings' &&
        !c.headerLabel.toLowerCase().includes('other')
    );

    if (otCol) {
      if (otCol.calculationMethod === 'STATUTORY_2X_BASIC') {
        const basicPct = 0.55;
        effectiveOtRate = ((dailyWage * basicPct) / 8) * 2; // 83.1875/hr
      } else if (otCol.calculationMethod === 'HOURLY_OT_RATE') {
        effectiveOtRate = otCol.calculationValue ?? 70;
      } else if (otCol.calculationMethod === 'COMPANY_OT_POLICY') {
        const divisor = activeOtPolicy.working_days_divisor || 26;
        const shiftHrs = activeOtPolicy.working_hours_per_day || 8;
        const multiplier = activeOtPolicy.company_multiplier || 1.5;
        effectiveOtRate = (activeOtWageBasis / divisor / shiftHrs) * multiplier;
      } else if (otCol.calculationMethod === 'DOUBLE_ORDINARY_RATE') {
        effectiveOtRate = (dailyWage / 8) * 2;
      } else if (otCol.calculationValue && otCol.calculationValue > 0) {
        effectiveOtRate = otCol.calculationValue;
      }
    }
    const otAmount = Math.round(otHours * effectiveOtRate);

    let basicAmount = 0;
    let hraAmount = 0;
    let otherEarningsSum = 0;

    const calculatedValues: Record<string, number> = {};

    earnSec?.columns.forEach((col) => {
      if (col.isEnabled === false) {
        calculatedValues[col.fieldKey] = 0;
        return;
      }

      if (col.fieldKey === 'basic_55' || col.headerLabel.toUpperCase().includes('BASIC')) {
        const pct = (col.calculationValue ?? 55) / 100;
        basicAmount = Math.round(baseWages * pct * 100) / 100;
        calculatedValues[col.fieldKey] = basicAmount;
      } else if (col.fieldKey === 'hra_45' || col.headerLabel.toUpperCase().includes('HRA')) {
        const pct = (col.calculationValue ?? 45) / 100;
        hraAmount = Math.round(baseWages * pct * 100) / 100;
        calculatedValues[col.fieldKey] = hraAmount;
      } else if (col.fieldKey === 'wages') {
        calculatedValues[col.fieldKey] = basicAmount + hraAmount;
      } else if (col.fieldKey === 'ot_amount' || col.fieldKey === 'ot_stipend') {
        calculatedValues[col.fieldKey] = otAmount;
      } else if (col.fieldKey === 'food_allowance' || col.headerLabel.toUpperCase().includes('FOOD') || col.headerLabel.toUpperCase().includes('F.ALLOW')) {
        // Dedicated Food Allowance calculation
        let foodVal = 0;
        if (col.calculationMethod === 'FIXED_PER_DAY') {
          foodVal = Math.round((col.calculationValue ?? 50) * payDays);
        } else if (col.calculationMethod === 'FIXED_PER_MONTH') {
          foodVal = col.calculationValue ?? 1250;
        } else if (col.calculationMethod === 'PERCENTAGE_OF_BASE') {
          foodVal = Math.round(baseWages * ((col.calculationValue ?? 5) / 100));
        } else {
          foodVal = col.calculationValue ?? 1250;
        }
        calculatedValues[col.fieldKey] = foodVal;
        otherEarningsSum += foodVal;
      } else if (col.fieldKey === 'night_allowance' || col.headerLabel.toUpperCase().includes('NIGHT') || col.headerLabel.toUpperCase().includes('N.ALLOW')) {
        // Dedicated Night Allowance calculation
        let nightVal = 0;
        if (col.calculationMethod === 'PER_SHIFT_COUNT') {
          nightVal = Math.round((col.calculationValue ?? 150) * nightShifts);
        } else if (col.calculationMethod === 'FIXED_PER_DAY') {
          nightVal = Math.round((col.calculationValue ?? 100) * payDays);
        } else if (col.calculationMethod === 'FIXED_PER_MONTH') {
          nightVal = col.calculationValue ?? 600;
        } else {
          nightVal = col.calculationValue ?? 600;
        }
        calculatedValues[col.fieldKey] = nightVal;
        otherEarningsSum += nightVal;
      } else if (col.fieldKey === 'attendance_bonus' || col.headerLabel.toUpperCase().includes('BONUS')) {
        const bonusVal = col.calculationValue ?? 500;
        calculatedValues[col.fieldKey] = bonusVal;
        otherEarningsSum += bonusVal;
      } else if (col.fieldKey === 'gross_earnings') {
        // Handled after summing
      } else {
        // Custom or other allowances
        let val = 0;
        if (col.calculationMethod === 'PERCENTAGE_OF_BASE') {
          val = Math.round(baseWages * ((col.calculationValue || 0) / 100));
        } else if (col.calculationMethod === 'PERCENTAGE_OF_BASIC') {
          val = Math.round(basicAmount * ((col.calculationValue || 0) / 100));
        } else if (col.calculationMethod === 'FIXED_PER_MONTH') {
          val = col.calculationValue || 0;
        } else if (col.calculationMethod === 'FIXED_PER_DAY') {
          val = Math.round((col.calculationValue || 0) * payDays);
        } else if (col.calculationMethod === 'PER_SHIFT_COUNT') {
          val = Math.round((col.calculationValue || 0) * nightShifts);
        } else {
          val = col.calculationValue || 0;
        }
        calculatedValues[col.fieldKey] = val;
        otherEarningsSum += val;
      }
    });

    const totalWages = basicAmount + hraAmount;
    const grossEarnings = totalWages + otAmount + otherEarningsSum;
    calculatedValues['gross_earnings'] = grossEarnings;

    // Deductions calculations across all deduction categories
    let totalDeductions = 0;

    deductionSections.forEach((sec) => {
      sec.columns.forEach((col) => {
        if (col.fieldKey === 'total_deductions') {
          // Handled after summing
          return;
        }

        if (col.isEnabled === false) {
          calculatedValues[col.fieldKey] = 0;
          return;
        }

        let val = 0;
        if (col.fieldKey === 'pf_employee' || col.headerLabel.toUpperCase().includes('PF')) {
          const pfPct = (col.calculationValue ?? 12) / 100;
          val = Math.round(Math.min(basicAmount, 15000) * pfPct);
        } else if (col.fieldKey === 'esi_employee' || col.headerLabel.toUpperCase().includes('ESI')) {
          const esiPct = (col.calculationValue ?? 0.75) / 100;
          val = grossEarnings <= 21000 ? Math.round(grossEarnings * esiPct) : 0;
        } else if (col.fieldKey === 'pt' || col.headerLabel.toUpperCase() === 'PT') {
          val = col.calculationValue ?? 208;
        } else if (col.fieldKey === 'lwf' || col.headerLabel.toUpperCase() === 'LWF') {
          val = col.calculationValue ?? 20;
        } else if (col.calculationMethod === 'PERCENTAGE_OF_BASIC') {
          val = Math.round(basicAmount * ((col.calculationValue || 0) / 100));
        } else if (col.calculationMethod === 'PERCENTAGE_OF_GROSS') {
          val = Math.round(grossEarnings * ((col.calculationValue || 0) / 100));
        } else if (col.calculationMethod === 'PERCENTAGE_OF_BASE') {
          val = Math.round(baseWages * ((col.calculationValue || 0) / 100));
        } else if (col.calculationMethod === 'FIXED_PER_DAY') {
          val = Math.round((col.calculationValue || 0) * payDays);
        } else {
          // FIXED_PER_MONTH or MANUAL_ENTRY
          val = col.calculationValue ?? 0;
        }

        calculatedValues[col.fieldKey] = val;
        totalDeductions += val;
      });
    });

    calculatedValues['total_deductions'] = totalDeductions;
    const netPay = Math.max(0, grossEarnings - totalDeductions);
    calculatedValues['net_pay'] = netPay;

    return {
      dailyWage,
      payDays,
      baseWages,
      otHours,
      otAmount,
      nightShifts,
      totalWages,
      grossEarnings,
      totalDeductions,
      netPay,
      values: calculatedValues,
    };
  }, [template, activeOtPolicy, activeOtWageBasis]);

  // Flattened columns filtered by preview tab
  const previewSections = useMemo(() => {
    if (previewFilter === 'ALL') return template.sections;
    if (previewFilter === 'EARNINGS') return template.sections.filter((s) => s.category === 'EARNINGS');
    if (previewFilter === 'STATUTORY') return template.sections.filter((s) => s.id === 'SEC_DED_STAT');
    if (previewFilter === 'ASSETS') return template.sections.filter((s) => s.id === 'SEC_DED_ASSET');
    if (previewFilter === 'MEALS') return template.sections.filter((s) => s.id === 'SEC_DED_MEAL');
    if (previewFilter === 'ADVANCES') return template.sections.filter((s) => s.id === 'SEC_DED_ADV');
    if (previewFilter === 'ATTENDANCE') return template.sections.filter((s) => s.category === 'ATTENDANCE_METRICS');
    if (previewFilter === 'EMPLOYEE') return template.sections.filter((s) => s.category === 'EMPLOYEE_INFO');
    return template.sections;
  }, [template, previewFilter]);

  // Safety check: All hooks are called above unconditionally
  if (!isOpen) return null;

  // Deduction section IDs helper
  const isDeductionSection = currentSection.category === 'DEDUCTIONS';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#07563D] text-white flex items-center justify-center shadow-xs">
              <Sliders size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-gray-900">Company Payroll Template Builder</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#07563D]/10 text-[#07563D] border border-emerald-200">
                  Spec Section 8 & 19
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <Database size={10} className="text-emerald-700" />
                  <span>PostgreSQL Multi-Tenant</span>
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                  <Server size={11} className="text-[#07563D]" />
                  <span>Company:</span> <strong className="text-gray-900 font-bold">{companyName}</strong>
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  <span>Vendor:</span> <strong className="font-bold">{vendorName}</strong> ({vendorId})
                </span>
                {isLoadingDb && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 font-semibold animate-pulse">
                    <Loader2 size={10} className="animate-spin" /> Fetching SQL...
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              disabled={isLoadingDb || isSavingDb}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCcw size={13} className={isLoadingDb ? 'animate-spin' : ''} />
              <span>Reset Defaults</span>
            </button>

            <button
              onClick={handleSave}
              disabled={isLoadingDb || isSavingDb}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#07563D] hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isSavingDb ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving to DB...</span>
                </>
              ) : saveToast ? (
                <>
                  <Check size={14} />
                  <span>Saved to PostgreSQL!</span>
                </>
              ) : (
                <>
                  <Database size={14} />
                  <span>Save to Database</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 text-lg font-bold p-1 rounded-lg hover:bg-gray-200/60 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>


        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Categorized Sections Navigation */}
          <div className="w-72 border-r border-gray-200 bg-gray-50/50 p-3.5 space-y-3 overflow-y-auto">
            
            {/* Group 1: Core Workbook */}
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block px-2 mb-1.5">
                Core Structure
              </span>
              <div className="space-y-1">
                {template.sections.filter(s => s.category === 'EMPLOYEE_INFO' || s.category === 'ATTENDANCE_METRICS').map((sec) => {
                  const isActive = sec.id === activeSectionId;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => {
                        setActiveSectionId(sec.id);
                        setIsAddingComponent(false);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-white text-gray-900 shadow-xs border border-gray-200'
                          : 'text-gray-600 hover:bg-gray-100/80'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: `#${sec.headerColor?.slice(2) || '07563D'}` }}
                        />
                        <span className="truncate">{sec.title}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-mono">
                        {sec.columns.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Group 2: Earnings & Allowances */}
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block px-2 mb-1.5 flex items-center justify-between">
                <span>Compensation & Allowances</span>
                <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold">Earn</span>
              </span>
              <div className="space-y-1">
                {template.sections.filter(s => s.category === 'EARNINGS').map((sec) => {
                  const isActive = sec.id === activeSectionId;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => {
                        setActiveSectionId(sec.id);
                        setIsAddingComponent(false);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-950 shadow-xs border border-emerald-300'
                          : 'text-gray-700 hover:bg-emerald-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <DollarSign size={13} className="text-[#07563D] shrink-0" />
                        <span className="truncate">{sec.title}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100/70 text-emerald-900 font-mono font-bold">
                        {sec.columns.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Group 3: Deductions & Recoveries (Separated Categories) */}
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-red-800 block px-2 mb-1.5 flex items-center justify-between">
                <span>Deductions & Recoveries</span>
                <span className="text-[9px] bg-red-100 text-red-800 px-1.5 py-0.2 rounded-full font-bold">Deduct</span>
              </span>
              <div className="space-y-1">
                {template.sections.filter(s => s.category === 'DEDUCTIONS').map((sec) => {
                  const isActive = sec.id === activeSectionId;
                  const getIcon = () => {
                    if (sec.id === 'SEC_DED_STAT') return <ShieldCheck size={13} className="text-red-700 shrink-0" />;
                    if (sec.id === 'SEC_DED_ASSET') return <Shirt size={13} className="text-amber-700 shrink-0" />;
                    if (sec.id === 'SEC_DED_MEAL') return <Utensils size={13} className="text-orange-700 shrink-0" />;
                    return <HeartHandshake size={13} className="text-purple-700 shrink-0" />;
                  };

                  return (
                    <button
                      key={sec.id}
                      onClick={() => {
                        setActiveSectionId(sec.id);
                        setIsAddingComponent(false);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-rose-50 text-rose-950 shadow-xs border border-rose-300'
                          : 'text-gray-700 hover:bg-rose-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {getIcon()}
                        <span className="truncate">{sec.title}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-mono">
                        {sec.columns.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Group 4: Net Pay & Signatures */}
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block px-2 mb-1.5">
                Settlement & Signatures
              </span>
              <div className="space-y-1">
                {template.sections.filter(s => s.category === 'NET_AND_SIGNATURE').map((sec) => {
                  const isActive = sec.id === activeSectionId;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => {
                        setActiveSectionId(sec.id);
                        setIsAddingComponent(false);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-white text-gray-900 shadow-xs border border-gray-200'
                          : 'text-gray-600 hover:bg-gray-100/80'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <CheckCircle2 size={13} className="text-gray-700 shrink-0" />
                        <span className="truncate">{sec.title}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-mono">
                        {sec.columns.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Action: Add Component into Active Section */}
            <div className="pt-2">
              <button
                onClick={() => setIsAddingComponent(true)}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-emerald-600/40 bg-emerald-50/60 text-[#07563D] hover:bg-emerald-100/70 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                <Plus size={14} />
                <span>+ Add Item into {currentSection.title.split(' ')[0]}</span>
              </button>
            </div>

            {/* Live Formula Rule Summary */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs space-y-1">
              <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
                Strict Mathematical Rule
              </span>
              <p className="text-[11px] text-emerald-950 leading-relaxed font-mono font-medium">
                Net Pay = Gross Earnings − Total Deductions
              </p>
              <p className="text-[10px] text-emerald-800 leading-normal">
                Basic 55% + HRA 45% = Base Wages. Food & Night allowances add to Gross. Canteen, shoe & loan recoveries minus from Gross.
              </p>
            </div>
          </div>

          {/* Right Column: Column Manager */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            
            {/* Top Toolbar & Section Header */}
            <div className="p-4 border-b border-gray-100 flex flex-col gap-3 bg-gray-50/30">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: `#${currentSection.headerColor?.slice(2) || '07563D'}` }}
                    />
                    <span>{currentSection.title} Columns</span>
                  </h3>
                  <p className="text-xs text-gray-500">
                    Configure column names, assign calculation functions (% or ₹), or add custom company components
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAddingComponent(!isAddingComponent)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#07563D] text-white rounded-lg text-xs font-bold hover:bg-emerald-800 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Add Component</span>
                  </button>
                  <span className="text-xs text-gray-400 font-medium px-2 py-1 bg-gray-100 rounded-lg">
                    {currentSection.columns.length} Columns
                  </span>
                </div>
              </div>

              {/* Quick Tab Switcher for Deductions Sections */}
              {isDeductionSection && (
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-2xs text-xs font-bold overflow-x-auto">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2">
                    Deduction Tabs:
                  </span>
                  <button
                    onClick={() => setActiveSectionId('SEC_DED_STAT')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      activeSectionId === 'SEC_DED_STAT'
                        ? 'bg-rose-100 text-rose-900 border border-rose-200 font-black'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    🏛️ Statutory (PF/ESI/PT)
                  </button>
                  <button
                    onClick={() => setActiveSectionId('SEC_DED_ASSET')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      activeSectionId === 'SEC_DED_ASSET'
                        ? 'bg-amber-100 text-amber-900 border border-amber-200 font-black'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    🛡️ Company Assets & PPE
                  </button>
                  <button
                    onClick={() => setActiveSectionId('SEC_DED_MEAL')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      activeSectionId === 'SEC_DED_MEAL'
                        ? 'bg-orange-100 text-orange-900 border border-orange-200 font-black'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    🍱 Canteen & Meal Recoveries
                  </button>
                  <button
                    onClick={() => setActiveSectionId('SEC_DED_ADV')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      activeSectionId === 'SEC_DED_ADV'
                        ? 'bg-purple-100 text-purple-900 border border-purple-200 font-black'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    💳 Advances & Other
                  </button>
                </div>
              )}
            </div>

            {/* INLINE ADD CUSTOM COMPONENT FORM */}
            {isAddingComponent && (
              <div className="p-4 bg-emerald-50/40 border-b border-emerald-200 animate-in fade-in slide-in-from-top-2 duration-150 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-[#07563D]" />
                    <span className="text-xs font-black text-gray-900 uppercase tracking-wide">
                      Add Custom {currentSection.title} Component
                    </span>
                  </div>
                  <button
                    onClick={() => setIsAddingComponent(false)}
                    className="text-gray-400 hover:text-gray-700 text-xs p-1"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">
                      Header Text (Label)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SPECIAL ALLOWANCE"
                      value={newCompLabel}
                      onChange={(e) => setNewCompLabel(e.target.value)}
                      className="w-full text-xs font-bold px-3 py-1.5 bg-white border border-gray-300 rounded-lg outline-none focus:border-[#07563D]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">
                      Calculation Function
                    </label>
                    <select
                      value={newCompMethod}
                      onChange={(e) => setNewCompMethod(e.target.value as CalculationMethodType)}
                      className="w-full text-xs font-bold px-3 py-1.5 bg-white border border-gray-300 rounded-lg outline-none focus:border-[#07563D] cursor-pointer"
                    >
                      <option value="PERCENTAGE_OF_BASE">% of Base Wage (Daily × Days)</option>
                      <option value="PERCENTAGE_OF_BASIC">% of Basic Wage</option>
                      <option value="PERCENTAGE_OF_GROSS">% of Gross Wage (ESI)</option>
                      <option value="STATUTORY_2X_BASIC">Statutory 2× Basic Rate (₹83.19/hr)</option>
                      <option value="COMPANY_OT_POLICY">Company Norm (1.50× Multiplier)</option>
                      <option value="HOURLY_OT_RATE">Hourly Overtime Rate (₹)</option>
                      <option value="DOUBLE_ORDINARY_RATE">2.00× Double Ordinary Rate (₹151.25/hr)</option>
                      <option value="FIXED_PER_MONTH">Fixed Monthly Amount (₹)</option>
                      <option value="FIXED_PER_DAY">Fixed Rate / Working Day (₹)</option>
                      <option value="PER_SHIFT_COUNT">Night Shift Rate (₹ / Shift)</option>
                      <option value="MANUAL_ENTRY">Manual / Variable Input</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">
                      Function Value / Rate
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="e.g. 10 or 500"
                        value={newCompValue}
                        onChange={(e) => setNewCompValue(Number(e.target.value))}
                        className="w-full text-xs font-bold px-3 py-1.5 bg-white border border-gray-300 rounded-lg outline-none focus:border-[#07563D]"
                      />
                      <span className="absolute right-3 top-1.5 text-gray-400 font-bold text-[10px]">
                        {newCompMethod.includes('PERCENTAGE') ? '%' : '₹'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-end gap-2">
                    <button
                      onClick={handleAddNewComponent}
                      disabled={!newCompLabel.trim()}
                      className="flex-1 py-1.5 bg-[#07563D] hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-xs font-black transition-all cursor-pointer shadow-xs"
                    >
                      Insert Column
                    </button>
                    <button
                      onClick={() => setIsAddingComponent(false)}
                      className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Columns List with Function & Value controls */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {currentSection.columns.map((col, idx) => {
                const isOtCol =
                  (col.fieldKey === 'ot_amount' ||
                    col.fieldKey === 'ot_stipend' ||
                    /\b(OT|OVERTIME)\b/i.test(col.headerLabel) ||
                    col.calculationMethod === 'STATUTORY_2X_BASIC' ||
                    col.calculationMethod === 'COMPANY_OT_POLICY' ||
                    col.calculationMethod === 'HOURLY_OT_RATE' ||
                    col.calculationMethod === 'DOUBLE_ORDINARY_RATE') &&
                  col.fieldKey !== 'other_earnings' &&
                  !col.headerLabel.toLowerCase().includes('other');

                const isColEnabled = col.isEnabled !== false;

                return (
                  <div
                    key={col.fieldKey}
                    className={`flex flex-col p-3.5 rounded-2xl border transition-all shadow-2xs gap-2 ${
                      isColEnabled
                        ? 'border-gray-200 hover:border-gray-300 bg-white'
                        : 'border-dashed border-gray-300 bg-gray-50/70 opacity-70'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="font-mono text-xs text-gray-400 font-bold w-6 text-center shrink-0">
                          #{idx + 1}
                        </span>

                        {/* Enable / Disable Column Toggle Switch */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleColumnEnabled(idx)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              isColEnabled ? 'bg-[#07563D]' : 'bg-gray-300'
                            }`}
                            title={isColEnabled ? 'Component is Active. Click to Disable / Exclude from Payroll.' : 'Component is Disabled (₹0). Click to Enable.'}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                isColEnabled ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isColEnabled ? 'text-emerald-900 bg-emerald-50 border border-emerald-200' : 'text-gray-500 bg-gray-100 border border-gray-300 line-through'
                          }`}>
                            {isColEnabled ? 'Active' : 'Disabled'}
                          </span>
                        </div>

                        {/* Column Header Label Input */}
                        <div className="space-y-0.5 flex-1 min-w-0 max-w-xs">
                          <input
                            type="text"
                            value={col.headerLabel}
                            onChange={(e) => handleHeaderNameChange(idx, e.target.value)}
                            className="w-full text-xs font-black text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 focus:bg-white focus:border-[#07563D] outline-none"
                          />
                          <span className="text-[10px] font-mono text-gray-400 block truncate">
                            Key: {col.fieldKey}
                          </span>
                        </div>

                        {/* Calculation Function & Rate / Value Control */}
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={col.calculationMethod || 'MANUAL_ENTRY'}
                            onChange={(e) => handleCalculationMethodChange(idx, e.target.value as CalculationMethodType)}
                            className="text-[11px] font-bold bg-gray-100 hover:bg-gray-200/80 border border-gray-200 text-gray-800 rounded-lg px-2.5 py-1 outline-none cursor-pointer"
                          >
                            <option value="PERCENTAGE_OF_BASE">% of Base Wage</option>
                            <option value="PERCENTAGE_OF_BASIC">% of Basic</option>
                            <option value="PERCENTAGE_OF_GROSS">% of Gross (ESI)</option>
                            <option value="STATUTORY_2X_BASIC">⚖️ Statutory 2× Basic Rate</option>
                            <option value="COMPANY_OT_POLICY">⚡ Company Norm (1.50×)</option>
                            <option value="HOURLY_OT_RATE">₹ Fixed OT Rate / Hour</option>
                            <option value="DOUBLE_ORDINARY_RATE">2× Double Ordinary Rate</option>
                            <option value="FIXED_PER_MONTH">Fixed Monthly ₹</option>
                            <option value="FIXED_PER_DAY">Fixed ₹/Day (Food)</option>
                            <option value="PER_SHIFT_COUNT">Night Shift Rate (₹/Shift)</option>
                            <option value="COMPUTED_SUM">Aggregate Sum</option>
                            <option value="MANUAL_ENTRY">Manual Input</option>
                          </select>

                          {/* Quick Action Button to Open Overtime Policy Engine Modal */}
                          {isOtCol && (
                            <button
                              type="button"
                              onClick={() => {
                                setOtConfigTargetColIdx(idx);
                                setIsOtPolicyModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#07563D] border border-emerald-300 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                              title="Open Overtime Policy & Statutory Engine to select presets and configure multiplier/rate"
                            >
                              <Scale size={13} className="text-[#07563D]" />
                              <span>Configure OT Policy</span>
                            </button>
                          )}

                          {/* Numeric Value Input when applicable */}
                          {(col.calculationMethod === 'PERCENTAGE_OF_BASE' ||
                            col.calculationMethod === 'PERCENTAGE_OF_BASIC' ||
                            col.calculationMethod === 'PERCENTAGE_OF_GROSS' ||
                            col.calculationMethod === 'FIXED_PER_MONTH' ||
                            col.calculationMethod === 'FIXED_PER_DAY' ||
                            col.calculationMethod === 'PER_SHIFT_COUNT' ||
                            col.calculationMethod === 'HOURLY_OT_RATE' ||
                            col.calculationMethod === 'STATUTORY_2X_BASIC' ||
                            col.calculationMethod === 'COMPANY_OT_POLICY' ||
                            col.calculationMethod === 'DOUBLE_ORDINARY_RATE') && (
                            <div className="flex items-center gap-1 bg-emerald-50/70 border border-emerald-200 rounded-lg px-2 py-0.5">
                              <input
                                type="number"
                                step="any"
                                value={col.calculationValue ?? 0}
                                onChange={(e) => handleCalculationValueChange(idx, Number(e.target.value))}
                                className="w-16 text-xs font-black text-[#07563D] bg-transparent outline-none text-right"
                              />
                              <span className="text-[10px] font-black text-emerald-800">
                                {col.calculationMethod?.includes('PERCENTAGE') ? '%' : '₹'}
                              </span>
                            </div>
                          )}

                          {col.isCustom && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-50 text-purple-700 border border-purple-200">
                              Custom
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions: Reorder and Delete */}
                      <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                        <button
                          onClick={() => handleMoveColumn(idx, 'UP')}
                          disabled={idx === 0}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer disabled:opacity-30"
                          title="Move Up"
                        >
                          <MoveUp size={14} />
                        </button>
                        <button
                          onClick={() => handleMoveColumn(idx, 'DOWN')}
                          disabled={idx === currentSection.columns.length - 1}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer disabled:opacity-30"
                          title="Move Down"
                        >
                          <MoveDown size={14} />
                        </button>
                        {col.isCustom && (
                          <button
                            onClick={() => handleDeleteColumn(idx)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Custom Column"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Formula Mismatch Reconciler Banner for Overtime Columns */}
                    {isOtCol && (
                      <div className="w-full mt-1 p-2.5 bg-amber-50/90 border border-amber-200/80 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-900 flex items-center gap-1">
                            <Scale size={13} className="text-amber-700" />
                            <span>Formula Mismatch Reconciler:</span>
                          </span>
                          <span className="text-amber-950 font-medium">
                            <b>Statutory 2× Basic:</b> ₹83.19/hr (₹1,11,973 on 1,346h) vs <b>1× Gross:</b> ₹75.63/hr (₹1,01,797, diff -₹10,176) vs <b>Company Norm:</b> ₹122.68/hr
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded border border-amber-300 shrink-0">
                          Factories Act Sec 59
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── TWO-TIER LIVE EXCEL EXPORT PREVIEW WITH SAMPLE DATA VALUES ─── */}
            <div className="border-t border-gray-200 bg-gray-50/90 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-700 flex items-center gap-2">
                  <Eye size={13} className="text-[#07563D]" />
                  <span>Live Excel Export Header & Calculated Sample Data Preview</span>
                </span>

                {/* Section Filter Tabs for Preview */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-2xs text-[11px] font-bold overflow-x-auto">
                  <button
                    onClick={() => setPreviewFilter('ALL')}
                    className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      previewFilter === 'ALL'
                        ? 'bg-[#07563D] text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    All Sections
                  </button>
                  <button
                    onClick={() => setPreviewFilter('EARNINGS')}
                    className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      previewFilter === 'EARNINGS'
                        ? 'bg-[#065F46] text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    💰 Earnings
                  </button>
                  <button
                    onClick={() => setPreviewFilter('STATUTORY')}
                    className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      previewFilter === 'STATUTORY'
                        ? 'bg-[#991B1B] text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    🏛️ Statutory
                  </button>
                  <button
                    onClick={() => setPreviewFilter('ASSETS')}
                    className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      previewFilter === 'ASSETS'
                        ? 'bg-[#B45309] text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    🛡️ Assets & PPE
                  </button>
                  <button
                    onClick={() => setPreviewFilter('MEALS')}
                    className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      previewFilter === 'MEALS'
                        ? 'bg-[#C2410C] text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    🍱 Canteen & Meals
                  </button>
                  <button
                    onClick={() => setPreviewFilter('ADVANCES')}
                    className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      previewFilter === 'ADVANCES'
                        ? 'bg-[#7C3AED] text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    💳 Advances
                  </button>
                  <button
                    onClick={() => setPreviewFilter('ATTENDANCE')}
                    className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      previewFilter === 'ATTENDANCE'
                        ? 'bg-[#1E3A8A] text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    ⏱️ Attendance
                  </button>
                </div>
              </div>

              {/* TWO-TIER EXCEL SHEET PREVIEW CONTAINER */}
              <div className="overflow-x-auto border border-gray-300 rounded-2xl bg-white shadow-md max-h-48 overflow-y-auto">
                <table className="w-full text-left border-collapse text-[10px] min-w-max">
                  {/* TIER 1: SECTION GROUP BANDS */}
                  <thead>
                    <tr className="border-b border-gray-300">
                      {previewSections.map((sec) => (
                        <th
                          key={sec.id}
                          colSpan={sec.columns.length}
                          className="px-3 py-1.5 text-center font-black tracking-wider uppercase text-white border-r last:border-r-0 border-white/20"
                          style={{ backgroundColor: `#${sec.headerColor?.slice(2) || '07563D'}` }}
                        >
                          {sec.title} ({sec.columns.length} Cols)
                        </th>
                      ))}
                    </tr>

                    {/* TIER 2: COLUMN HEADERS */}
                    <tr className="bg-gray-100 border-b border-gray-300 font-black text-gray-800">
                      {previewSections.flatMap((s) => s.columns).map((col, idx) => {
                        const isColActive = col.isEnabled !== false;
                        return (
                          <th
                            key={idx}
                            className={`px-3 py-2 border-r last:border-r-0 border-gray-200 text-center whitespace-nowrap ${
                              !isColActive
                                ? 'bg-gray-200/70 text-gray-400 opacity-60'
                                : col.category === 'EARNINGS'
                                ? 'bg-emerald-50/70 text-emerald-950 font-bold'
                                : col.category === 'DEDUCTIONS'
                                ? 'bg-rose-50/70 text-rose-950 font-bold'
                                : 'bg-gray-50 text-gray-800'
                            }`}
                          >
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={`font-black ${!isColActive ? 'line-through text-gray-400' : ''}`}>
                                {col.headerLabel}
                              </span>
                              {!isColActive && (
                                <span className="text-[8px] font-bold text-gray-500 bg-gray-100 px-1 py-0.2 rounded border border-gray-300">
                                  OFF
                                </span>
                              )}
                              {isColActive && col.calculationValue !== undefined && col.calculationValue > 0 && (
                                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/90 border border-gray-300 text-gray-700">
                                  {col.calculationValue}{col.calculationMethod?.includes('PERCENT') ? '%' : '₹'}
                                </span>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>

                  {/* TIER 3: LIVE CALCULATED SAMPLE WORKER ROW */}
                  <tbody className="divide-y divide-gray-200">
                    <tr className="hover:bg-amber-50/40 transition-colors">
                      {previewSections.flatMap((s) => s.columns).map((col, idx) => {
                        const isColActive = col.isEnabled !== false;
                        let cellContent = '—';
                        if (!isColActive) cellContent = '—';
                        else if (col.fieldKey === 's_no') cellContent = '1';
                        else if (col.fieldKey === 'emp_id') cellContent = '20385';
                        else if (col.fieldKey === 'emp_name') cellContent = 'SAKTHI S';
                        else if (col.fieldKey === 'department') cellContent = 'Assembly';
                        else if (col.fieldKey === 'category') cellContent = 'Technician';
                        else if (col.fieldKey === 'daily_rate') cellContent = `₹${sampleWorker.dailyWage}`;
                        else if (col.fieldKey === 'working_days') cellContent = `${sampleWorker.payDays}`;
                        else if (col.fieldKey === 'payable_days') cellContent = `${sampleWorker.payDays}`;
                        else if (col.fieldKey === 'ot_hours') cellContent = `${sampleWorker.otHours}h`;
                        else if (col.fieldKey === 'night_shifts') cellContent = `${sampleWorker.nightShifts}`;
                        else if (col.fieldKey === 'lop_days') cellContent = '—';
                        else if (col.fieldKey === 'nfh_days') cellContent = '—';
                        else if (sampleWorker.values[col.fieldKey] !== undefined) {
                          cellContent = `₹${Math.round(sampleWorker.values[col.fieldKey]).toLocaleString('en-IN')}`;
                        }

                        return (
                          <td
                            key={idx}
                            className={`px-3 py-2 border-r last:border-r-0 border-gray-200 whitespace-nowrap text-right font-mono ${
                              !isColActive
                                ? 'text-gray-400 bg-gray-50/50 line-through opacity-50'
                                : col.fieldKey === 'gross_earnings' || col.fieldKey === 'net_pay' || col.fieldKey === 'wages'
                                ? 'font-black bg-emerald-100/50 text-[#07563D]'
                                : col.fieldKey === 'total_deductions'
                                ? 'font-black bg-rose-100/50 text-rose-900'
                                : 'text-gray-700'
                            }`}
                          >
                            {cellContent}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Sample Calculation Summary Ledger */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1 px-1">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-500">Live Sample (SAKTHI S · 25 Days @ ₹605/d):</span>
                  <span className="px-2 py-0.5 rounded font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Gross: ₹{Math.round(sampleWorker.grossEarnings).toLocaleString('en-IN')}
                  </span>
                  <span className="px-2 py-0.5 rounded font-mono font-bold bg-rose-50 text-rose-800 border border-rose-200">
                    Deductions: ₹{Math.round(sampleWorker.totalDeductions).toLocaleString('en-IN')}
                  </span>
                  <span className="px-2 py-0.5 rounded font-mono font-bold bg-[#07563D] text-white">
                    Net Pay: ₹{Math.round(sampleWorker.netPay).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-emerald-800 font-bold text-[11px]">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span>Gross − Deductions = Net Pay (100% Invariant Reconciled)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overtime Policy & Statutory Calculation Engine Modal */}
      <AttendanceOTPolicyModal
        isOpen={isOtPolicyModalOpen}
        onClose={() => setIsOtPolicyModalOpen(false)}
        currentPolicy={activeOtPolicy}
        currentWageBasis={activeOtWageBasis}
        totalOtHours={1346}
        totalWorkers={44}
        onApplyPolicy={handleApplyOtPolicyFromModal}
      />
    </div>
  );
}
