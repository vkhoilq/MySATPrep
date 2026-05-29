"use client";

import { useMemo } from "react";
import { Flag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuestionNavigatorProps {
  /** Total number of questions in the current module. */
  totalQuestions: number;
  /** Index of the currently displayed question (0-based). */
  currentIndex: number;
  /** User's answers keyed by question ID (null means unanswered). */
  answers: Record<string, string | null>;
  /** Set of question IDs flagged for review. */
  flaggedForReview: Set<string>;
  /** Ordered list of question IDs in the current module. */
  questionIds: string[];
  /** Callback to navigate to a specific question index. */
  onNavigate: (index: number) => void;
}

/**
 * Question grid navigator for full-length practice modules.
 *
 * Renders a compact grid of numbered buttons (1…N) with color-coded
 * status indicators so the student can quickly see which questions
 * are answered, flagged, or unanswered, and jump to any question.
 */
export function QuestionNavigator({
  totalQuestions,
  currentIndex,
  answers,
  flaggedForReview,
  questionIds,
  onNavigate,
}: QuestionNavigatorProps) {
  // Precompute the status for each question position
  const questionStatuses = useMemo(() => {
    return questionIds.slice(0, totalQuestions).map((id, index) => {
      const isCurrent = index === currentIndex;
      const isAnswered = answers[id] != null;
      const isFlagged = flaggedForReview.has(id);
      return { index, id, isCurrent, isAnswered, isFlagged };
    });
  }, [questionIds, totalQuestions, currentIndex, answers, flaggedForReview]);

  if (totalQuestions === 0) {
    return (
      <div className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
        No questions loaded
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Questions
      </h3>

      {/* Legend */}
      <div className="mb-3 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-500" />
          Answered
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm border-2 border-amber-400 bg-muted" />
          Flagged
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm border border-blue-500 bg-blue-500/20" />
          Current
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-muted" />
          Unanswered
        </span>
      </div>

      {/* Question grid */}
      <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6">
        {questionStatuses.map(({ index, id, isCurrent, isAnswered, isFlagged }) => (
          <Button
            key={id}
            size="sm"
            variant={isCurrent ? "default" : "outline"}
            className={cn(
              "relative h-8 w-full min-w-0 p-0 text-xs font-medium",
              // Answered but not current
              !isCurrent && isAnswered && "border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
              // Flagged but not current and not answered
              !isCurrent && isFlagged && !isAnswered && "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
              // Current (default variant already handles this)
              // Unanswered (just outline)
            )}
            onClick={() => onNavigate(index)}
            aria-label={`Go to question ${index + 1}${isFlagged ? " (flagged)" : ""}${isAnswered ? " (answered)" : ""}`}
          >
            {index + 1}
            {/* Flag indicator dot */}
            {isFlagged && (
              <Flag
                className={cn(
                  "absolute -right-0.5 -top-0.5 h-2.5 w-2.5 fill-amber-400 text-amber-400",
                  isCurrent && "fill-white text-white"
                )}
              />
            )}
          </Button>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-3 flex justify-between text-[11px] text-muted-foreground">
        <span>
          Answered:{" "}
          <span className="font-medium text-foreground">
            {Object.values(answers).filter((a) => a != null).length}
          </span>
          /{totalQuestions}
        </span>
        <span>
          Flagged: <span className="font-medium text-amber-500">{flaggedForReview.size}</span>
        </span>
      </div>
    </div>
  );
}
