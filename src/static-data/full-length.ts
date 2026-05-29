/**
 * Full-Length Practice Test Blueprint Constants
 *
 * Defines the exact structure of each Digital SAT assessment following
 * College Board's official specifications:
 * - SAT: 2 sections × 2 modules, 98 questions, 134 min + 10 min break
 * - PSAT/NMSQT: 2 sections × 2 modules, 98 questions, 114 min + 10 min break
 * - PSAT 8/9: 2 sections × 2 modules, 96 questions, 115 min + 10 min break
 *
 * Each module has a fixed number of operational (scored) and pretest (unscored)
 * questions, a time limit, and a domain distribution that determines how many
 * questions come from each content domain.
 *
 * Reference: https://satsuite.collegeboard.org/media/pdf/digital-sat-test-spec-overview.pdf
 */

import { QuestionDifficulty } from "@/types/question";
import {
  FullLengthTestBlueprint,
  FullLengthSectionConfig,
  FullLengthModuleConfig,
  FullLengthModuleDifficulty,
} from "@/types/full-length";

// ─── Difficulty Distribution Constants ─────────────────────────────────────────

/**
 * Module 1 has a broad mix of easy, medium, and hard questions.
 * This is the same for all students regardless of their level.
 */
export const MODULE_1_DIFFICULTY_MIX: Record<QuestionDifficulty, number> = {
  E: 0.33, // ~33% Easy
  M: 0.34, // ~34% Medium
  H: 0.33, // ~33% Hard
} as const;

/**
 * Module 2 (easier path): more easy and medium, fewer hard questions.
 * Assigned to students who scored below the adaptive threshold on Module 1.
 */
export const MODULE_2_EASIER_MIX: Record<QuestionDifficulty, number> = {
  E: 0.40, // ~40% Easy
  M: 0.40, // ~40% Medium
  H: 0.20, // ~20% Hard
} as const;

/**
 * Module 2 (harder path): fewer easy, more hard questions.
 * Assigned to students who scored at or above the adaptive threshold on Module 1.
 */
export const MODULE_2_HARDER_MIX: Record<QuestionDifficulty, number> = {
  E: 0.20, // ~20% Easy
  M: 0.40, // ~40% Medium
  H: 0.40, // ~40% Hard
} as const;

/**
 * Get the difficulty distribution for a given module.
 * Module 1 always uses the mixed distribution.
 * Module 2 uses easier or harder based on Module 1 performance.
 */
export function getDifficultyDistribution(
  moduleNumber: 1 | 2,
  module2Difficulty?: FullLengthModuleDifficulty
): Record<QuestionDifficulty, number> {
  if (moduleNumber === 1) return MODULE_1_DIFFICULTY_MIX;
  return module2Difficulty === "harder"
    ? MODULE_2_HARDER_MIX
    : MODULE_2_EASIER_MIX;
}

// ─── Domain Distribution Constants ────────────────────────────────────────────

/**
 * Reading & Writing Module domain distribution.
 * ~6-7 questions per domain, totaling 27 questions per module.
 * Questions are grouped by domain and ordered easiest → hardest within each group.
 */
export const RW_MODULE_DISTRIBUTION: Record<string, number> = {
  INI: 7, // Information and Ideas
  CAS: 7, // Craft and Structure
  EOI: 7, // Expression of Ideas
  SEC: 6, // Standard English Conventions
} as const;

/**
 * Math Module domain distribution.
 * ~5-6 questions per domain, totaling 22 questions per module.
 * Questions are grouped by domain and ordered easiest → hardest within each group.
 */
export const MATH_MODULE_DISTRIBUTION: Record<string, number> = {
  H: 6, // Algebra
  P: 6, // Advanced Math
  Q: 5, // Problem-Solving and Data Analysis
  S: 5, // Geometry and Trigonometry
} as const;

/**
 * Get the domain distribution for a given section.
 */
export function getDomainDistribution(
  section: "reading-writing" | "math"
): Record<string, number> {
  return section === "reading-writing"
    ? RW_MODULE_DISTRIBUTION
    : MATH_MODULE_DISTRIBUTION;
}

// ─── SAT Blueprint ────────────────────────────────────────────────────────────

