import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Megaphone, Bell, HeartHandshake, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const EssCommunicationView: React.FC = () => {
  const { showToast } = useToast();

  const announcements = [
    { title: 'Independence Day Holiday & Q3 Townhall Schedule', date: '2026-08-10', author: 'Anand Viswanathan (HR Head)', content: 'Enterprise office holiday on August 15th. All-Hands Q3 Townhall on August 18th at 4 PM IST.', status: 'Published' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-[#07563D]" />
            <span>Communication, Announcements & Pulse Surveys</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Company broadcasts, HR messages, anonymous culture pulse surveys, and peer recognition feed</p>
        </div>

        <Badge variant="emerald">Communication Hub Connected</Badge>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Company Broadcast Announcements</h3>
        {announcements.map((ann, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-base font-extrabold text-gray-900">{ann.title}</h4>
                <p className="text-xs text-gray-500 mt-0.5">Published by {ann.author} • {ann.date}</p>
              </div>
              <Badge variant="emerald">{ann.status}</Badge>
            </div>
            <p className="text-xs text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">{ann.content}</p>
            <div className="flex justify-between items-center pt-1 text-xs">
              <Button size="sm" onClick={() => showToast('Announcement Acknowledged')}>
                Acknowledge Receipt
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
