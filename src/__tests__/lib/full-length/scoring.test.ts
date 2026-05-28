import { describe, it, expect } from "vitest";
import {
  DIFFICULTY_WEIGHTS,
  MODULE2_DIFFICULTY_MULTIPLIER,
  calculateWeightedRawScore,
  calculateMaxWeightedRawScore,
  rawAccuracyToScaledScore,
  calculateSectionScore,
  calculateModuleResult,
  calculateSectionResult,
  calculateTestResult,
  interpretSectionScore,
  interpretTotalScore,
  getTimeManagementRating,
} from "@/lib/full-length/scoring";
import type {
  FullLengthModuleResult,
  FullLengthSectionResult,
  FullLengthTestConfig,
} from "@/types/full-length";

// ─── DIFFICULTY_WEIGHTS ─────────────────────────────────────────────────────────

describe("DIFFICULTY_WEIGHTS", () => {
  it("E = 1.0", () => {
    expect(DIFFICULTY_WEIGHTS.E).toBe(1.0);
  });

  it("M = 1.3", () => {
    expect(DIFFICULTY_WEIGHTS.M).toBe(1.3);
  });

  it("H = 1.7", () => {
    expect(DIFFICULTY_WEIGHTS.H).toBe(1.7);
  });
});

// ─── MODULE2_DIFFICULTY_MULTIPLIER ──────────────────────────────────────────────

describe("MODULE2_DIFFICULTY_MULTIPLIER", () => {
  it("easier = 0.95", () => {
    expect(MODULE2_DIFFICULTY_MULTIPLIER.easier).toBe(0.95);
  });

  it("harder = 1.05", () => {
    expect(MODULE2_DIFFICULTY_MULTIPLIER.harder).toBe(1.05);
  });
});

// ─── calculateWeightedRawScore ──────────────────────────────────────────────────

describe("calculateWeightedRawScore", () => {
  it("returns 0 for no correct answers", () => {
    const result = calculateWeightedRawScore(
      { q1: "A" },
      { q1: ["B"] },
      { q1: "E" },
      new Set(),
    );
    expect(result).toBe(0);
  });

  it("returns correct weight for easy correct answer (1.0)", () => {
    const result = calculateWeightedRawScore(
      { q1: "A" },
      { q1: ["A"] },
      { q1: "E" },
      new Set(),
    );
    expect(result).toBe(1.0);
  });

  it("returns correct weight for medium correct answer (1.3)", () => {
    const result = calculateWeightedRawScore(
      { q1: "A" },
      { q1: ["A"] },
      { q1: "M" },
      new Set(),
    );
    expect(result).toBe(1.3);
  });

  it("returns correct weight for hard correct answer (1.7)", () => {
    const result = calculateWeightedRawScore(
      { q1: "A" },
      { q1: ["A"] },
      { q1: "H" },
      new Set(),
    );
    expect(result).toBe(1.7);
  });

  it("excludes pretest questions from scoring", () => {
    const result = calculateWeightedRawScore(
      { pretest: "A", operational: "B" },
      { pretest: ["A"], operational: ["B"] },
      { pretest: "E", operational: "E" },
      new Set(["pretest"]),
    );
    // Only the operational question counts
    expect(result).toBe(1.0);
  });

  it("skips null (unanswered) questions", () => {
    const result = calculateWeightedRawScore(
      { q1: null, q2: "A" },
      { q1: ["A"], q2: ["B"] },
      { q1: "E", q2: "E" },
      new Set(),
    );
    // q1 is unanswered (null), q2 is wrong
    expect(result).toBe(0);
  });

  it("is case-insensitive for answer comparison", () => {
    const result = calculateWeightedRawScore(
      { q1: "a" },
      { q1: ["A"] },
      { q1: "E" },
      new Set(),
    );
    expect(result).toBe(1.0);
  });

  it("accumulates scores for multiple correct answers", () => {
    const result = calculateWeightedRawScore(
      { q1: "A", q2: "B", q3: "C" },
      { q1: ["A"], q2: ["B"], q3: ["C"] },
      { q1: "E", q2: "M", q3: "H" },
      new Set(),
    );
    expect(result).toBeCloseTo(1.0 + 1.3 + 1.7);
  });

  it("handles multiple correct answers for SPR questions", () => {
    const result = calculateWeightedRawScore(
      { q1: "7" },
      { q1: ["7", "7.0"] },
      { q1: "M" },
      new Set(),
    );
    expect(result).toBe(1.3);
  });

  it("treats missing difficulty as medium weight", () => {
    const result = calculateWeightedRawScore(
      { q1: "A" },
      { q1: ["A"] },
      {}, // no difficulty entry
      new Set(),
    );
    // Defaults to "M" = 1.3
    expect(result).toBe(1.3);
  });
});

