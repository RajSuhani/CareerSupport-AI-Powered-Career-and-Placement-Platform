import React, { useState } from 'react';
import { UserActivity } from '../../types';
import {
  FileText,
  Briefcase,
  Mic,
  Code2,
  Clock,
  Sparkles,
  ArrowRight,
  Filter,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';

interface RecentActivityProps {
  activities: UserActivity[];
  onNavigate?: (path: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({
  activities,
  onNavigate,
  onRefresh,
  isRefreshing,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'resume' | 'job' | 'interview' | 'dsa'>('all');

  // Helper for relative time
  const getRelativeTime = (timestamp: string): string => {
    try {
      const now = new Date().getTime();
      const time = new Date(timestamp).getTime();
      const diffSecs = Math.floor((now - time) / 1000);

      if (diffSecs < 60) return 'Just now';
      if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
      if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
      const days = Math.floor(diffSecs / 86400);
      if (days === 1) return 'Yesterday';
      if (days < 7) return `${days}d ago`;
      return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  const filteredActivities = activities.filter(act => {
    if (filterType === 'all') return true;
    return act.type === filterType;
  });

  const getActivityConfig = (act: UserActivity) => {
    switch (act.type) {
      case 'resume':
        return {
          icon: FileText,
          iconColor: 'text-indigo-400',
          bgBadge: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
          path: '/resume-analyzer',
          label: 'Resume Analysis',
        };
      case 'job':
        return {
          icon: Briefcase,
          iconColor: 'text-cyan-400',
          bgBadge: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
          path: '/jobs',
          label: 'Application Pipeline',
        };
      case 'interview':
        return {
          icon: Mic,
          iconColor: 'text-purple-400',
          bgBadge: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
          path: '/interviews',
          label: 'Mock Interview',
        };
      case 'dsa':
        return {
          icon: Code2,
          iconColor: 'text-amber-400',
          bgBadge: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
          path: '/practice',
          label: 'Algorithm Practice',
        };
      default:
        return {
          icon: Sparkles,
          iconColor: 'text-slate-400',
          bgBadge: 'bg-slate-800 text-slate-300',
          path: '/dashboard',
          label: 'Platform Action',
        };
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-5">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <span>Recent Chronological Activity</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit log of resume uploads, status changes, and interview sessions
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-all disabled:opacity-50"
              title="Refresh Activity Log"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          )}

          {/* Quick Filter Tabs */}
          <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800/80 text-[11px]">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('job')}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                filterType === 'job'
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Jobs
            </button>
            <button
              onClick={() => setFilterType('resume')}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                filterType === 'resume'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Resumes
            </button>
            <button
              onClick={() => setFilterType('interview')}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                filterType === 'interview'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Interviews
            </button>
            <button
              onClick={() => setFilterType('dsa')}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                filterType === 'dsa'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              DSA
            </button>
          </div>
        </div>
      </div>

      {/* Activity Timeline List */}
      {filteredActivities.length > 0 ? (
        <div className="space-y-3 relative before:absolute before:inset-y-2 before:left-[19px] before:w-[2px] before:bg-slate-800">
          {filteredActivities.map((act) => {
            const config = getActivityConfig(act);
            const Icon = config.icon;

            return (
              <div
                key={act.id}
                onClick={() => onNavigate && onNavigate(config.path)}
                className="group relative flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-all"
              >
                {/* Timeline Node Icon */}
                <div
                  className={`relative z-10 w-8 h-8 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform ${config.iconColor}`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {/* Content details */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {act.title}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${config.bgBadge}`}
                      >
                        {config.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                      <Clock className="w-3 h-3" />
                      <span>{getRelativeTime(act.timestamp)}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed break-words">
                    {act.description}
                  </p>

                  <div className="pt-0.5 flex items-center justify-between text-[11px]">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(act.timestamp).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}{' '}
                      •{' '}
                      {new Date(act.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

                    <span className="text-[11px] font-medium text-indigo-400 group-hover:translate-x-1 flex items-center gap-0.5 transition-transform opacity-0 group-hover:opacity-100">
                      <span>View details</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="py-12 rounded-xl border border-dashed border-slate-800 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-500 mx-auto">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-300">No activities in this filter</p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-0.5">
              Actions like uploading a resume, moving job pipeline stages, or completing mock interviews will be recorded here chronologically.
            </p>
          </div>
          {filterType !== 'all' && (
            <button
              onClick={() => setFilterType('all')}
              className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium"
            >
              Reset filter to show all
            </button>
          )}
        </div>
      )}
    </div>
  );
};
