import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Calendar as CalendarIcon, Clock, MapPin, Video } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const TrainingCalendarView: React.FC = () => {
  const { showToast } = useToast();

  const calendarEvents = [
    { title: 'POSH 2026 Annual Compliance Self-Paced Deadline', date: '18 Aug 2026', time: '11:59 PM', type: 'Mandatory', location: 'Online LMS' },
    { title: 'New Employee Orientation Session Day 1', date: '18 Aug 2026', time: '10:00 AM - 01:00 PM', type: 'Session', location: 'Conference Hall A & Virtual' },
    { title: 'GCP Microservices & Kubernetes Architecture Workshop', date: '22 Aug 2026', time: '02:00 PM - 05:00 PM', type: 'Workshop', location: 'Virtual Meet Room 3' },
    { title: 'Information Security & Data Protection Exam', date: '25 Aug 2026', time: '11:00 AM - 12:00 PM', type: 'Assessment', location: 'Online Exam Center' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-[#07563D]" />
            <span>Master Enterprise Training & Certification Calendar</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Live training sessions, exam schedules, and certification renewal deadlines</p>
        </div>

        <Button size="sm" onClick={() => showToast('Syncing training calendar with Google/Outlook')}>
          Sync Calendar (.ics)
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {calendarEvents.map((evt, idx) => (
          <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#07563D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  {evt.type}
                </span>
                <h3 className="text-sm font-extrabold text-gray-900 mt-1">{evt.title}</h3>
              </div>
              <Badge variant="emerald">{evt.date}</Badge>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-gray-600">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                {evt.time}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                {evt.location}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
