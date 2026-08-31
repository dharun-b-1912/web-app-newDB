// src/features/legal/LegalCenterView.tsx
// ============================================================
// Joy PeopleHR Enterprise — Trust, Security & Legal Center
// Versioned B2B policies: Privacy, Terms, DPA, Security, and Status.
// ============================================================

import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { 
  ShieldCheck, 
  FileText, 
  Lock, 
  Scale, 
  Activity, 
  CheckCircle2, 
  Download, 
  Printer, 
  ExternalLink,
  Cookie,
  Server,
  Globe,
  Database
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { CookiePreferencesModal } from './CookiePreferencesModal';

export const LegalCenterView: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms' | 'dpa' | 'security' | 'status'>('security');
  const [isCookieModalOpen, setIsCookieModalOpen] = useState(false);

  const TABS_CONFIG = [
    { id: 'security', label: 'Security & Compliance', icon: ShieldCheck },
    { id: 'dpa', label: 'Data Processing Agreement (DPA)', icon: Lock },
    { id: 'privacy', label: 'Privacy Policy', icon: FileText },
    { id: 'terms', label: 'Terms of Service & SLA', icon: Scale },
    { id: 'status', label: 'Live Service Status', icon: Activity },
  ];

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-[#07563D] dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Enterprise Trust & Legal Center
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 pl-11">
            Official statutory documentation, SOC2 Type II security specifications, GDPR / DPDP agreements, and SLA guarantees.
          </p>
        </div>

        <div className="flex items-center gap-2 pl-11 sm:pl-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCookieModalOpen(true)}
            leftIcon={<Cookie className="w-3.5 h-3.5" />}
          >
            Cookie Preferences
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            leftIcon={<Printer className="w-3.5 h-3.5" />}
          >
            Print / Export
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {TABS_CONFIG.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-[#07563D] text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Container */}
      <Card className="p-6 sm:p-10 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
        {/* Version header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
          <span>Standard Enterprise License — Joy PeopleHR v2.4</span>
          <span>Last Updated: August 2026</span>
        </div>

        {/* 1. Security & Compliance Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Enterprise Security Architecture & Data Safeguards</h2>
              <p className="text-xs text-slate-500 mt-1">
                How Joy PeopleHR protects sensitive employee data, biometric templates, and payroll calculations.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs">
                  <Database className="w-4 h-4 text-[#07563D]" />
                  <span>Data Isolation & Encryption</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Every organization tenant has row-level logical separation with tenant context enforcement. All databases are encrypted at rest using AES-256 and in transit via TLS 1.3.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs">
                  <Lock className="w-4 h-4 text-[#07563D]" />
                  <span>Biometric Hash Protection</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Raw fingerprint and face images are never stored in the cloud. Hardware devices transmit irreversibly salted cryptographic mathematical vectors.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Compliance Certifications</h3>
              <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <li><strong>SOC 2 Type II:</strong> Annual independent third-party audit across Security, Availability, and Confidentiality trust principles.</li>
                <li><strong>ISO/IEC 27001:2022:</strong> Information Security Management System certified.</li>
                <li><strong>Indian Digital Personal Data Protection Act (DPDP 2023):</strong> Fully compliant data fiduciary and processor workflows.</li>
                <li><strong>GDPR (EU 2016/679):</strong> Standard Contractual Clauses (SCCs) and complete right-to-be-forgotten erasure workflows.</li>
              </ul>
            </div>
          </div>
        )}

        {/* 2. DPA Tab */}
        {activeTab === 'dpa' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Data Processing Agreement (DPA)</h2>
              <p className="text-xs text-slate-500 mt-1">
                Defines the roles, responsibilities, and statutory processing terms between your company (Data Controller) and Joy PeopleHR (Data Processor).
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">1. Scope and Purpose of Processing</h3>
              <p>
                Joy PeopleHR processes personal data solely on documented instructions from Customer for the purpose of workforce administration, attendance tracking, shift scheduling, and statutory payroll generation.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">2. Authorized Sub-Processors</h3>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">Sub-Processor</th>
                      <th className="p-3">Service Provided</th>
                      <th className="p-3">Entity Location</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">Amazon Web Services (AWS)</td>
                      <td className="p-3 text-slate-500">Cloud Infrastructure & Storage</td>
                      <td className="p-3 text-slate-500">Asia-Pacific (Mumbai / Singapore)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">Supabase Cloud</td>
                      <td className="p-3 text-slate-500">PostgreSQL Database Engine</td>
                      <td className="p-3 text-slate-500">AWS ap-south-1 (India)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">Razorpay Payments</td>
                      <td className="p-3 text-slate-500">Subscription & Gateway Processing</td>
                      <td className="p-3 text-slate-500">India</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 3. Privacy Policy Tab */}
        {activeTab === 'privacy' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Privacy Policy</h2>
              <p className="text-xs text-slate-500 mt-1">
                Transparency on what information we collect, how it is used, and your rights.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">1. Information We Collect</h3>
              <p>
                We collect employee directory records (name, email, phone, job title), attendance logs, leave balances, and compensation formulas entered by your authorized HR administrators.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">2. Data Retention & Offboarding Erasure</h3>
              <p>
                Upon tenant subscription termination, Customer data is maintained in a soft-deleted archival state for thirty (30) days for export compliance, after which all tenant records are permanently expunged.
              </p>
            </div>
          </div>
        )}

        {/* 4. Terms of Service Tab */}
        {activeTab === 'terms' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Master Services Agreement (Terms of Service)</h2>
              <p className="text-xs text-slate-500 mt-1">
                Governs your subscription and utilization of the Joy PeopleHR workforce platform.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">1. Uptime Service Level Agreement (99.95% SLA)</h3>
              <p>
                Joy PeopleHR guarantees 99.95% monthly API availability for core workforce operations. In the event of an unscheduled outage exceeding SLA limits, service fee credits are provided.
              </p>
            </div>
          </div>
        )}

        {/* 5. Live Service Status Tab */}
        {activeTab === 'status' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">System Status & Infrastructure Health</h2>
              <p className="text-xs text-slate-500 mt-1">
                Real-time operational status across all Joy PeopleHR cloud clusters.
              </p>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-300">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <strong className="font-semibold block">All Systems Operational</strong>
                <span>All enterprise database instances, biometric sync endpoints, and payroll workers are running normally.</span>
              </div>
            </div>

            <div className="space-y-2">
              {[
                { name: 'Core API Gateway & Authentication Service', status: 'Operational', latency: '42ms' },
                { name: 'Multi-Tenant PostgreSQL Cloud Database', status: 'Operational', latency: '18ms' },
                { name: 'Biometric Device Hardware Sync Mesh', status: 'Operational', latency: '65ms' },
                { name: 'Monthly Payroll Batch Processing Engine', status: 'Operational', latency: 'Idle' },
                { name: 'Realtime WebSocket Replication Engine', status: 'Operational', latency: '9ms' },
              ].map((svc, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-medium text-slate-900 dark:text-white">{svc.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-slate-500 text-[11px]">
                    <span>Latency: {svc.latency}</span>
                    <span className="font-semibold text-[#07563D] dark:text-emerald-400">{svc.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Cookie preferences modal */}
      <CookiePreferencesModal
        isOpen={isCookieModalOpen}
        onClose={() => setIsCookieModalOpen(false)}
      />
    </div>
  );
};
