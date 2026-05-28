"use client";

import { useMemo } from "react";
import { CheckCircle, XCircle, Clock, Trophy, ArrowLeft } from "lucide-react";

import { FullLengthTestResult } from "@/types/full-length";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  interpretSectionScore,
  interpretTotalScore,
  getTimeManagementRating,
} from "@/lib/full-length/scoring";
import { cn } from "@/lib/utils";

interface TestResultsScreenProps {
  /** The computed test result, or null if not yet available. */
  testResult: FullLengthTestResult | null;
  /** Navigate to the question review view. */
  onReviewQuestions: () => void;
  /** Return to the practice dashboard. */
  onBackToDashboard: () => void;
}

/** Human-readable section name. */
function sectionDisplayName(section: string): string {
  return section === "reading-writing" ? "Reading & Writing" : "Math";
}

/** Format milliseconds to a readable duration. */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

/** Score badge variant based on level. */
function scoreBadgeVariant(level: string): "default" | "secondary" | "destructive" | "outline" {
  switch (level) {
    case "Excellent":
      return "default";
    case "Good":
      return "secondary";
    case "Benchmark":
      return "outline";
    default:
      return "destructive";
  }
}

/** Score level display colors. */
function scoreLevelClass(level: string): string {
  switch (level) {
    case "Excellent":
      return "text-green-600 dark:text-green-400";
    case "Good":
      return "text-blue-600 dark:text-blue-400";
    case "Benchmark":
      return "text-amber-600 dark:text-amber-400";
    default:
      return "text-red-600 dark:text-red-400";
  }
}

/**
 * Results screen shown after completing a full-length practice test.
 *
 * Displays estimated SAT scores, per-section breakdowns, domain performance,
 * time management, and score interpretation ratings.
 */
