"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SectionTimerProps {
  /**
   * Time remaining in milliseconds.
   * Display value only — actual tracking happens in the reducer.
   */
  timeRemainingMs: number;
  /** Total time for this section/module in milliseconds (for percentage display). */
  totalTimeMs: number;
  /** Whether the timer is currently visible. */
  isTimerVisible: boolean;
  /** Toggle timer visibility on/off. */
  onToggleVisibility: () => void;
}

/**
 * Converts milliseconds to MM:SS display format.
 */
function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Determines the color variant based on time remaining.
 *
 * - Green: > 5 minutes
 * - Yellow: 1–5 minutes
 * - Orange: 30 seconds – 1 minute
 * - Red: < 30 seconds
 */
function getTimerColor(remainingMs: number): {
  bg: string;
  text: string;
  label: string;
} {
  const remainingSeconds = Math.max(0, remainingMs / 1000);

  if (remainingSeconds > 300) {
    return { bg: "bg-green-500/20", text: "text-green-600 dark:text-green-400", label: "green" };
  }
  if (remainingSeconds > 60) {
    return { bg: "bg-yellow-500/20", text: "text-yellow-600 dark:text-yellow-400", label: "yellow" };
  }
  if (remainingSeconds > 30) {
    return { bg: "bg-orange-500/20", text: "text-orange-600 dark:text-orange-400", label: "orange" };
  }
  return { bg: "bg-red-500/20", text: "text-red-600 dark:text-red-400", label: "red" };
}

/**
 * Countdown timer component for full-length practice modules.
 *
 * Displays the remaining time as MM:SS with color-coded urgency indicators.
 * Supports show/hide toggling and pulsing animation when under 1 minute.
 */
export function SectionTimer({
  timeRemainingMs,
  totalTimeMs,
  isTimerVisible,
  onToggleVisibility,
}: SectionTimerProps) {
  const color = useMemo(() => getTimerColor(timeRemainingMs), [timeRemainingMs]);
  const percentage = useMemo(
    () => (totalTimeMs > 0 ? (timeRemainingMs / totalTimeMs) * 100 : 100),
    [timeRemainingMs, totalTimeMs]
  );
  const isUrgent = timeRemainingMs < 60_000; // < 1 minute

  if (!isTimerVisible) {
    return (
      <div className="flex items-center justify-end gap-2 px-4 py-2">
        <span className="text-sm text-muted-foreground">Timer hidden</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleVisibility}
          aria-label="Show timer"
        >
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      className={cn(
        "flex items-center justify-between rounded-lg border px-4 py-2",
        color.bg
      )}
      animate={
        isUrgent
          ? {
              scale: [1, 1.03, 1],
              transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut" },
            }
          : undefined
      }
    >
      {/* Time display */}
      <div className="flex items-center gap-3">
        <motion.span
          className={cn(
            "font-mono text-xl font-bold tracking-wider tabular-nums",
            color.text
          )}
          key={formatTime(timeRemainingMs)}
          initial={false}
          animate={{ opacity: 1 }}
        >
          {formatTime(timeRemainingMs)}
        </motion.span>

        {/* Mini progress bar */}
        <div className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-muted sm:block">
          <motion.div
            className={cn("h-full rounded-full transition-colors", {
              "bg-green-500": color.label === "green",
              "bg-yellow-500": color.label === "yellow",
              "bg-orange-500": color.label === "orange",
              "bg-red-500": color.label === "red",
            })}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.1, ease: "linear" }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {isUrgent && (
          <span className="text-xs font-semibold uppercase text-red-500">
            Urgent
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleVisibility}
          aria-label="Hide timer"
        >
          <EyeOff className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
