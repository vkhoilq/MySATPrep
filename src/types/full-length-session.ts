/**
 * Full-Length Practice Session Types
 *
 * Extends the existing PracticeSession system with full-length specific state.
 * A full-length session tracks progress across 4 modules (2 per section),
 * manages section-level timers, and records adaptive difficulty paths.
 *
 * Storage: Uses separate localStorage keys from Practice Rush sessions
 * to avoid conflicts: "fullLengthCurrentSession" and "fullLengthSessionHistory".
 */

import {
  FullLengthSection,
  FullLengthModule,
  FullLengthModuleDifficulty,
  FullLengthModuleStatus,
  FullLengthTestConfig,
  FullLengthModuleState,
  FullLengthSectionResult,
  FullLengthTestResult,
  ADAPTIVE_THRESHOLD,
} from "./full-length";
import { SessionStatus } from "./session";
import { QuestionAnswers, QuestionTimes, AnsweredQuestionDetails } from "./session";

// ─── Session Configuration ─────────────────────────────────────────────────────

/** Configuration constants for full-length sessions */
export const FULL_LENGTH_SESSION_CONFIG = {
  /** Maximum number of full-length sessions to keep in history */
  MAX_HISTORY_SESSIONS: 5,
  /** Auto-save interval in milliseconds */
  AUTO_SAVE_INTERVAL_MS: 10_000, // 10 seconds (more frequent than rush due to longer test)
  /** Timer save interval in milliseconds */
  TIMER_SAVE_INTERVAL_MS: 5_000, // 5 seconds
  /** localStorage key for current active session */
  CURRENT_SESSION_KEY: "fullLengthCurrentSession",
  /** localStorage key for session history */
  SESSION_HISTORY_KEY: "fullLengthSessionHistory",
  /** localStorage key for user preferences */
  USER_PREFERENCES_KEY: "fullLengthUserPreferences",
} as const;

// ─── Test Phase ────────────────────────────────────────────────────────────────

/** The current phase of the full-length test experience */
export type FullLengthTestPhase =
  | "intro"           // Before starting: test overview, rules, confirmation
  | "section-intro"   // Before a section: "Reading & Writing — Module 1" splash
  | "module-active"   // Actively answering questions within a module
  | "module-review"   // Reviewing flagged questions before submitting a module
  | "module-complete"  // Module submitted, brief pause before next
  | "break"           // 10-minute break between sections
  | "test-complete";  // All modules done, showing results

// ─── Full-Length Session ──────────────────────────────────────────────────────

/**
 * Complete state for a full-length practice session.
 * Stored in localStorage for persistence across page refreshes.
 */
export interface FullLengthSession {
  // ── Core identification ──
  /** Unique session identifier */
  sessionId: string;
  /** ISO 8601 timestamp when the session was created */
  createdAt: string;
  /** ISO 8601 timestamp when the session was completed or abandoned */
  completedAt: string | null;
  /** Current session status */
  status: SessionStatus;

  // ── Test configuration ──
  /** The test configuration used */
  config: FullLengthTestConfig;
  /** Which blueprint was used (assessment type) */
  assessment: string;

  // ── Current position ──
  /** Current test phase */
  phase: FullLengthTestPhase;
  /** Current section index (0 = Reading & Writing, 1 = Math) */
  currentSectionIndex: number;
  /** Current module number within the section (1 or 2) */
  currentModuleNumber: FullLengthModule;
  /** Current question index within the current module (0-based) */
  currentQuestionIndex: number;

  // ── Module states ──
  /** State for each module, keyed by "section-moduleNumber" (e.g., "reading-writing-1") */
  moduleStates: Record<string, FullLengthModuleState>;

  // ── Adaptive difficulty ──
  /** Module 2 difficulty path for each section, determined after Module 1 completion */
  module2Difficulty: Partial<Record<FullLengthSection, FullLengthModuleDifficulty>>;

  // ── Break state ──
  /** Whether the break between sections has been taken */
  breakTaken: boolean;
  /** Time remaining in the break in milliseconds (0 if not on break) */
  breakTimeRemainingMs: number;

  // ── Question data ──
  /** All question IDs for the entire test, keyed by "section-moduleNumber" */
  questionSlots: Record<string, string[]>;
  /** Pretest question IDs for each module, keyed by "section-moduleNumber" */
  pretestSlots: Record<string, string[]>;

  // ── Results (filled as sections complete) ──
  /** Results for completed sections */
  sectionResults: FullLengthSectionResult[];
  /** Final test result (filled when test is completed) */
  testResult: FullLengthTestResult | null;

