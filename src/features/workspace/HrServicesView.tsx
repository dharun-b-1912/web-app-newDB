import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumb } from '../../components/shell/Breadcrumb';
import { Tabs } from '../../components/ui/Tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { HelpCircle, Megaphone, Send, Plus, Search, Filter, MessageSquare, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';

export const HrServicesView: React.FC<{ initialTab?: string }> = ({ initialTab = 'helpdesk' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const { showToast } = useToast();

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'HR SERVICES' }, { label: 'Service Desk & Communication' }]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#07563D]" /> HR Helpdesk, Broadcasts & Employee Requests
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            SLA-based ticketing system, company-wide announcements, policy query desk, and employee service requests.
          </p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('New Service Request Modal Opened')}>
          Raise Request
        </Button>
      </div>

      <Tabs
        tabs={[
          { id: 'helpdesk', label: 'HR Helpdesk Tickets', icon: <HelpCircle className="w-4 h-4" /> },
          { id: 'communication', label: 'Company Announcements', icon: <Megaphone className="w-4 h-4" /> },
          { id: 'requests', label: 'Employee Requests Hub', icon: <Send className="w-4 h-4" /> },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab 1: Helpdesk */}
      {activeTab === 'helpdesk' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="p-4 space-y-1">
              <div className="text-xs font-bold text-gray-400 uppercase">Open Tickets</div>
              <div className="text-2xl font-black text-amber-700">5 Active</div>
              <div className="text-[11px] text-amber-600 font-semibold">Avg First Response: 12 mins</div>
            </Card>
            <Card className="p-4 space-y-1">
              <div className="text-xs font-bold text-gray-400 uppercase">SLA Compliance</div>
              <div className="text-2xl font-black text-[#07563D]">99.1%</div>
              <div className="text-[11px] text-[#07563D] font-semibold">Resolved &lt; 24 hrs</div>
            </Card>
            <Card className="p-4 space-y-1">
              <div className="text-xs font-bold text-gray-400 uppercase">CSAT Score</div>
              <div className="text-2xl font-black text-gray-900">4.9 / 5.0</div>
              <div className="text-[11px] text-emerald-600 font-semibold">142 Ratings Collected</div>
            </Card>
            <Card className="p-4 space-y-1">
              <div className="text-xs font-bold text-gray-400 uppercase">Resolved This Month</div>
              <div className="text-2xl font-black text-blue-700">128</div>
              <div className="text-[11px] text-blue-600 font-semibold">Payroll & Benefits Qs</div>
            </Card>
          </div>

          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-extrabold text-gray-900">Active Helpdesk Queue</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket ID</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { id: 'TKT-1082', req: 'Karthik N.', subject: 'Form 16 Tax Calculation clarification', cat: 'Payroll & Tax', prio: 'High', status: 'In Progress' },
                  { id: 'TKT-1081', req: 'Priya Sharma', subject: 'Laptop battery replacement request', cat: 'IT & Assets', prio: 'Medium', status: 'Open' },
                  { id: 'TKT-1078', req: 'Deepa S.', subject: 'Maternity Leave extension inquiry', cat: 'Leave & Benefits', prio: 'Medium', status: 'Open' },
                ].map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono font-bold text-xs">{t.id}</TableCell>
                    <TableCell className="font-bold text-gray-900">{t.req}</TableCell>
                    <TableCell className="font-medium">{t.subject}</TableCell>
                    <TableCell>{t.cat}</TableCell>
                    <TableCell><Badge variant={t.prio === 'High' ? 'danger' : 'amber'}>{t.prio}</Badge></TableCell>
                    <TableCell><Badge variant={t.status === 'Open' ? 'info' : 'amber'}>{t.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => showToast(`Assigning ticket ${t.id} to HR Specialist`)}>
                        Respond
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* Tab 2: Announcements */}
      {activeTab === 'communication' && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-gray-900">Company Announcements & Broadcasts</h3>
            <Button size="sm" leftIcon={<Megaphone className="w-4 h-4" />} onClick={() => showToast('New Broadcast Composer Opened')}>
              New Announcement
            </Button>
          </div>

          <div className="space-y-3">
            {[
              { title: 'Annual Independence Day Townhall & Q3 All Hands Meeting', date: '12-Aug-2026', author: 'Arun Kumar (HR Head)', reads: '412 / 428 read' },
              { title: 'Updated Group Medical Health Insurance Plan 2026-27', date: '01-Aug-2026', author: 'Sneha Mukherjee', reads: '428 / 428 read' },
            ].map((a, i) => (
              <div key={i} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-900">{a.title}</h4>
                  <div className="text-[11px] text-gray-500 mt-0.5">By {a.author} • Published {a.date}</div>
                </div>
                <Badge variant="emerald">{a.reads}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 3: Requests */}
      {activeTab === 'requests' && (
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-extrabold text-gray-900">Employee Requests Center</h3>
          <p className="text-xs text-gray-500">Employment certificates, address proof letters, visa invitation requests.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-gray-100 bg-emerald-50/50 space-y-2">
              <div className="font-bold text-xs text-[#07563D]">Bonafide & Service Letter</div>
              <p className="text-[11px] text-gray-600">Auto-generated digitally signed PDF letter on company letterhead.</p>
              <Button size="sm" variant="outline" onClick={() => showToast('Generating Service Certificate PDF...')}>
                Generate Instantly
              </Button>
            </div>
            <div className="p-4 rounded-xl border border-gray-100 bg-blue-50/50 space-y-2">
              <div className="font-bold text-xs text-blue-900">Visa & Travel Sponsorship</div>
              <p className="text-[11px] text-gray-600">Official invitation letter for international business trips.</p>
              <Button size="sm" variant="outline" onClick={() => showToast('Requesting Visa Sponsorship Letter...')}>
                Request Letter
              </Button>
            </div>
            <div className="p-4 rounded-xl border border-gray-100 bg-purple-50/50 space-y-2">
              <div className="font-bold text-xs text-purple-900">NOC for Higher Studies</div>
              <p className="text-[11px] text-gray-600">No Objection Certificate for executive education programs.</p>
              <Button size="sm" variant="outline" onClick={() => showToast('Requesting NOC Approval Workflow...')}>
                Apply NOC
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
