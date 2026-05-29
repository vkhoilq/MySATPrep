/**
 * Full-Length Practice Type Definitions
 *
 * Defines the types for the full-length SAT practice test feature.
 * This covers the test blueprint, module configuration, question slots,
 * and test state — everything needed to simulate a real Digital SAT.
 *
 * Key design decisions:
 * - A full-length test has 2 sections (Reading & Writing, Math), each with 2 modules
 * - Module 2 difficulty adapts based on Module 1 performance
 * - Questions are pre-selected per module based on domain/difficulty distribution
 * - Pretest questions (2 per module) are answered but not scored
 */

import { QuestionDifficulty } from "./question";
import { DomainItems, SkillCd_Variants } from "./lookup";
import { AssessmentType } from "./statistics";

// ─── Section & Module Types ──────────────────────────────────────────────────

/** The two sections of the Digital SAT */
export type FullLengthSection = "reading-writing" | "math";

/** Module number within a section (1 = first, 2 = second/adaptive) */
export type FullLengthModule = 1 | 2;

/**
 * Module 2 difficulty path, determined by Module 1 performance.
 * ~60% correct on Module 1 → "harder" path; below → "easier" path.
 */
export type FullLengthModuleDifficulty = "easier" | "harder";

/** Status of a module within the test */
export type FullLengthModuleStatus =
  | "not_started"
  | "in_progress"
  | "completed";

// ─── Test Blueprint Types ─────────────────────────────────────────────────────

/** Configuration for a single module within a section */
export interface FullLengthModuleConfig {
  /** Which module (1 or 2) */
  moduleNumber: FullLengthModule;
  /** Number of operational (scored) questions */
  operationalQuestions: number;
  /** Number of pretest (unscored) questions */
  pretestQuestions: number;
  /** Total questions in this module */
  totalQuestions: number;
  /** Time limit in minutes */
  timeMinutes: number;
  /** Domain distribution: how many questions per domain */
  domainDistribution: Record<string, number>;
  /** Difficulty distribution for this module */
  difficultyDistribution: Record<QuestionDifficulty, number>;
}

/** Configuration for a section (Reading & Writing or Math) */
export interface FullLengthSectionConfig {
  /** Which section this is */
  section: FullLengthSection;
  /** The two modules in this section */
  modules: [FullLengthModuleConfig, FullLengthModuleConfig];
  /** Whether there's a break after this section */
  breakAfter: boolean;
  /** Break duration in minutes (0 if no break) */
  breakDurationMinutes: number;
}

/** Complete test blueprint for an assessment */
export interface FullLengthTestBlueprint {
  /** Which assessment this blueprint is for */
  assessment: AssessmentType;
  /** The sections in order (Reading & Writing first, then Math) */
  sections: [FullLengthSectionConfig, FullLengthSectionConfig];
  /** Total number of questions across all modules */
  totalQuestions: number;
  /** Total testing time in minutes (excluding breaks) */
  totalTimeMinutes: number;
  /** Break duration between sections in minutes */
  breakDurationMinutes: number;
  /** Total time including breaks in minutes */
  totalTimeWithBreaksMinutes: number;
}

// ─── Question Slot Types ──────────────────────────────────────────────────────

/** Question type within a module */
export type FullLengthQuestionType = "mcq" | "spr";

/**
 * A slot in the test blueprint representing where a specific question will go.
 * Used during question selection to fill the test with appropriate questions.
 */
export interface FullLengthQuestionSlot {
  /** Position in the test (0-based, across all modules) */
  position: number;
  /** Position within the module (0-based) */
  positionInModule: number;
  /** Which section this slot belongs to */
  section: FullLengthSection;
  /** Which module this slot belongs to */
  moduleNumber: FullLengthModule;
  /** Domain this question should cover (e.g., "INI", "H") */
  primaryClassCd: DomainItems;
  /** Skill this question should cover (e.g., "CID", "H.A.") */
  skillCd: SkillCd_Variants;
  /** Difficulty level for this question */
  difficulty: QuestionDifficulty;
  /** Whether this is an MCQ or SPR question */
  questionType: FullLengthQuestionType;
  /** Whether this is a pretest (unscored) question */
  isPretest: boolean;
  /** The actual question ID once selected (filled during question selection) */
  questionId?: string;
}

// ─── Test Configuration ───────────────────────────────────────────────────────

