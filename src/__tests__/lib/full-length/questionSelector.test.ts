import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  groupQuestionsByDomain,
  groupQuestionsByDifficulty,
  sortByDifficulty,
  isLikelySPRQuestion,
  designatePretestQuestions,
  selectQuestionsForModule,
  selectQuestionsForTest,
  determineModule2DifficultyFromAnswers,
} from "@/lib/full-length/questionSelector";
import type { PlainQuestionType } from "@/types/question";
import type { DomainItems } from "@/types/lookup";
import type { FullLengthModuleConfig } from "@/types/full-length";

// ─── Helpers ────────────────────────────────────────────────────────────────────

function createMockQuestion(
  overrides: Partial<PlainQuestionType> & { questionId: string },
): PlainQuestionType {
  const base: PlainQuestionType = {
    updateDate: 20240101,
    pPcc: "test",
    questionId: "",
    skill_cd: "CID",
    score_band_range_cd: 1,
    uId: "",
    skill_desc: "Test skill",
    createDate: 20240101,
    program: "SAT" as const,
    primary_class_cd_desc: "Test",
    ibn: null,
    external_id: null,
    primary_class_cd: "INI" as DomainItems,
    difficulty: "M" as const,
  };
  return { ...base, ...overrides, uId: `uid-${overrides.questionId}` };
}

/** Generate N questions for a given domain/difficulty pair */
function generateQuestions(
  domain: DomainItems,
  difficulty: "E" | "M" | "H",
  count: number,
  idPrefix: string,
): PlainQuestionType[] {
  return Array.from({ length: count }, (_, i) =>
    createMockQuestion({
      questionId: `${idPrefix}-${domain}-${difficulty}-${i}`,
      primary_class_cd: domain,
      difficulty,
    }),
  );
}

/** Generate enough questions to fill an RW module (INI=7, CAS=7, EOI=7, SEC=6) */
function generateRWQuestions(
  perDifficultyPerDomain: number = 3,
): PlainQuestionType[] {
  const domains: DomainItems[] = ["INI", "CAS", "EOI", "SEC"];
  const difficulties: ("E" | "M" | "H")[] = ["E", "M", "H"];

  const questions: PlainQuestionType[] = [];
  for (const domain of domains) {
    for (const difficulty of difficulties) {
      questions.push(
        ...generateQuestions(domain, difficulty, perDifficultyPerDomain, "rw"),
      );
    }
  }
  return questions;
}

/** Generate enough questions to fill a Math module (H=6, P=6, Q=5, S=5) */
function generateMathQuestions(
  perDifficultyPerDomain: number = 3,
): PlainQuestionType[] {
  const domains: DomainItems[] = ["H", "P", "Q", "S"];
  const difficulties: ("E" | "M" | "H")[] = ["E", "M", "H"];

  const questions: PlainQuestionType[] = [];
  for (const domain of domains) {
    for (const difficulty of difficulties) {
      questions.push(
        ...generateQuestions(domain, difficulty, perDifficultyPerDomain, "math"),
      );
    }
  }
  return questions;
}

// ─── groupQuestionsByDomain ──────────────────────────────────────────────────────

describe("groupQuestionsByDomain", () => {
  it("groups questions by primary_class_cd", () => {
    const q1 = createMockQuestion({
      questionId: "q1",
      primary_class_cd: "INI",
    });
    const q2 = createMockQuestion({
      questionId: "q2",
      primary_class_cd: "CAS",
    });
    const q3 = createMockQuestion({
      questionId: "q3",
      primary_class_cd: "INI",
    });

    const result = groupQuestionsByDomain([q1, q2, q3]);

    expect(result).toEqual({
      INI: [q1, q3],
      CAS: [q2],
    });
  });

  it("returns empty object for empty array", () => {
    const result = groupQuestionsByDomain([]);
    expect(result).toEqual({});
  });

  it("handles multiple domains", () => {
    const domains: DomainItems[] = ["INI", "CAS", "EOI", "SEC", "H", "P", "Q", "S"];
    const questions = domains.map((d) =>
      createMockQuestion({
        questionId: `q-${d}`,
        primary_class_cd: d,
      }),
    );

    const result = groupQuestionsByDomain(questions);
    expect(Object.keys(result)).toHaveLength(domains.length);
    for (const d of domains) {
      expect(result[d]).toHaveLength(1);
    }
  });
});

