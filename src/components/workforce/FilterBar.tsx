import React from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

export interface FilterPreset {
  id: string;
  label: string;
  count?: number;
}

export interface FilterBarProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  presets?: FilterPreset[];
  activePreset?: string;
  onSelectPreset?: (id: string) => void;
  actions?: React.ReactNode;
  activeFiltersCount?: number;
  onClearFilters?: () => void;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchPlaceholder = 'Search records...',
  searchValue = '',
  onSearchChange,
  presets = [],
  activePreset,
  onSelectPreset,
  actions,
  activeFiltersCount = 0,
  onClearFilters,
  className,
}) => {
  return (
    <div className={cn('flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between', className)}>
      {/* Left: Search input & Presets */}
      <div className="flex items-center gap-2 flex-1 flex-wrap">
        {onSearchChange && (
          <div className="relative min-w-[220px] max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-8.5 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#047857] focus:border-transparent transition-all shadow-2xs"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {presets.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
            {presets.map((preset) => {
              const isActive = preset.id === activePreset;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectPreset && onSelectPreset(preset.id)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5',
                    isActive
                      ? 'bg-[#047857] text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  )}
                >
                  <span>{preset.label}</span>
                  {preset.count !== undefined && (
                    <span
                      className={cn(
                        'px-1.5 py-0.2 text-[10px] rounded-full font-bold',
                        isActive
                          ? 'bg-emerald-900/40 text-white'
                          : 'bg-slate-100 text-slate-600'
                      )}
                    >
                      {preset.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: Actions & Clear filter chip */}
      <div className="flex items-center gap-2 shrink-0">
        {activeFiltersCount > 0 && onClearFilters && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearFilters}
            className="text-xs text-slate-500 hover:text-red-600 gap-1 h-8"
          >
            <X className="w-3 h-3" />
            Clear ({activeFiltersCount})
          </Button>
        )}
        {actions}
      </div>
    </div>
  );
};