/**
 * SAT Digital Test Blueprint
 *
 * Reading & Writing Section:
 *   Module 1: 25 operational + 2 pretest = 27 questions, 32 minutes
 *   Module 2: 25 operational + 2 pretest = 27 questions, 32 minutes
 *   Total: 54 questions, 64 minutes
 *
 * Math Section:
 *   Module 1: 20 operational + 2 pretest = 22 questions, 35 minutes
 *   Module 2: 20 operational + 2 pretest = 22 questions, 35 minutes
 *   Total: 44 questions, 70 minutes
 *
 * Break: 10 minutes between sections
 * Total: 98 questions, 134 minutes testing + 10 minutes break = 144 minutes
 */
export const SAT_TEST_BLUEPRINT: FullLengthTestBlueprint = {
  assessment: "SAT",
  sections: [
    {
      section: "reading-writing",
      modules: [
        {
          moduleNumber: 1,
          operationalQuestions: 25,
          pretestQuestions: 2,
          totalQuestions: 27,
          timeMinutes: 32,
          domainDistribution: RW_MODULE_DISTRIBUTION,
          difficultyDistribution: MODULE_1_DIFFICULTY_MIX,
        },
        {
          moduleNumber: 2,
          operationalQuestions: 25,
          pretestQuestions: 2,
          totalQuestions: 27,
          timeMinutes: 32,
          domainDistribution: RW_MODULE_DISTRIBUTION,
          difficultyDistribution: MODULE_2_EASIER_MIX, // default; overridden at runtime
        },
      ],
      breakAfter: false,
      breakDurationMinutes: 0,
    },
    {
      section: "math",
      modules: [
        {
          moduleNumber: 1,
          operationalQuestions: 20,
          pretestQuestions: 2,
          totalQuestions: 22,
          timeMinutes: 35,
          domainDistribution: MATH_MODULE_DISTRIBUTION,
          difficultyDistribution: MODULE_1_DIFFICULTY_MIX,
        },
        {
          moduleNumber: 2,
          operationalQuestions: 20,
          pretestQuestions: 2,
          totalQuestions: 22,
          timeMinutes: 35,
          domainDistribution: MATH_MODULE_DISTRIBUTION,
          difficultyDistribution: MODULE_2_EASIER_MIX, // default; overridden at runtime
        },
      ],
      breakAfter: true,
      breakDurationMinutes: 10,
    },
  ],
  totalQuestions: 98,
  totalTimeMinutes: 134,
  breakDurationMinutes: 10,
  totalTimeWithBreaksMinutes: 144,
};

// ─── PSAT/NMSQT Blueprint ─────────────────────────────────────────────────────

/**
 * PSAT/NMSQT Digital Test Blueprint
 *
 * Reading & Writing Section:
 *   Module 1: 25 operational + 2 pretest = 27 questions, 30 minutes
 *   Module 2: 25 operational + 2 pretest = 27 questions, 30 minutes
 *   Total: 54 questions, 60 minutes
 *
 * Math Section:
 *   Module 1: 18 operational + 2 pretest = 20 questions, 32 minutes
 *   Module 2: 18 operational + 2 pretest = 20 questions, 32 minutes
 *   Total: 40 questions, 64 minutes
 *
 * Break: 10 minutes between sections
 * Total: 94 questions, 124 minutes testing + 10 minutes break = 134 minutes
 */
export const PSAT_NMSQT_TEST_BLUEPRINT: FullLengthTestBlueprint = {
  assessment: "PSAT/NMSQT",
  sections: [
    {
      section: "reading-writing",
      modules: [
        {
          moduleNumber: 1,
          operationalQuestions: 25,
          pretestQuestions: 2,
          totalQuestions: 27,
          timeMinutes: 30,
          domainDistribution: RW_MODULE_DISTRIBUTION,
          difficultyDistribution: MODULE_1_DIFFICULTY_MIX,
        },
        {
          moduleNumber: 2,
          operationalQuestions: 25,
          pretestQuestions: 2,
          totalQuestions: 27,
          timeMinutes: 30,
          domainDistribution: RW_MODULE_DISTRIBUTION,
          difficultyDistribution: MODULE_2_EASIER_MIX,
        },
      ],
      breakAfter: false,
      breakDurationMinutes: 0,
    },
    {
      section: "math",
      modules: [
        {
          moduleNumber: 1,
          operationalQuestions: 18,
          pretestQuestions: 2,
          totalQuestions: 20,
          timeMinutes: 32,
          domainDistribution: MATH_MODULE_DISTRIBUTION,
          difficultyDistribution: MODULE_1_DIFFICULTY_MIX,
        },
        {
          moduleNumber: 2,
          operationalQuestions: 18,
          pretestQuestions: 2,
          totalQuestions: 20,
          timeMinutes: 32,
          domainDistribution: MATH_MODULE_DISTRIBUTION,
          difficultyDistribution: MODULE_2_EASIER_MIX,
        },
      ],
      breakAfter: true,
      breakDurationMinutes: 10,
    },
  ],
  totalQuestions: 94,
  totalTimeMinutes: 124,
  breakDurationMinutes: 10,
  totalTimeWithBreaksMinutes: 134,
};

