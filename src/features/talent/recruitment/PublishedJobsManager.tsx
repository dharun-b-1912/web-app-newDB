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
    const nextStatus: PublishingStatus = currentStatus === 'Published' ? 'Paused' : 'Published';
    atsService.publishJobToDestination(currentJob.id, destination, nextStatus);
    showToast(`Updated ${destination} status to ${nextStatus} for Job ${currentJob.id}`);
  };

  const destinationsList: PublishingDestination[] = [
    'WorkForceOS Job Portal',
    'College Portal',
    'External Job Boards',
    'Employee Referral',
    'Recruitment Vendor',
    'Direct Application Link',
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#07563D]" /> Multi-Channel Job Publishing Hub
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Distribute job openings to Public Job Portal, Campus drives, LinkedIn, Vendors, and Referrals
          </p>
        </div>
      </div>

      {/* Select Job Selector */}
      <Card className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between gap-4">
        <div className="w-80">
          <label className="font-bold text-gray-700 text-xs block mb-1">Select Job Opening to Publish:</label>
          <Select
            value={selectedJobId}
            onChange={e => setSelectedJobId(e.target.value)}
            options={jobs.map(j => ({
              value: j.id,
              label: `${j.id} - ${j.job_title} (${j.work_mode})`,
            }))}
          />
        </div>
        {currentJob && (
          <div className="text-right">
            <Badge variant="emerald" size="sm">
              Status: {currentJob.status}
            </Badge>
            <p className="text-xs text-gray-500 mt-1">Openings: {currentJob.number_of_openings}</p>
          </div>
        )}
      </Card>

      {/* Publishing Destination Matrix */}
      {currentJob && (
        <Card className="p-6 bg-white rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[#07563D]" /> Publishing Channels Status for {currentJob.job_title}
          </h3>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Publishing Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>External Ref / Sync ID</TableHead>
                <TableHead>Published Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {destinationsList.map(dest => {
                const pub = currentJob.publications.find(p => p.destination === dest);
                const status = pub?.status || 'Not Published';

                return (
                  <TableRow key={dest}>
                    <TableCell className="font-bold text-gray-900 text-sm">{dest}</TableCell>
                    <TableCell>
                      <Badge
                        variant={status === 'Published' ? 'emerald' : status === 'Paused' ? 'amber' : 'neutral'}
                        size="sm"
                      >
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-gray-600">
                      {pub?.external_job_id || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {pub?.published_at ? new Date(pub.published_at).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant={status === 'Published' ? 'outline' : 'primary'}
                        onClick={() => handleTogglePublish(dest, status)}
                      >
                        {status === 'Published' ? 'Pause Posting' : 'Publish Now'}
                      </Button>
                      {status === 'Published' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
                          onClick={() => showToast(`Opening public preview link for ${dest}`)}
                        >
                          Link
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};
