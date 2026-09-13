import { useState, useEffect, useCallback, useMemo } from "react";
import confetti from "canvas-confetti";
import {
  Clock,
  Bookmark,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  RotateCcw,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Grid,
  Check,
  X,
  ShieldAlert,
} from "lucide-react";
import { QuestionData, QuizItem } from "@/types";
import { calculateExamScore } from "@/lib/scoring";
import { soundManager, triggerHaptic } from "@/lib/sound";
import { storageService } from "@/lib/storage";

interface ExamModeProps {
  quiz: QuizItem;
  questions: QuestionData[];
  onExit: () => void;
  onLaunchPracticeWithQuestions?: (questions: QuestionData[]) => void;
}

export function ExamMode({
  quiz,
  questions,
  onExit,
  onLaunchPracticeWithQuestions,
}: ExamModeProps) {
  const storagePrefix = `quizme_exam_${quiz.id}`;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string[]>>({});
  const [fillInputs, setFillInputs] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [tabSwitches, setTabSwitches] = useState(0);

  // Timer state
  const totalDurationSeconds = quiz.timeLimitMinutes * 60;
  const [secondsRemaining, setSecondsRemaining] = useState(totalDurationSeconds);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<"all" | "correct" | "incorrect" | "flagged">("all");

  // Save current answers and flags to localStorage
  const persistState = useCallback(
    (newAnswers: Record<string, string[]>, newFlags: Set<number>, newIndex: number) => {
      try {
        localStorage.setItem(`${storagePrefix}_answers`, JSON.stringify(newAnswers));
        localStorage.setItem(`${storagePrefix}_flags`, JSON.stringify(Array.from(newFlags)));
        localStorage.setItem(`${storagePrefix}_index`, newIndex.toString());
      } catch {
        // Storage error ignored
      }
    },
    [storagePrefix]
  );

  // Restore existing exam state or initialize end timestamp
  useEffect(() => {
    try {
      const savedAnswers = localStorage.getItem(`${storagePrefix}_answers`);
      const savedFlags = localStorage.getItem(`${storagePrefix}_flags`);
      const savedEndTime = localStorage.getItem(`${storagePrefix}_endtime`);
      const savedIndex = localStorage.getItem(`${storagePrefix}_index`);

      if (savedAnswers) {
        const parsed = JSON.parse(savedAnswers);
        setUserAnswers(parsed);
        const fills: Record<string, string> = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (Array.isArray(v) && v[0]) fills[k] = v[0];
        }
        setFillInputs(fills);
      }

      if (savedFlags) {
        setFlaggedQuestions(new Set(JSON.parse(savedFlags)));
      }

      if (savedIndex) {
        const idx = parseInt(savedIndex, 10);
        if (!isNaN(idx) && idx >= 0 && idx < questions.length) {
          setCurrentIndex(idx);
        }
      }

      let targetEndTime: number;
      if (savedEndTime) {
        targetEndTime = parseInt(savedEndTime, 10);
      } else {
        targetEndTime = Date.now() + totalDurationSeconds * 1000;
        localStorage.setItem(`${storagePrefix}_endtime`, targetEndTime.toString());
      }

      const calcRemaining = () => {
        const remaining = Math.max(0, Math.floor((targetEndTime - Date.now()) / 1000));
        setSecondsRemaining(remaining);
        return remaining;
      };

      calcRemaining();
    } catch {
      // Storage fallback
    }
  }, [quiz.id, storagePrefix, totalDurationSeconds, questions.length]);

  // Handle Tab Switch / Focus blur detector
  useEffect(() => {
    if (isSubmitted) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitches((prev) => prev + 1);
        triggerHaptic("heavy");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isSubmitted]);

  const finalizeExam = useCallback(() => {
    const elapsedSeconds = totalDurationSeconds - secondsRemaining;
    const { scorePercentage, correctCount, incorrectCount, unansweredCount } =
      calculateExamScore(questions, userAnswers);

    const isPass = scorePercentage >= quiz.passingScore;

    if (isPass) {
      soundManager.playVictory();
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 },
      });
    } else {
      soundManager.playIncorrect();
    }

    setIsSubmitted(true);
    setShowSubmitModal(false);

    // Save attempt record
    storageService.saveAttempt({
      quizId: quiz.id,
      quizTitle: quiz.title,
      quizCategory: quiz.category,
      passingScore: quiz.passingScore,
      mode: "exam",
      score: scorePercentage,
      totalQuestions: questions.length,
      correctCount,
      incorrectCount,
      unansweredCount,
      timeSpentSeconds: elapsedSeconds,
      passed: isPass,
      userAnswers,
      flaggedQuestions: Array.from(flaggedQuestions),
      tabSwitchCount: tabSwitches,
    });

    // Clean up exam localStorage draft
    try {
      localStorage.removeItem(`${storagePrefix}_answers`);
      localStorage.removeItem(`${storagePrefix}_flags`);
      localStorage.removeItem(`${storagePrefix}_endtime`);
      localStorage.removeItem(`${storagePrefix}_index`);
    } catch {
      // Storage error ignored
    }
  }, [
    totalDurationSeconds,
    secondsRemaining,
    questions,
    userAnswers,
    quiz.passingScore,
    quiz.id,
    quiz.title,
    quiz.category,
    flaggedQuestions,
    tabSwitches,
    storagePrefix,
  ]);

  // Synchronize Timer with Wall-Clock
  useEffect(() => {
    if (isSubmitted) return;

    const interval = setInterval(() => {
      const savedEndTime = localStorage.getItem(`${storagePrefix}_endtime`);
      if (savedEndTime) {
        const target = parseInt(savedEndTime, 10);
        const rem = Math.max(0, Math.floor((target - Date.now()) / 1000));
        setSecondsRemaining(rem);

        // Sound warning on 60 seconds
        if (rem === 60) {
          soundManager.playTimerWarning();
        }

        // Auto-submit when time expires
        if (rem <= 0) {
          clearInterval(interval);
          finalizeExam();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isSubmitted, storagePrefix, finalizeExam]);

  const currentQuestion = questions[currentIndex];
  const currentQIdStr = currentQuestion?.id.toString();
  const currentAnswers = userAnswers[currentQIdStr] || [];

  const handleToggleOption = (option: string) => {
    if (isSubmitted) return;
    triggerHaptic("light");
    let updatedList: string[];
    if (currentQuestion.questionType === "multi_select") {
      updatedList = currentAnswers.includes(option)
        ? currentAnswers.filter((o) => o !== option)
        : [...currentAnswers, option];
    } else {
      updatedList = [option];
    }
    const updated = { ...userAnswers, [currentQIdStr]: updatedList };
    setUserAnswers(updated);
    persistState(updated, flaggedQuestions, currentIndex);
  };

  const handleFillChange = (text: string) => {
    if (isSubmitted) return;
    setFillInputs((prev) => ({ ...prev, [currentQIdStr]: text }));
    const updated = { ...userAnswers, [currentQIdStr]: [text] };
    setUserAnswers(updated);
    persistState(updated, flaggedQuestions, currentIndex);
  };

  const handleToggleFlag = () => {
    triggerHaptic("light");
    const updated = new Set(flaggedQuestions);
    if (updated.has(currentQuestion.id)) {
      updated.delete(currentQuestion.id);
    } else {
      updated.add(currentQuestion.id);
    }
    setFlaggedQuestions(updated);
    persistState(userAnswers, updated, currentIndex);
  };

  const handleJumpToQuestion = (index: number) => {
    triggerHaptic("light");
    setCurrentIndex(index);
    setIsPaletteOpen(false);
    persistState(userAnswers, flaggedQuestions, index);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      triggerHaptic("light");
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      persistState(userAnswers, flaggedQuestions, nextIdx);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      triggerHaptic("light");
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      persistState(userAnswers, flaggedQuestions, prevIdx);
    }
  };

  // Format time remaining MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Metrics summary
  const answeredCount = Object.keys(userAnswers).filter(
    (qid) =>
      userAnswers[qid]?.length > 0 &&
      (questions.find((q) => q.id.toString() === qid)?.questionType !== "fill_blank" ||
        userAnswers[qid][0]?.trim())
  ).length;
  const unansweredCount = questions.length - answeredCount;

  // Post-Exam Evaluation Result
  const examSummary = useMemo(() => {
    if (!isSubmitted) return null;
    return calculateExamScore(questions, userAnswers);
  }, [isSubmitted, questions, userAnswers]);

  // -------------------------------------------------------------
  // POST-EXAM REVIEW SCREEN
  // -------------------------------------------------------------
  if (isSubmitted && examSummary) {
    const isPass = examSummary.scorePercentage >= quiz.passingScore;
    const timeSpent = totalDurationSeconds - secondsRemaining;
    const timeSpentMins = Math.floor(timeSpent / 60);
    const timeSpentSecs = timeSpent % 60;

    const filteredResults = examSummary.questionResults.filter((res) => {
      if (reviewFilter === "correct") return res.isCorrect;
      if (reviewFilter === "incorrect") return !res.isCorrect;
      if (reviewFilter === "flagged") return flaggedQuestions.has(res.question.id);
      return true;
    });

    const missedQuestions = examSummary.questionResults
      .filter((res) => !res.isCorrect)
      .map((res) => res.question);

    return (
      <div id="exam-review-report" className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in duration-300">
        {/* Scorecard Hero Banner */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-10 shadow-lg mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-100">
            <div className="text-center md:text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">
                Official Exam Diagnostic Report
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 mb-1">
                {quiz.title}
              </h2>
              <p className="text-sm text-slate-500">
                Completed on {new Date().toLocaleDateString()} • {quiz.category}
              </p>
            </div>

            {/* Score Ring / Pill */}
            <div className="flex flex-col items-center">
              <div
                className={`w-28 h-28 rounded-full flex flex-col items-center justify-center border-4 shadow-inner ${
                  isPass
                    ? "border-emerald-500 bg-emerald-50/70 text-emerald-950"
                    : "border-rose-500 bg-rose-50/70 text-rose-950"
                }`}
              >
                <span className="text-3xl font-black">{examSummary.scorePercentage}%</span>
                <span className="text-xs font-bold uppercase tracking-wider">
                  {isPass ? "Passed" : "Needs Review"}
                </span>
              </div>
              <span className="text-xs text-slate-500 mt-2 font-medium">
                Pass Threshold: {quiz.passingScore}%
              </span>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <span className="block text-2xl font-bold text-emerald-600">
                {examSummary.correctCount}
              </span>
              <span className="text-xs text-slate-500 font-medium">Correct</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <span className="block text-2xl font-bold text-rose-600">
                {examSummary.incorrectCount}
              </span>
              <span className="text-xs text-slate-500 font-medium">Incorrect</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <span className="block text-2xl font-bold text-slate-600">
                {timeSpentMins}m {timeSpentSecs}s
              </span>
              <span className="text-xs text-slate-500 font-medium">Time Taken</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <span className="block text-2xl font-bold text-amber-600">{tabSwitches}</span>
              <span className="text-xs text-slate-500 font-medium">Tab Switches</span>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap gap-3 mt-8 justify-center sm:justify-start">
            {missedQuestions.length > 0 && onLaunchPracticeWithQuestions && (
              <button
                id="exam-practice-missed-btn"
                onClick={() => {
                  triggerHaptic("medium");
                  onLaunchPracticeWithQuestions(missedQuestions);
                }}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm min-h-[48px] touch-manipulation shadow-md shadow-indigo-600/20 active:scale-[0.98] transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Practice {missedQuestions.length} Missed Questions</span>
              </button>
            )}
            <button
              id="exam-exit-btn"
              onClick={onExit}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm min-h-[48px] touch-manipulation active:scale-[0.98] transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Quiz Catalog</span>
            </button>
          </div>
        </div>

        {/* Detailed Question Review List */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Comprehensive Item Analysis</h3>
              <p className="text-xs text-slate-500">
                Review your submitted answers against canonical solutions and explanations.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80 self-start sm:self-auto">
              <button
                id="filter-all-btn"
                onClick={() => setReviewFilter("all")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl min-h-[36px] transition-all touch-manipulation cursor-pointer ${
                  reviewFilter === "all"
                    ? "bg-white text-indigo-600 shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All ({examSummary.totalQuestions})
              </button>
              <button
                id="filter-incorrect-btn"
                onClick={() => setReviewFilter("incorrect")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl min-h-[36px] transition-all touch-manipulation cursor-pointer ${
                  reviewFilter === "incorrect"
                    ? "bg-white text-rose-600 shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Incorrect ({examSummary.incorrectCount + examSummary.unansweredCount})
              </button>
              <button
                id="filter-correct-btn"
                onClick={() => setReviewFilter("correct")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl min-h-[36px] transition-all touch-manipulation cursor-pointer ${
                  reviewFilter === "correct"
                    ? "bg-white text-emerald-600 shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Correct ({examSummary.correctCount})
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {filteredResults.map((item, idx) => {
              const q = item.question;
              return (
                <div
                  key={q.id}
                  id={`review-item-${q.id}`}
                  className={`p-5 sm:p-6 rounded-2xl border transition-all ${
                    item.isCorrect
                      ? "border-emerald-200/80 bg-emerald-50/20"
                      : "border-rose-200/80 bg-rose-50/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        Q{idx + 1}
                      </span>
                      {item.isCorrect ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-100/80 px-2.5 py-0.5 rounded-full">
                          <XCircle className="w-3.5 h-3.5" /> Incorrect / Unanswered
                        </span>
                      )}
                    </div>
                    {flaggedQuestions.has(q.id) && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        <Bookmark className="w-3 h-3 fill-amber-500 text-amber-500" /> Flagged
                      </span>
                    )}
                  </div>

                  <h4 className="text-base font-bold text-slate-900 mb-4 leading-snug">
                    {q.questionText}
                  </h4>

                  {/* Chosen vs Correct Answers */}
                  <div className="space-y-2 mb-4 text-sm">
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-xs font-semibold text-slate-500 block mb-1">
                        Your Submitted Answer:
                      </span>
                      <span
                        className={`font-medium ${
                          item.isCorrect ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        {item.userAnswers.length > 0
                          ? item.userAnswers.join(", ")
                          : "(No answer provided)"}
                      </span>
                    </div>

                    {!item.isCorrect && (
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                        <span className="text-xs font-semibold text-emerald-800 block mb-1">
                          Canonical Correct Answer:
                        </span>
                        <span className="font-bold text-emerald-950">
                          {q.correctAnswers.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Explanation */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs sm:text-sm text-slate-700 leading-relaxed">
                    <span className="font-bold text-slate-900 block mb-1">Pedagogical Explanation:</span>
                    {q.explanation}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // ACTIVE EXAM INTERACTION VIEW
  // -------------------------------------------------------------
  const isTimeCritical = secondsRemaining < 120; // under 2 mins
  const isFlagged = flaggedQuestions.has(currentQuestion?.id);

  return (
    <div id="exam-active-view" className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
      {/* Sticky Top Proctoring & Timer Header */}
      <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-3 sm:p-4 mb-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          {/* Question Counter & Matrix Button */}
          <div className="flex items-center gap-2">
            <button
              id="exam-palette-btn"
              onClick={() => {
                triggerHaptic("light");
                setIsPaletteOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold min-h-[44px] touch-manipulation cursor-pointer"
              title="Open Question Palette"
            >
              <Grid className="w-4 h-4 text-indigo-600" />
              <span>Palette</span>
            </button>
            <span className="text-xs font-bold text-slate-700">
              Q{currentIndex + 1} of {questions.length}
            </span>
          </div>

          {/* Wall-Clock Resilient Timer */}
          <div
            id="exam-timer-display"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-mono text-sm sm:text-base font-extrabold min-h-[44px] transition-colors ${
              isTimeCritical
                ? "bg-rose-100 text-rose-700 animate-pulse border border-rose-300"
                : "bg-slate-100 text-slate-900 border border-slate-200"
            }`}
          >
            <Clock className={`w-4 h-4 ${isTimeCritical ? "text-rose-600" : "text-slate-500"}`} />
            <span>{formatTime(secondsRemaining)}</span>
          </div>

          {/* Tab Switch Badge & Submit Exam Button */}
          <div className="flex items-center gap-2">
            {tabSwitches > 0 && (
              <div
                id="exam-tab-blur-badge"
                className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold"
                title={`${tabSwitches} window or tab focus changes detected`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>{tabSwitches} blur</span>
              </div>
            )}
            <button
              id="exam-submit-trigger-btn"
              onClick={() => {
                triggerHaptic("medium");
                setShowSubmitModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold min-h-[44px] touch-manipulation shadow-sm shadow-indigo-600/20 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit</span>
            </button>
          </div>
        </div>

        {/* Linear Progress Bar */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full transition-all duration-200"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Question Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-8 shadow-sm mb-6 select-none">
        {/* Card Header: Type badge & Flag for Review Button */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
            {currentQuestion.questionType === "multi_select"
              ? "Multi-Select (Choose all that apply)"
              : currentQuestion.questionType === "fill_blank"
              ? "Fill in the blank"
              : currentQuestion.questionType === "true_false"
              ? "True / False"
              : "Multiple Choice"}
          </span>
          <button
            id="exam-toggle-flag-btn"
            onClick={handleToggleFlag}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold min-h-[44px] touch-manipulation transition-colors cursor-pointer ${
              isFlagged
                ? "bg-amber-100 text-amber-800 border border-amber-300 font-bold"
                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
            }`}
          >
            <Bookmark
              className={`w-3.5 h-3.5 ${isFlagged ? "fill-amber-600 text-amber-600" : "text-slate-400"}`}
            />
            <span>{isFlagged ? "Flagged for Review" : "Flag for Review"}</span>
          </button>
        </div>

        {/* Question Text */}
        <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug mb-6">
          {currentQuestion.questionText}
        </h3>

        {/* Options */}
        {currentQuestion.questionType !== "fill_blank" ? (
          <div className="space-y-3 mb-6">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = currentAnswers.includes(option);
              return (
                <div
                  key={idx}
                  id={`exam-opt-${idx}`}
                  onClick={() => handleToggleOption(option)}
                  className={`w-full flex items-center gap-3.5 p-4 rounded-2xl border transition-all text-sm sm:text-base min-h-[52px] touch-manipulation cursor-pointer ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 font-medium shadow-sm"
                      : "border-slate-200/90 bg-white hover:bg-slate-50 text-slate-800"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-${
                      currentQuestion.questionType === "multi_select" ? "md" : "full"
                    } border ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-slate-300 bg-white"
                    } flex items-center justify-center shrink-0 transition-colors`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="flex-1 text-left leading-relaxed">{option}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mb-6">
            <input
              id="exam-fill-input"
              type="text"
              value={fillInputs[currentQIdStr] || ""}
              onChange={(e) => handleFillChange(e.target.value)}
              placeholder="Enter your concise answer..."
              className="w-full px-4 py-3.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base min-h-[52px] touch-manipulation"
            />
          </div>
        )}

        {/* Action Bar (Previous / Next) */}
        <div className="flex items-center justify-between gap-3 pt-5 border-t border-slate-100">
          <button
            id="exam-prev-btn"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold min-h-[48px] touch-manipulation disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {currentIndex < questions.length - 1 ? (
            <button
              id="exam-next-btn"
              onClick={handleNext}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold min-h-[48px] touch-manipulation shadow-md shadow-indigo-600/20 active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              id="exam-review-submit-btn"
              onClick={() => {
                triggerHaptic("medium");
                setShowSubmitModal(true);
              }}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold min-h-[48px] touch-manipulation shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Review & Submit</span>
            </button>
          )}
        </div>
      </div>

      {/* ----------------- QUESTION PALETTE MODAL / DRAWER ----------------- */}
      {isPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Grid className="w-5 h-5 text-indigo-600" />
                <span>Question Palette</span>
              </h4>
              <button
                id="close-palette-btn"
                onClick={() => setIsPaletteOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 text-xs mb-5 text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-indigo-600 inline-block" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-amber-400 inline-block" />
                <span>Flagged</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-slate-200 inline-block" />
                <span>Unanswered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md border-2 border-indigo-600 inline-block" />
                <span>Current</span>
              </div>
            </div>

            {/* Grid of question buttons */}
            <div className="grid grid-cols-5 sm:grid-cols-6 gap-2.5 max-h-[60vh] overflow-y-auto p-1">
              {questions.map((q, idx) => {
                const qid = q.id.toString();
                const isAns =
                  userAnswers[qid]?.length > 0 &&
                  (q.questionType !== "fill_blank" || userAnswers[qid][0]?.trim());
                const isFlg = flaggedQuestions.has(q.id);
                const isCurr = currentIndex === idx;

                let btnStyle = "bg-slate-100 text-slate-700 hover:bg-slate-200";
                if (isFlg) {
                  btnStyle = "bg-amber-100 text-amber-900 font-bold border border-amber-400";
                } else if (isAns) {
                  btnStyle = "bg-indigo-600 text-white font-bold";
                }

                if (isCurr) {
                  btnStyle += " ring-2 ring-indigo-600 ring-offset-2";
                }

                return (
                  <button
                    key={q.id}
                    id={`palette-item-${idx}`}
                    onClick={() => handleJumpToQuestion(idx)}
                    className={`h-11 rounded-xl flex items-center justify-center text-sm font-semibold touch-manipulation transition-all cursor-pointer ${btnStyle}`}
                  >
                    <span>{idx + 1}</span>
                    {isFlg && <Bookmark className="w-2.5 h-2.5 fill-amber-500 text-amber-500 ml-0.5" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <button
                id="close-palette-footer-btn"
                onClick={() => setIsPaletteOpen(false)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold min-h-[48px] touch-manipulation cursor-pointer"
              >
                Close Palette
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- SUBMISSION CONFIRMATION MODAL ----------------- */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-indigo-600" />
            </div>

            <h3 className="text-xl font-bold text-center text-slate-900 mb-2">
              Ready to Submit Exam?
            </h3>
            <p className="text-xs sm:text-sm text-center text-slate-500 mb-6">
              Review your progress before final evaluation. Once submitted, your answers will be
              graded immediately.
            </p>

            {/* Breakdown summary */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2.5 mb-6 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Answered Questions:</span>
                <span className="font-bold text-emerald-600">
                  {answeredCount} / {questions.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Unanswered Questions:</span>
                <span className={`font-bold ${unansweredCount > 0 ? "text-rose-600" : "text-slate-400"}`}>
                  {unansweredCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Flagged for Review:</span>
                <span className={`font-bold ${flaggedQuestions.size > 0 ? "text-amber-600" : "text-slate-400"}`}>
                  {flaggedQuestions.size}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Remaining Time:</span>
                <span className="font-bold font-mono text-slate-800">
                  {formatTime(secondsRemaining)}
                </span>
              </div>
            </div>

            {unansweredCount > 0 && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 mb-6 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  You still have {unansweredCount} unanswered questions! Unanswered questions receive 0 points.
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                id="exam-continue-btn"
                onClick={() => setShowSubmitModal(false)}
                className="py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold min-h-[48px] touch-manipulation cursor-pointer"
              >
                Continue Exam
              </button>
              <button
                id="exam-confirm-submit-btn"
                onClick={finalizeExam}
                className="py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold min-h-[48px] touch-manipulation shadow-md shadow-indigo-600/20 active:scale-[0.98] transition-all cursor-pointer"
              >
                Yes, Submit Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
