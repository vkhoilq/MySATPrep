/**
 * Vitest regression tests for the full-length practice reducer.
 *
 * Covers all reducer actions, helper functions, and serialization.
 * Runs under jsdom with the project's vitest config.
 */
import { describe, it, expect, beforeEach } from "vitest";

import {
  createInitialFullLengthState,
  fullLengthReducer,
  getCurrentSection,
  getCurrentModuleState,
  getTotalAnsweredQuestions,
  getTotalQuestions,
  isQuestionFlagged,
  isQuestionPretest,
  getQuestionAnswer,
  serializeFullLengthSession,
  deserializeFullLengthSession,
} from "@/lib/full-length/fullLengthReducer";

import { getModuleKey } from "@/types/full-length-session";
import type {
  FullLengthSession,
  FullLengthTestPhase,
  FullLengthAction,
} from "@/types/full-length-session";
import type {
  FullLengthModuleState,
  FullLengthSection,
  FullLengthModule,
  FullLengthModuleDifficulty,
  FullLengthTestConfig,
  FullLengthSectionResult,
  FullLengthTestResult,
} from "@/types/full-length";
import { SessionStatus } from "@/types/session";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Create a valid default test config for use across tests.
 */
function defaultConfig(): FullLengthTestConfig {
  return {
    assessment: "SAT",
    includeBreak: true,
    showTimer: true,
    allowPause: false,
  };
}

/**
 * Dispatch an action and return the new state.
 */
function dispatch(
  state: FullLengthSession,
  action: FullLengthAction,
): FullLengthSession {
  return fullLengthReducer(state, action);
}

/**
 * Build a minimal section result for testing.
 */
function makeSectionResult(
  section: FullLengthSection,
): FullLengthSectionResult {
  return {
    section,
    modules: [
      {
        moduleNumber: 1 as FullLengthModule,
        correctCount: 10,
        operationalCount: 20,
        pretestCorrectCount: 1,
        pretestCount: 2,
        accuracy: 0.5,
        timeMs: 600_000,
        domainBreakdown: {},
      },
      {
        moduleNumber: 2 as FullLengthModule,
        correctCount: 12,
        operationalCount: 20,
        pretestCorrectCount: 1,
        pretestCount: 2,
        accuracy: 0.6,
        timeMs: 600_000,
        domainBreakdown: {},
      },
    ],
    totalCorrect: 22,
    totalOperational: 40,
    accuracy: 0.55,
    totalTimeMs: 1_200_000,
  };
}

/**
 * Build a minimal test result for testing.
 */
function makeTestResult(): FullLengthTestResult {
  return {
    config: defaultConfig(),
    sections: [makeSectionResult("reading-writing"), makeSectionResult("math")],
    readingWritingScore: 520,
    mathScore: 530,
    totalScore: 1050,
    totalTimeMs: 2_400_000,
    completed: true,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };
}

/**
 * Start a test from the initial state and return the active session.
 */
