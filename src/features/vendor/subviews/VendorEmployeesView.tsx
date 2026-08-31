import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/Toast';
import {
  UserPlus,
  Search,
  UserMinus,
} from 'lucide-react';
import { vendorPortalService } from '../../../services/vendorPortalService';
import { VendorOrganization, VendorEmployee, VendorEmployeeStatus } from '../../../types/vendorPortal';

interface VendorEmployeesViewProps {
  activeVendor: VendorOrganization;
  onRefresh: () => void;
}

export const VendorEmployeesView: React.FC<VendorEmployeesViewProps> = ({
  activeVendor,
  onRefresh,
}) => {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEmpForExit, setSelectedEmpForExit] = useState<VendorEmployee | null>(null);
  const [exitReason, setExitReason] = useState('');

  // Form State for Adding Onboarding Employee
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [workerCategory, setWorkerCategory] = useState<VendorEmployee['worker_category']>('Skilled');
  const [skillCategory, setSkillCategory] = useState('CNC Machine Operator');
  const [department, setDepartment] = useState('Production & Manufacturing');
  const [designation, setDesignation] = useState('Machine Operator Grade 1');
  const [uan, setUan] = useState('');
  const [pan, setPan] = useState('');
  const [esicNumber, setEsicNumber] = useState('');
  const [workLocation, setWorkLocation] = useState('Coimbatore Plant 1 - Line B');

  const employees = vendorPortalService.getEmployees(activeVendor.id);

  // Extract unique departments for filter dropdown
  const uniqueDepts = Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));

  const activeCount = employees.filter((e) => e.status === 'ACTIVE').length;
  const pendingCount = employees.filter((e) => e.status === 'PENDING_COMPANY_APPROVAL').length;
  const exitCount = employees.filter((e) => e.status === 'EXIT_REQUESTED').length;

  const filteredEmployees = employees.filter((emp) => {
    const q = search.toLowerCase().trim();
    const matchQuery =
      !q ||
      emp.display_name?.toLowerCase().includes(q) ||
      emp.employee_code?.toLowerCase().includes(q) ||
      emp.first_name?.toLowerCase().includes(q) ||
      emp.last_name?.toLowerCase().includes(q) ||
      emp.designation?.toLowerCase().includes(q) ||
      emp.department?.toLowerCase().includes(q) ||
      emp.skill_category?.toLowerCase().includes(q) ||
      (emp.uan && emp.uan.toLowerCase().includes(q)) ||
      (emp.pan && emp.pan.toLowerCase().includes(q)) ||
      (emp.esic_number && emp.esic_number.toLowerCase().includes(q)) ||
      (emp.mobile && emp.mobile.toLowerCase().includes(q)) ||
      (emp.work_location && emp.work_location.toLowerCase().includes(q)) ||
      (emp.current_client_name && emp.current_client_name.toLowerCase().includes(q));

    const matchStatus = statusFilter === 'ALL' || emp.status === statusFilter;
    const matchCat = categoryFilter === 'ALL' || emp.worker_category === categoryFilter;
    const matchDept = deptFilter === 'ALL' || emp.department === deptFilter;
    return matchQuery && matchStatus && matchCat && matchDept;
  });

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !mobile.trim()) {
      showToast('First Name and Mobile Number are mandatory', 'error');
      return;
    }

    vendorPortalService.addEmployee({
      first_name: firstName,
      last_name: lastName,
      mobile,
      email,
      worker_category: workerCategory,
      skill_category: skillCategory,
      department,
      designation,
      uan,
      pan,
      esic_number: esicNumber,
      work_location: workLocation,
      current_client_id: 'comp-joy-01',
      current_client_name: 'Joy Corporate Solutions Pvt Ltd',
    });

    showToast('Employee onboarding request submitted to Client HR for authorization!', 'success');
    setIsAddModalOpen(false);
    setFirstName('');
    setLastName('');
    setMobile('');
    setEmail('');
    setUan('');
    setPan('');
    setEsicNumber('');
    onRefresh();
  };

  const handleRequestExit = () => {
    if (!selectedEmpForExit) return;
    vendorPortalService.updateEmployeeStatus(
      selectedEmpForExit.id,
      'EXIT_REQUESTED',
      `Vendor initiated employee offboarding/exit: ${exitReason}`
    );
    showToast(`Exit request submitted for ${selectedEmpForExit.display_name}`, 'warning');
    setSelectedEmpForExit(null);
    setExitReason('');
    onRefresh();
  };

  const getStatusBadge = (status: VendorEmployeeStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>;
      case 'PENDING_COMPANY_APPROVAL':
        return <Badge variant="warning">Pending HR Approval</Badge>;
      case 'EXIT_REQUESTED':
        return <Badge variant="danger">Exit Requested</Badge>;
      case 'EXIT_APPROVED':
      case 'INACTIVE':
        return <Badge variant="neutral">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header action bar */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            Assigned Workforce Directory
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Manage contract personnel assigned exclusively to {activeVendor.name} with strict client deployment rules.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setIsAddModalOpen(true)}>
          <UserPlus className="w-4 h-4 mr-1.5" />
          Request Employee Onboarding
        </Button>
      </div>

      {/* Quick Status Pill Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'ALL', label: 'All Workforce', count: employees.length },
          { id: 'ACTIVE', label: 'Active on Site', count: activeCount },
          { id: 'PENDING_COMPANY_APPROVAL', label: 'Pending HR Review', count: pendingCount },
          { id: 'EXIT_REQUESTED', label: 'Exit Requested', count: exitCount },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              statusFilter === tab.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                statusFilter === tab.id ? 'bg-indigo-800 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-4 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search worker name, code, skill, UAN, ESIC, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Skill Categories</option>
              <option value="Highly Skilled">Highly Skilled</option>
              <option value="Skilled">Skilled</option>
              <option value="Semi-Skilled">Semi-Skilled</option>
              <option value="Unskilled">Unskilled</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Departments</option>
              {uniqueDepts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 flex items-center justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                setStatusFilter('ALL');
                setCategoryFilter('ALL');
                setDeptFilter('ALL');
              }}
              className="text-xs text-gray-500 font-bold"
            >
              Reset Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Employees Table */}
      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead className="font-bold text-gray-700 text-xs">Worker / Employee ID</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs">Category & Skill</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs">Client Deployment & Location</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs">Statutory (UAN / ESIC)</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs">Status</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees.map((emp) => (
              <TableRow key={emp.id} className="hover:bg-gray-50/50">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-xs">
                      {emp.first_name[0]}
                      {emp.last_name[0]}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-gray-900">{emp.display_name}</div>
                      <div className="text-[11px] text-gray-500 font-mono">{emp.employee_code}</div>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <div>
                    <span className="text-xs font-semibold text-gray-900 block">{emp.designation}</span>
                    <span className="text-[11px] text-indigo-600 font-medium">{emp.worker_category}</span>
                  </div>
                </TableCell>

                <TableCell>
                  <div>
                    <span className="text-xs font-medium text-gray-900 block">{emp.current_client_name}</span>
                    <span className="text-[11px] text-gray-500">{emp.work_location}</span>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="font-mono text-[11px] text-gray-600">
                    <div>UAN: {emp.uan || 'N/A'}</div>
                    <div className="text-[10px] text-gray-400">ESIC: {emp.esic_number || 'N/A'}</div>
                  </div>
                </TableCell>

                <TableCell>{getStatusBadge(emp.status)}</TableCell>

                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {emp.status === 'ACTIVE' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        onClick={() => setSelectedEmpForExit(emp)}
                      >
                        <UserMinus className="w-3.5 h-3.5 mr-1" />
                        Request Exit
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {filteredEmployees.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Search className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-gray-900">No workforce records found</p>
                      <p className="text-xs text-gray-400 max-w-sm">
                        No assigned contract employees matched your search and filter criteria.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSearch('');
                          setStatusFilter('ALL');
                          setCategoryFilter('ALL');
                          setDeptFilter('ALL');
                        }}
                        className="text-xs font-bold"
                      >
                        Clear Filters
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => setIsAddModalOpen(true)}
                        leftIcon={<UserPlus className="w-3.5 h-3.5" />}
                        className="text-xs font-bold"
                      >
                        Request Onboarding
                      </Button>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Add Employee Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Submit New Employee Onboarding Request"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateEmployee} className="space-y-4 p-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Ramesh"
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Kannan"
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Mobile Number *</label>
              <input
                type="text"
                required
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="+91 98401 22334"
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@contractor.in"
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Worker Category</label>
              <select
                value={workerCategory}
                onChange={(e) => setWorkerCategory(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none"
              >
                <option value="Highly Skilled">Highly Skilled</option>
                <option value="Skilled">Skilled</option>
                <option value="Semi-Skilled">Semi-Skilled</option>
                <option value="Unskilled">Unskilled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Designation</label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">UAN Number</label>
              <input
                type="text"
                value={uan}
                onChange={(e) => setUan(e.target.value)}
                placeholder="12-digit UAN"
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Work Location</label>
              <input
                type="text"
                value={workLocation}
                onChange={(e) => setWorkLocation(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Submit Request to Client HR
            </Button>
          </div>
        </form>
      </Modal>

      {/* Request Exit Modal */}
      <Modal
        isOpen={!!selectedEmpForExit}
        onClose={() => setSelectedEmpForExit(null)}
        title="Submit Employee Exit / Replacement Request"
        maxWidth="md"
      >
        <div className="space-y-4 p-1">
          <p className="text-xs text-gray-600">
            You are requesting the offboarding of <strong>{selectedEmpForExit?.display_name}</strong> (
            {selectedEmpForExit?.employee_code}). Client HR will review and release the site security pass.
          </p>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Reason for Offboarding / Replacement *
            </label>
            <textarea
              rows={3}
              required
              value={exitReason}
              onChange={(e) => setExitReason(e.target.value)}
              placeholder="e.g. Contract completion, voluntary resignation, site reassignment..."
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedEmpForExit(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleRequestExit}>
              Confirm Exit Request
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
