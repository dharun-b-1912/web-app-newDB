import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Search, ZoomIn, ZoomOut, ChevronRight, ChevronDown, User, Building2, Users, Layers, ShieldCheck, Mail, Phone, MapPin } from 'lucide-react';
import { Employee } from '../../types';

interface OrgNode {
  id: string;
  name: string;
  title: string;
  department: string;
  avatar?: string;
  code: string;
  subordinates?: OrgNode[];
}

const mockHierarchy: OrgNode = {
  id: 'emp-001',
  name: 'Dharun Joy',
  title: 'Chief HR Officer & Global VP People',
  department: 'Executive Leadership',
  code: 'EMP-001',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  subordinates: [
    {
      id: 'emp-002',
      name: 'Anand Viswanathan',
      title: 'Senior Director — Talent Acquisition & Engineering',
      department: 'Engineering & Product Development',
      code: 'EMP-1024',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      subordinates: [
        {
          id: 'emp-003',
          name: 'Priya Sharma',
          title: 'Senior Staff Frontend Architect',
          department: 'Frontend Engineering',
          code: 'EMP-1025',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
          subordinates: [
            { id: 'emp-004', name: 'Siddharth Rao', title: 'Senior React Developer', department: 'Frontend Engineering', code: 'EMP-1029' },
            { id: 'emp-005', name: 'Kavita Menon', title: 'UI/UX Design Systems Engineer', department: 'Frontend Engineering', code: 'EMP-1031' },
          ],
        },
        {
          id: 'emp-006',
          name: 'Vikram Sethi',
          title: 'Lead DevOps & Cloud Security Architect',
          department: 'DevOps & Security',
          code: 'EMP-1026',
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        },
      ],
    },
    {
      id: 'emp-007',
      name: 'Deepa Sundaram',
      title: 'Head of People Operations & HRBP',
      department: 'Human Resources & People Ops',
      code: 'EMP-1027',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      subordinates: [
        { id: 'emp-008', name: 'Meera Krishnan', title: 'Senior HR Operations Specialist', department: 'Human Resources & People Ops', code: 'EMP-1033' },
        { id: 'emp-009', name: 'Rajesh Nair', title: 'Payroll & Statutory Specialist', department: 'Human Resources & People Ops', code: 'EMP-1034' },
      ],
    },
    {
      id: 'emp-010',
      name: 'Karthik Narayanan',
      title: 'Financial Controller & VP Finance',
      department: 'Finance & Legal',
      code: 'EMP-1028',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    },
  ],
};

interface Props {
  onSelectEmployee?: (empId: string) => void;
}

export const OrgChart: React.FC<Props> = ({ onSelectEmployee }) => {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [search, setSearch] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'emp-001': true,
    'emp-002': true,
    'emp-003': true,
    'emp-007': true,
  });

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    setExpandedNodes({
      'emp-001': true,
      'emp-002': true,
      'emp-003': true,
      'emp-004': true,
      'emp-005': true,
      'emp-006': true,
      'emp-007': true,
      'emp-008': true,
      'emp-009': true,
      'emp-010': true,
    });
  };

  const collapseAll = () => {
    setExpandedNodes({});
  };

  const renderTreeNode = (node: OrgNode) => {
    const hasSubs = node.subordinates && node.subordinates.length > 0;
    const isExpanded = Boolean(expandedNodes[node.id]);
    const isHighlighted = search && (node.name.toLowerCase().includes(search.toLowerCase()) || node.title.toLowerCase().includes(search.toLowerCase()));

    return (
      <div key={node.id} className="flex flex-col items-center">
        {/* Node Card */}
        <div
          onClick={() => onSelectEmployee?.(node.id)}
          className={`p-3.5 bg-white rounded-2xl border transition-all shadow-xs w-64 hover:border-[#07563D] cursor-pointer relative group ${
            isHighlighted ? 'ring-2 ring-[#07563D] bg-emerald-50/40 border-[#07563D]' : 'border-gray-200/90'
          }`}
        >
          <div className="flex items-start gap-3">
            <img
              src={node.avatar || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`}
              alt={node.name}
              className="w-10 h-10 rounded-xl object-cover ring-2 ring-emerald-600/20 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-gray-900 truncate">{node.name}</span>
                <span className="text-[10px] font-bold text-gray-400">{node.code}</span>
              </div>
              <p className="text-[11px] font-medium text-gray-600 line-clamp-1">{node.title}</p>
              <span className="inline-block mt-1 text-[10px] font-semibold text-[#07563D] bg-emerald-50 px-1.5 py-0.5 rounded-md">
                {node.department}
              </span>
            </div>
          </div>

          {hasSubs && (
            <button
              onClick={e => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border border-gray-300 text-gray-600 flex items-center justify-center shadow-xs hover:bg-gray-100 transition-all cursor-pointer z-10"
            >
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Subordinates Connector Tree */}
        {hasSubs && isExpanded && (
          <div className="flex flex-col items-center mt-3">
            <div className="w-0.5 h-4 bg-emerald-300" />
            <div className="flex gap-6 items-start relative pt-4 before:content-[''] before:absolute before:top-0 before:left-12 before:right-12 before:h-0.5 before:bg-emerald-300">
              {node.subordinates!.map(sub => renderTreeNode(sub))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search organizational hierarchy..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#07563D]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Collapse All
          </Button>
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            <button onClick={() => setZoomLevel(prev => Math.max(50, prev - 10))} className="p-1 text-gray-600 hover:text-gray-900">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-bold text-gray-700 px-1">{zoomLevel}%</span>
            <button onClick={() => setZoomLevel(prev => Math.min(150, prev + 10))} className="p-1 text-gray-600 hover:text-gray-900">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <Card className="p-8 bg-gray-50/50 rounded-2xl border border-gray-200/80 overflow-x-auto min-h-[500px] flex justify-center">
        <div style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }} className="transition-all duration-200">
          {renderTreeNode(mockHierarchy)}
        </div>
      </Card>
    </div>
  );
};