function startTest(
  state: FullLengthSession,
  config: FullLengthTestConfig = defaultConfig(),
  assessment = "SAT",
): FullLengthSession {
  return dispatch(state, {
    type: "START_TEST",
    payload: { config, assessment },
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("createInitialFullLengthState()", () => {
  it("returns NOT_STARTED status", () => {
    const state = createInitialFullLengthState();
    expect(state.status).toBe(SessionStatus.NOT_STARTED);
  });

  it("returns empty moduleStates", () => {
    const state = createInitialFullLengthState();
    expect(state.moduleStates).toEqual({});
  });

  it("returns phase 'intro'", () => {
    const state = createInitialFullLengthState();
    expect(state.phase).toBe("intro");
  });

  it("returns sessionId as empty string", () => {
    const state = createInitialFullLengthState();
    expect(state.sessionId).toBe("");
  });

  it("returns createdAt as empty string", () => {
    const state = createInitialFullLengthState();
    expect(state.createdAt).toBe("");
  });

  it("returns completedAt as null", () => {
    const state = createInitialFullLengthState();
    expect(state.completedAt).toBeNull();
  });

  it("returns default config with assessment SAT", () => {
    const state = createInitialFullLengthState();
    expect(state.config.assessment).toBe("SAT");
    expect(state.config.includeBreak).toBe(true);
    expect(state.config.showTimer).toBe(true);
    expect(state.config.allowPause).toBe(false);
  });

  it("returns assessment as SAT", () => {
    const state = createInitialFullLengthState();
    expect(state.assessment).toBe("SAT");
  });

  it("returns currentSectionIndex = 0", () => {
    const state = createInitialFullLengthState();
    expect(state.currentSectionIndex).toBe(0);
  });

  it("returns currentModuleNumber = 1", () => {
    const state = createInitialFullLengthState();
    expect(state.currentModuleNumber).toBe(1);
  });

  it("returns currentQuestionIndex = 0", () => {
    const state = createInitialFullLengthState();
    expect(state.currentQuestionIndex).toBe(0);
  });

  it("returns zeroed-out numeric fields", () => {
    const state = createInitialFullLengthState();
    expect(state.breakTimeRemainingMs).toBe(0);
    expect(state.totalTimeSpentMs).toBe(0);
  });

  it("returns breakTaken as false", () => {
    const state = createInitialFullLengthState();
    expect(state.breakTaken).toBe(false);
  });

  it("returns empty sectionResults and null testResult", () => {
    const state = createInitialFullLengthState();
    expect(state.sectionResults).toEqual([]);
    expect(state.testResult).toBeNull();
  });

  it("returns empty questionSlots and pretestSlots", () => {
    const state = createInitialFullLengthState();
    expect(state.questionSlots).toEqual({});
    expect(state.pretestSlots).toEqual({});
  });

  it("returns savedToHistory as false", () => {
    const state = createInitialFullLengthState();
    expect(state.savedToHistory).toBe(false);
  });

  it("does not mutate between calls (returns fresh state)", () => {
    const a = createInitialFullLengthState();
    const b = createInitialFullLengthState();
    expect(a).toEqual(b);
    // Ensure independent references
    (a as any).mutated = true;
    expect((b as any).mutated).toBeUndefined();
  });
});

describe("fullLengthReducer", () => {
  // ─── beforeEach: fresh initial state for each test ───────────────────
  let initialState: FullLengthSession;
  beforeEach(() => {
    initialState = createInitialFullLengthState();
  });

  // ─── START_TEST ─────────────────────────────────────────────────────
  describe("START_TEST", () => {
    it("sets status to IN_PROGRESS", () => {
      const state = startTest(initialState);
      expect(state.status).toBe(SessionStatus.IN_PROGRESS);
    });

    it("sets sessionId starting with 'full-length-'", () => {
      const state = startTest(initialState);
      expect(state.sessionId).toMatch(/^full-length-/);
    });

    it("sets createdAt to a valid ISO string", () => {
      const state = startTest(initialState);
      expect(new Date(state.createdAt).toISOString()).toBe(state.createdAt);
    });

    it("sets completedAt to null", () => {
      const state = startTest(initialState);
      expect(state.completedAt).toBeNull();
    });

    it("sets the provided config and assessment", () => {
      const config: FullLengthTestConfig = {
        assessment: "PSAT/NMSQT",
        includeBreak: false,
        showTimer: false,
        allowPause: true,
      };
      const state = startTest(initialState, config, "PSAT/NMSQT");
      expect(state.config).toEqual(config);
      expect(state.assessment).toBe("PSAT/NMSQT");
    });

    it("sets phase to 'intro'", () => {
      const state = startTest(initialState);
      expect(state.phase).toBe("intro");
    });

    it("resets currentSectionIndex to 0", () => {
      const seeded = { ...initialState, currentSectionIndex: 1 };
      const state = startTest(seeded);
      expect(state.currentSectionIndex).toBe(0);
    });

    it("resets currentModuleNumber to 1", () => {
      const seeded = { ...initialState, currentModuleNumber: 2 as FullLengthModule };
      const state = startTest(seeded);
      expect(state.currentModuleNumber).toBe(1);
    });

    it("resets currentQuestionIndex to 0", () => {
      const seeded = { ...initialState, currentQuestionIndex: 15 };
      const state = startTest(seeded);
      expect(state.currentQuestionIndex).toBe(0);
    });

    it("resets moduleStates to empty", () => {
      const seeded: FullLengthSession = {
        ...initialState,
        moduleStates: {
          "reading-writing-1": {} as any,
        },
      };
      const state = startTest(seeded);
      expect(state.moduleStates).toEqual({});
    });

    it("resets module2Difficulty to empty", () => {
      const seeded: FullLengthSession = {
        ...initialState,
        module2Difficulty: { "reading-writing": "harder" },
      };
      const state = startTest(seeded);
      expect(state.module2Difficulty).toEqual({});
    });

    it("resets breakTaken to false", () => {
      const seeded = { ...initialState, breakTaken: true };
      const state = startTest(seeded);
      expect(state.breakTaken).toBe(false);
    });

    it("resets breakTimeRemainingMs to 0", () => {
      const seeded = { ...initialState, breakTimeRemainingMs: 300_000 };
      const state = startTest(seeded);
      expect(state.breakTimeRemainingMs).toBe(0);
    });

    it("resets questionSlots and pretestSlots to empty", () => {
      const seeded: FullLengthSession = {
        ...initialState,
        questionSlots: { "reading-writing-1": ["q1"] },
        pretestSlots: { "reading-writing-1": ["pt1"] },
      };
      const state = startTest(seeded);
      expect(state.questionSlots).toEqual({});
      expect(state.pretestSlots).toEqual({});
    });

    it("resets sectionResults to empty and testResult to null", () => {
      const seeded: FullLengthSession = {
        ...initialState,
        sectionResults: [makeSectionResult("reading-writing")],
        testResult: makeTestResult(),
      };
      const state = startTest(seeded);
      expect(state.sectionResults).toEqual([]);
      expect(state.testResult).toBeNull();
    });

    it("resets totalTimeSpentMs to 0", () => {
      const seeded = { ...initialState, totalTimeSpentMs: 999_999 };
      const state = startTest(seeded);
      expect(state.totalTimeSpentMs).toBe(0);
    });

    it("resets savedToHistory to false", () => {
      const seeded = { ...initialState, savedToHistory: true };
      const state = startTest(seeded);
      expect(state.savedToHistory).toBe(false);
    });
  });

  // ─── SET_PHASE ──────────────────────────────────────────────────────
  describe("SET_PHASE", () => {
    const phases: FullLengthTestPhase[] = [
      "intro",
      "section-intro",
      "module-active",
      "module-review",
      "module-complete",
      "break",
      "test-complete",
    ];

    it.each(phases)("sets phase to '%s'", (phase) => {
      const state = startTest(initialState);
      const next = dispatch(state, { type: "SET_PHASE", payload: phase });
      expect(next.phase).toBe(phase);
    });

    it("preserves other state fields", () => {
      const state = startTest(initialState);
      const next = dispatch(state, { type: "SET_PHASE", payload: "break" });
      expect(next.sessionId).toBe(state.sessionId);
      expect(next.status).toBe(SessionStatus.IN_PROGRESS);
    });
  });

  // ─── ABANDON_TEST ───────────────────────────────────────────────────
  describe("ABANDON_TEST", () => {
    it("sets status to ABANDONED", () => {
      const state = startTest(initialState);
      const next = dispatch(state, { type: "ABANDON_TEST" });
      expect(next.status).toBe(SessionStatus.ABANDONED);
    });

    it("sets completedAt to a valid ISO string", () => {
      const state = startTest(initialState);
      const next = dispatch(state, { type: "ABANDON_TEST" });
      expect(new Date(next.completedAt!).toISOString()).toBe(next.completedAt);
    });

    it("sets phase to 'test-complete'", () => {
      const state = startTest(initialState);
      const next = dispatch(state, { type: "ABANDON_TEST" });
      expect(next.phase).toBe("test-complete");
    });

    it("preserves other state (e.g., moduleStates)", () => {
      const state = startTest(initialState);
      const next = dispatch(state, { type: "ABANDON_TEST" });
      expect(next.moduleStates).toEqual({});
    });
  });

  // ─── PAUSE_TEST / RESUME_TEST ───────────────────────────────────────
  describe("PAUSE_TEST", () => {
    it("sets status to PAUSED", () => {
      const state = startTest(initialState);
      const next = dispatch(state, { type: "PAUSE_TEST" });
      expect(next.status).toBe(SessionStatus.PAUSED);
    });

    it("preserves phase and other fields", () => {
      const state = dispatch(startTest(initialState), {
        type: "SET_PHASE",
        payload: "module-active",
      });
      const next = dispatch(state, { type: "PAUSE_TEST" });
      expect(next.phase).toBe("module-active");
      expect(next.sessionId).toBe(state.sessionId);
    });
  });

  describe("RESUME_TEST", () => {
    it("sets status to IN_PROGRESS", () => {
      const paused = dispatch(startTest(initialState), { type: "PAUSE_TEST" });
      expect(paused.status).toBe(SessionStatus.PAUSED);
      const resumed = dispatch(paused, { type: "RESUME_TEST" });
      expect(resumed.status).toBe(SessionStatus.IN_PROGRESS);
    });
  });

  // ─── START_SECTION ──────────────────────────────────────────────────
  describe("START_SECTION", () => {
    it("sets currentSectionIndex, resets module/question, sets phase", () => {
      const state = startTest(initialState);
      const next = dispatch(state, {
        type: "START_SECTION",
        payload: { sectionIndex: 1 },
      });
      expect(next.currentSectionIndex).toBe(1);
      expect(next.currentModuleNumber).toBe(1);
      expect(next.currentQuestionIndex).toBe(0);
      expect(next.phase).toBe("section-intro");
    });

    it("works for sectionIndex 0 (reading-writing)", () => {
      const state = startTest(initialState);
      const next = dispatch(state, {
        type: "START_SECTION",
        payload: { sectionIndex: 0 },
      });
      expect(next.currentSectionIndex).toBe(0);
    });
  });

  // ─── SET_QUESTION_SLOTS ─────────────────────────────────────────────
  describe("SET_QUESTION_SLOTS", () => {
    it("sets questionSlots and pretestSlots on state", () => {
      const state = startTest(initialState);
      const questionSlots = {
        "reading-writing-1": ["q1", "q2", "q3"],
        "reading-writing-2": ["q4", "q5"],
        "math-1": ["m1", "m2", "m3"],
        "math-2": ["m4", "m5"],
      };
      const pretestSlots = {
        "reading-writing-1": ["q1"],
        "math-1": ["m1"],
      };
      const next = dispatch(state, {
        type: "SET_QUESTION_SLOTS",
        payload: { questionSlots, pretestSlots, questionMeta: {} },
      });
      expect(next.questionSlots).toEqual(questionSlots);
      expect(next.pretestSlots).toEqual(pretestSlots);
    });

    it("does not affect other state fields", () => {
      const state = startTest(initialState);
      const next = dispatch(state, {
        type: "SET_QUESTION_SLOTS",
        payload: { questionSlots: {}, pretestSlots: {}, questionMeta: {} },
      });
      expect(next.sessionId).toBe(state.sessionId);
      expect(next.phase).toBe(state.phase);
      expect(next.currentSectionIndex).toBe(state.currentSectionIndex);
    });

    it("overwrites previous questionSlots", () => {
      const state = startTest(initialState);
      const first = dispatch(state, {
        type: "SET_QUESTION_SLOTS",
        payload: {
          questionSlots: { "reading-writing-1": ["q1"] },
          pretestSlots: {},
          questionMeta: {},
        },
      });
      const second = dispatch(first, {
        type: "SET_QUESTION_SLOTS",
        payload: {
          questionSlots: { "math-1": ["m1", "m2"] },
          pretestSlots: { "math-1": ["m1"] },
          questionMeta: {},
        },
      });
      expect(second.questionSlots).toEqual({ "math-1": ["m1", "m2"] });
      expect(second.pretestSlots).toEqual({ "math-1": ["m1"] });
    });
  });

  // ─── START_MODULE ───────────────────────────────────────────────────
  describe("START_MODULE", () => {
    function startModule(
      state: FullLengthSession,
      section: FullLengthSection,
      moduleNumber: FullLengthModule,
      timeRemainingMs: number,
      questionSlots?: Record<string, string[]>,
      pretestSlots?: Record<string, string[]>,
      module2Difficulty?: Partial<Record<FullLengthSection, FullLengthModuleDifficulty>>,
    ): FullLengthSession {
      const seeded: FullLengthSession = {
        ...state,
        questionSlots: questionSlots ?? {},
        pretestSlots: pretestSlots ?? {},
        module2Difficulty: module2Difficulty ?? {},
      };
      return dispatch(seeded, {
        type: "START_MODULE",
        payload: { section, moduleNumber, timeRemainingMs },
      });
    }

    it("creates new module state and sets phase to module-active", () => {
      const state = startTest(initialState);
      const next = startModule(state, "reading-writing", 1, 32 * 60 * 1000);
      const key = getModuleKey("reading-writing", 1);

      expect(next.phase).toBe("module-active");
      expect(next.currentModuleNumber).toBe(1);
      expect(next.currentQuestionIndex).toBe(0);
      expect(next.moduleStates[key]).toBeDefined();
      expect(next.moduleStates[key].status).toBe("in_progress");
      expect(next.moduleStates[key].timeRemainingMs).toBe(32 * 60 * 1000);
      expect(next.moduleStates[key].answers).toEqual({});
      expect(next.moduleStates[key].questionTimes).toEqual({});
      expect(next.moduleStates[key].flaggedForReview).toBeInstanceOf(Set);
      expect(next.moduleStates[key].flaggedForReview.size).toBe(0);
      expect(next.moduleStates[key].pretestQuestionIds).toBeInstanceOf(Set);
    });

    it("copies questionOrder from questionSlots", () => {
      const state = startTest(initialState);
      const questionSlots = { "reading-writing-1": ["q1", "q2", "q3"] };
      const next = startModule(state, "reading-writing", 1, 600_000, questionSlots);
      const key = getModuleKey("reading-writing", 1);
      expect(next.moduleStates[key].questionOrder).toEqual(["q1", "q2", "q3"]);
    });

    it("copies pretestQuestionIds from pretestSlots", () => {
      const state = startTest(initialState);
      const pretestSlots = { "reading-writing-1": ["pt1", "pt2"] };
      const next = startModule(state, "reading-writing", 1, 600_000, {}, pretestSlots);
      const key = getModuleKey("reading-writing", 1);
      expect(Array.from(next.moduleStates[key].pretestQuestionIds)).toEqual([
        "pt1",
        "pt2",
      ]);
    });

    it("sets difficulty for Module 2 based on module2Difficulty", () => {
      const state = startTest(initialState);
      const next = startModule(
        state,
        "reading-writing",
        2,
        600_000,
        {},
        {},
        { "reading-writing": "harder" },
      );
      const key = getModuleKey("reading-writing", 2);
      expect(next.moduleStates[key].difficulty).toBe("harder");
    });

    it("defaults Module 2 difficulty to 'easier' when not set", () => {
      const state = startTest(initialState);
      const next = startModule(state, "reading-writing", 2, 600_000);
      const key = getModuleKey("reading-writing", 2);
      expect(next.moduleStates[key].difficulty).toBe("easier");
    });

    it("does not set difficulty for Module 1", () => {
      const state = startTest(initialState);
      const next = startModule(state, "math", 1, 600_000);
      const key = getModuleKey("math", 1);
      expect(next.moduleStates[key].difficulty).toBeUndefined();
    });

    it("preserves existing module state when restarting same module", () => {
      const state = startTest(initialState);
      const first = startModule(state, "reading-writing", 1, 600_000);
      const key = getModuleKey("reading-writing", 1);

      // Mark some state in the existing module
      const withAnswer: FullLengthSession = {
        ...first,
        moduleStates: {
          ...first.moduleStates,
          [key]: {
            ...first.moduleStates[key],
            answers: { q1: "A" },
            flaggedForReview: new Set(["q2"]),
          },
        },
      };

      // Starting same module should NOT reset existing state (just set status)
      const second = dispatch(withAnswer, {
        type: "START_MODULE",
        payload: { section: "reading-writing", moduleNumber: 1, timeRemainingMs: 700_000 },
      });

      // Answers and flagged questions should be preserved
      expect(second.moduleStates[key].answers).toEqual({ q1: "A" });
      expect(second.moduleStates[key].flaggedForReview.has("q2")).toBe(true);
      // timeRemainingMs should be updated because existingModuleState is reused
      // Actually looking at the code: it merges with newModuleState which has timeRemainingMs
      // But existingModuleState is used if it exists, so the old timeRemainingMs is kept
      expect(second.moduleStates[key].timeRemainingMs).toBe(600_000);
      expect(second.moduleStates[key].status).toBe("in_progress");
    });
  });

  // ─── SET_QUESTION_ANSWER ────────────────────────────────────────────
  describe("SET_QUESTION_ANSWER", () => {
    function activeState(): FullLengthSession {
      let s = startTest(initialState);
      s = dispatch(s, {
        type: "START_MODULE",
        payload: { section: "reading-writing", moduleNumber: 1, timeRemainingMs: 600_000 },
      });
      return s;
    }

    it("sets an answer for a question in the current module", () => {
      const state = activeState();
      const next = dispatch(state, {
        type: "SET_QUESTION_ANSWER",
        payload: { questionId: "q1", answer: "B" },
      });
      const key = getModuleKey("reading-writing", 1);
      expect(next.moduleStates[key].answers["q1"]).toBe("B");
    });

    it("updates a previous answer", () => {
      const state = dispatch(activeState(), {
        type: "SET_QUESTION_ANSWER",
        payload: { questionId: "q1", answer: "B" },
      });
      const next = dispatch(state, {
        type: "SET_QUESTION_ANSWER",
        payload: { questionId: "q1", answer: "C" },
      });
      const key = getModuleKey("reading-writing", 1);
      expect(next.moduleStates[key].answers["q1"]).toBe("C");
    });

    it("accepts null answer (clearing)", () => {
      const state = dispatch(activeState(), {
        type: "SET_QUESTION_ANSWER",
        payload: { questionId: "q1", answer: "B" },
      });
      const next = dispatch(state, {
        type: "SET_QUESTION_ANSWER",
        payload: { questionId: "q1", answer: null },
      });
      const key = getModuleKey("reading-writing", 1);
      expect(next.moduleStates[key].answers["q1"]).toBeNull();
    });

    it("returns state unchanged when current module has no state", () => {
      const state = startTest(initialState);
      const next = dispatch(state, {
        type: "SET_QUESTION_ANSWER",
        payload: { questionId: "q1", answer: "A" },
      });
      expect(next).toBe(state);
    });

    it("targets math module when currentSectionIndex is 1", () => {
      let s = startTest(initialState);
      s = dispatch(s, { type: "START_SECTION", payload: { sectionIndex: 1 } });
      s = dispatch(s, {
        type: "START_MODULE",
        payload: { section: "math", moduleNumber: 1, timeRemainingMs: 600_000 },
      });
      const next = dispatch(s, {
        type: "SET_QUESTION_ANSWER",
        payload: { questionId: "mq1", answer: "42" },
      });
      const key = getModuleKey("math", 1);
      expect(next.moduleStates[key].answers["mq1"]).toBe("42");
    });
  });

  // ─── NAVIGATE_QUESTION ──────────────────────────────────────────────
  describe("NAVIGATE_QUESTION", () => {
    it("sets currentQuestionIndex", () => {
      const state = startTest(initialState);
      const next = dispatch(state, {
        type: "NAVIGATE_QUESTION",
        payload: { questionIndex: 5 },
      });
      expect(next.currentQuestionIndex).toBe(5);
    });

    it("accepts index 0", () => {
      const state = dispatch(startTest(initialState), {
        type: "NAVIGATE_QUESTION",
        payload: { questionIndex: 3 },
      });
      const next = dispatch(state, {
        type: "NAVIGATE_QUESTION",
        payload: { questionIndex: 0 },
      });
      expect(next.currentQuestionIndex).toBe(0);
    });
  });

  // ─── TOGGLE_FLAG_FOR_REVIEW ─────────────────────────────────────────
  describe("TOGGLE_FLAG_FOR_REVIEW", () => {
    function activeState(): FullLengthSession {
      let s = startTest(initialState);
      s = dispatch(s, {
        type: "START_MODULE",
        payload: { section: "reading-writing", moduleNumber: 1, timeRemainingMs: 600_000 },
      });
      return s;
    }

    it("adds a questionId to flaggedForReview", () => {
      const state = activeState();
      const next = dispatch(state, {
        type: "TOGGLE_FLAG_FOR_REVIEW",
        payload: { questionId: "q1" },
      });
      const key = getModuleKey("reading-writing", 1);
      expect(next.moduleStates[key].flaggedForReview.has("q1")).toBe(true);
      expect(next.moduleStates[key].flaggedForReview.size).toBe(1);
    });

    it("removes an already-flagged questionId", () => {
      const key = getModuleKey("reading-writing", 1);
      const seeded: FullLengthSession = {
        ...activeState(),
        moduleStates: {
          ...activeState().moduleStates,
          [key]: {
            ...activeState().moduleStates[key],
            flaggedForReview: new Set(["q1", "q2"]),
          },
        },
      };
      const next = dispatch(seeded, {
        type: "TOGGLE_FLAG_FOR_REVIEW",
        payload: { questionId: "q1" },
      });
      expect(next.moduleStates[key].flaggedForReview.has("q1")).toBe(false);
      expect(next.moduleStates[key].flaggedForReview.has("q2")).toBe(true);
      expect(next.moduleStates[key].flaggedForReview.size).toBe(1);
    });

    it("creates a new Set (immutable update)", () => {
      const state = activeState();
      const key = getModuleKey("reading-writing", 1);
      const originalSet = state.moduleStates[key].flaggedForReview;
      const next = dispatch(state, {
        type: "TOGGLE_FLAG_FOR_REVIEW",
        payload: { questionId: "q1" },
      });
      expect(next.moduleStates[key].flaggedForReview).not.toBe(originalSet);
    });

    it("returns state unchanged when current module has no state", () => {
      const state = startTest(initialState);
      const next = dispatch(state, {
        type: "TOGGLE_FLAG_FOR_REVIEW",
        payload: { questionId: "q1" },
      });
      expect(next).toBe(state);
    });
  });

  // ─── COMPLETE_MODULE ────────────────────────────────────────────────
  describe("COMPLETE_MODULE", () => {
    function startedModule(): FullLengthSession {
      let s = startTest(initialState);
      s = dispatch(s, {
        type: "START_MODULE",
        payload: { section: "reading-writing", moduleNumber: 1, timeRemainingMs: 600_000 },
      });
      return s;
    }

    it("sets module status to completed", () => {
      const state = startedModule();
      const next = dispatch(state, {
        type: "COMPLETE_MODULE",
        payload: { section: "reading-writing", moduleNumber: 1 },
      });
      const key = getModuleKey("reading-writing", 1);
      expect(next.moduleStates[key].status).toBe("completed");
    });

    it("sets phase to module-complete", () => {
      const state = startedModule();
      const next = dispatch(state, {
        type: "COMPLETE_MODULE",
        payload: { section: "reading-writing", moduleNumber: 1 },
      });
      expect(next.phase).toBe("module-complete");
    });

    it("returns state unchanged when module state does not exist", () => {
      const state = startTest(initialState);
      const next = dispatch(state, {
        type: "COMPLETE_MODULE",
        payload: { section: "reading-writing", moduleNumber: 1 },
      });
      expect(next).toBe(state);
    });
  });

  // ─── SET_MODULE2_DIFFICULTY ─────────────────────────────────────────
  describe("SET_MODULE2_DIFFICULTY", () => {
    it("sets difficulty for a section", () => {
      const state = startTest(initialState);
      const next = dispatch(state, {
        type: "SET_MODULE2_DIFFICULTY",
        payload: { section: "reading-writing", difficulty: "harder" },
      });
      expect(next.module2Difficulty["reading-writing"]).toBe("harder");
    });

    it("updates existing difficulty", () => {
      const state = dispatch(startTest(initialState), {
        type: "SET_MODULE2_DIFFICULTY",
        payload: { section: "reading-writing", difficulty: "harder" },
      });
      const next = dispatch(state, {
        type: "SET_MODULE2_DIFFICULTY",
        payload: { section: "reading-writing", difficulty: "easier" },
      });
      expect(next.module2Difficulty["reading-writing"]).toBe("easier");
    });

    it("handles math section separately", () => {
      const state = startTest(initialState);
      const withRW = dispatch(state, {
        type: "SET_MODULE2_DIFFICULTY",
        payload: { section: "reading-writing", difficulty: "harder" },
      });
      const next = dispatch(withRW, {
        type: "SET_MODULE2_DIFFICULTY",
        payload: { section: "math", difficulty: "easier" },
      });
      expect(next.module2Difficulty["reading-writing"]).toBe("harder");
      expect(next.module2Difficulty["math"]).toBe("easier");
    });
  });

  // ─── TICK_MODULE_TIMER ──────────────────────────────────────────────
  describe("TICK_MODULE_TIMER", () => {
    function activeState(initialMs = 600_000): FullLengthSession {
      let s = startTest(initialState);
      s = dispatch(s, {
        type: "START_MODULE",
        payload: { section: "reading-writing", moduleNumber: 1, timeRemainingMs: initialMs },
      });
      return s;
    }

    it("decrements timeRemainingMs by elapsedMs", () => {
      const state = activeState();
      const next = dispatch(state, {
        type: "TICK_MODULE_TIMER",
        payload: { elapsedMs: 10_000 },
      });
      const key = getModuleKey("reading-writing", 1);
      expect(next.moduleStates[key].timeRemainingMs).toBe(590_000);
    });

    it("increments totalTimeSpentMs by elapsedMs", () => {
      const state = activeState();
      const next = dispatch(state, {
        type: "TICK_MODULE_TIMER",
        payload: { elapsedMs: 15_000 },
      });
      expect(next.totalTimeSpentMs).toBe(15_000);
    });

    it("accumulates totalTimeSpentMs across ticks", () => {
      const state = activeState();
      const afterFirst = dispatch(state, {
        type: "TICK_MODULE_TIMER",
        payload: { elapsedMs: 10_000 },
      });
      const afterSecond = dispatch(afterFirst, {
        type: "TICK_MODULE_TIMER",
        payload: { elapsedMs: 20_000 },
      });
      expect(afterSecond.totalTimeSpentMs).toBe(30_000);
    });

    it("clamps timeRemainingMs to 0", () => {
      const state = activeState(5_000);
      const next = dispatch(state, {
        type: "TICK_MODULE_TIMER",
        payload: { elapsedMs: 10_000 },
      });
      const key = getModuleKey("reading-writing", 1);
      expect(next.moduleStates[key].timeRemainingMs).toBe(0);
    });

    it("auto-completes module when time runs out (sets status, changes phase)", () => {
      const state = activeState(5_000);
      const next = dispatch(state, {
        type: "TICK_MODULE_TIMER",
        payload: { elapsedMs: 5_000 },
      });
      const key = getModuleKey("reading-writing", 1);
      expect(next.moduleStates[key].status).toBe("completed");
      expect(next.moduleStates[key].timeRemainingMs).toBe(0);
      expect(next.phase).toBe("module-complete");
    });

    it("does NOT increment totalTimeSpentMs when time runs out (returns early)", () => {
      const state = activeState(5_000);
      const next = dispatch(state, {
        type: "TICK_MODULE_TIMER",
        payload: { elapsedMs: 5_000 },
      });
      // When auto-completing, the code does NOT add elapsedMs to totalTimeSpentMs
      // because it returns early before reaching that code path
      expect(next.totalTimeSpentMs).toBe(0);
    });

    it("returns state unchanged when current module has no state", () => {
      const state = startTest(initialState);
      const next = dispatch(state, {
        type: "TICK_MODULE_TIMER",
        payload: { elapsedMs: 10_000 },
      });
      expect(next).toBe(state);
    });
  });

  // ─── START_BREAK ────────────────────────────────────────────────────
  describe("START_BREAK", () => {
    it("sets phase to 'break'", () => {
      const state = startTest(initialState);
      const next = dispatch(state, { type: "START_BREAK" });
      expect(next.phase).toBe("break");
    });

    it("sets breakTaken to true", () => {
      const state = startTest(initialState);
      const next = dispatch(state, { type: "START_BREAK" });
      expect(next.breakTaken).toBe(true);
    });

    it("sets breakTimeRemainingMs to 600000 (10 minutes)", () => {
      const state = startTest(initialState);
      const next = dispatch(state, { type: "START_BREAK" });
      expect(next.breakTimeRemainingMs).toBe(600_000);
    });
  });

  // ─── TICK_BREAK_TIMER ───────────────────────────────────────────────
  describe("TICK_BREAK_TIMER", () => {
    function breakState(breakTimeRemainingMs = 600_000): FullLengthSession {
      let s = startTest(initialState);
      s = dispatch(s, { type: "START_BREAK" });
      return { ...s, breakTimeRemainingMs };
    }

    it("decrements breakTimeRemainingMs by elapsedMs", () => {
      const state = breakState();
      const next = dispatch(state, {
        type: "TICK_BREAK_TIMER",
        payload: { elapsedMs: 10_000 },
      });
      expect(next.breakTimeRemainingMs).toBe(590_000);
    });

    it("clamps breakTimeRemainingMs to 0", () => {
      const state = breakState(5_000);
      const next = dispatch(state, {
        type: "TICK_BREAK_TIMER",
        payload: { elapsedMs: 10_000 },
      });
      expect(next.breakTimeRemainingMs).toBe(0);
    });

    it("auto-transitions to section-intro when break time runs out", () => {
      const state = breakState(10_000);
      const next = dispatch(state, {
        type: "TICK_BREAK_TIMER",
        payload: { elapsedMs: 10_000 },
      });
      expect(next.phase).toBe("section-intro");
      expect(next.breakTimeRemainingMs).toBe(0);
    });

    it("preserves phase when break still has time remaining", () => {
      const state = breakState(600_000);
      const next = dispatch(state, {
        type: "TICK_BREAK_TIMER",
        payload: { elapsedMs: 60_000 },
      });
      expect(next.phase).toBe("break");
      expect(next.breakTimeRemainingMs).toBe(540_000);
    });
  });

  // ─── COMPLETE_BREAK ─────────────────────────────────────────────────
  describe("COMPLETE_BREAK", () => {
    it("sets breakTimeRemainingMs to 0", () => {
      const state = dispatch(startTest(initialState), { type: "START_BREAK" });
      const next = dispatch(state, { type: "COMPLETE_BREAK" });
      expect(next.breakTimeRemainingMs).toBe(0);
    });

    it("sets phase to section-intro", () => {
      const state = dispatch(startTest(initialState), { type: "START_BREAK" });
      const next = dispatch(state, { type: "COMPLETE_BREAK" });
      expect(next.phase).toBe("section-intro");
    });
  });

  // ─── COMPLETE_SECTION ───────────────────────────────────────────────
  describe("COMPLETE_SECTION", () => {
    it("appends a section result to sectionResults", () => {
      const state = startTest(initialState);
      const result1 = makeSectionResult("reading-writing");
      const afterFirst = dispatch(state, {
        type: "COMPLETE_SECTION",
        payload: { result: result1 },
      });
      expect(afterFirst.sectionResults).toHaveLength(1);
      expect(afterFirst.sectionResults[0]).toEqual(result1);

      const result2 = makeSectionResult("math");
      const afterSecond = dispatch(afterFirst, {
        type: "COMPLETE_SECTION",
        payload: { result: result2 },
      });
      expect(afterSecond.sectionResults).toHaveLength(2);
      expect(afterSecond.sectionResults[1]).toEqual(result2);
    });

    it("does not mutate the original sectionResults array", () => {
      const state = startTest(initialState);
      const original = state.sectionResults;
      const next = dispatch(state, {
        type: "COMPLETE_SECTION",
        payload: { result: makeSectionResult("reading-writing") },
      });
      expect(next.sectionResults).not.toBe(original);
    });
  });

  // ─── COMPLETE_TEST ──────────────────────────────────────────────────
  describe("COMPLETE_TEST", () => {
    it("sets status to COMPLETED", () => {
      const state = startTest(initialState);
      const result = makeTestResult();
      const next = dispatch(state, {
        type: "COMPLETE_TEST",
        payload: { result },
      });
      expect(next.status).toBe(SessionStatus.COMPLETED);
    });

    it("sets completedAt to a valid ISO string", () => {
      const state = startTest(initialState);
      const next = dispatch(state, {
        type: "COMPLETE_TEST",
        payload: { result: makeTestResult() },
      });
      expect(new Date(next.completedAt!).toISOString()).toBe(next.completedAt);
    });

    it("sets phase to test-complete", () => {
      const state = startTest(initialState);
      const next = dispatch(state, {
        type: "COMPLETE_TEST",
        payload: { result: makeTestResult() },
      });
      expect(next.phase).toBe("test-complete");
    });

    it("sets testResult", () => {
      const state = startTest(initialState);
      const result = makeTestResult();
      const next = dispatch(state, {
        type: "COMPLETE_TEST",
        payload: { result },
      });
      expect(next.testResult).toEqual(result);
    });
  });

  // ─── RESTORE_SESSION ───────────────────────────────────────────────
  describe("RESTORE_SESSION", () => {
    function buildSession(): FullLengthSession {
      let s = startTest(initialState);
      s = dispatch(s, {
        type: "START_MODULE",
        payload: { section: "reading-writing", moduleNumber: 1, timeRemainingMs: 600_000 },
      });
      s = dispatch(s, {
        type: "SET_QUESTION_ANSWER",
        payload: { questionId: "q1", answer: "B" },
      });
      s = dispatch(s, {
        type: "TOGGLE_FLAG_FOR_REVIEW",
        payload: { questionId: "q2" },
      });
      return s;
    }

    it("replaces entire state with the payload", () => {
      const original = buildSession();
      const restored = dispatch(initialState, {
        type: "RESTORE_SESSION",
        payload: original,
      });
      expect(restored.sessionId).toBe(original.sessionId);
      expect(restored.status).toBe(original.status);
      expect(restored.phase).toBe(original.phase);
    });

    it("converts array-based flaggedForReview back to Sets", () => {
      const key = getModuleKey("reading-writing", 1);
      const payload: FullLengthSession = {
        ...buildSession(),
        moduleStates: {
          [key]: {
            ...buildSession().moduleStates[key],
            flaggedForReview: ["q2"] as any, // simulate JSON-deserialized array
            pretestQuestionIds: ["pt1"] as any,
          },
        },
      };
      const restored = dispatch(initialState, {
        type: "RESTORE_SESSION",
        payload,
      });
      expect(restored.moduleStates[key].flaggedForReview).toBeInstanceOf(Set);
      expect(restored.moduleStates[key].flaggedForReview.has("q2")).toBe(true);
      expect(restored.moduleStates[key].pretestQuestionIds).toBeInstanceOf(Set);
      expect(restored.moduleStates[key].pretestQuestionIds.has("pt1")).toBe(true);
    });

    it("handles non-array flaggedForReview gracefully", () => {
      const key = getModuleKey("reading-writing", 1);
      const payload: FullLengthSession = {
        ...buildSession(),
        moduleStates: {
          [key]: {
            ...buildSession().moduleStates[key],
            flaggedForReview: null as any,
            pretestQuestionIds: undefined as any,
          },
        },
      };
      const restored = dispatch(initialState, {
        type: "RESTORE_SESSION",
        payload,
      });
      expect(restored.moduleStates[key].flaggedForReview).toBeInstanceOf(Set);
      expect(restored.moduleStates[key].flaggedForReview.size).toBe(0);
      expect(restored.moduleStates[key].pretestQuestionIds).toBeInstanceOf(Set);
      expect(restored.moduleStates[key].pretestQuestionIds.size).toBe(0);
    });

    it("resets flaggedForReview when Sets are passed (only arrays are restored)", () => {
      // RESTORE_SESSION only converts arrays → Sets. If a Set is passed directly,
      // Array.isArray returns false and it falls through to [].
      const payload = buildSession();
      const key = getModuleKey("reading-writing", 1);
      expect(payload.moduleStates[key].flaggedForReview).toBeInstanceOf(Set);
      const restored = dispatch(initialState, {
        type: "RESTORE_SESSION",
        payload,
      });
      expect(restored.moduleStates[key].flaggedForReview).toBeInstanceOf(Set);
      // Since the reducer only handles arrays, the Set gets replaced with an empty one
      expect(restored.moduleStates[key].flaggedForReview.size).toBe(0);
    });
  });

  // ─── Default case (unknown action) ──────────────────────────────────
  describe("unknown action", () => {
    it("returns state unchanged", () => {
      const state = startTest(initialState);
      const next = fullLengthReducer(state, {
        type: "UNKNOWN_ACTION" as any,
        payload: {},
      } as any);
      expect(next).toBe(state);
    });
  });
});

// ─── Helper Functions ─────────────────────────────────────────────────────────

describe("getCurrentSection()", () => {
  it("returns 'reading-writing' for index 0", () => {
    const state: FullLengthSession = {
      ...createInitialFullLengthState(),
      currentSectionIndex: 0,
    };
    expect(getCurrentSection(state)).toBe("reading-writing");
  });

  it("returns 'math' for index 1", () => {
    const state: FullLengthSession = {
      ...createInitialFullLengthState(),
      currentSectionIndex: 1,
    };
    expect(getCurrentSection(state)).toBe("math");
  });
});

describe("getCurrentModuleState()", () => {
  it("returns the module state for the current section/module", () => {
    const key = getModuleKey("reading-writing", 1);
    const moduleState: FullLengthModuleState = {
      section: "reading-writing",
      moduleNumber: 1,
      status: "in_progress",
      timeRemainingMs: 600_000,
      questionOrder: [],
      answers: {},
      questionTimes: {},
      flaggedForReview: new Set(),
      pretestQuestionIds: new Set(),
    };
    const state: FullLengthSession = {
      ...createInitialFullLengthState(),
      moduleStates: { [key]: moduleState },
      currentSectionIndex: 0,
      currentModuleNumber: 1,
    };
    expect(getCurrentModuleState(state)).toEqual(moduleState);
  });

  it("returns null when module state does not exist", () => {
    const state: FullLengthSession = {
      ...createInitialFullLengthState(),
      currentSectionIndex: 0,
      currentModuleNumber: 1,
    };
    expect(getCurrentModuleState(state)).toBeNull();
  });
});

describe("getTotalAnsweredQuestions()", () => {
  it("counts non-null answers across all modules", () => {
    const state: FullLengthSession = {
      ...createInitialFullLengthState(),
      moduleStates: {
        [getModuleKey("reading-writing", 1)]: {
          section: "reading-writing",
          moduleNumber: 1,
          status: "in_progress",
          timeRemainingMs: 600_000,
          questionOrder: ["q1", "q2", "q3"],
          answers: { q1: "A", q2: null, q3: "C" },
          questionTimes: {},
          flaggedForReview: new Set(),
          pretestQuestionIds: new Set(),
        },
        [getModuleKey("reading-writing", 2)]: {
          section: "reading-writing",
          moduleNumber: 2,
          status: "in_progress",
          timeRemainingMs: 600_000,
          questionOrder: ["q4"],
          answers: { q4: "D" },
          questionTimes: {},
          flaggedForReview: new Set(),
          pretestQuestionIds: new Set(),
        },
      },
    };
    // q1=A (counted), q2=null (not counted), q3=C (counted), q4=D (counted) = 3
    expect(getTotalAnsweredQuestions(state)).toBe(3);
  });

  it("returns 0 for empty moduleStates", () => {
    expect(getTotalAnsweredQuestions(createInitialFullLengthState())).toBe(0);
  });
});

describe("getTotalQuestions()", () => {
  it("sums questionOrder length across all modules", () => {
    const state: FullLengthSession = {
      ...createInitialFullLengthState(),
      moduleStates: {
        [getModuleKey("reading-writing", 1)]: {
          section: "reading-writing",
          moduleNumber: 1,
          status: "in_progress",
          timeRemainingMs: 600_000,
          questionOrder: ["q1", "q2", "q3"],
          answers: {},
          questionTimes: {},
          flaggedForReview: new Set(),
          pretestQuestionIds: new Set(),
        },
        [getModuleKey("reading-writing", 2)]: {
          section: "reading-writing",
          moduleNumber: 2,
          status: "in_progress",
          timeRemainingMs: 600_000,
          questionOrder: ["q4", "q5"],
          answers: {},
          questionTimes: {},
          flaggedForReview: new Set(),
          pretestQuestionIds: new Set(),
        },
      },
    };
    expect(getTotalQuestions(state)).toBe(5);
  });

  it("returns 0 for empty moduleStates", () => {
    expect(getTotalQuestions(createInitialFullLengthState())).toBe(0);
  });
});

describe("isQuestionFlagged()", () => {
  it("returns true for a flagged question in the current module", () => {
    const key = getModuleKey("reading-writing", 1);
    const state: FullLengthSession = {
      ...createInitialFullLengthState(),
      currentSectionIndex: 0,
      currentModuleNumber: 1,
      moduleStates: {
        [key]: {
          section: "reading-writing",
          moduleNumber: 1,
          status: "in_progress",
          timeRemainingMs: 600_000,
          questionOrder: ["q1", "q2"],
          answers: {},
          questionTimes: {},
          flaggedForReview: new Set(["q1"]),
          pretestQuestionIds: new Set(),
        },
      },
    };
    expect(isQuestionFlagged(state, "q1")).toBe(true);
    expect(isQuestionFlagged(state, "q2")).toBe(false);
  });

  it("returns false when no module state exists", () => {
    const state = createInitialFullLengthState();
    expect(isQuestionFlagged(state, "q1")).toBe(false);
  });
});

describe("isQuestionPretest()", () => {
  it("returns true for a pretest question in the current module", () => {
    const key = getModuleKey("reading-writing", 1);
    const state: FullLengthSession = {
      ...createInitialFullLengthState(),
      currentSectionIndex: 0,
      currentModuleNumber: 1,
      moduleStates: {
        [key]: {
          section: "reading-writing",
          moduleNumber: 1,
          status: "in_progress",
          timeRemainingMs: 600_000,
          questionOrder: ["q1", "pt1"],
          answers: {},
          questionTimes: {},
          flaggedForReview: new Set(),
          pretestQuestionIds: new Set(["pt1"]),
        },
      },
    };
    expect(isQuestionPretest(state, "pt1")).toBe(true);
    expect(isQuestionPretest(state, "q1")).toBe(false);
  });

  it("returns false when no module state exists", () => {
    const state = createInitialFullLengthState();
    expect(isQuestionPretest(state, "pt1")).toBe(false);
  });
});

describe("getQuestionAnswer()", () => {
  it("returns the answer for a question in the current module", () => {
    const key = getModuleKey("reading-writing", 1);
    const state: FullLengthSession = {
      ...createInitialFullLengthState(),
      currentSectionIndex: 0,
      currentModuleNumber: 1,
      moduleStates: {
        [key]: {
          section: "reading-writing",
          moduleNumber: 1,
          status: "in_progress",
          timeRemainingMs: 600_000,
          questionOrder: ["q1"],
          answers: { q1: "C" },
          questionTimes: {},
          flaggedForReview: new Set(),
          pretestQuestionIds: new Set(),
        },
      },
    };
    expect(getQuestionAnswer(state, "q1")).toBe("C");
  });

  it("returns null for unanswered question", () => {
    const key = getModuleKey("reading-writing", 1);
    const state: FullLengthSession = {
      ...createInitialFullLengthState(),
      currentSectionIndex: 0,
      currentModuleNumber: 1,
      moduleStates: {
        [key]: {
          section: "reading-writing",
          moduleNumber: 1,
          status: "in_progress",
          timeRemainingMs: 600_000,
          questionOrder: ["q1"],
          answers: {},
          questionTimes: {},
          flaggedForReview: new Set(),
          pretestQuestionIds: new Set(),
        },
      },
    };
    expect(getQuestionAnswer(state, "q1")).toBeNull();
  });

  it("returns null when no module state exists", () => {
    const state = createInitialFullLengthState();
    expect(getQuestionAnswer(state, "q1")).toBeNull();
  });
});

// ─── Serialization ────────────────────────────────────────────────────────────

describe("serializeFullLengthSession()", () => {
  it("converts Sets to arrays in the JSON output", () => {
    const key = getModuleKey("reading-writing", 1);
    const session: FullLengthSession = {
      ...createInitialFullLengthState(),
      sessionId: "test-session",
      createdAt: new Date().toISOString(),
      status: SessionStatus.IN_PROGRESS,
      moduleStates: {
        [key]: {
          section: "reading-writing",
          moduleNumber: 1,
          status: "in_progress",
          timeRemainingMs: 600_000,
          questionOrder: ["q1", "q2"],
          answers: { q1: "A" },
          questionTimes: {},
          flaggedForReview: new Set(["q2"]),
          pretestQuestionIds: new Set(["pt1"]),
        },
      },
    };

    const json = serializeFullLengthSession(session);
    const parsed = JSON.parse(json);

    expect(Array.isArray(parsed.moduleStates[key].flaggedForReview)).toBe(true);
    expect(parsed.moduleStates[key].flaggedForReview).toEqual(["q2"]);
    expect(Array.isArray(parsed.moduleStates[key].pretestQuestionIds)).toBe(true);
    expect(parsed.moduleStates[key].pretestQuestionIds).toEqual(["pt1"]);
  });

  it("returns a valid JSON string", () => {
    const session = createInitialFullLengthState();
    const json = serializeFullLengthSession(session);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it("preserves non-Set fields", () => {
    const session: FullLengthSession = {
      ...createInitialFullLengthState(),
      sessionId: "sid-1",
      status: SessionStatus.IN_PROGRESS,
      currentSectionIndex: 1,
    };
    const json = serializeFullLengthSession(session);
    const parsed = JSON.parse(json);
    expect(parsed.sessionId).toBe("sid-1");
    expect(parsed.currentSectionIndex).toBe(1);
  });
});

describe("deserializeFullLengthSession()", () => {
  it("restores arrays back to Sets", () => {
    const key = getModuleKey("reading-writing", 1);
    const json = JSON.stringify({
      sessionId: "test-session",
      createdAt: new Date().toISOString(),
      completedAt: null,
      status: "in_progress",
      config: defaultConfig(),
      assessment: "SAT",
      phase: "module-active",
      currentSectionIndex: 0,
      currentModuleNumber: 1,
      currentQuestionIndex: 2,
      moduleStates: {
        [key]: {
          section: "reading-writing",
          moduleNumber: 1,
          status: "in_progress",
          timeRemainingMs: 600_000,
          questionOrder: ["q1", "q2"],
          answers: { q1: "A" },
          questionTimes: {},
          flaggedForReview: ["q2"],
          pretestQuestionIds: ["pt1"],
        },
      },
      module2Difficulty: {},
      breakTaken: false,
      breakTimeRemainingMs: 0,
      questionSlots: {},
      pretestSlots: {},
      sectionResults: [],
      testResult: null,
      totalTimeSpentMs: 0,
      savedToHistory: false,
    });

    const restored = deserializeFullLengthSession(json);
    expect(restored).not.toBeNull();
    expect(restored!.moduleStates[key].flaggedForReview).toBeInstanceOf(Set);
    expect(restored!.moduleStates[key].flaggedForReview.has("q2")).toBe(true);
    expect(restored!.moduleStates[key].pretestQuestionIds).toBeInstanceOf(Set);
    expect(restored!.moduleStates[key].pretestQuestionIds.has("pt1")).toBe(true);
  });

  it("returns null for invalid JSON", () => {
    expect(deserializeFullLengthSession("not-json")).toBeNull();
  });

  it("handles empty moduleStates gracefully", () => {
    const json = JSON.stringify({
      ...createInitialFullLengthState(),
      moduleStates: {},
    });
    const restored = deserializeFullLengthSession(json);
    expect(restored).not.toBeNull();
    expect(restored!.moduleStates).toEqual({});
  });

  it("round-trips: serialize → deserialize yields equivalent state", () => {
    let original = startTest(createInitialFullLengthState(), defaultConfig(), "SAT");
    original = dispatch(original, {
      type: "START_MODULE",
      payload: { section: "reading-writing", moduleNumber: 1, timeRemainingMs: 600_000 },
    });
    original = dispatch(original, {
      type: "SET_QUESTION_ANSWER",
      payload: { questionId: "q1", answer: "B" },
    });
    original = dispatch(original, {
      type: "TOGGLE_FLAG_FOR_REVIEW",
      payload: { questionId: "q2" },
    });

    const json = serializeFullLengthSession(original);
    const restored = deserializeFullLengthSession(json);

    expect(restored).not.toBeNull();
    expect(restored!.sessionId).toBe(original.sessionId);
    expect(restored!.status).toBe(original.status);

    const key = getModuleKey("reading-writing", 1);
    expect(restored!.moduleStates[key].answers).toEqual(
      original.moduleStates[key].answers,
    );
    expect(Array.from(restored!.moduleStates[key].flaggedForReview)).toEqual(
      Array.from(original.moduleStates[key].flaggedForReview),
    );
    expect(Array.from(restored!.moduleStates[key].pretestQuestionIds)).toEqual(
      Array.from(original.moduleStates[key].pretestQuestionIds),
    );
  });
});

// ─── Integration: Full Test Lifecycle ─────────────────────────────────────────

describe("full test lifecycle", () => {
  it("progresses through a complete test end-to-end", () => {
    // Start
    let state = startTest(createInitialFullLengthState());

    // Section 1 (Reading & Writing) — Module 1
    state = dispatch(state, {
      type: "START_SECTION",
      payload: { sectionIndex: 0 },
    });
    expect(state.phase).toBe("section-intro");
    expect(state.currentSectionIndex).toBe(0);
    expect(state.currentModuleNumber).toBe(1);

    state = dispatch(state, {
      type: "START_MODULE",
      payload: { section: "reading-writing", moduleNumber: 1, timeRemainingMs: 32 * 60 * 1000 },
    });
    expect(state.phase).toBe("module-active");

    // Answer some questions
    state = dispatch(state, {
      type: "SET_QUESTION_ANSWER",
      payload: { questionId: "rw-m1-q1", answer: "A" },
    });
    state = dispatch(state, {
      type: "SET_QUESTION_ANSWER",
      payload: { questionId: "rw-m1-q2", answer: "C" },
    });
    state = dispatch(state, {
      type: "NAVIGATE_QUESTION",
      payload: { questionIndex: 5 },
    });
    expect(state.currentQuestionIndex).toBe(5);

    // Flag a question
    state = dispatch(state, {
      type: "TOGGLE_FLAG_FOR_REVIEW",
      payload: { questionId: "rw-m1-q1" },
    });
    expect(
      isQuestionFlagged(state, "rw-m1-q1"),
    ).toBe(true);

    // Tick timer
    state = dispatch(state, {
      type: "TICK_MODULE_TIMER",
      payload: { elapsedMs: 60_000 },
    });
    const rw1Key = getModuleKey("reading-writing", 1);
    expect(state.moduleStates[rw1Key].timeRemainingMs).toBe(32 * 60 * 1000 - 60_000);
    expect(state.totalTimeSpentMs).toBe(60_000);

    // Complete Module 1
    state = dispatch(state, {
      type: "COMPLETE_MODULE",
      payload: { section: "reading-writing", moduleNumber: 1 },
    });
    expect(state.moduleStates[rw1Key].status).toBe("completed");
    expect(state.phase).toBe("module-complete");

    // Set Module 2 difficulty
    state = dispatch(state, {
      type: "SET_MODULE2_DIFFICULTY",
      payload: { section: "reading-writing", difficulty: "harder" },
    });
    expect(state.module2Difficulty["reading-writing"]).toBe("harder");

    // Section 1 — Module 2
    state = dispatch(state, {
      type: "START_MODULE",
      payload: { section: "reading-writing", moduleNumber: 2, timeRemainingMs: 32 * 60 * 1000 },
    });
    expect(state.currentModuleNumber).toBe(2);
    expect(state.phase).toBe("module-active");

    // Answer Module 2 questions
    state = dispatch(state, {
      type: "SET_QUESTION_ANSWER",
      payload: { questionId: "rw-m2-q1", answer: "D" },
    });
    // Check pretest/answers helpers
    expect(getQuestionAnswer(state, "rw-m2-q1")).toBe("D");
    expect(getTotalAnsweredQuestions(state)).toBe(3);

    // Complete Module 2
    state = dispatch(state, {
      type: "COMPLETE_MODULE",
      payload: { section: "reading-writing", moduleNumber: 2 },
    });

    // Complete section
    state = dispatch(state, {
      type: "COMPLETE_SECTION",
      payload: { result: makeSectionResult("reading-writing") },
    });
    expect(state.sectionResults).toHaveLength(1);

    // Break
    state = dispatch(state, { type: "START_BREAK" });
    expect(state.phase).toBe("break");
    expect(state.breakTimeRemainingMs).toBe(600_000);
    expect(state.breakTaken).toBe(true);

    // Tick break timer
    state = dispatch(state, {
      type: "TICK_BREAK_TIMER",
      payload: { elapsedMs: 60_000 },
    });
    expect(state.breakTimeRemainingMs).toBe(540_000);

    // Complete break
    state = dispatch(state, { type: "COMPLETE_BREAK" });
    expect(state.phase).toBe("section-intro");
    expect(state.breakTimeRemainingMs).toBe(0);

    // Section 2 (Math) — Module 1
    state = dispatch(state, {
      type: "START_SECTION",
      payload: { sectionIndex: 1 },
    });
    expect(state.currentSectionIndex).toBe(1);

    state = dispatch(state, {
      type: "START_MODULE",
      payload: { section: "math", moduleNumber: 1, timeRemainingMs: 35 * 60 * 1000 },
    });
    expect(state.phase).toBe("module-active");

    // Answer and flag
    state = dispatch(state, {
      type: "SET_QUESTION_ANSWER",
      payload: { questionId: "math-m1-q1", answer: "42" },
    });

    // Complete Math Module 1
    state = dispatch(state, {
      type: "COMPLETE_MODULE",
      payload: { section: "math", moduleNumber: 1 },
    });

    // Math Module 2 (easier path)
    state = dispatch(state, {
      type: "SET_MODULE2_DIFFICULTY",
      payload: { section: "math", difficulty: "easier" },
    });
    state = dispatch(state, {
      type: "START_MODULE",
      payload: { section: "math", moduleNumber: 2, timeRemainingMs: 35 * 60 * 1000 },
    });
    expect(state.moduleStates[getModuleKey("math", 2)].difficulty).toBe("easier");

    // Complete Math Module 2
    state = dispatch(state, {
      type: "COMPLETE_MODULE",
      payload: { section: "math", moduleNumber: 2 },
    });

    // Complete section 2
    state = dispatch(state, {
      type: "COMPLETE_SECTION",
      payload: { result: makeSectionResult("math") },
    });
    expect(state.sectionResults).toHaveLength(2);

    // Pause and resume
    state = dispatch(state, { type: "PAUSE_TEST" });
    expect(state.status).toBe(SessionStatus.PAUSED);
    state = dispatch(state, { type: "RESUME_TEST" });
    expect(state.status).toBe(SessionStatus.IN_PROGRESS);

    // Complete test
    const testResult = makeTestResult();
    state = dispatch(state, {
      type: "COMPLETE_TEST",
      payload: { result: testResult },
    });
    expect(state.status).toBe(SessionStatus.COMPLETED);
    expect(state.phase).toBe("test-complete");
    expect(state.testResult).toEqual(testResult);

    // Verify totals
    expect(getTotalAnsweredQuestions(state)).toBe(4);
  });

  it("supports abandoning mid-test", () => {
    let state = startTest(createInitialFullLengthState());
    state = dispatch(state, {
      type: "START_MODULE",
      payload: { section: "reading-writing", moduleNumber: 1, timeRemainingMs: 600_000 },
    });
    state = dispatch(state, {
      type: "SET_QUESTION_ANSWER",
      payload: { questionId: "q1", answer: "A" },
    });
    state = dispatch(state, { type: "ABANDON_TEST" });
    expect(state.status).toBe(SessionStatus.ABANDONED);
    expect(state.phase).toBe("test-complete");
    expect(state.completedAt).not.toBeNull();
    // Module state should be preserved
    const key = getModuleKey("reading-writing", 1);
    expect(state.moduleStates[key].answers["q1"]).toBe("A");
  });

  it("auto-completes module when timer expires during TICK_MODULE_TIMER", () => {
    let state = startTest(createInitialFullLengthState());
    state = dispatch(state, {
      type: "START_MODULE",
      payload: { section: "reading-writing", moduleNumber: 1, timeRemainingMs: 10_000 },
    });
    state = dispatch(state, {
      type: "TICK_MODULE_TIMER",
      payload: { elapsedMs: 10_000 },
    });
    const key = getModuleKey("reading-writing", 1);
    expect(state.moduleStates[key].status).toBe("completed");
    expect(state.moduleStates[key].timeRemainingMs).toBe(0);
    expect(state.phase).toBe("module-complete");
  });

  it("auto-transitions from break when TICK_BREAK_TIMER expires", () => {
    let state = startTest(createInitialFullLengthState());
    state = dispatch(state, { type: "START_BREAK" });
    state = dispatch(state, {
      type: "TICK_BREAK_TIMER",
      payload: { elapsedMs: 600_000 },
    });
    expect(state.breakTimeRemainingMs).toBe(0);
    expect(state.phase).toBe("section-intro");
  });
});