// ─── PSAT 8/9 Blueprint ───────────────────────────────────────────────────────

/**
 * PSAT 8/9 Digital Test Blueprint
 *
 * Reading & Writing Section:
 *   Module 1: 24 operational + 2 pretest = 26 questions, 30 minutes
 *   Module 2: 24 operational + 2 pretest = 26 questions, 30 minutes
 *   Total: 52 questions, 60 minutes
 *
 * Math Section:
 *   Module 1: 18 operational + 2 pretest = 20 questions, 30 minutes
 *   Module 2: 18 operational + 2 pretest = 20 questions, 30 minutes
 *   Total: 40 questions, 60 minutes
 *
 * Break: 10 minutes between sections
 * Total: 92 questions, 120 minutes testing + 10 minutes break = 130 minutes
 */
export const PSAT_89_TEST_BLUEPRINT: FullLengthTestBlueprint = {
  assessment: "PSAT",
  sections: [
    {
      section: "reading-writing",
      modules: [
        {
          moduleNumber: 1,
          operationalQuestions: 24,
          pretestQuestions: 2,
          totalQuestions: 26,
          timeMinutes: 30,
          domainDistribution: RW_MODULE_DISTRIBUTION,
          difficultyDistribution: MODULE_1_DIFFICULTY_MIX,
        },
        {
          moduleNumber: 2,
          operationalQuestions: 24,
          pretestQuestions: 2,
          totalQuestions: 26,
          timeMinutes: 30,
          domainDistribution: RW_MODULE_DISTRIBUTION,
          difficultyDistribution: MODULE_2_EASIER_MIX,
        },
      ],
      breakAfter: false,
      breakDurationMinutes: 0,
    },
    {
      section: "math",
      modules: [
        {
          moduleNumber: 1,
          operationalQuestions: 18,
          pretestQuestions: 2,
          totalQuestions: 20,
          timeMinutes: 30,
          domainDistribution: MATH_MODULE_DISTRIBUTION,
          difficultyDistribution: MODULE_1_DIFFICULTY_MIX,
        },
        {
          moduleNumber: 2,
          operationalQuestions: 18,
          pretestQuestions: 2,
          totalQuestions: 20,
          timeMinutes: 30,
          domainDistribution: MATH_MODULE_DISTRIBUTION,
          difficultyDistribution: MODULE_2_EASIER_MIX,
        },
      ],
      breakAfter: true,
      breakDurationMinutes: 10,
    },
  ],
  totalQuestions: 92,
  totalTimeMinutes: 120,
  breakDurationMinutes: 10,
  totalTimeWithBreaksMinutes: 130,
};

// ─── QA Blueprint ──────────────────────────────────────────────────────────────

/**
 * QA Test Blueprint — 5 questions per module, 5-minute timer.
 *
 * Used for quick QA testing of the full-length flow without sitting through
 * a full 98-question, 134-minute test. Domain distribution is scaled
 * proportionally from the real SAT blueprint.
 *
 * Only shown in development / QA mode via a special button on the intro screen.
 */
