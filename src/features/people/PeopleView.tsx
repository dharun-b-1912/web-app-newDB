import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Breadcrumb } from '../../components/shell/Breadcrumb';
import {
  Search,
  UserPlus,
} from 'lucide-react';
import { EmployeeList } from './EmployeeList';
import { EmployeeCreateWizardModal } from './EmployeeCreateWizardModal';
import { EmployeeProfileDrawer } from './EmployeeProfileDrawer';
import { Employee } from '../../types';
import { api } from '../../services/api';
import { useTenant } from '../../hooks/useTenant';
import { usePermission } from '../../hooks/usePermission';
import { hrEventBus } from '../../services/hrEventBus';

export const PeopleView: React.FC = () => {
  const { activeCompany } = useTenant();
  const { filterAccessibleEmployees, hasPermission } = usePermission();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [activeSegment, setActiveSegment] = useState<string>('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals / Drawers
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const loadData = async () => {
    // Always load all employees for the active company; fall back to all if none found
    let data = await api.getEmployees({ companyId: activeCompany?.id });
    if (!data || data.length === 0) {
      data = await api.getEmployees();
    }
    setEmployees(data);
  };

  // One-time cache-bust: if localStorage has stale UUIDs, clear and re-seed
  useEffect(() => {
    const seedKey = 'pv-seed-v4';
    if (!localStorage.getItem(seedKey)) {
      localStorage.removeItem('workforce_employees');
      localStorage.setItem(seedKey, '1');
    }
  }, []);

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

  const accessibleEmployees = filterAccessibleEmployees(employees);

  // KPI Calculations
  const totalCount = accessibleEmployees.length;
  const directCount = accessibleEmployees.filter((e) => (e.employment_source || 'DIRECT') === 'DIRECT').length;
  const vendorCount = accessibleEmployees.filter((e) => e.employment_source === 'VENDOR' || e.employment?.employment_source === 'VENDOR').length;
  const probationCount = accessibleEmployees.filter((e) => e.status === 'Probation').length;
  const activeCount = accessibleEmployees.filter((e) => e.status === 'Active').length;

  const filteredEmployees = accessibleEmployees.filter((emp) => {
    const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
    const query = (typeof search === 'string' ? search : String(search || '')).toLowerCase();
    const isVendor = emp.employment_source === 'VENDOR' || emp.employment?.employment_source === 'VENDOR';

    const matchesSearch =
      !query ||
      fullName.includes(query) ||
      (emp.work_email && emp.work_email.toLowerCase().includes(query)) ||
      (emp.employee_code && emp.employee_code.toLowerCase().includes(query)) ||
      (emp.designation_title && emp.designation_title.toLowerCase().includes(query)) ||
      (emp.vendor_name && emp.vendor_name.toLowerCase().includes(query));

    // Segment Filter
    let matchesSegment = true;
    if (activeSegment === 'DIRECT') matchesSegment = !isVendor;
    else if (activeSegment === 'VENDOR') matchesSegment = isVendor;
    else if (activeSegment === 'ACTIVE') matchesSegment = emp.status === 'Active';
    else if (activeSegment === 'PROBATION') matchesSegment = emp.status === 'Probation';

    const matchesDept = deptFilter === 'ALL' || emp.department_name === deptFilter;
    const matchesSource = sourceFilter === 'ALL' || (sourceFilter === 'VENDOR' ? isVendor : !isVendor);
    const matchesStatus = statusFilter === 'ALL' || emp.status === statusFilter;

    return matchesSearch && matchesSegment && matchesDept && matchesSource && matchesStatus;
  });

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
              className="font-bold shadow-sm"
            >
              Onboard Employee
            </Button>
          )}
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Workforce</div>
          <div className="text-xl font-black text-gray-900">{totalCount}</div>
          <div className="text-[10px] text-gray-400 font-medium">Headcount in Scope</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Direct Employees</div>
          <div className="text-xl font-black text-[#07563D]">{directCount}</div>
          <div className="text-[10px] text-emerald-800 font-medium">On Company Payroll</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Vendor Workforce</div>
          <div className="text-xl font-black text-amber-700">{vendorCount}</div>
          <div className="text-[10px] text-amber-800 font-medium">Manpower Contractors</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Active Confirmed</div>
          <div className="text-xl font-black text-blue-700">{activeCount}</div>
          <div className="text-[10px] text-blue-800 font-medium">Standard Operations</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">On Probation</div>
          <div className="text-xl font-black text-purple-700">{probationCount}</div>
          <div className="text-[10px] text-purple-800 font-medium">Evaluation Period</div>
        </div>
      </div>

      {/* Quick Segment Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'ALL', label: 'All Workforce', count: totalCount },
          { id: 'DIRECT', label: 'Direct Employees', count: directCount },
          { id: 'VENDOR', label: 'Vendor Workforce', count: vendorCount },
          { id: 'ACTIVE', label: 'Active', count: activeCount },
          { id: 'PROBATION', label: 'On Probation', count: probationCount },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSegment(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeSegment === tab.id
                ? 'bg-[#07563D] text-white shadow-2xs'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                activeSegment === tab.id ? 'bg-emerald-800 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-4 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee name, code, email, title, vendor..."
              className="w-full bg-gray-50 border border-gray-200 text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#07563D] font-medium"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-xs rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#07563D] font-semibold"
            >
              <option value="ALL">All Sourcing Models</option>
              <option value="DIRECT">Direct Corporate Employees</option>
              <option value="VENDOR">Manpower Provider / Vendor</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-xs rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#07563D] font-semibold"
            >
              <option value="ALL">All Departments</option>
              <option value="People & HR">People & HR</option>
              <option value="Engineering & DevOps">Engineering & DevOps</option>
              <option value="Administration & Facilities">Administration</option>
              <option value="Customer Support">Customer Support</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-xs rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#07563D] font-semibold"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Probation">Probation</option>
              <option value="On Leave">On Leave</option>
            </select>
          </div>

          <div className="sm:col-span-1 flex justify-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSearch('');
                setActiveSegment('ALL');
                setDeptFilter('ALL');
                setSourceFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="text-xs text-gray-500 font-bold"
            >
              Reset
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