// ─── groupQuestionsByDifficulty ──────────────────────────────────────────────────

describe("groupQuestionsByDifficulty", () => {
  it("groups questions into E, M, H buckets", () => {
    const qE = createMockQuestion({
      questionId: "qE",
      difficulty: "E",
    });
    const qM1 = createMockQuestion({
      questionId: "qM1",
      difficulty: "M",
    });
    const qM2 = createMockQuestion({
      questionId: "qM2",
      difficulty: "M",
    });
    const qH = createMockQuestion({
      questionId: "qH",
      difficulty: "H",
    });

    const result = groupQuestionsByDifficulty([qE, qM1, qM2, qH]);

    expect(result.E).toEqual([qE]);
    expect(result.M).toEqual([qM1, qM2]);
    expect(result.H).toEqual([qH]);
  });

  it("excludes questions with invalid difficulty", () => {
    const qValid = createMockQuestion({
      questionId: "valid",
      difficulty: "E",
    });
    const qInvalid = createMockQuestion({
      questionId: "invalid",
      difficulty: "X" as any,
    });
    const qMissing = createMockQuestion({
      questionId: "missing",
      difficulty: undefined as any,
    });

    const result = groupQuestionsByDifficulty([qValid, qInvalid, qMissing]);

    expect(result.E).toEqual([qValid]);
    expect(result.M).toEqual([]);
    expect(result.H).toEqual([]);
  });

  it("returns empty buckets for empty array", () => {
    const result = groupQuestionsByDifficulty([]);
    expect(result).toEqual({ E: [], M: [], H: [] });
  });
});

// ─── sortByDifficulty ───────────────────────────────────────────────────────────

describe("sortByDifficulty", () => {
  it("sorts questions E → M → H", () => {
    const qH = createMockQuestion({
      questionId: "qH",
      difficulty: "H",
    });
    const qE = createMockQuestion({
      questionId: "qE",
      difficulty: "E",
    });
    const qM = createMockQuestion({
      questionId: "qM",
      difficulty: "M",
    });

    const result = sortByDifficulty([qH, qE, qM]);

    expect(result[0].difficulty).toBe("E");
    expect(result[1].difficulty).toBe("M");
    expect(result[2].difficulty).toBe("H");
  });

  it("maintains relative order within same difficulty", () => {
    const qE1 = createMockQuestion({
      questionId: "qE1",
      difficulty: "E",
    });
    const qE2 = createMockQuestion({
      questionId: "qE2",
      difficulty: "E",
    });
    const qE3 = createMockQuestion({
      questionId: "qE3",
      difficulty: "E",
    });

    const result = sortByDifficulty([qE3, qE1, qE2]);

    // Relative order among same difficulty should be preserved
    expect(result[0].questionId).toBe("qE3");
    expect(result[1].questionId).toBe("qE1");
    expect(result[2].questionId).toBe("qE2");
  });

  it("handles empty array", () => {
    const result = sortByDifficulty([]);
    expect(result).toEqual([]);
  });

  it("places unknown difficulty at medium position (index 1)", () => {
    const qH = createMockQuestion({
      questionId: "qH",
      difficulty: "H",
    });
    const qUnknown = createMockQuestion({
      questionId: "qUnknown",
      difficulty: "X" as any,
    });
    const qE = createMockQuestion({
      questionId: "qE",
      difficulty: "E",
    });

    const result = sortByDifficulty([qH, qUnknown, qE]);

    expect(result[0].questionId).toBe("qE");
    expect(result[1].questionId).toBe("qUnknown");
    expect(result[2].questionId).toBe("qH");
  });

  it("does not mutate the original array", () => {
    const qH = createMockQuestion({
      questionId: "qH",
      difficulty: "H",
    });
    const qE = createMockQuestion({
      questionId: "qE",
      difficulty: "E",
    });
    const original = [qH, qE];

    sortByDifficulty(original);

    expect(original[0].questionId).toBe("qH");
    expect(original[1].questionId).toBe("qE");
  });
});

