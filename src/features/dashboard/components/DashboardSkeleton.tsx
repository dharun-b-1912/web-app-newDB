import React from 'react';

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Loading HR Dashboard">
      {/* Header Skeleton */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-4 w-40 bg-gray-200 rounded" />
          <div className="h-7 w-64 bg-gray-200 rounded" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-28 bg-gray-200 rounded-xl" />
          <div className="h-10 w-36 bg-gray-200 rounded-xl" />
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3 w-16 bg-gray-200 rounded" />
              <div className="w-8 h-8 rounded-lg bg-gray-100" />
            </div>
            <div className="h-7 w-12 bg-gray-200 rounded" />
            <div className="h-3 w-20 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      {/* Main Attention & Attendance Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="h-5 w-48 bg-gray-200 rounded" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-50 rounded-xl border border-gray-100" />
            ))}
          </div>
        </div>
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="h-5 w-36 bg-gray-200 rounded" />
          <div className="h-48 bg-gray-50 rounded-xl" />
        </div>
      </div>

      {/* Snapshots & Movement Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="h-5 w-44 bg-gray-200 rounded" />
          <div className="grid grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 bg-gray-50 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="h-5 w-44 bg-gray-200 rounded" />
          <div className="h-32 bg-gray-50 rounded-xl" />
        </div>
      </div>
    </div>
  );
};
