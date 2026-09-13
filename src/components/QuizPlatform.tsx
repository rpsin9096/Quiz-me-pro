import { useState, useEffect, useCallback } from "react";
import {
  Search,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { Navbar } from "./Navbar";
import { QuizCard } from "./QuizCard";
import { PracticeMode } from "./PracticeMode";
import { ExamMode } from "./ExamMode";
import { QuizBuilder } from "./QuizBuilder";
import { AnalyticsDashboard } from "./AnalyticsDashboard";
import { QuizItem, QuestionData } from "@/types";
import { storageService } from "@/lib/storage";
import { triggerHaptic } from "@/lib/sound";

export function QuizPlatform() {
  const [activeTab, setActiveTab] = useState<"explore" | "create" | "analytics">("explore");
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");

  // Active Session State
  const [activeMode, setActiveMode] = useState<"none" | "practice" | "exam">("none");
  const [activeQuiz, setActiveQuiz] = useState<QuizItem | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<QuestionData[]>([]);

  // Load quizzes from storage
  const loadQuizzes = useCallback(() => {
    setLoading(true);
    const data = storageService.getQuizzes();
    setQuizzes(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadQuizzes();
  }, [loadQuizzes]);

  // Launch Practice Mode
  const handleStartPractice = (quizId: number) => {
    triggerHaptic("medium");
    const quiz = quizzes.find((q) => q.id === quizId);
    if (!quiz) return;
    const questions = storageService.getQuestions(quizId);
    setActiveQuiz(quiz);
    setActiveQuestions(questions);
    setActiveMode("practice");
  };

  // Launch Exam Mode
  const handleStartExam = (quizId: number) => {
    triggerHaptic("medium");
    const quiz = quizzes.find((q) => q.id === quizId);
    if (!quiz) return;
    const questions = storageService.getQuestions(quizId);
    setActiveQuiz(quiz);
    setActiveQuestions(questions);
    setActiveMode("exam");
  };

  // Launch practice mode with custom subset of missed questions
  const handleLaunchPracticeWithQuestions = (customQuestions: QuestionData[]) => {
    if (!activeQuiz) return;
    setActiveQuestions(customQuestions);
    setActiveMode("practice");
  };

  const handleDeleteCustomQuiz = (quizId: number) => {
    if (!confirm("Are you sure you want to delete this custom quiz?")) return;
    storageService.deleteQuiz(quizId);
    setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
  };

  // Filtered quizzes list
  const filteredQuizzes = quizzes.filter((q) => {
    const matchesSearch =
      searchQuery === "" ||
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.description && q.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      q.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" ||
      q.category.toLowerCase() === selectedCategory.toLowerCase();

    const matchesDifficulty =
      selectedDifficulty === "all" ||
      q.difficulty.toLowerCase() === selectedDifficulty.toLowerCase();

    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const categories = [
    "all",
    "Computer Science",
    "Medicine & Biology",
    "Cybersecurity",
    "Science & Physics",
    "World History",
  ];

  // If in Practice Mode
  if (activeMode === "practice" && activeQuiz && activeQuestions.length > 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
        <PracticeMode
          quiz={activeQuiz}
          questions={activeQuestions}
          onExit={() => {
            setActiveMode("none");
            setActiveQuiz(null);
          }}
        />
      </div>
    );
  }

  // If in Exam Mode
  if (activeMode === "exam" && activeQuiz && activeQuestions.length > 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
        <ExamMode
          quiz={activeQuiz}
          questions={activeQuestions}
          onExit={() => {
            setActiveMode("none");
            setActiveQuiz(null);
          }}
          onLaunchPracticeWithQuestions={handleLaunchPracticeWithQuestions}
        />
      </div>
    );
  }

  return (
    <div id="quiz-platform-root" className="min-h-screen bg-slate-50 pb-16">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {activeTab === "create" ? (
        <QuizBuilder
          onQuizCreated={() => {
            loadQuizzes();
            setActiveTab("explore");
          }}
          onCancel={() => setActiveTab("explore")}
        />
      ) : activeTab === "analytics" ? (
        <AnalyticsDashboard />
      ) : (
        /* Explore Quizzes Catalog */
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          {/* Hero Welcome Banner */}
          <div
            id="hero-banner"
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-violet-900 text-white p-6 sm:p-10 shadow-xl mb-10"
          >
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-amber-300 text-xs font-semibold uppercase tracking-wider mb-4 border border-white/10">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Next-Gen Adaptive Learning Platform</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight mb-4">
                Master any subject with Spaced Repetition & Timed Exams.
              </h1>
              <p className="text-indigo-100/90 text-sm sm:text-base leading-relaxed mb-6">
                Eliminate study friction with smooth touch gestures, 3D flashcards, wall-clock
                exam proctoring, and instant diagnostic feedback.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  id="hero-quick-practice-btn"
                  onClick={() => {
                    triggerHaptic("medium");
                    if (quizzes.length > 0) handleStartPractice(quizzes[0].id);
                  }}
                  className="px-6 py-3.5 rounded-2xl bg-white text-indigo-900 hover:bg-indigo-50 font-bold text-sm shadow-md transition-all min-h-[48px] touch-manipulation active:scale-[0.98] cursor-pointer"
                >
                  Quick Practice Launch
                </button>
                <button
                  id="hero-create-deck-btn"
                  onClick={() => {
                    triggerHaptic("light");
                    setActiveTab("create");
                  }}
                  className="px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold text-sm transition-all min-h-[48px] touch-manipulation active:scale-[0.98] cursor-pointer"
                >
                  Create Custom Deck
                </button>
              </div>
            </div>

            {/* Subtle decorative background circles */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />
          </div>

          {/* Search & Category Filter Bar */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-sm mb-8 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="search-quiz-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search quizzes by title, concept, or subject..."
                  className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm min-h-[48px] touch-manipulation"
                />
              </div>

              {/* Difficulty selector */}
              <div className="flex items-center gap-2">
                <select
                  id="difficulty-filter-select"
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="px-4 py-3 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-700 bg-white min-h-[48px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Difficulties</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>

            {/* Category horizontal scroll pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  id={`cat-filter-${cat.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                  onClick={() => {
                    triggerHaptic("light");
                    setSelectedCategory(cat);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap min-h-[40px] touch-manipulation transition-all border cursor-pointer ${
                    selectedCategory.toLowerCase() === cat.toLowerCase()
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/80"
                  }`}
                >
                  {cat === "all" ? "All Subjects" : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Quizzes Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-3xl border border-slate-200 p-6 h-64 animate-pulse"
                />
              ))}
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-900 mb-1">No quizzes found</h3>
              <p className="text-xs text-slate-500 mb-6">
                Try adjusting your search query or subject filters, or create your own custom quiz.
              </p>
              <button
                id="reset-filter-btn"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  setSelectedDifficulty("all");
                }}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl min-h-[44px] touch-manipulation cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div id="quizzes-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredQuizzes.map((quiz) => (
                <QuizCard
                  key={quiz.id}
                  quiz={quiz}
                  onStartPractice={handleStartPractice}
                  onStartExam={handleStartExam}
                  onDeleteCustom={handleDeleteCustomQuiz}
                />
              ))}
            </div>
          )}
        </main>
      )}
    </div>
  );
}
