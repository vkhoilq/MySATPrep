import { describe, it, expect, beforeEach } from "vitest";
import {
  SESSION_CONFIG,
  SessionStatus,
  isValidPracticeSession,
  isValidPracticeSelections,
  createPracticeSession,
  updateSessionProgress,
  getSessionSummary,
  saveSessionToStorage,
  loadSessionFromStorage,
  getSessionHistory,
  clearSessionStorage,
} from "@/types/session";
import type {
  PracticeSelections,
  PracticeSession,
  Domain,
  Skill,
} from "@/types/session";
import type { QuestionDifficulty } from "@/types/question";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const sampleDomain: Domain = { id: "1", text: "Algebra", primaryClassCd: "H" };
const sampleSkill: Skill = {
  id: "1",
  text: "Linear equations in one variable",
  skill_cd: "H.A.",
};

const validPracticeSelections: PracticeSelections = {
  practiceType: "rush",
  assessment: "SAT",
  subject: "math",
  domains: [sampleDomain],
  skills: [sampleSkill],
  difficulties: ["E" as QuestionDifficulty, "M" as QuestionDifficulty],
  randomize: true,
  excludeBluebook: false,
};

const validSession: PracticeSession = {
  sessionId: "practice-1716800000000",
  timestamp: "2024-05-27T00:00:00.000Z",
  status: SessionStatus.NOT_STARTED,
  practiceSelections: validPracticeSelections,
  currentQuestionStep: 0,
  questionAnswers: {},
  questionTimes: {},
  answeredQuestionDetails: [],
  totalQuestions: 5,
  answeredQuestions: [],
  averageTimePerQuestion: 0,
  totalTimeSpent: 0,
};

// ---------------------------------------------------------------------------
// SESSION_CONFIG
// ---------------------------------------------------------------------------

describe("SESSION_CONFIG", () => {
  it("MAX_HISTORY_SESSIONS should be 10", () => {
    expect(SESSION_CONFIG.MAX_HISTORY_SESSIONS).toBe(10);
  });

  it("SESSION_TIMEOUT_MS should be 7200000 (2 hours)", () => {
    expect(SESSION_CONFIG.SESSION_TIMEOUT_MS).toBe(7200000);
  });

  it("AUTO_SAVE_INTERVAL_MS should be 30000 (30 seconds)", () => {
    expect(SESSION_CONFIG.AUTO_SAVE_INTERVAL_MS).toBe(30000);
  });

  it("STORAGE_KEYS.CURRENT_SESSION should be 'currentPracticeSession'", () => {
    expect(SESSION_CONFIG.STORAGE_KEYS.CURRENT_SESSION).toBe(
      "currentPracticeSession"
    );
  });

  it("STORAGE_KEYS.SESSION_HISTORY should be 'practiceHistory'", () => {
    expect(SESSION_CONFIG.STORAGE_KEYS.SESSION_HISTORY).toBe(
      "practiceHistory"
    );
  });
});

// ---------------------------------------------------------------------------
// SessionStatus enum
// ---------------------------------------------------------------------------

describe("SessionStatus", () => {
  it("has all 6 statuses with correct values", () => {
    expect(SessionStatus.NOT_STARTED).toBe("not_started");
    expect(SessionStatus.IN_PROGRESS).toBe("in_progress");
    expect(SessionStatus.PAUSED).toBe("paused");
    expect(SessionStatus.COMPLETED).toBe("completed");
    expect(SessionStatus.ABANDONED).toBe("abandoned");
    expect(SessionStatus.EXPIRED).toBe("expired");
  });

  it("has exactly 6 members", () => {
    const keys = Object.keys(SessionStatus).filter(
      (k) => typeof SessionStatus[k as keyof typeof SessionStatus] === "string"
    );
    expect(keys).toHaveLength(6);
  });
});

// ---------------------------------------------------------------------------
// isValidPracticeSelections
// ---------------------------------------------------------------------------

