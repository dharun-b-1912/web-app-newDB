// src/features/talent/recruitment/OfferManager.tsx
// ============================================================================
// WorkForceOS — Employment Offers & Candidate-to-Employee Conversion Hub
// Structured CTC Breakdown, AI Letter Generator, E-Signature & Conversion Engine
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { useToast } from '../../../components/ui/Toast';
import {
  Award,
  Plus,
  Search,
  CheckCircle2,
  DollarSign,
  UserCheck,
  Calendar,
  FileCheck,
  ShieldCheck,
  Clock,
  Send,
  AlertTriangle,
  ChevronRight,
  Eye,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Offer, Candidate, OfferStatus } from '../../../types/ats';
import { offerManagementService } from '../../../services/recruitment/offerManagementService';
import { recruitmentService } from '../../../services/recruitment/recruitmentService';
import { OfferCreateWorkspace } from './OfferCreateWorkspace';
import { OfferDetailDrawer } from './OfferDetailDrawer';
import { hrEventBus } from '../../../services/hrEventBus';
import { cn } from '../../../lib/utils';

export const OfferManager: React.FC = () => {
  const { showToast } = useToast();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Modals & Drawers
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [selectedOfferForDrawer, setSelectedOfferForDrawer] = useState<Offer | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isConvertingId, setIsConvertingId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [oList, cList] = await Promise.all([
        offerManagementService.getOffers({ status: statusFilter, search }),
        recruitmentService.getCandidates(),
      ]);
      setOffers(oList);
      setCandidates(cList);
    } catch (err) {
      console.error('[OfferManager] load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, search]);

  useEffect(() => {
    const unsub = hrEventBus.subscribe('recruitment.*', () => {
      loadData();
    });
    return () => unsub();
  }, []);

  const handleConvertToEmployee = async (offer: Offer) => {
    setIsConvertingId(offer.id);
    try {
      const created = await offerManagementService.convertCandidateToEmployee(offer.candidate_id, offer.id);
      showToast(`Successfully converted ${offer.candidate_name} to Employee (${created.employee_code})!`);
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Error converting candidate to employee', 'error');
    } finally {
      setIsConvertingId(null);
    }
  };

  const handleSendEsign = async (offerId: string) => {
    try {
      await offerManagementService.sendOfferForEsign(offerId);
      showToast('E-Signature envelope dispatched to candidate!');
      loadData();
    } catch {
      showToast('Error dispatching e-signature', 'error');
    }
  };

  const openOfferDetail = (offer: Offer) => {
    setSelectedOfferForDrawer(offer);
    setIsDrawerOpen(true);
  };

  // KPI Calculations
  const draftCount = offers.filter(o => o.status === 'Draft').length;
  const pendingApprovalCount = offers.filter(o => o.status === 'Pending Approval').length;
  const approvedCount = offers.filter(o => o.status === 'Approved').length;
  const sentCount = offers.filter(o => o.status === 'Sent').length;
  const acceptedCount = offers.filter(o => o.status === 'Accepted').length;
  const declinedCount = offers.filter(o => o.status === 'Declined').length;

  // Expiring offers in next 3 days
  const now = new Date().getTime();
  const expiringOffers = offers.filter(o => {
    if (o.status !== 'Sent' && o.status !== 'Pending Approval') return false;
    if (!o.offer_expiry_date) return false;
    const diffDays = Math.ceil((new Date(o.offer_expiry_date).getTime() - now) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 3;
  });

  return (
    <div className="space-y-6">
      {/* 1. Action Header & KPI Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Offer Management & E-Sign Engine</h2>
            <Badge variant="emerald" size="sm" className="text-[10px] gap-1 font-mono">
              <Sparkles className="w-3 h-3" /> AI Letter Generator
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Structured compensation breakdown, automated template rendering, multi-tier approvals, and candidate-to-employee conversion.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsWorkspaceOpen(true)}
          className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1.5 rounded-xl shadow-xs"
        >
          <Plus className="w-4 h-4" /> Create Offer
        </Button>
      </div>

      {/* 2. Top KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <Card
          onClick={() => setStatusFilter('Draft')}
          className="p-4 rounded-2xl border-gray-200/80 hover:border-emerald-300 transition cursor-pointer shadow-2xs bg-white"
        >
          <span className="text-[10px] font-bold text-gray-400 uppercase">Drafts</span>
          <div className="text-2xl font-black text-gray-900 mt-1">{draftCount}</div>
        </Card>

        <Card
          onClick={() => setStatusFilter('Pending Approval')}
          className="p-4 rounded-2xl border-gray-200/80 hover:border-emerald-300 transition cursor-pointer shadow-2xs bg-white"
        >
          <span className="text-[10px] font-bold text-amber-600 uppercase">Pending Approval</span>
          <div className="text-2xl font-black text-amber-700 mt-1">{pendingApprovalCount}</div>
        </Card>

        <Card
          onClick={() => setStatusFilter('Approved')}
          className="p-4 rounded-2xl border-gray-200/80 hover:border-emerald-300 transition cursor-pointer shadow-2xs bg-white"
        >
          <span className="text-[10px] font-bold text-emerald-600 uppercase">Approved</span>
          <div className="text-2xl font-black text-emerald-700 mt-1">{approvedCount}</div>
        </Card>

        <Card
          onClick={() => setStatusFilter('Sent')}
          className="p-4 rounded-2xl border-gray-200/80 hover:border-emerald-300 transition cursor-pointer shadow-2xs bg-white"
        >
          <span className="text-[10px] font-bold text-blue-600 uppercase">Dispatched / Sent</span>
          <div className="text-2xl font-black text-blue-700 mt-1">{sentCount}</div>
        </Card>

        <Card
          onClick={() => setStatusFilter('Accepted')}
          className="p-4 rounded-2xl border-gray-200/80 hover:border-emerald-300 transition cursor-pointer shadow-2xs bg-white"
        >
          <span className="text-[10px] font-bold text-[#07563D] uppercase">Accepted</span>
          <div className="text-2xl font-black text-[#07563D] mt-1">{acceptedCount}</div>
        </Card>

        <Card
          onClick={() => setStatusFilter('Declined')}
          className="p-4 rounded-2xl border-gray-200/80 hover:border-emerald-300 transition cursor-pointer shadow-2xs bg-white"
        >
          <span className="text-[10px] font-bold text-rose-600 uppercase">Declined</span>
          <div className="text-2xl font-black text-rose-700 mt-1">{declinedCount}</div>
        </Card>
      </div>

      {/* 3. Expiring Offers Alert Banner */}
      {expiringOffers.length > 0 && (
        <Card className="p-4 rounded-2xl border-amber-200 bg-amber-50/70 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900">
                {expiringOffers.length} Candidate Offer(s) Expiring Soon
              </h4>
              <p className="text-[11px] text-amber-700 mt-0.5">
                {expiringOffers.map(o => `${o.candidate_name} (${o.offer_expiry_date})`).join(', ')}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStatusFilter('Sent')}
            className="text-xs border-amber-300 text-amber-900 bg-white"
          >
            Review Expiring Offers
          </Button>
        </Card>
      )}

      {/* 4. Filter Bar & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by candidate name, role, offer ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#07563D] w-72"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="p-2 text-xs rounded-xl border border-gray-200 bg-white font-bold text-gray-700"
          >
            <option value="ALL">All Statuses ({offers.length})</option>
            <option value="Draft">Drafts</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Approved">Approved</option>
            <option value="Sent">Sent / E-Sign</option>
            <option value="Accepted">Accepted</option>
            <option value="Declined">Declined</option>
            <option value="Revoked">Revoked</option>
          </select>
        </div>
      </div>

      {/* 5. Offers Table */}
      <Card className="rounded-3xl border-gray-200/80 shadow-2xs overflow-hidden bg-white">
        {isLoading ? (
          <div className="p-12 text-center text-xs font-bold text-gray-400">Loading offer records...</div>
        ) : offers.length === 0 ? (
          <div className="p-12 text-center max-w-sm mx-auto">
            <Award className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-gray-900">No Candidate Offers Created Yet</h4>
            <p className="text-xs text-gray-500 mt-1 mb-4">
              Generate structured CTC breakdowns, AI-drafted letters, and dispatch formal agreements for e-signature.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsWorkspaceOpen(true)}
              className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1.5 rounded-xl"
            >
              <Plus className="w-4 h-4" /> Create First Offer
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold text-gray-700">Offer & Candidate</TableHead>
                <TableHead className="font-bold text-gray-700">Designation / Department</TableHead>
                <TableHead className="font-bold text-gray-700">Annual CTC (INR)</TableHead>
                <TableHead className="font-bold text-gray-700">Joining Date</TableHead>
                <TableHead className="font-bold text-gray-700">E-Sign Status</TableHead>
                <TableHead className="font-bold text-gray-700">Status</TableHead>
                <TableHead className="text-right font-bold text-gray-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offers.map(o => (
                <TableRow
                  key={o.id}
                  onClick={() => openOfferDetail(o)}
                  className="hover:bg-emerald-50/40 transition-colors cursor-pointer"
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-gray-400">{o.id}</span>
                    </div>
                    <div className="font-bold text-gray-900 text-xs mt-0.5">{o.candidate_name}</div>
                    <div className="text-[11px] text-gray-400">{o.candidate_email}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-semibold text-gray-800">{o.job_title}</div>
                    <div className="text-[11px] text-gray-400">{o.department_name} • {o.location_name || 'Coimbatore'}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold text-gray-900">
                    INR {o.ctc_annual?.toLocaleString()}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-gray-700">
                    {o.joining_date}
                  </TableCell>
                  <TableCell>
                    <Badge variant={o.esign_status === 'Signed & Completed' ? 'emerald' : 'blue'} className="text-[10px]">
                      {o.esign_status || 'Ready'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        o.status === 'Accepted'
                          ? 'emerald'
                          : o.status === 'Sent'
                          ? 'blue'
                          : o.status === 'Declined' || o.status === 'Revoked'
                          ? 'rose'
                          : 'amber'
                      }
                      className="text-[10px]"
                    >
                      {o.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      {o.status === 'Accepted' ? (
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={isConvertingId === o.id || o.preboarding_status === 'Completed'}
                          onClick={() => handleConvertToEmployee(o)}
                          className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1.5 rounded-xl shadow-xs"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          {o.preboarding_status === 'Completed' ? 'Converted' : isConvertingId === o.id ? 'Converting...' : 'Convert to Employee'}
                        </Button>
                      ) : o.status === 'Approved' ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleSendEsign(o.id)}
                          className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1 rounded-xl"
                        >
                          <Send className="w-3 h-3" /> Send E-Sign
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openOfferDetail(o)}
                          className="text-xs font-bold text-gray-700 border-gray-200 rounded-xl gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Inspect
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Full-Screen / Modal Offer Create Workspace */}
      <OfferCreateWorkspace
        isOpen={isWorkspaceOpen}
        onClose={() => setIsWorkspaceOpen(false)}
        onOfferCreated={() => {
          loadData();
        }}
      />

      {/* Offer Detail Deep Inspector Drawer */}
      <OfferDetailDrawer
        offer={selectedOfferForDrawer}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onOfferUpdated={() => {
          loadData();
          if (selectedOfferForDrawer) {
            offerManagementService.getOfferById(selectedOfferForDrawer.id).then(res => {
              setSelectedOfferForDrawer(res);
            });
          }
        }}
      />
    </div>
  );
};
