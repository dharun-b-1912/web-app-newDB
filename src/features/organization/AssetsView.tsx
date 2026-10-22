import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumb } from '../../components/shell/Breadcrumb';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';
import {
  Package,
  Plus,
  Search,
  Filter,
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Eye,
  FileSpreadsheet,
  ArrowRightLeft,
  Wrench,
  AlertTriangle,
  Layers,
  Banknote,
  Tag,
} from 'lucide-react';

import { assetService } from '../../services/asset/assetService';
import { assetAssignmentService } from '../../services/asset/assetAssignmentService';
import { assetTransferService } from '../../services/asset/assetTransferService';
import { inventoryService } from '../../services/asset/inventoryService';
import { assetMaintenanceService } from '../../services/asset/assetMaintenanceService';
import { assetAuditService } from '../../services/asset/assetAuditService';
import { hrEventBus } from '../../services/hrEventBus';
import { api } from '../../services/api';
import {
  UniversalAsset,
  AssetCategory,
  AssetSummaryMetrics,
  InventoryItem,
  AssetAssignment,
  AssetTransfer,
  AssetMaintenanceRecord,
  AssetAuditLog,
  Employee,
} from '../../types';

import { RegisterAssetModal } from '../assets/components/RegisterAssetModal';
import { AssignAssetModal } from '../assets/components/AssignAssetModal';
import { ReturnAssetModal } from '../assets/components/ReturnAssetModal';
import { AssetExportModal } from '../assets/components/AssetExportModal';
import { StockTransactionModal } from '../assets/components/StockTransactionModal';
import { AssetDetailDrawer } from '../assets/components/AssetDetailDrawer';

