import React, { useState, useEffect } from 'react';
import { otherModulesApi } from '../../../services/otherModulesApi';
import { Announcement, CommunicationMessageLog } from '../../../types/otherModules';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Megaphone, Mail, MessageSquare, Plus, CheckCircle2, Send } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const CommunicationHubView: React.FC = () => {
  const { showToast } = useToast();
  const [tab, setTab] = useState<'announcements' | 'logs'>('announcements');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [logs, setLogs] = useState<CommunicationMessageLog[]>([]);

  useEffect(() => {
    setAnnouncements(otherModulesApi.getAnnouncements());
    setLogs(otherModulesApi.getCommunicationLogs());
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-[#07563D]" />
            <span>Multi-Channel Communication Hub</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Enterprise broadcast announcements, transactional Email/SMS/WhatsApp logs, and delivery receipts</p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Create Announcement broadcast modal opened')}>
          Create Announcement
        </Button>
      </div>

      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setTab('announcements')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            tab === 'announcements' ? 'bg-[#07563D] text-white shadow-2xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Announcements ({announcements.length})
        </button>
        <button
          onClick={() => setTab('logs')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            tab === 'logs' ? 'bg-[#07563D] text-white shadow-2xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Multi-Channel Delivery Logs ({logs.length})
        </button>
      </div>

      {tab === 'announcements' && (
        <div className="space-y-4">
          {announcements.map(ann => (
            <div key={ann.id} className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#07563D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    Audience: {ann.target_audience}
                  </span>
                  <h3 className="text-base font-extrabold text-gray-900 mt-1">{ann.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Author: {ann.author_name} • Published: {ann.published_date}</p>
                </div>
                <Badge variant="emerald">{ann.status}</Badge>
              </div>
              <p className="text-xs text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">{ann.content}</p>
              <div className="flex justify-between items-center text-xs font-mono pt-1">
                <span className="text-gray-500">Acknowledged: <strong>{ann.acknowledged_count} / {ann.total_recipients}</strong> ({Math.round((ann.acknowledged_count / ann.total_recipients) * 100)}%)</span>
                <Badge variant="emerald">Required Acknowledgement</Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'logs' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                <th className="p-4 font-mono">Code</th>
                <th className="p-4">Recipient</th>
                <th className="p-4">Channel</th>
                <th className="p-4">Subject</th>
                <th className="p-4 font-mono">Timestamp</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs font-mono">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="p-4 font-bold text-gray-900">{log.message_code}</td>
                  <td className="p-4 font-sans font-extrabold text-gray-900">{log.recipient_name}</td>
                  <td className="p-4 font-sans"><Badge variant="emerald">{log.channel}</Badge></td>
                  <td className="p-4 font-sans text-gray-800 font-medium">{log.subject}</td>
                  <td className="p-4 text-gray-600">{log.timestamp}</td>
                  <td className="p-4 text-center font-sans"><Badge variant="emerald">{log.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