// ─── calculateMaxWeightedRawScore ──────────────────────────────────────────────

describe("calculateMaxWeightedRawScore", () => {
  it("returns 0 for empty difficulties", () => {
    const result = calculateMaxWeightedRawScore({}, new Set());
    expect(result).toBe(0);
  });

  it("returns sum of all difficulty weights for operational questions", () => {
    const result = calculateMaxWeightedRawScore(
      { q1: "E", q2: "M", q3: "H" },
      new Set(),
    );
    expect(result).toBeCloseTo(1.0 + 1.3 + 1.7);
  });

  it("excludes pretest questions", () => {
    const result = calculateMaxWeightedRawScore(
      { op1: "E", op2: "M", pretest: "H" },
      new Set(["pretest"]),
    );
    expect(result).toBeCloseTo(1.0 + 1.3);
  });
});

// ─── rawAccuracyToScaledScore ───────────────────────────────────────────────────

describe("rawAccuracyToScaledScore", () => {
  it("returns 200 for 0% accuracy (minimum score)", () => {
    const result = rawAccuracyToScaledScore(0);
    expect(result).toBe(200);
  });

  it("returns 800 for 100% accuracy (maximum score)", () => {
    const result = rawAccuracyToScaledScore(1);
    expect(result).toBe(800);
  });

  it("returns higher scores for higher accuracy", () => {
    const low = rawAccuracyToScaledScore(0.3);
    const mid = rawAccuracyToScaledScore(0.6);
    const high = rawAccuracyToScaledScore(0.9);
    expect(low).toBeLessThan(mid);
    expect(mid).toBeLessThan(high);
  });

  it("applies Module 2 difficulty multiplier (easier)", () => {
    const base = rawAccuracyToScaledScore(0.5);
    const adjusted = rawAccuracyToScaledScore(0.5, "easier");
    expect(adjusted).toBe(Math.round(base * 0.95));
  });

  it("applies Module 2 difficulty multiplier (harder)", () => {
    const base = rawAccuracyToScaledScore(0.5);
    const adjusted = rawAccuracyToScaledScore(0.5, "harder");
    expect(adjusted).toBe(Math.round(base * 1.05));
  });

  it("clamps scores to 200-800 range", () => {
    // Test below minimum
    const below = rawAccuracyToScaledScore(-0.5);
    expect(below).toBe(200);

    // Test above maximum (harder path on perfect score can exceed 800)
    const above = rawAccuracyToScaledScore(1, "harder");
    expect(above).toBe(800);
  });

  it("returns approximately 500 for 50% accuracy", () => {
    const result = rawAccuracyToScaledScore(0.5);
    expect(result).toBeGreaterThanOrEqual(450);
    expect(result).toBeLessThanOrEqual(530);
  });

  it("handles accuracy > 1 by clamping", () => {
    const result = rawAccuracyToScaledScore(2);
    expect(result).toBe(800);
  });

  it("returns 320 for 20% accuracy", () => {
    const result = rawAccuracyToScaledScore(0.2);
    expect(result).toBe(320);
  });

  it("returns 500 for 50% accuracy (no module2 difficulty)", () => {
    const result = rawAccuracyToScaledScore(0.5);
    expect(result).toBe(500);
  });

  it("returns 680 for 80% accuracy", () => {
    const result = rawAccuracyToScaledScore(0.8);
    expect(result).toBe(680);
  });
});

