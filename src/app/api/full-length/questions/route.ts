import { NextRequest, NextResponse } from "next/server";
import { Assessments } from "@/static-data/assessment";
import { DomainItemsArray } from "@/types/lookup";
import { PlainQuestionType } from "@/types/question";
import {
  selectQuestionsForTest,
  TestQuestionSelection,
} from "@/lib/full-length/questionSelector";
import { FullLengthSection } from "@/types/full-length";
import getInternalAPITargetURL from "@/lib/getInternalAPITargetURL";

/**
 * POST /api/full-length/questions
 *
 * Fetches questions for both sections of a full-length SAT/PSAT test,
 * runs the question selection algorithm, and returns curated question
 * sets per module.
 *
 * Request body:
 *   - assessment: "SAT" | "PSAT/NMSQT" | "PSAT" (default: "SAT")
 *
 * Response:
 *   - success: boolean
 *   - data: TestQuestionSelection (modules with questionIds, pretestIds, slots)
 *   - error?: string
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const assessment = body.assessment || "SAT";

    // Validate assessment
    if (!(assessment in Assessments)) {
      return NextResponse.json(
        { success: false, error: `Invalid assessment: ${assessment}` },
        { status: 400 }
      );
    }

    // Fetch questions for both sections in parallel
    const [rwQuestions, mathQuestions] = await Promise.all([
      fetchQuestionsForSectionServer("reading-writing", assessment),
      fetchQuestionsForSectionServer("math", assessment),
    ]);

    if (rwQuestions.length === 0 && mathQuestions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No questions available for the selected assessment.",
        },
        { status: 404 }
      );
    }

    // Run the question selection algorithm
    const selection = selectQuestionsForTest(
      rwQuestions,
      mathQuestions,
      assessment
    );

    return NextResponse.json(
      {
        success: true,
        data: selection,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store", // Don't cache — selection is randomized
        },
      }
    );
  } catch (error) {
    console.error("Error in /api/full-length/questions:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch and select questions",
      },
      { status: 500 }
    );
  }
}

/**
 * Server-side question fetching for a full-length section.
 * Calls the College Board API and internal DB directly (no self-fetch).
 */
async function fetchQuestionsForSectionServer(
  subject: FullLengthSection,
  assessment: string
): Promise<PlainQuestionType[]> {
  const domainMap: Record<FullLengthSection, string> = {
    "reading-writing": "INI,CAS,EOI,SEC",
    math: "H,P,Q,S",
  };

  const domains = domainMap[subject];
  const asmtEventId = Assessments[assessment as keyof typeof Assessments]?.id ?? 99;

  let questions: PlainQuestionType[] = [];

  // 1. Fetch from College Board API
  try {
    const apiUrl =
      "https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-questions";

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        asmtEventId,
        test: 2,
        domain: domains,
      }),
      next: { revalidate: 86400 },
      cache: "force-cache",
      signal: AbortSignal.timeout(30000),
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        questions = [...questions, ...data];
      }
    }
  } catch (error) {
    console.warn(
      `College Board API fetch failed for ${subject}:`,
      error
    );
  }

  // 2. Fetch from internal DB
  try {
    const internalApiUrl = getInternalAPITargetURL();
    const internalResponse = await fetch(
      `${internalApiUrl}/api/student-qb/get-questions?domains=${domains}&assessment=${assessment}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    if (internalResponse.ok) {
      const internalData = await internalResponse.json();
      if (internalData.success && Array.isArray(internalData.data)) {
        questions = [...questions, ...internalData.data];
      }
    }
  } catch (error) {
    console.warn(
      `Internal DB fetch failed for ${subject}:`,
      error
    );
  }

  return questions;
}