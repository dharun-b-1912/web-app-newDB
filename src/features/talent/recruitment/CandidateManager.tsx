import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';
import { Drawer } from '../../../components/ui/Drawer';
import { Tabs } from '../../../components/ui/Tabs';
import { Modal } from '../../../components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import {
  Users,
  Search,
  Filter,
  Plus,
  FileText,
  Star,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Calendar,
  Clock,
  Send,
  MessageSquare,
  Award,
  Download,
  Eye,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { atsService } from '../../../services/atsService';
import { Candidate, CandidateStatus } from '../../../types/ats';
import { useToast } from '../../../components/ui/Toast';

export const CandidateManager: React.FC<{ onScheduleInterview?: (candidateId: string) => void }> = ({ onScheduleInterview }) => {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [profileTab, setProfileTab] = useState('overview');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const candidates = atsService.getCandidates();
  const applications = atsService.getApplications();
  const interviews = atsService.getInterviews();
  const offers = atsService.getOffers();

  // Form for New Candidate
  const [newCand, setNewCand] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    location: 'Coimbatore, TN',
    current_company: '',
    current_title: '',
    total_experience_years: 5,
    expected_salary: 2200000,
    notice_period_days: 30,
    skills: 'React, TypeScript, Node.js',
    source: 'LinkedIn',
  });

  const handleCreateCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    const created = atsService.createCandidate({
      first_name: newCand.first_name,
      last_name: newCand.last_name,
      email: newCand.email,
      phone: newCand.phone,
      location: newCand.location,
      current_company: newCand.current_company,
      current_title: newCand.current_title,
      total_experience_years: Number(newCand.total_experience_years),
      expected_salary: Number(newCand.expected_salary),
      notice_period_days: Number(newCand.notice_period_days),
      skills: newCand.skills.split(',').map(s => s.trim()),
      source: newCand.source,
    });

    showToast(`Candidate ${created.full_name} registered in ATS database!`);
    setIsAddModalOpen(false);
  };

  const filteredCandidates = candidates.filter(c => {
    const matchesSearch =
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.skills.some(s => s.toLowerCase().includes(search.toLowerCase()));
    const matchesStage = stageFilter === 'ALL' || c.status === stageFilter;
    return matchesSearch && matchesStage;
  });

  // Data for selected candidate's profile
  const candidateApps = selectedCandidate ? applications.filter(a => a.candidate_id === selectedCandidate.id) : [];
  const candidateIntvs = selectedCandidate ? interviews.filter(i => i.candidate_id === selectedCandidate.id) : [];
  const candidateOffers = selectedCandidate ? offers.filter(o => o.candidate_id === selectedCandidate.id) : [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-[#07563D]" /> Centralized Candidate Database
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Maintain master candidate profiles, multiple job applications, resume documents, and timeline history
          </p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsAddModalOpen(true)}>
          Register Candidate
        </Button>
      </div>

      {/* Filter and Search */}
      <Card className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search candidate name, email, skills..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Lifecycle Stages' },
              { value: 'New', label: 'New' },
              { value: 'Screening', label: 'Screening' },
              { value: 'Shortlisted', label: 'Shortlisted' },
              { value: 'Interview', label: 'Interview' },
              { value: 'Selected', label: 'Selected' },
              { value: 'Offer', label: 'Offer' },
              { value: 'Offer Accepted', label: 'Offer Accepted' },
              { value: 'Joined', label: 'Joined' },
              { value: 'Rejected', label: 'Rejected' },
            ]}
          />
        </div>
      </Card>

      {/* Candidates Table */}
      <Card className="p-6 bg-white rounded-2xl border border-gray-100 shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidate & Contact</TableHead>
              <TableHead>Current Role & Exp</TableHead>
              <TableHead>Top Skills</TableHead>
              <TableHead>Notice & Expected Salary</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCandidates.map(c => (
              <TableRow key={c.id}>
                <TableCell>
                  <div className="font-bold text-gray-900 text-sm">{c.full_name}</div>
                  <div className="text-xs text-gray-500">{c.email} • {c.phone}</div>
                </TableCell>
                <TableCell>
                  <div className="text-xs font-semibold text-gray-800">{c.current_title || 'Software Developer'}</div>
                  <div className="text-[11px] text-gray-500">{c.total_experience_years} Years Exp • {c.location}</div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {(c.skills || []).slice(0, 3).map((s, idx) => (
                      <Badge key={idx} variant="neutral" size="sm">
                        {s}
                      </Badge>
                    ))}
                    {c.skills && c.skills.length > 3 && <span className="text-[10px] text-gray-500">+{c.skills.length - 3}</span>}
                  </div>
                </TableCell>
                <TableCell className="text-xs font-semibold text-gray-800">
                  {c.notice_period_days} Days Notice • ₹{(c.expected_salary / 100000).toFixed(1)}L
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-xs font-extrabold text-amber-600">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {c.rating}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={c.status === 'Joined' || c.status === 'Offer Accepted' ? 'emerald' : 'amber'} size="sm">
                    {c.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => { setSelectedCandidate(c); setProfileTab('overview'); }}>
                    Profile
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* RICH CANDIDATE PROFILE DRAWER */}
      {selectedCandidate && (
        <Drawer
          isOpen={Boolean(selectedCandidate)}
          onClose={() => setSelectedCandidate(null)}
          title={`Candidate Profile: ${selectedCandidate.full_name} (${selectedCandidate.candidate_number})`}
          size="lg"
        >
          <div className="space-y-6">
            {/* Candidate Header Card */}
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-gray-900">{selectedCandidate.full_name}</h3>
                <div className="text-xs text-gray-600 mt-1 flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-emerald-700" /> {selectedCandidate.email}</span>
                  <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-emerald-700" /> {selectedCandidate.phone}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-emerald-700" /> {selectedCandidate.location}</span>
                </div>
              </div>
              <Badge variant="emerald" size="sm">
                Status: {selectedCandidate.status}
              </Badge>
            </div>

            {/* Profile Tabs */}
            <Tabs
              tabs={[
                { id: 'overview', label: 'Overview' },
                { id: 'resume', label: 'Resume & Docs' },
                { id: 'applications', label: `Applications (${candidateApps.length})` },
                { id: 'interviews', label: `Interviews (${candidateIntvs.length})` },
                { id: 'offers', label: `Offers (${candidateOffers.length})` },
                { id: 'timeline', label: 'Timeline & History' },
              ]}
              activeTab={profileTab}
              onChange={setProfileTab}
            />

            {/* TAB CONTENT */}
            {profileTab === 'overview' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
                  <div>
                    <span className="font-bold text-gray-500">Current Title:</span>
                    <p className="font-bold text-gray-900 text-sm">{selectedCandidate.current_title || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-bold text-gray-500">Current Company:</span>
                    <p className="font-bold text-gray-900 text-sm">{selectedCandidate.current_company || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-bold text-gray-500">Total Experience:</span>
                    <p className="font-bold text-gray-900">{selectedCandidate.total_experience_years} Years</p>
                  </div>
                  <div>
                    <span className="font-bold text-gray-500">Notice Period:</span>
                    <p className="font-bold text-gray-900">{selectedCandidate.notice_period_days} Days</p>
                  </div>
                  <div>
                    <span className="font-bold text-gray-500">Expected Salary:</span>
                    <p className="font-bold text-emerald-800">₹{(selectedCandidate.expected_salary / 100000).toFixed(2)} Lakhs</p>
                  </div>
                  <div>
                    <span className="font-bold text-gray-500">Source:</span>
                    <p className="font-bold text-gray-900">{selectedCandidate.source}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-extrabold text-gray-900 mb-1">Skills Profile:</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedCandidate.skills || []).map((s, idx) => (
                      <Badge key={idx} variant="emerald" size="sm">{s}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {profileTab === 'resume' && (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-[#07563D]" />
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{selectedCandidate.resume_name || 'Candidate_Resume.pdf'}</div>
                      <div className="text-[11px] text-gray-500">PDF Document • Uploaded via {selectedCandidate.source}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" leftIcon={<Eye className="w-3.5 h-3.5" />} onClick={() => showToast('Previewing PDF Resume')}>
                      Preview
                    </Button>
                    <Button size="sm" leftIcon={<Download className="w-3.5 h-3.5" />} onClick={() => showToast('Downloading Resume PDF')}>
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {profileTab === 'applications' && (
              <div className="space-y-3 text-xs">
                {candidateApps.map(app => (
                  <div key={app.id} className="p-4 rounded-xl border border-gray-200 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-gray-900 text-sm">{app.job_title}</span>
                      <Badge variant="emerald" size="sm">{app.current_stage}</Badge>
                    </div>
                    <div className="text-gray-600">
                      Screening Match Score: <span className="font-bold text-emerald-700">{app.screening_score}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {profileTab === 'timeline' && (
              <div className="p-4 rounded-xl bg-gray-50 space-y-3 text-xs">
                <div className="font-extrabold text-gray-900">Activity Timeline Log:</div>
                <div className="p-3 bg-white rounded-lg border border-gray-200 text-gray-700 font-mono text-[11px]">
                  {selectedCandidate.last_activity}
                </div>
              </div>
            )}
          </div>
        </Drawer>
      )}

      {/* REGISTER CANDIDATE MODAL */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Register New Candidate" size="md">
        <form onSubmit={handleCreateCandidate} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-gray-700">First Name *</label>
              <Input value={newCand.first_name} onChange={e => setNewCand({ ...newCand, first_name: e.target.value })} required />
            </div>
            <div>
              <label className="font-bold text-gray-700">Last Name *</label>
              <Input value={newCand.last_name} onChange={e => setNewCand({ ...newCand, last_name: e.target.value })} required />
            </div>
            <div>
              <label className="font-bold text-gray-700">Email Address *</label>
              <Input type="email" value={newCand.email} onChange={e => setNewCand({ ...newCand, email: e.target.value })} required />
            </div>
            <div>
              <label className="font-bold text-gray-700">Phone *</label>
              <Input value={newCand.phone} onChange={e => setNewCand({ ...newCand, phone: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="font-bold text-gray-700">Skills (Comma separated)</label>
            <Input value={newCand.skills} onChange={e => setNewCand({ ...newCand, skills: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <Button variant="outline" type="button" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Candidate</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
