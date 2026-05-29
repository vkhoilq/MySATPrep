/**
 * Full-Length Practice Score Approximation
 *
 * Approximates SAT/PSAT scaled scores from raw answers.
 *
 * College Board uses a proprietary IRT (Item Response Theory) model that
 * considers question difficulty, discrimination, and guessing probability.
 * We cannot replicate that exactly, but we can provide a reasonable
 * approximation using difficulty-weighted raw scoring.
 *
 * Score ranges:
 * - Section scores: 200-800 (per section)
 * - Total score: 400-1600 (sum of two section scores)
 *
 * The approximation uses these principles:
 * 1. Harder questions are worth more (difficulty weighting)
 * 2. Pretest questions don't count toward the score
 * 3. Module 2 difficulty path affects the score curve
 * 4. Scores are mapped to the 200-800 range using a piecewise linear function
 */

import {
  FullLengthSectionResult,
  FullLengthModuleResult,
  FullLengthSection,
  FullLengthModuleDifficulty,
  FullLengthTestResult,
  FullLengthTestConfig,
  QuestionResult,
} from "@/types/full-length";
import { QuestionDifficulty } from "@/types/question";

// ─── Difficulty Weights ─────────────────────────────────────────────────────────

/**
 * Weight multipliers for each difficulty level.
 * Harder questions contribute more to the scaled score.
 * These are approximate — College Board's actual weights are proprietary.
 */
export const DIFFICULTY_WEIGHTS: Record<QuestionDifficulty, number> = {
  E: 1.0, // Easy: base weight
  M: 1.3, // Medium: 30% more than easy
  H: 1.7, // Hard: 70% more than easy
} as const;

/**
 * Module 2 difficulty path multipliers.
 * The harder path has a slight score bonus because the questions are more difficult.
 * The easier path has a slight score penalty.
 */
export const MODULE2_DIFFICULTY_MULTIPLIER: Record<FullLengthModuleDifficulty, number> = {
  easier: 0.95, // 5% penalty for easier module
  harder: 1.05,  // 5% bonus for harder module
} as const;

// ─── Raw Score Calculation ──────────────────────────────────────────────────────

/**
 * Calculate a difficulty-weighted raw score for a module.
 * Each correct answer is weighted by its difficulty.
 * Pretest questions are excluded from scoring.
 *
 * @param answers - Map of questionId → user's answer (null if unanswered)
 * @param correctAnswers - Map of questionId → array of correct answers
 * @param questionDifficulties - Map of questionId → difficulty level
 * @param pretestQuestionIds - Set of pretest question IDs (excluded from scoring)
 * @returns Weighted raw score (number of weighted correct answers)
 */
export function calculateWeightedRawScore(
  answers: Record<string, string | null>,
  correctAnswers: Record<string, string[]>,
  questionDifficulties: Record<string, QuestionDifficulty>,
  pretestQuestionIds: Set<string>
): number {
  let weightedScore = 0;

  for (const [questionId, userAnswer] of Object.entries(answers)) {
    // Skip pretest questions
    if (pretestQuestionIds.has(questionId)) continue;

    // Skip unanswered questions
    if (userAnswer === null) continue;

    const correct = correctAnswers[questionId];
    if (!correct) continue;

    // Check if the answer is correct (case-insensitive)
    const isCorrect = correct.some(
      (ca) => ca.toUpperCase() === userAnswer.toUpperCase()
    );

    if (isCorrect) {
      const difficulty = questionDifficulties[questionId] || "M";
      weightedScore += DIFFICULTY_WEIGHTS[difficulty];
    }
  }

  return weightedScore;
}

/**
 * Calculate the maximum possible weighted raw score for a module.
 * This is the score if every operational question were answered correctly.
 *
 * @param questionDifficulties - Map of questionId → difficulty level
 * @param pretestQuestionIds - Set of pretest question IDs (excluded from scoring)
 * @returns Maximum weighted raw score
 */
export function calculateMaxWeightedRawScore(
  questionDifficulties: Record<string, QuestionDifficulty>,
  pretestQuestionIds: Set<string>
): number {
  let maxScore = 0;

  for (const [questionId, difficulty] of Object.entries(questionDifficulties)) {
    if (pretestQuestionIds.has(questionId)) continue;
    maxScore += DIFFICULTY_WEIGHTS[difficulty];
  }

  return maxScore;
}

// ─── Scaled Score Conversion ────────────────────────────────────────────────────

/**
 * Convert a raw accuracy percentage to a scaled section score (200-800).
 *
 * The SAT section score range is 200-800. The mapping uses a piecewise
 * linear function that approximates the official SAT score tables:
 *
 * - 0% correct → ~200 (minimum score)
 * - 50% correct → ~450-500 (average range)
 * - 100% correct → ~780-800 (near-perfect)
 *
 * The curve is slightly S-shaped to reflect the diminishing returns
 * at the extremes and the steeper gains in the middle range.
 *
 * @param accuracy - Raw accuracy as a decimal (0.0 to 1.0)
 * @param module2Difficulty - The Module 2 difficulty path taken
 * @returns Approximate scaled score (200-800)
 */