// ─── isLikelySPRQuestion ────────────────────────────────────────────────────────

describe("isLikelySPRQuestion", () => {
  it("returns true for Math domain H (Algebra)", () => {
    const q = createMockQuestion({
      questionId: "q1",
      primary_class_cd: "H",
    });
    expect(isLikelySPRQuestion(q)).toBe(true);
  });

  it("returns true for Math domain P (Advanced Math)", () => {
    const q = createMockQuestion({
      questionId: "q1",
      primary_class_cd: "P",
    });
    expect(isLikelySPRQuestion(q)).toBe(true);
  });

  it("returns true for Math domain Q (Problem-Solving)", () => {
    const q = createMockQuestion({
      questionId: "q1",
      primary_class_cd: "Q",
    });
    expect(isLikelySPRQuestion(q)).toBe(true);
  });

  it("returns true for Math domain S (Geometry)", () => {
    const q = createMockQuestion({
      questionId: "q1",
      primary_class_cd: "S",
    });
    expect(isLikelySPRQuestion(q)).toBe(true);
  });

  it("returns false for R&W domain INI", () => {
    const q = createMockQuestion({
      questionId: "q1",
      primary_class_cd: "INI",
    });
    expect(isLikelySPRQuestion(q)).toBe(false);
  });

  it("returns false for R&W domain CAS", () => {
    const q = createMockQuestion({
      questionId: "q1",
      primary_class_cd: "CAS",
    });
    expect(isLikelySPRQuestion(q)).toBe(false);
  });

  it("returns false for R&W domain EOI", () => {
    const q = createMockQuestion({
      questionId: "q1",
      primary_class_cd: "EOI",
    });
    expect(isLikelySPRQuestion(q)).toBe(false);
  });

  it("returns false for R&W domain SEC", () => {
    const q = createMockQuestion({
      questionId: "q1",
      primary_class_cd: "SEC",
    });
    expect(isLikelySPRQuestion(q)).toBe(false);
  });
});

// ─── designatePretestQuestions ───────────────────────────────────────────────────

describe("designatePretestQuestions", () => {
  const questions = [
    "q0",
    "q1",
    "q2",
    "q3",
    "q4",
    "q5",
    "q6",
    "q7",
    "q8",
    "q9",
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("selects exactly N questions as pretest", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.1);

    const result = designatePretestQuestions(questions, 2);
    expect(result.size).toBe(2);
  });

  it("avoids the first 3 questions", () => {
    // With deterministic Math.random, the Fisher-Yates shuffle picks
    // specific eligible indices; verify none of the first 3 are selected.
    vi.spyOn(Math, "random").mockReturnValue(0.001);

    const result = designatePretestQuestions(questions, 3);
    // None of q0, q1, q2 should be in the pretest set
    expect(result.has("q0")).toBe(false);
    expect(result.has("q1")).toBe(false);
    expect(result.has("q2")).toBe(false);
    // Should have selected 3 distinct eligible questions
    expect(result.size).toBe(3);
    for (const id of result) {
      expect(questions.indexOf(id)).toBeGreaterThanOrEqual(3);
    }
  });

  it("returns all questions if count >= total", () => {
    const result = designatePretestQuestions(questions, 20);
    expect(result.size).toBe(10);
    for (const q of questions) {
      expect(result.has(q)).toBe(true);
    }
  });

  it("returns empty set for count = 0", () => {
    const result = designatePretestQuestions(questions, 0);
    expect(result.size).toBe(0);
  });

  it("withholds pretest from first 3 even when many are selected", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.001);

    const result = designatePretestQuestions(questions, 7);
    // With 10 questions and count=7, since first 3 are ineligible (3..9 = 7 eligible),
    // we select all 7 eligible (positions 3-9)
    expect(result.size).toBe(7);
    expect(result.has("q0")).toBe(false);
    expect(result.has("q1")).toBe(false);
    expect(result.has("q2")).toBe(false);
  });

  it("handles fewer than 3 questions by selecting all", () => {
    const small = ["q0", "q1"];
    const result = designatePretestQuestions(small, 2);
    expect(result.size).toBe(2);
    expect(result.has("q0")).toBe(true);
    expect(result.has("q1")).toBe(true);
  });
});

