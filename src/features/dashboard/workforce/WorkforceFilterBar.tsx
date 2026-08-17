import React from 'react';
import { Search, Filter, X, Building2, MapPin, Briefcase, UserCheck } from 'lucide-react';
import { Department, Location, Branch, Employee } from '../../../types';

export interface WorkforceFiltersState {
  search: string;
  departmentId: string;
  locationId: string;
  employmentType: string;
  status: string;
  workMode: string;
  managerId: string;
}

interface Props {
  filters: WorkforceFiltersState;
  onChange: (filters: Partial<WorkforceFiltersState>) => void;
  onReset: () => void;
  departments: Department[];
  locations: Location[];
  branches: Branch[];
  managers: Employee[];
  totalResultsCount: number;
}

export const WorkforceFilterBar: React.FC<Props> = ({
  filters,
  onChange,
  onReset,
  departments,
  locations,
  branches,
  managers,
  totalResultsCount,
}) => {
  const isFiltered =
    Boolean(filters.search.trim()) ||
    filters.departmentId !== 'ALL' ||
    filters.locationId !== 'ALL' ||
    filters.employmentType !== 'ALL' ||
    filters.status !== 'ALL' ||
    filters.workMode !== 'ALL' ||
    filters.managerId !== 'ALL';

  return (
    <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-3">
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Global Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, ID, title, department..."
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
          />
          {filters.search && (
            <button
              onClick={() => onChange({ search: '' })}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Count & Clear Button */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <span className="text-xs font-bold text-gray-500">
            Showing <span className="text-gray-900 font-black">{totalResultsCount}</span> employees in scope
          </span>

          {isFiltered && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Dimensional Dropdown Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 pt-2 border-t border-gray-100 text-xs">
        {/* 1. Department */}
        <div>
          <select
            value={filters.departmentId}
            onChange={(e) => onChange({ departmentId: e.target.value })}
            className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#07563D]"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Location / Branch */}
        <div>
          <select
            value={filters.locationId}
            onChange={(e) => onChange({ locationId: e.target.value })}
            className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#07563D]"
          >
            <option value="ALL">All Locations</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.city})
              </option>
            ))}
          </select>
        </div>

        {/* 3. Employment Type */}
        <div>
          <select
            value={filters.employmentType}
            onChange={(e) => onChange({ employmentType: e.target.value })}
            className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#07563D]"
          >
            <option value="ALL">All Types</option>
            <option value="Full Time">Full Time</option>
            <option value="Contract">Contract</option>
            <option value="Intern">Intern</option>
            <option value="Consultant">Consultant</option>
            <option value="Part Time">Part Time</option>
          </select>
        </div>

        {/* 4. Status */}
        <div>
          <select
            value={filters.status}
            onChange={(e) => onChange({ status: e.target.value })}
            className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#07563D]"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Probation">Probation</option>
            <option value="Onboarding">Onboarding</option>
            <option value="Notice Period">Notice Period</option>
            <option value="On Leave">On Leave</option>
            <option value="Exited">Exited</option>
          </select>
        </div>

        {/* 5. Work Mode */}
        <div>
          <select
            value={filters.workMode}
            onChange={(e) => onChange({ workMode: e.target.value })}
            className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#07563D]"
          >
            <option value="ALL">All Work Modes</option>
            <option value="Office">Office</option>
            <option value="Hybrid">Hybrid</option>
            <option value="Remote">Remote</option>
            <option value="Field">Field</option>
          </select>
        </div>

        {/* 6. Reporting Manager */}
        <div>
          <select
            value={filters.managerId}
            onChange={(e) => onChange({ managerId: e.target.value })}
            className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#07563D]"
          >
            <option value="ALL">All Managers</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.first_name} {m.last_name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
