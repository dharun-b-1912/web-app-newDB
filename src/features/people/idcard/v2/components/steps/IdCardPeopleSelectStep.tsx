// src/features/people/idcard/v2/components/steps/IdCardPeopleSelectStep.tsx
// ============================================================================
// Step 2: Workforce Selection Table with Search, Multi-Filters, and Batch Counts
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  Search,
  CheckSquare,
  Square,
  Image as ImageIcon,
  AlertCircle,
  Building2,
  MapPin,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { IdCardPersonRecord } from '../../../idCardTypes';

interface IdCardPeopleSelectStepProps {
  employees: IdCardPersonRecord[];
  selectedEmployeeIds: Set<string>;
  onToggleEmployee: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onDeselectAll: () => void;
  onProceed: () => void;
  photosMap: Map<string, HTMLImageElement>;
  includeSeparated?: boolean;
  onToggleSeparated?: (include: boolean) => void;
}

export const IdCardPeopleSelectStep: React.FC<IdCardPeopleSelectStepProps> = ({
  employees,
  selectedEmployeeIds,
  onToggleEmployee,
  onSelectAll,
  onDeselectAll,
  onProceed,
  photosMap,
  includeSeparated = false,
  onToggleSeparated,
}) => {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [photoFilter, setPhotoFilter] = useState<'ALL' | 'WITH_PHOTO' | 'NO_PHOTO'>('ALL');

  // Extract unique departments for filter dropdown
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set).sort();
  }, [employees]);

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // 1. Text Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = emp.name.toLowerCase().includes(q);
        const matchesCode = emp.idno.toLowerCase().includes(q);
        const matchesDept = emp.department.toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesDept) return false;
      }

      // 2. Department Filter
      if (deptFilter !== 'ALL' && emp.department !== deptFilter) {
        return false;
      }

      // 3. Photo Filter
      const hasPhoto = Boolean(emp.__img || (emp.photo && photosMap.has(emp.photo.toLowerCase())));
      if (photoFilter === 'WITH_PHOTO' && !hasPhoto) return false;
      if (photoFilter === 'NO_PHOTO' && hasPhoto) return false;

      return true;
    });
  }, [employees, search, deptFilter, photoFilter, photosMap]);

  const allFilteredSelected =
    filteredEmployees.length > 0 &&
    filteredEmployees.every(e => selectedEmployeeIds.has(e.id));

  const someFilteredSelected =
    filteredEmployees.some(e => selectedEmployeeIds.has(e.id)) && !allFilteredSelected;

  const handleMasterToggle = () => {
    if (allFilteredSelected) {
      onDeselectAll();
    } else {
      onSelectAll(filteredEmployees.map(e => e.id));
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Step Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Step 2: Select Employees for ID Card Issuance</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {selectedEmployeeIds.size} of {employees.length} selected
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Choose individual employees or batch select entire departments. Synchronized with your active Joy PeopleHR directory.
          </p>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onProceed}
          disabled={selectedEmployeeIds.size === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed self-start sm:self-auto"
        >
          <span>Review Selected ({selectedEmployeeIds.size})</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 py-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, employee ID, or department..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {/* Department Filter */}
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All Departments ({departments.length})</option>
            {departments.map(d => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Photo Filter */}
          <select
            value={photoFilter}
            onChange={e => setPhotoFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All Photo Statuses</option>
            <option value="WITH_PHOTO">Photo Attached</option>
            <option value="NO_PHOTO">Missing Photo</option>
          </select>

          {/* Quick Batch Select All Button */}
          <button
            type="button"
            onClick={handleMasterToggle}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
          >
            {allFilteredSelected ? 'Deselect All' : `Select All (${filteredEmployees.length})`}
          </button>

          {/* Show Resigned Filter Toggle */}
          {onToggleSeparated && (
            <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer select-none shrink-0" title="Include separated and resigned employees in card issuance">
              <input
                type="checkbox"
                checked={includeSeparated}
                onChange={e => onToggleSeparated(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span>Show Resigned (+2)</span>
            </label>
          )}
        </div>
      </div>

      {/* Workforce Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">
                  <button
                    type="button"
                    onClick={handleMasterToggle}
                    className="p-1 hover:text-emerald-500 transition-colors cursor-pointer"
                    title={allFilteredSelected ? 'Deselect All' : 'Select All'}
                  >
                    {allFilteredSelected ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600" />
                    ) : someFilteredSelected ? (
                      <div className="w-4 h-4 border-2 border-emerald-600 rounded bg-emerald-600/20" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Department & Role</th>
                <th className="py-3 px-4">Worksite / Branch</th>
                <th className="py-3 px-4 text-center">Photo Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Filter className="w-6 h-6 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold">No employees match the active filters.</p>
                    <p className="text-[11px] mt-1 text-slate-500">Try clearing your search query or department filter.</p>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map(emp => {
                  const isChecked = selectedEmployeeIds.has(emp.id);
                  const hasPhoto = Boolean(emp.__img || (emp.photo && photosMap.has(emp.photo.toLowerCase())));

                  return (
                    <tr
                      key={emp.id}
                      onClick={() => onToggleEmployee(emp.id)}
                      className={`transition-colors cursor-pointer ${
                        isChecked
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-850/50'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onToggleEmployee(emp.id)}
                          className="p-1 cursor-pointer"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                          )}
                        </button>
                      </td>

                      {/* Employee Name & Thumbnail */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-xs shrink-0">
                            {hasPhoto && emp.__img ? (
                              <img src={emp.__img.src} alt={emp.name} className="w-full h-full object-cover" />
                            ) : (
                              emp.name.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white leading-tight">
                              {emp.name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {emp.email || 'No email provided'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Employee ID */}
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {emp.idno}
                      </td>

                      {/* Department & Role */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {emp.designation}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{emp.department}</span>
                        </div>
                      </td>

                      {/* Worksite / Branch */}
                      <td className="py-3 px-4">
                        <div className="text-slate-600 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{emp.branch || 'Headquarters'}</span>
                        </div>
                      </td>

                      {/* Photo Status */}
                      <td className="py-3 px-4 text-center">
                        {hasPhoto ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            <ImageIcon className="w-3 h-3" />
                            <span>Photo OK</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            <AlertCircle className="w-3 h-3" />
                            <span>No Photo</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
