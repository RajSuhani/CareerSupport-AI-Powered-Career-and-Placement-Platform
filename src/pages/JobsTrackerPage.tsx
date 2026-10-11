import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { JobApplication, JobStatus } from '../types';
import confetti from 'canvas-confetti';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  MapPin,
  ExternalLink,
  Edit2,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Kanban,
  Table as TableIcon,
  X,
  Sparkles,
  Globe,
} from 'lucide-react';
import { MarketResearchModal } from '../components/ai/MarketResearchModal';

const KANBAN_COLUMNS: { status: JobStatus; title: string; color: string; badgeBg: string }[] = [
  { status: 'Saved', title: 'Saved', color: 'border-slate-600', badgeBg: 'bg-slate-700/60 text-slate-300' },
  { status: 'Applied', title: 'Applied', color: 'border-blue-500/50', badgeBg: 'bg-blue-500/20 text-blue-300' },
  { status: 'Assessment', title: 'OA / Screen', color: 'border-cyan-500/50', badgeBg: 'bg-cyan-500/20 text-cyan-300' },
  { status: 'Interview', title: 'Interviewing', color: 'border-purple-500/50', badgeBg: 'bg-purple-500/20 text-purple-300' },
  { status: 'Offer', title: 'Offer Received', color: 'border-emerald-500/50', badgeBg: 'bg-emerald-500/20 text-emerald-300' },
  { status: 'Rejected', title: 'Archived / Rejected', color: 'border-rose-500/40', badgeBg: 'bg-rose-500/20 text-rose-300' },
];

