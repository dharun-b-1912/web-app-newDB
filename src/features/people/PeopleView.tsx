import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Breadcrumb } from '../../components/shell/Breadcrumb';
import {
  Search,
  UserPlus,
  RotateCcw,
  Building2,
  Users,
  Filter,
} from 'lucide-react';
import { EmployeeList } from './EmployeeList';
import { EmployeeCreateWizardModal } from './EmployeeCreateWizardModal';
import { EmployeeProfileDrawer } from './EmployeeProfileDrawer';
import { Employee } from '../../types';
import { api } from '../../services/api';
import { useTenant } from '../../hooks/useTenant';
import { usePermission } from '../../hooks/usePermission';
import { hrEventBus } from '../../services/hrEventBus';
import { cn } from '../../lib/utils';

export const PeopleView: React.FC = () => {
  const { activeCompany } = useTenant();
  const { filterAccessibleEmployees, hasPermission } = usePermission();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'DIRECT' | 'VENDOR'>('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');

  // Modals / Drawers
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const loadData = async () => {
    let data = await api.getEmployees({ companyId: activeCompany?.id });
    if (!data || data.length === 0) {
      data = await api.getEmployees();
    }
    setEmployees(data);
  };

  useEffect(() => {
    loadData();
  }, [activeCompany?.id]);

  useEffect(() => {
    const unsub = hrEventBus.subscribe('employee.*', () => {
      loadData();
    });
    return () => unsub();
  }, [activeCompany?.id]);

  const handleEmployeeCreated = (newEmp: Employee) => {
    setEmployees((prev) => [newEmp, ...prev]);
  };

  const handleEmployeeUpdated = (updatedEmp: Employee) => {
    setEmployees((prev) => prev.map((e) => (e.id === updatedEmp.id ? updatedEmp : e)));
    setSelectedEmployee(updatedEmp);
  };

  const accessibleEmployees = useMemo(() => {
    return filterAccessibleEmployees(employees);
  }, [employees, filterAccessibleEmployees]);

  // Helper to check if an employee is Vendor
  const isEmployeeVendor = (emp: Employee): boolean => {
    const source = emp.employment_source || emp.employment?.employment_source;
    if (source === 'VENDOR' || source === 'MANPOWER_PROVIDER') return true;
    if (source === 'DIRECT') return false;
    if (emp.vendor_name && emp.vendor_name.trim() !== '') return true;
    if (emp.employment?.vendor_name && emp.employment.vendor_name.trim() !== '') return true;
    if (emp.company_name && emp.company_name.toLowerCase().includes('vendor')) return true;
    return false;
  };

  // KPI Calculations
  const totalCount = accessibleEmployees.length;
  const directCount = accessibleEmployees.filter((e) => !isEmployeeVendor(e)).length;
  const vendorCount = accessibleEmployees.filter((e) => isEmployeeVendor(e)).length;
  const activeCount = accessibleEmployees.filter((e) => (e.status || 'Active').toLowerCase() === 'active').length;
  const probationCount = accessibleEmployees.filter((e) => (e.status || '').toLowerCase() === 'probation').length;

  // Extract unique dynamic departments from loaded employees
  const uniqueDepartments = useMemo(() => {
    const map = new Map<string, string>();
    accessibleEmployees.forEach((e) => {
      const d = (e.department_name || (e as any).department || '').trim();
      if (d) {
        const lower = d.toLowerCase();
        if (!map.has(lower)) {
          // Normalize Title Case
          const formatted = d.charAt(0).toUpperCase() + d.slice(1).toLowerCase();
          map.set(lower, formatted);
        }
      }
    });
    return Array.from(map.values()).sort();
  }, [accessibleEmployees]);

  // Extract unique locations
  const uniqueLocations = useMemo(() => {
    const set = new Set<string>();
    accessibleEmployees.forEach((e) => {
      const loc = (e.employment?.work_location || (e as any).location || '').trim();
      if (loc) set.add(loc);
    });
    return Array.from(set).sort();
  }, [accessibleEmployees]);

  // Master Filter Engine
  const filteredEmployees = useMemo(() => {
    return accessibleEmployees.filter((emp) => {
      const isVendor = isEmployeeVendor(emp);
      const isDirect = !isVendor;

      // 1. Sourcing Model Filter
      if (sourceFilter === 'DIRECT' && !isDirect) return false;
      if (sourceFilter === 'VENDOR' && !isVendor) return false;

      // 2. Department Filter (case-insensitive)
      if (deptFilter !== 'ALL') {
        const empDept = (emp.department_name || (emp as any).department || '').toLowerCase().trim();
        if (empDept !== deptFilter.toLowerCase().trim()) return false;
      }

      // 3. Status Filter (case-insensitive)
      if (statusFilter !== 'ALL') {
        const empStatus = (emp.status || '').toLowerCase().trim();
        if (empStatus !== statusFilter.toLowerCase().trim()) return false;
      }

      // 4. Location Filter
      if (locationFilter !== 'ALL') {
        const empLoc = (emp.employment?.work_location || (emp as any).location || '').toLowerCase().trim();
        if (!empLoc.includes(locationFilter.toLowerCase().trim())) return false;
      }

      // 5. Search Query
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const fullName = `${emp.first_name || ''} ${emp.last_name || ''} ${emp.display_name || ''}`.toLowerCase();
        const empCode = (emp.employee_code || '').toLowerCase();
        const email = (emp.work_email || (emp as any).email || '').toLowerCase();
        const role = (emp.designation_title || (emp as any).designation || '').toLowerCase();
        const dept = (emp.department_name || (emp as any).department || '').toLowerCase();
        const loc = (emp.employment?.work_location || (emp as any).location || '').toLowerCase();
        const vendor = (emp.vendor_name || emp.company_name || '').toLowerCase();

        const matches =
          fullName.includes(q) ||
          empCode.includes(q) ||
          email.includes(q) ||
          role.includes(q) ||
          dept.includes(q) ||
          loc.includes(q) ||
          vendor.includes(q);

        if (!matches) return false;
      }

      return true;
    });
  }, [accessibleEmployees, search, sourceFilter, deptFilter, statusFilter, locationFilter]);

  // Determine active segment pill
  const activePillId = useMemo(() => {
    if (sourceFilter === 'DIRECT' && statusFilter === 'ALL') return 'DIRECT';
    if (sourceFilter === 'VENDOR' && statusFilter === 'ALL') return 'VENDOR';
    if (statusFilter === 'Active' && sourceFilter === 'ALL') return 'ACTIVE';
    if (statusFilter === 'Probation' && sourceFilter === 'ALL') return 'PROBATION';
    if (sourceFilter === 'ALL' && statusFilter === 'ALL' && deptFilter === 'ALL' && locationFilter === 'ALL' && !search) return 'ALL';
    return 'CUSTOM';
  }, [sourceFilter, statusFilter, deptFilter, locationFilter, search]);

  const handlePillClick = (id: string) => {
    if (id === 'ALL') {
      setSourceFilter('ALL');
      setStatusFilter('ALL');
      setDeptFilter('ALL');
      setLocationFilter('ALL');
      setSearch('');
    } else if (id === 'DIRECT') {
      setSourceFilter('DIRECT');
      setStatusFilter('ALL');
    } else if (id === 'VENDOR') {
      setSourceFilter('VENDOR');
      setStatusFilter('ALL');
    } else if (id === 'ACTIVE') {
      setStatusFilter('Active');
      setSourceFilter('ALL');
    } else if (id === 'PROBATION') {
      setStatusFilter('Probation');
      setSourceFilter('ALL');
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setSourceFilter('ALL');
    setDeptFilter('ALL');
    setStatusFilter('ALL');
    setLocationFilter('ALL');
  };

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumb items={[{ label: 'People & Core HR' }, { label: 'Employee Management 2.0' }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Workforce Master Directory</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Centralized workforce identity across Direct Employees, Manpower Provider Contractors, and departments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasPermission('people', 'create') && (
            <Button
              onClick={() => setIsCreateOpen(true)}
              leftIcon={<UserPlus className="w-4 h-4" />}
              className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs shadow-xs"
            >
              Onboard Employee
            </Button>
          )}
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div
          onClick={() => handlePillClick('ALL')}
          className={cn(
            "p-4 rounded-2xl border transition-all cursor-pointer space-y-1 shadow-2xs",
            activePillId === 'ALL' ? "bg-emerald-50/50 border-emerald-300 ring-2 ring-[#07563D]/20" : "bg-white border-gray-200 hover:border-gray-300"
          )}
        >
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Workforce</div>
          <div className="text-xl font-black text-gray-900">{totalCount}</div>
          <div className="text-[10px] text-gray-400 font-medium">Headcount in Scope</div>
        </div>

        <div
          onClick={() => handlePillClick('DIRECT')}
          className={cn(
            "p-4 rounded-2xl border transition-all cursor-pointer space-y-1 shadow-2xs",
            activePillId === 'DIRECT' ? "bg-emerald-50/50 border-emerald-300 ring-2 ring-[#07563D]/20" : "bg-white border-gray-200 hover:border-gray-300"
          )}
        >
          <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Direct Employees</div>
          <div className="text-xl font-black text-[#07563D]">{directCount}</div>
          <div className="text-[10px] text-emerald-800 font-medium">On Company Payroll</div>
        </div>

        <div
          onClick={() => handlePillClick('VENDOR')}
          className={cn(
            "p-4 rounded-2xl border transition-all cursor-pointer space-y-1 shadow-2xs",
            activePillId === 'VENDOR' ? "bg-amber-50/50 border-amber-300 ring-2 ring-amber-500/20" : "bg-white border-gray-200 hover:border-gray-300"
          )}
        >
          <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Vendor Workforce</div>
          <div className="text-xl font-black text-amber-700">{vendorCount}</div>
          <div className="text-[10px] text-amber-800 font-medium">Manpower Contractors</div>
        </div>

        <div
          onClick={() => handlePillClick('ACTIVE')}
          className={cn(
            "p-4 rounded-2xl border transition-all cursor-pointer space-y-1 shadow-2xs",
            activePillId === 'ACTIVE' ? "bg-blue-50/50 border-blue-300 ring-2 ring-blue-500/20" : "bg-white border-gray-200 hover:border-gray-300"
          )}
        >
          <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Active Confirmed</div>
          <div className="text-xl font-black text-blue-700">{activeCount}</div>
          <div className="text-[10px] text-blue-800 font-medium">Standard Operations</div>
        </div>

        <div
          onClick={() => handlePillClick('PROBATION')}
          className={cn(
            "p-4 rounded-2xl border transition-all cursor-pointer space-y-1 shadow-2xs",
            activePillId === 'PROBATION' ? "bg-purple-50/50 border-purple-300 ring-2 ring-purple-500/20" : "bg-white border-gray-200 hover:border-gray-300"
          )}
        >
          <div className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">On Probation</div>
          <div className="text-xl font-black text-purple-700">{probationCount}</div>
          <div className="text-[10px] text-purple-800 font-medium">Evaluation Period</div>
        </div>
      </div>

      {/* Quick Segment Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'ALL', label: 'All Workforce', count: totalCount },
          { id: 'DIRECT', label: 'Direct Employees', count: directCount },
          { id: 'VENDOR', label: 'Vendor Workforce', count: vendorCount },
          { id: 'ACTIVE', label: 'Active', count: activeCount },
          { id: 'PROBATION', label: 'On Probation', count: probationCount },
        ].map((tab) => {
          const isActive = activePillId === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handlePillClick(tab.id)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 border",
                isActive
                  ? "bg-[#07563D] text-white border-[#07563D] shadow-2xs"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-black",
                  isActive ? "bg-emerald-900/60 text-white" : "bg-gray-100 text-gray-700"
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter Bar */}
      <Card className="p-4 space-y-3 shadow-2xs border-gray-200/80">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="sm:col-span-4 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, code (e.g. J85), role, location, vendor..."
              className="w-full bg-gray-50/80 border border-gray-200 text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#07563D] font-medium placeholder:text-gray-400"
            />
          </div>

          {/* Sourcing Model Dropdown */}
          <div className="sm:col-span-3">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as any)}
              className="w-full bg-gray-50/80 border border-gray-200 text-xs rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#07563D] font-semibold text-gray-800"
            >
              <option value="ALL">All Sourcing Models ({totalCount})</option>
              <option value="DIRECT">Direct Corporate Employees ({directCount})</option>
              <option value="VENDOR">Manpower Provider / Vendor ({vendorCount})</option>
            </select>
          </div>

          {/* Department Dropdown (Dynamic from real data) */}
          <div className="sm:col-span-2">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full bg-gray-50/80 border border-gray-200 text-xs rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#07563D] font-semibold text-gray-800"
            >
              <option value="ALL">All Departments</option>
              {uniqueDepartments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="sm:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-gray-50/80 border border-gray-200 text-xs rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#07563D] font-semibold text-gray-800"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active ({activeCount})</option>
              <option value="Probation">Probation ({probationCount})</option>
              <option value="On Leave">On Leave</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Reset Button */}
          <div className="sm:col-span-1 flex justify-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleResetFilters}
              className="text-xs text-gray-500 hover:text-rose-600 font-bold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </Button>
          </div>
        </div>
      </Card>

      {/* Employee List */}
      <EmployeeList
        employees={filteredEmployees}
        onSelectEmployee={(emp) => {
          setSelectedEmployee(emp);
          setIsDrawerOpen(true);
        }}
      />

      {/* Onboard Wizard Modal */}
      <EmployeeCreateWizardModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleEmployeeCreated}
      />

      {/* Detail Drawer */}
      <EmployeeProfileDrawer
        employee={selectedEmployee}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onUpdated={handleEmployeeUpdated}
      />
    </div>
  );
};
