import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Award, Star } from 'lucide-react';

export const PerformanceAnalyticsView: React.FC = () => {
  const bellCurve = [
    { rating: '5.0 - Exceptional (Top 10%)', count: 42, pct: '9.8%', color: 'text-emerald-700 bg-emerald-50' },
    { rating: '4.0 - Exceeds Expectations (Top 25%)', count: 108, pct: '25.2%', color: 'text-emerald-600 bg-emerald-50/50' },
    { rating: '3.0 - Meets Expectations (Target 55%)', count: 236, pct: '55.1%', color: 'text-blue-700 bg-blue-50' },
    { rating: '2.0 - Needs Improvement (5%)', count: 24, pct: '5.6%', color: 'text-amber-700 bg-amber-50' },
    { rating: '1.0 - Unsatisfactory / PIP (4%)', count: 18, pct: '4.2%', color: 'text-rose-700 bg-rose-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Award className="w-5 h-5 text-[#07563D]" />
            <span>Performance Ratings & Calibration Analytics</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Rating bell curve distribution, goal/OKR completion rates, and PIP tracking</p>
        </div>
        <Badge variant="emerald">Avg Rating: 4.35 / 5.0</Badge>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <h3 className="text-sm font-black text-gray-900">Performance Calibration Bell Curve Distribution</h3>
        <div className="space-y-3 font-mono text-xs">
          {bellCurve.map((item, idx) => (
            <div key={idx} className={`p-3.5 rounded-xl border border-gray-100 flex items-center justify-between ${item.color}`}>
              <span className="font-sans font-bold">{item.rating}</span>
              <div className="flex items-center gap-3">
                <span className="font-bold">{item.count} Employees</span>
                <Badge variant="emerald">{item.pct}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
