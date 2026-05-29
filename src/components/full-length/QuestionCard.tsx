"use client";

import React, { useMemo } from "react";
import { MathJax } from "better-react-mathjax";
import { RadioGroup } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle, X, Strikethrough } from "lucide-react";
import { playSound } from "@/lib/playSound";
import { API_Response_Question } from "@/types/question";

// ─── MCQ Answer Options ──────────────────────────────────────────────────────

interface AnswerOptionsProps {
  answerOptions: { [key: string]: string };
  questionId: string;
  selectedAnswer: string | null;
  disabledOptions: { [key: string]: boolean };
  onAnswerSelect: (key: string) => void;
  onToggleDisabled: (key: string) => void;
  showStrikethrough: boolean;
  correctAnswers?: string[];
  isAnswerChecked?: boolean;
}

function AnswerOptions({
  answerOptions,
  questionId,
  selectedAnswer,
  disabledOptions,
  onAnswerSelect,
  onToggleDisabled,
  showStrikethrough,
  correctAnswers = [],
  isAnswerChecked = false,
}: AnswerOptionsProps) {
  const optionEntries = useMemo(
    () => Object.entries(answerOptions),
    [answerOptions]
  );

  return (
    <RadioGroup className="flex flex-col gap-3" defaultValue="1">
      {optionEntries.map(([key, value], index) => {
        const trimmedKey = key.trim();
        const isCorrectAnswer =
          isAnswerChecked && correctAnswers.includes(trimmedKey);
        const isSelectedWrongAnswer =
          isAnswerChecked &&
          selectedAnswer?.trim() === trimmedKey &&
          !correctAnswers.includes(trimmedKey);
        const isSelected = selectedAnswer?.trim() === trimmedKey;

        return (
          <div
            key={`${key}-${questionId}`}
            className="flex z-20 items-center gap-2 answer-option"
          >
            <label
              onClick={() => {
                if (
                  selectedAnswer?.trim() !== trimmedKey &&
                  !disabledOptions[key] &&
                  !isAnswerChecked
                ) {
                  playSound("button-pressed.wav");
                  onAnswerSelect(key);
                }
              }}
              className={`relative ${
                disabledOptions[key]
                  ? " cursor-not-allowed after:absolute after:inset-0 after:h-0.5 after:w-[102.5%] after:bg-black after:-translate-x-1/2 after:left-1/2 after:top-1/2 after:-translate-y-1/2"
                  : isAnswerChecked
                  ? "cursor-default"
                  : "cursor-pointer"
              } w-full transition duration-500 ${
                isAnswerChecked &&
                (isCorrectAnswer || correctAnswers.includes(key))
                  ? "border-2 border-green-500 bg-green-500/10"
                  : isSelectedWrongAnswer
                  ? "border-2 border-red-500 bg-red-500/10"
                  : isSelected
                  ? "border-2 border-blue-500 bg-blue-500/10"
                  : "border-2 border-input"
              } has-[[data-disabled]]:opacity-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring/70 flex flex-col items-start gap-4 rounded-lg p-3 shadow-sm shadow-black/5`}
            >
              <div className="grid grid-cols-9 items-center gap-3">
                <div className="col-span-1 flex items-center justify-center">
                  <div
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-semibold ${
                      isAnswerChecked && isCorrectAnswer
                        ? "border-green-500 bg-green-500 text-white"
                        : isSelectedWrongAnswer
                        ? "border-red-500 bg-red-500 text-white"
                        : isSelected
                        ? "border-blue-500 bg-blue-500 text-white"
                        : "border-gray-300 bg-gray-50 text-gray-600"
                    }`}
                  >
                    {isCorrectAnswer ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : isSelectedWrongAnswer ? (
                      <X className="h-4 w-4" />
                    ) : (
                      String.fromCharCode(65 + index)
                    )}
                  </div>
                </div>
                <Label className="col-span-8" htmlFor={`${key}-${questionId}`}>
                  <MathJax
                    className="inline-block cursor-pointer"
                    inline
                    dynamic
                  >
                    <span
                      className="text-xl inline-block"
                      dangerouslySetInnerHTML={{
                        __html: value,
                      }}
                    ></span>
                  </MathJax>
                </Label>
              </div>
            </label>
            {showStrikethrough && (
              <Button
                variant="ghost"
                className="h-full w-14 cursor-pointer"
                onClick={() => {
                  if (selectedAnswer?.trim() !== trimmedKey) {
                    playSound("button-pressed.wav");
                    onToggleDisabled(key);
                  }
                }}
              >
                {disabledOptions[key] ? (
                  <p className="underline">Undo</p>
                ) : (
                  <Strikethrough className="h-6 w-6" />
                )}
              </Button>
            )}
          </div>
        );
      })}
    </RadioGroup>
  );
}

// ─── SPR Input ────────────────────────────────────────────────────────────────

interface SPRInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

function SPRInput({ value, onChange, onSubmit, disabled = false }: SPRInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !disabled && value?.trim()) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="w-full">
      <div className="relative">
        <input
          type="text"
          value={value || ""}
          onChange={(e) => !disabled && onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your answer here..."
          disabled={disabled}
          className={`w-full px-4 py-4 text-lg font-medium border-2 border-b-4 rounded-2xl focus:outline-none transition-all duration-200 shadow-sm ${
            disabled
              ? "border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed"
              : "border-gray-300 focus:border-blue-500 focus:border-b-blue-500 focus:ring-0 bg-white hover:shadow-md focus:shadow-lg"
          }`}
        />
      </div>
    </div>
  );
}

// ─── Question Card ────────────────────────────────────────────────────────────

export interface QuestionCardProps {
  /** Full question data from the API */
  questionData: API_Response_Question;
  /** Currently selected answer (MCQ option key or SPR text) */
  selectedAnswer: string | null;
  /** Disabled answer options (strikethrough) */
  disabledOptions: { [key: string]: boolean };
  /** Callback when an MCQ option is selected */
  onAnswerSelect: (key: string) => void;
  /** Callback when an MCQ option is strikethrough-toggled */
  onToggleDisabled: (key: string) => void;
  /** Callback when SPR answer changes */
  onSPRChange: (value: string) => void;
  /** Callback when SPR answer is submitted */
  onSPRSubmit: () => void;
  /** Whether the answer has been checked/submitted */
  isAnswerChecked?: boolean;
  /** Whether to show strikethrough buttons on MCQ options */
  showStrikethrough?: boolean;
  /** Whether this is a reading-writing question (affects layout) */
  isReadingWriting?: boolean;
}

/**
 * Renders a single question with stem, stimulus, and answer area.
 * Supports both MCQ and SPR question types.
 */
export function QuestionCard({
  questionData,
  selectedAnswer,
  disabledOptions,
  onAnswerSelect,
  onToggleDisabled,
  onSPRChange,
  onSPRSubmit,
  isAnswerChecked = false,
  showStrikethrough = true,
  isReadingWriting = false,
}: QuestionCardProps) {
  const { stem, stimulus, answerOptions, type, correct_answer } = questionData;

  return (
    <div className="flex flex-col gap-4">
      {/* Stimulus (reading passage, chart, etc.) */}
      {stimulus && (
        <MathJax inline dynamic id="stimulus" className="text-xl text-justify answer-option">
          <span
            dangerouslySetInnerHTML={{
              __html: stimulus,
            }}
          />
        </MathJax>
      )}

      {/* Stem (question text) — shown for math, hidden for R&W (stem is in stimulus) */}
      {!isReadingWriting && stem && (
        <MathJax inline dynamic>
          <span
            id="question_stem"
            className="text-xl answer-option"
            dangerouslySetInnerHTML={{
              __html: stem,
            }}
          />
        </MathJax>
      )}

      {/* Answer area */}
      {answerOptions ? (
        <AnswerOptions
          answerOptions={answerOptions}
          questionId={questionData.externalid || questionData.ibn || "unknown"}
          selectedAnswer={selectedAnswer}
          disabledOptions={disabledOptions}
          onAnswerSelect={onAnswerSelect}
          onToggleDisabled={onToggleDisabled}
          showStrikethrough={showStrikethrough}
          correctAnswers={correct_answer?.map((a) => a.trim()) || []}
          isAnswerChecked={isAnswerChecked}
        />
      ) : (
        <SPRInput
          value={selectedAnswer || ""}
          onChange={onSPRChange}
          onSubmit={onSPRSubmit}
          disabled={isAnswerChecked}
        />
      )}
    </div>
  );
}