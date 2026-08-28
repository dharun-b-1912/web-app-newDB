import React, { useState, useEffect, useMemo } from 'react';
import { communicationService } from '../../../services/communications/communicationService';
import { Communication, CommunicationType, CommunicationStatus } from '../../../types/employeeRelations';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/Toast';
import {
  Megaphone,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Users,
  Eye,
  Calendar,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Send,
  Clock,
  Archive,
  Check,
} from 'lucide-react';

export const CommunicationHubView: React.FC = () => {
  const { showToast } = useToast();
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'PUBLISHED' | 'SCHEDULED' | 'DRAFT' | 'ARCHIVED'>('PUBLISHED');
  const [searchQuery, setSearchQuery] = useState('');

  // Create / Edit Broadcast Modal
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [commType, setCommType] = useState<CommunicationType>('ANNOUNCEMENT');
  const [priority, setPriority] = useState<'NORMAL' | 'IMPORTANT' | 'URGENT'>('NORMAL');
  const [audienceType, setAudienceType] = useState<'ALL' | 'DEPARTMENT' | 'LOCATION'>('ALL');
  const [targetDept, setTargetDept] = useState('All Departments');
  const [requiresAck, setRequiresAck] = useState(false);
  const [authorName, setAuthorName] = useState('Joy HR Operations');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCommunications = async () => {
    setIsLoading(true);
    try {
      const data = await communicationService.fetchCommunications();
      setCommunications(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCommunications();
  }, []);

  const handlePublishBroadcast = async (status: CommunicationStatus = 'PUBLISHED') => {
    if (!title.trim() || !body.trim()) {
      showToast('Please provide a title and announcement message', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await communicationService.createOrUpdateCommunication({
        title: title.trim(),
        body: body.trim(),
        communication_type: commType,
        priority,
        status,
        audience_type: audienceType,
        target_departments: audienceType === 'DEPARTMENT' ? [targetDept] : [],
        requires_acknowledgement: requiresAck,
        author_name: authorName,
      });

      if (created) {
        showToast(
          status === 'PUBLISHED'
            ? 'Broadcast published! All matching employees notified in real time.'
            : 'Broadcast saved as draft.',
          'success'
        );
        setIsComposerOpen(false);
        resetComposer();
        loadCommunications();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async (id: string) => {
    const ok = await communicationService.updateStatus(id, 'ARCHIVED');
    if (ok) {
      showToast('Announcement archived', 'success');
      loadCommunications();
    }
  };

  const resetComposer = () => {
    setTitle('');
    setBody('');
    setCommType('ANNOUNCEMENT');
    setPriority('NORMAL');
    setAudienceType('ALL');
    setRequiresAck(false);
  };

  const filteredCommunications = useMemo(() => {
    return communications.filter((c) => {
      const matchesTab = c.status === activeTab;
      const matchesSearch =
        !searchQuery ||
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.body.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [communications, activeTab, searchQuery]);

  // Analytics Metrics
  const metrics = useMemo(() => {
    const published = communications.filter((c) => c.status === 'PUBLISHED').length;
    const scheduled = communications.filter((c) => c.status === 'SCHEDULED').length;
    const drafts = communications.filter((c) => c.status === 'DRAFT').length;
    const ackRequired = communications.filter((c) => c.requires_acknowledgement && c.status === 'PUBLISHED').length;
    return { published, scheduled, drafts, ackRequired };
  }, [communications]);

  const getTypeBadge = (type: CommunicationType) => {
    switch (type) {
      case 'EMERGENCY':
        return <Badge variant="danger" className="font-bold">EMERGENCY</Badge>;
      case 'HOLIDAY':
        return <Badge variant="emerald">HOLIDAY NOTICE</Badge>;
      case 'PAYROLL':
        return <Badge variant="blue">PAYROLL UPDATE</Badge>;
      case 'POLICY':
        return <Badge variant="amber">POLICY REVISION</Badge>;
      case 'BENEFITS':
        return <Badge variant="blue">BENEFITS & PERKS</Badge>;
      case 'EVENT':
        return <Badge variant="purple">COMPANY EVENT</Badge>;
      default:
        return <Badge variant="gray">ANNOUNCEMENT</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-[#07563D]" />
            <span>Communication Hub & Broadcast Studio</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Publish targeted company announcements, policy updates, holiday notices, and track employee acknowledgements in real time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={loadCommunications} disabled={isLoading}>
            <RotateCcw className={`w-3.5 h-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              resetComposer();
              setIsComposerOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create Broadcast
          </Button>
        </div>
      </div>

      {/* 2. Overview Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card
          onClick={() => setActiveTab('PUBLISHED')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'PUBLISHED' ? 'border-emerald-500 ring-2 ring-emerald-100 bg-emerald-50/20' : 'hover:border-gray-300'
          }`}
        >
          <div className="text-[11px] font-bold text-gray-500 uppercase">Live Published</div>
          <div className="text-xl font-black text-emerald-600 mt-0.5">{metrics.published}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Active on mobile feeds</div>
        </Card>

        <Card
          onClick={() => setActiveTab('SCHEDULED')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'SCHEDULED' ? 'border-blue-500 ring-2 ring-blue-100 bg-blue-50/20' : 'hover:border-gray-300'
          }`}
        >
          <div className="text-[11px] font-bold text-gray-500 uppercase">Scheduled</div>
          <div className="text-xl font-black text-blue-600 mt-0.5">{metrics.scheduled}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Future auto-releases</div>
        </Card>

        <Card
          onClick={() => setActiveTab('DRAFT')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'DRAFT' ? 'border-amber-500 ring-2 ring-amber-100 bg-amber-50/20' : 'hover:border-gray-300'
          }`}
        >
          <div className="text-[11px] font-bold text-gray-500 uppercase">Drafts</div>
          <div className="text-xl font-black text-amber-600 mt-0.5">{metrics.drafts}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Unpublished works</div>
        </Card>

        <Card className="p-3.5 rounded-xl border bg-[#07563D]/5 border-[#07563D]/20">
          <div className="text-[11px] font-bold text-[#07563D] uppercase">Acks Required</div>
          <div className="text-xl font-black text-[#07563D] mt-0.5">{metrics.ackRequired}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Mandatory sign-offs</div>
        </Card>
      </div>

      {/* 3. Section Tabs & Search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          {(['PUBLISHED', 'SCHEDULED', 'DRAFT', 'ARCHIVED'] as CommunicationStatus[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === tab
                  ? 'bg-[#07563D] text-white shadow-2xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab === 'PUBLISHED' && 'Published'}
              {tab === 'SCHEDULED' && 'Scheduled'}
              {tab === 'DRAFT' && 'Drafts'}
              {tab === 'ARCHIVED' && 'Archived'}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#07563D]/20 focus:border-[#07563D]"
          />
        </div>
      </div>

      {/* 4. Broadcast Cards Feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCommunications.length === 0 ? (
          <div className="col-span-2 p-12 bg-white rounded-2xl border border-gray-200 text-center text-gray-400">
            <Megaphone className="w-10 h-10 text-gray-300 mx-auto mb-2 opacity-50" />
            <p className="font-bold text-gray-700">No broadcasts found in this section</p>
            <p className="text-xs text-gray-400 mt-1">Click "Create Broadcast" to author a company announcement.</p>
          </div>
        ) : (
          filteredCommunications.map((comm) => (
            <Card key={comm.id} className="p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getTypeBadge(comm.communication_type)}
                    {comm.priority === 'URGENT' && <Badge variant="danger">URGENT</Badge>}
                    {comm.requires_acknowledgement && (
                      <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-[10px] font-bold">
                        Ack Required
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-400">
                    {new Date(comm.publish_at || comm.created_at).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-sm font-black text-gray-900">{comm.title}</h3>
                <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                  {comm.body}
                </p>
              </div>

              {/* Engagement Stats & Actions */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-3 text-gray-500">
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-[#07563D]" />
                    <span>Target: {comm.audience_type === 'ALL' ? 'All Staff' : comm.target_departments?.join(', ') || 'Custom'}</span>
                  </div>

                  {comm.requires_acknowledgement && (
                    <div className="flex items-center gap-1 text-emerald-700 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{comm.acknowledged_count || 0} Acknowledged</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {comm.status === 'PUBLISHED' && (
                    <button
                      onClick={() => handleArchive(comm.id)}
                      className="px-2.5 py-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Archive
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* 5. Broadcast Composer Modal */}
      {isComposerOpen && (
        <Modal
          isOpen={isComposerOpen}
          onClose={() => setIsComposerOpen(false)}
          title="Compose Company Broadcast"
          size="lg"
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-gray-700 block mb-1">Broadcast Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Annual Company Holiday Schedule 2026-2027"
                className="w-full p-2.5 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#07563D]/20 focus:border-[#07563D] font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Category</label>
                <select
                  value={commType}
                  onChange={(e) => setCommType(e.target.value as CommunicationType)}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                >
                  <option value="ANNOUNCEMENT">General Announcement</option>
                  <option value="HOLIDAY">Holiday & Calendar</option>
                  <option value="PAYROLL">Payroll & Bonus Notice</option>
                  <option value="POLICY">Policy Update</option>
                  <option value="BENEFITS">Health & Benefits</option>
                  <option value="EMERGENCY">Urgent / Emergency</option>
                  <option value="EVENT">Company Event</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="IMPORTANT">Important</option>
                  <option value="URGENT">Urgent Alert</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Target Audience</label>
                <select
                  value={audienceType}
                  onChange={(e) => setAudienceType(e.target.value as any)}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                >
                  <option value="ALL">Entire Organization</option>
                  <option value="DEPARTMENT">Specific Department</option>
                  <option value="LOCATION">Specific Location</option>
                </select>
              </div>
            </div>

            {audienceType === 'DEPARTMENT' && (
              <div>
                <label className="font-bold text-gray-700 block mb-1">Select Target Department</label>
                <select
                  value={targetDept}
                  onChange={(e) => setTargetDept(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                >
                  <option value="Development">Development & Engineering</option>
                  <option value="Sales">Sales & Marketing</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Finance">Finance & Accounts</option>
                  <option value="Operations">Operations</option>
                </select>
              </div>
            )}

            <div>
              <label className="font-bold text-gray-700 block mb-1">Message Body *</label>
              <textarea
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write the announcement details, policy notes, or event instructions..."
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#07563D]/20 focus:border-[#07563D]"
              />
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-gray-900">Require Explicit Employee Acknowledgement</div>
                <div className="text-gray-500 text-[11px]">
                  Employees will see an "Acknowledge" button in their mobile app to confirm receipt.
                </div>
              </div>
              <input
                type="checkbox"
                checked={requiresAck}
                onChange={(e) => setRequiresAck(e.target.checked)}
                className="w-4 h-4 accent-[#07563D] cursor-pointer"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="ghost" onClick={() => setIsComposerOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePublishBroadcast('DRAFT')}
                disabled={isSubmitting}
              >
                Save as Draft
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => handlePublishBroadcast('PUBLISHED')}
                disabled={isSubmitting}
                leftIcon={<Send className="w-3.5 h-3.5" />}
              >
                {isSubmitting ? 'Publishing...' : 'Publish to Staff Now'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