export function TestResultsScreen({
  testResult,
  onReviewQuestions,
  onBackToDashboard,
}: TestResultsScreenProps) {
  // ── Derive display values ──────────────────────────────────────────────────
  const totalInterpretation = useMemo(
    () => (testResult ? interpretTotalScore(testResult.totalScore) : null),
    [testResult]
  );

  const rwInterpretation = useMemo(
    () =>
      testResult
        ? interpretSectionScore(testResult.readingWritingScore, "reading-writing")
        : null,
    [testResult]
  );

  const mathInterpretation = useMemo(
    () =>
      testResult ? interpretSectionScore(testResult.mathScore, "math") : null,
    [testResult]
  );

  // ── Loading state ──────────────────────────────────────────────────────────
  if (!testResult) {
    return (
      <Card className="mx-auto w-full max-w-2xl">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Clock className="mb-4 h-12 w-12 animate-pulse text-muted-foreground" />
          <p className="text-lg font-medium">Computing your results…</p>
          <p className="text-sm text-muted-foreground">
            Please wait while we calculate your estimated scores.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Score interpretation ──────────────────────────────────────────────────
  const rwSection = testResult.sections[0];
  const mathSection = testResult.sections[1];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 py-4">
      {/* ────── Hero Score Card ────── */}
      <Card className="overflow-hidden border-2 border-primary/20">
        <CardHeader className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 pb-4 text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Trophy className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">
            {testResult.totalScore}
          </CardTitle>
          <p className="text-base text-muted-foreground">Estimated Total Score</p>

          {totalInterpretation && (
            <Badge
              variant={scoreBadgeVariant(totalInterpretation.level)}
              className={cn("mt-2 px-3 py-1 text-sm", scoreLevelClass(totalInterpretation.level))}
            >
              {totalInterpretation.level}
            </Badge>
          )}
          {totalInterpretation && (
            <p className="mt-1 text-xs text-muted-foreground">
              {totalInterpretation.description}
            </p>
          )}
        </CardHeader>

        <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
          {/* R&W Score */}
          <div className="rounded-lg border p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Reading &amp; Writing
            </p>
            <p className="mt-1 text-2xl font-bold">{testResult.readingWritingScore}</p>
            {rwInterpretation && (
              <Badge
                variant={scoreBadgeVariant(rwInterpretation.level)}
                className={cn("mt-1", scoreLevelClass(rwInterpretation.level))}
              >
                {rwInterpretation.level}
              </Badge>
            )}
          </div>

          {/* Math Score */}
          <div className="rounded-lg border p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Math
            </p>
            <p className="mt-1 text-2xl font-bold">{testResult.mathScore}</p>
            {mathInterpretation && (
              <Badge
                variant={scoreBadgeVariant(mathInterpretation.level)}
                className={cn("mt-1", scoreLevelClass(mathInterpretation.level))}
              >
                {mathInterpretation.level}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ────── Per-Section Breakdown ────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Section Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[rwSection, mathSection].map((section) => {
            if (!section) return null;
            const sectionLabel = sectionDisplayName(section.section);
            const incorrect = section.totalOperational - section.totalCorrect;
            const skipped =
              section.totalOperational -
              section.totalCorrect -
              incorrect;
            const timeRating = getTimeManagementRating(
              section.totalTimeMs,
              section.section === "reading-writing" ? 64 : 70
            );

            return (
              <div key={section.section} className="rounded-lg border p-4">
                <h4 className="mb-3 font-semibold">{sectionLabel}</h4>

                {/* Stats row */}
                <div className="mb-3 grid grid-cols-4 gap-2 text-center text-sm">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-medium">{section.totalCorrect}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Correct</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-red-600 dark:text-red-400">
                      <XCircle className="h-4 w-4" />
                      <span className="font-medium">{incorrect}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Incorrect</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                      <span className="font-medium">{skipped}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Skipped</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">
                        {formatDuration(section.totalTimeMs)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Time</p>
                  </div>
                </div>

                {/* Time management rating */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Pace:</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {timeRating.rating}
                  </Badge>
                  <span className="text-muted-foreground">
                    {timeRating.description}
                  </span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ────── Domain Performance ────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Domain Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Domain</th>
                  <th className="pb-2 pr-4 font-medium">Section</th>
                  <th className="pb-2 pr-4 font-medium">Correct</th>
                  <th className="pb-2 pr-4 font-medium">Total</th>
                  <th className="pb-2 font-medium">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {[rwSection, mathSection].map((section) => {
                  if (!section) return null;
                  const sectionLabel = sectionDisplayName(section.section);

                  // Flatten domain breakdown from both modules
                  const domainAccumulator: Record<
                    string,
                    { correct: number; total: number }
                  > = {};

                  for (const moduleResult of section.modules) {
                    for (const [domainCode, domainResult] of Object.entries(
                      moduleResult.domainBreakdown
                    )) {
                      if (!domainAccumulator[domainCode]) {
                        domainAccumulator[domainCode] = {
                          correct: 0,
                          total: 0,
                        };
                      }
                      domainAccumulator[domainCode].correct +=
                        domainResult.correctCount;
                      domainAccumulator[domainCode].total +=
                        domainResult.operationalCount;
                    }
                  }

                  const domainEntries = Object.entries(domainAccumulator);

                  // If no domain breakdown data, show a summary row
                  if (domainEntries.length === 0) {
                    return (
                      <tr key={section.section} className="border-b last:border-b-0">
                        <td className="py-2 pr-4 font-medium">All Domains</td>
                        <td className="py-2 pr-4">{sectionLabel}</td>
                        <td className="py-2 pr-4">{section.totalCorrect}</td>
                        <td className="py-2 pr-4">{section.totalOperational}</td>
                        <td className="py-2">
                          {section.totalOperational > 0
                            ? `${Math.round((section.totalCorrect / section.totalOperational) * 100)}%`
                            : "—"}
                        </td>
                      </tr>
                    );
                  }

                  return domainEntries.map(([domainCode, data]) => (
                    <tr
                      key={`${section.section}-${domainCode}`}
                      className="border-b last:border-b-0"
                    >
                      <td className="py-2 pr-4 font-medium">{domainCode}</td>
                      <td className="py-2 pr-4">{sectionLabel}</td>
                      <td className="py-2 pr-4">{data.correct}</td>
                      <td className="py-2 pr-4">{data.total}</td>
                      <td className="py-2">
                        {data.total > 0
                          ? `${Math.round((data.correct / data.total) * 100)}%`
                          : "—"}
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ────── Time Overview ────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Time Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Total Time Spent</p>
              <p className="mt-1 text-xl font-semibold">
                {formatDuration(testResult.totalTimeMs)}
              </p>
            </div>
            {rwSection && (
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">
                  R&amp;W Time Used
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {formatDuration(rwSection.totalTimeMs)}
                </p>
                <p className="text-xs text-muted-foreground">
                  of 64 minutes allotted
                </p>
              </div>
            )}
            {mathSection && (
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">
                  Math Time Used
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {formatDuration(mathSection.totalTimeMs)}
                </p>
                <p className="text-xs text-muted-foreground">
                  of 70 minutes allotted
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ────── Actions ────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button size="lg" onClick={onReviewQuestions}>
          <CheckCircle className="mr-2 h-4 w-4" />
          Review Questions
        </Button>
        <Button size="lg" variant="outline" onClick={onBackToDashboard}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