export const JobsTrackerPage: React.FC = () => {
  const { token } = useAuth();
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  // Filters & search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date_desc');

  // Stats
  const [stats, setStats] = useState<any>(null);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobApplication | null>(null);
  const [jobToDelete, setJobToDelete] = useState<JobApplication | null>(null);
  const [researchModalOpen, setResearchModalOpen] = useState(false);
  const [researchQuery, setResearchQuery] = useState('');

  const openResearch = (queryText: string) => {
    setResearchQuery(queryText);
    setResearchModalOpen(true);
  };

  // Form states
  const [formCompany, setFormCompany] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formLocation, setFormLocation] = useState('Remote / Hybrid');
  const [formPostingUrl, setFormPostingUrl] = useState('');
  const [formStatus, setFormStatus] = useState<JobStatus>('Applied');
  const [formApplicationDate, setFormApplicationDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formSalary, setFormSalary] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formFollowUpDate, setFormFollowUpDate] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch jobs
  const fetchJobs = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (search) query.append('search', search);
      if (statusFilter !== 'all') query.append('status', statusFilter);
      if (sortBy) query.append('sort', sortBy);
      query.append('limit', '100');

      const res = await fetch(`/api/jobs?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }

      // Fetch stats
      const statsRes = await fetch('/api/jobs/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [token, search, statusFilter, sortBy]);

  const openCreateModal = () => {
    setEditingJob(null);
    setFormCompany('');
    setFormRole('');
    setFormLocation('Remote / Hybrid');
    setFormPostingUrl('');
    setFormStatus('Applied');
    setFormApplicationDate(new Date().toISOString().split('T')[0]);
    setFormSalary('');
    setFormNotes('');
    setFormFollowUpDate('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (job: JobApplication) => {
    setEditingJob(job);
    setFormCompany(job.company);
    setFormRole(job.role);
    setFormLocation(job.location);
    setFormPostingUrl(job.postingUrl || '');
    setFormStatus(job.status);
    setFormApplicationDate(job.applicationDate);
    setFormSalary(job.salary || '');
    setFormNotes(job.notes || '');
    setFormFollowUpDate(job.followUpDate || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setFormError(null);
    setIsSubmitting(true);

    const payload = {
      company: formCompany,
      role: formRole,
      location: formLocation,
      postingUrl: formPostingUrl,
      status: formStatus,
      applicationDate: formApplicationDate,
      salary: formSalary,
      notes: formNotes,
      followUpDate: formFollowUpDate,
    };

    try {
      if (editingJob) {
        const res = await fetch(`/api/jobs/${editingJob.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to update job');
        }
        if (formStatus === 'Offer' && editingJob.status !== 'Offer') {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
      } else {
        const res = await fetch('/api/jobs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to create job');
        }
        if (formStatus === 'Offer') {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
      }
      setIsModalOpen(false);
      fetchJobs();
    } catch (err: any) {
      setFormError(err.message || 'Error saving job');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (jobId: string, newStatus: JobStatus) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        if (newStatus === 'Offer') {
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        }
        fetchJobs();
      }
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  const handleDeleteJob = async () => {
    if (!token || !jobToDelete) return;
    try {
      const res = await fetch(`/api/jobs/${jobToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setJobToDelete(null);
        fetchJobs();
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleExportCsv = () => {
    if (!token) return;
    window.location.href = `/api/jobs/export/csv?token=${token}`;
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6 px-4 sm:px-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <span>Job Application Tracker</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              CRUD & Kanban
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Organize recruitment pipelines, monitor follow-up dates, track interview rounds, and export sanitized reports.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => openResearch('Software Engineer entry-level 2026 hiring trends, compensation, and interview loops')}
            className="px-3.5 py-2 bg-gradient-to-r from-purple-950/60 to-indigo-950/60 hover:from-purple-900/80 hover:to-indigo-900/80 text-purple-200 text-xs font-medium rounded-xl flex items-center gap-1.5 border border-purple-500/40 shadow-sm transition-all"
            title="Search-grounded hiring & salary intelligence with Gemini 3.5 Flash"
          >
            <Globe className="w-3.5 h-3.5 text-purple-400" />
            <span>Market Intel (AI)</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl flex items-center gap-1.5 border border-slate-700 transition-all"
            title="Export CSV (Sanitized against injection)"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Application</span>
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Tracked</span>
            <span className="text-xl font-black text-white">{stats.total}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">Interview Rate</span>
            <span className="text-xl font-black text-purple-300">{stats.interviewRate}%</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">Offers</span>
            <span className="text-xl font-black text-emerald-300">{stats.statusCounts.Offer}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">Upcoming Follow-Ups</span>
            <span className="text-xl font-black text-cyan-300">{stats.upcomingFollowUps}</span>
          </div>
        </div>
      )}

      {/* Control bar: Search, Filter, Sort, View Toggle */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
        <div className="flex items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search company, role, or notes..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="Saved">Saved</option>
            <option value="Applied">Applied</option>
            <option value="Assessment">Assessment</option>
            <option value="Interview">Interview</option>
            <option value="Offer">Offer</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <div className="flex items-center gap-2.5 self-end md:self-auto">
          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="date_desc">Latest Applied</option>
            <option value="date_asc">Oldest Applied</option>
            <option value="company_asc">Company A-Z</option>
          </select>

          {/* View Toggle */}
          <div className="flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                viewMode === 'kanban' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Kanban Board View"
            >
              <Kanban className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                viewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Table View"
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'kanban' ? (
        /* Kanban Board View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map(col => {
            const columnJobs = jobs.filter(j => j.status === col.status);
            return (
              <div
                key={col.status}
                className="rounded-2xl bg-slate-900/40 border border-slate-800/80 p-3 flex flex-col min-h-[450px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">{col.title}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${col.badgeBg}`}>
                      {columnJobs.length}
                    </span>
                  </div>
                </div>

                {/* Job Cards in Column */}
                <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
                  {columnJobs.map(job => {
                    const isFollowUpOverdue = job.followUpDate && job.followUpDate < todayStr && job.status !== 'Offer' && job.status !== 'Rejected';
                    return (
                      <div
                        key={job.id}
                        className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all space-y-2 group"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                              {job.company}
                            </h4>
                            <p className="text-[11px] text-slate-300 font-medium">{job.role}</p>
                          </div>
                          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openResearch(`${job.company} ${job.role} new grad interview questions and compensation`)}
                              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-purple-300"
                              title={`Research ${job.company} with Gemini Search Grounding`}
                            >
                              <Globe className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => openEditModal(job)}
                              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                              title="Edit"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setJobToDelete(job)}
                              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Location & Salary */}
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            {job.location}
                          </span>
                          {job.salary && (
                            <span className="text-emerald-400 font-mono">{job.salary}</span>
                          )}
                        </div>

                        {/* Follow up alert if present */}
                        {job.followUpDate && (
                          <div
                            className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${
                              isFollowUpOverdue
                                ? 'bg-rose-500/10 text-rose-300 font-semibold border border-rose-500/20'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            <span>Follow-up: {job.followUpDate}</span>
                          </div>
                        )}

                        {/* Quick Status Shift Selector */}
                        <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                          <span className="text-slate-500">{job.applicationDate}</span>
                          <select
                            value={job.status}
                            onChange={e => handleUpdateStatus(job.id, e.target.value as JobStatus)}
                            className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] text-slate-300 focus:outline-none"
                          >
                            <option value="Saved">Saved</option>
                            <option value="Applied">Applied</option>
                            <option value="Assessment">Assessment</option>
                            <option value="Interview">Interview</option>
                            <option value="Offer">Offer</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </div>
                      </div>
                    );
                  })}

                  {columnJobs.length === 0 && (
                    <div className="h-24 border border-dashed border-slate-800/60 rounded-xl flex items-center justify-center text-[11px] text-slate-600">
                      Empty
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Date Applied</th>
                  <th className="py-3 px-4">Follow-Up</th>
                  <th className="py-3 px-4">Salary</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {jobs.map(job => (
                  <tr key={job.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">{job.company}</td>
                    <td className="py-3 px-4 font-medium text-slate-200">{job.role}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          job.status === 'Offer'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : job.status === 'Interview'
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : job.status === 'Assessment'
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            : job.status === 'Applied'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : job.status === 'Rejected'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{job.location}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{job.applicationDate}</td>
                    <td className="py-3 px-4 text-[11px]">
                      {job.followUpDate ? (
                        <span
                          className={
                            job.followUpDate < todayStr && job.status !== 'Offer' && job.status !== 'Rejected'
                              ? 'text-rose-400 font-semibold'
                              : 'text-slate-300'
                          }
                        >
                          {job.followUpDate}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                      {job.salary || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openResearch(`${job.company} ${job.role} new grad interview questions and compensation`)}
                          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-purple-300"
                          title={`Research ${job.company} with Gemini`}
                        >
                          <Globe className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(job)}
                          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setJobToDelete(job)}
                          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                      No jobs match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingJob ? 'Edit Application' : 'Add New Application'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveJob} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Company *</label>
                  <input
                    type="text"
                    required
                    value={formCompany}
                    onChange={e => setFormCompany(e.target.value)}
                    placeholder="e.g. Google, Stripe, Linear"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Role Title *</label>
                  <input
                    type="text"
                    required
                    value={formRole}
                    onChange={e => setFormRole(e.target.value)}
                    placeholder="e.g. Software Engineer"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as JobStatus)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Saved">Saved</option>
                    <option value="Applied">Applied</option>
                    <option value="Assessment">Assessment / OA</option>
                    <option value="Interview">Interview</option>
                    <option value="Offer">Offer</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Location</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={e => setFormLocation(e.target.value)}
                    placeholder="e.g. Remote, San Francisco, CA"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Date Applied</label>
                  <input
                    type="date"
                    required
                    value={formApplicationDate}
                    onChange={e => setFormApplicationDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Next Follow-Up</label>
                  <input
                    type="date"
                    value={formFollowUpDate}
                    onChange={e => setFormFollowUpDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Salary / Range</label>
                  <input
                    type="text"
                    value={formSalary}
                    onChange={e => setFormSalary(e.target.value)}
                    placeholder="e.g. $125k - $140k"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Job URL</label>
                  <input
                    type="url"
                    value={formPostingUrl}
                    onChange={e => setFormPostingUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Notes & Follow-up Context</label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="Referral contacts, interview notes, questions asked, salary negotiation notes..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium shadow-md shadow-indigo-600/30 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingJob ? 'Update Application' : 'Create Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Deletion */}
      {jobToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Delete Job Application?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to remove <span className="text-white font-semibold">{jobToDelete.company} ({jobToDelete.role})</span>? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setJobToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteJob}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-medium shadow-md shadow-rose-600/30"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* AI Market Research Grounding Modal */}
      <MarketResearchModal
        isOpen={researchModalOpen}
        onClose={() => setResearchModalOpen(false)}
        initialQuery={researchQuery}
      />
    </div>
  );
};
