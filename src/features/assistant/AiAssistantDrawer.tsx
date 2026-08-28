// src/features/assistant/AiAssistantDrawer.tsx
// ============================================================
// Joy PeopleHR — Intelligence Copilot Drawer (HR & Platform Super Admin)
// ============================================================

import React, { useState } from 'react';
import { Drawer } from '../../components/ui/Drawer';
import { Button } from '../../components/ui/Button';
import { Sparkles, Send, Bot, ShieldCheck, Activity, AlertTriangle, TrendingUp } from 'lucide-react';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import { askWorkForceCopilot } from '../../services/geminiService';

export interface AiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  time: string;
}

export const AiAssistantDrawer: React.FC<AiAssistantDrawerProps> = ({ isOpen, onClose }) => {
  const { activeCompany, organization } = useTenant();
  const { role } = useAuth();

  const isSuperAdmin = role === 'SUPER_ADMIN' || role === 'PLATFORM_ADMIN';

  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: isSuperAdmin
        ? `Hello Super Admin! I am your Joy PeopleHR SaaS Operations Copilot. I can analyze at-risk tenant organizations, revenue growth anomalies, infrastructure latency spikes, and incident post-mortems. How can I help you operate the platform today?`
        : `Hello! I am your Joy PeopleHR Intelligence Copilot powered by Google Gemini. How can I assist you with HR policies, department headcount analysis, or multi-tenant configuration for ${activeCompany?.legal_name}?`,
      time: 'Just now',
    },
  ]);

  const handleSend = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const promptToSend = customPrompt || input.trim();
    if (!promptToSend || isGenerating) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: promptToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsGenerating(true);

    try {
      const aiResponseText = await askWorkForceCopilot(promptToSend, {
        companyName: activeCompany?.legal_name,
        organizationName: organization?.name,
        userRole: role,
        isPlatformSuperAdmin: isSuperAdmin,
      });

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: aiResponseText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error('Error generating AI response:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={isSuperAdmin ? 'Joy PeopleHR SaaS Control Copilot' : 'WorkForce Copilot Intelligence'}
      size="md"
    >
      <div className="flex flex-col h-[calc(100vh-140px)] justify-between space-y-4">
        {/* Messages list */}
        <div className="space-y-3 overflow-y-auto pr-1 flex-1">
          {messages.map(m => (
            <div
              key={m.id}
              className={`flex gap-3 text-xs ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'ai' && (
                <div className="w-7 h-7 rounded-lg bg-[#07563D] text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`p-3 rounded-2xl max-w-[85%] space-y-1.5 ${
                  m.sender === 'user'
                    ? 'bg-[#07563D] text-white rounded-br-none font-medium'
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }`}
              >
                <div className="leading-relaxed whitespace-pre-wrap">{m.text}</div>
                <div
                  className={`text-[9px] font-mono ${
                    m.sender === 'user' ? 'text-emerald-200 text-right' : 'text-gray-400'
                  }`}
                >
                  {m.time}
                </div>
              </div>
            </div>
          ))}
          {isGenerating && (
            <div className="flex gap-3 text-xs justify-start">
              <div className="w-7 h-7 rounded-lg bg-[#07563D] text-white flex items-center justify-center shrink-0 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3 rounded-2xl bg-gray-100 text-gray-500 rounded-bl-none text-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                Analyzing platform telemetry & generating intelligence...
              </div>
            </div>
          )}
        </div>

        {/* Prompt Suggestions */}
        <div className="pt-2 border-t border-gray-100 space-y-2">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" /> Suggested Operations Prompts
          </div>

          <div className="flex flex-wrap gap-1.5">
            {isSuperAdmin ? (
              <>
                <button
                  onClick={() => handleSend(undefined, 'Which tenants are at risk and why?')}
                  className="text-[11px] bg-emerald-50 text-[#07563D] hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer font-medium"
                >
                  🚨 At-risk tenants
                </button>
                <button
                  onClick={() => handleSend(undefined, 'Show active incidents and latency spikes')}
                  className="text-[11px] bg-emerald-50 text-[#07563D] hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer font-medium"
                >
                  ⚡ Incident & Latency check
                </button>
                <button
                  onClick={() => handleSend(undefined, 'Which trials expire this week?')}
                  className="text-[11px] bg-emerald-50 text-[#07563D] hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer font-medium"
                >
                  ⏳ Expiring trials
                </button>
                <button
                  onClick={() => handleSend(undefined, 'Explain recent MRR growth and invoices')}
                  className="text-[11px] bg-emerald-50 text-[#07563D] hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer font-medium"
                >
                  💰 MRR & Overdue invoices
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleSend(undefined, 'What is our current department headcount breakdown?')}
                  className="text-[11px] bg-emerald-50 text-[#07563D] hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer font-medium"
                >
                  Headcount breakdown
                </button>
                <button
                  onClick={() => handleSend(undefined, 'Explain the leave policy entitlements')}
                  className="text-[11px] bg-emerald-50 text-[#07563D] hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer font-medium"
                >
                  Leave policy guidance
                </button>
              </>
            )}
          </div>

          <form onSubmit={e => handleSend(e)} className="flex gap-2 pt-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={
                isSuperAdmin
                  ? 'Ask Copilot about tenant risks, MRR, latency, incidents...'
                  : 'Ask Copilot about HR policies, headcount, leave...'
              }
              className="flex-1 bg-gray-50 border border-gray-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
            />
            <Button type="submit" size="sm" leftIcon={<Send className="w-3.5 h-3.5" />}>
              Send
            </Button>
          </form>
        </div>
      </div>
    </Drawer>
  );
};
