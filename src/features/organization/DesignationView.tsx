import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Breadcrumb } from '../../components/shell/Breadcrumb';
import { Briefcase, Plus, Hash, Search, Award } from 'lucide-react';
import { Designation } from '../../types';
import { api } from '../../services/api';
import { useTenant } from '../../hooks/useTenant';
import { useToast } from '../../components/ui/Toast';

export const DesignationView: React.FC = () => {
  const { activeCompany } = useTenant();
  const { showToast } = useToast();

  const [designations, setDesignations] = useState<Designation[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [grade, setGrade] = useState('L3 - Mid Level');

  const loadData = async () => {
    if (!activeCompany) return;
    const desgs = await api.getDesignations(activeCompany.id);
    setDesignations(desgs);
  };

  useEffect(() => {
    loadData();
  }, [activeCompany?.id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !code || !activeCompany) return;

    try {
      const created = await api.createDesignation({
        company_id: activeCompany.id,
        title,
        code,
        grade,
      });
      setDesignations(prev => [...prev, created]);
      showToast(`Designation '${created.title}' added!`);
      setIsModalOpen(false);
      setTitle('');
      setCode('');
    } catch {
      showToast('Failed to add designation', 'error');
    }
  };

  const filtered = designations.filter(
    d =>
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.code.toLowerCase().includes(search.toLowerCase()) ||
      (d.grade && d.grade.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Organization', href: '#' },
          { label: 'Designation Catalog' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Designation & Job Grade Catalog</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Standardized job titles, grade levels (L1 - L8), and position codes across {activeCompany?.legal_name}.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
          Add Designation
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#07563D] flex items-center justify-center font-bold">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">{designations.length}</div>
            <div className="text-[11px] text-gray-400 font-medium">Designation Titles</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#07563D]/10 text-[#07563D] flex items-center justify-center font-bold">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">8 Levels</div>
            <div className="text-[11px] text-gray-400 font-medium">Job Level Bands (L1-L8)</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3 md:col-span-2">
          <div className="w-full relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search job title, code, grade..."
              className="w-full bg-gray-50 border border-gray-200 text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
            />
          </div>
        </Card>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Job Title / Designation</TableHead>
            <TableHead>Designation Code</TableHead>
            <TableHead>Job Grade Level</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8 text-gray-400 text-xs">
                No designations cataloged yet.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map(desg => (
              <TableRow key={desg.id}>
                <TableCell>
                  <div className="font-bold text-gray-900">{desg.title}</div>
                </TableCell>
                <TableCell className="font-mono text-xs">{desg.code}</TableCell>
                <TableCell>
                  <Badge variant="emerald" size="sm">
                    {desg.grade || 'L3 - Mid Level'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="emerald" size="sm">
                    Active
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Designation"
        description="Catalog a new job title and assign a grade level"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Designation Title"
            placeholder="e.g. Senior Software Engineer"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />

          <Input
            label="Designation Code"
            placeholder="e.g. DESG-SSE"
            value={code}
            onChange={e => setCode(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Job Grade Level</label>
            <select
              value={grade}
              onChange={e => setGrade(e.target.value)}
              className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 focus:ring-[#07563D] focus:border-[#07563D]"
            >
              <option value="L1 - Associate Entry">L1 - Associate Entry</option>
              <option value="L2 - Professional">L2 - Professional</option>
              <option value="L3 - Mid Level">L3 - Mid Level</option>
              <option value="L4 - Senior Specialist">L4 - Senior Specialist</option>
              <option value="L5 - Lead / Manager">L5 - Lead / Manager</option>
              <option value="L6 - Senior Manager">L6 - Senior Manager</option>
              <option value="L7 - Director">L7 - Director</option>
              <option value="L8 - VP / Executive">L8 - VP / Executive</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Designation</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
