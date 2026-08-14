import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { Award, Plus, FileText, CheckCircle2, XCircle, Clock, Eye, Download, UserCheck, Sparkles } from 'lucide-react';
import { atsService } from '../../../services/atsService';
import { OfferLetter } from '../../../types/ats';
import { useToast } from '../../../components/ui/Toast';

export const OfferManager: React.FC<{ onConvertCandidate?: (candidateId: string) => void }> = ({ onConvertCandidate }) => {
  const { showToast } = useToast();
  const offers = atsService.getOffers();
  const candidates = atsService.getCandidates();
  const jobs = atsService.getJobs();

  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<OfferLetter | null>(null);

  const [form, setForm] = useState({
    candidate_id: candidates[0]?.id || '',
    job_id: jobs[0]?.id || '',
    annual_ctc: 2400000,
    basic_salary: 1200000,
    hra: 480000,
    joining_bonus: 200000,
    joining_date: '2026-10-01',
    valid_until: '2026-08-30',
  });

  const handleCreateOffer = (e: React.FormEvent) => {
    e.preventDefault();
    const cand = candidates.find(c => c.id === form.candidate_id);
    const job = jobs.find(j => j.id === form.job_id);

    try {
      const created = atsService.createOffer({
        application_id: 'app-01',
        candidate_id: form.candidate_id,
        candidate_name: cand?.full_name || 'Candidate',
        candidate_email: cand?.email || 'cand@example.com',
        job_id: form.job_id,
        job_title: job?.job_title || 'Software Role',
        designation_title: job?.job_title || 'Senior Software Engineer',
        department_name: 'Engineering',
        offered_annual_ctc: Number(form.annual_ctc),
        ctc_breakdown: {
          basic_salary: Number(form.basic_salary),
          hra: Number(form.hra),
          special_allowance: 400000,
          performance_bonus: 120000,
          joining_bonus: Number(form.joining_bonus),
          gratuity: 50000,
          employer_pf: 150000,
          total_ctc: Number(form.annual_ctc),
        },
        offered_joining_date: form.joining_date,
        valid_until: form.valid_until,
      });

      showToast(`Offer letter ${created.id} generated!`);
      setIsGenerateOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Error generating offer');
    }
  };

  const handleUpdateStatus = (offerId: string, status: any) => {
    atsService.updateOfferStatus(offerId, status);
    showToast(`Offer ${offerId} status updated to ${status}`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <Award className="w-5 h-5 text-[#07563D]" /> Offer Management & CTC Calculator Engine
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Build structured CTC offer packages, generate PDF preview letters, handle version revisions (v1/v2/v3), and trigger employee conversion
          </p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsGenerateOpen(true)}>
          Generate Offer Package
        </Button>
      </div>

      {/* Offers Table */}
      <Card className="p-6 bg-white rounded-2xl border border-gray-100 shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Offer ID & Version</TableHead>
              <TableHead>Candidate & Role</TableHead>
              <TableHead>Offered CTC</TableHead>
              <TableHead>Joining Bonus</TableHead>
              <TableHead>Joining Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {offers.map(off => (
              <TableRow key={off.id}>
                <TableCell>
                  <div className="font-mono text-xs font-bold text-gray-900">{off.id}</div>
                  <Badge variant="neutral" size="sm">v{off.version}</Badge>
                </TableCell>
                <TableCell>
                  <div className="font-bold text-gray-900 text-sm">{off.candidate_name}</div>
                  <div className="text-xs text-gray-500">{off.job_title}</div>
                </TableCell>
                <TableCell className="text-xs font-black text-emerald-800">
                  ₹{(((off.offered_annual_ctc || off.ctc || 0)) / 100000).toFixed(2)} Lakhs / Yr
                </TableCell>
                <TableCell className="text-xs font-semibold text-gray-800">
                  ₹{(((off.ctc_breakdown?.joining_bonus || off.joining_bonus || 0)) / 100000).toFixed(2)} Lakhs
                </TableCell>
                <TableCell className="text-xs font-medium text-gray-700">{off.offered_joining_date || off.joining_date}</TableCell>
                <TableCell>
                  <Badge variant={off.status === 'Accepted' ? 'emerald' : off.status === 'Sent' ? 'amber' : 'neutral'} size="sm">
                    {off.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedOffer(off)}>
                    CTC Breakdown
                  </Button>
                  {off.status === 'Sent' && (
                    <Button size="sm" onClick={() => handleUpdateStatus(off.id, 'Accepted')}>
                      Mark Accepted
                    </Button>
                  )}
                  {off.status === 'Accepted' && onConvertCandidate && (
                    <Button size="sm" leftIcon={<UserCheck className="w-3.5 h-3.5" />} onClick={() => onConvertCandidate(off.candidate_id)}>
                      Convert to Employee
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* GENERATE OFFER MODAL */}
      <Modal isOpen={isGenerateOpen} onClose={() => setIsGenerateOpen(false)} title="Generate Compensation & Offer Package" size="lg">
        <form onSubmit={handleCreateOffer} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-gray-700">Candidate *</label>
              <Select
                value={form.candidate_id}
                onChange={e => setForm({ ...form, candidate_id: e.target.value })}
                options={candidates.map(c => ({ value: c.id, label: `${c.full_name} (${c.email})` }))}
              />
            </div>
            <div>
              <label className="font-bold text-gray-700">Job Position *</label>
              <Select
                value={form.job_id}
                onChange={e => setForm({ ...form, job_id: e.target.value })}
                options={jobs.map(j => ({ value: j.id, label: j.job_title }))}
              />
            </div>
            <div>
              <label className="font-bold text-gray-700">Annual CTC (INR) *</label>
              <Input type="number" value={form.annual_ctc} onChange={e => setForm({ ...form, annual_ctc: Number(e.target.value) })} required />
            </div>
            <div>
              <label className="font-bold text-gray-700">Joining Bonus (INR)</label>
              <Input type="number" value={form.joining_bonus} onChange={e => setForm({ ...form, joining_bonus: Number(e.target.value) })} />
            </div>
            <div>
              <label className="font-bold text-gray-700">Expected Joining Date</label>
              <Input type="date" value={form.joining_date} onChange={e => setForm({ ...form, joining_date: e.target.value })} />
            </div>
            <div>
              <label className="font-bold text-gray-700">Offer Validity Expiry</label>
              <Input type="date" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <Button variant="outline" type="button" onClick={() => setIsGenerateOpen(false)}>Cancel</Button>
            <Button type="submit">Generate Offer Letter</Button>
          </div>
        </form>
      </Modal>

      {/* CTC BREAKDOWN INSPECTOR MODAL */}
      {selectedOffer && (() => {
        const ctcVal = selectedOffer.offered_annual_ctc || selectedOffer.ctc || 0;
        const basicSalaryVal = selectedOffer.ctc_breakdown?.basic_salary ?? Math.round(ctcVal * 0.5);
        const hraVal = selectedOffer.ctc_breakdown?.hra ?? Math.round(ctcVal * 0.2);
        const specialAllowanceVal = selectedOffer.ctc_breakdown?.special_allowance ?? Math.round(ctcVal * 0.15);
        const performanceBonusVal = selectedOffer.ctc_breakdown?.performance_bonus ?? selectedOffer.variable_pay ?? 0;
        const joiningBonusVal = selectedOffer.ctc_breakdown?.joining_bonus ?? selectedOffer.joining_bonus ?? 0;
        const employerPfVal = selectedOffer.ctc_breakdown?.employer_pf ?? Math.round(ctcVal * 0.05);
        const gratuityVal = selectedOffer.ctc_breakdown?.gratuity ?? Math.round(ctcVal * 0.02);

        return (
          <Modal isOpen={Boolean(selectedOffer)} onClose={() => setSelectedOffer(null)} title={`CTC Component Breakdown: ${selectedOffer.candidate_name}`} size="lg">
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between text-[#07563D]">
                <div>
                  <span className="font-bold text-[10px] uppercase">Annual Compensation Package:</span>
                  <p className="text-xl font-black">₹{(ctcVal / 100000).toFixed(2)} Lakhs</p>
                </div>
                <Badge variant="emerald" size="sm">
                  Status: {selectedOffer.status}
                </Badge>
              </div>

              <div className="space-y-2">
                <h4 className="font-extrabold text-gray-900">Fixed & Variable Component Matrix:</h4>
                <div className="grid grid-cols-2 gap-2 bg-gray-50 p-4 rounded-xl">
                  <div><span>Basic Salary:</span> <strong className="float-right">₹{basicSalaryVal.toLocaleString()}</strong></div>
                  <div><span>House Rent Allowance (HRA):</span> <strong className="float-right">₹{hraVal.toLocaleString()}</strong></div>
                  <div><span>Special Allowance:</span> <strong className="float-right">₹{specialAllowanceVal.toLocaleString()}</strong></div>
                  <div><span>Performance Bonus:</span> <strong className="float-right">₹{performanceBonusVal.toLocaleString()}</strong></div>
                  <div><span>Joining Bonus:</span> <strong className="float-right text-emerald-800">₹{joiningBonusVal.toLocaleString()}</strong></div>
                  <div><span>Employer PF & Gratuity:</span> <strong className="float-right">₹{(employerPfVal + gratuityVal).toLocaleString()}</strong></div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setSelectedOffer(null)}>Close</Button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};
