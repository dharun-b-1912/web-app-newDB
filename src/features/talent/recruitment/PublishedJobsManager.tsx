// src/features/talent/recruitment/PublishedJobsManager.tsx
import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { Globe, Share2, CheckCircle2, PauseCircle, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import { atsService } from '../../../services/atsService';
import { PublishingDestination, PublishingStatus } from '../../../types/ats';
import { useToast } from '../../../components/ui/Toast';

export const PublishedJobsManager: React.FC = () => {
  const { showToast } = useToast();
  const jobs = atsService.getJobs();
  const [selectedJobId, setSelectedJobId] = useState(jobs[0]?.id || '');

  const currentJob = jobs.find(j => j.id === selectedJobId) || jobs[0];

  const handleTogglePublish = (destination: PublishingDestination, currentStatus: PublishingStatus) => {
    if (!currentJob) return;
    const nextPublish = currentStatus !== 'Published';
    atsService.toggleJobPublication(currentJob.id, destination, nextPublish);
    showToast(`Updated ${destination} status for Job ${currentJob.id}`);
  };

  const destinationsList: PublishingDestination[] = [
    'Career Portal',
    'LinkedIn',
    'Indeed',
    'Naukri',
    'Employee Referral',
    'Recruitment Vendor',
    'Direct Link',
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#07563D]" /> Multi-Channel Job Publishing Hub
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Distribute job openings to Career Portal, LinkedIn, Indeed, Naukri, and Employee Referrals
          </p>
        </div>
      </div>

      <Card className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between gap-4">
        <div className="w-80">
          <label className="font-bold text-gray-700 text-xs block mb-1">Select Job Opening to Publish:</label>
          <Select
            value={selectedJobId}
            onChange={e => setSelectedJobId(e.target.value)}
            options={jobs.map(j => ({
              value: j.id,
              label: `${j.id} - ${j.job_title} (${j.work_mode || 'Hybrid'})`,
            }))}
          />
        </div>
      </Card>

      <Card className="p-6 bg-white rounded-2xl border border-gray-100 shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Channel Destination</TableHead>
              <TableHead>Channel Type</TableHead>
              <TableHead>Current Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {destinationsList.map((dest, idx) => {
              const pub = currentJob?.publications?.find(p => p.destination === dest);
              const status: PublishingStatus = pub ? pub.status : 'Not Published';
              const isPublished = status === 'Published';
              return (
                <TableRow key={idx}>
                  <TableCell className="font-bold text-gray-900 text-sm">{dest}</TableCell>
                  <TableCell className="text-xs text-gray-500 font-mono">External Integration</TableCell>
                  <TableCell>
                    <Badge variant={isPublished ? 'emerald' : 'gray'} size="sm">
                      {status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant={isPublished ? 'outline' : 'primary'}
                      size="sm"
                      onClick={() => handleTogglePublish(dest, status)}
                    >
                      {isPublished ? 'Unpublish' : 'Publish Live'}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