export const AssetsView: React.FC = () => {
  const { showToast } = useToast();

  // Operational Tabs
  const [activeTab, setActiveTab] = useState<
    'all_assets' | 'inventory' | 'assignments' | 'transfers' | 'maintenance' | 'audit'
  >('all_assets');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedCondition, setSelectedCondition] = useState<string>('ALL');
  const [returnableFilter, setReturnableFilter] = useState<'ALL' | 'RETURNABLE' | 'CONSUMABLE'>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Data States (All Live from Supabase)
  const [assets, setAssets] = useState<UniversalAsset[]>([]);
  const [totalAssetsCount, setTotalAssetsCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [metrics, setMetrics] = useState<AssetSummaryMetrics | null>(null);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [assignments, setAssignments] = useState<AssetAssignment[]>([]);
  const [transfers, setTransfers] = useState<AssetTransfer[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<AssetMaintenanceRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AssetAuditLog[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Modals & Drawers
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState<boolean>(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState<boolean>(false);

  const [activeAsset, setActiveAsset] = useState<UniversalAsset | null>(null);
  const [activeAssignment, setActiveAssignment] = useState<AssetAssignment | null>(null);
  const [activeInventoryItem, setActiveInventoryItem] = useState<InventoryItem | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadData = async (forceDb = false) => {
    try {
      // 1. Fetch live assets from Supabase
      const liveAssets = await assetService.fetchAssetsFromDb(forceDb);
      const liveAssignments = await assetAssignmentService.fetchAssignmentsFromDb(forceDb);

      // 2. Fetch live employees roster
      let empList: Employee[] = [];
      try {
        const rawEmps = await api.getEmployees();
        empList = Array.isArray(rawEmps) ? rawEmps : [];
        setEmployees(empList);
      } catch {
        // Fallback gracefully if offline
      }

      // 3. Categories & Metrics
      const cats = assetService.getCategories();
      setCategories(cats);

      const summary = assetService.getSummaryMetrics();
      setMetrics(summary);

      // 4. Assignments & Secondary tables
      setAssignments(liveAssignments);

      const inv = inventoryService.getInventoryItems();
      setInventoryItems(inv);

      const trfs = assetTransferService.getTransfers();
      setTransfers(trfs);

      const mnts = assetMaintenanceService.getMaintenanceRecords();
      setMaintenanceRecords(mnts);

      const logs = assetAuditService.getLogs(undefined, 50);
      setAuditLogs(logs);

      // 5. Query and paginate asset list
      let filtered = [...liveAssets];

      if (returnableFilter === 'RETURNABLE') {
        filtered = filtered.filter(a => a.is_returnable !== false);
      } else if (returnableFilter === 'CONSUMABLE') {
        filtered = filtered.filter(a => a.is_returnable === false);
      }

      if (selectedCategory !== 'ALL') {
        filtered = filtered.filter(a => a.asset_category_code === selectedCategory || a.category === selectedCategory);
      }

      if (selectedStatus !== 'ALL') {
        filtered = filtered.filter(a => a.status === selectedStatus);
      }

      if (selectedCondition !== 'ALL') {
        filtered = filtered.filter(a => a.condition === selectedCondition);
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(a => {
          const name = (a.asset_name || '').toLowerCase();
          const code = (a.asset_code || '').toLowerCase();
          const serial = (a.serial_number || '').toLowerCase();
          const cat = (a.category || '').toLowerCase();
          return name.includes(q) || code.includes(q) || serial.includes(q) || cat.includes(q);
        });
      }

      const limit = 10;
      const total = filtered.length;
      const totalP = Math.ceil(total / limit) || 1;
      const start = (currentPage - 1) * limit;

      setAssets(filtered.slice(start, start + limit));
      setTotalAssetsCount(total);
      setTotalPages(totalP);
    } catch (err) {
      console.error('Error loading asset data:', err);
    }
  };

  useEffect(() => {
    loadData(false);
  }, [activeTab, searchQuery, selectedCategory, selectedStatus, selectedCondition, returnableFilter, currentPage]);

  // Realtime Event Mesh Subscription
  useEffect(() => {
    const unsubAsset = hrEventBus.subscribe('asset.*', () => loadData(true));
    const unsubInv = hrEventBus.subscribe('inventory.*', () => loadData(true));
    const unsubMnt = hrEventBus.subscribe('maintenance.*', () => loadData(true));

    return () => {
      unsubAsset();
      unsubInv();
      unsubMnt();
    };
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await loadData(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('Asset engine synchronized with live database.', 'success');
    }, 400);
  };

  const handleOpenAssign = (asset: UniversalAsset) => {
    setActiveAsset(asset);
    setIsAssignModalOpen(true);
  };

  const handleOpenReturnForAsset = (asset: UniversalAsset) => {
    // Find active assignment for this asset
    const activeAsgn = assignments.find(
      a => a.asset_id === asset.id && a.status === 'ACTIVE'
    );
    if (activeAsgn) {
      setActiveAssignment(activeAsgn);
      setActiveAsset(asset);
      setIsReturnModalOpen(true);
    } else {
      // Create a fallback assignment shell if none exists in history
      const fallbackAsgn: AssetAssignment = {
        id: `asgn-direct-${asset.id}`,
        asset_id: asset.id,
        target_type: 'EMPLOYEE',
        target_id: asset.id,
        target_name: asset.assignedTo || 'Assigned Custodian',
        assigned_by_id: 'admin',
        assigned_by_name: 'HR Admin',
        assigned_at: asset.created_at,
        condition_at_assign: 'GOOD',
        status: 'ACTIVE',
        is_returnable: asset.is_returnable !== false,
        deduction_amount: asset.deduction_amount || 0,
      };
      setActiveAssignment(fallbackAsgn);
      setActiveAsset(asset);
      setIsReturnModalOpen(true);
    }
  };

  const handleOpenReturnForAssignment = (assignment: AssetAssignment) => {
    const matchingAsset = assets.find(a => a.id === assignment.asset_id) || null;
    setActiveAssignment(assignment);
    setActiveAsset(matchingAsset);
    setIsReturnModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return <Badge variant="emerald">AVAILABLE</Badge>;
      case 'ASSIGNED':
      case 'IN_USE':
        return <Badge variant="blue">ASSIGNED</Badge>;
      case 'UNDER_MAINTENANCE':
      case 'IN_REPAIR':
        return <Badge variant="amber">MAINTENANCE</Badge>;
      case 'DAMAGED':
      case 'LOST':
        return <Badge variant="danger">{status}</Badge>;
      case 'RETIRED':
      case 'DISPOSED':
        return <Badge variant="neutral">{status}</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="p-8 space-y-8 bg-gray-50/50 min-h-screen">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Breadcrumb items={[{ label: 'Joy PeopleHR', href: '/' }, { label: 'Asset Management' }]} />
          <h1 className="text-2xl font-black tracking-tight text-gray-900 mt-1 flex items-center gap-2.5">
            <Package className="w-6 h-6 text-[#07563D]" />
            Universal Asset & Inventory Management Engine
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Live real-time asset registry, returnable tracking, deduction deposits, and Excel audit reporting.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
            className="text-xs font-bold"
          >
            Sync
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExportModalOpen(true)}
            leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
            className="text-xs font-bold border-emerald-600/30 text-emerald-800 hover:bg-emerald-50"
          >
            Export Excel
          </Button>

          <Button
            size="sm"
            onClick={() => setIsRegisterModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            className="bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold shadow-sm"
          >
            Register Asset
          </Button>
        </div>
      </div>

      {/* Live Dynamic KPI Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4 bg-white border border-gray-200/80 shadow-xs hover:border-[#07563D]/40 transition-colors">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Assets</span>
            <Package className="w-4 h-4 text-[#07563D]" />
          </div>
          <div className="text-2xl font-black text-gray-900">{metrics?.total_assets ?? 0}</div>
          <span className="text-[10px] text-gray-400 font-medium">Real-time database count</span>
        </Card>

        <Card className="p-4 bg-white border border-gray-200/80 shadow-xs hover:border-emerald-400 transition-colors">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Valuation</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{metrics?.total_valuation_formatted ?? '₹0'}</div>
          <span className="text-[10px] text-emerald-700/80 font-medium">Combined asset cost</span>
        </Card>

        <Card className="p-4 bg-white border border-gray-200/80 shadow-xs hover:border-blue-400 transition-colors">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Assigned / In Use</span>
            <UserCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-600">{metrics?.currently_assigned ?? 0}</div>
          <span className="text-[10px] text-blue-700/80 font-medium">Active staff custody</span>
        </Card>

        <Card className="p-4 bg-white border border-gray-200/80 shadow-xs hover:border-emerald-400 transition-colors">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Available Pool</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{metrics?.available_in_pool ?? 0}</div>
          <span className="text-[10px] text-emerald-700/80 font-medium">Ready for deployment</span>
        </Card>

        <Card className="p-4 bg-white border border-gray-200/80 shadow-xs hover:border-amber-400 transition-colors">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Maintenance</span>
            <Wrench className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">{metrics?.under_maintenance ?? 0}</div>
          <span className="text-[10px] text-amber-700/80 font-medium">Under repair/service</span>
        </Card>

        <Card className="p-4 bg-white border border-gray-200/80 shadow-xs hover:border-purple-400 transition-colors">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Deduction Ledger</span>
            <Banknote className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700">
            ₹
            {assignments
              .reduce((sum, a) => sum + (Number(a.deduction_amount) || 0), 0)
              .toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-purple-600/80 font-medium">Tracked deposit/deductions</span>
        </Card>
      </div>

      {/* Operational Tabs */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-2">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all_assets', label: `All Assets (${metrics?.total_assets ?? 0})` },
              { id: 'assignments', label: `Custody & Handover (${assignments.length})` },
              { id: 'inventory', label: `Inventory Stock (${inventoryItems.length})` },
              { id: 'transfers', label: `Transfers (${transfers.length})` },
              { id: 'maintenance', label: `Maintenance (${maintenanceRecords.length})` },
              { id: 'audit', label: 'Audit Ledger' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#07563D] text-white shadow-xs'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Global Search & Multi-Filters Strip (for Asset List) */}
        {activeTab === 'all_assets' && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by asset code, name, serial tag, or custodian..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-[#07563D]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Returnable Filter */}
              <select
                value={returnableFilter}
                onChange={e => setReturnableFilter(e.target.value as any)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-[#07563D]"
              >
                <option value="ALL">All Return Types</option>
                <option value="RETURNABLE">Returnable Assets Only</option>
                <option value="CONSUMABLE">Consumable / Non-Returnable</option>
              </select>

              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-[#07563D]"
              >
                <option value="ALL">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-[#07563D]"
              >
                <option value="ALL">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                <option value="DAMAGED">Damaged</option>
              </select>

              <select
                value={selectedCondition}
                onChange={e => setSelectedCondition(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-[#07563D]"
              >
                <option value="ALL">All Conditions</option>
                <option value="NEW">New</option>
                <option value="EXCELLENT">Excellent</option>
                <option value="GOOD">Good</option>
                <option value="FAIR">Fair</option>
                <option value="DAMAGED">Damaged</option>
              </select>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: ALL UNIVERSAL ASSETS */}
        {/* ========================================================================= */}
        {activeTab === 'all_assets' && (
          <Card className="border border-gray-200/80 shadow-xs overflow-hidden bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/70">
                  <TableHead className="font-bold text-gray-900 text-xs">Asset Name & Code</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Nature</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Serial / Tag</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Deduction / Deposit</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Custodian</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Valuation</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Status</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-gray-400">
                      <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-xs font-bold text-gray-700">No assets registered in database</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Click '+ Register Asset' to add tools, PPE, machinery, or computing assets into your pool.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  assets.map(asset => (
                    <TableRow
                      key={asset.id}
                      className="hover:bg-gray-50/70 transition-colors cursor-pointer"
                      onClick={() => {
                        setActiveAsset(asset);
                        setIsDetailDrawerOpen(true);
                      }}
                    >
                      {/* Name & Code */}
                      <TableCell>
                        <div className="flex items-start gap-2.5">
                          <div className="p-2 bg-[#07563D]/10 text-[#07563D] rounded-xl shrink-0 mt-0.5">
                            <Package className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-extrabold text-gray-900 text-xs line-clamp-1 block">
                              {asset.asset_name}
                            </span>
                            <span className="text-[10px] font-mono text-gray-400 block">
                              {asset.asset_code} • {asset.category || asset.asset_category_code}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Returnable vs Consumable Badge */}
                      <TableCell>
                        {asset.is_returnable !== false ? (
                          <Badge variant="emerald" className="text-[10px] font-bold">
                            Returnable
                          </Badge>
                        ) : (
                          <Badge variant="amber" className="text-[10px] font-bold">
                            Consumable
                          </Badge>
                        )}
                      </TableCell>

                      {/* Serial Tag */}
                      <TableCell>
                        <span className="font-mono text-xs font-bold text-gray-800">
                          {asset.serial_number || 'N/A'}
                        </span>
                      </TableCell>

                      {/* Deduction Amount */}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs font-bold text-gray-900">
                            ₹{(asset.deduction_amount || 0).toLocaleString('en-IN')}
                          </span>
                          {(asset.deduction_amount || 0) > 0 && (
                            <Badge variant="purple" className="text-[9px] px-1 py-0">
                              Deposit
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Current Custodian */}
                      <TableCell>
                        <span className="text-xs font-bold text-gray-900 block">
                          {asset.assignedTo || 'Unassigned (Pool)'}
                        </span>
                      </TableCell>

                      {/* Valuation */}
                      <TableCell>
                        <span className="font-mono text-xs font-bold text-gray-900">
                          ₹{Number(asset.purchase_price || 0).toLocaleString('en-IN')}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell>{getStatusBadge(asset.status)}</TableCell>

                      {/* Actions */}
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {asset.status === 'AVAILABLE' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenAssign(asset)}
                              className="h-7 px-2.5 text-xs text-[#07563D] border-[#07563D]/30 hover:bg-[#07563D]/5 font-bold"
                            >
                              Assign
                            </Button>
                          ) : asset.status === 'ASSIGNED' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenReturnForAsset(asset)}
                              className="h-7 px-2.5 text-xs text-amber-700 border-amber-300 hover:bg-amber-50 font-bold"
                            >
                              Return
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setActiveAsset(asset);
                                setIsDetailDrawerOpen(true);
                              }}
                              className="h-7 px-2 text-xs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Server Pagination Toolbar */}
            <div className="p-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
              <div>
                Showing <strong>{assets.length}</strong> of <strong>{totalAssetsCount}</strong> total items
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="h-7 px-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs font-bold text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="h-7 px-2"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: CUSTODY & ASSIGNMENTS LEDGER */}
        {/* ========================================================================= */}
        {activeTab === 'assignments' && (
          <Card className="border border-gray-200/80 shadow-xs overflow-hidden bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/70">
                  <TableHead className="font-bold text-gray-900 text-xs">Employee / Custodian</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Nature</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Assigned Date</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Expected Return</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Deduction / Deposit</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Condition</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Status</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-gray-400 text-xs">
                      No active employee asset handovers recorded in database.
                    </TableCell>
                  </TableRow>
                ) : (
                  assignments.map(asgn => (
                    <TableRow key={asgn.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-[#07563D]" />
                          <div>
                            <span className="font-bold text-gray-900 text-xs block">{asgn.target_name}</span>
                            <span className="font-mono text-[10px] text-gray-400">By {asgn.assigned_by_name}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        {asgn.is_returnable !== false ? (
                          <Badge variant="emerald" className="text-[10px]">Returnable</Badge>
                        ) : (
                          <Badge variant="amber" className="text-[10px]">Consumable</Badge>
                        )}
                      </TableCell>

                      <TableCell className="font-mono text-xs text-gray-600">
                        {asgn.assigned_at ? new Date(asgn.assigned_at).toLocaleDateString() : '-'}
                      </TableCell>

                      <TableCell className="font-mono text-xs text-gray-600">
                        {asgn.expected_return_date || 'Ongoing'}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-gray-900">
                            ₹{(asgn.deduction_amount || 0).toLocaleString('en-IN')}
                          </span>
                          {asgn.deduction_status && asgn.deduction_status !== 'NO_DEDUCTION' && (
                            <Badge variant="purple" className="text-[9px] px-1 py-0">
                              {asgn.deduction_status}
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="emerald">{asgn.condition_at_assign}</Badge>
                      </TableCell>

                      <TableCell>
                        <Badge variant={asgn.status === 'ACTIVE' ? 'blue' : 'neutral'}>
                          {asgn.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        {asgn.status === 'ACTIVE' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenReturnForAssignment(asgn)}
                            className="h-7 px-2.5 text-xs text-amber-700 border-amber-300 hover:bg-amber-50 font-bold"
                          >
                            Return / Clear
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: INVENTORY STOCK */}
        {/* ========================================================================= */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-gray-900">Quantity-Based Stock & Consumables</h3>
              <Button
                size="sm"
                onClick={() => {
                  inventoryService.createInventoryItem({
                    categoryCode: 'CONSUMABLES',
                    sku: `SKU-${Date.now().toString().slice(-4)}`,
                    itemName: 'Type-C Fast Charging Adapters',
                    initialStock: 25,
                    reorderLevel: 5,
                    unitCost: 29,
                  });
                  showToast('Sample SKU added to inventory.', 'success');
                  loadData(true);
                }}
                leftIcon={<Plus className="w-4 h-4" />}
                className="bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold"
              >
                Add Inventory SKU
              </Button>
            </div>

            <Card className="border border-gray-200/80 shadow-xs overflow-hidden bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/70">
                    <TableHead className="font-bold text-gray-900 text-xs">SKU & Item Name</TableHead>
                    <TableHead className="font-bold text-gray-900 text-xs">Category</TableHead>
                    <TableHead className="font-bold text-gray-900 text-xs">On Hand</TableHead>
                    <TableHead className="font-bold text-gray-900 text-xs">Reserved</TableHead>
                    <TableHead className="font-bold text-gray-900 text-xs">Available Stock</TableHead>
                    <TableHead className="font-bold text-gray-900 text-xs">Reorder Level</TableHead>
                    <TableHead className="font-bold text-gray-900 text-xs">Status</TableHead>
                    <TableHead className="font-bold text-gray-900 text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-gray-400 text-xs">
                        No inventory stock items tracked. Click 'Add Inventory SKU' to register stock.
                      </TableCell>
                    </TableRow>
                  ) : (
                    inventoryItems.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <span className="font-extrabold text-gray-900 text-xs block">{item.item_name}</span>
                            <span className="font-mono text-[10px] text-gray-400">{item.sku}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-gray-700">{item.category_code}</TableCell>
                        <TableCell className="font-bold text-xs text-gray-900">
                          {item.quantity_on_hand} {item.unit_of_measure}
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">{item.quantity_reserved}</TableCell>
                        <TableCell className="font-bold text-xs text-emerald-700">
                          {item.quantity_on_hand - item.quantity_reserved - item.quantity_damaged}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-gray-600">{item.reorder_level}</TableCell>
                        <TableCell>
                          <Badge variant={item.is_low_stock ? 'danger' : 'emerald'}>
                            {item.is_low_stock ? 'LOW STOCK' : 'HEALTHY'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setActiveInventoryItem(item);
                              setIsStockModalOpen(true);
                            }}
                            className="text-xs h-7 text-[#07563D] border-[#07563D]/30 hover:bg-[#07563D]/5"
                          >
                            Stock Op
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: TRANSFERS */}
        {/* ========================================================================= */}
        {activeTab === 'transfers' && (
          <Card className="border border-gray-200/80 shadow-xs overflow-hidden bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/70">
                  <TableHead className="font-bold text-gray-900 text-xs">Source Location</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Destination</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Requested By</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Requested At</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-gray-400 text-xs">
                      No active asset relocation / transfers.
                    </TableCell>
                  </TableRow>
                ) : (
                  transfers.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-bold text-gray-900 text-xs">{t.source_target_name}</TableCell>
                      <TableCell className="font-bold text-gray-900 text-xs">{t.destination_target_name}</TableCell>
                      <TableCell className="text-xs text-gray-700">{t.requested_by}</TableCell>
                      <TableCell className="font-mono text-xs text-gray-500">
                        {new Date(t.requested_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={t.status === 'RECEIVED' ? 'emerald' : 'amber'}>{t.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: MAINTENANCE & SERVICE */}
        {/* ========================================================================= */}
        {activeTab === 'maintenance' && (
          <Card className="border border-gray-200/80 shadow-xs overflow-hidden bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/70">
                  <TableHead className="font-bold text-gray-900 text-xs">Service Title</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Type</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Scheduled Date</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Technician</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maintenanceRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-gray-400 text-xs">
                      No maintenance or calibration records scheduled.
                    </TableCell>
                  </TableRow>
                ) : (
                  maintenanceRecords.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="font-bold text-gray-900 text-xs">{m.title}</TableCell>
                      <TableCell>
                        <Badge variant="neutral">{m.maintenance_type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gray-600">{m.scheduled_date}</TableCell>
                      <TableCell className="text-xs text-gray-700">{m.technician_name || 'In-house'}</TableCell>
                      <TableCell>
                        <Badge variant={m.status === 'COMPLETED' ? 'emerald' : 'amber'}>{m.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: AUDIT LEDGER */}
        {/* ========================================================================= */}
        {activeTab === 'audit' && (
          <Card className="border border-gray-200/80 shadow-xs overflow-hidden bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/70">
                  <TableHead className="font-bold text-gray-900 text-xs">Timestamp</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Actor</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Action</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Asset ID</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-gray-400 text-xs">
                      No asset audit logs recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  auditLogs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-[11px] text-gray-500">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-bold text-gray-900 text-xs">{log.actor_name}</TableCell>
                      <TableCell>
                        <Badge variant="purple" className="font-mono text-[10px]">
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-gray-600">
                        {log.asset_id || 'System'}
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-gray-500 truncate max-w-md">
                        {JSON.stringify(log.details)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Register Asset Modal */}
      <RegisterAssetModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={() => loadData(true)}
      />

      {/* Assign Asset Modal */}
      <AssignAssetModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onSuccess={() => loadData(true)}
        asset={activeAsset}
      />

      {/* Return Asset & Clearance Modal */}
      <ReturnAssetModal
        isOpen={isReturnModalOpen}
        onClose={() => {
          setIsReturnModalOpen(false);
          setActiveAssignment(null);
        }}
        onSuccess={() => loadData(true)}
        assignment={activeAssignment}
        asset={activeAsset}
      />

      {/* Day-Wise & Monthly Excel Export Modal */}
      <AssetExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        assignments={assignments}
        assets={assets}
        employees={employees}
      />

      {/* Stock Transaction Modal */}
      <StockTransactionModal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        onSuccess={() => loadData(true)}
        item={activeInventoryItem}
      />

      {/* 360 Asset Detail Drawer */}
      <AssetDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        asset={activeAsset}
        onRefresh={() => loadData(true)}
        onOpenAssign={asset => {
          setActiveAsset(asset);
          setIsAssignModalOpen(true);
        }}
      />
    </div>
  );
};

export default AssetsView;
