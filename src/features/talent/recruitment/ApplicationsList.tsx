import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { FileText, Search, Star, ArrowRight } from 'lucide-react';
import { atsService } from '../../../services/atsService';
import { useToast } from '../../../components/ui/Toast';

export const ApplicationsList: React.FC = () => {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [jobFilter, setJobFilter] = useState('ALL');

  const applications = atsService.getApplications();
  const jobs = atsService.getJobs();

  const filtered = applications.filter(a => {
    const matchesSearch =
      a.candidate_name.toLowerCase().includes(search.toLowerCase()) ||
      a.job_title.toLowerCase().includes(search.toLowerCase()) ||
      a.id.toLowerCase().includes(search.toLowerCase());
    const matchesJob = jobFilter === 'ALL' || a.job_id === jobFilter;
    return matchesSearch && matchesJob;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#07563D]" /> Applications Master Matrix
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Track all candidate-to-job mappings, current stages, screening scores, and hiring recommendations
          </p>
        </div>
      </div>

      <Card className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search candidate name or job..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="w-64">
          <Select
            value={jobFilter}
            onChange={e => setJobFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Jobs' },
              ...jobs.map(j => ({ value: j.id, label: j.job_title })),
            ]}
          />
        </div>
      </Card>

      <Card className="p-6 bg-white rounded-2xl border border-gray-100 shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>App ID</TableHead>
              <TableHead>Candidate</TableHead>
              <TableHead>Applied Job</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Screening Score</TableHead>
              <TableHead>Current Stage</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(app => (
              <TableRow key={app.id}>
                <TableCell className="font-mono text-xs font-bold text-gray-900">{app.id}</TableCell>
                <TableCell>
                  <div className="font-bold text-gray-900 text-sm">{app.candidate_name}</div>
                  <div className="text-xs text-gray-500">{app.candidate_email}</div>
                </TableCell>
                <TableCell>
                  <div className="font-bold text-gray-800 text-xs">{app.job_title}</div>
                  <div className="text-[11px] text-gray-500">{app.department_name}</div>
                </TableCell>
                <TableCell className="text-xs text-gray-700 font-medium">{app.source}</TableCell>
                <TableCell>
                  <div className="text-xs font-extrabold text-emerald-800 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />
                    {app.screening_score}% Match
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={app.current_stage === 'Joined' || app.current_stage === 'Offer Accepted' ? 'emerald' : 'amber'} size="sm">
                    {app.current_stage}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => showToast(`Reviewing application details for ${app.candidate_name}`)}>
                    Review
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
