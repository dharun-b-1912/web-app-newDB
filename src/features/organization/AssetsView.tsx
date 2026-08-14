import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumb } from '../../components/shell/Breadcrumb';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Package, Plus, Search, Filter, Laptop, Smartphone, Monitor, ShieldCheck, CheckCircle2, RotateCcw } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';

const initialAssets = [
  { id: 'AST-001', name: 'MacBook Pro 16" M3 Max', category: 'Laptop', serial: 'C02G1234MD6R', assignedTo: 'Priya Sharma', empCode: 'EMP-1024', status: 'Assigned', value: '$3,499' },
  { id: 'AST-002', name: 'Dell UltraSharp 32" 4K Monitor', category: 'Peripheral', serial: 'CN-01234-DELL', assignedTo: 'Dharun Joy', empCode: 'EMP-001', status: 'Assigned', value: '$899' },
  { id: 'AST-003', name: 'ThinkPad P1 Gen 6', category: 'Laptop', serial: 'PF-49102-LEN', assignedTo: 'Ananya Reddy', empCode: 'EMP-1025', status: 'Assigned', value: '$2,299' },
  { id: 'AST-004', name: 'iPhone 15 Pro Max (Test Device)', category: 'Mobile', serial: 'F2L9201934', assignedTo: 'Unassigned (IT Pool)', empCode: '-', status: 'Available', value: '$1,199' },
  { id: 'AST-005', name: 'MacBook Air M2 15"', category: 'Laptop', serial: 'C02F992011A', assignedTo: 'Sneha Mukherjee', empCode: 'EMP-1028', status: 'In Maintenance', value: '$1,499' },
];

export const AssetsView: React.FC = () => {
  const [assets, setAssets] = useState(initialAssets);
  const [query, setQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const { showToast } = useToast();

  const filtered = assets.filter(a => {
    const matchesQ =
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      a.serial.toLowerCase().includes(query.toLowerCase()) ||
      a.assignedTo.toLowerCase().includes(query.toLowerCase());
    const matchesC = filterCategory === 'All' || a.category === filterCategory;
    return matchesQ && matchesC;
  });

  const handleReturnAsset = (id: string) => {
    setAssets(prev =>
      prev.map(a => (a.id === id ? { ...a, status: 'Available', assignedTo: 'Unassigned (IT Pool)', empCode: '-' } : a))
    );
    showToast('Asset status updated to Available (Returned to IT Pool)');
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'CORE HR' }, { label: 'Asset Management' }]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-[#07563D]" /> Company Asset Inventory & Allocation
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Track hardware, IT assets, serial numbers, warranty status, and employee assignments across all locations.
          </p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Asset Registration Modal opened')}>
          Register New Asset
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 space-y-1">
          <div className="text-xs font-bold text-gray-400 uppercase">Total Inventory Value</div>
          <div className="text-2xl font-black text-gray-900">$248,500</div>
          <div className="text-[11px] text-emerald-600 font-semibold">142 Items Tracked</div>
        </Card>
        <Card className="p-4 space-y-1">
          <div className="text-xs font-bold text-gray-400 uppercase">Currently Assigned</div>
          <div className="text-2xl font-black text-[#07563D]">128</div>
          <div className="text-[11px] text-gray-500 font-semibold">90.1% Allocation Rate</div>
        </Card>
        <Card className="p-4 space-y-1">
          <div className="text-xs font-bold text-gray-400 uppercase">Available in Pool</div>
          <div className="text-2xl font-black text-blue-700">11</div>
          <div className="text-[11px] text-blue-600 font-semibold">Ready for Onboarding</div>
        </Card>
        <Card className="p-4 space-y-1">
          <div className="text-xs font-bold text-gray-400 uppercase">In Repair / Maint</div>
          <div className="text-2xl font-black text-amber-700">3</div>
          <div className="text-[11px] text-amber-600 font-semibold">Under IT Warranty</div>
        </Card>
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search asset, serial no, or employee..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-[#07563D]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none bg-white"
            >
              <option value="All">All Categories</option>
              <option value="Laptop">Laptops</option>
              <option value="Peripheral">Peripherals & Monitors</option>
              <option value="Mobile">Mobiles & Tablets</option>
            </select>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset ID</TableHead>
              <TableHead>Item & Specs</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Serial Number</TableHead>
              <TableHead>Assigned Employee</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Asset Value</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-mono font-bold text-xs">{item.id}</TableCell>
                <TableCell className="font-semibold text-gray-900">{item.name}</TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell className="font-mono text-xs text-gray-500">{item.serial}</TableCell>
                <TableCell>
                  <div className="font-semibold text-gray-900">{item.assignedTo}</div>
                  <div className="text-[10px] text-gray-400">{item.empCode}</div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      item.status === 'Assigned'
                        ? 'emerald'
                        : item.status === 'Available'
                        ? 'info'
                        : 'amber'
                    }
                  >
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell className="font-semibold">{item.value}</TableCell>
                <TableCell className="text-right">
                  {item.status === 'Assigned' && (
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                      onClick={() => handleReturnAsset(item.id)}
                    >
                      Return
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
