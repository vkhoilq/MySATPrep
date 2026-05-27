import { describe, it, expect } from "vitest";
import { questionResultsReducer } from "@/lib/questionbank/reducer";
import type {
  QuestionResultsState,
  QuestionResultsAction,
  QuestionWithData,
  BluebookExternalIds,
} from "@/lib/questionbank/types";
import type { QuestionDifficulty } from "@/types/question";
import { INITIAL_VISIBLE_COUNT } from "@/lib/questionbank/constants";

const createInitialState = (): QuestionResultsState => ({
  questionsWithData: [],
  isInitialized: false,
  fetchedQuestionIds: new Set(),
  visibleCount: INITIAL_VISIBLE_COUNT,
  isLoadingMore: false,
  selectedDifficulties: [],
  selectedSkills: [],
  excludeBluebookQuestions: false,
  onlyBluebookQuestions: false,
  sortOrder: "default",
  dateRange: null,
  answerStatus: "all",
  hasMoreQuestions: false,
});

const createMockQuestion = (id: string): QuestionWithData => ({
  questionId: id,
  timestamp: "2024-01-01T00:00:00Z",
  updateDate: 1704067200000,
  pPcc: "pPcc",
  skill_cd: "CID" as const,
  score_band_range_cd: 1,
  uId: "uId",
  skill_desc: "Skill Description",
  createDate: 1704067200000,
  program: "SAT",
  primary_class_cd_desc: "Class Description",
  ibn: null,
  external_id: null,
  primary_class_cd: "INI" as const,
  difficulty: "M",
  questionData: undefined,
  isLoading: false,
  hasError: false,
  errorMessage: undefined,
});

