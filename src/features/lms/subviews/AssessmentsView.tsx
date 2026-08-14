import React, { useState } from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Award, Plus, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const AssessmentsView: React.FC = () => {
  const { showToast } = useToast();

  const assessments = [
    { id: 'ass-101', title: 'POSH Act Annual Certification Exam 2026', course: 'POSH Policy 2026', type: 'FinalAssessment', questions: 20, passScore: 80, attemptsAllowed: 3, status: 'Published' },
    { id: 'ass-102', title: 'InfoSec & Data Privacy Compliance Quiz', course: 'Information Security Masterclass', type: 'Quiz', questions: 15, passScore: 80, attemptsAllowed: 3, status: 'Published' },
    { id: 'ass-103', title: 'GCP Kubernetes Architecture Practical Exam', course: 'Microservices Architecture', type: 'Exam', questions: 10, passScore: 85, attemptsAllowed: 2, status: 'Published' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Award className="w-5 h-5 text-[#07563D]" />
            <span>Assessments, Question Banks & Exam Center</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Secure server-side exam calculation, pass thresholds, and retake controls</p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Create Assessment modal opened')}>
          Create Assessment
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {assessments.map(ass => (
          <div key={ass.id} className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#07563D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  Type: {ass.type}
                </span>
                <h3 className="text-base font-extrabold text-gray-900 mt-1">{ass.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Course: {ass.course}</p>
              </div>
              <Badge variant="emerald">{ass.status}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-xl bg-gray-50 border border-gray-100 text-center font-mono">
              <div>
                <span className="text-gray-400 font-bold uppercase text-[10px] block font-sans">Pass Threshold</span>
                <span className="font-bold text-gray-900">{ass.passScore}%</span>
              </div>
              <div>
                <span className="text-gray-400 font-bold uppercase text-[10px] block font-sans">Retake Limit</span>
                <span className="font-bold text-gray-900">{ass.attemptsAllowed} Attempts</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-500 pt-2 border-t border-gray-100 font-medium">
              <span>{ass.questions} Questions</span>
              <Button size="sm" variant="outline" leftIcon={<ShieldCheck className="w-3.5 h-3.5" />} onClick={() => showToast(`Taking assessment ${ass.title}`)}>
                Take Assessment
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
