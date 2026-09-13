export type QuestionType = "multiple_choice" | "multi_select" | "true_false" | "fill_blank";

export interface QuestionData {
  id: number;
  quizId: number;
  questionText: string;
  questionType: QuestionType;
  options: string[];
  correctAnswers: string[];
  explanation: string;
  hint?: string | null;
  orderNum?: number;
}

export interface EvaluationResult {
  isCorrect: boolean;
  userAnswers: string[];
  correctAnswers: string[];
  isPartial?: boolean;
}

export interface QuizItem {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  category: string;
  difficulty: string; // "beginner" | "intermediate" | "advanced"
  timeLimitMinutes: number;
  passingScore: number;
  icon?: string | null;
  isCustom?: boolean;
  questionCount?: number;
}

export interface AttemptRecord {
  id: number;
  quizId: number;
  quizTitle: string;
  quizCategory: string;
  passingScore: number;
  mode: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  timeSpentSeconds: number;
  passed: boolean;
  userAnswers: Record<string, string[]>;
  flaggedQuestions: number[];
  tabSwitchCount: number;
  completedAt: string;
}

export type RetentionRating = "again" | "hard" | "good" | "easy";

export interface SpacedRepetitionItem {
  questionId: number;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  masteryLevel: "new" | "learning" | "review" | "mastered";
  lastReviewed: string;
  nextReview: string;
}