  // ── Metadata ──
  /** Total time spent on the test in milliseconds (excluding breaks) */
  totalTimeSpentMs: number;
  /** Whether the session has been saved to history */
  savedToHistory: boolean;
}

// ─── Reducer Actions ──────────────────────────────────────────────────────────

/** Actions for the full-length session reducer */
export type FullLengthAction =
  | { type: "START_TEST"; payload: { config: FullLengthTestConfig; assessment: string } }
  | { type: "START_SECTION"; payload: { sectionIndex: number } }
  | { type: "START_MODULE"; payload: { section: FullLengthSection; moduleNumber: FullLengthModule; timeRemainingMs: number } }
  | { type: "SET_QUESTION_ANSWER"; payload: { questionId: string; answer: string | null } }
  | { type: "NAVIGATE_QUESTION"; payload: { questionIndex: number } }
  | { type: "TOGGLE_FLAG_FOR_REVIEW"; payload: { questionId: string } }
  | { type: "COMPLETE_MODULE"; payload: { section: FullLengthSection; moduleNumber: FullLengthModule } }
  | { type: "SET_MODULE2_DIFFICULTY"; payload: { section: FullLengthSection; difficulty: FullLengthModuleDifficulty } }
  | { type: "START_BREAK" }
  | { type: "TICK_BREAK_TIMER"; payload: { elapsedMs: number } }
  | { type: "COMPLETE_BREAK" }
  | { type: "TICK_MODULE_TIMER"; payload: { elapsedMs: number } }
  | { type: "COMPLETE_SECTION"; payload: { result: FullLengthSectionResult } }
  | { type: "COMPLETE_TEST"; payload: { result: FullLengthTestResult } }
  | { type: "ABANDON_TEST" }
  | { type: "PAUSE_TEST" }
  | { type: "RESUME_TEST" }
  | { type: "SET_PHASE"; payload: FullLengthTestPhase }
  | { type: "RESTORE_SESSION"; payload: FullLengthSession };

// ─── Factory Functions ─────────────────────────────────────────────────────────

/**
 * Create a new full-length session with default values.
 */
export function createFullLengthSession(
  config: FullLengthTestConfig,
  assessment: string
): FullLengthSession {
  return {
    sessionId: `full-length-${Date.now()}`,
    createdAt: new Date().toISOString(),
    completedAt: null,
    status: SessionStatus.NOT_STARTED,
    config,
    assessment,
    phase: "intro",
    currentSectionIndex: 0,
    currentModuleNumber: 1,
    currentQuestionIndex: 0,
    moduleStates: {},
    module2Difficulty: {},
    breakTaken: false,
    breakTimeRemainingMs: 0,
    questionSlots: {},
    pretestSlots: {},
    sectionResults: [],
    testResult: null,
    totalTimeSpentMs: 0,
    savedToHistory: false,
  };
}

// ─── Type Guard ────────────────────────────────────────────────────────────────

/**
 * Type guard to validate that an unknown value is a FullLengthSession.
 * Used for localStorage deserialization safety.
 */
export function isValidFullLengthSession(obj: unknown): obj is FullLengthSession {
  if (obj === null || typeof obj !== "object") return false;
  const session = obj as Record<string, unknown>;

  return (
    typeof session.sessionId === "string" &&
    typeof session.createdAt === "string" &&
    typeof session.assessment === "string" &&
    typeof session.phase === "string" &&
    typeof session.currentSectionIndex === "number" &&
    typeof session.currentModuleNumber === "number" &&
    typeof session.currentQuestionIndex === "number" &&
    typeof session.moduleStates === "object" &&
    typeof session.module2Difficulty === "object" &&
    typeof session.questionSlots === "object" &&
    Array.isArray(session.sectionResults)
  );
}

// ─── Storage Helpers ───────────────────────────────────────────────────────────

/**
 * Save a full-length session to localStorage.
 */
export function saveFullLengthSession(session: FullLengthSession): void {
  try {
    localStorage.setItem(
      FULL_LENGTH_SESSION_CONFIG.CURRENT_SESSION_KEY,
      JSON.stringify(session)
    );
  } catch (error) {
    console.error("Failed to save full-length session:", error);
  }
}

/**
 * Load the current full-length session from localStorage.
 * Returns null if no session exists or the data is invalid.
 */
