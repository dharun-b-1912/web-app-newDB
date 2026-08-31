import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Plus,
  FileCheck2,
  Calendar,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  Download,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Bell,
  Building,
  CheckCircle,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { vendorPortalService } from '../../../services/vendorPortalService';
import { VendorLicense, VendorLicenseType, VendorLicenseStatus } from '../../../types/vendorPortal';
import { DocumentIntelligenceOcrModal } from '../components/DocumentIntelligenceOcrModal';

interface VendorLicensesViewProps {
  onOpenOcrScanner?: () => void;
}

export const VendorLicensesView: React.FC<VendorLicensesViewProps> = () => {
  const [licenses, setLicenses] = useState<VendorLicense[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isOcrOpen, setIsOcrOpen] = useState(false);

  // New License Form
  const [licenseType, setLicenseType] = useState<VendorLicenseType>('Contract Labour License');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [issuedDate, setIssuedDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState(new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0]);
  const [capacity, setCapacity] = useState(50);
  const [issuingAuth, setIssuingAuth] = useState('Joint Commissioner of Labour (Contract Labour Cell)');

  const loadData = () => {
    setLicenses(vendorPortalService.getLicenses());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('wf-vendor-changed', loadData);
    return () => window.removeEventListener('wf-vendor-changed', loadData);
  }, []);

  const handleAddLicense = (e: React.FormEvent) => {
    e.preventDefault();
    vendorPortalService.addLicense({
      license_type: licenseType,
      license_number: licenseNumber || `CL-${Math.floor(1000 + Math.random() * 9000)}`,
      issued_date: issuedDate,
      expiry_date: expiryDate,
      max_worker_capacity: capacity,
      issuing_authority: issuingAuth,
      reminders_enabled: true,
    });
    setIsAddModalOpen(false);
    loadData();
  };

  const filtered = licenses.filter((l) => {
    const matchesSearch =
      l.license_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.license_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.issuing_authority?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const criticalCount = licenses.filter((l) => l.status === 'CRITICAL' || l.status === 'EXPIRED').length;
  const expiringSoonCount = licenses.filter((l) => l.status === 'EXPIRING_SOON').length;
  const activeCount = licenses.filter((l) => l.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Licenses</p>
            <p className="text-2xl font-black text-gray-900 mt-1 font-mono">{licenses.length}</p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100">
            <FileCheck2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Active & Fully Compliant</p>
            <p className="text-2xl font-black text-emerald-700 mt-1 font-mono">{activeCount}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Expiring Soon (30 Days)</p>
            <p className="text-2xl font-black text-amber-600 mt-1 font-mono">{expiringSoonCount}</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600 border border-amber-100">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Critical / Expired</p>
            <p className="text-2xl font-black text-rose-600 mt-1 font-mono">{criticalCount}</p>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600 border border-rose-100">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search license type, registration number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-semibold">
            {['ALL', 'ACTIVE', 'EXPIRING_SOON', 'CRITICAL', 'EXPIRED'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-lg transition ${statusFilter === s
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <Button
            onClick={() => setIsOcrOpen(true)}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs"
            leftIcon={<Sparkles className="w-3.5 h-3.5 text-indigo-200" />}
          >
            AI OCR License Scanner
          </Button>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            size="sm"
            variant="outline"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Manual Add License
          </Button>
        </div>
      </div>

      {/* Licenses Table */}
      <div className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead className="font-bold">License Type & Registration</TableHead>
              <TableHead className="font-bold">Issuing Authority</TableHead>
              <TableHead className="font-bold">Worker Limit</TableHead>
              <TableHead className="font-bold">Issue Date</TableHead>
              <TableHead className="font-bold">Expiry Date & Countdown</TableHead>
              <TableHead className="font-bold">Reminders</TableHead>
              <TableHead className="text-right font-bold">Status & Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((lic) => (
              <TableRow key={lic.id} className="hover:bg-gray-50/60 transition">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
                      <FileCheck2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-gray-900 font-bold text-xs">{lic.license_type}</p>
                      <p className="text-[11px] text-gray-500 font-mono mt-0.5">{lic.license_number}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-gray-700 text-xs font-medium">
                  {lic.issuing_authority || 'Joint Labour Commissioner'}
                </TableCell>
                <TableCell>
                  <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-800 text-xs font-mono font-bold">
                    {lic.max_worker_capacity || 50} Workers
                  </span>
                </TableCell>
                <TableCell className="text-gray-600 text-xs">{lic.issued_date}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-bold text-gray-900">{lic.expiry_date}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {lic.days_until_expiry > 0 ? `${lic.days_until_expiry} days remaining` : 'Expired'}
                  </p>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-[11px] text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 w-fit font-medium">
                    <Bell className="w-3 h-3 text-indigo-600" />
                    <span>90, 60, 30, 15, 7, 1d</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={
                      lic.status === 'ACTIVE'
                        ? 'emerald'
                        : lic.status === 'EXPIRING_SOON'
                          ? 'amber'
                          : 'rose'
                    }
                    size="sm"
                  >
                    {lic.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}

            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-gray-400 text-xs">
                  No statutory licenses found for this filter. Use the AI OCR Scanner or Manual Add button above.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* AI OCR Scanner Modal */}
      <DocumentIntelligenceOcrModal
        isOpen={isOcrOpen}
        onClose={() => setIsOcrOpen(false)}
        onSaved={loadData}
      />

      {/* Manual Add License Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register Statutory Compliance License"
      >
        <form onSubmit={handleAddLicense} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-gray-700 mb-1">License Category</label>
            <select
              value={licenseType}
              onChange={(e) => setLicenseType(e.target.value as VendorLicenseType)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Contract Labour License">Contract Labour License (CLRA Form VI)</option>
              <option value="Migrant Labour License">Inter-State Migrant Labour License (ISMW)</option>
              <option value="Factory Registration">Factory Premises Registration</option>
              <option value="Form V">Principal Employer Form V Certificate</option>
              <option value="PF Registration">EPFO Establishment Code</option>
              <option value="ESIC Registration">ESIC Sub-Code Registration</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Registration / License Number *</label>
            <input
              type="text"
              required
              placeholder="e.g. CLA/TN/CBE/2026/8912"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Issued Date</label>
              <input
                type="date"
                value={issuedDate}
                onChange={(e) => setIssuedDate(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Expiry Date *</label>
              <input
                type="date"
                required
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Worker Capacity Cap</label>
              <input
                type="number"
                min={1}
                max={1000}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Issuing Authority</label>
              <input
                type="text"
                value={issuingAuth}
                onChange={(e) => setIssuingAuth(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              Save & Register License
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