/** Configuration for starting a full-length practice test */
export interface FullLengthTestConfig {
  /** Which assessment (SAT, PSAT/NMSQT, PSAT 8/9) */
  assessment: AssessmentType;
  /** Whether to include the break between sections */
  includeBreak: boolean;
  /** Whether to show a timer (can be hidden for practice) */
  showTimer: boolean;
  /** Whether to allow pausing the test */
  allowPause: boolean;
  /** QA mode: 5 questions per module, 5-minute timer, for quick testing */
  qa?: boolean;
}

// ─── Module State ─────────────────────────────────────────────────────────────

/** State for a single module within a section */
export interface FullLengthModuleState {
  /** Which section this module belongs to */
  section: FullLengthSection;
  /** Which module number (1 or 2) */
  moduleNumber: FullLengthModule;
  /** Current status of this module */
  status: FullLengthModuleStatus;
  /** Time remaining in milliseconds */
  timeRemainingMs: number;
  /** Ordered list of question IDs in this module */
  questionOrder: string[];
  /** User answers keyed by question ID */
  answers: Record<string, string | null>;
  /** Time spent per question keyed by question ID (ms) */
  questionTimes: Record<string, number>;
  /** Questions flagged for review */
  flaggedForReview: Set<string>;
  /** Which questions are pretest (unscored) */
  pretestQuestionIds: Set<string>;
  /** Difficulty path for Module 2 (undefined for Module 1) */
  difficulty?: FullLengthModuleDifficulty;
}

// ─── Section Result ───────────────────────────────────────────────────────────

/** Result for a completed section */
export interface FullLengthSectionResult {
  /** Which section */
  section: FullLengthSection;
  /** Results for each module */
  modules: [FullLengthModuleResult, FullLengthModuleResult];
  /** Total correct operational questions (excluding pretest) */
  totalCorrect: number;
  /** Total operational questions (excluding pretest) */
  totalOperational: number;
  /** Raw accuracy percentage */
  accuracy: number;
  /** Total time spent in milliseconds */
  totalTimeMs: number;
}

/** Result for a completed module */
export interface FullLengthModuleResult {
  /** Module number */
  moduleNumber: FullLengthModule;
  /** Difficulty path (only meaningful for Module 2) */
  difficulty?: FullLengthModuleDifficulty;
  /** Number of correct operational answers */
  correctCount: number;
  /** Number of operational questions */
  operationalCount: number;
  /** Number of correct pretest answers (for info only, not scored) */
  pretestCorrectCount: number;
  /** Number of pretest questions */
  pretestCount: number;
  /** Accuracy on operational questions */
  accuracy: number;
  /** Time spent in milliseconds */
  timeMs: number;
  /** Per-domain breakdown */
  domainBreakdown: Record<string, DomainModuleResult>;
}

/** Per-domain result within a module */
export interface DomainModuleResult {
  /** Domain code (e.g., "INI", "H") */
  primaryClassCd: string;
  /** Number of correct operational answers */
  correctCount: number;
  /** Number of operational questions */
  operationalCount: number;
  /** Accuracy percentage */
  accuracy: number;
  /** Average time per question in ms */
  averageTimeMs: number;
}

// ─── Test Result ──────────────────────────────────────────────────────────────

/** Complete result for a full-length practice test */
export interface FullLengthTestResult {
  /** The test configuration used */
  config: FullLengthTestConfig;
  /** Results for each section */
  sections: [FullLengthSectionResult, FullLengthSectionResult];
  /** Estimated scaled score for Reading & Writing (200-800) */
  readingWritingScore: number;
  /** Estimated scaled score for Math (200-800) */
  mathScore: number;
  /** Estimated total score (400-1600) */
  totalScore: number;
  /** Total time spent in milliseconds */
  totalTimeMs: number;
  /** Whether the test was completed (all modules finished) */
  completed: boolean;
  /** Timestamp when the test was started */
  startedAt: string;
  /** Timestamp when the test was completed or abandoned */
  completedAt: string;
}

// ─── Adaptive Threshold ───────────────────────────────────────────────────────

/**
 * Threshold for determining Module 2 difficulty.
 * If Module 1 accuracy >= this threshold, the student gets the harder Module 2.
 * College Board uses proprietary IRT scoring; we approximate with a simple percentage.
 */
export const ADAPTIVE_THRESHOLD = 0.6;

/**
 * Minimum number of Module 1 questions that must be answered
 * before we can determine the Module 2 difficulty path.
 * If fewer questions are answered, default to "easier" path.
 */
export const MINIMUM_ADAPTIVE_ANSWERS = 10;