/**
 * Full-Length Practice Session Reducer
 *
 * Manages the state of a full-length SAT/PSAT practice test.
 * Handles section/module transitions, question answering, timer ticks,
 * adaptive difficulty determination, break management, and test lifecycle.
 *
 * This reducer is intentionally separate from the Practice Rush reducer
 * because full-length has fundamentally different UX:
 * - Section-level countdown timer (not per-question)
 * - Module-gated navigation (can't go back to Module 1 from Module 2)
 * - Free navigation within a module (forward/backward)
 * - Question flagging for review
 * - Break screens between sections
 * - Adaptive Module 2 difficulty
 */

import {
  FullLengthSession,
  FullLengthAction,
  FullLengthTestPhase,
  FULL_LENGTH_SESSION_CONFIG,
  getModuleKey,
} from "@/types/full-length-session";
import {
  FullLengthModuleState,
  FullLengthModuleDifficulty,
  FullLengthSection,
  FullLengthModule,
} from "@/types/full-length";
import { SessionStatus } from "@/types/session";

// ─── Initial State ──────────────────────────────────────────────────────────────

/**
 * Create the initial state for a full-length test session.
 * This is NOT a valid session — it must be initialized with START_TEST
 * before any other actions can be processed.
 */
export function createInitialFullLengthState(): FullLengthSession {
  return {
    sessionId: "",
    createdAt: "",
    completedAt: null,
    status: SessionStatus.NOT_STARTED,
    config: {
      assessment: "SAT",
      includeBreak: true,
      showTimer: true,
      allowPause: false,
    },
    assessment: "SAT",
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

// ─── Reducer ────────────────────────────────────────────────────────────────────

export function fullLengthReducer(
  state: FullLengthSession,
  action: FullLengthAction
): FullLengthSession {
  switch (action.type) {
    // ── Test Lifecycle ──────────────────────────────────────────────────────

    case "START_TEST": {
      const { config, assessment } = action.payload;
      return {
        ...state,
        sessionId: `full-length-${Date.now()}`,
        createdAt: new Date().toISOString(),
        completedAt: null,
        status: SessionStatus.IN_PROGRESS,
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

    case "SET_PHASE": {
      return {
        ...state,
        phase: action.payload,
      };
    }

    case "ABANDON_TEST": {
      return {
        ...state,
        status: SessionStatus.ABANDONED,
        completedAt: new Date().toISOString(),
        phase: "test-complete",
      };
    }

    case "PAUSE_TEST": {
      return {
        ...state,
        status: SessionStatus.PAUSED,
      };
    }

    case "RESUME_TEST": {
      return {
        ...state,
        status: SessionStatus.IN_PROGRESS,
      };
    }

    // ── Section & Module Transitions ────────────────────────────────────────

    case "START_SECTION": {
      const { sectionIndex } = action.payload;
      return {
        ...state,
        currentSectionIndex: sectionIndex,
        currentModuleNumber: 1,
        currentQuestionIndex: 0,
        phase: "section-intro",
      };
    }

    case "START_MODULE": {
      const { section, moduleNumber, timeRemainingMs } = action.payload;
      const key = getModuleKey(section, moduleNumber);

      // Create module state if it doesn't exist
      const existingModuleState = state.moduleStates[key];
      const newModuleState: FullLengthModuleState = existingModuleState || {
        section,
        moduleNumber,
        status: "in_progress",
        timeRemainingMs: timeRemainingMs,
        questionOrder: state.questionSlots[key] || [],
        answers: {},
        questionTimes: {},
        flaggedForReview: new Set<string>(),
        pretestQuestionIds: new Set<string>(
          state.pretestSlots[key] || []
        ),
        difficulty:
          moduleNumber === 2
            ? state.module2Difficulty[section] || "easier"
            : undefined,
      };

      return {
        ...state,
        currentModuleNumber: moduleNumber,
        currentQuestionIndex: 0,
        phase: "module-active",
        moduleStates: {
          ...state.moduleStates,
          [key]: {
            ...newModuleState,
            status: "in_progress",
          },
        },
      };
    }

    case "COMPLETE_MODULE": {
      const { section, moduleNumber } = action.payload;
      const key = getModuleKey(section, moduleNumber);

      const moduleState = state.moduleStates[key];
      if (!moduleState) return state;

      return {
        ...state,
        moduleStates: {
          ...state.moduleStates,
          [key]: {
            ...moduleState,
            status: "completed",
          },
        },
        phase: "module-complete",
      };
    }

    case "SET_MODULE2_DIFFICULTY": {
      const { section, difficulty } = action.payload;
      return {
        ...state,
        module2Difficulty: {
          ...state.module2Difficulty,
          [section]: difficulty,
        },
      };
    }

    // ── Question Answering ──────────────────────────────────────────────────

    case "SET_QUESTION_ANSWER": {
      const { questionId, answer } = action.payload;
      const key = getModuleKey(
        state.currentSectionIndex === 0 ? "reading-writing" : "math",
        state.currentModuleNumber
      );
      const moduleState = state.moduleStates[key];
      if (!moduleState) return state;

      return {
        ...state,
        moduleStates: {
          ...state.moduleStates,
          [key]: {
            ...moduleState,
            answers: {
              ...moduleState.answers,
              [questionId]: answer,
            },
          },
        },
      };
    }

    case "NAVIGATE_QUESTION": {
      return {
        ...state,
        currentQuestionIndex: action.payload.questionIndex,
      };
    }

    case "TOGGLE_FLAG_FOR_REVIEW": {
      const { questionId } = action.payload;
      const key = getModuleKey(
        state.currentSectionIndex === 0 ? "reading-writing" : "math",
        state.currentModuleNumber
      );
      const moduleState = state.moduleStates[key];
      if (!moduleState) return state;

      const newFlagged = new Set(moduleState.flaggedForReview);
      if (newFlagged.has(questionId)) {
        newFlagged.delete(questionId);
      } else {
        newFlagged.add(questionId);
      }

      return {
        ...state,
        moduleStates: {
          ...state.moduleStates,
          [key]: {
            ...moduleState,
            flaggedForReview: newFlagged,
          },
        },
      };
    }

    // ── Timer ────────────────────────────────────────────────────────────────

    case "TICK_MODULE_TIMER": {
      const { elapsedMs } = action.payload;
      const key = getModuleKey(
        state.currentSectionIndex === 0 ? "reading-writing" : "math",
        state.currentModuleNumber
      );
      const moduleState = state.moduleStates[key];
      if (!moduleState) return state;

      const newTimeRemaining = Math.max(
        0,
        moduleState.timeRemainingMs - elapsedMs
      );

      // Auto-complete module when time runs out
      if (newTimeRemaining <= 0) {
        return {
          ...state,
          moduleStates: {
            ...state.moduleStates,
            [key]: {
              ...moduleState,
              timeRemainingMs: 0,
              status: "completed",
            },
          },
          phase: "module-complete",
        };
      }

      return {
        ...state,
        moduleStates: {
          ...state.moduleStates,
          [key]: {
            ...moduleState,
            timeRemainingMs: newTimeRemaining,
          },
        },
        totalTimeSpentMs: state.totalTimeSpentMs + elapsedMs,
      };
    }

    // ── Break ────────────────────────────────────────────────────────────────

    case "START_BREAK": {
      return {
        ...state,
        phase: "break",
        breakTaken: true,
        breakTimeRemainingMs: 10 * 60 * 1000, // 10 minutes in ms
      };
    }

    case "TICK_BREAK_TIMER": {
      const { elapsedMs } = action.payload;
      const newBreakTime = Math.max(0, state.breakTimeRemainingMs - elapsedMs);

      if (newBreakTime <= 0) {
        return {
          ...state,
          breakTimeRemainingMs: 0,
          phase: "section-intro", // Move to next section intro
        };
      }

      return {
        ...state,
        breakTimeRemainingMs: newBreakTime,
      };
    }

    case "COMPLETE_BREAK": {
      return {
        ...state,
        breakTimeRemainingMs: 0,
        phase: "section-intro",
      };
    }

    // ── Section & Test Completion ────────────────────────────────────────────

    case "COMPLETE_SECTION": {
      const { result } = action.payload;
      return {
        ...state,
        sectionResults: [...state.sectionResults, result],
      };
    }

    case "COMPLETE_TEST": {
      const { result } = action.payload;
      return {
        ...state,
        status: SessionStatus.COMPLETED,
        completedAt: new Date().toISOString(),
        phase: "test-complete",
        testResult: result,
      };
    }

    // ── Session Restoration ──────────────────────────────────────────────────

    case "RESTORE_SESSION": {
      return {
        ...action.payload,
        // Ensure Sets are properly restored from JSON
        moduleStates: Object.fromEntries(
          Object.entries(action.payload.moduleStates).map(
            ([key, moduleState]) => [
              key,
              {
                ...moduleState,
                flaggedForReview: new Set(
                  Array.isArray(moduleState.flaggedForReview)
                    ? moduleState.flaggedForReview
                    : []
                ),
                pretestQuestionIds: new Set(
                  Array.isArray(moduleState.pretestQuestionIds)
                    ? moduleState.pretestQuestionIds
                    : []
                ),
              },
            ]
          )
        ),
      };
    }

    default:
      return state;
  }
}

// ─── Helper: Get Current Section ────────────────────────────────────────────────

/**
 * Get the current section name based on the section index.
 * Index 0 = "reading-writing", Index 1 = "math"
 */
export function getCurrentSection(
  state: FullLengthSession
): FullLengthSection {
  return state.currentSectionIndex === 0 ? "reading-writing" : "math";
}

/**
 * Get the current module state.
 */
export function getCurrentModuleState(
  state: FullLengthSession
): FullLengthModuleState | null {
  const section = getCurrentSection(state);
  const key = getModuleKey(section, state.currentModuleNumber);
  return state.moduleStates[key] || null;
}

/**
 * Get the total number of answered questions across all modules.
 */
export function getTotalAnsweredQuestions(state: FullLengthSession): number {
  let total = 0;
  for (const moduleState of Object.values(state.moduleStates)) {
    total += Object.values(moduleState.answers).filter(
      (a) => a !== null
    ).length;
  }
  return total;
}

/**
 * Get the total number of questions across all modules.
 */
export function getTotalQuestions(state: FullLengthSession): number {
  let total = 0;
  for (const moduleState of Object.values(state.moduleStates)) {
    total += moduleState.questionOrder.length;
  }
  return total;
}

/**
 * Check if a question is flagged for review.
 */
export function isQuestionFlagged(
  state: FullLengthSession,
  questionId: string
): boolean {
  const moduleState = getCurrentModuleState(state);
  if (!moduleState) return false;
  return moduleState.flaggedForReview.has(questionId);
}

/**
 * Check if a question is a pretest question.
 */
export function isQuestionPretest(
  state: FullLengthSession,
  questionId: string
): boolean {
  const moduleState = getCurrentModuleState(state);
  if (!moduleState) return false;
  return moduleState.pretestQuestionIds.has(questionId);
}

/**
 * Get the answer for a specific question in the current module.
 */
export function getQuestionAnswer(
  state: FullLengthSession,
  questionId: string
): string | null {
  const moduleState = getCurrentModuleState(state);
  if (!moduleState) return null;
  return moduleState.answers[questionId] ?? null;
}

/**
 * Serialize a FullLengthSession for localStorage.
 * Converts Sets to arrays for JSON compatibility.
 */
export function serializeFullLengthSession(
  session: FullLengthSession
): string {
  const serialized = {
    ...session,
    moduleStates: Object.fromEntries(
      Object.entries(session.moduleStates).map(([key, ms]) => [
        key,
        {
          ...ms,
          flaggedForReview: Array.from(ms.flaggedForReview),
          pretestQuestionIds: Array.from(ms.pretestQuestionIds),
        },
      ])
    ),
  };
  return JSON.stringify(serialized);
}

/**
 * Deserialize a FullLengthSession from localStorage.
 * Converts arrays back to Sets.
 */
export function deserializeFullLengthSession(
  json: string
): FullLengthSession | null {
  try {
    const parsed = JSON.parse(json);

    // Restore Sets from arrays
    const moduleStates = Object.fromEntries(
      Object.entries(parsed.moduleStates || {}).map(([key, ms]: [string, any]) => [
        key,
        {
          ...ms,
          flaggedForReview: new Set(ms.flaggedForReview || []),
          pretestQuestionIds: new Set(ms.pretestQuestionIds || []),
        },
      ])
    );

    return {
      ...parsed,
      moduleStates,
    } as FullLengthSession;
  } catch {
    return null;
  }
}