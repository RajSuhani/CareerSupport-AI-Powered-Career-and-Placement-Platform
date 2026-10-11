import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  Briefcase,
  Mic,
  Code2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  TrendingUp,
  CheckCircle2,
  Terminal,
  Cpu,
  Layers,
  Award,
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (path: string) => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onOpenAuth }) => {
  const { user, demoLogin } = useAuth();

  return (
    <div className="space-y-16 py-6 sm:py-10 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#131b2e] to-[#0c101d] border border-slate-800/80 p-8 sm:p-14 text-center">
        {/* Glow backdrop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold tracking-wide shadow-inner">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>BUILT FOR COLLEGE STUDENTS & ENTRY-LEVEL JOB SEEKERS</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.15]">
            Supercharge Your Placement Search with{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-300 bg-clip-text text-transparent">
              Precision AI
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal max-w-2xl mx-auto">
            Stop sending resumes into the void. CareerSupport provides real ATS resume matching, interactive voice-enabled mock interviews, a Kanban job tracker, and a structured DSA preparation roadmap.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            {user ? (
              <button
                onClick={() => onNavigate('/dashboard')}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/25 flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
              >
                <span>Open Your Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/25 flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
                >
                  <span>Start Free Account</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => demoLogin()}
                  className="px-5 py-3 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 font-semibold text-sm flex items-center gap-2 transition-all"
                >
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Instant 1-Click Demo</span>
                </button>
              </>
            )}
            <button
              onClick={() => onNavigate('/resume-analyzer')}
              className="px-5 py-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 text-slate-300 font-medium text-sm flex items-center gap-2 transition-all"
            >
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Test ATS Resume Scan</span>
            </button>
          </div>

          {/* Highlights checklist */}
          <div className="pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Real PDF Text Parser & ATS Heuristics
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Role-Specific Mock Interviews with Voice
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Kanban Job Pipeline with CSV Export
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Zero Mock Data — Real Server State
            </span>
          </div>
        </div>
      </section>

      {/* Feature Pillar Grid */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Engineered For The Modern Tech Hiring Bar
          </h2>
          <p className="text-sm text-slate-400">
            A complete suite of purpose-built tools replacing scattered spreadsheets, generic AI prompts, and disjointed notes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Resume */}
          <div
            onClick={() => onNavigate('/resume-analyzer')}
            className="group cursor-pointer p-6 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 transition-all shadow-lg hover:shadow-indigo-500/10 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                AI Resume & ATS Analyzer
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Upload your PDF resume and target job description. Uncover missing keywords, skill gaps, quantified impact phrasing, and formatting score.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center text-xs font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform">
              <span>Scan Resume</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </div>
          </div>

          {/* Card 2: Jobs */}
          <div
            onClick={() => onNavigate('/jobs')}
            className="group cursor-pointer p-6 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition-all shadow-lg hover:shadow-cyan-500/10 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Briefcase className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                Smart Application Tracker
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Table and Kanban drag-and-drop boards. Filter by stage, track follow-up reminders, calculate offer rates, and export sanitized CSVs.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center text-xs font-semibold text-cyan-400 group-hover:translate-x-1 transition-transform">
              <span>Manage Pipeline</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </div>
          </div>

          {/* Card 3: Interviews */}
          <div
            onClick={() => onNavigate('/interviews')}
            className="group cursor-pointer p-6 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/40 transition-all shadow-lg hover:shadow-purple-500/10 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Mic className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">
                AI Mock Interview Practice
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Dynamic questions for Technical, Behavioral, SQL, and System Design. Practice with microphone audio or text; receive immediate structured grading.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center text-xs font-semibold text-purple-400 group-hover:translate-x-1 transition-transform">
              <span>Practice Interview</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </div>
          </div>

          {/* Card 4: DSA */}
          <div
            onClick={() => onNavigate('/practice')}
            className="group cursor-pointer p-6 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-all shadow-lg hover:shadow-amber-500/10 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Code2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                DSA Roadmap & Tracker
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                25+ essential patterns (Two Pointers, Sliders, Inverted Trees, Knapsacks). Track status, personal code notes, bookmarks, and daily streaks.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center text-xs font-semibold text-amber-400 group-hover:translate-x-1 transition-transform">
              <span>Track DSA Questions</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </div>
          </div>
        </div>
      </section>

      {/* Architecture & Engineering Standards Section */}
      <section className="rounded-3xl bg-slate-900/70 border border-slate-800 p-8 sm:p-12 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1">
              PORTFOLIO-READY ARCHITECTURE
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Production-Minded Full-Stack System
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md">
            Built with strict security, defense-in-depth against prompt injection, schema validation, and user data isolation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2 text-indigo-400 mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs font-bold uppercase">Security & Isolation</span>
            </div>
            <p className="text-xs text-slate-300">
              JWT sessions, bcrypt salted hashes, HTTP-only cookies, strict user ID scoped database queries, and CSV formula injection neutralization.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2 text-purple-400 mb-2">
              <Cpu className="w-4 h-4" />
              <span className="text-xs font-bold uppercase">Server-Side AI</span>
            </div>
            <p className="text-xs text-slate-300">
              Gemini 3.8 Flash structured JSON schema outputs. Defensive prompt boundary treats resume documents as untrusted data.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2 text-cyan-400 mb-2">
              <Layers className="w-4 h-4" />
              <span className="text-xs font-bold uppercase">Relational Persistence</span>
            </div>
            <p className="text-xs text-slate-300">
              Clean relational schema modeling users, resumes, applications, mock sessions, and DSA progress with atomic commits.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
              <Award className="w-4 h-4" />
              <span className="text-xs font-bold uppercase">Automated Tests</span>
            </div>
            <p className="text-xs text-slate-300">
              End-to-end integration tests with Vitest covering auth isolation, resume validation, CRUD workflows, and stats calculations.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA Banner */}
      <section className="text-center py-10 space-y-4">
        <h3 className="text-2xl sm:text-3xl font-bold text-white">
          Ready to Accelerate Your Placement Pipeline?
        </h3>
        <p className="text-sm text-slate-400 max-w-lg mx-auto">
          Start with the Demo Account or create a free profile to track every step of your recruiting journey.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            onClick={() => demoLogin()}
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all"
          >
            Explore Pre-loaded Demo
          </button>
          <button
            onClick={() => onOpenAuth('register')}
            className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-all"
          >
            Create My Account
          </button>
        </div>
      </section>
    </div>
  );
};
