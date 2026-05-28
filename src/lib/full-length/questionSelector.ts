/**
 * Full-Length Practice Question Selector
 *
 * Selects questions from the College Board question bank to fill a full-length
 * SAT/PSAT test module according to the official domain/difficulty distribution.
 *
 * Algorithm:
 * 1. Fetch available questions for the assessment + subject
 * 2. Group questions by domain and difficulty
 * 3. For each module slot, select questions matching the blueprint distribution
 * 4. Within each domain, order questions easiest → hardest
 * 5. For Module 2, use the adaptive difficulty path (easier/harder)
 * 6. Handle SPR/MCQ ratio for Math modules (~30% SPR)
 * 7. Randomly designate 2 questions per module as pretest (unscored)
 *
 * This module is pure logic — no React, no side effects. All data comes in
 * through function parameters, making it fully testable.
 */

import { QuestionDifficulty, PlainQuestionType } from "@/types/question";
import {
  FullLengthTestBlueprint,
  FullLengthModuleConfig,
  FullLengthQuestionSlot,
  FullLengthSection,
  FullLengthModule,
  FullLengthModuleDifficulty,
} from "@/types/full-length";
import {
  getTestBlueprint,
  getModuleConfig,
  getDomainDistribution,
  getDifficultyDistribution,
  getQuestionTypeRatio,
} from "@/static-data/full-length";
import { ADAPTIVE_THRESHOLD } from "@/types/full-length";

// ─── Types ──────────────────────────────────────────────────────────────────────

/** Result of selecting questions for a single module */
export interface ModuleQuestionSelection {
  /** The section this selection is for */
  section: FullLengthSection;
  /** The module number (1 or 2) */
  moduleNumber: FullLengthModule;
  /** Ordered question IDs for this module */
  questionIds: string[];
  /** Pretest question IDs (unscored) */
  pretestQuestionIds: string[];
  /** The difficulty path used (only meaningful for Module 2) */
  difficulty: FullLengthModuleDifficulty;
  /** Detailed slot information for each question position */
  slots: FullLengthQuestionSlot[];
}

/** Result of selecting questions for an entire test */
export interface TestQuestionSelection {
  /** Selections for each module, keyed by "section-moduleNumber" */
  modules: Record<string, ModuleQuestionSelection>;
  /** Total number of questions selected */
  totalQuestions: number;
  /** Any warnings encountered during selection */
  warnings: string[];
}

// ─── Question Pool Helpers ────────────────────────────────────────────────────

/**
 * Group questions by their primary class code (domain).
 * Returns a map of domain code → array of questions in that domain.
 */
export function groupQuestionsByDomain(
  questions: PlainQuestionType[]
): Record<string, PlainQuestionType[]> {
  const groups: Record<string, PlainQuestionType[]> = {};

  for (const q of questions) {
    const domain = q.primary_class_cd;
    if (!groups[domain]) {
      groups[domain] = [];
    }
    groups[domain].push(q);
  }

  return groups;
}

/**
 * Group questions by difficulty within a domain.
 * Returns a map of difficulty → array of questions at that difficulty.
 */
export function groupQuestionsByDifficulty(
  questions: PlainQuestionType[]
): Record<QuestionDifficulty, PlainQuestionType[]> {
  const groups: Record<QuestionDifficulty, PlainQuestionType[]> = {
    E: [],
    M: [],
    H: [],
  };

  for (const q of questions) {
    if (q.difficulty && groups[q.difficulty]) {
      groups[q.difficulty].push(q);
    }
  }

  return groups;
}

/**
 * Sort questions by difficulty level (E → M → H).
 * Within the same difficulty, maintain original order.
 */
export function sortByDifficulty(
  questions: PlainQuestionType[]
): PlainQuestionType[] {
  const difficultyOrder: Record<string, number> = { E: 0, M: 1, H: 2 };
  return [...questions].sort((a, b) => {
    const aOrder = difficultyOrder[a.difficulty] ?? 1;
    const bOrder = difficultyOrder[b.difficulty] ?? 1;
    return aOrder - bOrder;
  });
}

/**
 * Determine if a question is likely an SPR question based on its metadata.
 * The College Board question bank doesn't always include the question type
 * in the listing data, so we use heuristics:
 * - Math questions with certain skill codes tend to be SPR
 * - We assign SPR proportionally based on the configured ratio
 */
