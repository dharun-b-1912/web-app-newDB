import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Breadcrumb } from '../../components/shell/Breadcrumb';
import { useToast } from '../../components/ui/Toast';
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileCheck,
  Send,
  Download,
  Eye,
  PenTool,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { HRDocument, DocumentTemplate } from '../../types';

const initialDocs: HRDocument[] = [
  {
    id: 'DOC-101',
    document_type: 'Identity Proof',
    category: 'Identity',
    employee_id: 'EMP-1024',
    employee_name: 'Anand Viswanathan',
    title: 'Aadhaar & PAN Identity Card Copy',
    file_name: 'anand_pan_aadhaar.pdf',
    file_url: '#',
    file_size: '2.4 MB',
    version: 1,
    issue_date: '2022-01-15',
    expiry_date: '2032-01-15',
    uploaded_at: '2026-08-01',
    uploaded_by: 'Anand Viswanathan',
    verification_status: 'Verified',
    verified_by: 'Dharun Joy (HR Head)',
    verified_at: '2026-08-02',
  },
  {
    id: 'DOC-102',
    document_type: 'Educational Degree',
    category: 'Education',
    employee_id: 'EMP-1025',
    employee_name: 'Priya Sharma',
    title: 'M.Tech Computer Science Degree Certificate',
    file_name: 'priya_mtech_degree.pdf',
    file_url: '#',
    file_size: '4.1 MB',
    version: 1,
    issue_date: '2021-06-20',
    uploaded_at: '2026-08-10',
    uploaded_by: 'Priya Sharma',
    verification_status: 'Pending Verification',
  },
  {
    id: 'DOC-103',
    document_type: 'Passport Copy',
    category: 'Identity',
    employee_id: 'EMP-1028',
    employee_name: 'Sneha Mukherjee',
    title: 'Indian Passport (Pages 1 & 36)',
    file_name: 'sneha_passport.pdf',
    file_url: '#',
    file_size: '1.8 MB',
    version: 1,
    issue_date: '2016-09-01',
    expiry_date: '2026-09-01',
    uploaded_at: '2026-07-15',
    uploaded_by: 'Sneha Mukherjee',
    verification_status: 'Uploaded',
    notes: 'Expiring in less than 30 days — renewal notice required',
  },
];

const initialTemplates: DocumentTemplate[] = [
  {
    id: 'TPL-01',
    title: 'Standard Offer Letter Template',
    type: 'Offer Letter',
    content: `Dear {{employee_name}},\n\nWe are pleased to offer you the position of {{designation}} in the {{department}} department at {{company_name}}. Your joining date is scheduled for {{joining_date}} with an annual CTC of ₹{{ctc}} Lakhs.\n\nBest Regards,\nHR Operations`,
    variables: ['employee_name', 'designation', 'department', 'company_name', 'joining_date', 'ctc'],
    updated_at: '2026-08-01',
  },
  {
    id: 'TPL-02',
    title: 'Employee Confirmation Letter',
    type: 'Confirmation Letter',
    content: `Dear {{employee_name}},\n\nFollowing your probation performance evaluation, we are delighted to confirm your permanent employment as {{designation}} at {{company_name}} effective {{confirmation_date}}.\n\nWarm Congratulations,\nPeople Operations Team`,
    variables: ['employee_name', 'designation', 'company_name', 'confirmation_date'],
    updated_at: '2026-08-05',
  },
  {
    id: 'TPL-03',
    title: 'Service Relieving & Experience Certificate',
    type: 'Relieving Letter',
    content: `TO WHOMSOEVER IT MAY CONCERN\n\nThis is to certify that {{employee_name}} was employed with {{company_name}} as {{designation}} in {{department}} from {{joining_date}} to {{last_working_date}}.\n\nDuring their tenure, we found them dedicated and professional. We wish them success in all future endeavors.`,
    variables: ['employee_name', 'company_name', 'designation', 'department', 'joining_date', 'last_working_date'],
    updated_at: '2026-08-08',
  },
];

