import { QuestionData, EvaluationResult } from "@/types";

/**
 * Normalizes text for fill-in-the-blank questions
 * Removes extra whitespace, punctuation, case variations
 */
export function normalizeAnswerText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Evaluates user answers against expected correct answers
 */
export function evaluateAnswer(
  question: QuestionData,
  userSelected: string[] | string | undefined | null
): EvaluationResult {
  const selected: string[] = Array.isArray(userSelected)
    ? userSelected
    : userSelected
    ? [userSelected]
    : [];

  const correct = question.correctAnswers || [];

  if (question.questionType === "fill_blank") {
    if (selected.length === 0 || !selected[0]?.trim()) {
      return { isCorrect: false, userAnswers: selected, correctAnswers: correct };
    }
    const normalizedUser = normalizeAnswerText(selected[0]);
    // Match if any acceptable correct answer matches normalized
    const isCorrect = correct.some((ans) => {
      const normalizedAns = normalizeAnswerText(ans);
      return normalizedAns === normalizedUser;
    });
    return { isCorrect, userAnswers: selected, correctAnswers: correct };
  }

  if (question.questionType === "multi_select") {
    // Both sets must match completely
    if (selected.length === 0) {
      return { isCorrect: false, userAnswers: selected, correctAnswers: correct };
    }
    const selectedSet = new Set(selected.map((s) => s.trim().toLowerCase()));
    const correctSet = new Set(correct.map((c) => c.trim().toLowerCase()));

    if (selectedSet.size !== correctSet.size) {
      return { isCorrect: false, userAnswers: selected, correctAnswers: correct };
    }

    for (const item of selectedSet) {
      if (!correctSet.has(item)) {
        return { isCorrect: false, userAnswers: selected, correctAnswers: correct };
      }
    }

    return { isCorrect: true, userAnswers: selected, correctAnswers: correct };
  }

  // multiple_choice & true_false: single match
  if (selected.length === 0) {
    return { isCorrect: false, userAnswers: selected, correctAnswers: correct };
  }

  const isCorrect = correct.some(
    (c) => c.trim().toLowerCase() === selected[0].trim().toLowerCase()
  );

  return { isCorrect, userAnswers: selected, correctAnswers: correct };
}

/**
 * Calculates exam summary score and metrics
 */
export function calculateExamScore(
  questions: QuestionData[],
  userAnswersMap: Record<string, string[]>
) {
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  const questionResults = questions.map((q) => {
    const userAnswers = userAnswersMap[q.id.toString()] || [];
    const hasAnswered =
      userAnswers.length > 0 &&
      (q.questionType !== "fill_blank" || userAnswers[0]?.trim().length > 0);

    if (!hasAnswered) {
      unansweredCount++;
      return {
        question: q,
        userAnswers: [],
        isCorrect: false,
        isAnswered: false,
      };
    }

    const evalResult = evaluateAnswer(q, userAnswers);
    if (evalResult.isCorrect) {
      correctCount++;
    } else {
      incorrectCount++;
    }

    return {
      question: q,
      userAnswers,
      isCorrect: evalResult.isCorrect,
      isAnswered: true,
    };
  });

  const total = questions.length;
  const scorePercentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  return {
    scorePercentage,
    correctCount,
    incorrectCount,
    unansweredCount,
    totalQuestions: total,
    questionResults,
  };
}
