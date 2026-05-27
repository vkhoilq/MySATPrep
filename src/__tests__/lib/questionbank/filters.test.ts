import { describe, it, expect } from "vitest";
import type { QuestionWithData, BluebookExternalIds } from "@/lib/questionbank/types";
import type { RangeValue } from "@/components/ui/calendar";

import {
  hasValidDifficulty,
  filterQuestionsByDifficulty,
  filterQuestionsBySkills,
  filterOutBluebookQuestions,
  filterOnlyBluebookQuestions,
  filterQuestionsByDateRange,
  filterQuestionsByAnswerStatus,
  sortQuestionsByDate,
  filterQuestionsBasic,
  filterQuestions,
} from "@/lib/questionbank/filters";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface MockQuestionOverrides {
  questionId?: string;
  difficulty?: "E" | "M" | "H" | undefined | null;
  skill_cd?: string;
  createDate?: number | null;
  external_id?: string | null;
}

const createMockQuestion = (
  overrides: MockQuestionOverrides = {}
): QuestionWithData => {
  // Use key presence check: only use defaults when the key is not provided at all.
  const has = (key: keyof MockQuestionOverrides): boolean =>
    key in overrides;

  return {
    questionId: has("questionId") ? overrides.questionId! : "q-default",
    timestamp: "2024-01-01T00:00:00Z",
    updateDate: 1704067200000,
    pPcc: "pPcc",
    skill_cd: (has("skill_cd") ? overrides.skill_cd! : "CID") as any,
    score_band_range_cd: 1,
    uId: "uId",
    skill_desc: "Skill Description",
    createDate: has("createDate") ? overrides.createDate! : 1704067200000,
    program: "SAT",
    primary_class_cd_desc: "Class Description",
    ibn: null,
    external_id: has("external_id") ? overrides.external_id! : null,
    primary_class_cd: "INI" as const,
    difficulty: has("difficulty") ? overrides.difficulty! : "M",
    questionData: undefined,
    isLoading: false,
    hasError: false,
    errorMessage: undefined,
  };
};

// Helper to build questions with specific dates (millisecond timestamps)
const questionWithDate = (
  id: string,
  ts: number,
  diff?: "E" | "M" | "H"
): QuestionWithData => createMockQuestion({ questionId: id, createDate: ts, difficulty: diff });

