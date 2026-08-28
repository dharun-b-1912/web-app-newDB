import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import {
  BookOpen,
  Search,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
  Send,
  HelpCircle,
  Clock,
  Sparkles,
  FileText,
  Building2,
  Calendar,
  DollarSign,
  Coffee,
} from 'lucide-react';
import { KnowledgeArticle } from '../../types/employeeRelations';
import { employeeRelationsService } from '../../services/employeeRelationsService';

interface KnowledgeCentreViewProps {
  onNavigateToHelpdesk?: () => void;
}

export const KnowledgeCentreView: React.FC<KnowledgeCentreViewProps> = ({ onNavigateToHelpdesk }) => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [articles, setArticles] = useState<KnowledgeArticle[]>(() =>
    employeeRelationsService.getKnowledgeArticles()
  );
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);

  const refreshData = () => {
    setArticles(employeeRelationsService.getKnowledgeArticles(searchQuery, selectedCategory));
  };

  useEffect(() => {
    refreshData();
  }, [searchQuery, selectedCategory]);

  const handleVote = (articleId: string, isHelpful: boolean) => {
    employeeRelationsService.voteKnowledgeArticle(articleId, isHelpful);
    showToast(isHelpful ? 'Thank you for your helpful feedback!' : 'Feedback noted. We will improve this article.');
    refreshData();
    if (selectedArticle && selectedArticle.id === articleId) {
      setSelectedArticle({
        ...selectedArticle,
        helpful_votes: isHelpful ? selectedArticle.helpful_votes + 1 : selectedArticle.helpful_votes,
        unhelpful_votes: !isHelpful ? selectedArticle.unhelpful_votes + 1 : selectedArticle.unhelpful_votes,
      });
    }
  };

  const categories = [
    { id: 'ALL', label: 'All Knowledge' },
    { id: 'LEAVE', label: 'Leave & Holidays' },
    { id: 'ATTENDANCE', label: 'Attendance & Clocking' },
    { id: 'PAYROLL', label: 'Payroll & Taxes' },
    { id: 'BENEFITS', label: 'Health & Insurance' },
    { id: 'POLICIES', label: 'Company SOPs' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">HR Knowledge Base & Self-Service Centre</h2>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                <span>Instant HR Solutions & Policy Guides</span>
                <span>•</span>
                <span className="text-indigo-700 font-medium">Deflect Repetitive Tickets</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 max-w-3xl">
            Search company policies, standard operating procedures, tax exemptions, and leave encashment guidelines before raising a support ticket.
          </p>
        </div>
      </div>

      {/* Hero Search Bar */}
      <div className="p-6 bg-gradient-to-r from-[#07563D] to-[#0a6649] rounded-3xl text-white shadow-lg space-y-4">
        <div className="max-w-xl mx-auto text-center space-y-1">
          <h3 className="text-lg font-black tracking-tight">How can HR operations assist you today?</h3>
          <p className="text-xs text-emerald-100/80">Search articles, leave rules, biometric procedures, and payroll FAQs</p>
        </div>

        <div className="relative max-w-xl mx-auto">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Type your question (e.g. How to encash leave, missed biometric punch, tax proof)..."
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white text-gray-900 text-xs font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map(c => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              selectedCategory === c.id
                ? 'bg-[#07563D] text-white shadow-2xs'
                : 'text-gray-600 bg-white border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Article Grid or Detail View */}
      {selectedArticle ? (
        <Card className="p-6 bg-white rounded-3xl border border-gray-200/80 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <button
              onClick={() => setSelectedArticle(null)}
              className="text-xs font-bold text-[#07563D] hover:underline flex items-center gap-1 cursor-pointer"
            >
              ← Back to all articles
            </button>
            <Badge variant="blue" size="sm">
              Version {selectedArticle.version}.0
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
              {selectedArticle.category} • Effective from {selectedArticle.effective_date}
            </div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">{selectedArticle.title}</h1>
            <p className="text-xs text-gray-500 font-medium">{selectedArticle.summary}</p>
          </div>

          <div className="p-5 bg-gray-50/80 rounded-2xl border border-gray-200 text-xs text-gray-800 leading-relaxed space-y-4">
            <p>{selectedArticle.content}</p>
          </div>

          {/* Feedback & Voting */}
          <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-bold text-gray-900">Was this article helpful to you?</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-emerald-200 text-emerald-800 hover:bg-emerald-100/50"
                leftIcon={<ThumbsUp className="w-3.5 h-3.5" />}
                onClick={() => handleVote(selectedArticle.id, true)}
              >
                Yes ({selectedArticle.helpful_votes})
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-gray-200 text-gray-600 hover:bg-gray-100"
                leftIcon={<ThumbsDown className="w-3.5 h-3.5" />}
                onClick={() => handleVote(selectedArticle.id, false)}
              >
                No ({selectedArticle.unhelpful_votes})
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {articles.map(a => (
            <Card
              key={a.id}
              onClick={() => setSelectedArticle(a)}
              className="p-5 bg-white rounded-2xl border border-gray-200/80 shadow-2xs hover:border-[#07563D]/40 transition-all cursor-pointer space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" size="xs">
                    {a.category}
                  </Badge>
                  <span className="text-[10px] text-gray-400">{a.view_count} reads</span>
                </div>
                <h3 className="font-bold text-sm text-gray-900 line-clamp-1">{a.title}</h3>
                <p className="text-xs text-gray-500 line-clamp-2">{a.summary}</p>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-[#07563D] font-bold">
                <span>Read Guide</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* "Didn't find what you need?" Ticket Converter */}
      <div className="p-6 bg-white rounded-3xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-teal-700" />
            <h4 className="text-sm font-bold text-gray-900">Didn't find what you were looking for?</h4>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Submit a direct query to the HR Operations team and receive auto-routed support within 24 hours.
          </p>
        </div>

        <Button
          size="sm"
          className="bg-teal-700 hover:bg-teal-800 text-white shrink-0"
          leftIcon={<Send className="w-4 h-4" />}
          onClick={onNavigateToHelpdesk}
        >
          Create HR Request
        </Button>
      </div>
    </div>
  );
};
