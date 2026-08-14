import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Breadcrumb } from '../../components/shell/Breadcrumb';
import { Layers, Plus, Users, Shield, Hash, Search, CornerDownRight } from 'lucide-react';
import { Department } from '../../types';
import { api } from '../../services/api';
import { useTenant } from '../../hooks/useTenant';
import { useToast } from '../../components/ui/Toast';

export const DepartmentView: React.FC = () => {
  const { activeCompany } = useTenant();
  const { showToast } = useToast();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New department state
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [parentDeptId, setParentDeptId] = useState('');
  const [costCenter, setCostCenter] = useState('');

  const loadData = async () => {
    if (!activeCompany) return;
    const depts = await api.getDepartments(activeCompany.id);
    setDepartments(depts);
  };

  useEffect(() => {
    loadData();
  }, [activeCompany?.id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName || !deptCode || !activeCompany) return;

    try {
      const created = await api.createDepartment({
        company_id: activeCompany.id,
        name: deptName,
        code: deptCode,
        parent_department_id: parentDeptId || null,
        cost_center_code: costCenter || `CC-${Math.floor(100 + Math.random() * 900)}`,
      });
      setDepartments(prev => [...prev, created]);
      showToast(`Department '${created.name}' created!`);
      setIsModalOpen(false);
      setDeptName('');
      setDeptCode('');
      setParentDeptId('');
      setCostCenter('');
    } catch {
      showToast('Failed to create department', 'error');
    }
  };

  const filtered = departments.filter(
    d =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Organization', href: '#' },
          { label: 'Department Structure' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Department Hierarchy</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure functional departments, parent-child sub-departments, and cost centers for {activeCompany?.legal_name}.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
          Add Department
        </Button>
      </div>

      {/* Search & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#07563D] flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">{departments.length}</div>
            <div className="text-[11px] text-gray-400 font-medium">Total Departments</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <CornerDownRight className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">
              {departments.filter(d => d.parent_department_id).length}
            </div>
            <div className="text-[11px] text-gray-400 font-medium">Sub-Departments</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3 md:col-span-2">
          <div className="w-full relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search department name or code..."
              className="w-full bg-gray-50 border border-gray-200 text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
            />
          </div>
        </Card>
      </div>

      {/* Department Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Department Name</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Parent Hierarchy</TableHead>
            <TableHead>Cost Center</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-gray-400 text-xs">
                No departments found. Create your first department above.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map(dept => {
              const parent = departments.find(p => p.id === dept.parent_department_id);
              return (
                <TableRow key={dept.id}>
                  <TableCell>
                    <div className="font-bold text-gray-900 flex items-center gap-2">
                      {dept.parent_department_id && <CornerDownRight className="w-3.5 h-3.5 text-gray-400" />}
                      {dept.name}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{dept.code}</TableCell>
                  <TableCell className="text-xs text-gray-600">
                    {parent ? (
                      <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded text-[11px]">
                        {parent.name}
                      </span>
                    ) : (
                      <span className="text-gray-400">Root Level</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-emerald-800">{dept.cost_center_code}</TableCell>
                  <TableCell>
                    <Badge variant="emerald" size="sm">
                      Active
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* Modal: Add Department */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Department"
        description="Define a new functional department or sub-department"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Department Name"
            placeholder="e.g. Talent Acquisition"
            value={deptName}
            onChange={e => setDeptName(e.target.value)}
            required
          />

          <Input
            label="Department Code"
            placeholder="e.g. DEPT-TA"
            value={deptCode}
            onChange={e => setDeptCode(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Parent Department (Optional)</label>
            <select
              value={parentDeptId}
              onChange={e => setParentDeptId(e.target.value)}
              className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 focus:ring-[#07563D] focus:border-[#07563D]"
            >
              <option value="">None (Root Department)</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Cost Center Code"
            placeholder="e.g. CC-401"
            value={costCenter}
            onChange={e => setCostCenter(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Department</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