describe("isValidPracticeSelections", () => {
  it("returns true for a valid PracticeSelections object", () => {
    expect(isValidPracticeSelections(validPracticeSelections)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isValidPracticeSelections(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isValidPracticeSelections(undefined)).toBe(false);
  });

  it("returns false for non-objects (string)", () => {
    expect(isValidPracticeSelections("hello")).toBe(false);
  });

  it("returns false for non-objects (number)", () => {
    expect(isValidPracticeSelections(42)).toBe(false);
  });

  it("returns false for arrays (typeof object but not valid)", () => {
    expect(isValidPracticeSelections([])).toBe(false);
  });

  it("returns false when missing practiceType", () => {
    const { practiceType: _, ...rest } = validPracticeSelections;
    expect(isValidPracticeSelections(rest)).toBe(false);
  });

  it("returns false when missing assessment", () => {
    const { assessment: _, ...rest } = validPracticeSelections;
    expect(isValidPracticeSelections(rest)).toBe(false);
  });

  it("returns false when missing subject", () => {
    const { subject: _, ...rest } = validPracticeSelections;
    expect(isValidPracticeSelections(rest)).toBe(false);
  });

  it("returns false when missing domains", () => {
    const { domains: _, ...rest } = validPracticeSelections;
    expect(isValidPracticeSelections(rest)).toBe(false);
  });

  it("returns false when missing skills", () => {
    const { skills: _, ...rest } = validPracticeSelections;
    expect(isValidPracticeSelections(rest)).toBe(false);
  });

  it("returns false when missing difficulties", () => {
    const { difficulties: _, ...rest } = validPracticeSelections;
    expect(isValidPracticeSelections(rest)).toBe(false);
  });

  it("returns false when missing randomize", () => {
    const { randomize: _, ...rest } = validPracticeSelections;
    expect(isValidPracticeSelections(rest)).toBe(false);
  });

  it("returns true when questionIds is undefined (optional)", () => {
    const { questionIds: _, ...rest } = validPracticeSelections;
    expect(isValidPracticeSelections(rest)).toBe(true);
  });

  it("returns true when questionIds is an array", () => {
    const withIds = { ...validPracticeSelections, questionIds: ["q1", "q2"] };
    expect(isValidPracticeSelections(withIds)).toBe(true);
  });

  it("returns false when domains is not an array", () => {
    const bad = { ...validPracticeSelections, domains: "not-array" };
    expect(isValidPracticeSelections(bad)).toBe(false);
  });

  it("returns false when randomize is not a boolean", () => {
    const bad = { ...validPracticeSelections, randomize: "yes" };
    expect(isValidPracticeSelections(bad)).toBe(false);
  });

  it("returns false when practiceType is not a string", () => {
    const bad = { ...validPracticeSelections, practiceType: 123 };
    expect(isValidPracticeSelections(bad)).toBe(false);
  });

  it("returns false when skills is not an array", () => {
    const bad = { ...validPracticeSelections, skills: null };
    expect(isValidPracticeSelections(bad)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isValidPracticeSession
// ---------------------------------------------------------------------------

describe("isValidPracticeSession", () => {
  it("returns true for a valid PracticeSession object", () => {
    expect(isValidPracticeSession(validSession)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isValidPracticeSession(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isValidPracticeSession(undefined)).toBe(false);
  });

  it("returns false for non-objects (string)", () => {
    expect(isValidPracticeSession("session")).toBe(false);
  });

  it("returns false for non-objects (number)", () => {
    expect(isValidPracticeSession(0)).toBe(false);
  });

  it("returns false when missing sessionId", () => {
    const { sessionId: _, ...rest } = validSession;
    expect(isValidPracticeSession(rest)).toBe(false);
  });

  it("returns false when missing timestamp", () => {
    const { timestamp: _, ...rest } = validSession;
    expect(isValidPracticeSession(rest)).toBe(false);
  });

  it("returns false when missing currentQuestionStep", () => {
    const { currentQuestionStep: _, ...rest } = validSession;
    expect(isValidPracticeSession(rest)).toBe(false);
  });

  it("returns false when missing practiceSelections", () => {
    const { practiceSelections: _, ...rest } = validSession;
    expect(isValidPracticeSession(rest)).toBe(false);
  });

  it("returns false when missing questionAnswers", () => {
    const { questionAnswers: _, ...rest } = validSession;
    expect(isValidPracticeSession(rest)).toBe(false);
  });

  it("returns false when missing questionTimes", () => {
    const { questionTimes: _, ...rest } = validSession;
    expect(isValidPracticeSession(rest)).toBe(false);
  });

  it("returns false when missing answeredQuestionDetails", () => {
    const { answeredQuestionDetails: _, ...rest } = validSession;
    expect(isValidPracticeSession(rest)).toBe(false);
  });

  it("returns false when missing answeredQuestions", () => {
    const { answeredQuestions: _, ...rest } = validSession;
    expect(isValidPracticeSession(rest)).toBe(false);
  });

  it("returns false when missing totalQuestions", () => {
    const { totalQuestions: _, ...rest } = validSession;
    expect(isValidPracticeSession(rest)).toBe(false);
  });

  it("returns false when missing averageTimePerQuestion", () => {
    const { averageTimePerQuestion: _, ...rest } = validSession;
    expect(isValidPracticeSession(rest)).toBe(false);
  });

  it("returns false when missing totalTimeSpent", () => {
    const { totalTimeSpent: _, ...rest } = validSession;
    expect(isValidPracticeSession(rest)).toBe(false);
  });

  it("returns false when sessionId is not a string", () => {
    const bad = { ...validSession, sessionId: 123 };
    expect(isValidPracticeSession(bad)).toBe(false);
  });

  it("returns false when answeredQuestions is not an array", () => {
    const bad = { ...validSession, answeredQuestions: "not-array" };
    expect(isValidPracticeSession(bad)).toBe(false);
  });

  it("returns false when totalQuestions is not a number", () => {
    const bad = { ...validSession, totalQuestions: "five" };
    expect(isValidPracticeSession(bad)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createPracticeSession
// ---------------------------------------------------------------------------

describe("createPracticeSession", () => {
  it("creates a session with the correct defaults", () => {
    const session = createPracticeSession({
      practiceSelections: validPracticeSelections,
      totalQuestions: 10,
    });

    expect(session.sessionId).toMatch(/^practice-/);
    expect(session.status).toBe(SessionStatus.NOT_STARTED);
    expect(session.currentQuestionStep).toBe(0);
    expect(session.questionAnswers).toEqual({});
    expect(session.questionTimes).toEqual({});
    expect(session.answeredQuestionDetails).toEqual([]);
    expect(session.answeredQuestions).toEqual([]);
    expect(session.averageTimePerQuestion).toBe(0);
    expect(session.totalTimeSpent).toBe(0);
  });

  it("uses the provided totalQuestions", () => {
    const session = createPracticeSession({
      practiceSelections: validPracticeSelections,
      totalQuestions: 25,
    });
    expect(session.totalQuestions).toBe(25);
  });

  it("uses the provided practiceSelections", () => {
    const session = createPracticeSession({
      practiceSelections: validPracticeSelections,
      totalQuestions: 5,
    });
    expect(session.practiceSelections).toEqual(validPracticeSelections);
  });

  it("generates a sessionId starting with 'practice-' followed by a timestamp", () => {
    const session = createPracticeSession({
      practiceSelections: validPracticeSelections,
      totalQuestions: 1,
    });
    expect(session.sessionId).toMatch(/^practice-\d+$/);
    const ts = Number(session.sessionId.replace("practice-", ""));
    expect(ts).toBeGreaterThan(1700000000000); // reasonable Unix timestamp
  });

  it("produces a timestamp in ISO 8601 format", () => {
    const session = createPracticeSession({
      practiceSelections: validPracticeSelections,
      totalQuestions: 3,
    });
    expect(session.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
    );
  });
});

// ---------------------------------------------------------------------------
// updateSessionProgress
// ---------------------------------------------------------------------------

describe("updateSessionProgress", () => {
  let session: PracticeSession;

  beforeEach(() => {
    session = createPracticeSession({
      practiceSelections: validPracticeSelections,
      totalQuestions: 5,
    });
  });

  it("adds a new answer to questionAnswers", () => {
    const updated = updateSessionProgress(session, {
      questionId: "q1",
      selectedAnswer: "A",
      timeElapsed: 30000,
    });
    expect(updated.questionAnswers).toEqual({ q1: "A" });
  });

  it("updates questionTimes", () => {
    const updated = updateSessionProgress(session, {
      questionId: "q1",
      selectedAnswer: "A",
      timeElapsed: 45000,
    });
    expect(updated.questionTimes).toEqual({ q1: 45000 });
  });

  it("recalculates answeredQuestions (filters out null answers)", () => {
    let updated = updateSessionProgress(session, {
      questionId: "q1",
      selectedAnswer: "A",
      timeElapsed: 30000,
    });
    expect(updated.answeredQuestions).toEqual(["q1"]);

    updated = updateSessionProgress(updated, {
      questionId: "q2",
      selectedAnswer: null,
      timeElapsed: 20000,
    });
    expect(updated.answeredQuestions).toEqual(["q1"]); // q2 filtered out
  });

  it("recalculates totalTimeSpent", () => {
    const updated = updateSessionProgress(session, {
      questionId: "q1",
      selectedAnswer: "A",
      timeElapsed: 30000,
    });
    expect(updated.totalTimeSpent).toBe(30000);
  });

  it("recalculates averageTimePerQuestion", () => {
    const first = updateSessionProgress(session, {
      questionId: "q1",
      selectedAnswer: "A",
      timeElapsed: 20000,
    });
    expect(first.averageTimePerQuestion).toBe(20000);

    const second = updateSessionProgress(first, {
      questionId: "q2",
      selectedAnswer: "B",
      timeElapsed: 40000,
    });
    expect(second.averageTimePerQuestion).toBe(30000); // (20000+40000)/2
  });

  it("does not mutate the original session object", () => {
    const snapshot = { ...session };
    updateSessionProgress(session, {
      questionId: "q1",
      selectedAnswer: "A",
      timeElapsed: 10000,
    });
    expect(session).toEqual(snapshot);
  });

  it("overwrites a previous answer for the same questionId", () => {
    const first = updateSessionProgress(session, {
      questionId: "q1",
      selectedAnswer: "A",
      timeElapsed: 10000,
    });
    const second = updateSessionProgress(first, {
      questionId: "q1",
      selectedAnswer: "B",
      timeElapsed: 15000,
    });
    expect(second.questionAnswers).toEqual({ q1: "B" });
    expect(second.questionTimes).toEqual({ q1: 15000 });
  });

  it("returns 0 averageTimePerQuestion when no times recorded", () => {
    // Should not happen in practice, but defensive
    const empty = { ...session, questionTimes: {} };
    const result = updateSessionProgress(empty, {
      questionId: "q1",
      selectedAnswer: "A",
      timeElapsed: 0,
    });
    expect(result.averageTimePerQuestion).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getSessionSummary
// ---------------------------------------------------------------------------

describe("getSessionSummary", () => {
  it("returns a summary with correct fields from a completed session", () => {
    const progressed = updateSessionProgress(validSession, {
      questionId: "q1",
      selectedAnswer: "A",
      timeElapsed: 25000,
    });

    const summary = getSessionSummary(progressed);

    expect(summary.sessionId).toBe(validSession.sessionId);
    expect(summary.completedAt).toBe(validSession.timestamp);
    expect(summary.duration).toBe(progressed.totalTimeSpent);
    expect(summary.questionsAttempted).toBe(1); // one answered
    expect(summary.questionsCorrect).toBe(1); // === answeredQuestions.length in current impl
    expect(summary.averageTimePerQuestion).toBe(25000);
    expect(summary.subject).toBe("math");
    expect(summary.difficulty).toEqual(["E", "M"]);
  });

  it("returns 0 for questionsAttempted when no questions answered", () => {
    const summary = getSessionSummary(validSession);
    expect(summary.questionsAttempted).toBe(0);
    expect(summary.duration).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

describe("saveSessionToStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves session to 'currentPracticeSession'", () => {
    saveSessionToStorage(validSession);
    const stored = localStorage.getItem("currentPracticeSession");
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)).toEqual(validSession);
  });

  it("saves session to 'practiceHistory'", () => {
    saveSessionToStorage(validSession);
    const stored = localStorage.getItem("practiceHistory");
    expect(stored).not.toBeNull();
    const history = JSON.parse(stored!);
    expect(history).toEqual([validSession]);
  });

  it("appends to existing history", () => {
    const second: PracticeSession = {
      ...validSession,
      sessionId: "practice-9999999999999",
    };
    saveSessionToStorage(validSession);
    saveSessionToStorage(second);

    const stored = localStorage.getItem("practiceHistory");
    const history = JSON.parse(stored!);
    expect(history).toHaveLength(2);
    expect(history[1].sessionId).toBe("practice-9999999999999");
  });
});

describe("loadSessionFromStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when no data exists", () => {
    expect(loadSessionFromStorage()).toBeNull();
  });

  it("returns a valid session when data exists", () => {
    localStorage.setItem(
      "currentPracticeSession",
      JSON.stringify(validSession)
    );
    const loaded = loadSessionFromStorage();
    expect(loaded).toEqual(validSession);
  });

  it("returns null for invalid data (missing fields)", () => {
    localStorage.setItem(
      "currentPracticeSession",
      JSON.stringify({ incomplete: true })
    );
    expect(loadSessionFromStorage()).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    localStorage.setItem("currentPracticeSession", "{broken}");
    expect(loadSessionFromStorage()).toBeNull();
  });
});

describe("getSessionHistory", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns empty array when no data", () => {
    expect(getSessionHistory()).toEqual([]);
  });

  it("returns array of valid sessions", () => {
    const sessions = [validSession];
    localStorage.setItem("practiceHistory", JSON.stringify(sessions));
    expect(getSessionHistory()).toEqual(sessions);
  });

  it("filters out invalid sessions", () => {
    const data = [
      validSession,
      { incomplete: true },
      validSession,
    ];
    localStorage.setItem("practiceHistory", JSON.stringify(data));
    const history = getSessionHistory();
    expect(history).toHaveLength(2);
    expect(history[0].sessionId).toBe(validSession.sessionId);
  });

  it("returns empty array for non-array data", () => {
    localStorage.setItem("practiceHistory", JSON.stringify("not-an-array"));
    expect(getSessionHistory()).toEqual([]);
  });
});

describe("clearSessionStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("removes both 'currentPracticeSession' and 'practiceHistory' keys", () => {
    localStorage.setItem("currentPracticeSession", JSON.stringify(validSession));
    localStorage.setItem("practiceHistory", JSON.stringify([validSession]));

    clearSessionStorage();

    expect(localStorage.getItem("currentPracticeSession")).toBeNull();
    expect(localStorage.getItem("practiceHistory")).toBeNull();
  });

  it("does not throw when nothing is stored", () => {
    expect(() => clearSessionStorage()).not.toThrow();
  });
});