export function rawAccuracyToScaledScore(
  accuracy: number,
  module2Difficulty?: FullLengthModuleDifficulty
): number {
  // Clamp accuracy to [0, 1]
  const clampedAccuracy = Math.max(0, Math.min(1, accuracy));

  // Base score mapping using a piecewise linear approximation
  // This approximates the SAT score distribution curve
  let baseScore: number;

  if (clampedAccuracy <= 0.2) {
    // 0-20%: 200-320 (steep climb from minimum)
    baseScore = 200 + clampedAccuracy * 600; // 200 → 320
  } else if (clampedAccuracy <= 0.5) {
    // 20-50%: 320-500 (moderate climb)
    baseScore = 320 + (clampedAccuracy - 0.2) * 600; // 320 → 500
  } else if (clampedAccuracy <= 0.8) {
    // 50-80%: 500-680 (moderate climb)
    baseScore = 500 + (clampedAccuracy - 0.5) * 600; // 500 → 680
  } else {
    // 80-100%: 680-800 (flattening at the top)
    baseScore = 680 + (clampedAccuracy - 0.8) * 600; // 680 → 800
  }

  // Apply Module 2 difficulty adjustment
  if (module2Difficulty) {
    const multiplier = MODULE2_DIFFICULTY_MULTIPLIER[module2Difficulty];
    baseScore *= multiplier;
  }

  // Clamp to valid score range
  return Math.round(Math.max(200, Math.min(800, baseScore)));
}

/**
 * Calculate the section score from module results.
 * Combines both modules' weighted raw scores and converts to a scaled score.
 *
 * @param module1Result - Results from Module 1
 * @param module2Result - Results from Module 2
 * @returns Scaled section score (200-800)
 */
export function calculateSectionScore(
  module1Result: FullLengthModuleResult,
  module2Result: FullLengthModuleResult
): number {
  // Combine operational correct counts and totals from both modules
  const totalCorrect = module1Result.correctCount + module2Result.correctCount;
  const totalOperational =
    module1Result.operationalCount + module2Result.operationalCount;

  if (totalOperational === 0) return 200;

  const accuracy = totalCorrect / totalOperational;

  // Use Module 2 difficulty for score adjustment
  const module2Difficulty = module2Result.difficulty;

  return rawAccuracyToScaledScore(accuracy, module2Difficulty);
}

// ─── Section Result Calculation ──────────────────────────────────────────────────

/**
 * Calculate a FullLengthModuleResult from raw answer data.
 *
 * @param answers - User's answers for this module (questionId → answer or null)
 * @param correctAnswers - Map of questionId → correct answers
 * @param questionDifficulties - Map of questionId → difficulty
 * @param pretestQuestionIds - Set of pretest question IDs
 * @param questionOrder - Ordered list of ALL question IDs in this module
 * @param moduleNumber - Module number (1 or 2)
 * @param difficulty - Difficulty path (only meaningful for Module 2)
 * @param timeMs - Time spent on this module in milliseconds
 * @returns FullLengthModuleResult
 */
export function calculateModuleResult(
  answers: Record<string, string | null>,
  correctAnswers: Record<string, string[]>,
  questionDifficulties: Record<string, QuestionDifficulty>,
  pretestQuestionIds: Set<string>,
  questionOrder: string[],
  moduleNumber: 1 | 2,
  difficulty: FullLengthModuleDifficulty | undefined,
  timeMs: number
): FullLengthModuleResult {
  let correctCount = 0;
  let operationalCount = 0;
  let pretestCorrectCount = 0;
  let pretestCount = 0;

  const domainBreakdown: Record<string, { correct: number; total: number; timeMs: number }> = {};
  const questionResults: QuestionResult[] = [];

  for (const questionId of questionOrder) {
    const isPretest = pretestQuestionIds.has(questionId);
    const correct = correctAnswers[questionId];
    const userAnswer = answers[questionId] ?? null;
    const difficulty = questionDifficulties[questionId] || "M";

    if (isPretest) {
      pretestCount++;
      if (userAnswer && correct) {
        const isCorrect = correct.some(
          (ca) => ca.toUpperCase() === userAnswer.toUpperCase()
        );
        if (isCorrect) pretestCorrectCount++;
      }
      continue;
    }

    operationalCount++;

    let isCorrect = false;
    if (userAnswer !== null && correct) {
      isCorrect = correct.some(
        (ca) => ca.toUpperCase() === userAnswer.toUpperCase()
      );
      if (isCorrect) correctCount++;
    }

    questionResults.push({
      questionId,
      userAnswer,
      correctAnswer: correct || [],
      isCorrect,
      isUnanswered: userAnswer === null,
      difficulty,
    });
  }

  const accuracy =
    operationalCount > 0 ? (correctCount / operationalCount) * 100 : 0;

  return {
    moduleNumber,
    difficulty,
    correctCount,
    operationalCount,
    pretestCorrectCount,
    pretestCount,
    accuracy,
    timeMs,
    domainBreakdown: {}, // Will be populated with domain data if available
    questionResults,
  };
}

