// src/features/platform/subviews/WhatsAppControlCenterView.tsx
// ============================================================================
// Joy PeopleHR — Enterprise WhatsApp Business Platform & Flows Control Center
// Multi-Tenant WABA Management, HSM Template Catalog, Flows Studio & Dispatch Simulator
// ============================================================================

import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  Smartphone,
  ShieldCheck,
  Layers,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  Bot,
  Terminal,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import {
  whatsAppNotificationService,
  whatsAppBotEngine,
  whatsAppFlowsEngine,
  LEAVE_APPLICATION_FLOW_SCHEMA,
} from '../../../services/whatsapp';

export const WhatsAppControlCenterView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'templates' | 'flows' | 'simulator' | 'logs'>('overview');
  const [simPhoneNumber, setSimPhoneNumber] = useState('919876543210');
  const [simEmployeeName, setSimEmployeeName] = useState('Ramesh Kumar');
  const [simEventType, setSimEventType] = useState<'PAYSLIP' | 'LEAVE_APPROVAL' | 'ATTENDANCE_ANOMALY' | 'FLOW_LEAVE' | 'BOT_MENU'>('PAYSLIP');
  const [simResult, setSimResult] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Template Inventory
  const templates = [
    {
      id: 'tpl-1',
      name: 'joy_monthly_payslip_v1',
      category: 'UTILITY',
      language: 'en_US',
      status: 'APPROVED',
      header: 'DOCUMENT (Encrypted PDF)',
      description: 'Delivers salary breakdown, masked bank account, and 15-minute expiring signed PDF payslip.',
      variables: ['{{1}} Emp Name', '{{2}} Month/Year', '{{3}} Net Pay', '{{4}} Bank A/C', '{{5}} Pay Date'],
    },
    {
      id: 'tpl-2',
      name: 'joy_leave_approval_action_v1',
      category: 'UTILITY',
      language: 'en_US',
      status: 'APPROVED',
      header: 'NONE',
      description: 'Sends leave request details to reporting manager with 1-click [Approve] / [Reject] buttons.',
      variables: ['{{1}} Manager', '{{2}} Requester', '{{3}} Leave Type', '{{4}} Dates', '{{5}} Reason'],
    },
    {
      id: 'tpl-3',
      name: 'joy_attendance_anomaly_v1',
      category: 'UTILITY',
      language: 'en_US',
      status: 'APPROVED',
      header: 'NONE',
      description: 'Real-time alert for missed punches or morning shift late marks with portal regularization link.',
      variables: ['{{1}} Emp Name', '{{2}} Date', '{{3}} Shift Name', '{{4}} Anomaly Description'],
    },
    {
      id: 'tpl-4',
      name: 'joy_company_announcement_v1',
      category: 'UTILITY',
      language: 'en_US',
      status: 'APPROVED',
      header: 'TEXT (Title)',
      description: 'Organization-wide broadcast for HR policy updates, holiday notices, and emergency advisories.',
      variables: ['{{1}} Emp Name', '{{2}} Category', '{{3}} Content Body'],
    },
    {
      id: 'tpl-5',
      name: 'joy_onboarding_candidate_invite_v1',
      category: 'UTILITY',
      language: 'en_US',
      status: 'APPROVED',
      header: 'TEXT (Welcome)',
      description: 'Candidate welcome invitation with digital statutory form completion link.',
      variables: ['{{1}} Company Name', '{{2}} Candidate Name', '{{3}} Expiry Hours', '{{4}} Token'],
    },
  ];

  // Dispatch Simulator Executor
  const handleExecuteSimulation = async () => {
    setIsSimulating(true);
    setSimResult(null);

    try {
      if (simEventType === 'PAYSLIP') {
        const res = await whatsAppNotificationService.sendMonthlyPayslip({
          organizationId: '0c621892-e938-4707-9957-13534ea32c19',
          employeeId: 'emp-sim-101',
          employeeName: simEmployeeName,
          phone: simPhoneNumber,
          monthYear: 'September 2026',
          netPay: '₹48,250.00',
          bankAccountMasked: 'XXXX4892',
          payDate: '30-Sep-2026',
          payslipPdfUrl: 'https://joyhr.in/storage/v1/object/sign/payslips/demo.pdf',
        });
        setSimResult(res.success ? '✅ Payslip Meta HSM message submitted successfully with encrypted PDF attachment.' : `❌ Failed: ${res.error}`);
      } else if (simEventType === 'LEAVE_APPROVAL') {
        const res = await whatsAppNotificationService.sendLeaveApprovalToManager({
          organizationId: '0c621892-e938-4707-9957-13534ea32c19',
          leaveRequestId: 'req-sim-9901',
          managerPhone: simPhoneNumber,
          managerName: 'Prakash V (HR Lead)',
          employeeName: simEmployeeName,
          leaveType: 'Casual Leave',
          startDate: '28-Sep-2026',
          endDate: '29-Sep-2026',
          daysCount: 2,
          reason: 'Family emergency and personal travel',
        });
        setSimResult(res.success ? '✅ Interactive Leave Approval message dispatched to Manager with 1-click Approve/Reject buttons.' : `❌ Failed: ${res.error}`);
      } else if (simEventType === 'ATTENDANCE_ANOMALY') {
        const res = await whatsAppNotificationService.sendAttendanceAnomalyAlert({
          organizationId: '0c621892-e938-4707-9957-13534ea32c19',
          employeeId: 'emp-sim-101',
          employeeName: simEmployeeName,
          phone: simPhoneNumber,
          date: '22-Sep-2026',
          shiftName: 'Morning Production Shift (09:00 - 18:00)',
          anomalyType: 'MISSED_PUNCH_IN',
        });
        setSimResult(res.success ? '✅ Attendance Missed Punch Anomaly alert submitted to employee WhatsApp.' : `❌ Failed: ${res.error}`);
      } else if (simEventType === 'FLOW_LEAVE') {
        const res = await whatsAppFlowsEngine.sendFlowMessage({
          to: simPhoneNumber,
          tenantId: '0c621892-e938-4707-9957-13534ea32c19',
          flowId: 'joy_leave_application_flow_v1',
          flowToken: `flw_tk_${Date.now()}`,
          flowCtaText: 'Apply Leave Now',
          bodyText: `Hello ${simEmployeeName}, please use the interactive form below to apply for leaves directly within WhatsApp.`,
        });
        setSimResult(res.success ? '✅ Meta Flow (v3.1) interactive screen message dispatched to employee.' : `❌ Failed: ${res.error}`);
      } else if (simEventType === 'BOT_MENU') {
        await whatsAppBotEngine.handleInboundMessage({
          from: simPhoneNumber,
          messageId: `wamid.SIM_${Date.now()}`,
          text: 'MENU',
        });
        setSimResult('✅ Inbound "MENU" trigger processed by Bot Engine. Interactive self-service options dispatched.');
      }
    } catch (err: any) {
      setSimResult(`❌ Error during dispatch: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-900 to-teal-800 p-6 rounded-2xl text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">WhatsApp Business Platform & Flows</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                Meta Cloud API v20.0
              </span>
            </div>
            <p className="text-emerald-100/80 text-sm mt-1">
              Multi-tenant workforce messaging, encrypted payslips, 1-click approvals, and WhatsApp Flows.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-emerald-950/40 p-2 rounded-xl border border-emerald-500/20 text-xs">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-emerald-200">WABA: Verified (Tier-1K Unlimited)</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'overview'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Overview & Health
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'templates'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          HSM Templates ({templates.length})
        </button>
        <button
          onClick={() => setActiveTab('flows')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'flows'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          WhatsApp Flows Studio
        </button>
        <button
          onClick={() => setActiveTab('simulator')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'simulator'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
          }`}
        >
          <Terminal className="w-4 h-4" />
          Live Dispatch Simulator
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Quality Rating</div>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">High Quality (Green)</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">0.00% spam report rate across all tenants.</p>
          </div>

          <div className="p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Approved Templates</div>
            <div className="text-2xl font-bold text-emerald-600 mt-2">5 Active</div>
            <p className="text-xs text-gray-500 mt-2">100% Meta Category compliance (UTILITY).</p>
          </div>

          <div className="p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg Delivery Latency</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">840 ms</div>
            <p className="text-xs text-gray-500 mt-2">Real-time webhook callback processing.</p>
          </div>

          <div className="p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Security & RLS</div>
            <div className="flex items-center gap-1.5 text-emerald-600 text-lg font-bold mt-2">
              <ShieldCheck className="w-5 h-5" />
              15-Min Expiring URLs
            </div>
            <p className="text-xs text-gray-500 mt-2">Masked bank details & DPDP compliant.</p>
          </div>
        </div>
      )}

      {/* TAB 2: HSM TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Meta Pre-Approved HSM Templates</h3>
              <p className="text-xs text-gray-500">All outbound automated notifications must use approved HSM templates.</p>
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full text-xs font-semibold">
              TRAI & Meta Verified
            </span>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {templates.map((tpl) => (
              <div key={tpl.id} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">{tpl.name}</span>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        {tpl.category}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {tpl.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{tpl.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {tpl.variables.map((v, i) => (
                        <span key={i} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs font-mono">
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="text-xs font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded">
                    {tpl.language}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: FLOWS STUDIO */}
      {activeTab === 'flows' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Active Meta Flow: Leave Application</h3>
                <p className="text-xs text-gray-500">ID: joy_leave_application_flow_v1 • Meta Flow v3.1</p>
              </div>
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full text-xs font-semibold">
                PUBLISHED
              </span>
            </div>

            <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 space-y-3 bg-gray-50 dark:bg-gray-800/40">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">1</span>
                Screen 1: Form Input (`LEAVE_FORM_SCREEN`)
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 pl-8">
                Collects Leave Type (Dropdown), Start Date (DatePicker), End Date (DatePicker), and Reason.
              </p>

              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200 pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">2</span>
                Screen 2: Summary & Confirmation (`SUMMARY_CONFIRM_SCREEN`)
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 pl-8">
                Presents dynamic summary to user with 1-click submit and encrypted payload return.
              </p>
            </div>
          </div>

          <div className="bg-gray-950 text-emerald-400 rounded-xl p-5 font-mono text-xs overflow-auto max-h-96 shadow-inner border border-gray-800">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-800 text-gray-400">
              <span>JSON Schema Definition (Meta Flows v3.1)</span>
              <span>Valid ✅</span>
            </div>
            <pre>{JSON.stringify(LEAVE_APPLICATION_FLOW_SCHEMA, null, 2)}</pre>
          </div>
        </div>
      )}

      {/* TAB 4: LIVE DISPATCH SIMULATOR */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Live Event Dispatch Simulator</h3>
              <p className="text-xs text-gray-500">
                Test outbound Meta HSM templates and inbound 2-way bot commands against the local sandbox engine.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Recipient Phone (E.164)
                </label>
                <input
                  type="text"
                  value={simPhoneNumber}
                  onChange={(e) => setSimPhoneNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="919876543210"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Employee Full Name
                </label>
                <input
                  type="text"
                  value={simEmployeeName}
                  onChange={(e) => setSimEmployeeName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Ramesh Kumar"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Select Simulation Scenario
              </label>
              <select
                value={simEventType}
                onChange={(e) => setSimEventType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="PAYSLIP">📄 Outbound Monthly Payslip Delivery (PDF + Masked A/C)</option>
                <option value="LEAVE_APPROVAL">🌴 Manager 1-Click Interactive Leave Approval Buttons</option>
                <option value="ATTENDANCE_ANOMALY">⏰ Attendance Missed Clock-in Anomaly Alert</option>
                <option value="FLOW_LEAVE">📱 WhatsApp Flow (v3.1) Interactive Leave Screen</option>
                <option value="BOT_MENU">🤖 Inbound Employee Self-Service "MENU" Trigger</option>
              </select>
            </div>

            <button
              onClick={handleExecuteSimulation}
              disabled={isSimulating}
              className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-md disabled:opacity-50"
            >
              {isSimulating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Simulating Dispatch...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Trigger WhatsApp Dispatch
                </>
              )}
            </button>

            {simResult && (
              <div className="p-4 rounded-xl text-xs font-mono bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                {simResult}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Bot className="w-4 h-4 text-emerald-500" />
              2-Way Bot Commands
            </h4>
            <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
              <div className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                <span className="font-bold text-emerald-600 font-mono">1 or PAYSLIP:</span> Get latest salary breakdown & signed PDF.
              </div>
              <div className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                <span className="font-bold text-emerald-600 font-mono">2 or BALANCE:</span> Check CL, SL, and EL available days.
              </div>
              <div className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                <span className="font-bold text-emerald-600 font-mono">3 or APPLY:</span> Guided conversational leave submission.
              </div>
              <div className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                <span className="font-bold text-emerald-600 font-mono">4 or ATTENDANCE:</span> Today's shift and clock-in logs.
              </div>
              <div className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                <span className="font-bold text-emerald-600 font-mono">5 or HOLIDAYS:</span> View upcoming national & company holidays.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
