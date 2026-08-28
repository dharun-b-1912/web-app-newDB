import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';
import {
  HeartHandshake,
  Plus,
  BarChart3,
  Calendar,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Send,
  X,
  Sparkles,
} from 'lucide-react';
import { SurveyModel, SurveyQuestion, SurveyActionPlan } from '../../types/employeeRelations';
import { employeeRelationsService } from '../../services/employeeRelationsService';

export const EngagementSurveysView: React.FC = () => {
  const { showToast } = useToast();
  const [surveys, setSurveys] = useState<SurveyModel[]>(() => employeeRelationsService.getSurveys());
  const [activeTab, setActiveTab] = useState<'ALL' | 'LIVE' | 'ACTION_PLANS'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyModel | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'PULSE' | 'ENGAGEMENT' | 'ONBOARDING' | 'EXIT' | 'MANAGER' | 'TRAINING'>('PULSE');
  const [targetAudience, setTargetAudience] = useState('All Employees');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [startDate, setStartDate] = useState('2026-09-01');
  const [endDate, setEndDate] = useState('2026-09-15');
  const [questionText, setQuestionText] = useState('How satisfied are you with leadership communication this quarter?');

  const refreshData = () => {
    setSurveys(employeeRelationsService.getSurveys());
  };

  useEffect(() => {
    const handleUpdate = () => refreshData();
    window.addEventListener('er:surveys_updated', handleUpdate);
    return () => window.removeEventListener('er:surveys_updated', handleUpdate);
  }, []);

  const handleCreateSurvey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Please provide a survey title');
      return;
    }

    employeeRelationsService.saveSurvey({
      title,
      description,
      category,
      target_audience: targetAudience,
      start_date: startDate,
      end_date: endDate,
      is_anonymous: isAnonymous,
      min_response_threshold: 5,
      status: 'LIVE',
      questions: [
        {
          id: `q-${Date.now()}-1`,
          prompt: questionText,
          type: 'RATING',
          is_required: true,
        },
      ],
      responses_count: 0,
      participation_rate_pct: 0,
      average_score: 0,
      action_plans: [],
    });

    showToast('Survey published and notification broadcasted to audience!');
    setIsModalOpen(false);
    setTitle('');
    setDescription('');
    refreshData();
  };

  const handleAddActionPlan = (surveyId: string) => {
    const s = surveys.find(item => item.id === surveyId);
    if (!s) return;

    const newPlan: SurveyActionPlan = {
      id: `ap-${Date.now()}`,
      issue_identified: 'Department communication gap during sprint handoffs',
      action_title: 'Implement bi-weekly leadership AMA sessions',
      owner_name: 'Haripriya (HR Head)',
      due_date: '2026-09-30',
      status: 'IN_PROGRESS',
      completion_pct: 40,
    };

    s.action_plans.push(newPlan);
    employeeRelationsService.saveSurvey(s);
    showToast('Operational Action Plan created from survey findings!');
    refreshData();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-600">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Employee Engagement & Sentiment Surveys</h2>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                <span>Continuous Sentiment Pulse</span>
                <span>•</span>
                <span className="text-emerald-700 font-medium">Privacy-Protected & Anonymous Thresholds</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 max-w-3xl">
            Create organizational pulse surveys, onboarding reviews, and exit feedback. Turn employee sentiments directly into operational action plans.
          </p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
          + Create Survey
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Active Live Surveys</div>
          <div className="text-2xl font-black text-gray-900 mt-0.5">
            {surveys.filter(s => s.status === 'LIVE').length} Surveys
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Accepting employee responses</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Organizational NPS Score</div>
          <div className="text-2xl font-black text-[#07563D] mt-0.5">+48 eNPS</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Benchmark: +35 Industry Average</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Survey Action Plans</div>
          <div className="text-2xl font-black text-blue-700 mt-0.5">
            {surveys.reduce((acc, s) => acc + s.action_plans.length, 0)} Active Plans
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">Closing employee feedback loops</div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'ALL' ? 'bg-[#07563D] text-white shadow-2xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          All Surveys ({surveys.length})
        </button>
        <button
          onClick={() => setActiveTab('LIVE')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'LIVE' ? 'bg-[#07563D] text-white shadow-2xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Active Live Surveys
        </button>
        <button
          onClick={() => setActiveTab('ACTION_PLANS')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'ACTION_PLANS' ? 'bg-[#07563D] text-white shadow-2xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Survey Action Plans
        </button>
      </div>

      {/* Surveys Table */}
      <Card className="p-5 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/60">
              <TableHead className="font-bold text-xs text-gray-700">Survey Title & Category</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Target Audience</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Dates</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Participation</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Privacy Mode</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Status</TableHead>
              <TableHead className="font-bold text-xs text-gray-700 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {surveys.map(s => (
              <TableRow key={s.id} className="hover:bg-gray-50/60 transition-colors">
                <TableCell>
                  <div className="font-bold text-xs text-gray-900">{s.title}</div>
                  <div className="text-[10px] text-gray-500">{s.description || 'Employee pulse check'}</div>
                </TableCell>
                <TableCell>
                  <div className="text-xs font-semibold text-gray-800">{s.target_audience}</div>
                </TableCell>
                <TableCell>
                  <div className="text-xs font-medium text-gray-700">
                    {s.start_date} → {s.end_date}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-xs font-bold text-gray-900">{s.responses_count} Responses</div>
                  <div className="text-[10px] text-emerald-600 font-semibold">{s.participation_rate_pct}% Rate</div>
                </TableCell>
                <TableCell>
                  <Badge variant={s.is_anonymous ? 'purple' : 'gray'} size="sm">
                    {s.is_anonymous ? 'Anonymous' : 'Identified'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={s.status === 'LIVE' ? 'emerald' : 'gray'} size="sm">
                    {s.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                    onClick={() => handleAddActionPlan(s.id)}
                  >
                    + Action Plan
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {surveys.length === 0 && (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center mx-auto border border-pink-100">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-gray-900">No Engagement Surveys Created Yet</h4>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Launch pulse surveys to capture real employee feedback across teams, departments, or shifts.
            </p>
            <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
              Create First Survey
            </Button>
          </div>
        )}
      </Card>

      {/* Create Survey Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-200 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Create Engagement & Pulse Survey</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSurvey} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Survey Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Q3 Organization Sentiment & Culture Pulse"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium bg-white"
                  >
                    <option value="PULSE">Pulse Survey</option>
                    <option value="ENGAGEMENT">Annual Engagement</option>
                    <option value="ONBOARDING">New Hire Onboarding</option>
                    <option value="EXIT">Exit Survey</option>
                    <option value="MANAGER">Manager 360 Feedback</option>
                    <option value="TRAINING">Training Feedback</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Target Audience</label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={e => setTargetAudience(e.target.value)}
                    placeholder="e.g. All Employees / Engineering"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Key Rating Question</label>
                <input
                  type="text"
                  value={questionText}
                  onChange={e => setQuestionText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                  required
                />
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-gray-900 block">Anonymous Responses</span>
                  <span className="text-[10px] text-gray-500">
                    Enforce minimum 5 responses threshold to prevent re-identification.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={e => setIsAnonymous(e.target.checked)}
                  className="rounded text-[#07563D] w-4 h-4"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit">
                  Publish Survey
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