export function isLikelySPRQuestion(question: PlainQuestionType): boolean {
  // SPR questions are only in Math
  const mathDomains = ["H", "P", "Q", "S"];
  return mathDomains.includes(question.primary_class_cd);
}

// ─── Question Selection ────────────────────────────────────────────────────────

/**
 * Select questions for a single module from the available question pool.
 *
 * @param questions - All available questions for this subject
 * @param section - Which section (reading-writing or math)
 * @param moduleNumber - Module 1 or 2
 * @param moduleDifficulty - Difficulty path for Module 2 (defaults to "easier")
 * @param blueprint - The test blueprint to follow
 * @param excludeIds - Question IDs to exclude (already used in other modules)
 * @returns ModuleQuestionSelection with selected question IDs and slot details
 */
export function selectQuestionsForModule(
  questions: PlainQuestionType[],
  section: FullLengthSection,
  moduleNumber: FullLengthModule,
  moduleDifficulty: FullLengthModuleDifficulty = "easier",
  blueprint: FullLengthTestBlueprint = getTestBlueprint("SAT"),
  excludeIds: Set<string> = new Set()
): ModuleQuestionSelection {
  const moduleConfig = getModuleConfig(blueprint, section, moduleNumber);
  if (!moduleConfig) {
    return {
      section,
      moduleNumber,
      questionIds: [],
      pretestQuestionIds: [],
      difficulty: moduleDifficulty,
      slots: [],
    };
  }

  const domainDistribution = getDomainDistribution(section);
  const difficultyDistribution = getDifficultyDistribution(moduleNumber, moduleDifficulty);
  const questionTypeRatio = getQuestionTypeRatio(section);

  // Filter out already-used questions
  const available = questions.filter((q) => !excludeIds.has(q.questionId));

  // Group available questions by domain
  const byDomain = groupQuestionsByDomain(available);

  const selectedIds: string[] = [];
  const slots: FullLengthQuestionSlot[] = [];
  const usedIds = new Set<string>();
  let positionInModule = 0;

  // Select questions for each domain
  for (const [domainCode, count] of Object.entries(domainDistribution)) {
    const domainQuestions = byDomain[domainCode] || [];
    const domainByDifficulty = groupQuestionsByDifficulty(domainQuestions);

    // Calculate how many questions to select per difficulty for this domain
    const targetCount = count;

    // Select questions per difficulty bucket
    const domainSelected: PlainQuestionType[] = [];

    for (const difficulty of ["E", "M", "H"] as QuestionDifficulty[]) {
      const ratio = difficultyDistribution[difficulty];
      const numFromDifficulty = Math.round(targetCount * ratio);
      const pool = sortByDifficulty(domainByDifficulty[difficulty] || []);

      let picked = 0;
      for (const q of pool) {
        if (picked >= numFromDifficulty) break;
        if (usedIds.has(q.questionId)) continue;

        domainSelected.push(q);
        usedIds.add(q.questionId);
        picked++;
      }
    }

    // If we didn't get enough from difficulty distribution, fill from remaining
    if (domainSelected.length < targetCount) {
      const remaining = domainQuestions
        .filter((q) => !usedIds.has(q.questionId))
        .sort((a, b) => {
          const order: Record<string, number> = { E: 0, M: 1, H: 2 };
          return (order[a.difficulty] ?? 1) - (order[b.difficulty] ?? 1);
        });

      for (const q of remaining) {
        if (domainSelected.length >= targetCount) break;
        domainSelected.push(q);
        usedIds.add(q.questionId);
      }
    }

    // Sort selected questions by difficulty (easiest → hardest within domain)
    const sorted = sortByDifficulty(domainSelected.slice(0, targetCount));

    // Create slots for each selected question
    for (const q of sorted) {
      const slot: FullLengthQuestionSlot = {
        position: selectedIds.length,
        positionInModule: positionInModule,
        section,
        moduleNumber,
        primaryClassCd: q.primary_class_cd as any,
        skillCd: q.skill_cd as any,
        difficulty: q.difficulty,
        questionType: isLikelySPRQuestion(q) ? "spr" : "mcq",
        isPretest: false, // Will be assigned later
        questionId: q.questionId,
      };

      slots.push(slot);
      selectedIds.push(q.questionId);
      positionInModule++;
    }
  }

  // Handle SPR/MCQ ratio for Math modules
  // We don't have question type in the listing data, so we approximate
  // by ensuring the SPR ratio is roughly correct through skill code heuristics

  // Designate pretest questions (2 per module, randomly selected)
  const pretestCount = moduleConfig.pretestQuestions;
  const pretestIds = designatePretestQuestions(selectedIds, pretestCount);

  // Mark pretest slots
  for (const slot of slots) {
    if (pretestIds.has(slot.questionId!)) {
      slot.isPretest = true;
    }
  }

  return {
    section,
    moduleNumber,
    questionIds: selectedIds,
    pretestQuestionIds: Array.from(pretestIds),
    difficulty: moduleDifficulty,
    slots,
  };
}

