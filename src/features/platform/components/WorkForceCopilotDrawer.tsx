// src/features/platform/components/WorkForceCopilotDrawer.tsx
// ============================================================
// WorkForceOS — Super Admin Copilot AI Operations Assistant
// ============================================================

import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Building2,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '../../../components/ui/Sheet';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Button } from '../../../components/ui/Button';

export interface CopilotMessage {
  id: string;
  sender: 'copilot' | 'user';
  text: string;
  actionTab?: string;
  actionLabel?: string;
  timestamp: string;
}

export interface WorkForceCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
}

const INITIAL_MESSAGES: CopilotMessage[] = [
  {
    id: 'msg-1',
    sender: 'copilot',
    text: 'Hello Super Admin. I am WorkForceOS Copilot. I analyze real-time platform telemetry, MRR expansions, tenant quota breaches, and system health. How can I assist you today?',
    timestamp: 'Just now',
  },
];

const SUGGESTED_PROMPTS = [
  'Which tenants are at risk of churn?',
  'Show overdue invoices and billing status',
  'Are any platform subsystems degraded?',
  'Analyze MRR growth for August 2026',
];

export const WorkForceCopilotDrawer: React.FC<WorkForceCopilotDrawerProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const [messages, setMessages] = useState<CopilotMessage[]>(INITIAL_MESSAGES);
  const [inputQuery, setInputQuery] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const handleSend = (textToSend?: string) => {
    const query = textToSend || inputQuery;
    if (!query.trim()) return;

    const userMsg: CopilotMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsThinking(true);

    setTimeout(() => {
      let botResponse: CopilotMessage = {
        id: `bot-${Date.now()}`,
        sender: 'copilot',
        text: '',
        timestamp: 'Just now',
      };

      const lower = query.toLowerCase();

      if (lower.includes('churn') || lower.includes('at risk')) {
        botResponse.text =
          'I identified 1 tenant with an "At Risk" health grade (Zenith Logistics, Health Score 64/100). The primary factors are an overdue August subscription invoice (₹2.48L) and a 35% decline in weekly active user logins.';
        botResponse.actionTab = 'platform-tenants';
        botResponse.actionLabel = 'Inspect Zenith Logistics in Tenant Directory';
      } else if (lower.includes('invoice') || lower.includes('billing') || lower.includes('overdue')) {
        botResponse.text =
          'Currently, there is 1 overdue invoice (#INV-2026-0802 for ₹2,47,800 from Zenith Logistics, 4 days past due). Total collected revenue for this month is ₹18.4 Lakhs with 100% tax reconciliation.';
        botResponse.actionTab = 'platform-billing';
        botResponse.actionLabel = 'Open Billing Reconciliation Ledger';
      } else if (lower.includes('degraded') || lower.includes('health') || lower.includes('subsystem')) {
        botResponse.text =
          'All 12 microservices and database partitions are reporting 99.98% SLA with 0 active SEV-1 outages. The Razorpay webhook latency probe is operating within normal bounds at 142ms.';
        botResponse.actionTab = 'platform-dashboard';
        botResponse.actionLabel = 'View Subsystem Health Grid';
      } else {
        botResponse.text =
          'Based on live control plane telemetry: 428 organizations are active (+12.4% MoM), MRR is at ₹18.4L (ARR ₹2.21Cr), and net customer retention rate is at a healthy 112.4%.';
        botResponse.actionTab = 'saas-revenue';
        botResponse.actionLabel = 'View SaaS Revenue Dashboard';
      }

      setMessages((prev) => [...prev, botResponse]);
      setIsThinking(false);
    }, 600);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" size="md">
        <SheetHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-md bg-[#ECFDF5] text-[#047857]">
              <Sparkles className="w-4 h-4" />
            </span>
            <StatusBadge status="Autonomous Ops AI" size="xs" />
          </div>
          <SheetTitle>WorkForceOS Copilot</SheetTitle>
          <SheetDescription>
            AI-powered intelligence for SaaS metrics, risk telemetry, and rapid navigation.
          </SheetDescription>
        </SheetHeader>

        {/* Message Stream */}
        <SheetBody>
          <div className="space-y-3.5">
            {messages.map((msg) => {
              const isCopilot = msg.sender === 'copilot';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 text-xs ${
                    isCopilot ? 'items-start' : 'items-start flex-row-reverse'
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                      isCopilot
                        ? 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'
                        : 'bg-slate-900 text-white'
                    }`}
                  >
                    {isCopilot ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                  </div>

                  <div
                    className={`p-3.5 rounded-xl max-w-[85%] space-y-2 ${
                      isCopilot
                        ? 'bg-slate-50 border border-slate-200 text-slate-800'
                        : 'bg-[#047857] text-white'
                    }`}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                    {msg.actionTab && (
                      <div className="pt-1.5 border-t border-slate-200/70">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            onNavigateTab(msg.actionTab!);
                            onClose();
                          }}
                          className="h-7 text-[11px] px-2.5 font-bold"
                          rightIcon={<ArrowRight className="w-3 h-3" />}
                        >
                          {msg.actionLabel || 'Jump to view'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isThinking && (
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium italic">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-[#047857]" />
                Analyzing platform telemetry...
              </div>
            )}
          </div>

          {/* Suggested Quick Prompts */}
          {messages.length <= 2 && (
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                Suggested Prompts:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(prompt)}
                    className="text-left text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </SheetBody>

        {/* Input Bar */}
        <SheetFooter>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="w-full flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask Copilot about tenants, MRR, health..."
              className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#047857]"
            />
            <Button
              type="submit"
              size="sm"
              variant="primary"
              disabled={!inputQuery.trim() || isThinking}
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              Ask
            </Button>
          </form>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
