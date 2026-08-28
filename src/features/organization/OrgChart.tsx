// src/features/organization/OrgChart.tsx
// ============================================================================
// Joy PeopleHR — Production-Grade Realtime Interactive Org Chart 2.0
// Database-Driven Tree Graph, Cycle Guard, Search Ancestors, Node Inspector
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Drawer } from '../../components/ui/Drawer';
import { Modal } from '../../components/ui/Modal';
import { Avatar } from '../../components/ui/Avatar';
import { useToast } from '../../components/ui/Toast';
import {
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  ChevronRight,
  ChevronDown,
  User as UserIcon,
  Users,
  Building2,
  MapPin,
  Mail,
  ShieldCheck,
  Briefcase,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Sliders,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { OrgChartNode, OrgChartFilterParams, Company, Branch, Department } from '../../types';
import { orgChartService } from '../../services/organization/orgChartService';
import { organizationStructureService } from '../../services/organization/organizationStructureService';
import { hrEventBus } from '../../services/hrEventBus';
import { EmployeeCreateWizardModal } from '../people/EmployeeCreateWizardModal';
import { cn } from '../../lib/utils';

interface OrgChartProps {
  organizationId?: string;
  onSelectEmployee?: (empId: string) => void;
  onNavigateTab?: (tab: string, payload?: any) => void;
}

export const OrgChart: React.FC<OrgChartProps> = ({
  organizationId = 'org-joy-01',
  onSelectEmployee,
  onNavigateTab,
}) => {
  const { showToast } = useToast();

  // State
  const [rootNodes, setRootNodes] = useState<OrgChartNode[]>([]);
  const [totalNodes, setTotalNodes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [highlightedPath, setHighlightedPath] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState<OrgChartNode | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filters, setFilters] = useState<OrgChartFilterParams>({
    companyId: 'ALL',
    branchId: 'ALL',
    departmentId: 'ALL',
    status: 'ALL',
    showPrimaryOnly: true,
  });

  // Reassign Manager Modal State
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [targetManagerId, setTargetManagerId] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [isReassigning, setIsReassigning] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Load Tree Data
  const loadChartData = async () => {
    setIsLoading(true);
    try {
      const { rootNodes: tree, totalNodes: count } = await orgChartService.getHierarchyTree(organizationId, filters);
      setRootNodes(tree);
      setTotalNodes(count);

      // Default expand root and first-level nodes
      const initialExpanded: Record<string, boolean> = {};
      tree.forEach(root => {
        initialExpanded[root.id] = true;
        if (root.subordinates) {
          root.subordinates.forEach(sub => {
            initialExpanded[sub.id] = true;
          });
        }
      });
      setExpandedNodes(initialExpanded);
    } catch (err) {
      console.error('[OrgChart] load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load filter options
  useEffect(() => {
    organizationStructureService.getLegalEntities(organizationId).then(setCompanies);
    organizationStructureService.getBranches(undefined, organizationId).then(setBranches);
    organizationStructureService.getDepartments(undefined, organizationId).then(setDepartments);
  }, [organizationId]);

  useEffect(() => {
    loadChartData();
  }, [organizationId, filters]);

  // Realtime subscription
  useEffect(() => {
    const unsub = hrEventBus.subscribe('organization.*', () => {
      loadChartData();
    });
    return () => unsub();
  }, [organizationId]);

  // Search and ancestor path handler
  useEffect(() => {
    if (!searchQuery.trim()) {
      setHighlightedPath([]);
      return;
    }
    const query = searchQuery.toLowerCase().trim();
    // Search within tree
    let foundEmpId: string | null = null;
    const findMatch = (node: OrgChartNode) => {
      if (
        node.name.toLowerCase().includes(query) ||
        node.employee_code.toLowerCase().includes(query) ||
        node.designation.toLowerCase().includes(query)
      ) {
        foundEmpId = node.id;
        return;
      }
      if (node.subordinates) {
        node.subordinates.forEach(findMatch);
      }
    };
    rootNodes.forEach(findMatch);

    if (foundEmpId) {
      const path = orgChartService.findAncestorPath(rootNodes, foundEmpId);
      if (path) {
        setHighlightedPath(path);
        // Automatically expand all ancestor nodes
        setExpandedNodes(prev => {
          const next = { ...prev };
          path.forEach(id => {
            next[id] = true;
          });
          return next;
        });
      }
    } else {
      setHighlightedPath([]);
    }
  }, [searchQuery, rootNodes]);

  const handleNavigateToPeople = () => {
    if (onNavigateTab) {
      onNavigateTab('people');
    }
    window.dispatchEvent(new CustomEvent('platform:navigate', { detail: { tab: 'people' } }));
  };

  // Node expansion controls
  const toggleNode = (id: string) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    const traverse = (node: OrgChartNode) => {
      all[node.id] = true;
      if (node.subordinates) node.subordinates.forEach(traverse);
    };
    rootNodes.forEach(traverse);
    setExpandedNodes(all);
  };

  const collapseAll = () => {
    setExpandedNodes({});
  };

  const handleOpenInspector = (node: OrgChartNode) => {
    setSelectedNode(node);
    setIsInspectorOpen(true);
    if (onSelectEmployee) {
      onSelectEmployee(node.employee_id);
    }
  };

  // Reassign Manager Action
  const handleReassignManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNode || !targetManagerId) return;

    setIsReassigning(true);
    try {
      const res = await orgChartService.updateManager(
        organizationId,
        selectedNode.employee_id,
        targetManagerId,
        undefined,
        undefined,
        reassignReason
      );

      if (res.success) {
        showToast(`Reporting manager for ${selectedNode.name} updated successfully!`);
        setIsReassignModalOpen(false);
        setIsInspectorOpen(false);
        await loadChartData();
      } else {
        showToast(res.error || 'Failed to update manager', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating manager', 'error');
    } finally {
      setIsReassigning(false);
    }
  };

  // Render individual tree node recursively
  const renderNode = (node: OrgChartNode) => {
    const hasChildren = node.subordinates && node.subordinates.length > 0;
    const isExpanded = Boolean(expandedNodes[node.id]);
    const isHighlighted = highlightedPath.includes(node.id);
    const isExactMatch =
      searchQuery &&
      (node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.employee_code.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
      <div key={node.id} className="flex flex-col items-center relative transition-all duration-200">
        {/* Node Card */}
        <div
          onClick={() => handleOpenInspector(node)}
          className={cn(
            'group relative w-64 bg-white rounded-2xl border p-4 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer select-none text-left z-10',
            isExactMatch
              ? 'border-emerald-600 ring-2 ring-emerald-500/30 bg-emerald-50/20'
              : isHighlighted
                ? 'border-emerald-400 bg-emerald-50/10'
                : 'border-gray-200/90 hover:border-[#07563D]'
          )}
        >
          <div className="flex items-start gap-3">
            <Avatar name={node.name} src={node.avatar_url} size="md" className="shrink-0 font-bold border border-gray-100" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-gray-900 truncate block group-hover:text-[#07563D] transition-colors">
                  {node.name}
                </span>
                <Badge
                  variant={node.status === 'Active' ? 'emerald' : 'gray'}
                  className="text-[9px] px-1.5 py-0 uppercase font-mono font-bold"
                >
                  {node.status}
                </Badge>
              </div>
              <div className="text-[11px] font-medium text-gray-600 truncate">{node.designation}</div>
              <div className="text-[10px] text-gray-400 truncate mt-0.5">{node.department_name}</div>
            </div>
          </div>

          {/* Node Footer: Direct Reports Count & Badges */}
          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-500">
            <span className="font-mono text-gray-400 font-bold">{node.employee_code}</span>
            {hasChildren && (
              <span className="inline-flex items-center gap-1 font-bold text-[#07563D] bg-emerald-50 px-2 py-0.5 rounded-full">
                <Users className="w-3 h-3" />
                {node.direct_reports_count} Reports {node.total_team_count > node.direct_reports_count && `(${node.total_team_count} total)`}
              </span>
            )}
          </div>

          {/* Expand / Collapse Button */}
          {hasChildren && (
            <button
              onClick={e => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
              className={cn(
                'absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border border-gray-300 shadow-xs flex items-center justify-center text-gray-600 hover:bg-emerald-50 hover:text-[#07563D] hover:border-emerald-500 transition-all z-20 cursor-pointer'
              )}
              title={isExpanded ? 'Collapse team' : 'Expand team'}
            >
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-200', !isExpanded && '-rotate-90')} />
            </button>
          )}
        </div>

        {/* Children Connector Lines and Container */}
        {hasChildren && isExpanded && (
          <div className="relative pt-6 flex flex-col items-center">
            {/* Vertical stem from parent */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-gray-200" />

            {/* Horizontal branch bar */}
            {node.subordinates!.length > 1 && (
              <div
                className="absolute top-6 h-0.5 bg-gray-200"
                style={{
                  left: `${(100 / node.subordinates!.length) / 2}%`,
                  right: `${(100 / node.subordinates!.length) / 2}%`,
                }}
              />
            )}

            {/* Subordinate Nodes Grid */}
            <div className="flex items-start gap-8 relative pt-0">
              {node.subordinates!.map(sub => (
                <div key={sub.id} className="relative flex flex-col items-center">
                  {/* Vertical connector down to each child */}
                  <div className="w-0.5 h-6 bg-gray-200 mb-0" />
                  {renderNode(sub)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn('space-y-4', isFullscreen && 'fixed inset-0 z-50 bg-gray-50 p-6 overflow-auto')}>
      {/* 1. Org Chart Interactive Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Left: Search & Filter Trigger */}
        <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, employee code, or title..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D] bg-gray-50/50"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn('text-xs gap-1.5 h-9 rounded-xl', showFilters && 'bg-emerald-50 border-emerald-300 text-[#07563D]')}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
          </Button>

          <Button variant="ghost" size="sm" onClick={loadChartData} className="h-9 w-9 p-0 rounded-xl" title="Refresh Org Tree">
            <RefreshCw className={cn('w-4 h-4 text-gray-500', isLoading && 'animate-spin')} />
          </Button>
        </div>

        {/* Right: Zoom & Layout Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100/80 p-1 rounded-xl border border-gray-200 text-xs">
            <button
              onClick={() => setZoomLevel(prev => Math.max(50, prev - 10))}
              className="p-1.5 hover:bg-white rounded-lg transition text-gray-600 cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono font-bold text-gray-700 text-[11px]">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(150, prev + 10))}
              className="p-1.5 hover:bg-white rounded-lg transition text-gray-600 cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(100)}
              className="p-1.5 hover:bg-white rounded-lg transition text-gray-600 cursor-pointer ml-1"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={expandAll} className="text-xs h-9 rounded-xl">
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll} className="text-xs h-9 rounded-xl">
            Collapse All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-9 w-9 p-0 rounded-xl"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Optional Filters Drawer Bar */}
      {showFilters && (
        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs animate-in fade-in duration-150">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Legal Entity</label>
            <select
              value={filters.companyId}
              onChange={e => setFilters(f => ({ ...f, companyId: e.target.value }))}
              className="w-full p-2 rounded-xl border border-gray-200 bg-gray-50/50"
            >
              <option value="ALL">All Legal Entities</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>
                  {c.legal_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Branch / Site</label>
            <select
              value={filters.branchId}
              onChange={e => setFilters(f => ({ ...f, branchId: e.target.value }))}
              className="w-full p-2 rounded-xl border border-gray-200 bg-gray-50/50"
            >
              <option value="ALL">All Branches / Sites</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Department</label>
            <select
              value={filters.departmentId}
              onChange={e => setFilters(f => ({ ...f, departmentId: e.target.value }))}
              className="w-full p-2 rounded-xl border border-gray-200 bg-gray-50/50"
            >
              <option value="ALL">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Status</label>
            <select
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              className="w-full p-2 rounded-xl border border-gray-200 bg-gray-50/50"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Probation">Probation Only</option>
              <option value="Notice Period">Notice Period</option>
            </select>
          </div>
        </div>
      )}

      {/* 2. Interactive Organization Graph Canvas */}
      <div
        ref={containerRef}
        className="bg-gray-50/80 rounded-3xl border border-gray-200/90 p-8 min-h-[600px] overflow-auto relative flex justify-center items-start shadow-inner"
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-96 gap-3">
            <RefreshCw className="w-8 h-8 text-[#07563D] animate-spin" />
            <span className="text-xs font-bold text-gray-500">Constructing realtime organization hierarchy...</span>
          </div>
        ) : rootNodes.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-96 text-center max-w-md my-auto">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#07563D] mb-4">
              <Building2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-extrabold text-gray-900">Your organization chart is empty</h3>
            <p className="text-xs text-gray-500 mt-1 mb-6 leading-relaxed">
              No employee reporting hierarchy records are registered for this organization scope yet. Add your executives and team reporting lines to visualize your structure.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <Button
                variant="primary"
                className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-2 rounded-xl"
                onClick={handleNavigateToPeople}
              >
                <UserIcon className="w-4 h-4" />
                Manage & Add Employees
              </Button>
              <Button
                variant="outline"
                className="text-xs gap-1.5 rounded-xl border-emerald-300 text-[#07563D] bg-emerald-50/50 hover:bg-emerald-100/60"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus className="w-4 h-4" />
                Quick Add Employee
              </Button>
            </div>
          </div>
        ) : (
          /* Hierarchy Tree Render */
          <div
            className="flex items-start gap-12 pt-4 transition-transform duration-200"
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
          >
            {rootNodes.map(root => renderNode(root))}
          </div>
        )}
      </div>

      {/* 3. Node Inspector Drawer */}
      {selectedNode && (
        <Drawer
          isOpen={isInspectorOpen}
          onClose={() => setIsInspectorOpen(false)}
          title="Organization Node Inspector"
          size="md"
        >
          <div className="p-6 space-y-6">
            {/* Header Profile */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-emerald-50/50 to-transparent border border-emerald-100">
              <Avatar name={selectedNode.name} src={selectedNode.avatar_url} size="lg" className="border-2 border-white shadow-sm font-bold" />
              <div className="min-w-0 flex-1">
                <div className="text-base font-black text-gray-900 truncate">{selectedNode.name}</div>
                <div className="text-xs font-bold text-[#07563D]">{selectedNode.designation}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-mono text-gray-500">{selectedNode.employee_code}</span>
                  <Badge variant={selectedNode.status === 'Active' ? 'emerald' : 'gray'} className="text-[10px] px-2 py-0.5">
                    {selectedNode.status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/60">
                <span className="text-[10px] font-bold uppercase text-gray-400 block">Direct Reports</span>
                <span className="text-lg font-black text-gray-900 mt-0.5 block">{selectedNode.direct_reports_count}</span>
              </div>
              <div className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/60">
                <span className="text-[10px] font-bold uppercase text-gray-400 block">Total Team Depth</span>
                <span className="text-lg font-black text-[#07563D] mt-0.5 block">{selectedNode.total_team_count}</span>
              </div>
            </div>

            {/* Structural Placement */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Organizational Unit</h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50">
                  <span className="text-gray-500 font-medium">Department</span>
                  <span className="font-bold text-gray-900">{selectedNode.department_name}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50">
                  <span className="text-gray-500 font-medium">Branch Campus / Site</span>
                  <span className="font-bold text-gray-900">{selectedNode.branch_name || 'HQ Campus'}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50">
                  <span className="text-gray-500 font-medium">Work Email</span>
                  <span className="font-mono text-gray-700">{selectedNode.email || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Direct Reports List */}
            {selectedNode.subordinates && selectedNode.subordinates.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Direct Reports ({selectedNode.subordinates.length})
                </h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {selectedNode.subordinates.map(sub => (
                    <div
                      key={sub.id}
                      onClick={() => setSelectedNode(sub)}
                      className="p-2.5 rounded-xl border border-gray-100 hover:border-emerald-300 hover:bg-emerald-50/40 flex items-center justify-between transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar name={sub.name} src={sub.avatar_url} size="sm" className="font-bold" />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-gray-900 truncate">{sub.name}</div>
                          <div className="text-[10px] text-gray-500 truncate">{sub.designation}</div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 border-t border-gray-100 space-y-2">
              <Button
                variant="outline"
                className="w-full text-xs gap-2 rounded-xl justify-between"
                onClick={() => setIsReassignModalOpen(true)}
              >
                <span className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#07563D]" />
                  Reassign Reporting Manager
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              </Button>
            </div>
          </div>
        </Drawer>
      )}

      {/* 4. Reassign Manager Modal with Circular Detection */}
      {selectedNode && (
        <Modal
          isOpen={isReassignModalOpen}
          onClose={() => setIsReassignModalOpen(false)}
          title={`Reassign Reporting Line: ${selectedNode.name}`}
        >
          <form onSubmit={handleReassignManager} className="p-6 space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Joy PeopleHR will enforce server-side validation to ensure this reporting change does not introduce any circular hierarchy loops.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Target Manager</label>
              <input
                type="text"
                placeholder="Enter Manager Employee ID or Code..."
                value={targetManagerId}
                onChange={e => setTargetManagerId(e.target.value)}
                required
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Reason for Reassignment</label>
              <textarea
                placeholder="e.g. Department reorganization, promotion, team scaling..."
                value={reassignReason}
                onChange={e => setReassignReason(e.target.value)}
                rows={3}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsReassignModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isReassigning || !targetManagerId}
                className="bg-[#07563D] hover:bg-[#0b7a57] text-white"
              >
                {isReassigning ? 'Validating & Updating...' : 'Confirm Manager Change'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 5. Employee Create Wizard Modal */}
      <EmployeeCreateWizardModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={() => {
          setIsCreateModalOpen(false);
          loadChartData();
          showToast('Employee created and registered into organization hierarchy!');
        }}
      />
    </div>
  );
};
