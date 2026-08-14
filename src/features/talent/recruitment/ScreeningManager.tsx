import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { FileCheck2, Sparkles, CheckCircle2, XCircle, Award, SlidersHorizontal, ArrowRight } from 'lucide-react';
import { atsService } from '../../../services/atsService';
import { useToast } from '../../../components/ui/Toast';

export const ScreeningManager: React.FC = () => {
  const { showToast } = useToast();
  const applications = atsService.getApplications();
  const [selectedAppId, setSelectedAppId] = useState(applications[0]?.id || '');

  const selectedApp = applications.find(a => a.id === selectedAppId) || applications[0];

  const handleShortlist = () => {
    if (!selectedApp) return;
    atsService.updateApplicationStage(selectedApp.id, 'Shortlisted');
    showToast(`Candidate ${selectedApp.candidate_name} shortlisted for interviews!`);
  };

  const handleReject = () => {
    if (!selectedApp) return;
    atsService.updateApplicationStage(selectedApp.id, 'Rejected', 'Screening match score below threshold');
    showToast(`Application ${selectedApp.id} rejected.`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-[#07563D]" /> Resume & Candidate Profile Screening Engine
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Automated requirement matching across required skills, experience, location, education, and salary expectations
          </p>
        </div>
        <Badge variant="emerald" size="sm">
          <Sparkles className="w-3.5 h-3.5 mr-1 inline" /> AI Resume Matcher Active
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Applications List Selection */}
        <Card className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs space-y-3 lg:col-span-1">
          <h3 className="text-sm font-extrabold text-gray-900 border-b border-gray-100 pb-2">Screening Queue</h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {applications.map(app => (
              <div
                key={app.id}
                onClick={() => setSelectedAppId(app.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedApp?.id === app.id
                    ? 'border-[#07563D] bg-emerald-50/50 shadow-xs'
                    : 'border-gray-100 hover:border-gray-300 bg-gray-50/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 text-xs">{app.candidate_name}</span>
                  <Badge variant="emerald" size="sm">
                    {app.screening_score}% Match
                  </Badge>
                </div>
                <div className="text-[11px] text-gray-500 mt-1">{app.job_title}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Selected Application Screening Detail */}
        {selectedApp && (
          <Card className="p-6 bg-white rounded-2xl border border-gray-100 shadow-xs space-y-6 lg:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-gray-500">{selectedApp.id}</span>
                <h2 className="text-lg font-extrabold text-gray-900">{selectedApp.candidate_name}</h2>
                <p className="text-xs text-gray-500">Applying for: <span className="font-bold text-gray-800">{selectedApp.job_title}</span></p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleReject}>
                  Reject
                </Button>
                <Button size="sm" onClick={handleShortlist}>
                  Shortlist Candidate
                </Button>
              </div>
            </div>

            {/* Score Breakdown Metrics */}
            <div>
              <h3 className="text-xs font-extrabold uppercase text-gray-500 tracking-wider mb-3">Matching Score Breakdown</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-[#07563D]">
                  <div className="text-[10px] font-bold uppercase">Skill Match</div>
                  <div className="text-xl font-black">{selectedApp.screening_details?.skill_match || 90}%</div>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-blue-900">
                  <div className="text-[10px] font-bold uppercase">Experience</div>
                  <div className="text-xl font-black">{selectedApp.screening_details?.experience_match || 85}%</div>
                </div>
                <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 text-purple-900">
                  <div className="text-[10px] font-bold uppercase">Education</div>
                  <div className="text-xl font-black">{selectedApp.screening_details?.education_match || 100}%</div>
                </div>
                <div className="p-3 rounded-xl bg-teal-50 border border-teal-100 text-teal-900">
                  <div className="text-[10px] font-bold uppercase">Location</div>
                  <div className="text-xl font-black">{selectedApp.screening_details?.location_match || 90}%</div>
                </div>
              </div>
            </div>

            {/* Skills Match Details */}
            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Matched Required Skills:
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedApp.screening_details?.matched_skills || ['React', 'TypeScript']).map((s, idx) => (
                    <Badge key={idx} variant="emerald" size="sm">{s}</Badge>
                  ))}
                </div>
              </div>

              {selectedApp.screening_details?.missing_skills && selectedApp.screening_details.missing_skills.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-500" /> Missing Skills:
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedApp.screening_details.missing_skills.map((s, idx) => (
                      <Badge key={idx} variant="rose" size="sm">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
