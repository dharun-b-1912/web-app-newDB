import React, { useState, useEffect } from 'react';
import { lmsApi } from '../../../services/lmsApi';
import { EmployeeCertification } from '../../../types/lms';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Award, Download, AlertTriangle, ShieldCheck, Plus } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const CertificationsView: React.FC = () => {
  const { showToast } = useToast();
  const [certs, setCerts] = useState<EmployeeCertification[]>([]);

  useEffect(() => {
    setCerts(lmsApi.getEmployeeCertifications());
  }, []);

  const handleDownloadPDF = (certName: string, empName: string) => {
    showToast(`Generating digital PDF certificate for ${empName} - ${certName}...`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Award className="w-5 h-5 text-[#07563D]" />
            <span>Enterprise Certification & Expiry Management</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Automated 30/60/90 day expiry notifications, recertification renewals, and PDF certificates</p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Upload Certificate modal opened')}>
          Upload / Issue Certificate
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
              <th className="p-4">Employee</th>
              <th className="p-4">Certification Name</th>
              <th className="p-4 font-mono">Certificate #</th>
              <th className="p-4">Provider</th>
              <th className="p-4 font-mono">Issue Date</th>
              <th className="p-4 font-mono">Expiry Date</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {certs.map(crt => (
              <tr key={crt.id} className="hover:bg-gray-50/60 transition-colors font-mono">
                <td className="p-4 font-sans font-extrabold text-gray-900">
                  {crt.employee_name}
                  <span className="block text-[11px] text-gray-400 font-normal">{crt.department_name}</span>
                </td>
                <td className="p-4 font-sans font-bold text-gray-800">{crt.certification_name}</td>
                <td className="p-4 text-gray-600 font-bold">{crt.certificate_number}</td>
                <td className="p-4 font-sans text-gray-700">{crt.provider}</td>
                <td className="p-4 text-gray-600">{crt.issue_date}</td>
                <td className="p-4 text-gray-600">{crt.expiry_date}</td>
                <td className="p-4 text-center font-sans">
                  <Badge variant={crt.status === 'Active' ? 'emerald' : 'amber'}>{crt.status}</Badge>
                </td>
                <td className="p-4 text-right font-sans">
                  <Button size="sm" variant="outline" leftIcon={<Download className="w-3.5 h-3.5" />} onClick={() => handleDownloadPDF(crt.certification_name, crt.employee_name)}>
                    Certificate PDF
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
