// src/features/talent/recruitment/ShortlistedManager.tsx
import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { Star, Calendar, Mail, Phone, ExternalLink } from 'lucide-react';
import { recruitmentService } from '../../../services/recruitment/recruitmentService';
import { Candidate } from '../../../types/ats';
import { useToast } from '../../../components/ui/Toast';

export const ShortlistedManager: React.FC = () => {
  const { showToast } = useToast();
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  useEffect(() => {
    recruitmentService.getCandidates().then(list => {
      setCandidates(list.filter(c => c.current_stage === 'Shortlisted'));
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" /> Shortlisted Talent Bench ({candidates.length})
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Pre-screened candidates ready for technical rounds and hiring manager evaluations
          </p>
        </div>
      </div>

      <Card className="p-6 bg-white rounded-2xl border border-gray-100 shadow-xs">
        {candidates.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-400">No candidates in Shortlisted stage.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Target Job</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Match Score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.map(c => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="font-bold text-gray-900 text-sm">{c.display_name || `${c.first_name} ${c.last_name}`}</div>
                    <div className="text-xs text-gray-500">{c.email}</div>
                  </TableCell>
                  <TableCell className="text-xs text-gray-800 font-semibold">{c.applied_job_title}</TableCell>
                  <TableCell className="text-xs text-gray-600 font-mono">{c.total_experience_years || 4} yrs</TableCell>
                  <TableCell>
                    <Badge variant="emerald" size="sm">
                      {c.match_score || 85}% Match
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => showToast(`Opening schedule flow for ${c.first_name}`)}>
                      <Calendar className="w-3.5 h-3.5 mr-1" /> Schedule Round
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
};
