// src/features/talent/recruitment/OfferDetailDrawer.tsx
// ============================================================================
// WorkForceOS — Offer Deep Inspector & Lifecycle Management Drawer
// Overview, Compensation Breakdown, A4 Document, Approval Chain, E-Sign & Conversion
// ============================================================================

import React, { useState } from 'react';
import { Drawer } from '../../../components/ui/Drawer';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';
import { useToast } from '../../../components/ui/Toast';
import {
  Award,
  DollarSign,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  FileText,
  User,
  Building2,
  Clock,
  Send,
  UserCheck,
  XCircle,
  ExternalLink,
  Lock,
  Plug,
  Sparkles,
} from 'lucide-react';
import { Offer, OfferApproval } from '../../../types/ats';
import { offerManagementService } from '../../../services/recruitment/offerManagementService';
import { cn } from '../../../lib/utils';

interface Props {
  offer: Offer | null;
  isOpen: boolean;
  onClose: () => void;
  onOfferUpdated: () => void;
}

export const OfferDetailDrawer: React.FC<Props> = ({
  offer,
  isOpen,
  onClose,
  onOfferUpdated,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'compensation' | 'document' | 'approvals' | 'activity' | 'integrations'>('overview');
  const [isApproving, setIsApproving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  if (!offer) return null;

  const handleApproveStep = async (stepOrder: number) => {
    setIsApproving(true);
    try {
      await offerManagementService.approveOfferStep(offer.id, stepOrder, 'Approved terms and budget', 'HR Head');
      showToast('Offer approval confirmed!');
      onOfferUpdated();
    } catch {
      showToast('Error approving offer', 'error');
    } finally {
      setIsApproving(false);
    }
  };

  const handleSendEsign = async () => {
    setIsSending(true);
    try {
      await offerManagementService.sendOfferForEsign(offer.id);
      showToast(`E-Signature envelope dispatched to ${offer.candidate_email}!`);
      onOfferUpdated();
    } catch {
      showToast('Error dispatching e-signature', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleSimulateCandidateSignature = async () => {
    setIsSigning(true);
    try {
      await offerManagementService.simulateCandidateSignature(offer.id);
      showToast('Candidate signature confirmed via webhook! Offer is now Accepted.');
      onOfferUpdated();
    } catch {
      showToast('Error verifying candidate signature', 'error');
    } finally {
      setIsSigning(false);
    }
  };

  const handleConvertToEmployee = async () => {
    setIsConverting(true);
    try {
      const emp = await offerManagementService.convertCandidateToEmployee(offer.candidate_id, offer.id);
      showToast(`Candidate successfully converted to Employee (${emp.employee_code}) in Core HR!`);
      onOfferUpdated();
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Error converting candidate to employee', 'error');
    } finally {
      setIsConverting(false);
    }
  };

  const ctcFormatted = (offer.ctc_annual || 1800000).toLocaleString();

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Offer ${offer.id} — ${offer.candidate_name}`}
      subtitle={`${offer.job_title} • ${offer.department_name}`}
      width="2xl"
    >
      <div className="p-6 space-y-6">
        {/* Top Header Summary Card */}
        <Card className="p-5 bg-gradient-to-br from-emerald-50/70 via-white to-emerald-100/30 border border-emerald-200/80 rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-gray-400">{offer.id}</span>
                <Badge
                  variant={
                    offer.status === 'Accepted'
                      ? 'emerald'
                      : offer.status === 'Sent'
                      ? 'blue'
                      : offer.status === 'Declined' || offer.status === 'Revoked'
                      ? 'rose'
                      : 'amber'
                  }
                  className="text-[10px]"
                >
                  {offer.status}
                </Badge>
              </div>
              <h3 className="text-xl font-black text-gray-900 mt-1">
                INR {ctcFormatted} <span className="text-xs text-gray-500 font-normal">/ annum</span>
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">
                Target Joining: <strong className="text-gray-900">{offer.joining_date}</strong> • Reporting to: <strong className="text-gray-900">{offer.reporting_manager_name}</strong>
              </p>
            </div>

            {/* Quick Action Button */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              {offer.status === 'Accepted' && (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isConverting || offer.preboarding_status === 'Completed'}
                  onClick={handleConvertToEmployee}
                  className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1.5 rounded-xl shadow-xs"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  {offer.preboarding_status === 'Completed' ? 'Converted to Employee' : isConverting ? 'Converting...' : 'Convert to Employee'}
                </Button>
              )}

              {offer.status === 'Approved' && (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isSending}
                  onClick={handleSendEsign}
                  className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1.5 rounded-xl shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSending ? 'Dispatching...' : 'Dispatch E-Sign'}
                </Button>
              )}

              {offer.status === 'Sent' && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isSigning}
                  onClick={handleSimulateCandidateSignature}
                  className="text-emerald-700 border-emerald-300 text-xs gap-1.5 rounded-xl"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isSigning ? 'Verifying...' : 'Simulate E-Sign Acceptance'}
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 border-b border-gray-200 pb-2 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'compensation', label: 'Compensation Breakup' },
            { id: 'document', label: 'Offer Document' },
            { id: 'approvals', label: 'Approvals' },
            { id: 'activity', label: 'Timeline & Audit' },
            { id: 'integrations', label: 'E-Sign & Integrations' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-[#07563D] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4 rounded-2xl border-gray-200/80">
                <span className="text-[10px] font-bold uppercase text-gray-400">Candidate Information</span>
                <p className="text-xs font-bold text-gray-900 mt-1">{offer.candidate_name}</p>
                <p className="text-[11px] text-gray-500">{offer.candidate_email} • {offer.candidate_phone}</p>
              </Card>

              <Card className="p-4 rounded-2xl border-gray-200/80">
                <span className="text-[10px] font-bold uppercase text-gray-400">Position Details</span>
                <p className="text-xs font-bold text-gray-900 mt-1">{offer.job_title}</p>
                <p className="text-[11px] text-gray-500">{offer.department_name} • {offer.location_name || 'Coimbatore'}</p>
              </Card>
            </div>

            <Card className="p-4 rounded-2xl border-gray-200/80 space-y-3">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Employment Governance</h4>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase">Probation Period</span>
                  <div className="font-bold text-gray-900 mt-0.5">{offer.probation_months} Months</div>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase">Notice Period</span>
                  <div className="font-bold text-gray-900 mt-0.5">{offer.notice_period_days} Days</div>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase">Offer Validity</span>
                  <div className="font-bold text-gray-900 mt-0.5">{offer.offer_expiry_date || '7 Days'}</div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Tab 2: Compensation */}
        {activeTab === 'compensation' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Itemized Compensation Schedule</h4>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                  <tr>
                    <th className="p-3">Component</th>
                    <th className="p-3 text-right">Monthly (INR)</th>
                    <th className="p-3 text-right">Annual (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(offer.components || offerManagementService.calculateCompensationComponents(offer.id, offer.ctc_annual)).map((comp, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="p-3 font-medium text-gray-800">{comp.component_name}</td>
                      <td className="p-3 text-right font-mono text-gray-600">₹{comp.amount_monthly.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono font-bold text-gray-900">₹{comp.amount_annual.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="bg-emerald-50/60 font-black text-[#07563D]">
                    <td className="p-3">Total Annualized CTC</td>
                    <td className="p-3 text-right font-mono">₹{Math.round(offer.ctc_annual / 12).toLocaleString()}</td>
                    <td className="p-3 text-right font-mono">₹{offer.ctc_annual.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Document Preview */}
        {activeTab === 'document' && (
          <div className="space-y-4">
            <div className="p-6 bg-white rounded-2xl border border-gray-300 font-serif text-gray-800 text-xs leading-relaxed whitespace-pre-line shadow-inner max-h-[500px] overflow-y-auto">
              {offer.rendered_letter_html || offerManagementService.renderOfferLetterHtml({
                template: offerManagementService.getTemplates()[0],
                offer,
              })}
            </div>
          </div>
        )}

        {/* Tab 4: Approvals */}
        {activeTab === 'approvals' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Multi-Tier Approval Chain</h4>
            <div className="space-y-3">
              {(offer.approvals || [
                { id: '1', step_order: 1, approver_role: 'HR Head', approver_name: 'Hari Priya', status: 'Approved' },
                { id: '2', step_order: 2, approver_role: 'Finance Controller', approver_name: 'Finance Reviewer', status: 'Pending' },
              ]).map((appr, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl border border-gray-200/80 bg-white flex items-center justify-between shadow-2xs">
                  <div>
                    <span className="font-bold text-xs text-gray-900">{appr.approver_role}</span>
                    <p className="text-[11px] text-gray-500">{appr.approver_name}</p>
                    {appr.comments && <p className="text-[10px] text-emerald-700 italic mt-0.5">"{appr.comments}"</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={appr.status === 'Approved' ? 'emerald' : 'amber'} size="sm" className="text-[10px]">
                      {appr.status}
                    </Badge>
                    {appr.status === 'Pending' && (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={isApproving}
                        onClick={() => handleApproveStep(idx)}
                        className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-[11px]"
                      >
                        Approve Step
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Activity & Audit */}
        {activeTab === 'activity' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Offer Lifecycle Audit Trail</h4>
            <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-emerald-200">
              {(offer.activity_logs || [
                { id: '1', action: 'Offer Created', actor_name: 'Hari Priya', details: 'Offer draft generated', created_at: offer.created_at },
              ]).map((log, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-[#07563D] border-2 border-white shadow-xs" />
                  <div className="bg-white p-3 rounded-xl border border-gray-200/80 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900">{log.action}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-[11px] text-gray-600 mt-0.5">{log.details}</p>
                    <span className="text-[10px] text-gray-400">By {log.actor_name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 6: Integrations & E-Sign */}
        {activeTab === 'integrations' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Connected Integration Hub Services</h4>
            <div className="space-y-3">
              <div className="p-4 rounded-2xl border border-gray-200 bg-white flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#07563D] flex items-center justify-center font-bold text-xs">
                    <Plug className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-gray-900">E-Signature Gateway ({offer.esign_provider || 'WorkForceOS E-Sign'})</h5>
                    <p className="text-[10px] font-mono text-gray-400">Envelope: {offer.esign_envelope_id || 'Not Dispatched'}</p>
                  </div>
                </div>
                <Badge variant={offer.esign_status === 'Signed & Completed' ? 'emerald' : 'blue'} size="sm" className="text-[10px]">
                  {offer.esign_status || 'Ready'}
                </Badge>
              </div>

              <div className="p-4 rounded-2xl border border-gray-200 bg-white flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-gray-900">Background Verification Service</h5>
                    <p className="text-[10px] text-gray-400">Automated identity, criminal & education credential verification</p>
                  </div>
                </div>
                <Badge variant="emerald" size="sm" className="text-[10px]">
                  {offer.background_check_status || 'Passed'}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
};
