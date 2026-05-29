"use client";

import { useEffect, useReducer, useState, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, Flag, Play, RotateCcw } from "lucide-react";
import { MathJaxContext } from "better-react-mathjax";

import { PracticeSelections, PracticeSession } from "@/types/session";
import { API_Response_Question, QuestionDifficulty } from "@/types/question";
import { FullLengthSection, FullLengthTestConfig, FullLengthTestResult } from "@/types/full-length";
import {
  getModuleKey,
  FullLengthTestPhase,
  saveFullLengthSession,
  loadFullLengthSession,
  clearFullLengthSession,
} from "@/types/full-length-session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

import {
  createInitialFullLengthState,
  fullLengthReducer,
  getCurrentSection,
  getCurrentModuleState,
} from "@/lib/full-length/fullLengthReducer";
import { TestQuestionSelection } from "@/lib/full-length/questionSelector";
import { calculateModuleResult, calculateSectionResult, calculateTestResult } from "@/lib/full-length/scoring";
import { SectionTimer } from "./SectionTimer";
import { QuestionNavigator } from "./QuestionNavigator";
import { TestResultsScreen } from "./TestResultsScreen";
import { QuestionCard } from "./QuestionCard";

interface FullLengthTestProps {
  /** The user's practice selections (assessment type, subject, etc.). */
  practiceSelections: PracticeSelections;
  /** Callback fired when the full-length test session is complete. */
  onSessionComplete: (
    sessionData: PracticeSession,
    correctAnswers: Record<string, string[]>
  ) => void;
}

/**
 * Label and description for each test phase (used in section-intro).
 */
const SECTION_LABELS: Record<FullLengthSection, { name: string; description: string }> = {
  "reading-writing": {
    name: "Reading & Writing",
    description: "64 minutes · 2 modules · 54 questions",
  },
  math: {
    name: "Math",
    description: "70 minutes · 2 modules · 44 questions",
  },
};

/**
 * Module time limits in milliseconds.
 */
const MODULE_TIME_LIMITS: Record<string, number> = {
  "reading-writing-1": 32 * 60 * 1000,
  "reading-writing-2": 32 * 60 * 1000,
  "math-1": 35 * 60 * 1000,
  "math-2": 35 * 60 * 1000,
};

/**
 * Main orchestrator component that manages the entire full-length test flow.
 *
 * Uses `useReducer` with `fullLengthReducer` and dispatches actions to
 * transition between phases: intro → section-intro → module-active →
 * module-review → module-complete → break → test-complete.
 */