// ─── calculateSectionScore ─────────────────────────────────────────────────────

describe("calculateSectionScore", () => {
  it("combines both modules' results", () => {
    const module1: FullLengthModuleResult = {
      moduleNumber: 1,
      correctCount: 10,
      operationalCount: 20,
      pretestCorrectCount: 1,
      pretestCount: 2,
      accuracy: 50,
      timeMs: 600000,
      domainBreakdown: {},
    };
    const module2: FullLengthModuleResult = {
      moduleNumber: 2,
      difficulty: "harder",
      correctCount: 15,
      operationalCount: 20,
      pretestCorrectCount: 1,
      pretestCount: 2,
      accuracy: 75,
      timeMs: 600000,
      domainBreakdown: {},
    };

    const score = calculateSectionScore(module1, module2);
    // (10+15)/(20+20) = 25/40 = 0.625 accuracy, harder path
    // base = 500 + (0.625-0.5)*600 = 500 + 75 = 575
    // with harder: 575 * 1.05 = 603.75 → 604
    expect(score).toBeGreaterThanOrEqual(200);
    expect(score).toBeLessThanOrEqual(800);
  });

  it("returns a score between 200-800", () => {
    const allWrong1: FullLengthModuleResult = {
      moduleNumber: 1,
      correctCount: 0,
      operationalCount: 20,
      pretestCorrectCount: 0,
      pretestCount: 2,
      accuracy: 0,
      timeMs: 600000,
      domainBreakdown: {},
    };
    const allWrong2: FullLengthModuleResult = {
      moduleNumber: 2,
      difficulty: "easier",
      correctCount: 0,
      operationalCount: 20,
      pretestCorrectCount: 0,
      pretestCount: 2,
      accuracy: 0,
      timeMs: 600000,
      domainBreakdown: {},
    };

    const score = calculateSectionScore(allWrong1, allWrong2);
    expect(score).toBeGreaterThanOrEqual(200);
    expect(score).toBeLessThanOrEqual(800);
  });

  it("applies Module 2 difficulty adjustment", () => {
    const module1: FullLengthModuleResult = {
      moduleNumber: 1,
      correctCount: 18,
      operationalCount: 20,
      pretestCorrectCount: 2,
      pretestCount: 2,
      accuracy: 90,
      timeMs: 600000,
      domainBreakdown: {},
    };
    const module2Easier: FullLengthModuleResult = {
      moduleNumber: 2,
      difficulty: "easier",
      correctCount: 18,
      operationalCount: 20,
      pretestCorrectCount: 2,
      pretestCount: 2,
      accuracy: 90,
      timeMs: 600000,
      domainBreakdown: {},
    };
    const module2Harder: FullLengthModuleResult = {
      moduleNumber: 2,
      difficulty: "harder",
      correctCount: 18,
      operationalCount: 20,
      pretestCorrectCount: 2,
      pretestCount: 2,
      accuracy: 90,
      timeMs: 600000,
      domainBreakdown: {},
    };

    const easierScore = calculateSectionScore(module1, module2Easier);
    const harderScore = calculateSectionScore(module1, module2Harder);

    // Harder path should yield a higher (or equal) score for the same performance
    expect(harderScore).toBeGreaterThanOrEqual(easierScore);
  });

  it("returns 200 when no operational questions", () => {
    const empty1: FullLengthModuleResult = {
      moduleNumber: 1,
      correctCount: 0,
      operationalCount: 0,
      pretestCorrectCount: 0,
      pretestCount: 0,
      accuracy: 0,
      timeMs: 0,
      domainBreakdown: {},
    };
    const empty2: FullLengthModuleResult = {
      moduleNumber: 2,
      correctCount: 0,
      operationalCount: 0,
      pretestCorrectCount: 0,
      pretestCount: 0,
      accuracy: 0,
      timeMs: 0,
      domainBreakdown: {},
    };

    expect(calculateSectionScore(empty1, empty2)).toBe(200);
  });
});

