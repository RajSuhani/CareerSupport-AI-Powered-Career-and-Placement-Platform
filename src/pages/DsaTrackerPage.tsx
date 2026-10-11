import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { DsaProblem, DsaCategory, DsaDifficulty, DsaStatus } from '../types';
import confetti from 'canvas-confetti';
import {
  Code2,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Bookmark,
  ExternalLink,
  Flame,
  Award,
  Sparkles,
  Edit3,
  X,
  Target,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

export const DsaTrackerPage: React.FC = () => {
  const { token } = useAuth();
  const [problems, setProblems] = useState<DsaProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [bookmarkedOnly, setBookmarkedOnly] = useState<boolean>(false);
  const [stats, setStats] = useState<any>(null);

  // Notes Modal state
  const [activeNotesProblem, setActiveNotesProblem] = useState<DsaProblem | null>(null);
  const [notesContent, setNotesContent] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const fetchProblems = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (search) query.append('search', search);
      if (selectedCategory !== 'all') query.append('category', selectedCategory);
      if (selectedDifficulty !== 'all') query.append('difficulty', selectedDifficulty);
      if (selectedStatus !== 'all') query.append('status', selectedStatus);
      if (bookmarkedOnly) query.append('bookmarked', 'true');

      const res = await fetch(`/api/practice/dsa?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProblems(data.problems || []);
      }

      // Fetch stats
      const statsRes = await fetch('/api/practice/dsa/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error('Failed to load DSA problems:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProblems();
  }, [token, search, selectedCategory, selectedDifficulty, selectedStatus, bookmarkedOnly]);

  const handleUpdateStatus = async (prob: DsaProblem, newStatus: DsaStatus) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/practice/dsa/${prob.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        if (newStatus === 'Solved') {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.7 },
          });
        }
        fetchProblems();
      }
    } catch (err) {
      console.error('Update status failed:', err);
    }
  };

  const handleToggleBookmark = async (prob: DsaProblem) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/practice/dsa/${prob.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isBookmarked: !prob.isBookmarked }),
      });

      if (res.ok) {
        fetchProblems();
      }
    } catch (err) {
      console.error('Toggle bookmark failed:', err);
    }
  };

  const handleOpenNotes = (prob: DsaProblem) => {
    setActiveNotesProblem(prob);
    setNotesContent(prob.notes || '');
  };

  const handleSaveNotes = async () => {
    if (!token || !activeNotesProblem) return;
    setIsSavingNotes(true);
    try {
      const res = await fetch(`/api/practice/dsa/${activeNotesProblem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          notes: notesContent,
          lastRevisedAt: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        setActiveNotesProblem(null);
        fetchProblems();
      }
    } catch (err) {
      console.error('Save notes error:', err);
    } finally {
      setIsSavingNotes(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <span>DSA & Algorithmic Prep Tracker</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400">
              Curated 25+ Essential Patterns
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Master the core placement data structures and algorithmic patterns. Track code notes, revision status, and consistency streaks.
          </p>
        </div>

        {stats && (
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-2.5 px-4 rounded-xl">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-sm">
              <Flame className="w-4 h-4 fill-amber-400" />
              <span>{stats.streakDays} Day Streak</span>
            </div>
            <div className="w-px h-4 bg-slate-800" />
            <div className="text-xs text-slate-300">
              <span className="font-extrabold text-white">{stats.totalSolved}</span> / {stats.totalProblems} Solved ({stats.completionPercentage}%)
            </div>
          </div>
        )}
      </div>

      {/* Progress Cards & Category Breakdown */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Difficulty breakdown */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-around text-center">
            <div>
              <span className="text-[10px] font-bold uppercase text-emerald-400 block">Easy</span>
              <span className="text-lg font-black text-white">
                {stats.difficultyStats?.Easy?.solved || 0} / {stats.difficultyStats?.Easy?.total || 0}
              </span>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div>
              <span className="text-[10px] font-bold uppercase text-amber-400 block">Medium</span>
              <span className="text-lg font-black text-white">
                {stats.difficultyStats?.Medium?.solved || 0} / {stats.difficultyStats?.Medium?.total || 0}
              </span>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div>
              <span className="text-[10px] font-bold uppercase text-rose-400 block">Hard</span>
              <span className="text-lg font-black text-white">
                {stats.difficultyStats?.Hard?.solved || 0} / {stats.difficultyStats?.Hard?.total || 0}
              </span>
            </div>
          </div>

          {/* Category Chart */}
          <div className="lg:col-span-2 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
            <span className="text-xs font-bold text-white mb-2">Category Completion Progress</span>
            <div className="h-16 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.categoryStats || []} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                  <XAxis dataKey="category" tick={false} stroke="#64748b" />
                  <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '0.5rem',
                      fontSize: '11px',
                    }}
                  />
                  <Bar dataKey="percentage" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search problem, pattern, or category..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Patterns & Categories</option>
            <option value="Arrays & Hashing">Arrays & Hashing</option>
            <option value="Two Pointers">Two Pointers</option>
            <option value="Sliding Window">Sliding Window</option>
            <option value="Stack & Queue">Stack & Queue</option>
            <option value="Binary Search">Binary Search</option>
            <option value="Linked List">Linked List</option>
            <option value="Trees & BST">Trees & BST</option>
            <option value="Graphs">Graphs</option>
            <option value="Dynamic Programming">Dynamic Programming</option>
          </select>
        </div>

        <div className="flex items-center gap-2.5 self-end md:self-auto">
          <select
            value={selectedDifficulty}
            onChange={e => setSelectedDifficulty(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>

          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Statuses</option>
            <option value="Solved">Solved</option>
            <option value="In Progress">In Progress</option>
            <option value="Not Started">Not Started</option>
          </select>

          <button
            onClick={() => setBookmarkedOnly(!bookmarkedOnly)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all ${
              bookmarkedOnly
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Bookmarked</span>
          </button>
        </div>
      </div>

      {/* Problem Cards Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 w-12 text-center">Status</th>
                <th className="py-3 px-4">Problem Name</th>
                <th className="py-3 px-4">Pattern / Algorithm</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Difficulty</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4 text-right">Practice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {problems.map(prob => (
                <tr key={prob.id} className="hover:bg-slate-800/30 transition-colors">
                  {/* Status toggle checkbox */}
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() =>
                        handleUpdateStatus(
                          prob,
                          prob.status === 'Solved'
                            ? 'Not Started'
                            : prob.status === 'In Progress'
                            ? 'Solved'
                            : 'In Progress'
                        )
                      }
                      title={`Status: ${prob.status}. Click to advance.`}
                      className="p-1 rounded hover:bg-slate-800 transition-colors"
                    >
                      {prob.status === 'Solved' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : prob.status === 'In Progress' ? (
                        <Clock className="w-4 h-4 text-amber-400" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-600" />
                      )}
                    </button>
                  </td>

                  {/* Title & LeetCode number */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleBookmark(prob)}
                        className={`text-slate-600 hover:text-amber-400 transition-colors ${
                          prob.isBookmarked ? 'text-amber-400 fill-amber-400' : ''
                        }`}
                        title="Bookmark for review"
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-bold text-white">
                        {prob.leetcodeNumber ? `#${prob.leetcodeNumber}. ` : ''}
                        {prob.title}
                      </span>
                    </div>
                  </td>

                  {/* Pattern */}
                  <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                    {prob.pattern}
                  </td>

                  {/* Category */}
                  <td className="py-3 px-4 text-slate-300">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                      {prob.category}
                    </span>
                  </td>

                  {/* Difficulty */}
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        prob.difficulty === 'Easy'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : prob.difficulty === 'Medium'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {prob.difficulty}
                    </span>
                  </td>

                  {/* Notes / Revision */}
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleOpenNotes(prob)}
                      className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{prob.notes ? 'Edit Notes' : 'Add Notes'}</span>
                    </button>
                  </td>

                  {/* Practice Link */}
                  <td className="py-3 px-4 text-right">
                    <a
                      href={prob.practiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors"
                    >
                      <span>Practice</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  </td>
                </tr>
              ))}

              {problems.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    No questions match your current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes Modal */}
      {activeNotesProblem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Personal Revision Notes</h3>
                <p className="text-xs text-slate-400">{activeNotesProblem.title}</p>
              </div>
              <button
                onClick={() => setActiveNotesProblem(null)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              rows={5}
              value={notesContent}
              onChange={e => setNotesContent(e.target.value)}
              placeholder="Record time & space complexity, edge cases to watch out for, tricky pointer conditions..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono leading-relaxed"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveNotesProblem(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium"
              >
                {isSavingNotes ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
