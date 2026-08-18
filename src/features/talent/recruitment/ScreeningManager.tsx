// src/features/talent/recruitment/ScreeningManager.tsx
import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { FileCheck2, Sparkles, CheckCircle2, XCircle, Award, Star } from 'lucide-react';
import { recruitmentService } from '../../../services/recruitment/recruitmentService';
import { Candidate } from '../../../types/ats';
import { useToast } from '../../../components/ui/Toast';

export const ScreeningManager: React.FC = () => {
  const { showToast } = useToast();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandId, setSelectedCandId] = useState('');

  const load = async () => {
    const list = await recruitmentService.getCandidates();
    const screeningList = list.filter(c => c.current_stage === 'Screening' || c.current_stage === 'New');
    setCandidates(screeningList);
    if (screeningList.length > 0 && !selectedCandId) {
      setSelectedCandId(screeningList[0].id);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selectedCand = candidates.find(c => c.id === selectedCandId) || candidates[0];

  const handleShortlist = async () => {
    if (!selectedCand) return;
    await recruitmentService.updateCandidateStage(selectedCand.id, 'Shortlisted', 'Screened and shortlisted');
    showToast(`Candidate ${selectedCand.display_name || selectedCand.first_name} shortlisted!`);
    load();
  };

  const handleReject = async () => {
    if (!selectedCand) return;
    await recruitmentService.updateCandidateStage(selectedCand.id, 'Rejected', 'Screening match score below threshold');
    showToast(`Candidate rejected.`);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-[#07563D]" /> Resume & Candidate Screening Engine
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Automated requirement matching across required skills, experience, and competencies
          </p>
        </div>
        <Badge variant="emerald" size="sm">
          <Sparkles className="w-3.5 h-3.5 mr-1 inline" /> AI Resume Matcher Active
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs space-y-3 lg:col-span-1">
          <h3 className="text-sm font-extrabold text-gray-900 border-b border-gray-100 pb-2">Screening Queue ({candidates.length})</h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {candidates.map(c => (
              <div
                key={c.id}
                onClick={() => setSelectedCandId(c.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedCand?.id === c.id
                    ? 'border-[#07563D] bg-emerald-50/50 shadow-xs'
                    : 'border-gray-100 hover:border-gray-300 bg-gray-50/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 text-xs">{c.display_name || `${c.first_name} ${c.last_name}`}</span>
                  <Badge variant="emerald" size="sm" className="text-[10px]">
                    {c.match_score || 85}% Match
                  </Badge>
                </div>
                <div className="text-[11px] text-gray-500 mt-1">{c.applied_job_title}</div>
              </div>
            ))}
          </div>
        </Card>

        {selectedCand ? (
          <Card className="p-6 bg-white rounded-2xl border border-gray-100 shadow-xs space-y-5 lg:col-span-2">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-black text-gray-900">{selectedCand.display_name || `${selectedCand.first_name} ${selectedCand.last_name}`}</h2>
                <p className="text-xs text-gray-500">{selectedCand.email} • {selectedCand.current_company}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="danger" size="sm" onClick={handleReject}>
                  <XCircle className="w-4 h-4 mr-1" /> Reject
                </Button>
                <Button variant="primary" size="sm" onClick={handleShortlist} className="bg-[#07563D]">
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Shortlist Candidate
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-700 uppercase">Extracted Candidate Skills</h4>
              <div className="flex flex-wrap gap-1.5">
                {(selectedCand.skills || []).map((s, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-lg bg-emerald-50 text-[#07563D] border border-emerald-200 text-xs font-mono">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        ) : (
          <div className="p-12 text-center text-xs text-gray-400 lg:col-span-2">No candidate selected</div>
        )}
      </div>
    </div>
  );
};
