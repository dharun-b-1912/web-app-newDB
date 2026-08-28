import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';
import {
  Megaphone,
  Plus,
  Send,
  CheckCircle2,
  Users,
  AlertTriangle,
  FileText,
  Clock,
  Building2,
  Eye,
  X,
  Sparkles,
} from 'lucide-react';
import { HrCommunication, CommunicationUrgency } from '../../types/employeeRelations';
import { employeeRelationsService } from '../../services/employeeRelationsService';

export const HrCommunicationsView: React.FC = () => {
  const { showToast } = useToast();
  const [comms, setComms] = useState<HrCommunication[]>(() =>
    employeeRelationsService.getCommunications()
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'ANNOUNCEMENT' | 'POLICY_UPDATE' | 'HOLIDAY' | 'PAYROLL' | 'BENEFITS' | 'EMERGENCY'>('ANNOUNCEMENT');
  const [urgency, setUrgency] = useState<CommunicationUrgency>('NORMAL');
  const [targetAudience, setTargetAudience] = useState('All Employees');
  const [content, setContent] = useState('');
  const [requiresAck, setRequiresAck] = useState(false);

  const refreshData = () => {
    setComms(employeeRelationsService.getCommunications());
  };

  useEffect(() => {
    const handleUpdate = () => refreshData();
    window.addEventListener('er:communications_updated', handleUpdate);
    return () => window.removeEventListener('er:communications_updated', handleUpdate);
  }, []);

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      showToast('Please enter announcement title and content');
      return;
    }

    if (urgency === 'EMERGENCY') {
      if (!window.confirm('EMERGENCY BROADCAST CONFIRMATION: This will trigger high-priority alerts to all employees. Do you want to proceed?')) {
        return;
      }
    }

    employeeRelationsService.publishCommunication({
      title,
      category,
      urgency,
      content,
      target_audience: targetAudience,
      published_by: 'Haripriya (HR Head)',
      requires_acknowledgement: requiresAck,
      version: 1,
      stats: {
        target_count: targetAudience === 'All Employees' ? 142 : 38,
        delivered_count: targetAudience === 'All Employees' ? 142 : 38,
        read_count: 0,
        acknowledged_count: 0,
      },
      attachments: [],
    });

    showToast('HR Broadcast published and delivered successfully!');
    setIsModalOpen(false);
    setTitle('');
    setContent('');
    refreshData();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">HR Communications & Broadcast Hub</h2>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                <span>Multi-Audience Targeting</span>
                <span>•</span>
                <span className="text-blue-700 font-medium">Policy Acknowledgement Tracking</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 max-w-3xl">
            Publish company-wide announcements, policy amendments, holiday schedules, and emergency notices with mandatory read-and-acknowledge verification.
          </p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
          + Create Announcement
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Published Broadcasts</div>
          <div className="text-2xl font-black text-gray-900 mt-0.5">{comms.length} Notices</div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Active on Employee Portal</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Average Read Rate</div>
          <div className="text-2xl font-black text-[#07563D] mt-0.5">94.8%</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Across web & mobile apps</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Policy Acknowledgement</div>
          <div className="text-2xl font-black text-blue-700 mt-0.5">91.2%</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Compliance legally audited</div>
        </Card>
      </div>

      {/* Communications Table */}
      <Card className="p-5 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/60">
              <TableHead className="font-bold text-xs text-gray-700">Notice Title</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Category & Urgency</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Target Audience</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Published Date</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Acknowledgement</TableHead>
              <TableHead className="font-bold text-xs text-gray-700 text-right">Reach Stats</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comms.map(c => (
              <TableRow key={c.id} className="hover:bg-gray-50/60 transition-colors">
                <TableCell>
                  <div className="font-bold text-xs text-gray-900">{c.title}</div>
                  <div className="text-[10px] text-gray-500 line-clamp-1">{c.content}</div>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={c.urgency === 'EMERGENCY' ? 'rose' : c.urgency === 'URGENT' ? 'amber' : 'blue'} size="sm">
                      {c.urgency}
                    </Badge>
                    <span className="text-[10px] text-gray-500">{c.category}</span>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="text-xs font-semibold text-gray-800">{c.target_audience}</div>
                </TableCell>

                <TableCell>
                  <div className="text-xs font-medium text-gray-700">
                    {new Date(c.published_at).toLocaleDateString()}
                  </div>
                </TableCell>

                <TableCell>
                  {c.requires_acknowledgement ? (
                    <Badge variant="purple" size="sm">
                      Mandatory Ack
                    </Badge>
                  ) : (
                    <span className="text-xs text-gray-400">Info Only</span>
                  )}
                </TableCell>

                <TableCell className="text-right">
                  <div className="text-xs font-bold text-gray-900">
                    {c.stats.target_count} Employees Target
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium">Delivered 100%</div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {comms.length === 0 && (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mx-auto border border-blue-100">
              <Megaphone className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-gray-900">No HR Broadcasts Published Yet</h4>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Publish announcements, policy updates, and holiday notices across specific teams or all employees.
            </p>
            <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
              Create First Announcement
            </Button>
          </div>
        )}
      </Card>

      {/* Publish Announcement Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-200 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Create HR Broadcast / Announcement</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePublish} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Annual Company Offsite & Holiday Schedule 2026"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium bg-white"
                  >
                    <option value="ANNOUNCEMENT">General Announcement</option>
                    <option value="POLICY_UPDATE">Policy Amendment</option>
                    <option value="HOLIDAY">Holiday Notification</option>
                    <option value="PAYROLL">Payroll & Benefits</option>
                    <option value="EMERGENCY">Emergency Notice</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Urgency</label>
                  <select
                    value={urgency}
                    onChange={e => setUrgency(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium bg-white"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="IMPORTANT">Important</option>
                    <option value="URGENT">Urgent</option>
                    <option value="EMERGENCY">Emergency Alert</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Target Audience</label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={e => setTargetAudience(e.target.value)}
                  placeholder="e.g. All Employees / Plant Factory A / Engineering"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Notice Content *</label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Write announcement body..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium h-24"
                  required
                />
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-gray-900 block">Require Read Acknowledgement</span>
                  <span className="text-[10px] text-gray-500">
                    Employees must explicitly click "I Acknowledge" in their portal.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={requiresAck}
                  onChange={e => setRequiresAck(e.target.checked)}
                  className="rounded text-[#07563D] w-4 h-4"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit">
                  Publish Broadcast
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