// ─── calculateModuleResult ─────────────────────────────────────────────────────

describe("calculateModuleResult", () => {
  it("counts correct operational answers", () => {
    const result = calculateModuleResult(
      { q1: "A", q2: "B", q3: "C" },
      { q1: ["A"], q2: ["X"], q3: ["C"] },
      { q1: "E", q2: "M", q3: "H" },
      new Set(),
      1,
      undefined,
      300000,
    );

    expect(result.correctCount).toBe(2); // q1 and q3 correct
    expect(result.operationalCount).toBe(3);
    expect(result.moduleNumber).toBe(1);
    expect(result.timeMs).toBe(300000);
  });

  it("counts pretest answers separately", () => {
    const result = calculateModuleResult(
      { op1: "A", pt1: "B" },
      { op1: ["A"], pt1: ["B"] },
      { op1: "E", pt1: "M" },
      new Set(["pt1"]),
      2,
      "harder",
      400000,
    );

    expect(result.correctCount).toBe(1); // only op1
    expect(result.operationalCount).toBe(1);
    expect(result.pretestCorrectCount).toBe(1); // pt1 was correct
    expect(result.pretestCount).toBe(1);
    expect(result.difficulty).toBe("harder");
    expect(result.moduleNumber).toBe(2);
  });

  it("calculates accuracy percentage", () => {
    const result = calculateModuleResult(
      { q1: "A", q2: "B", q3: "C", q4: "D" },
      { q1: ["A"], q2: ["B"], q3: ["X"], q4: ["Y"] },
      { q1: "E", q2: "M", q3: "H", q4: "E" },
      new Set(),
      1,
      undefined,
      200000,
    );

    // 2 correct out of 4 operational → 50%
    expect(result.accuracy).toBe(50);
    expect(result.correctCount).toBe(2);
    expect(result.operationalCount).toBe(4);
  });

  it("handles all unanswered questions (0% accuracy)", () => {
    const result = calculateModuleResult(
      { q1: null, q2: null },
      { q1: ["A"], q2: ["B"] },
      { q1: "E", q2: "M" },
      new Set(),
      1,
      undefined,
      0,
    );

    expect(result.correctCount).toBe(0);
    expect(result.operationalCount).toBe(2);
    expect(result.accuracy).toBe(0);
  });

  it("returns 0% accuracy when all questions are pretest", () => {
    const result = calculateModuleResult(
      { pt1: "A", pt2: "B" },
      { pt1: ["A"], pt2: ["B"] },
      { pt1: "E", pt2: "M" },
      new Set(["pt1", "pt2"]),
      1,
      undefined,
      100000,
    );

    expect(result.correctCount).toBe(0);
    expect(result.operationalCount).toBe(0);
    expect(result.accuracy).toBe(0);
    expect(result.pretestCorrectCount).toBe(2);
    expect(result.pretestCount).toBe(2);
  });
});

// ─── calculateSectionResult ─────────────────────────────────────────────────────

