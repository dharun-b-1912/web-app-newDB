// src/features/talent/recruitment/TalentPoolManager.tsx
// ============================================================================
// Joy PeopleHR — Talent Pools & Sourced Candidate Repository
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Users, Plus, Tag, Sparkles, Folder, ArrowRight } from 'lucide-react';
import { TalentPool } from '../../../types/ats';
import { recruitmentService } from '../../../services/recruitment/recruitmentService';

export const TalentPoolManager: React.FC = () => {
  const [pools, setPools] = useState<TalentPool[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    recruitmentService.getTalentPools().then(res => {
      setPools(res);
      setIsLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-gray-900">Enterprise Talent Pools</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Organize passive prospects, silver medalists, and specialized skill clusters.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pools.map(pool => (
          <Card key={pool.id} className="p-5 rounded-3xl border-gray-200/80 shadow-2xs space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-[#07563D] flex items-center justify-center font-bold text-xs">
                <Folder className="w-4 h-4" />
              </div>
              <Badge variant="emerald" size="sm" className="text-[10px]">
                {pool.category}
              </Badge>
            </div>

            <div>
              <h4 className="text-sm font-bold text-gray-900">{pool.name}</h4>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{pool.description}</p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-gray-100">
              {pool.tags.map((t, idx) => (
                <span key={idx} className="text-[10px] px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600 font-mono">
                  #{t}
                </span>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
