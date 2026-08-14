import React from 'react';
import { essApi } from '../../../services/essApi';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { UserCheck, Lock, ShieldCheck, Laptop, Phone } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const EssProfileView: React.FC = () => {
  const { showToast } = useToast();
  const profile = essApi.getProfile();

  const assets = [
    { id: 'LAP-00124', name: 'MacBook Pro 16" (M3 Max, 36GB RAM)', category: 'IT Hardware', assigned: '2025-01-15', status: 'Active' },
    { id: 'MON-88190', name: 'Dell UltraSharp 27" 4K USB-C Monitor', category: 'Peripheral', assigned: '2025-01-15', status: 'Active' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#07563D]" />
            <span>My Profile, Employment Master & Assigned Assets</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Personal details, employment information, emergency contact, assigned IT assets, and security session settings</p>
        </div>

        <Button size="sm" onClick={() => showToast('Profile Update Request modal opened')}>
          Request Profile Update
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <h3 className="text-sm font-black text-gray-900">Employment Master Details</h3>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100">
              <span className="font-sans text-gray-500 font-bold">Employee ID</span>
              <span className="font-bold text-gray-900">{profile.employee_id}</span>
            </div>
            <div className="flex justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100">
              <span className="font-sans text-gray-500 font-bold">Designation</span>
              <span className="font-bold text-gray-900">{profile.designation}</span>
            </div>
            <div className="flex justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100">
              <span className="font-sans text-gray-500 font-bold">Department</span>
              <span className="font-bold text-gray-900">{profile.department}</span>
            </div>
            <div className="flex justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100">
              <span className="font-sans text-gray-500 font-bold">Reporting Manager</span>
              <span className="font-bold text-gray-900">{profile.manager_name}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <h3 className="text-sm font-black text-gray-900">Contact & Emergency Details</h3>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100">
              <span className="font-sans text-gray-500 font-bold">Work Email</span>
              <span className="font-bold text-gray-900">{profile.email}</span>
            </div>
            <div className="flex justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100">
              <span className="font-sans text-gray-500 font-bold">Phone Number</span>
              <span className="font-bold text-gray-900">{profile.phone}</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 space-y-1">
              <span className="font-sans font-bold text-amber-900 block">Emergency Contact</span>
              <span className="text-amber-800">{profile.emergency_contact}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Assigned Assets Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <Laptop className="w-4 h-4 text-[#07563D]" />
            Assigned IT Hardware & Assets ({assets.length})
          </h3>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
              <th className="p-4 font-mono">Asset ID</th>
              <th className="p-4">Hardware Item</th>
              <th className="p-4 font-mono">Category</th>
              <th className="p-4 font-mono">Assigned Date</th>
              <th className="p-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs font-mono">
            {assets.map(ast => (
              <tr key={ast.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="p-4 font-bold text-gray-900">{ast.id}</td>
                <td className="p-4 font-sans font-extrabold text-gray-900">{ast.name}</td>
                <td className="p-4 font-sans"><Badge variant="emerald">{ast.category}</Badge></td>
                <td className="p-4 text-gray-600">{ast.assigned}</td>
                <td className="p-4 text-center font-sans"><Badge variant="emerald">{ast.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