describe("calculateSectionResult", () => {
  it("aggregates both module results", () => {
    const mod1: FullLengthModuleResult = {
      moduleNumber: 1,
      correctCount: 10,
      operationalCount: 20,
      pretestCorrectCount: 1,
      pretestCount: 2,
      accuracy: 50,
      timeMs: 600000,
      domainBreakdown: {},
    };
    const mod2: FullLengthModuleResult = {
      moduleNumber: 2,
      difficulty: "harder",
      correctCount: 15,
      operationalCount: 20,
      pretestCorrectCount: 2,
      pretestCount: 2,
      accuracy: 75,
      timeMs: 600000,
      domainBreakdown: {},
    };

    const result = calculateSectionResult("reading-writing", mod1, mod2);

    expect(result.section).toBe("reading-writing");
    expect(result.totalCorrect).toBe(25);
    expect(result.totalOperational).toBe(40);
    expect(result.totalTimeMs).toBe(1200000);
    expect(result.accuracy).toBe(62.5); // (10+15)/(20+20)*100
    expect(result.modules).toEqual([mod1, mod2]);
  });

  it("calculates total time correctly", () => {
    const mod1: FullLengthModuleResult = {
      moduleNumber: 1,
      correctCount: 0,
      operationalCount: 0,
      pretestCorrectCount: 0,
      pretestCount: 0,
      accuracy: 0,
      timeMs: 300000,
      domainBreakdown: {},
    };
    const mod2: FullLengthModuleResult = {
      moduleNumber: 2,
      correctCount: 0,
      operationalCount: 0,
      pretestCorrectCount: 0,
      pretestCount: 0,
      accuracy: 0,
      timeMs: 450000,
      domainBreakdown: {},
    };

    const result = calculateSectionResult("math", mod1, mod2);
    expect(result.totalTimeMs).toBe(750000);
  });
});

// ─── calculateTestResult ────────────────────────────────────────────────────────

describe("calculateTestResult", () => {
  const createModule = (
    number: 1 | 2,
    correct: number,
    operational: number,
    difficulty?: "easier" | "harder",
  ): FullLengthModuleResult => ({
    moduleNumber: number,
    difficulty,
    correctCount: correct,
    operationalCount: operational,
    pretestCorrectCount: 0,
    pretestCount: 2,
    accuracy: operational > 0 ? (correct / operational) * 100 : 0,
    timeMs: 600000,
    domainBreakdown: {},
  });

  const config: FullLengthTestConfig = {
    assessment: "SAT",
    includeBreak: true,
    showTimer: true,
    allowPause: true,
  };

  it("calculates R&W and Math section scores", () => {
    const rwResult: FullLengthSectionResult = {
      section: "reading-writing",
      modules: [
        createModule(1, 15, 25, undefined),
        createModule(2, 20, 25, "harder"),
      ],
      totalCorrect: 35,
      totalOperational: 50,
      accuracy: 70,
      totalTimeMs: 1200000,
    };
    const mathResult: FullLengthSectionResult = {
      section: "math",
      modules: [
        createModule(1, 12, 20, undefined),
        createModule(2, 16, 20, "harder"),
      ],
      totalCorrect: 28,
      totalOperational: 40,
      accuracy: 70,
      totalTimeMs: 1200000,
    };

    const result = calculateTestResult(
      config,
      rwResult,
      mathResult,
      "2024-01-01T00:00:00Z",
      "2024-01-01T03:00:00Z",
    );

    expect(result.readingWritingScore).toBeGreaterThanOrEqual(200);
    expect(result.readingWritingScore).toBeLessThanOrEqual(800);
    expect(result.mathScore).toBeGreaterThanOrEqual(200);
    expect(result.mathScore).toBeLessThanOrEqual(800);
    expect(result.totalScore).toBe(
      result.readingWritingScore + result.mathScore,
    );
    expect(result.totalScore).toBeGreaterThanOrEqual(400);
    expect(result.totalScore).toBeLessThanOrEqual(1600);
  });

  it("sums to total score (400-1600 range)", () => {
    const perfectRW: FullLengthSectionResult = {
      section: "reading-writing",
      modules: [
        createModule(1, 25, 25, undefined),
        createModule(2, 25, 25, "harder"),
      ],
      totalCorrect: 50,
      totalOperational: 50,
      accuracy: 100,
      totalTimeMs: 1200000,
    };
    const perfectMath: FullLengthSectionResult = {
      section: "math",
      modules: [
        createModule(1, 20, 20, undefined),
        createModule(2, 20, 20, "harder"),
      ],
      totalCorrect: 40,
      totalOperational: 40,
      accuracy: 100,
      totalTimeMs: 1200000,
    };

    const result = calculateTestResult(
      config,
      perfectRW,
      perfectMath,
      "2024-01-01T00:00:00Z",
      "2024-01-01T03:00:00Z",
    );

    expect(result.totalScore).toBeGreaterThanOrEqual(400);
    expect(result.totalScore).toBeLessThanOrEqual(1600);
  });

  it("sets completed flag based on modules having data", () => {
    const emptyRW: FullLengthSectionResult = {
      section: "reading-writing",
      modules: [
        createModule(1, 0, 0, undefined),
        createModule(2, 0, 0, "easier"),
      ],
      totalCorrect: 0,
      totalOperational: 0,
      accuracy: 0,
      totalTimeMs: 0,
    };
    const emptyMath: FullLengthSectionResult = {
      section: "math",
      modules: [
        createModule(1, 0, 0, undefined),
        createModule(2, 0, 0, "easier"),
      ],
      totalCorrect: 0,
      totalOperational: 0,
      accuracy: 0,
      totalTimeMs: 0,
    };

    const result = calculateTestResult(
      config,
      emptyRW,
      emptyMath,
      "2024-01-01T00:00:00Z",
      "2024-01-01T03:00:00Z",
    );

    expect(result.completed).toBe(false);
  });

  it("marks completed when all modules have operational questions", () => {
    const rwResult: FullLengthSectionResult = {
      section: "reading-writing",
      modules: [
        createModule(1, 10, 25, undefined),
        createModule(2, 10, 25, "easier"),
      ],
      totalCorrect: 20,
      totalOperational: 50,
      accuracy: 40,
      totalTimeMs: 1200000,
    };
    const mathResult: FullLengthSectionResult = {
      section: "math",
      modules: [
        createModule(1, 8, 20, undefined),
        createModule(2, 8, 20, "easier"),
      ],
      totalCorrect: 16,
      totalOperational: 40,
      accuracy: 40,
      totalTimeMs: 1200000,
    };

    const result = calculateTestResult(
      config,
      rwResult,
      mathResult,
      "2024-01-01T00:00:00Z",
      "2024-01-01T03:00:00Z",
    );

    expect(result.completed).toBe(true);
  });
});

