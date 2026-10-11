import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Settings,
  User as UserIcon,
  Shield,
  Save,
  CheckCircle2,
  AlertCircle,
  Download,
  Database,
  KeyRound,
  Sparkles,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, token, updateProfile, demoLogin } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [targetRole, setTargetRole] = useState(user?.targetRole || 'Software Engineer');
  const [experienceLevel, setExperienceLevel] = useState<any>(user?.experienceLevel || 'Entry-Level');
  const [education, setEducation] = useState(user?.education || '');
  const [skillsText, setSkillsText] = useState((user?.skills || []).join(', '));
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);
    setIsSaving(true);

    try {
      const skillsArray = skillsText
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const res = await updateProfile({
        name,
        targetRole,
        experienceLevel,
        education,
        skills: skillsArray,
      });

      if (res.success) {
        setSuccessMsg('Profile updated successfully!');
      } else {
        setErrorMsg(res.error || 'Failed to update profile');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportData = () => {
    if (!token) return;
    window.location.href = `/api/jobs/export/csv?token=${token}`;
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-6 px-4 sm:px-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-indigo-400" />
          <span>Profile & Platform Settings</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Customize your target job profiles, placement skills, educational background, and security preferences.
        </p>
      </div>

      {/* Profile Form */}
      <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <UserIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Candidate Placement Profile</h2>
              <p className="text-[11px] text-slate-400">Used to tailor ATS scoring and mock interview questions</p>
            </div>
          </div>
        </div>

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email (Account ID)</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3.5 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Target Engineering Role</label>
              <input
                type="text"
                value={targetRole}
                onChange={e => setTargetRole(e.target.value)}
                placeholder="e.g. Full-Stack Software Engineer, Backend Dev"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Experience Level</label>
              <select
                value={experienceLevel}
                onChange={e => setExperienceLevel(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="Student / Intern">Student / Intern</option>
                <option value="Entry-Level">Entry-Level (New Grad)</option>
                <option value="Mid-Level">Mid-Level</option>
                <option value="Career Switcher">Career Switcher</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">University / Education Background</label>
            <input
              type="text"
              value={education}
              onChange={e => setEducation(e.target.value)}
              placeholder="e.g. B.S. in Computer Science, University of California (Expected 2026)"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Core Technical Skills <span className="text-slate-500">(comma separated)</span>
            </label>
            <textarea
              rows={3}
              value={skillsText}
              onChange={e => setSkillsText(e.target.value)}
              placeholder="TypeScript, React, Node.js, PostgreSQL, Python, Git, Docker, REST APIs"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving Changes...' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Security & Architecture Overview */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Security & Data Privacy Policy</h3>
            <p className="text-[11px] text-slate-400">Production-grade defense standards</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300 pt-2">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="font-semibold text-white block">Tenant Isolation</span>
            <p className="text-slate-400 text-[11px]">
              Every database query and mutation is strictly scoped to the authenticated user ID.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="font-semibold text-white block">Prompt Injection Defense</span>
            <p className="text-slate-400 text-[11px]">
              Uploaded PDF resumes and job postings are isolated as untrusted data within strict system boundaries.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="font-semibold text-white block">CSV Formula Hardening</span>
            <p className="text-slate-400 text-[11px]">
              Exported spreadsheet cells starting with =, +, -, or @ are escaped to prevent formula injection.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-white block">Export Personal Data</span>
            <span className="text-[11px] text-slate-500">Download all tracked applications as sanitized CSV</span>
          </div>
          <button
            onClick={handleExportData}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>
    </div>
  );
};
