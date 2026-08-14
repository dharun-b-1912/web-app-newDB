import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Breadcrumb } from '../../components/shell/Breadcrumb';
import { Search, UserPlus, Filter, Users, Building2, ShieldCheck, Download } from 'lucide-react';
import { EmployeeList } from './EmployeeList';
import { EmployeeCreateWizardModal } from './EmployeeCreateWizardModal';
import { EmployeeProfileDrawer } from './EmployeeProfileDrawer';
import { Employee } from '../../types';
import { api } from '../../services/api';
import { useTenant } from '../../hooks/useTenant';
import { usePermission } from '../../hooks/usePermission';

export const PeopleView: React.FC = () => {
  const { activeCompany } = useTenant();
  const { filterAccessibleEmployees, hasPermission } = usePermission();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals / Drawers
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const loadData = async () => {
    if (!activeCompany) return;
    const data = await api.getEmployees(activeCompany.id);
    setEmployees(data);
  };

  useEffect(() => {
    loadData();
  }, [activeCompany?.id]);

  const handleEmployeeCreated = (newEmp: Employee) => {
    setEmployees(prev => [newEmp, ...prev]);
  };

  const handleEmployeeUpdated = (updatedEmp: Employee) => {
    setEmployees(prev => prev.map(e => (e.id === updatedEmp.id ? updatedEmp : e)));
    setSelectedEmployee(updatedEmp);
  };

  const accessibleEmployees = filterAccessibleEmployees(employees);

  const filteredEmployees = accessibleEmployees.filter(emp => {
    const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
    const query = (typeof search === 'string' ? search : String(search || '')).toLowerCase();

    const matchesSearch =
      !query ||
      fullName.includes(query) ||
      (emp.work_email && emp.work_email.toLowerCase().includes(query)) ||
      (emp.employee_code && emp.employee_code.toLowerCase().includes(query)) ||
      (emp.designation_title && emp.designation_title.toLowerCase().includes(query));

    const matchesDept = deptFilter === 'ALL' || emp.department_name === deptFilter;
    const matchesStatus = statusFilter === 'ALL' || emp.status === statusFilter;

    return matchesSearch && matchesDept && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'People Directory & Master Profiles' }]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Workforce Master Directory</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Centralized employee database across legal entities, departments, and compensation tiers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasPermission('people', 'create') && (
            <Button onClick={() => setIsCreateOpen(true)} leftIcon={<UserPlus className="w-4 h-4" />}>
              Onboard Employee
            </Button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search employee name, email, code, title..."
              className="w-full bg-gray-50 border border-gray-200 text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-xs rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
            >
              <option value="ALL">All Departments</option>
              <option value="Engineering & Product Development">Engineering & Product</option>
              <option value="Human Resources & People Ops">Human Resources</option>
              <option value="Finance & Legal">Finance & Legal</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-xs rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Probation">Probation</option>
              <option value="On Leave">On Leave</option>
              <option value="Resigned">Resigned</option>
            </select>
          </div>

          <div className="md:col-span-1 flex justify-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSearch('');
                setDeptFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="text-xs text-gray-500"
            >
              Reset
            </Button>
          </div>
        </div>
      </Card>

      {/* Employee List */}
      <EmployeeList
        employees={filteredEmployees}
        onSelectEmployee={emp => {
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
