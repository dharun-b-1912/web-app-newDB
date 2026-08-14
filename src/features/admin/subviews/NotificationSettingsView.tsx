import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Megaphone, Mail, MessageSquare, Plus } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const NotificationSettingsView: React.FC = () => {
  const { showToast } = useToast();

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-[#07563D]" />
            <span>Communication Hub & Notification Delivery Rules</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Centralized notification triggers, email/SMS/WhatsApp provider adapters, and employee channel preferences</p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Create Notification Rule modal opened')}>
          Create Notification Rule
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-mono">
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
          <span className="font-sans font-bold text-gray-500 block">In-App Notification Stream</span>
          <span className="text-xl font-black text-[#07563D] mt-1 block">Active</span>
          <span className="text-gray-400 font-sans text-[11px] block">Realtime Supabase Channel</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
          <span className="font-sans font-bold text-gray-500 block">Email Provider (SendGrid API)</span>
          <span className="text-xl font-black text-emerald-800 mt-1 block">Verified</span>
          <span className="text-emerald-700 font-sans text-[11px] block">99.8% Delivery Success</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
          <span className="font-sans font-bold text-gray-500 block">SMS Gateway</span>
          <span className="text-xl font-black text-blue-800 mt-1 block">Connected</span>
          <span className="text-blue-700 font-sans text-[11px] block">Transactional OTPs</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
          <span className="font-sans font-bold text-gray-500 block">WhatsApp Business API</span>
          <span className="text-xl font-black text-emerald-800 mt-1 block">Connected</span>
          <span className="text-emerald-700 font-sans text-[11px] block">Official Meta API</span>
        </div>
      </div>
    </div>
  );
};