export const DocumentManagementView: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'all' | 'verification' | 'templates' | 'esignature'>('all');
  const [documents, setDocuments] = useState<HRDocument[]>(initialDocs);
  const [templates, setTemplates] = useState<DocumentTemplate[]>(initialTemplates);
  const [query, setQuery] = useState('');

  // Modal State
  const [selectedDoc, setSelectedDoc] = useState<HRDocument | null>(null);
  const [selectedTpl, setSelectedTpl] = useState<DocumentTemplate | null>(null);
  const [generateForm, setGenerateForm] = useState({
    employee_name: 'Anand Viswanathan',
    designation: 'Senior Staff Frontend Architect',
    department: 'Engineering',
    company_name: 'Acme Technologies Pvt Ltd',
    joining_date: '2026-09-01',
    ctc: '34.00',
  });
  const [previewContent, setPreviewContent] = useState('');

  const handleVerify = (id: string, action: 'Verified' | 'Rejected') => {
    setDocuments(prev =>
      prev.map(d =>
        d.id === id
          ? {
              ...d,
              verification_status: action,
              verified_by: 'Dharun Joy (HR Head)',
              verified_at: new Date().toISOString().split('T')[0],
            }
          : d
      )
    );
    showToast(`Document ${id} marked as ${action}`);
  };

  const handleGenerateDocument = (tpl: DocumentTemplate) => {
    let text = tpl.content;
    Object.entries(generateForm).forEach(([key, val]) => {
      text = text.replace(new RegExp(`{{${key}}}`, 'g'), String(val));
    });
    setPreviewContent(text);
    setSelectedTpl(tpl);
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'CORE HR' }, { label: 'Document & E-Sign Engine' }]} />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#07563D]" /> Enterprise Document Repository & E-Signature
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Centralized employee record verification, statutory compliance, reusable HR letter templates, and automated document expiry monitoring.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Document upload modal launched')}>
            Upload HR Document
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 space-y-1 bg-white border border-gray-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase">Total Records Tracked</div>
          <div className="text-2xl font-black text-gray-900">1,482</div>
          <div className="text-[11px] text-emerald-700 font-semibold">98.4% Compliance Rate</div>
        </Card>
        <Card className="p-4 space-y-1 bg-white border border-gray-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase">Pending Verification</div>
          <div className="text-2xl font-black text-amber-600">14</div>
          <div className="text-[11px] text-amber-700 font-semibold">Action Required by HR</div>
        </Card>
        <Card className="p-4 space-y-1 bg-white border border-gray-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase">Expiring in 30 Days</div>
          <div className="text-2xl font-black text-red-600">3</div>
          <div className="text-[11px] text-red-600 font-semibold">Passports & Work Permits</div>
        </Card>
        <Card className="p-4 space-y-1 bg-white border border-gray-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase">E-Sign Completed</div>
          <div className="text-2xl font-black text-[#07563D]">312</div>
          <div className="text-[11px] text-emerald-800 font-semibold">Digitally Signed Letters</div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('all')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'all' ? 'border-[#07563D] text-[#07563D]' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          All Employee Documents
        </button>
        <button
          onClick={() => setActiveTab('verification')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'verification' ? 'border-[#07563D] text-[#07563D]' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <span>Verification Queue</span>
          <Badge variant="amber" size="sm">14</Badge>
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'templates' ? 'border-[#07563D] text-[#07563D]' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Document Letter Templates
        </button>
      </div>

      {/* TAB 1: ALL DOCUMENTS */}
      {activeTab === 'all' && (
        <Card className="p-5 space-y-4 bg-white border border-gray-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by title, employee, or ID..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#07563D]"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document Title</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Uploaded / Expiry</TableHead>
                <TableHead>Verification Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map(doc => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="font-bold text-gray-900 text-xs">{doc.title}</div>
                    <div className="text-[11px] text-gray-400">{doc.file_name} ({doc.file_size})</div>
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-gray-800">
                    {doc.employee_name}
                    <div className="text-[10px] text-gray-400">{doc.employee_id}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="neutral" size="sm">{doc.category}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-gray-600">
                    <div>Up: {doc.uploaded_at}</div>
                    {doc.expiry_date && <div className="text-red-600 font-medium">Exp: {doc.expiry_date}</div>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={doc.verification_status === 'Verified' ? 'emerald' : 'amber'} size="sm">
                      {doc.verification_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedDoc(doc)}>
                        <Eye className="w-3.5 h-3.5 text-gray-600" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => showToast(`Downloading ${doc.file_name}...`)}>
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* TAB 2: VERIFICATION QUEUE */}
      {activeTab === 'verification' && (
        <Card className="p-5 space-y-4 bg-white border border-gray-200/80 shadow-xs">
          <h3 className="text-sm font-extrabold text-gray-900">Pending Employee Verification Submissions</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Uploaded On</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents
                .filter(d => d.verification_status === 'Pending Verification' || d.verification_status === 'Uploaded')
                .map(doc => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-bold text-gray-900 text-xs">{doc.title}</TableCell>
                    <TableCell className="text-xs">{doc.employee_name}</TableCell>
                    <TableCell className="text-xs text-gray-500">{doc.uploaded_at}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200" onClick={() => handleVerify(doc.id, 'Rejected')}>
                          Reject
                        </Button>
                        <Button size="sm" onClick={() => handleVerify(doc.id, 'Verified')} leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}>
                          Verify & Approve
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* TAB 3: TEMPLATES */}
      {activeTab === 'templates' && (
        <Card className="p-5 space-y-4 bg-white border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-gray-900">Reusable Enterprise HR Letter Templates</h3>
            <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('New template modal launched')}>
              Create Template
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {templates.map(tpl => (
              <Card key={tpl.id} className="p-4 space-y-3 bg-gray-50/50 border border-gray-200 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <Badge variant="emerald" size="sm">{tpl.type}</Badge>
                    <span className="text-[10px] text-gray-400">{tpl.updated_at}</span>
                  </div>
                  <h4 className="text-xs font-bold text-gray-900 mt-2">{tpl.title}</h4>
                  <p className="text-[11px] text-gray-500 line-clamp-3 mt-1 font-mono bg-white p-2 rounded-lg border border-gray-100">
                    {tpl.content}
                  </p>
                </div>

                <Button size="sm" variant="outline" onClick={() => handleGenerateDocument(tpl)} leftIcon={<Sparkles className="w-3.5 h-3.5" />}>
                  Generate Letter
                </Button>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* TEMPLATE GENERATOR MODAL */}
      {selectedTpl && (
        <Modal isOpen={Boolean(selectedTpl)} onClose={() => setSelectedTpl(null)} title={`Generate ${selectedTpl.title}`} size="xl">
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl">
              <div>
                <label className="text-[10px] font-bold text-gray-500">Employee Name</label>
                <Input value={generateForm.employee_name} onChange={e => setGenerateForm({ ...generateForm, employee_name: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500">Designation</label>
                <Input value={generateForm.designation} onChange={e => setGenerateForm({ ...generateForm, designation: e.target.value })} />
              </div>
            </div>

            <div className="p-4 bg-gray-900 text-gray-100 rounded-xl font-mono text-xs whitespace-pre-wrap leading-relaxed shadow-inner">
              {previewContent}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button variant="outline" onClick={() => setSelectedTpl(null)}>Cancel</Button>
              <Button onClick={() => { showToast('Generated Letter PDF downloaded'); setSelectedTpl(null); }} leftIcon={<Download className="w-4 h-4" />}>
                Export PDF Letter
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
