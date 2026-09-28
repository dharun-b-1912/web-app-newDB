// src/features/vendor/EmployeeOnboardingModal.tsx
// ============================================================================
// Joy People HR — Workforce Employee Onboarding & Deployment Modal
// Personal Identity -> Deployment & Site Mapping -> Reporting Hierarchy -> Banking
// ============================================================================

import React, { useState } from 'react';
import { WorkforceOnboardingPayload } from '../../types/vendorPortal';
import { VendorEmployeeOnboardingService } from '../../services/vendor/vendorEmployeeOnboardingService';

interface EmployeeOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  vendorId: string;
  clientCompanyName: string;
  siteName: string;
  onComplete: (workerRecord: any) => void;
}

export const EmployeeOnboardingModal: React.FC<EmployeeOnboardingModalProps> = ({
  isOpen,
  onClose,
  organizationId,
  vendorId,
  clientCompanyName,
  siteName,
  onComplete,
}) => {
  const [errors, setErrors] = useState<string[]>([]);
  const [payload, setPayload] = useState<WorkforceOnboardingPayload>({
    organizationId: organizationId || 'org-main-tenant',
    vendorId: vendorId || 'VND-1001',
    employeeCode: `EMP-VND-${Math.floor(100 + Math.random() * 900)}`,
    firstName: '',
    lastName: '',
    gender: 'MALE',
    dateOfBirth: '1998-05-15',
    joiningDate: new Date().toISOString().split('T')[0],
    designation: 'Machine Operator / Assembler',
    skillCategory: 'SKILLED',
    mobileNumber: '',
    email: '',
    aadhaarNumberMasked: 'XXXX-XXXX-8921',
    panMasked: 'ABCDE9821F',
    esiNumber: '5100998877001',
    uanNumber: '101998822114',
    deployment: {
      clientCompanyId: 'comp-joy-che',
      clientCompanyName: clientCompanyName || 'Joy Industrial Plant - Chennai',
      siteName: siteName || 'Plant 1 — Assembly & Heavy Fabrication',
      contractCode: 'CTR-2026-CHE-01',
      department: 'Heavy Assembly Line',
      assignedShift: 'GENERAL (09:00 - 18:00)',
      reportingManagerId: 'mgr-ramesh',
      reportingManagerName: 'Ramesh Sundaram (Operations Lead)',
      teamLeaderId: 'tl-suresh',
      teamLeaderName: 'Suresh Kumar (Line Supervisor)',
    },
    banking: {
      accountNumber: '50200088991122',
      bankName: 'State Bank of India',
      ifscCode: 'SBIN0001234',
      branch: 'Ambattur Industrial Estate',
    },
    sourcingChannel: 'VENDOR_SOURCED',
  });

  if (!isOpen) return null;

  const handleSubmit = async () => {
    try {
      const res = await VendorEmployeeOnboardingService.processAndPersistOnboarding(payload);
      if (!res.valid) {
        setErrors(res.errors);
        return;
      }
      setErrors([]);
      onComplete(res.employeeRecord);
      onClose();
    } catch (err: any) {
      setErrors([err.message || 'Failed to persist employee record. Please try again.']);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl text-gray-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50/80 px-6 py-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#047857]">Workforce Deployment</span>
            <h3 className="text-lg font-bold text-gray-900">Onboard Worker &amp; Map Reporting Hierarchy</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {errors.length > 0 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
              <div className="font-semibold text-rose-800 mb-1">Please fix the following issues:</div>
              <ul className="list-disc pl-4 space-y-1">
                {errors.map((e, idx) => (
                  <li key={idx}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-700">Employee Code *</label>
              <input
                type="text"
                value={payload.employeeCode}
                onChange={(e) => setPayload({ ...payload, employeeCode: e.target.value.toUpperCase() })}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-mono uppercase text-[#047857] focus:border-[#047857] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">First Name *</label>
              <input
                type="text"
                value={payload.firstName}
                onChange={(e) => setPayload({ ...payload, firstName: e.target.value })}
                placeholder="e.g. Vignesh"
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#047857] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">Last Name *</label>
              <input
                type="text"
                value={payload.lastName}
                onChange={(e) => setPayload({ ...payload, lastName: e.target.value })}
                placeholder="e.g. Kumar"
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#047857] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-700">Skill Category</label>
              <select
                value={payload.skillCategory}
                onChange={(e) => setPayload({ ...payload, skillCategory: e.target.value as any })}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#047857] focus:outline-none cursor-pointer"
              >
                <option value="SKILLED">Skilled</option>
                <option value="SEMI_SKILLED">Semi-Skilled</option>
                <option value="UNSKILLED">Unskilled</option>
                <option value="HIGHLY_SKILLED">Highly Skilled</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">Designation / Role</label>
              <input
                type="text"
                value={payload.designation}
                onChange={(e) => setPayload({ ...payload, designation: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#047857] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">Mobile Number *</label>
              <input
                type="text"
                value={payload.mobileNumber}
                onChange={(e) => setPayload({ ...payload, mobileNumber: e.target.value })}
                placeholder="9876543210"
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#047857] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">Joining Date *</label>
              <input
                type="date"
                value={payload.joiningDate}
                onChange={(e) => setPayload({ ...payload, joiningDate: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#047857] focus:outline-none"
              />
            </div>
          </div>

          {/* Deployment & Hierarchy Section */}
          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#047857]">
              Site Deployment &amp; Reporting Hierarchy
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-700">Reporting Operations Manager *</label>
                <input
                  type="text"
                  value={payload.deployment.reportingManagerName}
                  onChange={(e) =>
                    setPayload({
                      ...payload,
                      deployment: { ...payload.deployment, reportingManagerName: e.target.value },
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#047857] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Team Leader / Line Supervisor</label>
                <input
                  type="text"
                  value={payload.deployment.teamLeaderName}
                  onChange={(e) =>
                    setPayload({
                      ...payload,
                      deployment: { ...payload.deployment, teamLeaderName: e.target.value },
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#047857] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-700">Assigned Client Site</label>
                <input
                  type="text"
                  disabled
                  value={payload.deployment.siteName}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Assigned Shift</label>
                <select
                  value={payload.deployment.assignedShift}
                  onChange={(e) =>
                    setPayload({
                      ...payload,
                      deployment: { ...payload.deployment, assignedShift: e.target.value },
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#047857] focus:outline-none cursor-pointer"
                >
                  <option value="GENERAL (09:00 - 18:00)">GENERAL (09:00 - 18:00)</option>
                  <option value="SHIFT_A (06:00 - 14:00)">SHIFT A (06:00 - 14:00)</option>
                  <option value="SHIFT_B (14:00 - 22:00)">SHIFT B (14:00 - 22:00)</option>
                  <option value="NIGHT (22:00 - 06:00)">NIGHT SHIFT (22:00 - 06:00)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Department</label>
                <input
                  type="text"
                  value={payload.deployment.department}
                  onChange={(e) =>
                    setPayload({
                      ...payload,
                      deployment: { ...payload.deployment, department: e.target.value },
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#047857] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Workforce Sourcing Channel */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#047857] mb-3 flex items-center gap-2">
              <span>⚡</span> Workforce Sourcing Channel
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-700">Employment / Sourcing Type *</label>
                <select
                  value={payload.sourcingChannel || 'VENDOR_SOURCED'}
                  onChange={(e) => setPayload({ ...payload, sourcingChannel: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#047857] focus:outline-none cursor-pointer"
                >
                  <option value="VENDOR_SOURCED">Vendor Sourced (Contractor via Vendor)</option>
                  <option value="CONTRACT">Direct Contract (Fixed-Term)</option>
                  <option value="CONSULTANT">Consultant / Freelancer</option>
                  <option value="APPRENTICE">Apprentice / Trainee</option>
                  <option value="DIRECT">Direct Employee (Permanent)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Vendor Organization</label>
                <input
                  type="text"
                  value={vendorId}
                  readOnly
                  title="Vendor ID (set by the portal context)"
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm font-mono text-gray-700 cursor-not-allowed"
                />
                <p className="mt-1 text-[10px] text-gray-500">Vendor ID from deployment context (read-only)</p>
              </div>
            </div>
          </div>

          {/* Statutory & Banking */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 shadow-2xs">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Statutory Identity</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-500">Aadhaar (Masked)</label>
                  <input
                    type="text"
                    value={payload.aadhaarNumberMasked}
                    onChange={(e) => setPayload({ ...payload, aadhaarNumberMasked: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-mono text-gray-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500">PAN (Masked)</label>
                  <input
                    type="text"
                    value={payload.panMasked}
                    onChange={(e) => setPayload({ ...payload, panMasked: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-mono text-gray-900"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 shadow-2xs">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Bank Details</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-500">Account No</label>
                  <input
                    type="text"
                    value={payload.banking.accountNumber}
                    onChange={(e) =>
                      setPayload({ ...payload, banking: { ...payload.banking, accountNumber: e.target.value } })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-mono text-gray-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500">IFSC Code</label>
                  <input
                    type="text"
                    value={payload.banking.ifscCode}
                    onChange={(e) =>
                      setPayload({ ...payload, banking: { ...payload.banking, ifscCode: e.target.value.toUpperCase() } })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-mono uppercase text-gray-900"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50/80 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="rounded-lg bg-[#047857] hover:bg-emerald-800 px-5 py-2 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer"
          >
            ✓ Complete Onboarding &amp; Activate Worker
          </button>
        </div>
      </div>
    </div>
  );
};