export const QA_SAT_TEST_BLUEPRINT: FullLengthTestBlueprint = {
  assessment: "SAT",
  sections: [
    {
      section: "reading-writing",
      modules: [
        {
          moduleNumber: 1,
          operationalQuestions: 4,
          pretestQuestions: 1,
          totalQuestions: 5,
          timeMinutes: 5,
          domainDistribution: { INI: 2, CAS: 1, EOI: 1, SEC: 1 },
          difficultyDistribution: MODULE_1_DIFFICULTY_MIX,
        },
        {
          moduleNumber: 2,
          operationalQuestions: 4,
          pretestQuestions: 1,
          totalQuestions: 5,
          timeMinutes: 5,
          domainDistribution: { INI: 2, CAS: 1, EOI: 1, SEC: 1 },
          difficultyDistribution: MODULE_2_EASIER_MIX,
        },
      ],
      breakAfter: false,
      breakDurationMinutes: 0,
    },
    {
      section: "math",
      modules: [
        {
          moduleNumber: 1,
          operationalQuestions: 4,
          pretestQuestions: 1,
          totalQuestions: 5,
          timeMinutes: 5,
          domainDistribution: { H: 2, P: 1, Q: 1, S: 1 },
          difficultyDistribution: MODULE_1_DIFFICULTY_MIX,
        },
        {
          moduleNumber: 2,
          operationalQuestions: 4,
          pretestQuestions: 1,
          totalQuestions: 5,
          timeMinutes: 5,
          domainDistribution: { H: 2, P: 1, Q: 1, S: 1 },
          difficultyDistribution: MODULE_2_EASIER_MIX,
        },
      ],
      breakAfter: true,
      breakDurationMinutes: 1,
    },
  ],
  totalQuestions: 20,
  totalTimeMinutes: 20,
  breakDurationMinutes: 1,
  totalTimeWithBreaksMinutes: 21,
};

// ─── Blueprint Lookup ──────────────────────────────────────────────────────────

/**
 * Map of assessment types to their test blueprints.
 * Used to look up the correct blueprint when starting a full-length test.
 */
export const TEST_BLUEPRINTS: Record<string, FullLengthTestBlueprint> = {
  SAT: SAT_TEST_BLUEPRINT,
  "PSAT/NMSQT": PSAT_NMSQT_TEST_BLUEPRINT,
  PSAT: PSAT_89_TEST_BLUEPRINT,
  "QA-SAT": QA_SAT_TEST_BLUEPRINT,
};

/**
 * Get the test blueprint for a given assessment type.
 * Returns the SAT blueprint as default if the assessment is not found.
 */
export function getTestBlueprint(
  assessment: string
): FullLengthTestBlueprint {
  return TEST_BLUEPRINTS[assessment] ?? SAT_TEST_BLUEPRINT;
}

/**
 * Get a specific module config from a blueprint.
 * Returns null if the section or module number is out of range.
 */
export function getModuleConfig(
  blueprint: FullLengthTestBlueprint,
  section: "reading-writing" | "math",
  moduleNumber: 1 | 2
): FullLengthModuleConfig | null {
  const sectionConfig = blueprint.sections.find(
    (s) => s.section === section
  );
  if (!sectionConfig) return null;

  const moduleIndex = moduleNumber - 1; // 0-based index
  return sectionConfig.modules[moduleIndex] ?? null;
}

/**
 * Get a section config from a blueprint.
 * Returns null if the section is not found.
 */
export function getSectionConfig(
  blueprint: FullLengthTestBlueprint,
  section: "reading-writing" | "math"
): FullLengthSectionConfig | null {
  return blueprint.sections.find((s) => s.section === section) ?? null;
}

// ─── SPR/MCQ Ratio ────────────────────────────────────────────────────────────

/**
 * Question type ratio for Math modules.
 * R&W modules are 100% MCQ.
 * Math modules are approximately 70% MCQ, 30% SPR.
 */
export const MATH_QUESTION_TYPE_RATIO = {
  mcq: 0.7,
  spr: 0.3,
} as const;

/**
 * Question type ratio for Reading & Writing modules.
 * All questions are multiple choice.
 */
export const RW_QUESTION_TYPE_RATIO = {
  mcq: 1.0,
  spr: 0.0,
} as const;

/**
 * Get the question type ratio for a given section.
 */
export function getQuestionTypeRatio(
  section: "reading-writing" | "math"
): { mcq: number; spr: number } {
  return section === "reading-writing"
    ? RW_QUESTION_TYPE_RATIO
    : MATH_QUESTION_TYPE_RATIO;
}