describe("questionResultsReducer", () => {
  describe("INITIALIZE_QUESTIONS", () => {
    it("should set questions, mark as initialized, reset visibleCount, and stop loading", () => {
      const state = createInitialState();
      const mockQuestions = [createMockQuestion("q1"), createMockQuestion("q2")];

      const next = questionResultsReducer(state, {
        type: "INITIALIZE_QUESTIONS",
        payload: mockQuestions,
      });

      expect(next.questionsWithData).toEqual(mockQuestions);
      expect(next.isInitialized).toBe(true);
      expect(next.visibleCount).toBe(INITIAL_VISIBLE_COUNT);
      expect(next.isLoadingMore).toBe(false);
    });
  });

  describe("SET_QUESTION_LOADING", () => {
    it("should set isLoading=true and hasError=false for the targeted index only", () => {
      const state: QuestionResultsState = {
        ...createInitialState(),
        questionsWithData: [
          createMockQuestion("q1"),
          createMockQuestion("q2"),
          createMockQuestion("q3"),
        ],
      };

      const next = questionResultsReducer(state, {
        type: "SET_QUESTION_LOADING",
        payload: { index: 1, questionId: "q2" },
      });

      // Index 1 should be loading
      expect(next.questionsWithData[1].isLoading).toBe(true);
      expect(next.questionsWithData[1].hasError).toBe(false);
      expect(next.questionsWithData[1].errorMessage).toBeUndefined();

      // Other indices should remain unchanged
      expect(next.questionsWithData[0].isLoading).toBe(false);
      expect(next.questionsWithData[0].hasError).toBe(false);
      expect(next.questionsWithData[2].isLoading).toBe(false);
      expect(next.questionsWithData[2].hasError).toBe(false);
    });
  });

  describe("SET_QUESTION_SUCCESS", () => {
    it("should set questionData, isLoading=false, hasError=false for the targeted index only", () => {
      const state: QuestionResultsState = {
        ...createInitialState(),
        questionsWithData: [
          { ...createMockQuestion("q1"), isLoading: true },
          { ...createMockQuestion("q2"), isLoading: true },
          { ...createMockQuestion("q3"), isLoading: true },
        ],
      };

      const questionData = { problem: {} as any, question: {} as any };

      const next = questionResultsReducer(state, {
        type: "SET_QUESTION_SUCCESS",
        payload: { index: 0, questionData },
      });

      // Index 0 should have the data
      expect(next.questionsWithData[0].questionData).toBe(questionData);
      expect(next.questionsWithData[0].isLoading).toBe(false);
      expect(next.questionsWithData[0].hasError).toBe(false);

      // Other indices should remain unchanged
      expect(next.questionsWithData[1].questionData).toBeUndefined();
      expect(next.questionsWithData[1].isLoading).toBe(true);
      expect(next.questionsWithData[2].isLoading).toBe(true);
    });
  });

  describe("SET_QUESTION_ERROR", () => {
    it("should set isLoading=false, hasError=true, errorMessage for the targeted index only", () => {
      const state: QuestionResultsState = {
        ...createInitialState(),
        questionsWithData: [
          { ...createMockQuestion("q1"), isLoading: true },
          { ...createMockQuestion("q2"), isLoading: true },
          { ...createMockQuestion("q3"), isLoading: true },
        ],
      };

      const next = questionResultsReducer(state, {
        type: "SET_QUESTION_ERROR",
        payload: { index: 2, errorMessage: "Fetch failed" },
      });

      // Index 2 should have the error
      expect(next.questionsWithData[2].isLoading).toBe(false);
      expect(next.questionsWithData[2].hasError).toBe(true);
      expect(next.questionsWithData[2].errorMessage).toBe("Fetch failed");

      // Other indices should remain unchanged
      expect(next.questionsWithData[0].isLoading).toBe(true);
      expect(next.questionsWithData[0].hasError).toBeFalsy();
      expect(next.questionsWithData[1].isLoading).toBe(true);
      expect(next.questionsWithData[1].hasError).toBeFalsy();
    });
  });

  describe("ADD_FETCHED_ID", () => {
    it("should add the ID to fetchedQuestionIds set", () => {
      const state = createInitialState();

      const next = questionResultsReducer(state, {
        type: "ADD_FETCHED_ID",
        payload: "abc-123",
      });

      expect(next.fetchedQuestionIds.has("abc-123")).toBe(true);
      expect(next.fetchedQuestionIds.size).toBe(1);
    });

    it("should preserve existing IDs when adding a new one", () => {
      const state: QuestionResultsState = {
        ...createInitialState(),
        fetchedQuestionIds: new Set(["existing-id"]),
      };

      const next = questionResultsReducer(state, {
        type: "ADD_FETCHED_ID",
        payload: "new-id",
      });

      expect(next.fetchedQuestionIds.has("existing-id")).toBe(true);
      expect(next.fetchedQuestionIds.has("new-id")).toBe(true);
      expect(next.fetchedQuestionIds.size).toBe(2);
    });
  });

  describe("REMOVE_FETCHED_ID", () => {
    it("should remove the ID from fetchedQuestionIds set", () => {
      const state: QuestionResultsState = {
        ...createInitialState(),
        fetchedQuestionIds: new Set(["abc-123", "def-456"]),
      };

      const next = questionResultsReducer(state, {
        type: "REMOVE_FETCHED_ID",
        payload: "abc-123",
      });

      expect(next.fetchedQuestionIds.has("abc-123")).toBe(false);
      expect(next.fetchedQuestionIds.has("def-456")).toBe(true);
      expect(next.fetchedQuestionIds.size).toBe(1);
    });

    it("should not throw when removing a non-existent ID", () => {
      const state: QuestionResultsState = {
        ...createInitialState(),
        fetchedQuestionIds: new Set(["abc-123"]),
      };

      const next = questionResultsReducer(state, {
        type: "REMOVE_FETCHED_ID",
        payload: "non-existent",
      });

      expect(next.fetchedQuestionIds.has("abc-123")).toBe(true);
      expect(next.fetchedQuestionIds.size).toBe(1);
    });
  });

  describe("RESET_FETCHED_IDS", () => {
    it("should clear fetchedQuestionIds to an empty set", () => {
      const state: QuestionResultsState = {
        ...createInitialState(),
        fetchedQuestionIds: new Set(["abc-123", "def-456"]),
      };

      const next = questionResultsReducer(state, {
        type: "RESET_FETCHED_IDS",
      });

      expect(next.fetchedQuestionIds.size).toBe(0);
    });
  });

  describe("INCREASE_VISIBLE_COUNT", () => {
    it("should increase visibleCount by the payload amount", () => {
      const state = {
        ...createInitialState(),
        visibleCount: 10,
      };

      const next = questionResultsReducer(state, {
        type: "INCREASE_VISIBLE_COUNT",
        payload: 5,
      });

      expect(next.visibleCount).toBe(15);
    });
  });

  describe("SET_LOADING_MORE", () => {
    it("should set isLoadingMore to true", () => {
      const state = createInitialState();

      const next = questionResultsReducer(state, {
        type: "SET_LOADING_MORE",
        payload: true,
      });

      expect(next.isLoadingMore).toBe(true);
    });

    it("should set isLoadingMore to false", () => {
      const state: QuestionResultsState = {
        ...createInitialState(),
        isLoadingMore: true,
      };

      const next = questionResultsReducer(state, {
        type: "SET_LOADING_MORE",
        payload: false,
      });

      expect(next.isLoadingMore).toBe(false);
    });
  });

  describe("SET_DIFFICULTY_FILTER", () => {
    it("should set selectedDifficulties, reset visibleCount and isLoadingMore", () => {
      const state = {
        ...createInitialState(),
        visibleCount: 30,
        isLoadingMore: true,
      };

      const next = questionResultsReducer(state, {
        type: "SET_DIFFICULTY_FILTER",
        payload: ["E", "H"],
      });

      expect(next.selectedDifficulties).toEqual(["E", "H"]);
      expect(next.visibleCount).toBe(INITIAL_VISIBLE_COUNT);
      expect(next.isLoadingMore).toBe(false);
    });
  });

  describe("RESET_DIFFICULTY_FILTER", () => {
    it("should clear selectedDifficulties, reset visibleCount and isLoadingMore", () => {
      const state = {
        ...createInitialState(),
        selectedDifficulties: ["E", "M"] as QuestionDifficulty[],
        visibleCount: 30,
        isLoadingMore: true,
      };

      const next = questionResultsReducer(state, {
        type: "RESET_DIFFICULTY_FILTER",
      });

      expect(next.selectedDifficulties).toEqual([]);
      expect(next.visibleCount).toBe(INITIAL_VISIBLE_COUNT);
      expect(next.isLoadingMore).toBe(false);
    });
  });

  describe("SET_SKILL_FILTER", () => {
    it("should set selectedSkills, reset visibleCount and isLoadingMore", () => {
      const state = {
        ...createInitialState(),
        visibleCount: 30,
        isLoadingMore: true,
      };

      const next = questionResultsReducer(state, {
        type: "SET_SKILL_FILTER",
        payload: ["CID", "INF"],
      });

      expect(next.selectedSkills).toEqual(["CID", "INF"]);
      expect(next.visibleCount).toBe(INITIAL_VISIBLE_COUNT);
      expect(next.isLoadingMore).toBe(false);
    });
  });

  describe("RESET_SKILL_FILTER", () => {
    it("should clear selectedSkills, reset visibleCount and isLoadingMore", () => {
      const state = {
        ...createInitialState(),
        selectedSkills: ["CID", "INF"],
        visibleCount: 30,
        isLoadingMore: true,
      };

      const next = questionResultsReducer(state, {
        type: "RESET_SKILL_FILTER",
      });

      expect(next.selectedSkills).toEqual([]);
      expect(next.visibleCount).toBe(INITIAL_VISIBLE_COUNT);
      expect(next.isLoadingMore).toBe(false);
    });
  });

  describe("TOGGLE_EXCLUDE_BLUEBOOK", () => {
    it("should set excludeBluebookQuestions to true and turn off onlyBluebookQuestions", () => {
      const state = {
        ...createInitialState(),
        onlyBluebookQuestions: true,
      };

      const next = questionResultsReducer(state, {
        type: "TOGGLE_EXCLUDE_BLUEBOOK",
        payload: true,
      });

      expect(next.excludeBluebookQuestions).toBe(true);
      expect(next.onlyBluebookQuestions).toBe(false);
    });

    it("should set excludeBluebookQuestions to false and leave onlyBluebookQuestions unchanged", () => {
      const state = {
        ...createInitialState(),
        onlyBluebookQuestions: false,
      };

      const next = questionResultsReducer(state, {
        type: "TOGGLE_EXCLUDE_BLUEBOOK",
        payload: false,
      });

      expect(next.excludeBluebookQuestions).toBe(false);
      expect(next.onlyBluebookQuestions).toBe(false);
    });
  });

  describe("TOGGLE_ONLY_BLUEBOOK", () => {
    it("should set onlyBluebookQuestions to true and turn off excludeBluebookQuestions", () => {
      const state = {
        ...createInitialState(),
        excludeBluebookQuestions: true,
      };

      const next = questionResultsReducer(state, {
        type: "TOGGLE_ONLY_BLUEBOOK",
        payload: true,
      });

      expect(next.onlyBluebookQuestions).toBe(true);
      expect(next.excludeBluebookQuestions).toBe(false);
    });

    it("should set onlyBluebookQuestions to false and leave excludeBluebookQuestions unchanged", () => {
      const state = {
        ...createInitialState(),
        excludeBluebookQuestions: false,
      };

      const next = questionResultsReducer(state, {
        type: "TOGGLE_ONLY_BLUEBOOK",
        payload: false,
      });

      expect(next.onlyBluebookQuestions).toBe(false);
      expect(next.excludeBluebookQuestions).toBe(false);
    });
  });

  describe("SET_SORT_ORDER", () => {
    it("should set sortOrder and reset visibleCount", () => {
      const state = {
        ...createInitialState(),
        visibleCount: 30,
      };

      const next = questionResultsReducer(state, {
        type: "SET_SORT_ORDER",
        payload: "newest",
      });

      expect(next.sortOrder).toBe("newest");
      expect(next.visibleCount).toBe(INITIAL_VISIBLE_COUNT);
    });

    it("should accept all valid sort orders", () => {
      const state = createInitialState();

      const nextDefault = questionResultsReducer(state, {
        type: "SET_SORT_ORDER",
        payload: "default",
      });
      expect(nextDefault.sortOrder).toBe("default");

      const nextNewest = questionResultsReducer(
        { ...state, sortOrder: "default", visibleCount: 20 },
        { type: "SET_SORT_ORDER", payload: "newest" }
      );
      expect(nextNewest.sortOrder).toBe("newest");

      const nextOldest = questionResultsReducer(
        { ...state, sortOrder: "default", visibleCount: 20 },
        { type: "SET_SORT_ORDER", payload: "oldest" }
      );
      expect(nextOldest.sortOrder).toBe("oldest");
    });
  });

  describe("SET_DATE_RANGE", () => {
    it("should set dateRange and reset visibleCount", () => {
      const state = {
        ...createInitialState(),
        visibleCount: 30,
      };
      const range = { start: new Date("2024-01-01"), end: new Date("2024-12-31") };

      const next = questionResultsReducer(state, {
        type: "SET_DATE_RANGE",
        payload: range,
      });

      expect(next.dateRange).toEqual(range);
      expect(next.visibleCount).toBe(INITIAL_VISIBLE_COUNT);
    });

    it("should accept null dateRange", () => {
      const state = {
        ...createInitialState(),
        visibleCount: 30,
      };

      const next = questionResultsReducer(state, {
        type: "SET_DATE_RANGE",
        payload: null,
      });

      expect(next.dateRange).toBeNull();
      expect(next.visibleCount).toBe(INITIAL_VISIBLE_COUNT);
    });
  });

  describe("SET_ANSWER_STATUS", () => {
    it("should set answerStatus and reset visibleCount", () => {
      const state = {
        ...createInitialState(),
        visibleCount: 30,
      };

      const next = questionResultsReducer(state, {
        type: "SET_ANSWER_STATUS",
        payload: "answered",
      });

      expect(next.answerStatus).toBe("answered");
      expect(next.visibleCount).toBe(INITIAL_VISIBLE_COUNT);
    });

    it("should accept all valid answer statuses", () => {
      const state = createInitialState();

      const nextAll = questionResultsReducer(state, {
        type: "SET_ANSWER_STATUS",
        payload: "all",
      });
      expect(nextAll.answerStatus).toBe("all");

      const nextAnswered = questionResultsReducer(
        { ...state, visibleCount: 20 },
        { type: "SET_ANSWER_STATUS", payload: "answered" }
      );
      expect(nextAnswered.answerStatus).toBe("answered");

      const nextNotAnswered = questionResultsReducer(
        { ...state, visibleCount: 20 },
        { type: "SET_ANSWER_STATUS", payload: "not-answered" }
      );
      expect(nextNotAnswered.answerStatus).toBe("not-answered");
    });
  });

  describe("default / unknown action", () => {
    it("should return state unchanged for unknown action types", () => {
      const state = createInitialState();

      const next = questionResultsReducer(state, {
        type: "UNKNOWN_ACTION" as any,
      } as QuestionResultsAction);

      expect(next).toEqual(state);
      // Ensure it's the same reference
      expect(next).toBe(state);
    });
  });
});
