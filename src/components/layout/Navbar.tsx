import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Sparkles,
  User as UserIcon,
  LogIn,
  LogOut,
  ChevronDown,
  Briefcase,
  Bell,
  Code2,
  Menu,
  Globe,
} from 'lucide-react';
import { MarketResearchModal } from '../ai/MarketResearchModal';

interface NavbarProps {
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onToggleMobileNav?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth, onToggleMobileNav }) => {
  const { user, logout, demoLogin } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [researchOpen, setResearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#0d1322]/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button
          onClick={onToggleMobileNav}
          className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-base sm:text-lg text-white tracking-tight flex items-center gap-1.5">
              CareerSupport
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                AI
              </span>
            </span>
            <span className="hidden sm:block text-[11px] text-slate-400 -mt-0.5">
              Placement & Job Search Engine
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {user ? (
          <>
            {/* Target Role Tag */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-medium text-slate-200">{user.targetRole || 'Software Engineer'}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">{user.experienceLevel}</span>
            </div>

            {/* Market Intel Button */}
            <button
              onClick={() => setResearchOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-medium transition-all"
              title="Search-Grounded Placement Intelligence with Gemini 3.5 Flash"
            >
              <Globe className="w-3.5 h-3.5 text-purple-400" />
              <span>Market Intel</span>
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-200 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold shadow-inner">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-medium text-slate-200 leading-tight">{user.name}</div>
                  <div className="text-[10px] text-slate-400 leading-tight">{user.email}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-50 py-1.5 divide-y divide-slate-800 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3.5 py-2">
                      <p className="text-xs font-medium text-white">{user.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                      <p className="text-[10px] text-indigo-400 mt-0.5">{user.education || 'CS Undergrad'}</p>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors text-left"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 1-Click Demo Login button */}
            <button
              onClick={() => demoLogin()}
              className="px-3 py-1.5 text-xs font-medium text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Try</span> Demo Account
            </button>

            {/* Sign in */}
            <button
              onClick={() => onOpenAuth('login')}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </button>

            {/* Register */}
            <button
              onClick={() => onOpenAuth('register')}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm shadow-indigo-600/30 transition-all flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Get Started</span>
            </button>
          </div>
        )}
      </div>

      {/* Global Market Intelligence Grounding Modal */}
      <MarketResearchModal
        isOpen={researchOpen}
        onClose={() => setResearchOpen(false)}
      />
    </header>
  );
};
