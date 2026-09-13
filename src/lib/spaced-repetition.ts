import { SpacedRepetitionItem, RetentionRating } from "@/types";

// SuperMemo-2 (SM-2) Spaced Repetition Algorithm
export function calculateNextReview(
  current: {
    easeFactor: number;
    intervalDays: number;
    repetitions: number;
    masteryLevel: "new" | "learning" | "review" | "mastered";
  },
  rating: RetentionRating
): {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  masteryLevel: "new" | "learning" | "review" | "mastered";
} {
  let { easeFactor, intervalDays, repetitions } = current;

  // Grade mapping to SM-2 scale (0-5)
  // again = 1, hard = 2, good = 4, easy = 5
  let grade = 4;
  if (rating === "again") grade = 1;
  else if (rating === "hard") grade = 2;
  else if (rating === "good") grade = 4;
  else if (rating === "easy") grade = 5;

  if (grade < 3) {
    // Incorrect or blackout
    repetitions = 0;
    intervalDays = 1;
  } else {
    // Correct
    if (repetitions === 0) {
      intervalDays = 1;
    } else if (repetitions === 1) {
      intervalDays = grade === 5 ? 4 : 2;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
      if (grade === 5) {
        intervalDays = Math.round(intervalDays * 1.3);
      }
    }
    repetitions += 1;
  }

  // Update ease factor: EF' = EF + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
  easeFactor = easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  // Determine mastery level
  let masteryLevel: "new" | "learning" | "review" | "mastered" = "learning";
  if (repetitions >= 4 && intervalDays >= 14) {
    masteryLevel = "mastered";
  } else if (repetitions >= 2) {
    masteryLevel = "review";
  } else if (repetitions === 0) {
    masteryLevel = "learning";
  }

  return {
    easeFactor: Math.round(easeFactor * 100) / 100,
    intervalDays,
    repetitions,
    masteryLevel,
  };
}
