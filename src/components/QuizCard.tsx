import {
  Clock,
  Award,
  Play,
  RotateCcw,
  Trash2,
  Code,
  Activity,
  Shield,
  Globe,
  Atom,
  BookOpen,
} from "lucide-react";
import { QuizItem } from "@/types";
import { triggerHaptic } from "@/lib/sound";

interface QuizCardProps {
  key?: number | string;
  quiz: QuizItem;
  onStartPractice: (quizId: number) => void;
  onStartExam: (quizId: number) => void;
  onDeleteCustom?: (quizId: number) => void;
}

export function QuizCard({ quiz, onStartPractice, onStartExam, onDeleteCustom }: QuizCardProps) {
  const getIcon = () => {
    switch (quiz.icon || quiz.category.toLowerCase()) {
      case "code":
      case "computer science":
        return <Code className="w-6 h-6 text-indigo-600" />;
      case "activity":
      case "medicine & biology":
        return <Activity className="w-6 h-6 text-rose-600" />;
      case "shield":
      case "cybersecurity":
        return <Shield className="w-6 h-6 text-emerald-600" />;
      case "globe":
      case "world history":
        return <Globe className="w-6 h-6 text-amber-600" />;
      case "atom":
      case "science & physics":
        return <Atom className="w-6 h-6 text-cyan-600" />;
      default:
        return <BookOpen className="w-6 h-6 text-violet-600" />;
    }
  };

  const getDifficultyBadge = () => {
    switch (quiz.difficulty.toLowerCase()) {
      case "beginner":
        return (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Beginner
          </span>
        );
      case "advanced":
        return (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            Advanced
          </span>
        );
      case "intermediate":
      default:
        return (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            Intermediate
          </span>
        );
    }
  };

  return (
    <div
      id={`quiz-card-${quiz.id}`}
      className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
    >
      <div>
        {/* Top Header: Icon & Category & Badges */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              {getIcon()}
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {quiz.category}
              </span>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                {quiz.title}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {getDifficultyBadge()}
            {quiz.isCustom && onDeleteCustom && (
              <button
                id={`delete-quiz-${quiz.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic("medium");
                  onDeleteCustom(quiz.id);
                }}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors touch-manipulation cursor-pointer"
                title="Delete custom quiz"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-600 line-clamp-2 mb-5 leading-relaxed">
          {quiz.description || "Comprehensive subject mastery quiz with interactive practice and timed test."}
        </p>

        {/* Metadata info row */}
        <div className="grid grid-cols-3 gap-2 py-3 px-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 mb-6">
          <div className="flex flex-col items-center justify-center text-center">
            <span className="font-bold text-slate-900 text-sm">
              {quiz.questionCount ?? 8}
            </span>
            <span className="text-[11px] text-slate-500">Questions</span>
          </div>
          <div className="flex flex-col items-center justify-center text-center border-x border-slate-200">
            <span className="font-bold text-slate-900 text-sm flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {quiz.timeLimitMinutes}m
            </span>
            <span className="text-[11px] text-slate-500">Time Limit</span>
          </div>
          <div className="flex flex-col items-center justify-center text-center">
            <span className="font-bold text-slate-900 text-sm flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-slate-400" />
              {quiz.passingScore}%
            </span>
            <span className="text-[11px] text-slate-500">To Pass</span>
          </div>
        </div>
      </div>

      {/* Action Buttons: Practice Mode vs Timed Exam */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
        <button
          id={`btn-practice-${quiz.id}`}
          onClick={() => {
            triggerHaptic("medium");
            onStartPractice(quiz.id);
          }}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 font-semibold text-sm transition-all min-h-[48px] touch-manipulation active:scale-[0.98] cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 text-indigo-600" />
          <span>Practice Mode</span>
        </button>
        <button
          id={`btn-exam-${quiz.id}`}
          onClick={() => {
            triggerHaptic("medium");
            onStartExam(quiz.id);
          }}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition-all min-h-[48px] touch-manipulation active:scale-[0.98] cursor-pointer"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>Timed Exam</span>
        </button>
      </div>
    </div>
  );
}