export function FullLengthTest({
  practiceSelections,
  onSessionComplete,
}: FullLengthTestProps) {
  console.log("[FullLengthTest] Rendering with practiceType:", practiceSelections.practiceType, "assessment:", practiceSelections.assessment);
  const [state, dispatch] = useReducer(
    fullLengthReducer,
    undefined,
    createInitialFullLengthState
  );

  // ── Local UI state ──────────────────────────────────────────────────────────
  const [isTimerVisible, setIsTimerVisible] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track if questions have been fetched for the current section
  const questionsFetched = useRef<Record<string, boolean>>({});

  // ── Question detail cache ──────────────────────────────────────────────────
  // Maps questionId → full question data (stem, options, correct answer, etc.)
  const [questionDetails, setQuestionDetails] = useState<Record<string, API_Response_Question>>({});
  // Track which question IDs are currently being fetched to avoid duplicates
  const fetchingQuestionIds = useRef<Set<string>>(new Set());

  // ── Phase handlers ─────────────────────────────────────────────────────────

  /** Build the test config from practice selections. */
  const buildTestConfig = useCallback((): FullLengthTestConfig => {
    return {
      assessment: practiceSelections.assessment as any,
      includeBreak: true,
      showTimer: true,
      allowPause: false,
    };
  }, [practiceSelections.assessment]);

  /** Kick off the test from the intro screen — fetch questions first, then transition. */
  const handleStartTest = useCallback(async () => {
    setError(null);
    setQuestionsLoading(true);

    console.log("[FullLengthTest] handleStartTest called", {
      assessment: practiceSelections.assessment,
      practiceType: practiceSelections.practiceType,
    });

    try {
      // Fetch questions for the entire test
      const response = await fetch("/api/full-length/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessment: practiceSelections.assessment,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to load questions (${response.status})`
        );
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to load questions");
      }

      const selection: TestQuestionSelection = result.data;

      if (selection.totalQuestions === 0) {
        setError("No questions available for this test. Please try again later.");
        setQuestionsLoading(false);
        return;
      }

      // Extract question slots and pretest slots from the selection
      const questionSlots: Record<string, string[]> = {};
      const pretestSlots: Record<string, string[]> = {};

      for (const [moduleKey, moduleSelection] of Object.entries(
        selection.modules
      )) {
        questionSlots[moduleKey] = moduleSelection.questionIds;
        pretestSlots[moduleKey] = moduleSelection.pretestQuestionIds;
      }

      // Initialize the test session
      const config = buildTestConfig();
      dispatch({
        type: "START_TEST",
        payload: { config, assessment: practiceSelections.assessment },
      });

      // Store question slots in state
      dispatch({
        type: "SET_QUESTION_SLOTS",
        payload: { questionSlots, pretestSlots },
      });

      // Mark both sections as fetched
      questionsFetched.current["reading-writing"] = true;
      questionsFetched.current["math"] = true;

      // Transition to section-intro
      dispatch({ type: "SET_PHASE", payload: "section-intro" });
    } catch (err) {
      setError(
        `Failed to load questions: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    } finally {
      setQuestionsLoading(false);
    }
  }, [buildTestConfig, practiceSelections.assessment]);

  /** Fetch questions for the current section and start the module. */
  const handleStartSection = useCallback(
    async (sectionIndex: number) => {
      setError(null);
      const section: FullLengthSection =
        sectionIndex === 0 ? "reading-writing" : "math";
      const moduleKey = getModuleKey(section, 1);

      // Only fetch if we haven't already fetched for this section
      if (!questionsFetched.current[section]) {
        setQuestionsLoading(true);
        try {
          // Call the server-side API to fetch and select questions
          const response = await fetch("/api/full-length/questions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              assessment: practiceSelections.assessment,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
              errorData.error || `Failed to load questions (${response.status})`
            );
          }

          const result = await response.json();

          if (!result.success || !result.data) {
            throw new Error(result.error || "Failed to load questions");
          }

          const selection: TestQuestionSelection = result.data;

          if (selection.totalQuestions === 0) {
            setError("No questions available for this test.");
            setQuestionsLoading(false);
            return;
          }

          // Extract question slots and pretest slots from the selection
          const questionSlots: Record<string, string[]> = {};
          const pretestSlots: Record<string, string[]> = {};

          for (const [moduleKey, moduleSelection] of Object.entries(
            selection.modules
          )) {
            questionSlots[moduleKey] = moduleSelection.questionIds;
            pretestSlots[moduleKey] = moduleSelection.pretestQuestionIds;
          }

          // Dispatch question slots into state so START_MODULE can read them
          dispatch({
            type: "SET_QUESTION_SLOTS",
            payload: { questionSlots, pretestSlots },
          });

          // The API returns questions for ALL modules, so mark both sections as fetched
          questionsFetched.current["reading-writing"] = true;
          questionsFetched.current["math"] = true;
        } catch (err) {
          setError(
            `Failed to load ${section} questions: ${
              err instanceof Error ? err.message : "Unknown error"
            }`
          );
          setQuestionsLoading(false);
          return;
        }
        setQuestionsLoading(false);
      }

      // Start the module
      const timeLimit = MODULE_TIME_LIMITS[moduleKey] || 32 * 60 * 1000;
      dispatch({
        type: "START_MODULE",
        payload: { section, moduleNumber: 1, timeRemainingMs: timeLimit },
      });
    },
    [practiceSelections.assessment]
  );

  /** Proceed from section-intro to module-active. */
  const handleProceedToModule = useCallback(() => {
    const section = getCurrentSection(state);
    const moduleKey = getModuleKey(section, state.currentModuleNumber);
    const timeLimit = MODULE_TIME_LIMITS[moduleKey] || 32 * 60 * 1000;
    dispatch({
      type: "START_MODULE",
      payload: {
        section,
        moduleNumber: state.currentModuleNumber,
        timeRemainingMs: timeLimit,
      },
    });
  }, [state]);

  /** Navigate to a specific question. */
  const handleNavigateQuestion = useCallback(
    (index: number) => {
      dispatch({ type: "NAVIGATE_QUESTION", payload: { questionIndex: index } });
    },
    []
  );

  /** Toggle flag for the current question. */
  const handleToggleFlag = useCallback(() => {
    const moduleState = getCurrentModuleState(state);
    if (!moduleState) return;
    const questionId =
      moduleState.questionOrder[state.currentQuestionIndex];
    if (!questionId) return;
    dispatch({
      type: "TOGGLE_FLAG_FOR_REVIEW",
      payload: { questionId },
    });
  }, [state]);

  /** Go to the next question. */
  const handleNextQuestion = useCallback(() => {
    const moduleState = getCurrentModuleState(state);
    if (!moduleState) return;
    const nextIndex = Math.min(
      state.currentQuestionIndex + 1,
      moduleState.questionOrder.length - 1
    );
    dispatch({ type: "NAVIGATE_QUESTION", payload: { questionIndex: nextIndex } });
  }, [state]);

  /** Go to the previous question. */
  const handlePrevQuestion = useCallback(() => {
    const prevIndex = Math.max(0, state.currentQuestionIndex - 1);
    dispatch({ type: "NAVIGATE_QUESTION", payload: { questionIndex: prevIndex } });
  }, [state]);

  /** Submit the current module and advance. */
  const handleCompleteModule = useCallback(() => {
    const section = getCurrentSection(state);
    dispatch({
      type: "COMPLETE_MODULE",
      payload: { section, moduleNumber: state.currentModuleNumber },
    });
  }, [state]);

  /** Review flagged questions before submitting module. */
  const handleReviewFlagged = useCallback(() => {
    dispatch({ type: "SET_PHASE", payload: "module-review" });
  }, []);

  /** Return to active module from review. */
  const handleReturnFromReview = useCallback(() => {
    dispatch({ type: "SET_PHASE", payload: "module-active" });
  }, []);

  /** Continue after module-complete: next module, break, or finish. */
  const handleContinue = useCallback(() => {
    const section = getCurrentSection(state);

    if (state.currentModuleNumber === 1) {
      // Move to Module 2
      const moduleKey = getModuleKey(section, 2);
      const timeLimit = MODULE_TIME_LIMITS[moduleKey] || 32 * 60 * 1000;
      dispatch({
        type: "START_MODULE",
        payload: { section, moduleNumber: 2, timeRemainingMs: timeLimit },
      });
    } else {
      // Module 2 is done — section is complete
      if (state.currentSectionIndex === 0) {
        // R&W done → break → Math
        if (state.config.includeBreak) {
          dispatch({ type: "START_BREAK" });
        } else {
          dispatch({ type: "START_SECTION", payload: { sectionIndex: 1 } });
        }
      } else {
        // Math done → test complete
        handleCompleteTest();
      }
    }
  }, [state]);

  /** Complete the break early. */
  const handleCompleteBreak = useCallback(() => {
    dispatch({ type: "COMPLETE_BREAK" });
  }, []);

  /** Go back to dashboard. */
  const handleBackToDashboard = useCallback(() => {
    if (state.testResult) {
      // Build a minimal PracticeSession for the parent to record
      const session: PracticeSession = {
        sessionId: state.sessionId,
        timestamp: state.createdAt,
        status: "completed" as any,
        practiceSelections: {
          practiceType: "full-length",
          assessment: state.assessment,
          subject: "",
          domains: [],
          skills: [],
          difficulties: [],
          randomize: true,
          excludeBluebook: true,
        },
        currentQuestionStep: 0,
        questionAnswers: {},
        questionTimes: {},
        answeredQuestionDetails: [],
        totalQuestions: Object.values(state.moduleStates).reduce(
          (sum, m) => sum + m.questionOrder.length,
          0
        ),
        answeredQuestions: [],
        averageTimePerQuestion: 0,
        totalTimeSpent: state.totalTimeSpentMs,
      };
      const correctAnswers: Record<string, string[]> = {};
      for (const [id, detail] of Object.entries(questionDetails)) {
        if (detail.correct_answer) {
          correctAnswers[id] = detail.correct_answer;
        }
      }
      onSessionComplete(session, correctAnswers);
    }
  }, [state, questionDetails, onSessionComplete]);

  /** Review questions from the results screen (placeholder). */
  const handleReviewQuestions = useCallback(() => {
    // In a real implementation this would navigate to a review view
    dispatch({ type: "SET_PHASE", payload: "module-review" });
  }, []);

  // ── Current module state helpers ──────────────────────────────────────────
  const currentModuleState = getCurrentModuleState(state);
  const currentSection = getCurrentSection(state);
  const currentModuleKey = getModuleKey(currentSection, state.currentModuleNumber);
  const currentTimeLimit = MODULE_TIME_LIMITS[currentModuleKey] || 32 * 60 * 1000;

  // ── Question detail fetching ──────────────────────────────────────────────

  /** Fetch full question data for a single question ID. */
  const fetchQuestionDetail = useCallback(async (questionId: string) => {
    if (questionDetails[questionId] || fetchingQuestionIds.current.has(questionId)) {
      return;
    }
    fetchingQuestionIds.current.add(questionId);
    try {
      const response = await fetch(`/api/question/${questionId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setQuestionDetails((prev) => ({
            ...prev,
            [questionId]: result.data,
          }));
        }
      }
    } catch (err) {
      console.error(`Failed to fetch question ${questionId}:`, err);
    } finally {
      fetchingQuestionIds.current.delete(questionId);
    }
  }, [questionDetails]);

  /** Fetch question details for the current question when it changes. */
  const currentQuestionId = currentModuleState?.questionOrder[state.currentQuestionIndex];

  useEffect(() => {
    if (currentQuestionId && !questionDetails[currentQuestionId]) {
      fetchQuestionDetail(currentQuestionId);
    }
  }, [currentQuestionId, questionDetails, fetchQuestionDetail]);

  // ── Session Persistence ─────────────────────────────────────────────────────

  /** Auto-save session to localStorage on state changes. */
  useEffect(() => {
    // Only save if the test has been started
    if (state.phase !== "intro" && state.sessionId) {
      saveFullLengthSession(state);
    }
  }, [state]);

  /** Save session before page unload. */
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (state.phase !== "intro" && state.sessionId) {
        saveFullLengthSession(state);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [state]);

  /** Clear session from localStorage when test is completed. */
  useEffect(() => {
    if (state.phase === "test-complete" && state.testResult) {
      clearFullLengthSession();
    }
  }, [state.phase, state.testResult]);

  // ── Test Results Calculation ─────────────────────────────────────────────────

  /** Calculate test results when the test completes. */
  const handleCompleteTest = useCallback(() => {
    // We need both sections' module states to calculate results
    const rwModule1Key = getModuleKey("reading-writing", 1);
    const rwModule2Key = getModuleKey("reading-writing", 2);
    const mathModule1Key = getModuleKey("math", 1);
    const mathModule2Key = getModuleKey("math", 2);

    const rwModule1 = state.moduleStates[rwModule1Key];
    const rwModule2 = state.moduleStates[rwModule2Key];
    const mathModule1 = state.moduleStates[mathModule1Key];
    const mathModule2 = state.moduleStates[mathModule2Key];

    if (!rwModule1 || !rwModule2 || !mathModule1 || !mathModule2) {
      // Not all modules completed — just set phase without results
      dispatch({ type: "SET_PHASE", payload: "test-complete" });
      return;
    }

    // Build correct answers map from question details
    const correctAnswers: Record<string, string[]> = {};
    const questionDifficulties: Record<string, QuestionDifficulty> = {};

    for (const [id, detail] of Object.entries(questionDetails)) {
      if (detail.correct_answer) {
        correctAnswers[id] = detail.correct_answer;
      }
      // Default to "M" (medium) — actual difficulty comes from the question bank listing
      questionDifficulties[id] = "M" as QuestionDifficulty;
    }

    // Calculate module results
    const rwModule1Result = calculateModuleResult(
      rwModule1.answers,
      correctAnswers,
      questionDifficulties,
      rwModule1.pretestQuestionIds,
      1,
      undefined,
      rwModule1.timeRemainingMs > 0
        ? (32 * 60 * 1000) - rwModule1.timeRemainingMs
        : 32 * 60 * 1000
    );

    const rwModule2Result = calculateModuleResult(
      rwModule2.answers,
      correctAnswers,
      questionDifficulties,
      rwModule2.pretestQuestionIds,
      2,
      state.module2Difficulty["reading-writing"],
      rwModule2.timeRemainingMs > 0
        ? (32 * 60 * 1000) - rwModule2.timeRemainingMs
        : 32 * 60 * 1000
    );

    const mathModule1Result = calculateModuleResult(
      mathModule1.answers,
      correctAnswers,
      questionDifficulties,
      mathModule1.pretestQuestionIds,
      1,
      undefined,
      mathModule1.timeRemainingMs > 0
        ? (35 * 60 * 1000) - mathModule1.timeRemainingMs
        : 35 * 60 * 1000
    );

    const mathModule2Result = calculateModuleResult(
      mathModule2.answers,
      correctAnswers,
      questionDifficulties,
      mathModule2.pretestQuestionIds,
      2,
      state.module2Difficulty["math"],
      mathModule2.timeRemainingMs > 0
        ? (35 * 60 * 1000) - mathModule2.timeRemainingMs
        : 35 * 60 * 1000
    );

    const rwSectionResult = calculateSectionResult(
      "reading-writing",
      rwModule1Result,
      rwModule2Result
    );

    const mathSectionResult = calculateSectionResult(
      "math",
      mathModule1Result,
      mathModule2Result
    );

    const testResult = calculateTestResult(
      state.config,
      rwSectionResult,
      mathSectionResult,
      state.createdAt,
      new Date().toISOString()
    );

    dispatch({
      type: "COMPLETE_TEST",
      payload: { result: testResult },
    });
  }, [state, questionDetails]);

  // ── Render by phase ───────────────────────────────────────────────────────

  /** Wrapper to add top padding for the fixed navbar. */
  const renderWithLayout = (content: React.ReactNode) => (
    <div className="min-h-screen pt-32 pb-10">{content}</div>
  );

  /** ═══ Intro Phase ═══ */
  if (state.phase === "intro") {
    return renderWithLayout(
      <Card className="mx-auto w-full max-w-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Full-Length Practice Test</CardTitle>
          <CardDescription>
            Simulate the real Digital SAT experience with a complete timed test.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
            <h4 className="font-semibold">Test Overview</h4>
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              <li>
                <strong>Reading &amp; Writing:</strong> 2 modules · 32 minutes each
              </li>
              <li>
                <strong>Math:</strong> 2 modules · 35 minutes each
              </li>
              <li>
                <strong>Break:</strong> 10 minutes between sections
              </li>
              <li>
                <strong>Total:</strong> ~2 hours 24 minutes
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <strong>Tips:</strong> Answer every question — there is no penalty for
            guessing. You can flag questions to review later. Once you complete a
            module, you cannot return to it.
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
              {error}
            </div>
          )}

          <Button
            size="lg"
            className="w-full"
            onClick={handleStartTest}
            disabled={questionsLoading}
          >
            {questionsLoading ? (
              <>Loading questions…</>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start Full-Length Test
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  /** ═══ Section Intro Phase ═══ */
  if (state.phase === "section-intro") {
    const sectionLabel =
      SECTION_LABELS[currentSection] || SECTION_LABELS["reading-writing"];

    return renderWithLayout(
      <Card className="mx-auto w-full max-w-lg">
        <CardHeader className="text-center">
          <Badge variant="outline" className="mx-auto mb-2 text-xs">
            Full-Length Practice
          </Badge>
          <CardTitle className="text-2xl">
            {state.currentSectionIndex === 0
              ? "Section 1"
              : "Section 2"}
          </CardTitle>
          <CardDescription className="text-lg font-medium text-foreground">
            {sectionLabel.name}
          </CardDescription>
          <p className="text-sm text-muted-foreground">
            {sectionLabel.description}
          </p>
          {state.currentModuleNumber > 1 && (
            <Badge variant="secondary" className="mx-auto mt-1">
              Module {state.currentModuleNumber}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
              {error}
            </div>
          )}
          <Button
            size="lg"
            className="w-full"
            onClick={handleProceedToModule}
            disabled={questionsLoading}
          >
            {questionsLoading ? "Loading…" : `Begin ${sectionLabel.name}`}
          </Button>
        </CardContent>
      </Card>
    );
  }

  /** ═══ Module Active Phase ═══ */
  if (state.phase === "module-active") {
    if (!currentModuleState) {
      return renderWithLayout(
        <Card className="mx-auto w-full max-w-xl">
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading module…
          </CardContent>
        </Card>
    );
  }

  const currentQuestionId =
      currentModuleState.questionOrder[state.currentQuestionIndex];
    const totalQuestions = currentModuleState.questionOrder.length;
    const isFirstQuestion = state.currentQuestionIndex === 0;
    const isLastQuestion =
      state.currentQuestionIndex >= totalQuestions - 1;
    const currentQuestionData = currentQuestionId
      ? questionDetails[currentQuestionId]
      : undefined;
    const isReadingWriting = currentSection === "reading-writing";

    return renderWithLayout(
      <MathJaxContext>
        <div className="mx-auto w-full max-w-5xl">
          {/* Timer bar */}
          <div className="mb-4">
            <SectionTimer
              timeRemainingMs={currentModuleState.timeRemainingMs}
              totalTimeMs={currentTimeLimit}
              isTimerVisible={isTimerVisible}
              onToggleVisibility={() => setIsTimerVisible((v) => !v)}
            />
          </div>

          <div className="flex flex-col gap-4 lg:flex-row">
            {/* Main content area */}
            <div className="flex-1">
              {/* Progress indicator */}
              <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Section {state.currentSectionIndex + 1} · Module{" "}
                  {state.currentModuleNumber} · Question{" "}
                  {state.currentQuestionIndex + 1} of {totalQuestions}
                </span>
                {currentModuleState.difficulty && (
                  <Badge variant="outline" className="text-[10px]">
                    {currentModuleState.difficulty === "harder"
                      ? "Harder Path"
                      : "Standard Path"}
                  </Badge>
                )}
              </div>

              {/* Question display area */}
              <Card className="min-h-[400px]">
                <CardContent className="p-6">
                  {currentQuestionData ? (
                    <QuestionCard
                      questionData={currentQuestionData}
                      selectedAnswer={
                        currentQuestionId
                          ? currentModuleState.answers[currentQuestionId] ?? null
                          : null
                      }
                      disabledOptions={{}}
                      onAnswerSelect={(key) => {
                        if (currentQuestionId) {
                          dispatch({
                            type: "SET_QUESTION_ANSWER",
                            payload: { questionId: currentQuestionId, answer: key },
                          });
                        }
                      }}
                      onToggleDisabled={() => {
                        // Strikethrough not needed in full-length mode
                      }}
                      onSPRChange={(value) => {
                        if (currentQuestionId) {
                          dispatch({
                            type: "SET_QUESTION_ANSWER",
                            payload: { questionId: currentQuestionId, answer: value },
                          });
                        }
                      }}
                      onSPRSubmit={() => {
                        // SPR submit — just move to next question
                        handleNextQuestion();
                      }}
                      isAnswerChecked={false}
                      showStrikethrough={false}
                      isReadingWriting={isReadingWriting}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                      <p>Loading question…</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Action bar */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevQuestion}
                    disabled={isFirstQuestion}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextQuestion}
                    disabled={isLastQuestion}
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToggleFlag}
                  >
                    <Flag className="mr-1 h-4 w-4" />
                    Flag for Review
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleReviewFlagged}
                  >
                    Review Flagged
                  </Button>
                </div>

                <Button
                  variant="default"
                  size="sm"
                  onClick={handleCompleteModule}
                >
                  Submit Module
                </Button>
              </div>
            </div>

            {/* Sidebar navigator */}
            <div className="w-full shrink-0 lg:w-56">
              <QuestionNavigator
                totalQuestions={totalQuestions}
                currentIndex={state.currentQuestionIndex}
                answers={currentModuleState.answers}
                flaggedForReview={currentModuleState.flaggedForReview}
                questionIds={currentModuleState.questionOrder}
                onNavigate={handleNavigateQuestion}
              />
            </div>
          </div>
        </div>
      </MathJaxContext>
    );
  }

  /** ═══ Module Review Phase ═══ */
  if (state.phase === "module-review") {
    if (!currentModuleState) {
      return renderWithLayout(
        <Card className="mx-auto w-full max-w-xl">
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading review…
          </CardContent>
        </Card>
      );
    }

    const flaggedQuestions = currentModuleState.questionOrder.filter(
      (id) => currentModuleState.flaggedForReview.has(id)
    );

    return renderWithLayout(
      <Card className="mx-auto w-full max-w-xl">
        <CardHeader>
          <CardTitle>Review Flagged Questions</CardTitle>
          <CardDescription>
            {flaggedQuestions.length === 0
              ? "No questions are flagged for review."
              : `${flaggedQuestions.length} question${flaggedQuestions.length > 1 ? "s" : ""} flagged`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {flaggedQuestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              All questions have been reviewed. You can submit your module when
              ready.
            </p>
          ) : (
            <div className="space-y-2">
              {flaggedQuestions.map((id, index) => {
                const questionIndex =
                  currentModuleState.questionOrder.indexOf(id);
                const isAnswered =
                  currentModuleState.answers[id] != null;
                return (
                  <div
                    key={id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-sm font-medium">
                        {questionIndex + 1}
                      </span>
                      <span className="text-sm">
                        {isAnswered ? "Answered" : "Not answered"}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        dispatch({
                          type: "NAVIGATE_QUESTION",
                          payload: { questionIndex },
                        })
                      }
                    >
                      Go to Question
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleReturnFromReview}>
              Back to Module
            </Button>
            <Button onClick={handleCompleteModule}>Submit Module</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  /** ═══ Module Complete Phase ═══ */
  if (state.phase === "module-complete") {
    const section = getCurrentSection(state);
    const sectionLabel = SECTION_LABELS[section];

    return renderWithLayout(
      <Card className="mx-auto w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Module Complete</CardTitle>
          <CardDescription>
            {sectionLabel.name} — Module {state.currentModuleNumber}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <CheckCircleIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-center text-sm text-muted-foreground">
            {currentModuleState
              ? `You answered ${
                  Object.values(currentModuleState.answers).filter(
                    (a) => a != null
                  ).length
                } of ${currentModuleState.questionOrder.length} questions.`
              : "Module completed."}
          </p>
          <Button size="lg" className="w-full" onClick={handleContinue}>
            {state.currentModuleNumber === 1
              ? "Continue to Module 2"
              : state.currentSectionIndex === 0
                ? state.config.includeBreak
                  ? "Take a Break"
                  : "Continue to Math"
                : "View Results"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  /** ═══ Break Phase ═══ */
  if (state.phase === "break") {
    const breakMinutes = Math.max(
      0,
      Math.floor(state.breakTimeRemainingMs / 60000)
    );
    const breakSeconds = Math.max(
      0,
      Math.floor((state.breakTimeRemainingMs % 60000) / 1000)
    );

    return renderWithLayout(
      <Card className="mx-auto w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Break Time</CardTitle>
          <CardDescription>
            Take a short break before the next section.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div className="text-center">
            <p className="text-4xl font-bold tabular-nums">
              {String(breakMinutes).padStart(2, "0")}:
              {String(breakSeconds).padStart(2, "0")}
            </p>
            <p className="text-sm text-muted-foreground">
              remaining in your break
            </p>
          </div>

          <Progress
            value={
              state.breakTimeRemainingMs > 0
                ? (state.breakTimeRemainingMs / (10 * 60 * 1000)) * 100
                : 0
            }
            className="w-full"
          />

          <p className="text-center text-sm text-muted-foreground">
            Stand up, stretch, and get ready for the next section.
            You can end your break early if you&apos;re ready.
          </p>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleCompleteBreak}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            End Break Early
          </Button>
        </CardContent>
      </Card>
    );
  }

  /** ═══ Test Complete Phase ═══ */
  if (state.phase === "test-complete") {
    return renderWithLayout(
      <TestResultsScreen
        testResult={state.testResult}
        onReviewQuestions={handleReviewQuestions}
        onBackToDashboard={handleBackToDashboard}
      />
    );
  }

  // ── Fallback ───────────────────────────────────────────────────────────────
  return renderWithLayout(
    <Card className="mx-auto w-full max-w-xl">
      <CardContent className="py-8 text-center text-muted-foreground">
        Unknown test phase: {state.phase}
      </CardContent>
    </Card>
  );
}

// ─── Inline icon helper ─────────────────────────────────────────────────────────
/** Small check-circle icon used in module-complete phase. */
function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
