import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Megaphone, Plus, HeartHandshake } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const TlCommunicationView: React.FC = () => {
  const { showToast } = useToast();

  const announcements = [
    { title: 'Frontend Team Code Freeze & Q3 Release Checklist', author: 'Anand (TL)', date: '2026-08-11', content: 'Code freeze starts Thursday at 6 PM IST. Please ensure all pull requests are reviewed by Wednesday evening.' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-[#07563D]" />
            <span>Team Broadcast Announcements & Recognition</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Publish team-scoped announcements, give peer recognition badges, and manage team communication</p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Publish Team Announcement modal opened')}>
          New Announcement
        </Button>
      </div>

      <div className="space-y-4">
        {announcements.map((a, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <Badge variant="emerald" size="sm">Team Broadcast</Badge>
                <h4 className="text-base font-extrabold text-gray-900 mt-1">{a.title}</h4>
                <p className="text-xs text-gray-500 mt-0.5">Published by {a.author} • {a.date}</p>
              </div>
            </div>
            <p className="text-xs text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">{a.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
