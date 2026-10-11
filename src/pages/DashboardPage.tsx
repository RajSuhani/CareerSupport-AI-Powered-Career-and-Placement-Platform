import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { DashboardSummary } from '../types';
import {
  Briefcase,
  FileText,
  Mic,
  Code2,
  Calendar,
  CheckCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  PlusCircle,
  Sparkles,
  Target,
  ExternalLink,
  Globe,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { RecentActivity } from '../components/dashboard/RecentActivity';
import { MarketResearchModal } from '../components/ai/MarketResearchModal';

interface DashboardPageProps {
  onNavigate: (path: string) => void;
  onOpenAuth: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, onOpenAuth }) => {
  const { user, token } = useAuth();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [researchOpen, setResearchOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async (isBackground = false) => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      if (!isBackground) setLoading(true);
      else setIsRefreshing(true);

      const res = await fetch('/api/dashboard/summary', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error('Failed to load dashboard metrics');
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error fetching dashboard');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard(false);
  }, [token]);

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
          <Briefcase className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white">Sign In to View Your Career Dashboard</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Your dashboard connects live to your resume scans, job applications, mock interview feedback, and DSA progress.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all"
        >
          Sign In or Start Demo
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto py-8 px-4 animate-pulse">
        <div className="h-8 bg-slate-800/60 rounded-lg w-1/4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-32 bg-slate-800/40 rounded-2xl border border-slate-800" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-slate-800/40 rounded-2xl border border-slate-800" />
          <div className="h-72 bg-slate-800/40 rounded-2xl border border-slate-800" />
        </div>
      </div>
    );
  }

  // Chart data for Application Stages
  const stageData = data
    ? [
        { name: 'Saved', count: data.applicationsByStatus.Saved, fill: '#64748b' },
        { name: 'Applied', count: data.applicationsByStatus.Applied, fill: '#3b82f6' },
        { name: 'Assessment', count: data.applicationsByStatus.Assessment, fill: '#06b6d4' },
        { name: 'Interview', count: data.applicationsByStatus.Interview, fill: '#8b5cf6' },
        { name: 'Offer', count: data.applicationsByStatus.Offer, fill: '#10b981' },
        { name: 'Rejected', count: data.applicationsByStatus.Rejected, fill: '#ef4444' },
      ]
    : [];

  const hasAnyRecords = data?.hasData;

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-6 px-4 sm:px-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <span>Welcome, {user.name}</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              {user.targetRole || 'Software Engineer'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time placement pipeline, ATS compliance status, and daily interview prep goals.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setResearchOpen(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-purple-950/60 to-indigo-950/60 hover:from-purple-900/80 hover:to-indigo-900/80 text-purple-200 text-xs font-medium rounded-xl flex items-center gap-1.5 border border-purple-500/40 shadow-sm transition-all"
            title="Search-grounded hiring & salary intelligence with Gemini 3.5 Flash"
          >
            <Globe className="w-3.5 h-3.5 text-purple-400" />
            <span>Market Intel</span>
          </button>
          <button
            onClick={() => onNavigate('/jobs')}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Job</span>
          </button>
          <button
            onClick={() => onNavigate('/resume-analyzer')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl flex items-center gap-1.5 border border-slate-700 transition-all"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            <span>New ATS Scan</span>
          </button>
        </div>
      </div>

      {/* Helpful Onboarding State for Fresh Account */}
      {!hasAnyRecords && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900 border border-indigo-500/30 text-slate-200 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Your Career Pipeline is Ready!</h3>
              <p className="text-xs text-slate-300 mt-0.5 max-w-2xl leading-relaxed">
                As a new member, your dashboard displays zero fabricated numbers. To populate your authentic analytics, start by scanning your first resume against a job description or logging an application in your tracker.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 pt-1">
            <button
              onClick={() => onNavigate('/resume-analyzer')}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition-all"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Upload Resume for AI ATS Scan</span>
            </button>
            <button
              onClick={() => onNavigate('/jobs')}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-all"
            >
              <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
              <span>Track Applied Job</span>
            </button>
            <button
              onClick={() => onNavigate('/practice')}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-all"
            >
              <Code2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Start 25 DSA Problem Checklist</span>
            </button>
          </div>
        </div>
      )}

      {/* 4 Core Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Applications */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Applications
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {data?.totalApplications || 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="text-emerald-400 font-medium">
                {data?.applicationsByStatus.Interview || 0} in interview
              </span>
              <span>•</span>
              <span className="text-indigo-400 font-medium">
                {data?.applicationsByStatus.Offer || 0} offers
              </span>
            </div>
          </div>
        </div>

        {/* Interviews Scheduled */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Interviews Scheduled
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {data?.upcomingInterviewsCount || 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Active rounds & pending assessments
            </div>
          </div>
        </div>

        {/* Latest ATS Score */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Latest ATS Score
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-white tracking-tight flex items-baseline gap-1">
              {data?.latestResume ? (
                <>
                  <span>{data.latestResume.atsScore}</span>
                  <span className="text-sm font-normal text-slate-400">/ 100</span>
                </>
              ) : (
                <span className="text-sm text-slate-500 font-normal">No Scans Yet</span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 truncate">
              {data?.latestResume
                ? `${data.latestResume.identifiedSkills.length} skills matched`
                : 'Upload PDF to measure match'}
            </div>
          </div>
        </div>

        {/* DSA Solved */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              DSA Prep Progress
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Code2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-white tracking-tight flex items-baseline gap-1">
              <span>{data?.dsaStats.solved || 0}</span>
              <span className="text-sm font-normal text-slate-400">
                / {data?.dsaStats.total || 25}
              </span>
            </div>
            <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-400 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${data?.dsaStats.percentage || 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Charts and Preparation Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Applications by Status Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Application Pipeline Breakdown</h3>
              <p className="text-xs text-slate-400">Live counts across hiring funnels</p>
            </div>
            <button
              onClick={() => onNavigate('/jobs')}
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <span>View Kanban</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full pt-2">
            {stageData.some(s => s.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '0.75rem',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {stageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                <Briefcase className="w-8 h-8 text-slate-600" />
                <span>No applications logged yet. Track your first opportunity in Job Tracker!</span>
              </div>
            )}
          </div>
        </div>

        {/* Daily Goals */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-white">Daily Preparation Goals</h3>
              <Target className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-xs text-slate-400">Consistency drives placement success</p>

            <div className="mt-4 space-y-3">
              {data?.dailyGoals.map((goal, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-medium text-slate-200 block">
                      {goal.title}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Target: {goal.target} {goal.target > 1 ? 'items' : ''}
                    </span>
                  </div>
                  {goal.completed ? (
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Done</span>
                    </div>
                  ) : (
                    <div className="text-[11px] font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                      {goal.current} / {goal.target}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
            Keep at least 2 goals completed daily to maintain your placement readiness streak.
          </div>
        </div>
      </div>

      {/* Upcoming Reminders and Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Reminders / Next Follow-ups (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Upcoming Follow-Ups & Reminders</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              {data?.reminders.length || 0} active
            </span>
          </div>

          {data?.reminders && data.reminders.length > 0 ? (
            <div className="space-y-2.5">
              {data.reminders.map(rem => (
                <div
                  key={rem.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between ${
                    rem.isOverdue
                      ? 'bg-rose-950/20 border-rose-500/40 text-rose-200'
                      : 'bg-slate-950/60 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-white flex items-center gap-2">
                      <span>{rem.company}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                        {rem.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <span>Follow-up: {rem.date}</span>
                      {rem.isOverdue && (
                        <span className="text-rose-400 font-semibold">• Overdue</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate('/jobs')}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500 text-xs">
              No pending follow-ups. Set next follow-up dates on your job applications to receive reminders.
            </div>
          )}
        </div>

        {/* Recent Chronological Activity Component (7 cols) */}
        <div className="lg:col-span-7">
          <RecentActivity
            activities={data?.activities || []}
            onNavigate={onNavigate}
            onRefresh={() => fetchDashboard(true)}
            isRefreshing={isRefreshing}
          />
        </div>
      </div>

      {/* Global Market Intelligence Grounding Modal */}
      <MarketResearchModal
        isOpen={researchOpen}
        onClose={() => setResearchOpen(false)}
      />
    </div>
  );
};
