import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Breadcrumb } from '../../components/shell/Breadcrumb';
import { Briefcase, Plus, Hash, Search, Award, Edit2, Trash2, CheckCircle2, Sparkles } from 'lucide-react';
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
  const [editingDesig, setEditingDesig] = useState<Designation | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [grade, setGrade] = useState('L3 - Mid Level');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    const desgs = await api.getDesignations(activeCompany?.id);
    setDesignations(desgs);
  };

  useEffect(() => {
    loadData();
  }, [activeCompany?.id]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editingDesig) {
      const generatedCode = 'DESG-' + val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5);
      setCode(generatedCode);
    }
  };

  const handleOpenAdd = () => {
    setEditingDesig(null);
    setTitle('');
    setCode('');
    setGrade('L3 - Mid Level');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (desig: Designation) => {
    setEditingDesig(desig);
    setTitle(desig.title);
    setCode(desig.code);
    setGrade(desig.grade || 'L3 - Mid Level');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingDesig) {
        const updated = await api.updateDesignation(editingDesig.id, {
          title: title.trim(),
          code: code.trim() || 'DESG',
          grade,
          company_id: activeCompany?.id || 'comp-joy-01',
        });
        setDesignations(prev => prev.map(d => d.id === updated.id ? updated : d));
        showToast(`Designation '${updated.title}' updated successfully!`, 'success');
      } else {
        const created = await api.createDesignation({
          company_id: activeCompany?.id || 'comp-joy-01',
          title: title.trim(),
          code: code.trim() || 'DESG',
          grade,
        });
        setDesignations(prev => [created, ...prev.filter(d => d.id !== created.id)]);
        showToast(`Designation '${created.title}' added!`, 'success');
      }
      setIsModalOpen(false);
      setTitle('');
      setCode('');
      setEditingDesig(null);
    } catch {
      showToast('Failed to save designation', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, desigTitle: string) => {
    if (!window.confirm(`Are you sure you want to remove '${desigTitle}' from the catalog?`)) return;
    try {
      await api.deleteDesignation(id);
      setDesignations(prev => prev.filter(d => d.id !== id));
      showToast(`Designation '${desigTitle}' removed.`, 'info');
    } catch {
      showToast('Failed to delete designation', 'error');
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
            Standardized job titles, grade levels (L1 - L8), and position codes across {activeCompany?.legal_name || 'Organization'}.
          </p>
        </div>
        <Button onClick={handleOpenAdd} leftIcon={<Plus className="w-4 h-4" />}>
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
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-gray-400 text-xs">
                No designations cataloged yet.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map(desg => (
              <TableRow key={desg.id}>
                <TableCell>
                  <div className="font-bold text-gray-900">{desg.title}</div>
                </TableCell>
                <TableCell className="font-mono text-xs text-gray-600">{desg.code}</TableCell>
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
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(desg)}
                      className="p-1.5 text-gray-400 hover:text-[#07563D] hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                      title="Edit designation"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(desg.id, desg.title)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete designation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDesig ? 'Edit Designation' : 'Add Designation'}
        description="Catalog a job title and assign an enterprise grade level"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Designation Title"
            placeholder="e.g. Senior Software Engineer"
            value={title}
            onChange={e => handleTitleChange(e.target.value)}
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
              className="w-full bg-white border border-gray-300 text-gray-900 text-xs font-semibold rounded-xl p-2.5 focus:ring-[#07563D] focus:border-[#07563D]"
            >
              <option value="L1 - Entry Level">L1 - Entry Level</option>
              <option value="L2 - Associate">L2 - Associate</option>
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
            <Button type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? 'Saving...' : editingDesig ? 'Update Designation' : 'Save Designation'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
