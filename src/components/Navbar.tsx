import { useState, useEffect } from "react";
import { Sparkles, Flame, PlusCircle, BarChart3, BookOpen, Menu, X } from "lucide-react";
import { SoundToggle } from "./SoundToggle";
import { triggerHaptic } from "@/lib/sound";
import { storageService } from "@/lib/storage";

interface NavbarProps {
  activeTab: "explore" | "create" | "analytics";
  setActiveTab: (tab: "explore" | "create" | "analytics") => void;
  streakCount?: number;
}

export function Navbar({ activeTab, setActiveTab, streakCount }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [streak, setStreak] = useState(streakCount ?? 3);

  useEffect(() => {
    setStreak(storageService.getStreak());
  }, [streakCount]);

  const handleTabClick = (tab: "explore" | "create" | "analytics") => {
    triggerHaptic("light");
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div
            id="brand-logo-btn"
            onClick={() => handleTabClick("explore")}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-700 to-violet-700 bg-clip-text text-transparent">
                  QuizMe
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md">
                  Pro
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Mastery, Practice & Timed Exams
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
            <button
              id="nav-tab-explore"
              onClick={() => handleTabClick("explore")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all min-h-[44px] touch-manipulation cursor-pointer ${
                activeTab === "explore"
                  ? "bg-white text-indigo-600 shadow-sm shadow-slate-200/60 font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Quizzes</span>
            </button>
            <button
              id="nav-tab-create"
              onClick={() => handleTabClick("create")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all min-h-[44px] touch-manipulation cursor-pointer ${
                activeTab === "create"
                  ? "bg-white text-indigo-600 shadow-sm shadow-slate-200/60 font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Quiz</span>
            </button>
            <button
              id="nav-tab-analytics"
              onClick={() => handleTabClick("analytics")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all min-h-[44px] touch-manipulation cursor-pointer ${
                activeTab === "analytics"
                  ? "bg-white text-indigo-600 shadow-sm shadow-slate-200/60 font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analytics</span>
            </button>
          </nav>

          {/* Right Action Controls: Streak, Sound, Mobile Menu */}
          <div className="flex items-center gap-2.5">
            {/* Streak Counter */}
            <div
              id="streak-counter-pill"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-700 min-h-[44px]"
              title={`Current study streak: ${streak} days`}
            >
              <Flame className="w-4 h-4 text-amber-500 fill-amber-500 animate-bounce" />
              <span className="text-xs font-bold">{streak}</span>
              <span className="text-[11px] font-medium hidden sm:inline">day streak</span>
            </div>

            {/* Sound Toggle */}
            <SoundToggle />

            {/* Mobile Menu Toggle Button */}
            <button
              id="mobile-menu-toggle-btn"
              onClick={() => {
                triggerHaptic("light");
                setMobileMenuOpen(!mobileMenuOpen);
              }}
              className="md:hidden flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 touch-manipulation p-2 cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-4 space-y-2 shadow-lg animate-in fade-in slide-in-from-top duration-200">
          <button
            id="mobile-nav-explore"
            onClick={() => handleTabClick("explore")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium min-h-[48px] touch-manipulation cursor-pointer ${
              activeTab === "explore"
                ? "bg-indigo-50 text-indigo-700 font-semibold"
                : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <span>Explore Quizzes</span>
          </button>
          <button
            id="mobile-nav-create"
            onClick={() => handleTabClick("create")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium min-h-[48px] touch-manipulation cursor-pointer ${
              activeTab === "create"
                ? "bg-indigo-50 text-indigo-700 font-semibold"
                : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            <PlusCircle className="w-5 h-5 text-indigo-600" />
            <span>Create Custom Quiz</span>
          </button>
          <button
            id="mobile-nav-analytics"
            onClick={() => handleTabClick("analytics")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium min-h-[48px] touch-manipulation cursor-pointer ${
              activeTab === "analytics"
                ? "bg-indigo-50 text-indigo-700 font-semibold"
                : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <span>Performance & History</span>
          </button>
        </div>
      )}
    </header>
  );
}