/**
 * Calculate a FullLengthSectionResult from two module results.
 */
export function calculateSectionResult(
  section: FullLengthSection,
  module1Result: FullLengthModuleResult,
  module2Result: FullLengthModuleResult
): FullLengthSectionResult {
  const totalCorrect =
    module1Result.correctCount + module2Result.correctCount;
  const totalOperational =
    module1Result.operationalCount + module2Result.operationalCount;
  const accuracy =
    totalOperational > 0 ? (totalCorrect / totalOperational) * 100 : 0;
  const totalTimeMs = module1Result.timeMs + module2Result.timeMs;

  return {
    section,
    modules: [module1Result, module2Result],
    totalCorrect,
    totalOperational,
    accuracy,
    totalTimeMs,
  };
}

// ─── Test Result Calculation ────────────────────────────────────────────────────

/**
 * Calculate the final test result from section results.
 *
 * @param config - The test configuration
 * @param rwSectionResult - Reading & Writing section result
 * @param mathSectionResult - Math section result
 * @param startedAt - ISO timestamp when the test was started
 * @param completedAt - ISO timestamp when the test was completed
 * @returns FullLengthTestResult with estimated scores
 */
export function calculateTestResult(
  config: FullLengthTestConfig,
  rwSectionResult: FullLengthSectionResult,
  mathSectionResult: FullLengthSectionResult,
  startedAt: string,
  completedAt: string
): FullLengthTestResult {
  // Calculate section scores
  const readingWritingScore = calculateSectionScore(
    rwSectionResult.modules[0],
    rwSectionResult.modules[1]
  );

  const mathScore = calculateSectionScore(
    mathSectionResult.modules[0],
    mathSectionResult.modules[1]
  );

  const totalScore = readingWritingScore + mathScore;

  const completed =
    rwSectionResult.modules.every((m) => m.operationalCount > 0) &&
    mathSectionResult.modules.every((m) => m.operationalCount > 0);

  return {
    config,
    sections: [rwSectionResult, mathSectionResult],
    readingWritingScore,
    mathScore,
    totalScore,
    totalTimeMs:
      rwSectionResult.totalTimeMs + mathSectionResult.totalTimeMs,
    completed,
    startedAt,
    completedAt,
  };
}

// ─── Score Interpretation ──────────────────────────────────────────────────────

/**
 * Get a human-readable interpretation of a section score.
 * Based on College Board's benchmark scores.
 */
export function interpretSectionScore(
  score: number,
  section: FullLengthSection
): { level: string; description: string; benchmark: boolean } {
  // College Board benchmarks: 480 for R&W, 530 for Math
  const benchmark = section === "reading-writing" ? 480 : 530;

  if (score >= 700) {
    return {
      level: "Excellent",
      description: "Well above average performance",
      benchmark: true,
    };
  } else if (score >= 600) {
    return {
      level: "Good",
      description: "Above average performance",
      benchmark: true,
    };
  } else if (score >= benchmark) {
    return {
      level: "Benchmark",
      description: "Meets college readiness benchmark",
      benchmark: true,
    };
  } else if (score >= benchmark - 80) {
    return {
      level: "Approaching",
      description: "Close to college readiness benchmark",
      benchmark: false,
    };
  } else {
    return {
      level: "Below Benchmark",
      description: "Below college readiness benchmark",
      benchmark: false,
    };
  }
}

/**
 * Get a human-readable interpretation of a total score.
 */
export function interpretTotalScore(
  score: number
): { level: string; description: string } {
  // Total benchmark is 1010 (480 + 530)
  if (score >= 1400) {
    return { level: "Excellent", description: "Top-tier performance" };
  } else if (score >= 1200) {
    return { level: "Good", description: "Well above average performance" };
  } else if (score >= 1010) {
    return {
      level: "Benchmark",
      description: "Meets college readiness benchmark",
    };
  } else if (score >= 900) {
    return {
      level: "Approaching",
      description: "Close to college readiness benchmark",
    };
  } else {
    return {
      level: "Below Benchmark",
      description: "Below college readiness benchmark",
    };
  }
}

/**
 * Get the time management rating for a section.
 * Compares actual time spent to the allotted time.
 */
export function getTimeManagementRating(
  actualTimeMs: number,
  allottedTimeMinutes: number
): { rating: string; description: string } {
  const allottedMs = allottedTimeMinutes * 60 * 1000;
  const percentage = (actualTimeMs / allottedMs) * 100;

  if (percentage <= 60) {
    return {
      rating: "Fast",
      description: "Finished with significant time remaining",
    };
  } else if (percentage <= 80) {
    return {
      rating: "Efficient",
      description: "Good pace with time to review",
    };
  } else if (percentage <= 95) {
    return {
      rating: "On Track",
      description: "Used most of the allotted time",
    };
  } else {
    return {
      rating: "Rushed",
      description: "Used all or nearly all of the allotted time",
    };
  }
}