export function loadFullLengthSession(): FullLengthSession | null {
  try {
    const data = localStorage.getItem(
      FULL_LENGTH_SESSION_CONFIG.CURRENT_SESSION_KEY
    );
    if (!data) return null;

    const parsed = JSON.parse(data);
    return isValidFullLengthSession(parsed) ? parsed : null;
  } catch (error) {
    console.error("Failed to load full-length session:", error);
    return null;
  }
}

/**
 * Clear the current full-length session from localStorage.
 */
export function clearFullLengthSession(): void {
  try {
    localStorage.removeItem(FULL_LENGTH_SESSION_CONFIG.CURRENT_SESSION_KEY);
  } catch (error) {
    console.error("Failed to clear full-length session:", error);
  }
}

/**
 * Save a completed session to the history array.
 * Keeps only the most recent MAX_HISTORY_SESSIONS sessions.
 */
export function saveFullLengthSessionToHistory(session: FullLengthSession): void {
  try {
    const existing = getFullLengthSessionHistory();
    const updated = [...existing, { ...session, savedToHistory: true }];
    const trimmed = updated.slice(-FULL_LENGTH_SESSION_CONFIG.MAX_HISTORY_SESSIONS);
    localStorage.setItem(
      FULL_LENGTH_SESSION_CONFIG.SESSION_HISTORY_KEY,
      JSON.stringify(trimmed)
    );
  } catch (error) {
    console.error("Failed to save session to history:", error);
  }
}

/**
 * Get the full-length session history from localStorage.
 */
export function getFullLengthSessionHistory(): FullLengthSession[] {
  try {
    const data = localStorage.getItem(
      FULL_LENGTH_SESSION_CONFIG.SESSION_HISTORY_KEY
    );
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed)
      ? parsed.filter(isValidFullLengthSession)
      : [];
  } catch (error) {
    console.error("Failed to load session history:", error);
    return [];
  }
}

/**
 * Clear all full-length session data from localStorage.
 */
export function clearAllFullLengthSessionData(): void {
  try {
    localStorage.removeItem(FULL_LENGTH_SESSION_CONFIG.CURRENT_SESSION_KEY);
    localStorage.removeItem(FULL_LENGTH_SESSION_CONFIG.SESSION_HISTORY_KEY);
    localStorage.removeItem(FULL_LENGTH_SESSION_CONFIG.USER_PREFERENCES_KEY);
  } catch (error) {
    console.error("Failed to clear full-length session data:", error);
  }
}

// ─── Module Key Helper ────────────────────────────────────────────────────────

/**
 * Generate a module state key from section and module number.
 * Format: "reading-writing-1", "reading-writing-2", "math-1", "math-2"
 */
export function getModuleKey(
  section: FullLengthSection,
  moduleNumber: FullLengthModule
): string {
  return `${section}-${moduleNumber}`;
}

/**
 * Parse a module key back into section and module number.
 */
export function parseModuleKey(key: string): {
  section: FullLengthSection;
  moduleNumber: FullLengthModule;
} | null {
  const parts = key.split("-");
  if (parts.length < 2) return null;

  const moduleNumber = parseInt(parts[parts.length - 1], 10);
  if (moduleNumber !== 1 && moduleNumber !== 2) return null;

  const section = parts.slice(0, parts.length - 1).join("-");
  if (section !== "reading-writing" && section !== "math") return null;

  return {
    section: section as FullLengthSection,
    moduleNumber: moduleNumber as FullLengthModule,
  };
}

// ─── Adaptive Difficulty Helper ────────────────────────────────────────────────

/**
 * Determine Module 2 difficulty based on Module 1 performance.
 * Uses a simple accuracy threshold (ADAPTIVE_THRESHOLD = 0.6).
 * Returns "harder" if accuracy >= threshold, "easier" otherwise.
 */
export function determineModule2Difficulty(
  moduleState: FullLengthModuleState
): FullLengthModuleDifficulty {
  const { answers, pretestQuestionIds } = moduleState;

  // Count correct operational (non-pretest) answers
  let correctCount = 0;
  let operationalCount = 0;

  for (const [questionId, answer] of Object.entries(answers)) {
    // Skip pretest questions
    if (pretestQuestionIds.has(questionId)) continue;

    operationalCount++;

    // An answer is considered "attempted" if it's not null
    // Correctness will be determined by comparing with the question's correct_answer
    // For now, we count non-null answers as "attempted"
    if (answer !== null) {
      correctCount++;
    }
  }

  // If too few questions answered, default to easier path
  if (operationalCount < 10) {
    return "easier";
  }

  const accuracy = correctCount / operationalCount;
  return accuracy >= ADAPTIVE_THRESHOLD ? "harder" : "easier";
}