// ---------------------------------------------------------------------------
// hasValidDifficulty
// ---------------------------------------------------------------------------
describe("hasValidDifficulty", () => {
  it('should return true for "E"', () => {
    expect(hasValidDifficulty(createMockQuestion({ difficulty: "E" }))).toBe(true);
  });

  it('should return true for "M"', () => {
    expect(hasValidDifficulty(createMockQuestion({ difficulty: "M" }))).toBe(true);
  });

  it('should return true for "H"', () => {
    expect(hasValidDifficulty(createMockQuestion({ difficulty: "H" }))).toBe(true);
  });

  it("should return falsy for undefined difficulty", () => {
    expect(
      hasValidDifficulty(createMockQuestion({ difficulty: undefined as any }))
    ).toBeFalsy();
  });

  it("should return falsy for null difficulty", () => {
    expect(
      hasValidDifficulty(createMockQuestion({ difficulty: null as any }))
    ).toBeFalsy();
  });

  it("should return falsy for empty string difficulty", () => {
    expect(
      hasValidDifficulty(createMockQuestion({ difficulty: "" as any }))
    ).toBeFalsy();
  });

  it('should return false for "A"', () => {
    expect(
      hasValidDifficulty(createMockQuestion({ difficulty: "A" as any }))
    ).toBe(false);
  });

  it('should return false for "easy"', () => {
    expect(
      hasValidDifficulty(createMockQuestion({ difficulty: "easy" as any }))
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// filterQuestionsByDifficulty
// ---------------------------------------------------------------------------
describe("filterQuestionsByDifficulty", () => {
  const easy = createMockQuestion({ questionId: "q1", difficulty: "E" });
  const med = createMockQuestion({ questionId: "q2", difficulty: "M" });
  const hard = createMockQuestion({ questionId: "q3", difficulty: "H" });
  const noDiff = createMockQuestion({
    questionId: "q4",
    difficulty: undefined as any,
  });

  it("should return all questions when selectedDifficulties is empty", () => {
    const result = filterQuestionsByDifficulty([easy, med, hard], []);
    expect(result).toHaveLength(3);
  });

  it("should filter to only matching difficulties", () => {
    const result = filterQuestionsByDifficulty([easy, med, hard], ["M"]);
    expect(result).toHaveLength(1);
    expect(result[0].questionId).toBe("q2");
  });

  it("should filter by multiple difficulties", () => {
    const result = filterQuestionsByDifficulty([easy, med, hard], ["E", "H"]);
    expect(result).toHaveLength(2);
    expect(result.map((q) => q.questionId)).toEqual(
      expect.arrayContaining(["q1", "q3"])
    );
  });

  it("should include questions with missing difficulty when Easy is selected", () => {
    const result = filterQuestionsByDifficulty([easy, med, noDiff], ["E"]);
    expect(result).toHaveLength(2);
    expect(result.map((q) => q.questionId)).toEqual(
      expect.arrayContaining(["q1", "q4"])
    );
  });

  it("should exclude questions with missing difficulty when only M or H selected", () => {
    const result = filterQuestionsByDifficulty([easy, med, noDiff], ["M"]);
    expect(result).toHaveLength(1);
    expect(result[0].questionId).toBe("q2");
  });

  it("should return empty array when no questions match", () => {
    const result = filterQuestionsByDifficulty([easy], ["H"]);
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// filterQuestionsBySkills
// ---------------------------------------------------------------------------
describe("filterQuestionsBySkills", () => {
  const skillA = createMockQuestion({ questionId: "q1", skill_cd: "CID" });
  const skillB = createMockQuestion({ questionId: "q2", skill_cd: "INF" });
  const skillC = createMockQuestion({ questionId: "q3", skill_cd: "COE" });

  it("should return all questions when selectedSkills is empty", () => {
    const result = filterQuestionsBySkills([skillA, skillB, skillC], []);
    expect(result).toHaveLength(3);
  });

  it("should filter to only matching skill_cd values", () => {
    const result = filterQuestionsBySkills([skillA, skillB, skillC], ["INF"]);
    expect(result).toHaveLength(1);
    expect(result[0].questionId).toBe("q2");
  });

  it("should filter by multiple skills", () => {
    const result = filterQuestionsBySkills([skillA, skillB, skillC], [
      "CID",
      "COE",
    ]);
    expect(result).toHaveLength(2);
    expect(result.map((q) => q.questionId)).toEqual(
      expect.arrayContaining(["q1", "q3"])
    );
  });

  it("should return empty array when no questions match", () => {
    const result = filterQuestionsBySkills([skillA, skillB], ["TSP"]);
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// filterOutBluebookQuestions
// ---------------------------------------------------------------------------
describe("filterOutBluebookQuestions", () => {
  const q1 = createMockQuestion({ questionId: "q1", external_id: "ext-1" });
  const q2 = createMockQuestion({ questionId: "q2", external_id: "ext-2" });
  const q3 = createMockQuestion({ questionId: "q3", external_id: null });
  const questions = [q1, q2, q3];

  const bbIds: BluebookExternalIds = {
    mathLiveItems: ["ext-1"],
    readingLiveItems: ["ext-3"],
  };

  it("should return all questions when excludeBluebook is false", () => {
    const result = filterOutBluebookQuestions(questions, false, bbIds, "Math");
    expect(result).toHaveLength(3);
  });

  it("should return all questions when bluebookExternalIds is undefined", () => {
    const result = filterOutBluebookQuestions(questions, true, undefined, "Math");
    expect(result).toHaveLength(3);
  });

  it("should return all questions when selectedSubject is undefined", () => {
    const result = filterOutBluebookQuestions(questions, true, bbIds, undefined);
    expect(result).toHaveLength(3);
  });

  it("should filter out questions whose external_id matches Bluebook IDs for Math", () => {
    const result = filterOutBluebookQuestions(questions, true, bbIds, "Math");
    expect(result).toHaveLength(2);
    expect(result.map((q) => q.questionId)).toEqual(
      expect.arrayContaining(["q2", "q3"])
    );
  });

  it("should filter out questions whose external_id matches Bluebook IDs for Reading", () => {
    const readingBbIds: BluebookExternalIds = {
      mathLiveItems: [],
      readingLiveItems: ["ext-2"],
    };
    const result = filterOutBluebookQuestions(
      questions,
      true,
      readingBbIds,
      "Reading"
    );
    expect(result).toHaveLength(2);
    expect(result.map((q) => q.questionId)).toEqual(
      expect.arrayContaining(["q1", "q3"])
    );
  });

  it("should keep questions without external_id", () => {
    const result = filterOutBluebookQuestions(questions, true, bbIds, "Math");
    expect(result.find((q) => q.questionId === "q3")).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// filterOnlyBluebookQuestions
// ---------------------------------------------------------------------------
describe("filterOnlyBluebookQuestions", () => {
  const q1 = createMockQuestion({ questionId: "q1", external_id: "ext-1" });
  const q2 = createMockQuestion({ questionId: "q2", external_id: "ext-2" });
  const q3 = createMockQuestion({ questionId: "q3", external_id: null });
  const questions = [q1, q2, q3];

  const bbIds: BluebookExternalIds = {
    mathLiveItems: ["ext-1"],
    readingLiveItems: ["ext-2"],
  };

  it("should return all questions when onlyBluebook is false", () => {
    const result = filterOnlyBluebookQuestions(questions, false, bbIds, "Math");
    expect(result).toHaveLength(3);
  });

  it("should return all questions when bluebookExternalIds is undefined", () => {
    const result = filterOnlyBluebookQuestions(questions, true, undefined, "Math");
    expect(result).toHaveLength(3);
  });

  it("should use mathLiveItems when subject is Math", () => {
    const result = filterOnlyBluebookQuestions(questions, true, bbIds, "Math");
    expect(result).toHaveLength(1);
    expect(result[0].questionId).toBe("q1");
  });

  it("should use readingLiveItems when subject is Reading", () => {
    const result = filterOnlyBluebookQuestions(
      questions,
      true,
      bbIds,
      "Reading"
    );
    expect(result).toHaveLength(1);
    expect(result[0].questionId).toBe("q2");
  });

  it("should exclude questions without external_id", () => {
    const result = filterOnlyBluebookQuestions(questions, true, bbIds, "Math");
    expect(result.find((q) => q.questionId === "q3")).toBeUndefined();
  });

  it("should return empty array when no external IDs match", () => {
    const emptyBbIds: BluebookExternalIds = {
      mathLiveItems: ["ext-999"],
      readingLiveItems: [],
    };
    const result = filterOnlyBluebookQuestions(
      questions,
      true,
      emptyBbIds,
      "Math"
    );
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// filterQuestionsByDateRange
// ---------------------------------------------------------------------------
describe("filterQuestionsByDateRange", () => {
  // Dates in millisecond timestamps
  const jan1 = new Date("2024-01-01").getTime();
  const feb1 = new Date("2024-02-01").getTime();
  const mar1 = new Date("2024-03-01").getTime();

  const qJan = questionWithDate("q1", jan1);
  const qFeb = questionWithDate("q2", feb1);
  const qMar = questionWithDate("q3", mar1);
  const qNoDate = createMockQuestion({
    questionId: "q4",
    createDate: null as any,
  });

  it("should return all questions when dateRange is null", () => {
    const result = filterQuestionsByDateRange([qJan, qFeb, qMar], null);
    expect(result).toHaveLength(3);
  });

  it("should return all questions when dateRange.end is null", () => {
    const range: RangeValue = { start: new Date("2024-01-15"), end: null };
    const result = filterQuestionsByDateRange([qJan, qFeb, qMar], range);
    expect(result).toHaveLength(3);
  });

  it("should filter questions within date range (with start)", () => {
    const range: RangeValue = {
      start: new Date("2024-01-15"),
      end: new Date("2024-02-15"),
    };
    const result = filterQuestionsByDateRange([qJan, qFeb, qMar], range);
    expect(result).toHaveLength(1);
    expect(result[0].questionId).toBe("q2");
  });

  it("should filter questions within date range (without start)", () => {
    const range: RangeValue = {
      start: null,
      end: new Date("2024-01-15"),
    };
    const result = filterQuestionsByDateRange([qJan, qFeb, qMar], range);
    expect(result).toHaveLength(1);
    expect(result[0].questionId).toBe("q1");
  });

  it("should handle edge dates (inclusive)", () => {
    const range: RangeValue = {
      start: new Date("2024-01-01"),
      end: new Date("2024-03-01"),
    };
    const result = filterQuestionsByDateRange([qJan, qFeb, qMar], range);
    expect(result).toHaveLength(3);
  });

  it("should exclude questions without createDate", () => {
    const range: RangeValue = {
      start: new Date("2024-01-01"),
      end: new Date("2024-06-01"),
    };
    const result = filterQuestionsByDateRange([qJan, qNoDate], range);
    expect(result).toHaveLength(1);
    expect(result[0].questionId).toBe("q1");
  });

  it("should handle second (10-digit) timestamps", () => {
    const secondTs = Math.floor(jan1 / 1000); // 10-digit second timestamp
    const qSecond = createMockQuestion({
      questionId: "q-second",
      createDate: secondTs,
    });
    const range: RangeValue = {
      start: new Date("2023-12-01"),
      end: new Date("2024-02-01"),
    };
    const result = filterQuestionsByDateRange([qSecond], range);
    expect(result).toHaveLength(1);
  });

  it("should handle millisecond (13-digit) timestamps", () => {
    const qMs = createMockQuestion({
      questionId: "q-ms",
      createDate: jan1, // already in ms
    });
    const range: RangeValue = {
      start: new Date("2023-12-01"),
      end: new Date("2024-02-01"),
    };
    const result = filterQuestionsByDateRange([qMs], range);
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// filterQuestionsByAnswerStatus
// ---------------------------------------------------------------------------
describe("filterQuestionsByAnswerStatus", () => {
  const q1 = createMockQuestion({ questionId: "q1" });
  const q2 = createMockQuestion({ questionId: "q2" });
  const q3 = createMockQuestion({ questionId: "q3" });
  const questions = [q1, q2, q3];

  it('should return all questions when status is "all"', () => {
    const result = filterQuestionsByAnswerStatus(questions, "all", [
      "q1",
      "q2",
    ]);
    expect(result).toHaveLength(3);
  });

  it('should return only answered questions when status is "answered"', () => {
    const result = filterQuestionsByAnswerStatus(questions, "answered", [
      "q1",
      "q3",
    ]);
    expect(result).toHaveLength(2);
    expect(result.map((q) => q.questionId)).toEqual(
      expect.arrayContaining(["q1", "q3"])
    );
  });

  it('should return only unanswered questions when status is "not-answered"', () => {
    const result = filterQuestionsByAnswerStatus(questions, "not-answered", [
      "q1",
      "q3",
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].questionId).toBe("q2");
  });

  it("should handle empty answeredQuestions array", () => {
    const resultAnswered = filterQuestionsByAnswerStatus(
      questions,
      "answered",
      []
    );
    expect(resultAnswered).toHaveLength(0);

    const resultNotAnswered = filterQuestionsByAnswerStatus(
      questions,
      "not-answered",
      []
    );
    expect(resultNotAnswered).toHaveLength(3);
  });

  it("should handle default empty answeredQuestions array", () => {
    const result = filterQuestionsByAnswerStatus(questions, "answered");
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// sortQuestionsByDate
// ---------------------------------------------------------------------------
describe("sortQuestionsByDate", () => {
  const jan1 = new Date("2024-01-01").getTime();
  const feb1 = new Date("2024-02-01").getTime();
  const mar1 = new Date("2024-03-01").getTime();

  const qJan = questionWithDate("q-jan", jan1);
  const qFeb = questionWithDate("q-feb", feb1);
  const qMar = questionWithDate("q-mar", mar1);

  it("should return unchanged array when sortOrder is default", () => {
    const result = sortQuestionsByDate([qFeb, qJan, qMar], "default");
    expect(result).toHaveLength(3);
    expect(result[0].questionId).toBe("q-feb");
    expect(result[1].questionId).toBe("q-jan");
    expect(result[2].questionId).toBe("q-mar");
  });

  it('should sort newest first when sortOrder is "newest"', () => {
    const result = sortQuestionsByDate([qJan, qMar, qFeb], "newest");
    expect(result).toHaveLength(3);
    expect(result[0].questionId).toBe("q-mar");
    expect(result[1].questionId).toBe("q-feb");
    expect(result[2].questionId).toBe("q-jan");
  });

  it('should sort oldest first when sortOrder is "oldest"', () => {
    const result = sortQuestionsByDate([qMar, qJan, qFeb], "oldest");
    expect(result).toHaveLength(3);
    expect(result[0].questionId).toBe("q-jan");
    expect(result[1].questionId).toBe("q-feb");
    expect(result[2].questionId).toBe("q-mar");
  });

  it("should place questions without createDate at the end when sorting newest", () => {
    const qNoDate = createMockQuestion({
      questionId: "q-no-date",
      createDate: null as any,
    });
    const result = sortQuestionsByDate([qNoDate, qMar, qJan], "newest");
    expect(result).toHaveLength(3);
    expect(result[0].questionId).toBe("q-mar");
    expect(result[1].questionId).toBe("q-jan");
    expect(result[2].questionId).toBe("q-no-date");
  });

  it("should place questions without createDate at the end when sorting oldest", () => {
    const qNoDate = createMockQuestion({
      questionId: "q-no-date",
      createDate: null as any,
    });
    const result = sortQuestionsByDate([qNoDate, qMar, qJan], "oldest");
    expect(result).toHaveLength(3);
    expect(result[0].questionId).toBe("q-jan");
    expect(result[1].questionId).toBe("q-mar");
    expect(result[2].questionId).toBe("q-no-date");
  });

  it("should handle 10-digit (second) timestamps correctly", () => {
    const jan1sec = Math.floor(jan1 / 1000);
    const mar1sec = Math.floor(mar1 / 1000);
    const qEarly = createMockQuestion({
      questionId: "q-early",
      createDate: jan1sec,
    });
    const qLate = createMockQuestion({
      questionId: "q-late",
      createDate: mar1sec,
    });
    const result = sortQuestionsByDate([qLate, qEarly], "newest");
    expect(result[0].questionId).toBe("q-late");
    expect(result[1].questionId).toBe("q-early");
  });

  it("should maintain relative order when both items lack createDate", () => {
    const qA = createMockQuestion({
      questionId: "qA",
      createDate: null as any,
    });
    const qB = createMockQuestion({
      questionId: "qB",
      createDate: null as any,
    });
    const result = sortQuestionsByDate([qA, qB], "newest");
    expect(result[0].questionId).toBe("qA");
    expect(result[1].questionId).toBe("qB");
  });
});

// ---------------------------------------------------------------------------
// filterQuestionsBasic
// ---------------------------------------------------------------------------
describe("filterQuestionsBasic", () => {
  it("should apply both difficulty and skill filters", () => {
    const qEasy = createMockQuestion({
      questionId: "q-easy",
      difficulty: "E",
      skill_cd: "CID",
    });
    const qMed = createMockQuestion({
      questionId: "q-med",
      difficulty: "M",
      skill_cd: "INF",
    });
    const qHard = createMockQuestion({
      questionId: "q-hard",
      difficulty: "H",
      skill_cd: "CID",
    });
    const questions = [qEasy, qMed, qHard];

    // Filter: Easy + CID
    const result = filterQuestionsBasic(questions, ["E"], ["CID"]);
    expect(result).toHaveLength(1);
    expect(result[0].questionId).toBe("q-easy");
  });

  it("should return empty array when no questions match both filters", () => {
    const qEasy = createMockQuestion({
      questionId: "q-easy",
      difficulty: "E",
      skill_cd: "CID",
    });
    const result = filterQuestionsBasic([qEasy], ["H"], ["INF"]);
    expect(result).toHaveLength(0);
  });

  it("should return all when no filters are active", () => {
    const q1 = createMockQuestion({ questionId: "q1" });
    const q2 = createMockQuestion({ questionId: "q2" });
    const result = filterQuestionsBasic([q1, q2], [], []);
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// filterQuestions (combined)
// ---------------------------------------------------------------------------
describe("filterQuestions", () => {
  const baseQuestions = [
    createMockQuestion({
      questionId: "q1",
      difficulty: "E",
      skill_cd: "CID",
      createDate: new Date("2024-01-01").getTime(),
      external_id: "ext-1",
    }),
    createMockQuestion({
      questionId: "q2",
      difficulty: "M",
      skill_cd: "INF",
      createDate: new Date("2024-02-01").getTime(),
      external_id: "ext-2",
    }),
    createMockQuestion({
      questionId: "q3",
      difficulty: "H",
      skill_cd: "COE",
      createDate: new Date("2024-03-01").getTime(),
      external_id: null,
    }),
    createMockQuestion({
      questionId: "q4",
      difficulty: "E",
      skill_cd: "TSP",
      createDate: new Date("2024-04-01").getTime(),
      external_id: "ext-4",
    }),
  ];

  it("should return all questions when no filters are active", () => {
    const result = filterQuestions(baseQuestions, [], [], false, false, "default");
    expect(result).toHaveLength(4);
  });

  it("should apply difficulty filter", () => {
    const result = filterQuestions(baseQuestions, ["E"], []);
    expect(result).toHaveLength(2);
    expect(result.map((q) => q.questionId)).toEqual(
      expect.arrayContaining(["q1", "q4"])
    );
  });

  it("should apply skill filter", () => {
    const result = filterQuestions(baseQuestions, [], ["CID"]);
    expect(result).toHaveLength(1);
    expect(result[0].questionId).toBe("q1");
  });

  it("should apply date range filter", () => {
    const range: RangeValue = {
      start: new Date("2024-02-01"),
      end: new Date("2024-03-15"),
    };
    const result = filterQuestions(
      baseQuestions,
      [],
      [],
      false,
      false,
      "default",
      range
    );
    expect(result).toHaveLength(2);
    expect(result.map((q) => q.questionId)).toEqual(
      expect.arrayContaining(["q2", "q3"])
    );
  });

  it("should apply answer status filter", () => {
    const result = filterQuestions(
      baseQuestions,
      [],
      [],
      false,
      false,
      "default",
      null,
      undefined,
      undefined,
      "answered",
      ["q1", "q3"]
    );
    expect(result).toHaveLength(2);
    expect(result.map((q) => q.questionId)).toEqual(
      expect.arrayContaining(["q1", "q3"])
    );
  });

  it("should apply Bluebook exclude filter", () => {
    const bbIds: BluebookExternalIds = {
      mathLiveItems: ["ext-1", "ext-2"],
      readingLiveItems: [],
    };
    const result = filterQuestions(
      baseQuestions,
      [],
      [],
      true,
      false,
      "default",
      null,
      bbIds,
      "Math"
    );
    expect(result).toHaveLength(2);
    expect(result.map((q) => q.questionId)).toEqual(
      expect.arrayContaining(["q3", "q4"])
    );
  });

  it("should apply Bluebook only filter", () => {
    const bbIds: BluebookExternalIds = {
      mathLiveItems: ["ext-1"],
      readingLiveItems: [],
    };
    const result = filterQuestions(
      baseQuestions,
      [],
      [],
      false,
      true,
      "default",
      null,
      bbIds,
      "Math"
    );
    expect(result).toHaveLength(1);
    expect(result[0].questionId).toBe("q1");
  });

  it("should apply sort order", () => {
    const result = filterQuestions(baseQuestions, [], [], false, false, "newest");
    expect(result[0].questionId).toBe("q4");
    expect(result[result.length - 1].questionId).toBe("q1");
  });

  it("should apply multiple filters in combination", () => {
    // Easy questions (q1, q4) + Math Bluebook exclude (excludes ext-1 = q1) + sort newest
    const bbIds: BluebookExternalIds = {
      mathLiveItems: ["ext-1"],
      readingLiveItems: [],
    };
    const result = filterQuestions(
      baseQuestions,
      ["E"],
      [],
      true,
      false,
      "newest",
      null,
      bbIds,
      "Math"
    );
    expect(result).toHaveLength(1);
    expect(result[0].questionId).toBe("q4");
  });
});
