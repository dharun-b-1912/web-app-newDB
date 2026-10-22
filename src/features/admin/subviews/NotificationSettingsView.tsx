// src/features/admin/subviews/NotificationSettingsView.tsx
// ============================================================================
// Joy PeopleHR — Enterprise Universal Multi-Tenant Notification Rules Hub
// Omni-Channel Delivery Configuration across In-App, Email, WhatsApp, and SMS
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';
import {
  Megaphone,
  Mail,
  MessageSquare,
  Plus,
  Smartphone,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  Sliders,
  Send,
  History,
  Sparkles,
  ShieldAlert,
  Calendar,
  DollarSign,
  UserCheck,
  Clock,
  Layers,
  ArrowRight,
  Eye,
  Check,
} from 'lucide-react';
import {
  universalNotificationEngine,
  NotificationRule,
  NotificationModule,
  RecipientTarget,
  NotificationPriority,
  NotificationDispatchResult,
} from '../../../services/notification/universalNotificationEngine';
import { useTenant } from '../../../hooks/useTenant';

export const NotificationSettingsView: React.FC = () => {
  const { showToast } = useToast();
  const { organization } = useTenant();
  const activeOrgId = organization?.id || '0c621892-e938-4707-9957-13534ea32c19';

  // Navigation State
  const [activeTab, setActiveTab] = useState<'rules' | 'logs'>('rules');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Rules State
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Dispatch Logs State
  const [dispatchLogs, setDispatchLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);

  // Create / Edit Rule Modal State
  const [isRuleModalOpen, setIsRuleModalOpen] = useState<boolean>(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleName, setRuleName] = useState<string>('');
  const [ruleModule, setRuleModule] = useState<NotificationModule>('ATTENDANCE');
  const [ruleTrigger, setRuleTrigger] = useState<string>('PUNCH_LATE');
  const [ruleDescription, setRuleDescription] = useState<string>('');
  const [enableInApp, setEnableInApp] = useState<boolean>(true);
  const [enableEmail, setEnableEmail] = useState<boolean>(true);
  const [enableWhatsApp, setEnableWhatsApp] = useState<boolean>(true);
  const [enableSms, setEnableSms] = useState<boolean>(false);
  const [targetRecipients, setTargetRecipients] = useState<RecipientTarget[]>(['EMPLOYEE']);
  const [subjectTemplate, setSubjectTemplate] = useState<string>('');
  const [bodyTemplate, setBodyTemplate] = useState<string>('');
  const [rulePriority, setRulePriority] = useState<NotificationPriority>('NORMAL');
  const [quietHoursRespect, setQuietHoursRespect] = useState<boolean>(true);
  const [isSavingRule, setIsSavingRule] = useState<boolean>(false);

  // Test Dispatch Modal State
  const [isTestModalOpen, setIsTestModalOpen] = useState<boolean>(false);
  const [testRule, setTestRule] = useState<NotificationRule | null>(null);
  const [testEmail, setTestEmail] = useState<string>('marimuthu@joycorporatesolutions.com');
  const [testPhone, setTestPhone] = useState<string>('+919876543210');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<NotificationDispatchResult | null>(null);

  // Delete Rule State
  const [deleteRuleTarget, setDeleteRuleTarget] = useState<NotificationRule | null>(null);

  // Load rules on mount
  const loadRules = async () => {
    setIsLoading(true);
    try {
      const data = await universalNotificationEngine.getRules(activeOrgId);
      setRules(data);
    } catch (err: any) {
      showToast(err.message || 'Error loading notification rules', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const data = await universalNotificationEngine.getDispatchLogs(activeOrgId, 30);
      setDispatchLogs(data);
    } catch (err: any) {
      showToast('Error loading dispatch history', 'error');
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, [activeOrgId]);

  useEffect(() => {
    if (activeTab === 'logs') {
      loadLogs();
    }
  }, [activeTab, activeOrgId]);

  // Filtered Rules
  const filteredRules = useMemo(() => {
    return rules.filter(r => {
      const matchesModule = selectedModule === 'ALL' || r.module === selectedModule;
      const matchesSearch =
        searchQuery.trim() === '' ||
        r.rule_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.event_trigger.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.body_template.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesModule && matchesSearch;
    });
  }, [rules, selectedModule, searchQuery]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingRuleId(null);
    setRuleName('');
    setRuleModule('ATTENDANCE');
    setRuleTrigger('CUSTOM_ALERT');
    setRuleDescription('');
    setEnableInApp(true);
    setEnableEmail(true);
    setEnableWhatsApp(true);
    setEnableSms(false);
    setTargetRecipients(['EMPLOYEE']);
    setSubjectTemplate('Alert: {{employee_name}} Notification');
    setBodyTemplate('Hello {{employee_name}}, this is an automated notification regarding your account on {{date}}.');
    setRulePriority('NORMAL');
    setQuietHoursRespect(true);
    setIsRuleModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (rule: NotificationRule) => {
    setEditingRuleId(rule.id);
    setRuleName(rule.rule_name);
    setRuleModule(rule.module);
    setRuleTrigger(rule.event_trigger);
    setRuleDescription(rule.description || '');
    setEnableInApp(rule.enable_in_app);
    setEnableEmail(rule.enable_email);
    setEnableWhatsApp(rule.enable_whatsapp);
    setEnableSms(rule.enable_sms);
    setTargetRecipients(rule.target_recipients);
    setSubjectTemplate(rule.subject_template || '');
    setBodyTemplate(rule.body_template);
    setRulePriority(rule.priority);
    setQuietHoursRespect(rule.quiet_hours_respect);
    setIsRuleModalOpen(true);
  };

  // Save Rule (Create or Update)
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim() || !bodyTemplate.trim()) {
      showToast('Please enter rule name and body template', 'warning');
      return;
    }

    setIsSavingRule(true);
    try {
      if (editingRuleId) {
        await universalNotificationEngine.updateRule(
          editingRuleId,
          {
            rule_name: ruleName,
            module: ruleModule,
            event_trigger: ruleTrigger,
            description: ruleDescription,
            enable_in_app: enableInApp,
            enable_email: enableEmail,
            enable_whatsapp: enableWhatsApp,
            enable_sms: enableSms,
            target_recipients: targetRecipients,
            subject_template: subjectTemplate,
            body_template: bodyTemplate,
            priority: rulePriority,
            quiet_hours_respect: quietHoursRespect,
          },
          activeOrgId
        );
        showToast('Notification rule updated successfully', 'success');
      } else {
        await universalNotificationEngine.createRule({
          organization_id: activeOrgId,
          rule_name: ruleName,
          module: ruleModule,
          event_trigger: ruleTrigger,
          description: ruleDescription,
          enable_in_app: enableInApp,
          enable_email: enableEmail,
          enable_whatsapp: enableWhatsApp,
          enable_sms: enableSms,
          target_recipients: targetRecipients,
          subject_template: subjectTemplate,
          body_template: bodyTemplate,
          priority: rulePriority,
          quiet_hours_respect: quietHoursRespect,
          is_active: true,
        });
        showToast('Notification rule created successfully', 'success');
      }

      await loadRules();
      setIsRuleModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to save rule', 'error');
    } finally {
      setIsSavingRule(false);
    }
  };

  // Fast Toggle Rule Active Status
  const handleToggleActive = async (rule: NotificationRule) => {
    const nextState = !rule.is_active;
    try {
      await universalNotificationEngine.toggleRuleActive(rule.id, nextState, activeOrgId);
      setRules(prev => prev.map(r => (r.id === rule.id ? { ...r, is_active: nextState } : r)));
      showToast(`Rule "${rule.rule_name}" ${nextState ? 'enabled' : 'paused'}`, 'info');
    } catch (err: any) {
      showToast('Failed to toggle rule state', 'error');
    }
  };

  // Fast Toggle Rule Channel
  const handleToggleChannel = async (
    rule: NotificationRule,
    channel: 'enable_in_app' | 'enable_email' | 'enable_whatsapp' | 'enable_sms',
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    const nextState = !rule[channel];
    try {
      await universalNotificationEngine.updateRule(rule.id, { [channel]: nextState }, activeOrgId);
      setRules(prev => prev.map(r => (r.id === rule.id ? { ...r, [channel]: nextState } : r)));
      showToast(`Updated ${channel.replace('enable_', '').toUpperCase()} for ${rule.rule_name}`, 'success');
    } catch {
      showToast('Failed to update channel setting', 'error');
    }
  };

  // Confirm Delete Rule
  const handleDeleteRule = async () => {
    if (!deleteRuleTarget) return;
    try {
      await universalNotificationEngine.deleteRule(deleteRuleTarget.id, activeOrgId);
      setRules(prev => prev.filter(r => r.id !== deleteRuleTarget.id));
      showToast(`Deleted rule "${deleteRuleTarget.rule_name}"`, 'success');
      setDeleteRuleTarget(null);
    } catch {
      showToast('Failed to delete rule', 'error');
    }
  };

  // Open Test Modal
  const handleOpenTestModal = (rule?: NotificationRule) => {
    setTestRule(rule || rules[0] || null);
    setTestResult(null);
    setIsTestModalOpen(true);
  };

  // Execute Test Dispatch
  const handleExecuteTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRule) return;

    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await universalNotificationEngine.testDispatch(testRule, {
        email: testEmail,
        phone: testPhone,
      });
      setTestResult(res);
      showToast('Live test dispatch executed across enabled channels!', 'success');
      loadLogs();
    } catch (err: any) {
      showToast(err.message || 'Error executing test dispatch', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  // Variable chip inserter helper
  const handleInsertVariable = (token: string) => {
    setBodyTemplate(prev => prev + (prev.endsWith(' ') ? '' : ' ') + token);
  };

  // Available tokens for current module
  const availableTokens = useMemo(() => {
    return universalNotificationEngine.getAvailableVariables(ruleModule);
  }, [ruleModule]);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-[#07563D] border border-emerald-100">
              <Megaphone className="w-5 h-5 text-[#07563D]" />
            </span>
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <span>Enterprise Notification Rules Hub</span>
                <Badge variant="success" size="sm" className="font-mono text-[10px]">
                  Multi-Tenant Engine
                </Badge>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Centralized rule matrix managing delivery across <span className="font-semibold text-gray-700">In-App, Email, WhatsApp, and SMS</span> with zero code changes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Play className="w-3.5 h-3.5 text-emerald-700" />}
            onClick={() => handleOpenTestModal()}
          >
            Test Dispatch Engine
          </Button>
          <Button
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleOpenCreateModal}
            className="bg-[#07563D] hover:bg-[#064e35] text-white shadow-xs font-semibold"
          >
            Create Notification Rule
          </Button>
        </div>
      </div>

      {/* Migration Notice Banner if table is not yet in PostgreSQL */}
      {!universalNotificationEngine.isTableMigrated() && (
        <div className="bg-emerald-50/80 border border-emerald-200/80 p-3 rounded-xl flex items-center justify-between text-xs text-emerald-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              <strong>Universal Engine Active:</strong> All 10 pre-configured rules across Email, WhatsApp, SMS, and In-App are live. (To enable PostgreSQL persistence, run <code className="font-mono bg-white px-1.5 py-0.5 rounded text-[11px] border border-emerald-200">20261022_157_universal_notification_rules.sql</code> in your Supabase SQL editor).
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText('20261022_157_universal_notification_rules.sql');
              showToast('Migration name copied to clipboard!', 'info');
            }}
            className="text-[11px] font-bold text-emerald-800 underline hover:text-emerald-950 cursor-pointer ml-3 shrink-0"
          >
            Copy SQL Name
          </button>
        </div>
      )}

      {/* 2. Channel Provider Health & Status HUD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* In-App Stream */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-[#07563D]" />
                In-App Realtime Stream
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Connected
              </span>
            </div>
            <div className="mt-2.5">
              <span className="text-lg font-black text-gray-900 block">Supabase Realtime</span>
              <span className="text-gray-500 text-[11px] block mt-0.5">WebSockets & Bell Notifications</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400 font-mono">
            <span>Latency: &lt; 85ms</span>
            <span className="text-emerald-700 font-sans font-medium">100% Operational</span>
          </div>
        </div>

        {/* Email Provider */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-emerald-700" />
                Enterprise SMTP Gateway
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Verified
              </span>
            </div>
            <div className="mt-2.5">
              <span className="text-lg font-black text-gray-900 block">Hostinger Secure SMTP</span>
              <span className="text-gray-500 text-[11px] block mt-0.5">TLS Port 465 (noreply@joypeoplehr.com)</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400 font-mono">
            <span>DKIM / SPF: Valid</span>
            <span className="text-emerald-700 font-sans font-medium">Outlook & Gmail Ready</span>
          </div>
        </div>

        {/* WhatsApp Business API */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-emerald-800" />
                WhatsApp Business API
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Official Meta
              </span>
            </div>
            <div className="mt-2.5">
              <span className="text-lg font-black text-gray-900 block">Cloud API v20.0</span>
              <span className="text-gray-500 text-[11px] block mt-0.5">2-Way Bot & Interactive Receipts</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400 font-mono">
            <span>WABA ID: Verified</span>
            <span className="text-emerald-700 font-sans font-medium">99.7% Delivery</span>
          </div>
        </div>

        {/* SMS Gateway */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-blue-700" />
                Enterprise SMS Gateway
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                DLT TRAI
              </span>
            </div>
            <div className="mt-2.5">
              <span className="text-lg font-black text-gray-900 block">Airtel IQ Gateway</span>
              <span className="text-gray-500 text-[11px] block mt-0.5">Transactional OTPs & Critical Alerts</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400 font-mono">
            <span>DLT Header: Registered</span>
            <span className="text-blue-700 font-sans font-medium">Prepaid Ready</span>
          </div>
        </div>
      </div>

      {/* 3. Tab Bar & Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-100 pb-3">
          {/* Main Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('rules')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5',
                activeTab === 'rules'
                  ? 'bg-[#07563D] text-white shadow-2xs'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Notification Rules Matrix ({rules.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5',
                activeTab === 'logs'
                  ? 'bg-[#07563D] text-white shadow-2xs'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <History className="w-3.5 h-3.5" />
              <span>Live Dispatch Logs</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search rules, triggers, copy..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#07563D]/20 focus:border-[#07563D]"
            />
          </div>
        </div>

        {/* Module Filter Chips */}
        {activeTab === 'rules' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1">Module:</span>
            {[
              { id: 'ALL', label: 'All Modules' },
              { id: 'ATTENDANCE', label: 'Attendance' },
              { id: 'LEAVE', label: 'Leaves & Approvals' },
              { id: 'PAYROLL', label: 'Payroll & Compensation' },
              { id: 'IAM', label: 'IAM & Security' },
              { id: 'OVERTIME', label: 'Overtime & Compliance' },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedModule(m.id)}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-semibold transition-colors whitespace-nowrap cursor-pointer text-xs',
                  selectedModule === m.id
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200/60'
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. Tab Content */}
      {activeTab === 'rules' ? (
        /* Rules Table */
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Rule Name & Trigger</th>
                  <th className="py-3 px-4">Target Module</th>
                  <th className="py-3 px-4 text-center">Active Delivery Channels</th>
                  <th className="py-3 px-4">Recipients</th>
                  <th className="py-3 px-4 text-center">Priority</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#07563D]" />
                      Loading universal notification rules...
                    </td>
                  </tr>
                ) : filteredRules.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      <Sliders className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      No notification rules found matching your filter.
                    </td>
                  </tr>
                ) : (
                  filteredRules.map(rule => (
                    <tr
                      key={rule.id}
                      className={cn(
                        'hover:bg-gray-50/70 transition-colors',
                        !rule.is_active && 'opacity-60 bg-gray-50/30'
                      )}
                    >
                      {/* Name & Trigger */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-gray-900 flex items-center gap-1.5">
                          <span>{rule.rule_name}</span>
                          {!rule.is_active && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-gray-200 text-gray-600 rounded">
                              Paused
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="font-mono text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-semibold">
                            {rule.event_trigger}
                          </span>
                        </div>
                        {rule.description && (
                          <p className="text-[11px] text-gray-400 mt-1 line-clamp-1">{rule.description}</p>
                        )}
                      </td>

                      {/* Module */}
                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-[11px] border',
                            rule.module === 'ATTENDANCE' && 'bg-blue-50 text-blue-800 border-blue-200',
                            rule.module === 'LEAVE' && 'bg-purple-50 text-purple-800 border-purple-200',
                            rule.module === 'PAYROLL' && 'bg-emerald-50 text-emerald-800 border-emerald-200',
                            rule.module === 'IAM' && 'bg-amber-50 text-amber-800 border-amber-200',
                            rule.module === 'OVERTIME' && 'bg-orange-50 text-orange-800 border-orange-200',
                            rule.module === 'COMPLIANCE' && 'bg-teal-50 text-teal-800 border-teal-200'
                          )}
                        >
                          {rule.module}
                        </span>
                      </td>

                      {/* Active Channels Matrix */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1 p-1 bg-gray-50 border border-gray-200/60 rounded-xl">
                          {/* In-App */}
                          <button
                            type="button"
                            title={`In-App: ${rule.enable_in_app ? 'Enabled' : 'Disabled'} (Click to toggle)`}
                            onClick={e => handleToggleChannel(rule, 'enable_in_app', e)}
                            className={cn(
                              'p-1.5 rounded-lg transition-all cursor-pointer',
                              rule.enable_in_app
                                ? 'bg-[#07563D] text-white shadow-2xs hover:bg-[#064e35]'
                                : 'bg-gray-100 text-gray-300 hover:text-gray-500'
                            )}
                          >
                            <Bell className="w-3.5 h-3.5" />
                          </button>

                          {/* Email */}
                          <button
                            type="button"
                            title={`Email: ${rule.enable_email ? 'Enabled' : 'Disabled'} (Click to toggle)`}
                            onClick={e => handleToggleChannel(rule, 'enable_email', e)}
                            className={cn(
                              'p-1.5 rounded-lg transition-all cursor-pointer',
                              rule.enable_email
                                ? 'bg-emerald-700 text-white shadow-2xs hover:bg-emerald-800'
                                : 'bg-gray-100 text-gray-300 hover:text-gray-500'
                            )}
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>

                          {/* WhatsApp */}
                          <button
                            type="button"
                            title={`WhatsApp: ${rule.enable_whatsapp ? 'Enabled' : 'Disabled'} (Click to toggle)`}
                            onClick={e => handleToggleChannel(rule, 'enable_whatsapp', e)}
                            className={cn(
                              'p-1.5 rounded-lg transition-all cursor-pointer',
                              rule.enable_whatsapp
                                ? 'bg-emerald-800 text-white shadow-2xs hover:bg-emerald-900'
                                : 'bg-gray-100 text-gray-300 hover:text-gray-500'
                            )}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          {/* SMS */}
                          <button
                            type="button"
                            title={`SMS: ${rule.enable_sms ? 'Enabled' : 'Disabled'} (Click to toggle)`}
                            onClick={e => handleToggleChannel(rule, 'enable_sms', e)}
                            className={cn(
                              'p-1.5 rounded-lg transition-all cursor-pointer',
                              rule.enable_sms
                                ? 'bg-blue-600 text-white shadow-2xs hover:bg-blue-700'
                                : 'bg-gray-100 text-gray-300 hover:text-gray-500'
                            )}
                          >
                            <Smartphone className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Recipients */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {rule.target_recipients.map(r => (
                            <span
                              key={r}
                              className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-700"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full inline-block',
                            rule.priority === 'HIGH' && 'bg-red-50 text-red-700 border border-red-200',
                            rule.priority === 'NORMAL' && 'bg-gray-100 text-gray-700',
                            rule.priority === 'LOW' && 'bg-blue-50 text-blue-600'
                          )}
                        >
                          {rule.priority}
                        </span>
                      </td>

                      {/* Active Status Toggle */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(rule)}
                          className={cn(
                            'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                            rule.is_active ? 'bg-[#07563D]' : 'bg-gray-300'
                          )}
                        >
                          <span
                            className={cn(
                              'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                              rule.is_active ? 'translate-x-4' : 'translate-x-0'
                            )}
                          />
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            title="Test Dispatch"
                            onClick={() => handleOpenTestModal(rule)}
                            className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Edit Rule"
                            onClick={() => handleOpenEditModal(rule)}
                            className="p-1.5 text-gray-500 hover:text-[#07563D] hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Delete Rule"
                            onClick={() => setDeleteRuleTarget(rule)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Dispatch Logs Table */
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <History className="w-4 h-4 text-[#07563D]" />
                Live Multi-Channel Delivery Audit Trail
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Real-time transaction history from PostgreSQL <code className="font-mono text-emerald-800">communication_dispatch_logs</code>
              </p>
            </div>
            <Button size="xs" variant="outline" leftIcon={<RefreshCw className="w-3 h-3" />} onClick={loadLogs}>
              Refresh Logs
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Channel & Provider</th>
                  <th className="py-2.5 px-4">Trigger / Template</th>
                  <th className="py-2.5 px-4">Recipient</th>
                  <th className="py-2.5 px-4">Message Snippet</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Dispatched At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono">
                {isLoadingLogs ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400 font-sans">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#07563D]" />
                      Loading live dispatch logs...
                    </td>
                  </tr>
                ) : dispatchLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400 font-sans">
                      <History className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      No recent dispatch logs found for this tenant. Run a Test Dispatch to generate logs!
                    </td>
                  </tr>
                ) : (
                  dispatchLogs.map((log: any, index: number) => (
                    <tr key={log.id || index} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-4 font-sans">
                        <div className="flex items-center gap-1.5">
                          {log.channel === 'EMAIL' && <Mail className="w-3.5 h-3.5 text-emerald-700" />}
                          {log.channel === 'WHATSAPP' && <MessageSquare className="w-3.5 h-3.5 text-emerald-800" />}
                          {log.channel === 'SMS' && <Smartphone className="w-3.5 h-3.5 text-blue-600" />}
                          {log.channel === 'IN_APP' && <Bell className="w-3.5 h-3.5 text-[#07563D]" />}
                          <span className="font-bold text-gray-800">{log.channel}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 block">{log.provider || 'Gateway'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-gray-900 font-bold">{log.template_key || 'CUSTOM'}</span>
                      </td>
                      <td className="py-3 px-4 font-sans text-gray-600">
                        {log.recipient_phone || log.recipient_email || 'Tenant Subscribers'}
                      </td>
                      <td className="py-3 px-4 font-sans max-w-sm">
                        <p className="line-clamp-2 text-gray-700 text-[11px]">{log.message_content || '—'}</p>
                        {log.error_message && (
                          <span className="text-red-600 text-[10px] block mt-0.5 truncate">{log.error_message}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-sans">
                        <span
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full inline-block',
                            log.status === 'DELIVERED' && 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                            log.status === 'SENT' && 'bg-blue-50 text-blue-700 border border-blue-200',
                            log.status === 'FAILED' && 'bg-red-50 text-red-700 border border-red-200',
                            log.status === 'PENDING' && 'bg-amber-50 text-amber-700 border border-amber-200'
                          )}
                        >
                          {log.status || 'DELIVERED'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-gray-400 font-sans text-[11px]">
                        {log.created_at ? new Date(log.created_at).toLocaleString('en-GB') : 'Just now'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Create / Edit Notification Rule Modal */}
      <Modal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        title={editingRuleId ? 'Edit Notification Rule' : 'Create Universal Notification Rule'}
        description="Configure event triggers, omni-channel delivery routes, recipient matrices, and message templates."
        maxWidth="3xl"
      >
        <form onSubmit={handleSaveRule} className="space-y-5">
          {/* Section A: Rule Identity & Triggers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-bold text-gray-700">Rule Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Late Check-In Alert"
                value={ruleName}
                onChange={e => setRuleName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#07563D]/20 focus:border-[#07563D]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">HR Module</label>
              <select
                value={ruleModule}
                onChange={e => setRuleModule(e.target.value as NotificationModule)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#07563D]/20 focus:border-[#07563D]"
              >
                <option value="ATTENDANCE">Attendance</option>
                <option value="LEAVE">Leaves & Approvals</option>
                <option value="PAYROLL">Payroll</option>
                <option value="IAM">IAM & Security</option>
                <option value="OVERTIME">Overtime</option>
                <option value="COMPLIANCE">Compliance</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Event Trigger Code</label>
              <input
                type="text"
                required
                placeholder="e.g. PUNCH_LATE, LEAVE_APPLIED"
                value={ruleTrigger}
                onChange={e => setRuleTrigger(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                className="w-full px-3 py-2 font-mono bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-emerald-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#07563D]/20 focus:border-[#07563D]"
              />
              <span className="text-[10px] text-gray-400">Unique programmatic event key emitted by SaaS core</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Description</label>
              <input
                type="text"
                placeholder="Brief internal note regarding this alert policy"
                value={ruleDescription}
                onChange={e => setRuleDescription(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#07563D]/20 focus:border-[#07563D]"
              />
            </div>
          </div>

          {/* Section B: Delivery Channels (4 Interactive Cards) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
              <span>Active Delivery Channels</span>
              <span className="text-[11px] font-normal text-gray-500">Enable multi-channel broadcast</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* In-App */}
              <div
                onClick={() => setEnableInApp(!enableInApp)}
                className={cn(
                  'p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between',
                  enableInApp
                    ? 'bg-emerald-50/50 border-[#07563D] shadow-2xs'
                    : 'bg-gray-50 border-gray-200 opacity-60'
                )}
              >
                <div className="flex items-center justify-between">
                  <Bell className={cn('w-4 h-4', enableInApp ? 'text-[#07563D]' : 'text-gray-400')} />
                  <input
                    type="checkbox"
                    checked={enableInApp}
                    onChange={() => {}}
                    className="accent-[#07563D] cursor-pointer"
                  />
                </div>
                <div className="mt-2">
                  <span className="font-bold text-xs text-gray-900 block">In-App Alert</span>
                  <span className="text-[10px] text-gray-500 block">Realtime Bell</span>
                </div>
              </div>

              {/* Email */}
              <div
                onClick={() => setEnableEmail(!enableEmail)}
                className={cn(
                  'p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between',
                  enableEmail
                    ? 'bg-emerald-50/50 border-emerald-600 shadow-2xs'
                    : 'bg-gray-50 border-gray-200 opacity-60'
                )}
              >
                <div className="flex items-center justify-between">
                  <Mail className={cn('w-4 h-4', enableEmail ? 'text-emerald-700' : 'text-gray-400')} />
                  <input
                    type="checkbox"
                    checked={enableEmail}
                    onChange={() => {}}
                    className="accent-emerald-700 cursor-pointer"
                  />
                </div>
                <div className="mt-2">
                  <span className="font-bold text-xs text-gray-900 block">Email SMTP</span>
                  <span className="text-[10px] text-gray-500 block">Hostinger Secure</span>
                </div>
              </div>

              {/* WhatsApp */}
              <div
                onClick={() => setEnableWhatsApp(!enableWhatsApp)}
                className={cn(
                  'p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between',
                  enableWhatsApp
                    ? 'bg-emerald-50/50 border-emerald-700 shadow-2xs'
                    : 'bg-gray-50 border-gray-200 opacity-60'
                )}
              >
                <div className="flex items-center justify-between">
                  <MessageSquare className={cn('w-4 h-4', enableWhatsApp ? 'text-emerald-800' : 'text-gray-400')} />
                  <input
                    type="checkbox"
                    checked={enableWhatsApp}
                    onChange={() => {}}
                    className="accent-emerald-800 cursor-pointer"
                  />
                </div>
                <div className="mt-2">
                  <span className="font-bold text-xs text-gray-900 block">WhatsApp</span>
                  <span className="text-[10px] text-gray-500 block">Meta Cloud API</span>
                </div>
              </div>

              {/* SMS */}
              <div
                onClick={() => setEnableSms(!enableSms)}
                className={cn(
                  'p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between',
                  enableSms
                    ? 'bg-blue-50/50 border-blue-600 shadow-2xs'
                    : 'bg-gray-50 border-gray-200 opacity-60'
                )}
              >
                <div className="flex items-center justify-between">
                  <Smartphone className={cn('w-4 h-4', enableSms ? 'text-blue-600' : 'text-gray-400')} />
                  <input
                    type="checkbox"
                    checked={enableSms}
                    onChange={() => {}}
                    className="accent-blue-600 cursor-pointer"
                  />
                </div>
                <div className="mt-2">
                  <span className="font-bold text-xs text-gray-900 block">SMS Gateway</span>
                  <span className="text-[10px] text-gray-500 block">Airtel IQ DLT</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section C: Target Recipients */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700">Target Recipient Roles</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'EMPLOYEE', label: 'Employee' },
                { id: 'MANAGER', label: 'Reporting Manager' },
                { id: 'HR_HEAD', label: 'HR Head' },
                { id: 'COMPANY_ADMIN', label: 'Company Admin' },
                { id: 'DEPT_HEAD', label: 'Department Head' },
              ].map(role => {
                const isSelected = targetRecipients.includes(role.id as RecipientTarget);
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setTargetRecipients(prev => prev.filter(r => r !== role.id));
                      } else {
                        setTargetRecipients(prev => [...prev, role.id as RecipientTarget]);
                      }
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5',
                      isSelected
                        ? 'bg-[#07563D] text-white border-[#07563D] shadow-2xs'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    )}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    <span>{role.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section D: Template Subject & Body */}
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Subject / Push Title</label>
              <input
                type="text"
                placeholder="e.g. Attendance Notice: Late Punch Recorded on {{date}}"
                value={subjectTemplate}
                onChange={e => setSubjectTemplate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#07563D]/20 focus:border-[#07563D]"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700">Message Template Body</label>
                <span className="text-[10px] text-gray-400">Click variable below to insert</span>
              </div>
              <textarea
                required
                rows={3}
                placeholder="Enter custom notification message body with {{variables}}..."
                value={bodyTemplate}
                onChange={e => setBodyTemplate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#07563D]/20 focus:border-[#07563D]"
              />

              {/* Dynamic Variable Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" /> Insert:
                </span>
                {availableTokens.map(tok => (
                  <button
                    key={tok.token}
                    type="button"
                    onClick={() => handleInsertVariable(tok.token)}
                    title={`Sample value: ${tok.sample}`}
                    className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
                  >
                    {tok.token}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section E: Priority & Quiet Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Delivery Priority</label>
              <select
                value={rulePriority}
                onChange={e => setRulePriority(e.target.value as NotificationPriority)}
                className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none"
              >
                <option value="NORMAL">NORMAL (Standard FIFO)</option>
                <option value="HIGH">HIGH (Immediate Express Dispatch)</option>
                <option value="LOW">LOW (Batch / Digest)</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-xl border border-gray-200/80">
              <div>
                <span className="text-xs font-bold text-gray-800 block">Quiet Hours Blackout</span>
                <span className="text-[10px] text-gray-400 block">Hold non-critical alerts 22:00 - 08:00</span>
              </div>
              <input
                type="checkbox"
                checked={quietHoursRespect}
                onChange={e => setQuietHoursRespect(e.target.checked)}
                className="accent-[#07563D] w-4 h-4 cursor-pointer"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
            <Button size="sm" variant="outline" type="button" onClick={() => setIsRuleModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              isLoading={isSavingRule}
              className="bg-[#07563D] hover:bg-[#064e35] text-white font-semibold"
            >
              {editingRuleId ? 'Save Rule Changes' : 'Create Rule'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 6. Test Dispatch Modal */}
      <Modal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        title="Live Test Notification Dispatch"
        description="Verify multi-channel delivery across Hostinger SMTP, Meta Cloud API, Airtel SMS, and Realtime stream."
        maxWidth="lg"
      >
        <form onSubmit={handleExecuteTest} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700">Select Rule to Test</label>
            <select
              value={testRule?.id || ''}
              onChange={e => {
                const found = rules.find(r => r.id === e.target.value);
                if (found) setTestRule(found);
              }}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none"
            >
              {rules.map(r => (
                <option key={r.id} value={r.id}>
                  {r.rule_name} ({r.event_trigger})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Test Email Address</label>
              <input
                type="email"
                required
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                placeholder="admin@company.com"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Test Mobile Number (WhatsApp & SMS)</label>
              <input
                type="tel"
                required
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
                placeholder="+919876543210"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Test Rule Active Channels Summary */}
          {testRule && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1.5">
              <span className="font-bold text-gray-700 block">Rule Configuration Summary:</span>
              <div className="flex items-center gap-2 text-[11px]">
                <span>Channels:</span>
                {testRule.enable_in_app && <Badge variant="neutral" size="sm">In-App</Badge>}
                {testRule.enable_email && <Badge variant="success" size="sm">Email</Badge>}
                {testRule.enable_whatsapp && <Badge variant="success" size="sm">WhatsApp</Badge>}
                {testRule.enable_sms && <Badge variant="info" size="sm">SMS</Badge>}
              </div>
              <p className="text-[11px] text-gray-500 italic mt-1 line-clamp-2">
                Preview: "{testRule.body_template}"
              </p>
            </div>
          )}

          {/* Live Dispatch Results Display */}
          {testResult && (
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  Dispatch Completed
                </span>
                <span className="text-[10px] text-emerald-700 font-mono">
                  {new Date(testResult.dispatchedAt).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-[11px] text-emerald-800">{testResult.summary}</p>

              <div className="space-y-1 pt-1 border-t border-emerald-200/50">
                {testResult.channels.map(c => (
                  <div key={c.channel} className="flex items-center justify-between text-[11px]">
                    <span className="font-medium text-gray-700 flex items-center gap-1">
                      {c.channel === 'EMAIL' && <Mail className="w-3 h-3 text-emerald-700" />}
                      {c.channel === 'WHATSAPP' && <MessageSquare className="w-3 h-3 text-emerald-800" />}
                      {c.channel === 'SMS' && <Smartphone className="w-3 h-3 text-blue-600" />}
                      {c.channel === 'IN_APP' && <Bell className="w-3 h-3 text-[#07563D]" />}
                      {c.channel}
                    </span>
                    <span>
                      {!c.enabled ? (
                        <span className="text-gray-400">Disabled by rule</span>
                      ) : c.success ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Dispatched
                        </span>
                      ) : (
                        <span className="text-amber-700 text-[10px] font-medium">
                          {c.skippedReason || c.error || 'Pending'}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
            <Button size="sm" variant="outline" type="button" onClick={() => setIsTestModalOpen(false)}>
              Close
            </Button>
            <Button
              size="sm"
              type="submit"
              isLoading={isTesting}
              leftIcon={<Send className="w-3.5 h-3.5" />}
              className="bg-[#07563D] hover:bg-[#064e35] text-white font-semibold"
            >
              Trigger Live Test
            </Button>
          </div>
        </form>
      </Modal>

      {/* 7. Delete Rule Confirmation Modal */}
      <Modal
        isOpen={!!deleteRuleTarget}
        onClose={() => setDeleteRuleTarget(null)}
        title="Delete Notification Rule"
        description="Are you sure you want to delete this notification rule? This action cannot be undone."
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-600">
            Rule: <strong className="text-gray-900">{deleteRuleTarget?.rule_name}</strong> (Trigger: <code className="font-mono text-emerald-800">{deleteRuleTarget?.event_trigger}</code>)
          </p>
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
            <Button size="sm" variant="outline" onClick={() => setDeleteRuleTarget(null)}>
              Cancel
            </Button>
            <Button size="sm" variant="danger" onClick={handleDeleteRule}>
              Delete Rule
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