// ─── interpretSectionScore ─────────────────────────────────────────────────────

describe("interpretSectionScore", () => {
  it('returns "Excellent" for scores >= 700', () => {
    const rw = interpretSectionScore(700, "reading-writing");
    expect(rw.level).toBe("Excellent");
    expect(rw.benchmark).toBe(true);

    const math = interpretSectionScore(750, "math");
    expect(math.level).toBe("Excellent");
    expect(math.benchmark).toBe(true);
  });

  it('returns "Good" for scores >= 600', () => {
    const rw = interpretSectionScore(650, "reading-writing");
    expect(rw.level).toBe("Good");
    expect(rw.benchmark).toBe(true);

    const math = interpretSectionScore(600, "math");
    expect(math.level).toBe("Good");
    expect(math.benchmark).toBe(true);
  });

  it('returns "Benchmark" for scores >= 480 (R&W) or >= 530 (Math)', () => {
    const rw = interpretSectionScore(480, "reading-writing");
    expect(rw.level).toBe("Benchmark");
    expect(rw.benchmark).toBe(true);

    const math = interpretSectionScore(530, "math");
    expect(math.level).toBe("Benchmark");
    expect(math.benchmark).toBe(true);
  });

  it('returns "Approaching" for scores near benchmark', () => {
    // R&W benchmark is 480, so 400-479 is "Approaching" (480-80=400)
    const rw = interpretSectionScore(440, "reading-writing");
    expect(rw.level).toBe("Approaching");
    expect(rw.benchmark).toBe(false);

    // Math benchmark is 530, so 450-529 is "Approaching" (530-80=450)
    const math = interpretSectionScore(500, "math");
    expect(math.level).toBe("Approaching");
    expect(math.benchmark).toBe(false);
  });

  it('returns "Below Benchmark" for low scores', () => {
    // Below benchmark - 80
    const rw = interpretSectionScore(399, "reading-writing");
    expect(rw.level).toBe("Below Benchmark");
    expect(rw.benchmark).toBe(false);

    const math = interpretSectionScore(449, "math");
    expect(math.level).toBe("Below Benchmark");
    expect(math.benchmark).toBe(false);
  });

  it("sets benchmark boolean correctly", () => {
    expect(interpretSectionScore(800, "reading-writing").benchmark).toBe(true);
    expect(interpretSectionScore(480, "reading-writing").benchmark).toBe(true);
    expect(interpretSectionScore(479, "reading-writing").benchmark).toBe(false);
    expect(interpretSectionScore(200, "reading-writing").benchmark).toBe(false);

    expect(interpretSectionScore(800, "math").benchmark).toBe(true);
    expect(interpretSectionScore(530, "math").benchmark).toBe(true);
    expect(interpretSectionScore(529, "math").benchmark).toBe(false);
    expect(interpretSectionScore(200, "math").benchmark).toBe(false);
  });
});

