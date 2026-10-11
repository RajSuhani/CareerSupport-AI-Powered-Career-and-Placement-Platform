import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { ResumeAnalysis } from '../types';
import {
  FileText,
  Upload,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  Clock,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  FileCheck,
  Info,
} from 'lucide-react';

export const ResumeAnalyzerPage: React.FC = () => {
  const { user, token } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [targetRole, setTargetRole] = useState(user?.targetRole || 'Software Engineer');
  const [targetJobDescription, setTargetJobDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<ResumeAnalysis | null>(null);
  const [history, setHistory] = useState<ResumeAnalysis[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history on mount
  useEffect(() => {
    async function loadHistory() {
      if (!token) return;
      try {
        const res = await fetch('/api/resumes', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setHistory(data.resumes || []);
          if (data.resumes && data.resumes.length > 0 && !activeAnalysis) {
            setActiveAnalysis(data.resumes[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load resume history:', err);
      }
    }
    loadHistory();
  }, [token]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.type !== 'application/pdf' && !selected.name.toLowerCase().endsWith('.pdf')) {
        setError('Please select a valid PDF file (.pdf)');
        return;
      }
      if (selected.size > 5 * 1024 * 1024) {
        setError('File size exceeds the 5MB limit');
        return;
      }
      setFile(selected);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Please sign in or start a demo session to run analysis');
      return;
    }

    if (inputMode === 'upload' && !file) {
      setError('Please select a PDF resume file to upload');
      return;
    }
    if (inputMode === 'paste' && (!resumeText || resumeText.length < 50)) {
      setError('Please enter at least 50 characters of resume text');
      return;
    }

    setError(null);
    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append('targetRole', targetRole);
      formData.append('targetJobDescription', targetJobDescription);

      if (inputMode === 'upload' && file) {
        formData.append('resumeFile', file);
      } else {
        formData.append('resumeText', resumeText);
        formData.append('fileName', 'Pasted_Resume.txt');
      }

      const res = await fetch('/api/resumes/analyze', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Resume analysis failed');
      }

      setActiveAnalysis(data.resume);
      setHistory(prev => [data.resume, ...prev]);
    } catch (err: any) {
      setError(err.message || 'Error occurred during analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteHistory = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/resumes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setHistory(prev => prev.filter(r => r.id !== id));
        if (activeAnalysis?.id === id) {
          const remaining = history.filter(r => r.id !== id);
          setActiveAnalysis(remaining.length > 0 ? remaining[0] : null);
        }
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-6 px-4 sm:px-6">
      {/* Header banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1">
            <Sparkles className="w-4 h-4" />
            <span>AI ATS Parser & Gap Diagnostics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Resume Match & Skill-Gap Analyzer
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Evaluate your resume against target job requirements, uncover hidden keywords, and generate STAR-phrased bullet revisions.
          </p>
        </div>

        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Uploads processed securely with prompt-injection defense</span>
        </div>
      </div>

      {/* Main Grid: Form on Left, Results on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input Form (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-5">
            <h2 className="text-base font-bold text-white flex items-center justify-between">
              <span>Scan Configuration</span>
              <span className="text-xs font-normal text-slate-400">PDF or Text</span>
            </h2>

            {/* Input Mode Selector */}
            <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => setInputMode('upload')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                  inputMode === 'upload'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Upload PDF File
              </button>
              <button
                type="button"
                onClick={() => setInputMode('paste')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                  inputMode === 'paste'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Paste Plain Text
              </button>
            </div>

            <form onSubmit={handleAnalyze} className="space-y-4">
              {/* Target Job Role */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Target Role Title
                </label>
                <input
                  type="text"
                  required
                  value={targetRole}
                  onChange={e => setTargetRole(e.target.value)}
                  placeholder="e.g. Software Engineer, Backend Developer"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* PDF Upload or Text */}
              {inputMode === 'upload' ? (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Upload Resume (PDF only, max 5MB)
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl p-5 text-center bg-slate-950/50 hover:bg-slate-950 transition-all"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="application/pdf"
                      className="hidden"
                    />
                    <Upload className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                    {file ? (
                      <div>
                        <p className="text-xs font-semibold text-white truncate">{file.name}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {(file.size / 1024).toFixed(1)} KB — Click to change
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-medium text-slate-300">Click or drag PDF here</p>
                        <p className="text-[10px] text-slate-500 mt-1">Single-column PDF recommended</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Paste Resume Content
                  </label>
                  <textarea
                    rows={6}
                    value={resumeText}
                    onChange={e => setResumeText(e.target.value)}
                    placeholder="Paste education, experience, technical skills, and project bullet points..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed font-mono"
                  />
                </div>
              )}

              {/* Target Job Description */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Target Job Description <span className="text-slate-500">(Recommended)</span>
                </label>
                <textarea
                  rows={5}
                  value={targetJobDescription}
                  onChange={e => setTargetJobDescription(e.target.value)}
                  placeholder="Paste the requirements, responsibilities, and qualifications from the job posting..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed font-mono"
                />
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isAnalyzing}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Analyzing ATS Keywords & Skills...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Run Full ATS Analysis</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Past Analyses History */}
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span>Scan History</span>
              <span className="text-xs text-slate-400 font-normal">
                {history.length} saved
              </span>
            </h3>

            {history.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {history.map(item => (
                  <div
                    key={item.id}
                    onClick={() => setActiveAnalysis(item)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      activeAnalysis?.id === item.id
                        ? 'bg-indigo-950/40 border-indigo-500/50'
                        : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <p className="text-xs font-semibold text-white truncate">{item.targetJobRole}</p>
                      <p className="text-[11px] text-slate-400 truncate">{item.fileName}</p>
                      <p className="text-[10px] text-slate-500">
                        {new Date(item.createdAt).toLocaleDateString()} • ATS {item.atsScore}%
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-bold text-indigo-400">{item.matchScore}%</span>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleDeleteHistory(item.id);
                        }}
                        className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-rose-400 transition-colors"
                        title="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center py-4">
                No past scans recorded.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Detailed Diagnostic Results (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {activeAnalysis ? (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Score Header */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-[#101729] border border-slate-800 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                  <div>
                    <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block">
                      Target Role
                    </span>
                    <h2 className="text-xl font-bold text-white">{activeAnalysis.targetJobRole}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">{activeAnalysis.fileName}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Match Score Meter */}
                    <div className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Job Match
                      </span>
                      <span className="text-2xl font-black text-indigo-400">
                        {activeAnalysis.matchScore}%
                      </span>
                    </div>

                    {/* ATS Parsability Meter */}
                    <div className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        ATS Score
                      </span>
                      <span className="text-2xl font-black text-emerald-400">
                        {activeAnalysis.atsScore}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Executive Summary */}
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Executive Recruiter Summary
                  </span>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {activeAnalysis.summary}
                  </p>
                </div>

                {/* Score Disclaimer */}
                <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 flex items-start gap-2 text-[11px] text-indigo-300">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-indigo-400" />
                  <span>
                    Scores are estimated AI metrics calibrated to industry ATS parsing benchmarks and recruiter screening heuristics. They do not guarantee an interview invitation.
                  </span>
                </div>
              </div>

              {/* Skills Diagnostic: Matched vs Missing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Matched Skills */}
                <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Identified Strengths ({activeAnalysis.identifiedSkills.length})</span>
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeAnalysis.identifiedSkills.map((sk, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Missing / Gap Skills */}
                <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      <span>Missing Keywords ({activeAnalysis.missingSkills.length})</span>
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeAnalysis.missingSkills.map((sk, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recommended High-Impact Keywords to Weave In */}
              {activeAnalysis.keywordRecommendations.length > 0 && (
                <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" />
                    <span>Recommended Keywords to Integrate</span>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {activeAnalysis.keywordRecommendations.map((kw, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 text-xs font-mono"
                      >
                        +{kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actionable Improvement Steps */}
              <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Actionable Bullet Revisions & Next Steps</span>
                </h3>

                <div className="space-y-3">
                  {activeAnalysis.suggestedImprovements.map((imp, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3"
                    >
                      <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed">{imp}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-96 rounded-2xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-3">
              <FileCheck className="w-12 h-12 text-slate-600" />
              <div className="max-w-sm">
                <h3 className="text-sm font-semibold text-slate-300">No Resume Analysis Selected</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Upload a PDF resume on the left or select an earlier scan from history to inspect matched skills, missing keywords, and recommendations.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
