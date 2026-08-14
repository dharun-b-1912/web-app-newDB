import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { cn } from '../../lib/utils';

export interface Column<T> {
  id: string;
  header: string;
  accessor?: keyof T | ((row: T) => React.ReactNode);
  cell?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
  className?: string;
}

export interface EnterpriseDataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  pageSize?: number;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  onRowClick?: (item: T) => void;
  enableSelection?: boolean;
  selectedKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
  bulkActions?: React.ReactNode;
  exportFileName?: string;
  className?: string;
}

export function EnterpriseDataTable<T>({
  columns,
  data,
  keyExtractor,
  pageSize = 10,
  isLoading = false,
  emptyState,
  onRowClick,
  enableSelection = false,
  selectedKeys = [],
  onSelectionChange,
  bulkActions,
  exportFileName,
  className,
}: EnterpriseDataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Sorting
  const sortedData = React.useMemo(() => {
    if (!sortColumn) return data;

    const column = columns.find((col) => col.id === sortColumn);
    if (!column || !column.accessor) return data;

    return [...data].sort((a, b) => {
      let valA: any;
      let valB: any;

      if (typeof column.accessor === 'function') {
        valA = column.accessor(a);
        valB = column.accessor(b);
      } else if (column.accessor) {
        valA = a[column.accessor];
        valB = b[column.accessor];
      }

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      const res = valA < valB ? -1 : 1;
      return sortDirection === 'asc' ? res : -res;
    });
  }, [data, sortColumn, sortDirection, columns]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = sortedData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (colId: string) => {
    if (sortColumn === colId) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
      }
    } else {
      setSortColumn(colId);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    if (selectedKeys.length === data.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(data.map((d) => keyExtractor(d)));
    }
  };

  const handleSelectRow = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSelectionChange) return;
    if (selectedKeys.includes(key)) {
      onSelectionChange(selectedKeys.filter((k) => k !== key));
    } else {
      onSelectionChange([...selectedKeys, key]);
    }
  };

  const handleExportCSV = () => {
    if (data.length === 0) return;
    const headerRow = columns.map((c) => `"${c.header}"`).join(',');
    const rows = sortedData.map((row) =>
      columns
        .map((col) => {
          let val = '';
          if (typeof col.accessor === 'string') {
            val = String((row as any)[col.accessor] ?? '');
          } else {
            val = col.id;
          }
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(',')
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [headerRow, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${exportFileName || 'workforceos-export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={cn('bg-white rounded-[10px] border border-[#E7EAF0] shadow-[0_1px_2px_rgba(15,23,43,0.04)] overflow-hidden flex flex-col', className)}>
      {/* Top Action Bar */}
      {(enableSelection && selectedKeys.length > 0) || exportFileName ? (
        <div className="flex items-center justify-between px-4 py-2 bg-[#F9FAFB] border-b border-[#E7EAF0] text-xs font-sans">
          <div className="flex items-center gap-2">
            {enableSelection && selectedKeys.length > 0 && (
              <>
                <span className="font-bold text-[#07563D] bg-[#ECFDF5] px-2 py-0.5 rounded-full border border-[#A7F3D0]">
                  {selectedKeys.length} Selected
                </span>
                {bulkActions}
              </>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {exportFileName && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportCSV}
                className="h-7 text-xs px-2.5"
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                Export CSV
              </Button>
            )}
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-[#E7EAF0] text-[#62748E] font-bold uppercase tracking-[0.03em] text-[11.5px] font-sans">
              {enableSelection && (
                <th className="px-3 py-3.5 w-10 text-center select-none">
                  <Checkbox
                    checked={data.length > 0 && selectedKeys.length === data.length}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.id}
                  style={{ width: col.width }}
                  className={cn(
                    'px-4 py-3.5 select-none font-sans',
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                      ? 'text-center'
                      : 'text-left',
                    col.sortable ? 'cursor-pointer hover:bg-slate-100 transition-colors' : '',
                    col.className
                  )}
                  onClick={() => col.sortable && handleSort(col.id)}
                >
                  <div
                    className={cn(
                      'inline-flex items-center gap-1.5',
                      col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'
                    )}
                  >
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span className="text-[#90A1B9]">
                        {sortColumn === col.id ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-[#047857]" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-[#047857]" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-60" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7EAF0] text-[#0F172B]">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length + (enableSelection ? 1 : 0)} className="px-4 py-12 text-center text-[#90A1B9]">
                  <div className="inline-flex items-center gap-2 text-xs font-medium font-sans">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-[#047857] border-t-transparent" />
                    Loading records...
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (enableSelection ? 1 : 0)} className="px-4 py-12 text-center text-[#90A1B9]">
                  {emptyState || (
                    <div className="text-xs font-medium font-sans">No records found.</div>
                  )}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIdx) => {
                const key = keyExtractor(row);
                const isSelected = selectedKeys.includes(key);

                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={cn(
                      'min-h-[56px] transition-colors duration-100 font-sans',
                      isSelected ? 'bg-[#ECFDF5]/60' : 'hover:bg-[#F9FAFB]',
                      onRowClick ? 'cursor-pointer' : ''
                    )}
                  >
                    {enableSelection && (
                      <td className="px-3 py-3.5 text-center align-middle" onClick={(e) => handleSelectRow(key, e)}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => {}}
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.id}
                        className={cn(
                          'px-4 py-3.5 align-middle',
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left',
                          col.className
                        )}
                      >
                        {col.cell
                          ? col.cell(row, rowIdx)
                          : typeof col.accessor === 'function'
                          ? col.accessor(row)
                          : col.accessor
                          ? (row[col.accessor] as any)
                          : null}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!isLoading && data.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#E7EAF0] bg-[#F9FAFB] text-[13px] text-[#90A1B9] font-medium font-sans">
          <div>
            Showing <span className="font-semibold text-[#0F172B]">{(currentPage - 1) * pageSize + 1}</span> to{' '}
            <span className="font-semibold text-[#0F172B]">
              {Math.min(currentPage * pageSize, data.length)}
            </span>{' '}
            of <span className="font-semibold text-[#0F172B]">{data.length}</span> results
          </div>

          <div className="flex items-center gap-1">
            <Button
              size="icon-sm"
              variant="outline"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              title="First Page"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon-sm"
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>

            <span className="px-2 text-xs font-semibold text-[#0F172B] font-sans">
              Page {currentPage} of {totalPages}
            </span>

            <Button
              size="icon-sm"
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon-sm"
              variant="outline"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              title="Last Page"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