// ─── interpretTotalScore ───────────────────────────────────────────────────────

describe("interpretTotalScore", () => {
  it('returns "Excellent" for scores >= 1400', () => {
    const result = interpretTotalScore(1450);
    expect(result.level).toBe("Excellent");
  });

  it('returns "Good" for scores >= 1200', () => {
    const result = interpretTotalScore(1250);
    expect(result.level).toBe("Good");
  });

  it('returns "Benchmark" for scores >= 1010', () => {
    const result = interpretTotalScore(1010);
    expect(result.level).toBe("Benchmark");
  });

  it('returns "Approaching" for scores >= 900', () => {
    const result = interpretTotalScore(950);
    expect(result.level).toBe("Approaching");
  });

  it('returns "Below Benchmark" for scores < 900', () => {
    const result = interpretTotalScore(850);
    expect(result.level).toBe("Below Benchmark");
  });
});

// ─── getTimeManagementRating ────────────────────────────────────────────────────

describe("getTimeManagementRating", () => {
  it('returns "Fast" for <= 60% of allotted time', () => {
    // 32 minutes allotted = 1,920,000 ms; 60% = 1,152,000 ms
    const result = getTimeManagementRating(1000000, 32);
    expect(result.rating).toBe("Fast");
  });

  it('returns "Efficient" for <= 80% of allotted time', () => {
    // 70% of 32 min = 22.4 min = 1,344,000 ms
    const result = getTimeManagementRating(1344000, 32);
    expect(result.rating).toBe("Efficient");
  });

  it('returns "On Track" for <= 95% of allotted time', () => {
    // 90% of 35 min = 31.5 min = 1,890,000 ms
    const result = getTimeManagementRating(1890000, 35);
    expect(result.rating).toBe("On Track");
  });

  it('returns "Rushed" for > 95% of allotted time', () => {
    // 99% of 35 min = 34.65 min = 2,079,000 ms
    const result = getTimeManagementRating(2079000, 35);
    expect(result.rating).toBe("Rushed");
  });

  it("handles edge cases at boundary values", () => {
    // Exactly 60% → Fast
    const fast = getTimeManagementRating(0.6 * 32 * 60 * 1000, 32);
    expect(fast.rating).toBe("Fast");

    // Just over 60% → Efficient
    const efficient = getTimeManagementRating(0.61 * 32 * 60 * 1000, 32);
    expect(efficient.rating).toBe("Efficient");

    // Exactly 95% → On Track
    const onTrack = getTimeManagementRating(0.95 * 32 * 60 * 1000, 32);
    expect(onTrack.rating).toBe("On Track");

    // Just over 95% → Rushed
    const rushed = getTimeManagementRating(0.951 * 32 * 60 * 1000, 32);
    expect(rushed.rating).toBe("Rushed");
  });
});
