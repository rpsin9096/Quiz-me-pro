import { useState, useCallback } from "react";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  RotateCw,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Check,
  Flame,
  Shuffle,
  Award,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { QuestionData, QuizItem, RetentionRating } from "@/types";
import { evaluateAnswer } from "@/lib/scoring";
import { soundManager, triggerHaptic } from "@/lib/sound";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { storageService } from "@/lib/storage";

interface PracticeModeProps {
  quiz: QuizItem;
  questions: QuestionData[];
  onExit: () => void;
}

export function PracticeMode({ quiz, questions: initialQuestions, onExit }: PracticeModeProps) {
  const [questions, setQuestions] = useState<QuestionData[]>(initialQuestions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"quiz" | "flashcard">("quiz");

  // Question state
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [fillInput, setFillInput] = useState("");
  const [isChecked, setIsChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Flashcard flip state
  const [isFlipped, setIsFlipped] = useState(false);

  // Session stats
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [, setCompletedIndices] = useState<Set<number>>(new Set());
  const [correctIndices, setCorrectIndices] = useState<Set<number>>(new Set());
  const [isFinished, setIsFinished] = useState(false);

  const currentQuestion = questions[currentIndex];

  // Reset answer state when changing question
  const resetQuestionState = useCallback(() => {
    setSelectedAnswers([]);
    setFillInput("");
    setIsChecked(false);
    setIsCorrect(false);
    setShowHint(false);
    setIsFlipped(false);
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      triggerHaptic("light");
      setCurrentIndex((prev) => prev + 1);
      resetQuestionState();
    } else {
      setIsFinished(true);
      soundManager.playVictory();
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  }, [currentIndex, questions.length, resetQuestionState]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      triggerHaptic("light");
      setCurrentIndex((prev) => prev - 1);
      resetQuestionState();
    }
  }, [currentIndex, resetQuestionState]);

  const handleSpacedRepetition = useCallback(
    (rating: RetentionRating) => {
      triggerHaptic("medium");
      if (rating === "good" || rating === "easy") {
        soundManager.playCorrect();
      } else {
        soundManager.playIncorrect();
      }

      if (currentQuestion) {
        storageService.recordSpacedReview(currentQuestion.id, rating);
      }

      setCompletedIndices((prev) => new Set(prev).add(currentIndex));
      handleNext();
    },
    [currentQuestion, currentIndex, handleNext]
  );

  // Touch Swipe Gesture Handling
  const { touchHandlers, dragOffset, isDragging, activeDirection } = useSwipeGesture({
    onSwipeLeft: () => {
      if (viewMode === "flashcard" && isFlipped) {
        handleSpacedRepetition("again");
      } else {
        handleNext();
      }
    },
    onSwipeRight: () => {
      if (viewMode === "flashcard" && isFlipped) {
        handleSpacedRepetition("good");
      } else {
        handlePrev();
      }
    },
    threshold: 60,
  });

  const handleToggleOption = (option: string) => {
    if (isChecked) return;
    triggerHaptic("light");
    if (currentQuestion.questionType === "multi_select") {
      setSelectedAnswers((prev) =>
        prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
      );
    } else {
      setSelectedAnswers([option]);
    }
  };

  const handleCheckAnswer = () => {
    if (isChecked) return;
    const userAns =
      currentQuestion.questionType === "fill_blank" ? [fillInput.trim()] : selectedAnswers;
    if (userAns.length === 0 || !userAns[0]) return;

    const evalResult = evaluateAnswer(currentQuestion, userAns);
    setIsChecked(true);
    setIsCorrect(evalResult.isCorrect);
    setCompletedIndices((prev) => new Set(prev).add(currentIndex));

    if (evalResult.isCorrect) {
      soundManager.playCorrect();
      triggerHaptic("success");
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      if (nextStreak > maxStreak) setMaxStreak(nextStreak);
      setCorrectIndices((prev) => new Set(prev).add(currentIndex));

      // Record spaced repetition progress in background
      storageService.recordSpacedReview(currentQuestion.id, "good");

      // Milestone confetti
      if (nextStreak === 3 || nextStreak === 5 || nextStreak === 10) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      }
    } else {
      soundManager.playIncorrect();
      triggerHaptic("error");
      setStreak(0);
      storageService.recordSpacedReview(currentQuestion.id, "again");
    }
  };

  const handleShuffle = () => {
    triggerHaptic("medium");
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    setQuestions(shuffled);
    setCurrentIndex(0);
    resetQuestionState();
  };

  const handleRestart = () => {
    triggerHaptic("medium");
    setCurrentIndex(0);
    setCompletedIndices(new Set());
    setCorrectIndices(new Set());
    setStreak(0);
    setIsFinished(false);
    resetQuestionState();
  };

  // Render Finished Screen
  if (isFinished) {
    const total = questions.length;
    const correctCount = correctIndices.size;
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    return (
      <div id="practice-finished-screen" className="max-w-2xl mx-auto px-4 py-8 animate-in fade-in duration-300">
        <div className="bg-white rounded-3xl border border-slate-200/90 p-8 text-center shadow-lg">
          <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-5">
            <Award className="w-10 h-10 animate-bounce" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
            Practice Session Completed!
          </h2>
          <p className="text-slate-600 mb-6">
            Great work! You reviewed all {total} questions in {quiz.title}.
          </p>

          <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-8">
            <div className="p-3">
              <span className="block text-2xl font-black text-indigo-600">{accuracy}%</span>
              <span className="text-xs text-slate-500 font-medium">Accuracy</span>
            </div>
            <div className="p-3 border-x border-slate-200">
              <span className="block text-2xl font-black text-emerald-600">
                {correctCount} / {total}
              </span>
              <span className="text-xs text-slate-500 font-medium">Correct</span>
            </div>
            <div className="p-3">
              <span className="block text-2xl font-black text-amber-500">{maxStreak}</span>
              <span className="text-xs text-slate-500 font-medium">Best Streak</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              id="practice-restart-btn"
              onClick={handleRestart}
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold min-h-[48px] touch-manipulation shadow-md shadow-indigo-600/20 active:scale-[0.98] transition-all cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
              <span>Practice Again</span>
            </button>
            <button
              id="practice-exit-btn"
              onClick={onExit}
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold min-h-[48px] touch-manipulation active:scale-[0.98] transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Quizzes</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="practice-mode-view" className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
      {/* Top Navigation & Controls */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <button
          id="practice-exit-top-btn"
          onClick={() => {
            triggerHaptic("light");
            onExit();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium min-h-[44px] touch-manipulation transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Exit</span>
        </button>

        {/* View Mode Switcher: Question vs Flashcard */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
          <button
            id="viewmode-quiz-btn"
            onClick={() => {
              triggerHaptic("light");
              setViewMode("quiz");
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl min-h-[36px] transition-all touch-manipulation cursor-pointer ${
              viewMode === "quiz"
                ? "bg-white text-indigo-600 shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Quiz Mode
          </button>
          <button
            id="viewmode-flashcard-btn"
            onClick={() => {
              triggerHaptic("light");
              setViewMode("flashcard");
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl min-h-[36px] transition-all touch-manipulation cursor-pointer ${
              viewMode === "flashcard"
                ? "bg-white text-indigo-600 shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Flashcards (3D)
          </button>
        </div>

        {/* Action Controls: Shuffle & Streak */}
        <div className="flex items-center gap-2">
          <button
            id="practice-shuffle-btn"
            onClick={handleShuffle}
            className="flex items-center justify-center p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 min-h-[44px] min-w-[44px] touch-manipulation cursor-pointer"
            title="Shuffle questions"
          >
            <Shuffle className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 min-h-[44px]">
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span className="text-xs font-bold">{streak}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
          <span>
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span>{Math.round(((currentIndex + 1) / questions.length) * 100)}% Complete</span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Interactive Workspace */}
      <div
        {...touchHandlers}
        style={{
          transform: `translateX(${dragOffset.x}px) rotate(${dragOffset.x * 0.03}deg)`,
          transition: isDragging ? "none" : "transform 0.25s ease-out",
        }}
        className="relative select-none touch-manipulation"
      >
        {/* Visual Swipe Direction Indicators */}
        {activeDirection === "right" && (
          <div className="absolute top-4 left-4 z-30 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold shadow-lg animate-pulse">
            {viewMode === "flashcard" ? "Good / Mastered" : "Previous"}
          </div>
        )}
        {activeDirection === "left" && (
          <div className="absolute top-4 right-4 z-30 px-3 py-1 rounded-full bg-rose-500 text-white text-xs font-bold shadow-lg animate-pulse">
            {viewMode === "flashcard" ? "Again / Study" : "Next"}
          </div>
        )}

        {/* ----------------- FLASHCARD MODE (3D FLIP) ----------------- */}
        {viewMode === "flashcard" ? (
          <div className="perspective-1000 min-h-[400px]">
            <div
              id="flashcard-3d-card"
              onClick={() => {
                soundManager.playFlip();
                triggerHaptic("light");
                setIsFlipped(!isFlipped);
              }}
              className={`relative w-full min-h-[380px] sm:min-h-[420px] rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 shadow-md cursor-pointer transition-transform duration-500 transform-style-3d flex flex-col justify-between ${
                isFlipped ? "rotate-y-180" : ""
              }`}
            >
              {/* Front of Flashcard */}
              <div
                className={`backface-hidden flex flex-col justify-between h-full ${
                  isFlipped ? "invisible" : ""
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold tracking-wider uppercase text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                      Question Card
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <RotateCw className="w-3.5 h-3.5" /> Tap card to flip
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug mt-4">
                    {currentQuestion.questionText}
                  </h3>
                  {currentQuestion.hint && (
                    <div className="mt-6 p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200/60 text-xs text-amber-800 flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>{currentQuestion.hint}</span>
                    </div>
                  )}
                </div>
                <div className="pt-6 border-t border-slate-100 text-center">
                  <span className="text-xs font-medium text-slate-400">
                    Swipe or tap to reveal the answer
                  </span>
                </div>
              </div>

              {/* Back of Flashcard (Answer & Explanation) */}
              <div
                className={`backface-hidden rotate-y-180 flex flex-col justify-between h-full ${
                  !isFlipped ? "invisible" : ""
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold tracking-wider uppercase text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                      Correct Answer
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <RotateCw className="w-3.5 h-3.5" /> Tap to flip back
                    </span>
                  </div>
                  <div className="space-y-2 mb-4">
                    {currentQuestion.correctAnswers.map((ans, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-200 text-sm font-bold text-emerald-900 flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{ans}</span>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs sm:text-sm text-slate-700 leading-relaxed">
                    <span className="font-bold text-slate-900 block mb-1">Explanation:</span>
                    {currentQuestion.explanation}
                  </div>
                </div>

                {/* Spaced Repetition Rating Buttons */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="pt-4 border-t border-slate-100"
                >
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center mb-2">
                    How well did you know this? (SM-2 Interval)
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      id="sm2-rating-again"
                      onClick={() => handleSpacedRepetition("again")}
                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold min-h-[48px] touch-manipulation cursor-pointer"
                    >
                      <span>Again</span>
                      <span className="text-[10px] font-normal text-rose-500">&lt; 1d</span>
                    </button>
                    <button
                      id="sm2-rating-hard"
                      onClick={() => handleSpacedRepetition("hard")}
                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold min-h-[48px] touch-manipulation cursor-pointer"
                    >
                      <span>Hard</span>
                      <span className="text-[10px] font-normal text-amber-500">2d</span>
                    </button>
                    <button
                      id="sm2-rating-good"
                      onClick={() => handleSpacedRepetition("good")}
                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold min-h-[48px] touch-manipulation cursor-pointer"
                    >
                      <span>Good</span>
                      <span className="text-[10px] font-normal text-blue-500">4d</span>
                    </button>
                    <button
                      id="sm2-rating-easy"
                      onClick={() => handleSpacedRepetition("easy")}
                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold min-h-[48px] touch-manipulation cursor-pointer"
                    >
                      <span>Easy</span>
                      <span className="text-[10px] font-normal text-emerald-500">7d</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ----------------- QUIZ PRACTICE MODE ----------------- */
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-8 shadow-sm">
            {/* Question Header */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="text-xs font-bold tracking-wider uppercase text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                {currentQuestion.questionType === "multi_select"
                  ? "Multi-Select (Choose all that apply)"
                  : currentQuestion.questionType === "fill_blank"
                  ? "Fill in the blank"
                  : currentQuestion.questionType === "true_false"
                  ? "True / False"
                  : "Multiple Choice"}
              </span>
              {currentQuestion.hint && (
                <button
                  id="practice-hint-toggle"
                  onClick={() => {
                    triggerHaptic("light");
                    setShowHint(!showHint);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg transition-colors min-h-[36px] touch-manipulation cursor-pointer"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                  <span>{showHint ? "Hide Hint" : "Hint"}</span>
                </button>
              )}
            </div>

            {/* Hint Box */}
            {showHint && currentQuestion.hint && (
              <div className="mb-4 p-3.5 bg-amber-50/90 rounded-2xl border border-amber-200 text-xs text-amber-800 flex items-start gap-2 animate-in fade-in">
                <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{currentQuestion.hint}</span>
              </div>
            )}

            {/* Question Text */}
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug mb-6">
              {currentQuestion.questionText}
            </h3>

            {/* Options list for Multiple Choice, Multi Select, True/False */}
            {currentQuestion.questionType !== "fill_blank" ? (
              <div className="space-y-2.5 mb-6">
                {currentQuestion.options.map((opt, idx) => {
                  const isSelected = selectedAnswers.includes(opt);
                  const isCorrectAnswer = currentQuestion.correctAnswers.some(
                    (ca) => ca.trim().toLowerCase() === opt.trim().toLowerCase()
                  );

                  let itemStyle = "border-slate-200/90 bg-white hover:bg-slate-50 text-slate-800";
                  let icon = (
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
                  );

                  if (isChecked) {
                    if (isCorrectAnswer) {
                      itemStyle = "border-emerald-500 bg-emerald-50/90 text-emerald-900 font-medium";
                      icon = <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
                    } else if (isSelected && !isCorrectAnswer) {
                      itemStyle = "border-rose-400 bg-rose-50/90 text-rose-900";
                      icon = <XCircle className="w-5 h-5 text-rose-600 shrink-0" />;
                    } else {
                      itemStyle = "border-slate-100 bg-slate-50/50 text-slate-400 opacity-60";
                    }
                  } else if (isSelected) {
                    itemStyle = "border-indigo-600 bg-indigo-50/60 text-indigo-950 font-medium shadow-sm";
                  }

                  return (
                    <div
                      key={idx}
                      id={`practice-opt-${idx}`}
                      onClick={() => handleToggleOption(opt)}
                      className={`w-full flex items-center gap-3.5 p-4 rounded-2xl border transition-all text-sm sm:text-base min-h-[52px] touch-manipulation cursor-pointer ${itemStyle}`}
                    >
                      {icon}
                      <span className="flex-1 text-left leading-relaxed">{opt}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Fill in the blank input */
              <div className="mb-6">
                <input
                  id="practice-fill-input"
                  type="text"
                  value={fillInput}
                  disabled={isChecked}
                  onChange={(e) => setFillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isChecked && fillInput.trim()) {
                      handleCheckAnswer();
                    }
                  }}
                  placeholder="Type your answer here..."
                  className="w-full px-4 py-3.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base min-h-[50px] touch-manipulation disabled:bg-slate-100"
                />
              </div>
            )}

            {/* Explanation box after checking */}
            {isChecked && (
              <div
                id="practice-explanation-box"
                className={`mb-6 p-4 rounded-2xl border animate-in fade-in duration-200 ${
                  isCorrect
                    ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                    : "bg-rose-50/80 border-rose-200 text-rose-900"
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1.5">
                  {isCorrect ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>Correct!</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-rose-600" />
                      <span>Incorrect</span>
                    </>
                  )}
                </div>
                {!isCorrect && (
                  <p className="text-xs font-semibold mb-2">
                    Correct answer: {currentQuestion.correctAnswers.join(", ")}
                  </p>
                )}
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  <span className="font-semibold text-slate-900">Explanation: </span>
                  {currentQuestion.explanation}
                </p>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                id="practice-prev-btn"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium min-h-[48px] touch-manipulation disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              {!isChecked ? (
                <button
                  id="practice-check-btn"
                  onClick={handleCheckAnswer}
                  disabled={
                    currentQuestion.questionType === "fill_blank"
                      ? !fillInput.trim()
                      : selectedAnswers.length === 0
                  }
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold min-h-[48px] touch-manipulation disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <span>Check Answer</span>
                </button>
              ) : (
                <button
                  id="practice-next-btn"
                  onClick={handleNext}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold min-h-[48px] touch-manipulation shadow-md shadow-indigo-600/20 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <span>{currentIndex < questions.length - 1 ? "Next Question" : "Finish Practice"}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Swipe Tip Footer on Touch devices */}
      <div className="mt-4 text-center text-[11px] text-slate-400">
        Tip: Swipe left/right on cards to navigate seamlessly on touchscreens
      </div>
    </div>
  );
}