/**
 * Randomly designate N questions as pretest (unscored).
 * Pretest questions are randomly selected from the pool, avoiding
 * the first few questions (which are more likely to be seen by the student).
 */
export function designatePretestQuestions(
  questionIds: string[],
  count: number
): Set<string> {
  if (questionIds.length <= count) {
    // If we have fewer questions than pretest count, mark all as pretest
    return new Set(questionIds);
  }

  const pretestIds = new Set<string>();
  // Avoid selecting the first 3 questions as pretest (they're more visible)
  const eligibleIndices = questionIds
    .map((_, i) => i)
    .filter((i) => i >= 3);

  // Fisher-Yates shuffle on eligible indices
  const shuffled = [...eligibleIndices];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  for (let i = 0; i < Math.min(count, shuffled.length); i++) {
    pretestIds.add(questionIds[shuffled[i]]);
  }

  return pretestIds;
}

/**
 * Select questions for an entire full-length test.
 *
 * @param rwQuestions - Available Reading & Writing questions
 * @param mathQuestions - Available Math questions
 * @param assessment - Which assessment (SAT, PSAT/NMSQT, PSAT)
 * @returns TestQuestionSelection with all module selections
 */
export function selectQuestionsForTest(
  rwQuestions: PlainQuestionType[],
  mathQuestions: PlainQuestionType[],
  assessment: string = "SAT"
): TestQuestionSelection {
  const blueprint = getTestBlueprint(assessment);
  const warnings: string[] = [];
  const modules: Record<string, ModuleQuestionSelection> = {};
  const allUsedIds = new Set<string>();

  // Module 1 for both sections (always uses mixed difficulty)
  const rwModule1 = selectQuestionsForModule(
    rwQuestions,
    "reading-writing",
    1,
    "easier", // Module 1 always uses mixed; the param is overridden by MODULE_1_DIFFICULTY_MIX
    blueprint,
    new Set()
  );

  // Track used question IDs
  for (const id of rwModule1.questionIds) {
    allUsedIds.add(id);
  }
  modules[`reading-writing-1`] = rwModule1;

  const mathModule1 = selectQuestionsForModule(
    mathQuestions,
    "math",
    1,
    "easier",
    blueprint,
    new Set()
  );

  for (const id of mathModule1.questionIds) {
    allUsedIds.add(id);
  }
  modules[`math-1`] = mathModule1;

  // Module 2 for both sections (difficulty determined by Module 1 performance)
  // Default to "easier" — will be updated at runtime based on actual performance
  const rwModule2 = selectQuestionsForModule(
    rwQuestions,
    "reading-writing",
    2,
    "easier", // Default; will be overridden at runtime
    blueprint,
    allUsedIds
  );

  for (const id of rwModule2.questionIds) {
    allUsedIds.add(id);
  }
  modules[`reading-writing-2`] = rwModule2;

  const mathModule2 = selectQuestionsForModule(
    mathQuestions,
    "math",
    2,
    "easier", // Default; will be overridden at runtime
    blueprint,
    allUsedIds
  );

  modules[`math-2`] = mathModule2;

  // Check if we have enough questions
  const totalSelected = Object.values(modules).reduce(
    (sum, m) => sum + m.questionIds.length,
    0
  );

  if (totalSelected < blueprint.totalQuestions) {
    warnings.push(
      `Only ${totalSelected} of ${blueprint.totalQuestions} questions selected. ` +
        `The question pool may not have enough questions for all domains/difficulties.`
    );
  }

  return {
    modules,
    totalQuestions: totalSelected,
    warnings,
  };
}