// ─── selectQuestionsForModule ────────────────────────────────────────────────────

describe("selectQuestionsForModule", () => {
  it("returns empty result for invalid module config", () => {
    // Use a modified blueprint missing the requested module by requesting
    // an invalid section (not possible with types, but we can test by
    // passing a custom blueprint with no sections). Instead, we test with
    // a null-like scenario by giving an empty questions array — the function
    // will still get a valid module config but select 0 questions.
    // For the "invalid module config" case, we need a blueprint that
    // doesn't have the section. Let's create one with empty sections.
    const emptyBlueprint = {
      assessment: "SAT" as const,
      sections: [],
      totalQuestions: 0,
      totalTimeMinutes: 0,
      breakDurationMinutes: 0,
      totalTimeWithBreaksMinutes: 0,
    } as any;

    const result = selectQuestionsForModule(
      [],
      "reading-writing",
      1,
      "easier",
      emptyBlueprint,
    );

    expect(result.questionIds).toEqual([]);
    expect(result.slots).toEqual([]);
    expect(result.pretestQuestionIds).toEqual([]);
  });

  it("selects questions matching domain distribution for RW Module 1", () => {
    const questions = generateRWQuestions(4); // 4 per difficulty per domain = enough

    const result = selectQuestionsForModule(
      questions,
      "reading-writing",
      1,
      "easier",
    );

    // RW Module 1: INI=7, CAS=7, EOI=7, SEC=6 = 27 total
    expect(result.questionIds.length).toBe(27);
    expect(result.section).toBe("reading-writing");
    expect(result.moduleNumber).toBe(1);
  });

  it("selects questions matching domain distribution for Math Module 1", () => {
    const questions = generateMathQuestions(4);

    const result = selectQuestionsForModule(
      questions,
      "math",
      1,
      "easier",
    );

    // Math Module 1: H=6, P=6, Q=5, S=5 = 22 total
    expect(result.questionIds.length).toBe(22);
    expect(result.section).toBe("math");
    expect(result.moduleNumber).toBe(1);
  });

  it("orders questions by difficulty within each domain", () => {
    const questions = generateRWQuestions(4);

    const result = selectQuestionsForModule(
      questions,
      "reading-writing",
      1,
      "easier",
    );

    // Selected questions should be grouped by domain (INI, CAS, EOI, SEC)
    // and within each domain sorted E → M → H
    expect(result.slots.length).toBeGreaterThan(0);

    // Verify slots are ordered by domain then difficulty
    // Track domain transitions: within each domain, difficulties should be non-decreasing
    let currentDomain = result.slots[0].primaryClassCd;
    let prevDifficultyOrder = -1;
    const diffOrder: Record<string, number> = { E: 0, M: 1, H: 2 };

    for (const slot of result.slots) {
      if (slot.primaryClassCd !== currentDomain) {
        // New domain starts: reset difficulty order check
        currentDomain = slot.primaryClassCd;
        prevDifficultyOrder = -1;
      }
      const order = diffOrder[slot.difficulty] ?? 1;
      expect(order).toBeGreaterThanOrEqual(prevDifficultyOrder);
      prevDifficultyOrder = order;
    }
  });

  it("designates pretest questions", () => {
    const questions = generateRWQuestions(4);

    const result = selectQuestionsForModule(
      questions,
      "reading-writing",
      1,
      "easier",
    );

    // RW Module 1 has 2 pretest questions
    expect(result.pretestQuestionIds.length).toBe(2);

    // Pretest IDs should be a subset of selected IDs
    for (const pretestId of result.pretestQuestionIds) {
      expect(result.questionIds).toContain(pretestId);
    }

    // Slots with pretest should be marked
    const pretestSlots = result.slots.filter((s) => s.isPretest);
    expect(pretestSlots.length).toBe(2);
  });

  it("excludes already-used question IDs", () => {
    const questions = generateRWQuestions(4);
    const excludeIds = new Set(
      questions.slice(0, 10).map((q) => q.questionId),
    );

    const result = selectQuestionsForModule(
      questions,
      "reading-writing",
      1,
      "easier",
      undefined,
      excludeIds,
    );

    for (const id of result.questionIds) {
      expect(excludeIds.has(id)).toBe(false);
    }
  });

  it("handles insufficient questions gracefully", () => {
    // Only provide 5 questions, all from one domain
    const questions = generateQuestions("INI", "E", 5, "sparse");

    const result = selectQuestionsForModule(
      questions,
      "reading-writing",
      1,
      "easier",
    );

    // Should select what's available without throwing
    expect(result.questionIds.length).toBeLessThanOrEqual(5);
    expect(result.questionIds.length).toBeGreaterThan(0);
    expect(Array.isArray(result.questionIds)).toBe(true);
  });

  it("returns harder difficulty path when specified", () => {
    const questions = generateRWQuestions(4);
    const result = selectQuestionsForModule(
      questions,
      "reading-writing",
      2,
      "harder",
    );

    expect(result.difficulty).toBe("harder");
  });
});

