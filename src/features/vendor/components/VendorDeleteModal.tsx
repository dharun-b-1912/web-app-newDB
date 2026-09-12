import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import { vendorService } from '../../../services/vendorService';
import {
  AlertTriangle,
  Trash2,
  ShieldAlert,
  Users,
  Briefcase,
  FileCheck,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { Vendor } from '../../../types';

export interface VendorDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: Vendor | any;
  activeWorkersCount?: number;
  activeContractsCount?: number;
  onDeleted: (vendorId: string, mode: 'DELETED' | 'TERMINATED') => void;
}

export const VendorDeleteModal: React.FC<VendorDeleteModalProps> = ({
  isOpen,
  onClose,
  vendor,
  activeWorkersCount = 0,
  activeContractsCount = 0,
  onDeleted,
}) => {
  const { showToast } = useToast();
  const [terminationReason, setTerminationReason] = useState(
    'Contract term ended / administrative offboarding'
  );
  const [confirmInput, setConfirmInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !vendor) return null;

  const vendorCode = vendor.vendor_code || vendor.code || 'VEN-000021';
  const vendorName = vendor.legal_name || vendor.name || 'Vendor';
  const hasActiveDependencies = activeWorkersCount > 0 || activeContractsCount > 0;

  const handleTerminate = async () => {
    setIsSubmitting(true);
    try {
      const res = await vendorService.deleteVendor(vendor.id, {
        hardDelete: false,
        reason: terminationReason,
      });
      showToast(res.message, 'info');
      onDeleted(vendor.id, 'TERMINATED');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to terminate vendor', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (confirmInput.trim().toUpperCase() !== vendorCode.toUpperCase()) {
      showToast(`Please type "${vendorCode}" to confirm permanent deletion`, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await vendorService.deleteVendor(vendor.id, {
        hardDelete: true,
        reason: 'Administrative deletion',
      });
      showToast(res.message, 'success');
      onDeleted(vendor.id, 'DELETED');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Permanent deletion failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={hasActiveDependencies ? 'Deactivate / Terminate Vendor' : 'Delete Vendor'}
      size="lg"
    >
      <div className="space-y-5">
        {/* Vendor Summary Header */}
        <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h4 className="font-bold text-sm text-white">{vendorName}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                {vendorCode}
              </span>
              <span className="text-xs text-slate-400">
                {vendor.vendor_type?.replace(/_/g, ' ') || 'Manpower Supplier'}
              </span>
            </div>
          </div>
          <Badge variant={vendor.status === 'ACTIVE' ? 'emerald' : 'amber'}>
            {vendor.status || 'ACTIVE'}
          </Badge>
        </div>

        {/* Dependency Alert for active workforce */}
        {hasActiveDependencies ? (
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-3">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="text-xs font-bold text-amber-900 block">
                    Statutory Compliance Barrier: Permanent Hard Deletion Restricted
                  </strong>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    This vendor is bound to active enterprise commitments. Deleting records permanently
                    would invalidate statutory muster rolls, ESIC/EPFO challans, and 3-way commercial match reconciliation.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-amber-200/80 text-xs">
                <div className="flex items-center gap-2 text-slate-800">
                  <Users className="w-4 h-4 text-amber-600" />
                  <span>
                    Active Deployed Workers: <strong>{activeWorkersCount}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-800">
                  <Briefcase className="w-4 h-4 text-amber-600" />
                  <span>
                    Active Contracts / MSAs: <strong>{activeContractsCount}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Graceful Offboarding Section */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Recommended Action: Graceful Contract Termination
              </h5>
              <p className="text-xs text-slate-600">
                Graceful termination changes the vendor status to <strong>TERMINATED</strong>, revokes portal login credentials immediately, and stops active manpower deployments while keeping historical audits, muster rolls, and payment records intact.
              </p>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Termination Reason / Offboarding Notes
                </label>
                <textarea
                  rows={2}
                  value={terminationReason}
                  onChange={(e) => setTerminationReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  placeholder="Provide rationale for terminating this vendor relationship..."
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleTerminate}
                disabled={isSubmitting}
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-xs"
                leftIcon={<XCircle className="w-4 h-4" />}
              >
                {isSubmitting ? 'Processing...' : 'Gracefully Terminate Vendor & Revoke Access'}
              </Button>
            </div>
          </div>
        ) : (
          /* Clean Permanent Deletion for Vendors with Zero Dependencies */
          <div className="space-y-4">
            <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-xs font-bold text-rose-900 block">
                    Permanent Deletion Confirmation
                  </strong>
                  <p className="text-xs text-rose-700 mt-0.5">
                    This vendor has no active deployments or contracts. Permanently deleting this vendor will
                    remove the record, associated portal access, and compliance documents from the directory.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Type <span className="font-mono text-rose-700 font-extrabold">{vendorCode}</span> to confirm permanent deletion:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={`Type ${vendorCode}`}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-mono font-bold focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handlePermanentDelete}
                disabled={isSubmitting || confirmInput.trim().toUpperCase() !== vendorCode.toUpperCase()}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs"
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                {isSubmitting ? 'Deleting...' : 'Permanently Delete Vendor'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
