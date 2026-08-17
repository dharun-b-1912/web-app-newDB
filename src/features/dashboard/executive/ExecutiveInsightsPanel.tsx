import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Sparkles, TrendingUp, AlertTriangle, Info, ArrowUpRight } from 'lucide-react';
import { ExecutiveInsightItem } from '../../../services/executiveAnalyticsService';

interface Props {
  insights: ExecutiveInsightItem[];
  onNavigate: (route: string) => void;
}

export const ExecutiveInsightsPanel: React.FC<Props> = ({ insights, onNavigate }) => {
  return (
    <Card className="p-5 border border-purple-100 bg-gradient-to-br from-purple-50/40 via-white to-indigo-50/20 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-black text-gray-900 tracking-tight">
              Executive People Insights
            </h2>
            <p className="text-[11px] text-gray-500 font-medium">
              Key strategic findings synthesized directly from live workforce records
            </p>
          </div>
        </div>

        <span className="text-[10px] font-bold text-purple-700 bg-purple-100/60 px-2.5 py-1 rounded-full">
          Leadership Digest
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
        {insights.length === 0 ? (
          <div className="col-span-full py-4 text-center text-xs text-gray-400 italic">
            Not enough historical data to generate workforce trend insights.
          </div>
        ) : (
          insights.map((item) => {
            const isWarning = item.type === 'warning';
            const isPositive = item.type === 'positive';
            const isStrategic = item.type === 'strategic';

            return (
              <div
                key={item.id}
                className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all ${
                  isWarning
                    ? 'bg-amber-50/50 border-amber-200 text-amber-900'
                    : isPositive
                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                    : isStrategic
                    ? 'bg-blue-50/50 border-blue-200 text-blue-900'
                    : 'bg-gray-50/50 border-gray-200 text-gray-800'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    {isWarning && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />}
                    {isPositive && <TrendingUp className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />}
                    {isStrategic && <Info className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />}
                    <span className="truncate">{item.title}</span>
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};