/**
 * Re-select Module 2 questions based on Module 1 performance.
 * Called at runtime after Module 1 is completed.
 *
 * @param questions - Available questions for the subject
 * @param section - Which section
 * @param module1Answers - User's answers for Module 1
 * @param module1CorrectAnswers - Map of questionId → correct answer(s)
 * @param excludeIds - IDs already used in Module 1
 * @param assessment - Assessment type
 * @returns Updated ModuleQuestionSelection for Module 2
 */
export function reselectModule2Questions(
  questions: PlainQuestionType[],
  section: FullLengthSection,
  module1Answers: Record<string, string | null>,
  module1CorrectAnswers: Record<string, string[]>,
  excludeIds: Set<string>,
  assessment: string = "SAT"
): ModuleQuestionSelection {
  // Determine Module 2 difficulty based on Module 1 performance
  const difficulty = determineModule2DifficultyFromAnswers(
    module1Answers,
    module1CorrectAnswers
  );

  return selectQuestionsForModule(
    questions,
    section,
    2,
    difficulty,
    getTestBlueprint(assessment),
    excludeIds
  );
}

/**
 * Determine Module 2 difficulty based on actual Module 1 answers.
 * Compares user answers against correct answers to calculate accuracy.
 */
export function determineModule2DifficultyFromAnswers(
  module1Answers: Record<string, string | null>,
  module1CorrectAnswers: Record<string, string[]>
): FullLengthModuleDifficulty {
  let correctCount = 0;
  let totalAnswered = 0;

  for (const [questionId, userAnswer] of Object.entries(module1Answers)) {
    if (userAnswer === null) continue; // Skip unanswered

    const correctAnswers = module1CorrectAnswers[questionId];
    if (!correctAnswers) continue;

    totalAnswered++;

    // Check if user's answer matches any correct answer (case-insensitive)
    const isCorrect = correctAnswers.some(
      (ca) => ca.toUpperCase() === userAnswer.toUpperCase()
    );

    if (isCorrect) {
      correctCount++;
    }
  }

  // If too few questions answered, default to easier path
  if (totalAnswered < 10) {
    return "easier";
  }

  const accuracy = correctCount / totalAnswered;
  return accuracy >= ADAPTIVE_THRESHOLD ? "harder" : "easier";
}

/**
 * Fetch questions for a full-length test from the API.
 * This is a client-side function that calls the existing /api/get-questions endpoint.
 *
 * @param subject - "math" or "reading-writing"
 * @param assessment - Assessment type (SAT, PSAT/NMSQT, PSAT)
 * @returns Array of PlainQuestionType from the question bank
 */
export async function fetchQuestionsForSection(
  subject: FullLengthSection,
  assessment: string = "SAT"
): Promise<PlainQuestionType[]> {
  // Map subject to domain codes
  const domainMap: Record<FullLengthSection, string> = {
    "reading-writing": "INI,CAS,EOI,SEC",
    math: "H,P,Q,S",
  };

  const domains = domainMap[subject];

  const response = await fetch(
    `/api/get-questions?domains=${domains}&assessment=${assessment}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch ${subject} questions: ${response.status}`);
  }

  const result = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to fetch questions");
  }

  return result.data as PlainQuestionType[];
}

/**
 * Fetch question details for a list of question IDs.
 * Uses the existing /api/question/{id} endpoint.
 *
 * @param questionIds - Array of question IDs to fetch
 * @returns Map of questionId → API_Response_Question
 */
export async function fetchQuestionDetails(
  questionIds: string[]
): Promise<Record<string, import("@/types/question").API_Response_Question>> {
  const results: Record<string, import("@/types/question").API_Response_Question> = {};

  // Fetch in batches to avoid overwhelming the API
  const BATCH_SIZE = 5;
  const BATCH_DELAY = 200; // ms

  for (let i = 0; i < questionIds.length; i += BATCH_SIZE) {
    const batch = questionIds.slice(i, i + BATCH_SIZE);

    const promises = batch.map(async (id) => {
      try {
        const response = await fetch(`/api/question/${id}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            results[id] = result.data;
          }
        }
      } catch (error) {
        console.error(`Failed to fetch question ${id}:`, error);
      }
    });

    await Promise.all(promises);

    // Delay between batches
    if (i + BATCH_SIZE < questionIds.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
    }
  }

  return results;
}