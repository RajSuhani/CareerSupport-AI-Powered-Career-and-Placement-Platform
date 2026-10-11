import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Globe,
  Search,
  ExternalLink,
  Sparkles,
  X,
  TrendingUp,
  Building2,
  DollarSign,
  Briefcase,
  AlertCircle,
  Clock,
  Compass,
} from 'lucide-react';

interface MarketResearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

const PRESET_QUERIES = [
  'Google Software Engineer entry-level 2026 new grad hiring status and interview rounds',
  'Stripe software engineer entry-level compensation base equity and technical screen questions',
  'Meta E3 software engineer interview loop formats and typical questions',
  'Current most in-demand backend frameworks and distributed systems skills for junior engineers',
];

export const MarketResearchModal: React.FC<MarketResearchModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
}) => {
  const { user, token } = useAuth();
  const [query, setQuery] = useState(initialQuery || PRESET_QUERIES[0]);
  const [targetRole, setTargetRole] = useState(user?.targetRole || 'Software Engineer');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    text: string;
    sources: Array<{ title: string; url: string }>;
    searchQueries: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (overrideQuery?: string) => {
    const q = overrideQuery || query;
    if (!q.trim() || isLoading) return;

    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/market-research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          query: q,
          role: targetRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to retrieve search data');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Market research query failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-[#0f172a] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-md">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Live Tech Market & Hiring Intelligence</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Google Search Grounded
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Live recruitment trends, current salary data, and recent interview reports
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-950/40 space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask company hiring status, compensation ranges, or recent interview formats..."
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-cyan-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Researching...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Search Live Data</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Preset Queries */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
            <span className="text-slate-500 font-medium shrink-0">Popular:</span>
            {PRESET_QUERIES.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuery(preset);
                  handleSearch(preset);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0 border border-slate-700/60"
              >
                {preset.slice(0, 36)}...
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result ? (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Grounded Web Sources Citations */}
              {result.sources.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Verified Web Sources ({result.sources.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.sources.map((src, idx) => (
                      <a
                        key={idx}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-300 text-[11px] transition-colors"
                      >
                        <span className="max-w-[240px] truncate">{src.title}</span>
                        <ExternalLink className="w-3 h-3 text-slate-500 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Research Narrative Report */}
              <div className="p-5 sm:p-6 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">
                  Grounding Analysis Summary
                </span>
                <div className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans space-y-2">
                  {result.text}
                </div>
              </div>

              {/* Underlying Search Queries Used */}
              {result.searchQueries.length > 0 && (
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <Compass className="w-3.5 h-3.5" />
                  <span>Queries: {result.searchQueries.join(', ')}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="py-16 text-center text-slate-500 space-y-3">
              <Globe className="w-10 h-10 text-slate-600 mx-auto" />
              <div>
                <p className="text-sm font-semibold text-slate-300">Search Live Tech Market Data</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Type a target company, role, or skill set to retrieve real-time search grounded compensation, active hiring notices, and interview patterns.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
