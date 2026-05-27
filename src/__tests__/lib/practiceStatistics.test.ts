import { describe, it, expect, beforeEach } from "vitest";
import {
  getPracticeStatistics,
  savePracticeStatistics,
  addQuestionStatistic,
  addAnsweredQuestion,
  getQuestionStatistic,
  getSkillSummary,
  getDomainSummary,
  getAssessmentSummary,
  clearAssessmentStatistics,
  clearAllStatistics,
  exportStatistics,
  importStatistics,
  updateSessionXP,
} from "@/lib/practiceStatistics";
import type {
  PracticeStatistics,
  AssessmentStatistics,
  QuestionStatistic,
  StatisticEntry,
  AssessmentType,
} from "@/types/statistics";
import type { DomainItems, SkillCd_Variants } from "@/types/lookup";

const PRACTICE_STATISTICS_KEY = "practiceStatistics";
const LEGACY_PRACTICE_RUSH_STATISTICS_KEY = "practiceRushStatistics";

function setLocalStorage(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function getLocalStorage(key: string): unknown {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : undefined;
}

describe("practiceStatistics", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getPracticeStatistics", () => {
    it("returns empty object when no data in localStorage", () => {
      const result = getPracticeStatistics();
      expect(result).toEqual({});
    });

    it("returns stored statistics when data exists", () => {
      const data: PracticeStatistics = {
        SAT: {
          answeredQuestions: ["q1"],
          answeredQuestionsDetailed: [],
          statistics: {},
        },
      };
      setLocalStorage(PRACTICE_STATISTICS_KEY, data);

      const result = getPracticeStatistics();
      expect(result).toEqual(data);
    });

    it("migrates from legacy practiceRushStatistics key when new key is empty", () => {
      const legacyData = {
        SAT: {
          answeredQuestions: ["q1", "q2"],
          statistics: {
            INI: {
              CID: {
                q1: { time: 5000, answer: "A", isCorrect: true },
              },
            },
          },
        },
      };
      setLocalStorage(LEGACY_PRACTICE_RUSH_STATISTICS_KEY, legacyData);

      const result = getPracticeStatistics();

      expect(result.SAT).toBeDefined();
      expect(result.SAT!.answeredQuestions).toEqual(["q1", "q2"]);
      expect(result.SAT!.answeredQuestionsDetailed).toEqual([]);
      expect(result.SAT!.statistics).toEqual(legacyData.SAT.statistics);
    });

    it("removes legacy key after migration", () => {
      const legacyData = {
        SAT: {
          answeredQuestions: [],
          statistics: {},
        },
      };
      setLocalStorage(LEGACY_PRACTICE_RUSH_STATISTICS_KEY, legacyData);

      getPracticeStatistics();

      expect(localStorage.getItem(LEGACY_PRACTICE_RUSH_STATISTICS_KEY)).toBeNull();
    });

    it("returns empty object on JSON parse error", () => {
      localStorage.setItem(PRACTICE_STATISTICS_KEY, "not-valid-json");
      const result = getPracticeStatistics();
      expect(result).toEqual({});
    });
  });

  describe("savePracticeStatistics", () => {
    it("saves data to localStorage under practiceStatistics key", () => {
      const data: PracticeStatistics = {
        SAT: {
          answeredQuestions: [],
          answeredQuestionsDetailed: [],
          statistics: {},
        },
      };

      savePracticeStatistics(data);

      const stored = localStorage.getItem(PRACTICE_STATISTICS_KEY);
      expect(stored).toBe(JSON.stringify(data));
    });
  });

  describe("addQuestionStatistic", () => {
    const mockDomain = "INI" as DomainItems;
    const mockSkill = "CID" as SkillCd_Variants;

    const baseEntry: StatisticEntry = {
      assessment: "SAT" as AssessmentType,
      primaryClassCd: mockDomain,
      skillCd: mockSkill,
      questionId: "q1",
      statistic: { time: 3000, answer: "B", isCorrect: true },
      external_id: "ext-123",
      ibn: "ibn-456",
      plainQuestion: {
        updateDate: 20240101,
        pPcc: "INI",
        questionId: "q1",
        skill_cd: mockSkill,
        score_band_range_cd: 3,
        uId: "uid-q1",
        skill_desc: "Command of Evidence",
        createDate: 20230101,
        program: "SAT",
        primary_class_cd_desc: "Information and Ideas",
        ibn: "ibn-456",
        external_id: "ext-123",
        primary_class_cd: mockDomain,
        difficulty: "M",
      },
    };

    it("creates nested structure when empty", () => {
      addQuestionStatistic(baseEntry);

      const stats = getPracticeStatistics();
      expect(stats.SAT).toBeDefined();
      expect(stats.SAT!.statistics.INI).toBeDefined();
      expect(stats.SAT!.statistics.INI!.CID).toBeDefined();
      expect(stats.SAT!.statistics.INI!.CID!.q1).toBeDefined();
    });

    it("adds questionId to answeredQuestions array", () => {
      addQuestionStatistic(baseEntry);

      const stats = getPracticeStatistics();
      expect(stats.SAT!.answeredQuestions).toContain("q1");
    });

    it("adds statistic entry with external_id, ibn, plainQuestion", () => {
      addQuestionStatistic(baseEntry);

      const stats = getPracticeStatistics();
      const stat = stats.SAT!.statistics.INI!.CID!.q1!;
      expect(stat.time).toBe(3000);
      expect(stat.answer).toBe("B");
      expect(stat.isCorrect).toBe(true);
      expect(stat.external_id).toBe("ext-123");
      expect(stat.ibn).toBe("ibn-456");
      expect(stat.plainQuestion).toBeDefined();
      expect(stat.plainQuestion!.questionId).toBe("q1");
    });

    it("does not duplicate questionId in answeredQuestions if already present", () => {
      addQuestionStatistic(baseEntry);
      addQuestionStatistic(baseEntry);

      const stats = getPracticeStatistics();
      expect(stats.SAT!.answeredQuestions).toEqual(["q1"]);
    });

    it("saves to localStorage after adding", () => {
      addQuestionStatistic(baseEntry);

      const stored = localStorage.getItem(PRACTICE_STATISTICS_KEY);
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!) as PracticeStatistics;
      expect(parsed.SAT!.statistics.INI!.CID!.q1).toBeDefined();
    });
  });

  describe("addAnsweredQuestion", () => {
    it("creates assessment entry when it does not exist", () => {
      addAnsweredQuestion("SAT" as AssessmentType, "q1", "M", true, 4500);

      const stats = getPracticeStatistics();
      expect(stats.SAT).toBeDefined();
      expect(stats.SAT!.answeredQuestionsDetailed).toHaveLength(1);
    });

    it("adds new entry to answeredQuestionsDetailed", () => {
      addAnsweredQuestion("SAT" as AssessmentType, "q1", "H", false, 3000);

      const stats = getPracticeStatistics();
      expect(stats.SAT!.answeredQuestionsDetailed).toHaveLength(1);
      expect(stats.SAT!.answeredQuestionsDetailed[0].questionId).toBe("q1");
      expect(stats.SAT!.answeredQuestionsDetailed[0].difficulty).toBe("H");
      expect(stats.SAT!.answeredQuestionsDetailed[0].isCorrect).toBe(false);
      expect(stats.SAT!.answeredQuestionsDetailed[0].timeSpent).toBe(3000);
    });

    it("updates existing entry (upsert by questionId)", () => {
      addAnsweredQuestion("SAT" as AssessmentType, "q1", "E", true, 2000);
      addAnsweredQuestion("SAT" as AssessmentType, "q1", "H", false, 5000);

      const stats = getPracticeStatistics();
      expect(stats.SAT!.answeredQuestionsDetailed).toHaveLength(1);
      expect(stats.SAT!.answeredQuestionsDetailed[0].difficulty).toBe("H");
      expect(stats.SAT!.answeredQuestionsDetailed[0].isCorrect).toBe(false);
      expect(stats.SAT!.answeredQuestionsDetailed[0].timeSpent).toBe(5000);
    });

    it("adds questionId to answeredQuestions if not already there", () => {
      addAnsweredQuestion("SAT" as AssessmentType, "q1", "M", true, 4000);

      const stats = getPracticeStatistics();
      expect(stats.SAT!.answeredQuestions).toContain("q1");
    });

    it("saves to localStorage after adding", () => {
      addAnsweredQuestion("SAT" as AssessmentType, "q1", "E", true, 1000);

      const stored = localStorage.getItem(PRACTICE_STATISTICS_KEY);
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!) as PracticeStatistics;
      expect(parsed.SAT!.answeredQuestionsDetailed).toHaveLength(1);
    });
  });

  describe("getQuestionStatistic", () => {
    const mockDomain = "CAS" as DomainItems;
    const mockSkill = "INF" as SkillCd_Variants;

    it("returns null when no statistics exist", () => {
      const result = getQuestionStatistic(
        "SAT" as AssessmentType, mockDomain, mockSkill, "q1"
      );
      expect(result).toBeNull();
    });

    it("returns the statistic when it exists at the correct path", () => {
      const data: PracticeStatistics = {
        SAT: {
          answeredQuestions: ["q1"],
          answeredQuestionsDetailed: [],
          statistics: {
            CAS: {
              INF: {
                q1: { time: 5000, answer: "C", isCorrect: true },
              },
            },
          },
        },
      };
      setLocalStorage(PRACTICE_STATISTICS_KEY, data);

      const result = getQuestionStatistic(
        "SAT" as AssessmentType, mockDomain, mockSkill, "q1"
      );
      expect(result).toEqual({ time: 5000, answer: "C", isCorrect: true });
    });
  });

  describe("getSkillSummary", () => {
    const mockDomain = "INI" as DomainItems;
    const mockSkill = "CID" as SkillCd_Variants;

    it("returns null when no statistics exist", () => {
      const result = getSkillSummary(
        "SAT" as AssessmentType, mockDomain, mockSkill
      );
      expect(result).toBeNull();
    });

    it("returns null when skill has no questions", () => {
      setLocalStorage(PRACTICE_STATISTICS_KEY, {
        SAT: {
          answeredQuestions: [],
          answeredQuestionsDetailed: [],
          statistics: {
            INI: {
              CID: {},
            },
          },
        },
      });

      const result = getSkillSummary(
        "SAT" as AssessmentType, mockDomain, mockSkill
      );
      expect(result).toBeNull();
    });

    it("returns correct summary with totalQuestions, correctAnswers, averageTime, accuracy", () => {
      setLocalStorage(PRACTICE_STATISTICS_KEY, {
        SAT: {
          answeredQuestions: [],
          answeredQuestionsDetailed: [],
          statistics: {
            INI: {
              CID: {
                q1: { time: 2000, answer: "A", isCorrect: true },
                q2: { time: 4000, answer: "B", isCorrect: false },
                q3: { time: 6000, answer: "C", isCorrect: true },
              },
            },
          },
        },
      });

      const result = getSkillSummary(
        "SAT" as AssessmentType, mockDomain, mockSkill
      );
      expect(result).not.toBeNull();
      expect(result!.skillCd).toBe(mockSkill);
      expect(result!.totalQuestions).toBe(3);
      expect(result!.correctAnswers).toBe(2);
      expect(result!.averageTime).toBe(4000); // (2000 + 4000 + 6000) / 3
      expect(result!.accuracy).toBeCloseTo(66.67, 1);
    });
  });

  describe("getDomainSummary", () => {
    const mockDomain = "INI" as DomainItems;
    const mockSkill1 = "CID" as SkillCd_Variants;
    const mockSkill2 = "INF" as SkillCd_Variants;

    it("returns null when no statistics exist", () => {
      const result = getDomainSummary(
        "SAT" as AssessmentType, mockDomain
      );
      expect(result).toBeNull();
    });

    it("aggregates skill summaries correctly", () => {
      setLocalStorage(PRACTICE_STATISTICS_KEY, {
        SAT: {
          answeredQuestions: [],
          answeredQuestionsDetailed: [],
          statistics: {
            INI: {
              CID: {
                q1: { time: 2000, answer: "A", isCorrect: true },
              },
              INF: {
                q2: { time: 4000, answer: "B", isCorrect: false },
                q3: { time: 6000, answer: "C", isCorrect: true },
              },
            },
          },
        },
      });

      const result = getDomainSummary(
        "SAT" as AssessmentType, mockDomain
      );
      expect(result).not.toBeNull();
      expect(result!.primaryClassCd).toBe(mockDomain);
      expect(result!.totalQuestions).toBe(3);
      expect(result!.correctAnswers).toBe(2);
      expect(result!.skills).toHaveLength(2);
      expect(result!.accuracy).toBeCloseTo(66.67, 1);
    });
  });

  describe("getAssessmentSummary", () => {
    it("returns null when no statistics exist", () => {
      const result = getAssessmentSummary("SAT" as AssessmentType);
      expect(result).toBeNull();
    });

    it("aggregates domain summaries correctly", () => {
      setLocalStorage(PRACTICE_STATISTICS_KEY, {
        SAT: {
          answeredQuestions: [],
          answeredQuestionsDetailed: [],
          statistics: {
            INI: {
              CID: {
                q1: { time: 2000, answer: "A", isCorrect: true },
              },
            },
            CAS: {
              INF: {
                q2: { time: 4000, answer: "B", isCorrect: false },
              },
            },
          },
        },
      });

      const result = getAssessmentSummary("SAT" as AssessmentType);
      expect(result).not.toBeNull();
      expect(result!.assessment).toBe("SAT");
      expect(result!.totalQuestions).toBe(2);
      expect(result!.correctAnswers).toBe(1);
      expect(result!.domains).toHaveLength(2);
      expect(result!.accuracy).toBe(50);
    });
  });

  describe("clearAssessmentStatistics", () => {
    it("removes the specified assessment key from statistics", () => {
      setLocalStorage(PRACTICE_STATISTICS_KEY, {
        SAT: {
          answeredQuestions: ["q1"],
          answeredQuestionsDetailed: [],
          statistics: {},
        },
        "PSAT/NMSQT": {
          answeredQuestions: [],
          answeredQuestionsDetailed: [],
          statistics: {},
        },
      });

      clearAssessmentStatistics("SAT" as AssessmentType);

      const stats = getPracticeStatistics();
      expect(stats.SAT).toBeUndefined();
    });

    it("does not affect other assessments", () => {
      setLocalStorage(PRACTICE_STATISTICS_KEY, {
        SAT: {
          answeredQuestions: ["q1"],
          answeredQuestionsDetailed: [],
          statistics: {},
        },
        "PSAT/NMSQT": {
          answeredQuestions: [],
          answeredQuestionsDetailed: [],
          statistics: {},
        },
      });

      clearAssessmentStatistics("SAT" as AssessmentType);

      const stats = getPracticeStatistics();
      expect(stats["PSAT/NMSQT"]).toBeDefined();
    });
  });

  describe("clearAllStatistics", () => {
    it("removes the legacy practiceRushStatistics key only (NOT the new key)", () => {
      setLocalStorage(PRACTICE_STATISTICS_KEY, {
        SAT: { answeredQuestions: [], answeredQuestionsDetailed: [], statistics: {} },
      });
      setLocalStorage(LEGACY_PRACTICE_RUSH_STATISTICS_KEY, {
        SAT: { answeredQuestions: [], statistics: {} },
      });

      clearAllStatistics();

      expect(localStorage.getItem(PRACTICE_STATISTICS_KEY)).not.toBeNull();
      expect(localStorage.getItem(LEGACY_PRACTICE_RUSH_STATISTICS_KEY)).toBeNull();
    });
  });

  describe("exportStatistics", () => {
    it("returns JSON string of current statistics", () => {
      const data: PracticeStatistics = {
        SAT: {
          answeredQuestions: ["q1"],
          answeredQuestionsDetailed: [],
          statistics: {},
        },
      };
      setLocalStorage(PRACTICE_STATISTICS_KEY, data);

      const json = exportStatistics();
      const parsed = JSON.parse(json);
      expect(parsed).toEqual(data);
    });
  });

  describe("importStatistics", () => {
    it("returns true and saves data on valid JSON", () => {
      const data: PracticeStatistics = {
        SAT: {
          answeredQuestions: [],
          answeredQuestionsDetailed: [],
          statistics: {},
        },
      };
      const result = importStatistics(JSON.stringify(data));
      expect(result).toBe(true);

      const stored = getLocalStorage(PRACTICE_STATISTICS_KEY);
      expect(stored).toEqual(data);
    });

    it("returns false on invalid JSON", () => {
      const result = importStatistics("not-valid-json");
      expect(result).toBe(false);
    });
  });

  describe("updateSessionXP", () => {
    const PRACTICE_HISTORY_KEY = "practiceHistory";

    it("updates totalXPReceived on matching session in practiceHistory", () => {
      const sessions = [
        { sessionId: "sess-1", totalQuestions: 5, totalXPReceived: 50 },
        { sessionId: "sess-2", totalQuestions: 3, totalXPReceived: 30 },
      ];
      setLocalStorage(PRACTICE_HISTORY_KEY, sessions);

      updateSessionXP("sess-1", 25);

      const stored = getLocalStorage(PRACTICE_HISTORY_KEY) as Array<Record<string, unknown>>;
      expect(stored[0].totalXPReceived).toBe(75);
      expect(stored[1].totalXPReceived).toBe(30);
    });

    it("does nothing if session not found", () => {
      const sessions = [
        { sessionId: "sess-1", totalXPReceived: 50 },
      ];
      setLocalStorage(PRACTICE_HISTORY_KEY, sessions);

      updateSessionXP("sess-nonexistent", 100);

      const stored = getLocalStorage(PRACTICE_HISTORY_KEY) as Array<Record<string, unknown>>;
      expect(stored[0].totalXPReceived).toBe(50);
    });
  });
});
