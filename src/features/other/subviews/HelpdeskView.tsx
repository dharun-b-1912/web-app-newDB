import React, { useState, useEffect } from 'react';
import { otherModulesApi } from '../../../services/otherModulesApi';
import { HelpdeskTicket, KnowledgeArticle } from '../../../types/otherModules';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { LifeBuoy, BookOpen, Plus, Clock, Search } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const HelpdeskView: React.FC = () => {
  const { showToast } = useToast();
  const [tab, setTab] = useState<'tickets' | 'kb'>('tickets');
  const [tickets, setTickets] = useState<HelpdeskTicket[]>([]);
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);

  useEffect(() => {
    setTickets(otherModulesApi.getHelpdeskTickets());
    setArticles(otherModulesApi.getKnowledgeArticles());
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-[#07563D]" />
            <span>HR Operational Helpdesk & Knowledge Base</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Multi-channel ticket resolution, SLA timers, auto-escalations, and self-service policy FAQs</p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Raise Helpdesk Ticket modal opened')}>
          Raise Ticket
        </Button>
      </div>

      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setTab('tickets')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            tab === 'tickets' ? 'bg-[#07563D] text-white shadow-2xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Support Tickets ({tickets.length})
        </button>
        <button
          onClick={() => setTab('kb')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            tab === 'kb' ? 'bg-[#07563D] text-white shadow-2xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Knowledge Base FAQs ({articles.length})
        </button>
      </div>

      {tab === 'tickets' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                <th className="p-4 font-mono">Ticket Code</th>
                <th className="p-4">Employee</th>
                <th className="p-4">Category</th>
                <th className="p-4">Subject</th>
                <th className="p-4">Priority</th>
                <th className="p-4">Assigned Agent</th>
                <th className="p-4 text-center">SLA Status</th>
                <th className="p-4 text-center">Ticket Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs font-mono">
              {tickets.map(tkt => (
                <tr key={tkt.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="p-4 font-bold text-gray-900">{tkt.ticket_code}</td>
                  <td className="p-4 font-sans font-extrabold text-gray-900">{tkt.employee_name}</td>
                  <td className="p-4 font-sans font-bold text-gray-700">{tkt.category}</td>
                  <td className="p-4 font-sans text-gray-800 font-medium">{tkt.subject}</td>
                  <td className="p-4 font-sans"><Badge variant={tkt.priority === 'High' ? 'amber' : 'emerald'}>{tkt.priority}</Badge></td>
                  <td className="p-4 font-sans text-gray-700">{tkt.assigned_agent_name}</td>
                  <td className="p-4 text-center font-sans"><Badge variant="emerald">{tkt.sla_status}</Badge></td>
                  <td className="p-4 text-center font-sans"><Badge variant="emerald">{tkt.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'kb' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {articles.map(art => (
            <div key={art.id} className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <Badge variant="emerald" size="sm">{art.category}</Badge>
                  <h4 className="text-sm font-extrabold text-gray-900 mt-1">{art.title}</h4>
                </div>
              </div>
              <p className="text-xs text-gray-600 line-clamp-2">{art.content}</p>
              <div className="flex justify-between items-center text-[11px] text-gray-400 font-mono pt-2 border-t border-gray-100">
                <span>{art.views_count} Views</span>
                <span>{art.helpful_count} Found Helpful</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
