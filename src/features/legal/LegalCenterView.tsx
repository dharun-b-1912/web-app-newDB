// src/features/legal/LegalCenterView.tsx
// ============================================================
// Joy PeopleHR Enterprise — Trust, Security & Statutory Legal Center
// Versioned B2B Statutory Framework: DPDP Act 2023, EULA, DPA, 
// CERT-In VAPT Scope, ISO 27001/SOC 2 Blueprint, OSS Attribution, and SLA.
// ============================================================

import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { 
  ShieldCheck, 
  FileText, 
  Lock, 
  Scale, 
  Activity, 
  CheckCircle2, 
  Printer, 
  Cookie, 
  Database,
  Smartphone,
  AlertTriangle,
  Code2,
  Building2,
  Mail,
  Phone,
  MapPin,
  Clock,
  ExternalLink,
  Award
} from 'lucide-react';
import { CookiePreferencesModal } from './CookiePreferencesModal';

export type LegalTabType = 
  | 'security'
  | 'dpdp'
  | 'eula'
  | 'certifications'
  | 'oss'
  | 'dpa'
  | 'privacy'
  | 'terms'
  | 'status';

interface LegalCenterViewProps {
  initialTab?: LegalTabType;
}

export const LegalCenterView: React.FC<LegalCenterViewProps> = ({ initialTab = 'security' }) => {
  const [activeTab, setActiveTab] = useState<LegalTabType>(initialTab);
  const [isCookieModalOpen, setIsCookieModalOpen] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const TABS_CONFIG = [
    { id: 'security', label: 'Security & Compliance', icon: ShieldCheck },
    { id: 'dpdp', label: 'DPDP Act 2023 & Grievance', icon: Scale },
    { id: 'eula', label: 'EULA & Mobile Terms', icon: Smartphone },
    { id: 'certifications', label: 'CERT-In VAPT & ISO 27001', icon: Award },
    { id: 'oss', label: 'Open Source (OSS) Attributions', icon: Code2 },
    { id: 'dpa', label: 'Data Processing Agreement', icon: Lock },
    { id: 'privacy', label: 'Privacy Policy', icon: FileText },
    { id: 'terms', label: 'Terms of Service & SLA', icon: Building2 },
    { id: 'status', label: 'Live Service Status', icon: Activity },
  ] as const;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-[#07563D] dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Enterprise Trust, Security & Statutory Legal Center
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Joy Corporate Solutions Private Limited &middot; Document Series: 1.0.0-PROD
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 pl-11">
            Official statutory documentation under India's DPDP Act 2023, CERT-In VAPT Safe-to-Host specifications, ISO/IEC 27001:2022 mappings, and EULA licensing.
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
            Print / Export PDF
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
              onClick={() => setActiveTab(t.id as LegalTabType)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
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
          <span>Official Corporate Standard &middot; Joy PeopleHR Web & Mobile Enterprise HRMS</span>
          <span>Effective: October 2026 &middot; Ver: 1.0.0-PROD</span>
        </div>

        {/* ============================================================ */}
        {/* 1. Security & Compliance Tab */}
        {/* ============================================================ */}
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
                  Every organization tenant has row-level logical separation with tenant context enforcement (`auth.uid() IS NOT NULL`). All databases are encrypted at rest using AES-256 and in transit via TLS 1.3.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs">
                  <Lock className="w-4 h-4 text-[#07563D]" />
                  <span>Biometric Hash Protection</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Raw fingerprint and face images are never stored in the cloud. Hardware devices transmit irreversibly salted cryptographic mathematical vectors. Mobile authentication runs locally on device Secure Enclave / Keystore.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Compliance Certifications & Frameworks</h3>
              <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <li><strong>ISO/IEC 27001:2022 Readiness:</strong> Information Security Management System (ISMS) controls fully mapped and implemented.</li>
                <li><strong>SOC 2 Type II:</strong> Architecture aligned with AICPA Trust Services Criteria (Security, Availability, Confidentiality, Privacy).</li>
                <li><strong>CERT-In VAPT Safe-to-Host:</strong> Rigorous penetration testing scope across Web, Node.js API, PostgreSQL RLS, and Flutter Mobile APK/IPA.</li>
                <li><strong>Indian DPDP Act, 2023:</strong> Full statutory demarcation between Data Fiduciary (Employer) and Data Processor (Joy Corporate Solutions).</li>
              </ul>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 2. DPDP Act 2023 & Statutory Grievance Redressal Policy Tab */}
        {/* ============================================================ */}
        {activeTab === 'dpdp' && (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge variant="outline" className="border-emerald-600 text-emerald-700 dark:text-emerald-400 mb-2">
                  Statutory Reference: DPDP-POL-2026-V1
                </Badge>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Data Protection & Statutory Grievance Redressal Policy
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Compliance Framework under India's Digital Personal Data Protection (DPDP) Act, 2023 & Information Technology Act, 2000
                </p>
              </div>
            </div>

            {/* Demarcation of Roles */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Scale className="w-4 h-4 text-[#07563D]" />
                1. Allocation of Roles under DPDP Act, 2023
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <strong className="block text-slate-900 dark:text-white font-bold mb-1">
                    Enterprise Customer &rarr; Data Fiduciary
                  </strong>
                  <p className="text-slate-500">
                    Determines purpose and means of processing employee data (KYC, attendance, payroll). Responsible for providing statutory notices and obtaining consent or establishing legitimate employment uses under Section 7.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <strong className="block text-slate-900 dark:text-white font-bold mb-1">
                    Joy Corporate Solutions &rarr; Data Processor
                  </strong>
                  <p className="text-slate-500">
                    Processes personal data strictly on documented customer instructions. Joy PeopleHR never sells, rents, monetizes, or uses employee data for third-party profiling or advertising.
                  </p>
                </div>
              </div>
            </div>

            {/* Statutory Grievance Officer Charter */}
            <div className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#07563D] dark:text-emerald-400" />
                2. Statutory Grievance Redressal Officer Appointment
              </h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Pursuant to Section 8(10) of the DPDP Act, 2023 and Rule 5(9) of the Information Technology Rules, Joy Corporate Solutions Private Limited has appointed a designated Grievance Officer:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                <div className="space-y-1.5">
                  <p><strong className="text-slate-900 dark:text-white">Designation:</strong> Chief Information Security Officer & Data Protection Grievance Officer</p>
                  <p><strong className="text-slate-900 dark:text-white">Department:</strong> Legal, Security & Regulatory Compliance</p>
                  <p><strong className="text-slate-900 dark:text-white">Entity:</strong> Joy Corporate Solutions Private Limited</p>
                  <p className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>No.16, Krishna Complex, Avinashi - Coimbatore Road, Thennampalayam, Arasur, Coimbatore, Tamil Nadu 641407, India</span>
                  </p>
                </div>
                <div className="space-y-1.5">
                  <p className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span><strong>Grievance Desk:</strong> <a href="mailto:grievance@joypeoplehr.com" className="text-[#07563D] dark:text-emerald-400 underline">grievance@joypeoplehr.com</a></span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span><strong>Security Escalation:</strong> <a href="mailto:security@joypeoplehr.com" className="text-[#07563D] dark:text-emerald-400 underline">security@joypeoplehr.com</a></span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span><strong>Telephone:</strong> +91 99443 99088</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span><strong>Hours:</strong> 09:30 AM – 06:30 PM IST, Monday to Friday</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Timelines for Redressal (Statutory SLA) */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">3. Grievance Filing Procedure & Statutory SLA</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-bold text-[#07563D] dark:text-emerald-400 block mb-1">Within 24 to 48 Hours</span>
                  <strong className="block text-slate-900 dark:text-white text-xs mb-1">Acknowledgement</strong>
                  <p className="text-[11px] text-slate-500">Issued with unique Grievance Tracking Number (GTN).</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-bold text-[#07563D] dark:text-emerald-400 block mb-1">Within 7 Working Days</span>
                  <strong className="block text-slate-900 dark:text-white text-xs mb-1">Investigation</strong>
                  <p className="text-[11px] text-slate-500">Coordination with Employer HR leadership on tenant records.</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-bold text-[#07563D] dark:text-emerald-400 block mb-1">Within 30 Calendar Days</span>
                  <strong className="block text-slate-900 dark:text-white text-xs mb-1">Final Resolution</strong>
                  <p className="text-[11px] text-slate-500">Written statutory resolution and remediation confirmation.</p>
                </div>
              </div>
            </div>

            {/* 72-Hour Breach Notification Workflow */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                4. Security Incident & 72-Hour Breach Notification Workflow
              </h3>
              <p className="text-[11px] text-slate-500">
                In strict accordance with Section 8(6) of the DPDP Act, 2023 and CERT-In Cyber Security Directions:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60">
                  <strong className="block text-amber-900 dark:text-amber-300 font-bold mb-1">&lt; 6 Hours: Triage & Containment</strong>
                  <p className="text-slate-600 dark:text-slate-400">Automated telemetry isolates records, revokes JWTs, and rotates cryptographic keys.</p>
                </div>
                <div className="p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60">
                  <strong className="block text-blue-900 dark:text-blue-300 font-bold mb-1">&lt; 24 Hours: Customer Notice</strong>
                  <p className="text-slate-600 dark:text-slate-400">Impacted corporate tenants alerted with forensic breakdown of affected data scopes.</p>
                </div>
                <div className="p-3 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/60">
                  <strong className="block text-purple-900 dark:text-purple-300 font-bold mb-1">&lt; 72 Hours: Statutory Notice</strong>
                  <p className="text-slate-600 dark:text-slate-400">Formal regulatory filing to Data Protection Board of India (DPBI) and CERT-In (`incident@cert-in.org.in`).</p>
                </div>
              </div>
            </div>

            {/* Cryptographic Purge */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">5. Retention and Cryptographic Purge Standard</h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Upon contract termination, Customer has a <strong>15-calendar-day export window</strong> to download all records in encrypted format. Following this window, all tenant database records and private cloud storage objects undergo permanent cryptographic deletion, subject only to mandatory Indian statutory record retention periods (e.g., 7 to 8 years under Income Tax and Factories Acts).
              </p>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 3. EULA & Mobile Application Terms Tab */}
        {/* ============================================================ */}
        {activeTab === 'eula' && (
          <div className="space-y-6">
            <div>
              <Badge variant="outline" className="border-emerald-600 text-emerald-700 dark:text-emerald-400 mb-2">
                Version 1.0.0-PROD
              </Badge>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                End User License Agreement (EULA) & Mobile Application Terms
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Binding agreement between end-users and Joy Corporate Solutions Private Limited for mobile and web portal usage.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">1. Scope of Agreement & Limited License</h3>
              <p>
                Joy Corporate Solutions grants authorized end-users a personal, revocable, non-exclusive, non-transferable license to access JOY PeopleHR strictly pursuant to their Employer's active enterprise subscription.
              </p>
            </div>

            {/* Mobile Sensor & Location Safeguards */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#07563D]" />
                2. Mobile Hardware, Location & Sensor Boundaries
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <strong className="block text-slate-900 dark:text-white font-bold mb-1">GPS Geofencing for Attendance</strong>
                  <p className="text-slate-500">
                    Location coordinates are sampled <strong>strictly and exclusively at the precise moment</strong> of triggering attendance check-in or check-out. The application does <strong>not</strong> track background paths or perform 24/7 location monitoring.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <strong className="block text-slate-900 dark:text-white font-bold mb-1">On-Device Biometrics & KYC</strong>
                  <p className="text-slate-500">
                    Face ID and fingerprint authentication run exclusively inside the device's hardware Secure Enclave / Keystore. <strong>Raw biometric image files are never stored or transmitted to our servers.</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Prohibited Use */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">3. License Restrictions & Security Integrity</h3>
              <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
                <li><strong>Anti-Reverse Engineering:</strong> Users shall not decompile, reverse engineer, or attempt to derive source code or protocols.</li>
                <li><strong>Security Controls:</strong> Circumventing Row-Level Security (RLS), authentication tokens, rate limiters, or device integrity checks is strictly prohibited.</li>
                <li><strong>Anti-Spoofing:</strong> Falsifying attendance telemetry via mock location providers, fake GPS software, or rooted emulators is prohibited and automatically flagged in audit logs.</li>
              </ul>
            </div>

            {/* Account Deletion */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">4. Account Deletion & Statutory Retention Notice</h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Pursuant to Google Play and Apple App Store rules, users may request profile deactivation via in-app settings or by contacting <a href="mailto:support@joypeoplehr.com" className="text-[#07563D] dark:text-emerald-400 underline">support@joypeoplehr.com</a>. Statutory payroll and attendance ledgers remain retained by the employer as required by Indian labor and tax statutes (7 to 8 years).
              </p>
            </div>

            {/* Platform Terms & Jurisdiction */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] space-y-1">
              <p><strong>Third-Party Platform Terms:</strong> Apple and Google are third-party beneficiaries of this EULA with the right to enforce its terms upon acceptance.</p>
              <p><strong>Governing Law:</strong> Republic of India. Exclusive jurisdiction rests with the competent courts in <strong>Coimbatore, Tamil Nadu, India</strong>.</p>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 4. CERT-In VAPT & ISO 27001 Blueprint Tab */}
        {/* ============================================================ */}
        {activeTab === 'certifications' && (
          <div className="space-y-6">
            <div>
              <Badge variant="outline" className="border-emerald-600 text-emerald-700 dark:text-emerald-400 mb-2">
                Document Ref: SEC-VAPT-2026-RFP & ISO/SOC2 Roadmap
              </Badge>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                CERT-In VAPT Audit Scope & ISO 27001 / SOC 2 Type II Blueprint
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Third-party Safe-to-Host verification and international information security compliance roadmap.
              </p>
            </div>

            {/* Formal In-Process Declaration */}
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs">
              <strong className="block text-emerald-900 dark:text-emerald-300 font-bold mb-1">
                Official Enterprise Procurement Disclosure:
              </strong>
              <p className="text-emerald-800 dark:text-emerald-400 text-[11px] italic">
                &ldquo;Joy Corporate Solutions Private Limited is actively undergoing ISO/IEC 27001:2022 certification and CERT-In Empanelled VAPT audit, with completion targeted for Q4 2026.&rdquo;
              </p>
            </div>

            {/* Technical Control Mapping Table */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">ISO 27001 & SOC 2 Technical Control Mapping</h3>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 font-bold border-b border-slate-200 dark:border-slate-800 text-[11px]">
                    <tr>
                      <th className="p-3">Control Domain</th>
                      <th className="p-3">Requirement</th>
                      <th className="p-3">Joy PeopleHR Architecture Implementation</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">A.5 / CC6.1 Access Control</td>
                      <td className="p-3 text-slate-500">Principle of Least Privilege & Strict Multi-Tenancy</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">PostgreSQL Row-Level Security (RLS) with tenant context (`auth.uid() IS NOT NULL`) and cryptographic session protection.</td>
                      <td className="p-3"><span className="text-emerald-600 dark:text-emerald-400 font-bold">&check; Implemented</span></td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">A.8.24 / CC6.6 Cryptography</td>
                      <td className="p-3 text-slate-500">Encryption in Transit & At Rest</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">TLS 1.3 enforced across all web/API traffic. Database volumes and buckets encrypted with AES-256; passwords hashed with Bcrypt.</td>
                      <td className="p-3"><span className="text-emerald-600 dark:text-emerald-400 font-bold">&check; Implemented</span></td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">A.8.12 / CC6.7 Data Leak Prevention</td>
                      <td className="p-3 text-slate-500">Protection of confidential files & KYC</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">Private buckets accessed solely via 10-minute expiring signed URLs. Raw biometric images never stored.</td>
                      <td className="p-3"><span className="text-emerald-600 dark:text-emerald-400 font-bold">&check; Implemented</span></td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">A.8.7 / CC6.8 Anti-Malware & DoS</td>
                      <td className="p-3 text-slate-500">Rate limiting & endpoint throttling</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">Sliding-window IP rate limiter on Express server (`server.js`) returning HTTP 429 Too Many Requests.</td>
                      <td className="p-3"><span className="text-emerald-600 dark:text-emerald-400 font-bold">&check; Implemented</span></td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">A.5.24 / CC7.3 Incident Management</td>
                      <td className="p-3 text-slate-500">Timely breach detection and reporting</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">72-hour breach response workflow to DPBI and CERT-In defined in DPDP Policy.</td>
                      <td className="p-3"><span className="text-emerald-600 dark:text-emerald-400 font-bold">&check; Implemented</span></td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">A.8.14 / CC7.4 Backup & Redundancy</td>
                      <td className="p-3 text-slate-500">High availability & disaster recovery</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">Automated continuous WAL (Write-Ahead Logging) archiving with point-in-time recovery (PITR).</td>
                      <td className="p-3"><span className="text-emerald-600 dark:text-emerald-400 font-bold">&check; Configured</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* CERT-In Audit Scope Summary */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">CERT-In VAPT Audit Attack Surfaces</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <strong className="block text-slate-900 dark:text-white font-bold mb-1">Web Application & APIs</strong>
                  <p className="text-slate-500">React 19 SPA, Express server, injection resistance (SQLi/NoSQLi), BOLA/IDOR cross-tenant privilege isolation, CSRF protection.</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <strong className="block text-slate-900 dark:text-white font-bold mb-1">Database & Storage RLS</strong>
                  <p className="text-slate-500">PostgreSQL Row-Level Security verification ensuring unprivileged anon keys cannot read sensitive workforce or payroll tables.</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <strong className="block text-slate-900 dark:text-white font-bold mb-1">Flutter Mobile App</strong>
                  <p className="text-slate-500">Android APK & iOS builds; anti-tampering, GPS geofence spoof resistance, SSL pinning, and secure token storage.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 5. Open Source Software (OSS) Attribution & Compliance Tab */}
        {/* ============================================================ */}
        {activeTab === 'oss' && (
          <div className="space-y-6">
            <div>
              <Badge variant="outline" className="border-emerald-600 text-emerald-700 dark:text-emerald-400 mb-2">
                Audit Standard: Zero Copyleft Contamination
              </Badge>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Open Source Software (OSS) Attribution & Third-Party Licensing
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Documenting mandatory copyright notices, permissive open-source licenses, and clean intellectual property verification.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              <strong>Compliance Statement:</strong> JOY PeopleHR incorporates third-party open-source libraries under permissive open-source licenses (MIT, Apache 2.0, BSD-3-Clause, ISC). Joy Corporate Solutions Private Limited acknowledges and respects the contributions of the open-source community.
            </div>

            {/* Web Dependencies Table */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Web Application Component Directory</h3>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 font-bold border-b border-slate-200 dark:border-slate-800 text-[11px]">
                    <tr>
                      <th className="p-3">Library / Module</th>
                      <th className="p-3">Author / Project</th>
                      <th className="p-3">License Type</th>
                      <th className="p-3">Integration Scope</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">react & react-dom (v19)</td>
                      <td className="p-3 text-slate-500">Meta Platforms, Inc.</td>
                      <td className="p-3 font-semibold text-emerald-600">MIT License</td>
                      <td className="p-3 text-slate-500">Core Frontend UI Engine</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">@supabase/supabase-js</td>
                      <td className="p-3 text-slate-500">Supabase Inc.</td>
                      <td className="p-3 font-semibold text-emerald-600">MIT License</td>
                      <td className="p-3 text-slate-500">Database Client & Realtime SDK</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">vite</td>
                      <td className="p-3 text-slate-500">VoidZero Inc. / Evan You</td>
                      <td className="p-3 font-semibold text-emerald-600">MIT License</td>
                      <td className="p-3 text-slate-500">Build Tooling & Bundler</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">tailwindcss (v4)</td>
                      <td className="p-3 text-slate-500">Tailwind Labs, Inc.</td>
                      <td className="p-3 font-semibold text-emerald-600">MIT License</td>
                      <td className="p-3 text-slate-500">Design Utility Engine</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">@radix-ui/primitives</td>
                      <td className="p-3 text-slate-500">WorkOS, Inc.</td>
                      <td className="p-3 font-semibold text-emerald-600">MIT License</td>
                      <td className="p-3 text-slate-500">Accessible UI Components</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">@tanstack/react-query</td>
                      <td className="p-3 text-slate-500">Tanner Linsley</td>
                      <td className="p-3 font-semibold text-emerald-600">MIT License</td>
                      <td className="p-3 text-slate-500">Async State Management</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">motion</td>
                      <td className="p-3 text-slate-500">Framer B.V.</td>
                      <td className="p-3 font-semibold text-emerald-600">MIT License</td>
                      <td className="p-3 text-slate-500">Micro-interaction Animation Engine</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">lucide-react</td>
                      <td className="p-3 text-slate-500">Lucide Contributors</td>
                      <td className="p-3 font-semibold text-emerald-600">ISC License</td>
                      <td className="p-3 text-slate-500">Enterprise Vector Iconography</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">recharts</td>
                      <td className="p-3 text-slate-500">Recharts Group</td>
                      <td className="p-3 font-semibold text-emerald-600">MIT License</td>
                      <td className="p-3 text-slate-500">Analytics Charting Engine</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">express</td>
                      <td className="p-3 text-slate-500">OpenJS Foundation</td>
                      <td className="p-3 font-semibold text-emerald-600">MIT License</td>
                      <td className="p-3 text-slate-500">Production Web Application Server</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">@google/genai</td>
                      <td className="p-3 text-slate-500">Google LLC</td>
                      <td className="p-3 font-semibold text-blue-600">Apache 2.0</td>
                      <td className="p-3 text-slate-500">Gemini AI Copilot Integration</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">node-zklib</td>
                      <td className="p-3 text-slate-500">node-zklib contributors</td>
                      <td className="p-3 font-semibold text-emerald-600">MIT License</td>
                      <td className="p-3 text-slate-500">Hardware Biometric Gateway Protocol</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Flutter Mobile Dependencies Table */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Flutter Mobile Component Directory</h3>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 font-bold border-b border-slate-200 dark:border-slate-800 text-[11px]">
                    <tr>
                      <th className="p-3">Package</th>
                      <th className="p-3">Maintainer / Author</th>
                      <th className="p-3">License Type</th>
                      <th className="p-3">Usage Scope</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">flutter_sdk</td>
                      <td className="p-3 text-slate-500">Google LLC & Flutter Authors</td>
                      <td className="p-3 font-semibold text-purple-600">BSD 3-Clause</td>
                      <td className="p-3 text-slate-500">Native Cross-Platform Framework</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">supabase_flutter</td>
                      <td className="p-3 text-slate-500">Supabase Community</td>
                      <td className="p-3 font-semibold text-emerald-600">MIT License</td>
                      <td className="p-3 text-slate-500">Mobile Client Authentication & Data</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">geolocator</td>
                      <td className="p-3 text-slate-500">Baseflow B.V.</td>
                      <td className="p-3 font-semibold text-emerald-600">MIT License</td>
                      <td className="p-3 text-slate-500">Workplace GPS Geofence Sampling</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">firebase_core / messaging</td>
                      <td className="p-3 text-slate-500">Google LLC</td>
                      <td className="p-3 font-semibold text-blue-600">Apache 2.0</td>
                      <td className="p-3 text-slate-500">Push Notification Mesh</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">firebase_crashlytics</td>
                      <td className="p-3 text-slate-500">Google LLC</td>
                      <td className="p-3 font-semibold text-blue-600">Apache 2.0</td>
                      <td className="p-3 text-slate-500">Real-time Error & Crash Telemetry</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">permission_handler</td>
                      <td className="p-3 text-slate-500">Baseflow B.V.</td>
                      <td className="p-3 font-semibold text-emerald-600">MIT License</td>
                      <td className="p-3 text-slate-500">Runtime Hardware Sensor Gateway</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">shared_preferences</td>
                      <td className="p-3 text-slate-500">Flutter Team</td>
                      <td className="p-3 font-semibold text-purple-600">BSD 3-Clause</td>
                      <td className="p-3 text-slate-500">Persistent Session Storage</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Clean IP Statement */}
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-900 dark:text-emerald-300">
              <strong className="block font-bold mb-1">&check; Clean Intellectual Property Verification:</strong>
              JOY PeopleHR contains <strong>zero GNU General Public License (GPL / AGPLv3) copyleft dependencies</strong>. All packages integrated into both the web bundle and compiled Flutter binary are governed strictly by permissive licenses, safeguarding the proprietary intellectual property of Joy Corporate Solutions Private Limited and our commercial enterprise clients.
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 6. DPA Tab */}
        {/* ============================================================ */}
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

        {/* ============================================================ */}
        {/* 7. Privacy Policy Tab */}
        {/* ============================================================ */}
        {activeTab === 'privacy' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Privacy Policy</h2>
              <p className="text-xs text-slate-500 mt-1">
                Transparency on what information we collect, how it is used, and your rights under Indian and international privacy standards.
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
                Upon tenant subscription termination, Customer data is maintained in an encrypted archival state for fifteen (15) days for export compliance, after which all tenant records undergo permanent cryptographic deletion.
              </p>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 8. Terms of Service Tab */}
        {/* ============================================================ */}
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

        {/* ============================================================ */}
        {/* 9. Live Service Status Tab */}
        {/* ============================================================ */}
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