// ─── selectQuestionsForTest ─────────────────────────────────────────────────────

describe("selectQuestionsForTest", () => {
  it("returns selections for all 4 modules", () => {
    const rwQuestions = generateRWQuestions(5); // 5 per diff per domain = plenty
    const mathQuestions = generateMathQuestions(5);

    const result = selectQuestionsForTest(rwQuestions, mathQuestions, "SAT");

    expect(result.modules["reading-writing-1"]).toBeDefined();
    expect(result.modules["reading-writing-2"]).toBeDefined();
    expect(result.modules["math-1"]).toBeDefined();
    expect(result.modules["math-2"]).toBeDefined();
    expect(result.totalQuestions).toBeGreaterThan(0);
  });

  it("does not reuse question IDs across modules", () => {
    const rwQuestions = generateRWQuestions(10);
    const mathQuestions = generateMathQuestions(10);

    const result = selectQuestionsForTest(rwQuestions, mathQuestions, "SAT");

    const allIds = [
      ...result.modules["reading-writing-1"].questionIds,
      ...result.modules["reading-writing-2"].questionIds,
      ...result.modules["math-1"].questionIds,
      ...result.modules["math-2"].questionIds,
    ];

    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);
  });

  it("reports warnings when insufficient questions", () => {
    // Provide too few questions to fill all modules
    const rwQuestions = generateQuestions("INI", "E", 5, "few");
    const mathQuestions = generateQuestions("H", "E", 5, "few");

    const result = selectQuestionsForTest(rwQuestions, mathQuestions, "SAT");

    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
    expect(result.warnings[0]).toContain("Only");
  });

  it("handles empty question pools", () => {
    const result = selectQuestionsForTest([], [], "SAT");

    expect(result.modules["reading-writing-1"]).toBeDefined();
    expect(result.modules["reading-writing-2"]).toBeDefined();
    expect(result.modules["math-1"]).toBeDefined();
    expect(result.modules["math-2"]).toBeDefined();
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

// ─── determineModule2DifficultyFromAnswers ──────────────────────────────────────

describe("determineModule2DifficultyFromAnswers", () => {
  it('returns "harder" when accuracy >= 60%', () => {
    const answers: Record<string, string | null> = {
      q1: "A",
      q2: "B",
      q3: "C",
      q4: "D",
      q5: "A",
      q6: "B",
      q7: "C",
      q8: "D",
      q9: "A",
      q10: "B",
      q11: "C",
      q12: "D",
    };
    const correctAnswers: Record<string, string[]> = {
      q1: ["A"],
      q2: ["B"],
      q3: ["C"],
      q4: ["D"],
      q5: ["A"],
      q6: ["B"],
      q7: ["C"],
      q8: ["D"],
      q9: ["A"],
      q10: ["B"],
      q11: ["C"],
      q12: ["D"],
    };

    // 12/12 = 100% >= 60% → harder
    expect(determineModule2DifficultyFromAnswers(answers, correctAnswers)).toBe(
      "harder",
    );
  });

  it('returns "easier" when accuracy < 60%', () => {
    const answers: Record<string, string | null> = {
      q1: "A",
      q2: "B",
      q3: "C",
      q4: "D",
      q5: "A",
      q6: "B",
      q7: "C",
      q8: "D",
      q9: "A",
      q10: "B",
    };
    const correctAnswers: Record<string, string[]> = {
      q1: ["X"],
      q2: ["X"],
      q3: ["X"],
      q4: ["X"],
      q5: ["X"],
      q6: ["X"],
      q7: ["X"],
      q8: ["X"],
      q9: ["X"],
      q10: ["X"],
    };

    // 0/10 = 0% < 60% → easier
    expect(determineModule2DifficultyFromAnswers(answers, correctAnswers)).toBe(
      "easier",
    );
  });

  it('returns "easier" when fewer than 10 questions answered', () => {
    const answers: Record<string, string | null> = {
      q1: "A",
      q2: "B",
      q3: "C",
      q4: "D",
      q5: "A",
    };
    const correctAnswers: Record<string, string[]> = {
      q1: ["A"],
      q2: ["B"],
      q3: ["C"],
      q4: ["D"],
      q5: ["A"],
    };

    // 5 answered, but < 10 → easier regardless of accuracy
    expect(determineModule2DifficultyFromAnswers(answers, correctAnswers)).toBe(
      "easier",
    );
  });

  it("handles case-insensitive answer comparison", () => {
    const answers: Record<string, string | null> = {
      q1: "a", // lowercase
      q2: "B",
      q3: "c",
    };
    const correctAnswers: Record<string, string[]> = {
      q1: ["A"], // uppercase
      q2: ["b"],
      q3: ["C"],
    };

    // Only 3 answered (< 10), so default to easier - but also verify
    // the matching works correctly by testing with >= 10 answers
    const manyAnswers: Record<string, string | null> = {};
    const manyCorrect: Record<string, string[]> = {};
    for (let i = 0; i < 12; i++) {
      manyAnswers[`q${i}`] = String.fromCharCode(97 + i); // 'a', 'b', 'c', ...
      manyCorrect[`q${i}`] = [String.fromCharCode(65 + i)]; // 'A', 'B', 'C', ...
    }

    // All 12 should match despite case differences → 100% ≥ 60% → harder
    expect(determineModule2DifficultyFromAnswers(manyAnswers, manyCorrect)).toBe(
      "harder",
    );
  });

  it("handles null (unanswered) questions", () => {
    const answers: Record<string, string | null> = {
      q1: "A",
      q2: null, // unanswered
      q3: "C",
      q4: null,
      q5: "E",
      q6: "F",
      q7: "G",
      q8: "H",
      q9: "I",
      q10: "J",
      q11: "K",
      q12: "L",
    };
    const correctAnswers: Record<string, string[]> = {
      q1: ["A"],
      q2: ["B"],
      q3: ["C"],
      q4: ["D"],
      q5: ["E"],
      q6: ["F"],
      q7: ["G"],
      q8: ["H"],
      q9: ["I"],
      q10: ["J"],
      q11: ["K"],
      q12: ["L"],
    };

    // 10 answered (q2 and q4 are null), all correct → 100% ≥ 60% → harder
    expect(determineModule2DifficultyFromAnswers(answers, correctAnswers)).toBe(
      "harder",
    );
  });
});
