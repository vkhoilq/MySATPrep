# Full-Length SAT Practice — Implementation Plan

## Digital SAT Test Structure (Reference)

| Section | Module | Questions | Time | Content |
|---------|--------|-----------|------|---------|
| Reading & Writing | Module 1 | 27 (25 operational + 2 pretest) | 32 min | Mix of E/M/H across all 4 domains |
| Reading & Writing | Module 2 | 27 (25 operational + 2 pretest) | 32 min | Easier or harder based on Module 1 |
| *Break* | — | — | 10 min | — |
| Math | Module 1 | 22 (20 operational + 2 pretest) | 35 min | Mix of E/M/H across all 4 domains |
| Math | Module 2 | 22 (20 operational + 2 pretest) | 35 min | Easier or harder based on Module 1 |

**Total: 98 questions, 2h 14min** (plus 10-min break = 2h 24min)

**Adaptive model**: Module 2 difficulty adapts based on Module 1 performance. ~60% correct threshold routes to harder Module 2.

**Domain distribution per R&W module**: ~6-7 questions per domain (INI, CAS, EOI, SEC), arranged easiest→hardest.

**Domain distribution per Math module**: ~5-6 questions per domain (Algebra, Advanced Math, Problem-Solving, Geometry), arranged easiest→hardest.

**Question types**: R&W is all MCQ; Math is ~70% MCQ, ~30% SPR.

---

## Phase 0: Foundation — Types & Constants

### 0.1 New types in `src/types/full-length.ts`

```
FullLengthTestConfig       — Which assessment (SAT/PSAT/NMSQT/PSAT 8/9)
FullLengthSection          — "reading-writing" | "math"
FullLengthModule           — 1 | 2
FullLengthModuleDifficulty — "easier" | "harder" (Module 2 only)
FullLengthModuleConfig     — section, module number, question count, time limit, domain distribution
FullLengthQuestionSlot     — position in test, section, module, domain, difficulty, questionType (mcq/spr)
FullLengthTestState        — current section, current module, current question index, timer state, answers per module
FullLengthSectionResult    — answers, times, correct count per section
FullLengthTestResult        — overall score estimate, section breakdowns, per-domain performance
```

### 0.2 New constants in `src/static-data/full-length.ts`

SAT test blueprint:
```typescript
export const SAT_TEST_BLUEPRINT = {
  sections: [
    {
      section: "reading-writing",
      modules: [
        { module: 1, operationalQuestions: 25, pretestQuestions: 2, timeMinutes: 32 },
        { module: 2, operationalQuestions: 25, pretestQuestions: 2, timeMinutes: 32 },
      ],
      breakAfter: false, // no break between modules within a section
    },
    {
      section: "math",
      modules: [
        { module: 1, operationalQuestions: 20, pretestQuestions: 2, timeMinutes: 35 },
        { module: 2, operationalQuestions: 20, pretestQuestions: 2, timeMinutes: 35 },
      ],
      breakAfter: true, // 10-min break before this section
    },
  ],
  breakDurationMinutes: 10,
  totalQuestions: 98,
  totalTimeMinutes: 134,
} as const;
```

Domain distribution per module (approximate):
```typescript
export const RW_MODULE_DISTRIBUTION = {
  INI: 7, // Information & Ideas
  CAS: 7, // Craft & Structure
  EOI: 7, // Expression of Ideas
  SEC: 6, // Standard English Conventions
} as const;

export const MATH_MODULE_DISTRIBUTION = {
  H: 6, // Algebra
  P: 6, // Advanced Math
  Q: 5, // Problem-Solving & Data Analysis
  S: 5, // Geometry & Trigonometry
} as const;
```

Difficulty distribution per module:
```typescript
export const MODULE_1_DIFFICULTY_MIX = { E: 0.33, M: 0.34, H: 0.33 }; // ~1/3 each
export const MODULE_2_EASIER_MIX = { E: 0.40, M: 0.40, H: 0.20 };
export const MODULE_2_HARDER_MIX = { E: 0.20, M: 0.40, H: 0.40 };
```

Also add PSAT/NMSQT and PSAT 8/9 blueprints.

---

## Phase 1: Question Selection Engine

### 1.1 New file: `src/lib/full-length/questionSelector.ts`

**Purpose**: Given a test blueprint and available questions from College Board, select the right questions for each module.

**Algorithm**:
1. Fetch all available questions for the assessment from `/api/get-questions` (filtered by subject + assessment)
2. For each module slot, select questions matching the domain/difficulty distribution
3. Within each domain, order questions easiest→hardest (matching real SAT)
4. For Module 2, determine easier/harder path based on Module 1 performance (~60% correct = harder module)
5. Handle SPR/MCQ ratio for Math modules (~30% SPR)
6. Mark 2 questions per module as pretest (unscored, randomly selected)

**Key function signatures**:
```typescript
selectQuestionsForModule(params: {
  section: FullLengthSection;
  moduleNumber: 1 | 2;
  difficulty: FullLengthModuleDifficulty;
  availableQuestions: PlainQuestionType[];
  domainDistribution: Record<string, number>;
}): FullLengthQuestionSlot[]

determineModule2Difficulty(module1Answers: QuestionAnswers): "easier" | "harder"
```

### 1.2 New file: `src/lib/full-length/scoring.ts`

**Purpose**: Approximate SAT scoring from raw answers.

- Raw score → scaled score approximation (200-800 per section)
- Use a simplified IRT-like model based on difficulty-weighted correct answers
- Per-domain breakdown
- This won't be exact College Board scoring (that's proprietary) but a reasonable approximation

---

## Phase 2: Full-Length Session State Management

### 2.1 New file: `src/types/full-length-session.ts`

Extend `PracticeSession` for full-length specifics:

```typescript
interface FullLengthSession extends PracticeSession {
  practiceType: "full-length";
  testConfig: FullLengthTestConfig;
  currentSection: FullLengthSection;      // "reading-writing" | "math"
  currentModule: 1 | 2;
  moduleState: {
    [key: `${FullLengthSection}-${1|2}`]: {
      status: "not_started" | "in_progress" | "completed";
      timeRemaining: number;  // ms
      questionOrder: string[]; // question IDs in order
      answers: QuestionAnswers;
      times: QuestionTimes;
    };
  };
  module2Difficulty: {
    "reading-writing"?: "easier" | "harder";
    "math"?: "easier" | "harder";
  };
  sectionResults: FullLengthSectionResult[];
  breakTaken: boolean;
}
```

### 2.2 New file: `src/lib/full-length/fullLengthReducer.ts`

A new reducer (separate from the rush reducer) managing full-length state:

**Action types**:
```
START_SECTION         — Begin a section (RW or Math)
START_MODULE          — Begin a module within a section
SET_QUESTION_ANSWER   — Record an answer
NAVIGATE_QUESTION     — Move to a different question within the module
COMPLETE_MODULE       — Finish a module, calculate Module 2 difficulty
START_BREAK           — Enter the 10-minute break
COMPLETE_BREAK        — End the break
COMPLETE_SECTION      — Finish a section
COMPLETE_TEST         — Finish the entire test
TICK_TIMER            — Decrement the section/module timer
PAUSE_TEST            — Pause (for breaks between sessions)
RESUME_TEST           — Resume after pause
```

**Key differences from rush reducer**:
- Section-level countdown timer (not per-question)
- Module-gated navigation (can't go back to Module 1 from Module 2)
- Free navigation within a module (can go forward/backward)
- Question flagging for review
- Module 2 difficulty determined after Module 1 completion

---

## Phase 3: Full-Length Practice Component

### 3.1 New file: `src/components/full-length/FullLengthTest.tsx`

**The main orchestrator component** (~800-1200 lines). Manages the entire test flow:

**UI States** (rendered as steps):
1. `TEST_INTRO` — Show test overview, rules, timing, start button
2. `SECTION_INTRO` — "Reading & Writing Section — Module 1" splash screen
3. `MODULE_IN_PROGRESS` — Active question answering with section timer
4. `MODULE_REVIEW` — Review flagged questions before submitting module
5. `MODULE_COMPLETE` — Module submitted, brief pause
6. `BREAK` — 10-minute break countdown between sections
7. `TEST_COMPLETE` — Show results

**Component structure**:
```
FullLengthTest
├── TestIntroScreen
├── SectionIntroScreen
├── ModuleInProgress
│   ├── SectionTimer (countdown)
│   ├── QuestionNavigator (question grid, flag for review)
│   ├── QuestionDisplay (reuses existing question rendering)
│   └── AnswerInput (MCQ or SPR)
├── ModuleReviewScreen
├── BreakScreen
└── TestResultsScreen
```

### 3.2 New file: `src/components/full-length/SectionTimer.tsx`

- Countdown timer showing remaining time for the current module
- Warning colors at 5 min, 1 min remaining
- Auto-submit module when time expires
- Pause/resume not allowed (realistic test simulation)

### 3.3 New file: `src/components/full-length/QuestionNavigator.tsx`

- Grid of question numbers (1-27 for RW, 1-22 for Math)
- Color coding: answered (green), flagged (yellow), current (blue), unanswered (gray)
- Click to navigate to any question within the current module
- "Flag for review" toggle per question

### 3.4 New file: `src/components/full-length/TestResultsScreen.tsx`

- Estimated SAT score (200-800 per section, 400-1600 total)
- Per-section breakdown (correct/incorrect/skipped)
- Per-domain performance (radar chart using Recharts)
- Time management analysis (avg time per question vs target)
- Comparison with Practice Rush statistics
- Option to review all questions with explanations

---

## Phase 4: Onboarding Flow Changes

### 4.1 Modify `src/components/practice-onboarding.tsx`

**Changes**:
- Remove `disabled: true` from the "Full Length Practice" option
- When `practiceType === "full-length"` is selected:
  - Skip Step 3 (subject selection) — full-length covers both subjects
  - Skip Step 4 (domain/skill/difficulty selection) — the test blueprint determines these
  - Show a confirmation screen with test overview (98 questions, 2h 14min, 4 modules)
  - Add assessment selection (SAT only initially, PSAT options grayed out / coming soon)

**New onboarding flow for full-length**:
```
Step 1: Choose Practice Method → "Full Length Practice"
Step 2: Choose Assessment → SAT (PSAT options grayed out / coming soon)
Step 3: Test Overview → Show blueprint summary, confirm start
```

### 4.2 Modify `src/components/practice.tsx`

**Changes**:
- When `practiceSelections.practiceType === "full-length"`, render `FullLengthTest` instead of `PracticeRushMultistep`
- Pass `practiceSelections` and `onSessionComplete` props
- Handle session restoration for full-length sessions (separate localStorage key)

---

## Phase 5: API & Data Layer

### 5.1 New API route: `src/app/api/full-length/questions/route.ts`

**Purpose**: Fetch a curated set of questions matching the SAT blueprint.

```typescript
POST /api/full-length/questions
Body: {
  assessment: "SAT",
  section: "reading-writing" | "math",
  moduleNumber: 1 | 2,
  difficulty: "easier" | "harder" | "mixed",  // mixed for Module 1
  domainDistribution: { INI: 7, CAS: 7, EOI: 7, SEC: 6 }
}
Response: {
  questions: PlainQuestionType[],  // pre-selected, ordered
  moduleConfig: { timeMinutes: 32, totalQuestions: 27 }
}
```

This endpoint:
1. Queries the question bank for available questions matching the criteria
2. Selects questions per domain per difficulty bucket
3. Orders them easiest→hardest within each domain group
4. Returns the curated module question set

### 5.2 Modify question fetching for full-length

The existing `/api/get-questions` endpoint returns question metadata. For full-length, we need:
- Fetch enough questions per domain/difficulty to fill all modules
- Cache the full question set for the test duration
- Fetch individual question details lazily (only when the user reaches that question)

---

## Phase 6: Session Persistence & Restoration

### 6.1 New storage keys

```typescript
// In addition to existing keys
FULL_LENGTH_CURRENT_SESSION: "fullLengthCurrentSession"
FULL_LENGTH_SESSION_HISTORY: "fullLengthSessionHistory"
```

### 6.2 Auto-save strategy

- Save after every answer (debounced 1s)
- Save timer state every 5 seconds
- Save on module completion
- Save on section completion
- Handle page refresh / accidental close via `beforeunload`

### 6.3 Session restoration

On app load, check for `fullLengthCurrentSession`:
- If found, show "Resume Full-Length Practice" dialog
- Restore exact position: section, module, question index, timer state
- Re-fetch any question details that weren't cached

---

## Phase 7: Results & Analytics

### 7.1 New file: `src/lib/full-length/results.ts`

Calculate:
- Raw score per section (correct out of operational questions, excluding pretest)
- Estimated scaled score per section (200-800)
- Estimated total score (400-1600)
- Per-domain accuracy percentage
- Time management metrics

### 7.2 Integrate with existing statistics

- Save full-length results to `practiceStatistics` with a `fullLength` flag
- Show full-length history in dashboard sessions tab
- Add a "Full Length" filter/badge in the sessions view

---

## Implementation Order & Estimates

| Phase | Description | Effort | Priority |
|-------|-------------|-------|----------|
| **0** | Types & constants (blueprint, configs) | 1-2 days | Must-do first |
| **1** | Question selection engine & scoring | 2-3 days | Must-do |
| **2** | Full-length session state (reducer) | 2-3 days | Must-do |
| **3** | Full-length UI components | 3-5 days | Must-do |
| **4** | Onboarding flow changes | 1 day | Must-do |
| **5** | API route for curated questions | 1-2 days | Must-do |
| **6** | Session persistence & restoration | 1-2 days | Must-do |
| **7** | Results & analytics integration | 1-2 days | Must-do |

**Total estimate: 12-20 days**

---

## Key Architectural Decisions

1. **Separate component, not extending PracticeRushMultistep** — The rush component is already ~4300 lines. Full-length has fundamentally different UX (section timer, module gating, question navigation grid, break screens). A new component tree is cleaner.

2. **Separate reducer** — The rush reducer has 20+ action types for rush-specific behavior. Full-length needs different actions (module transitions, section breaks, flag-for-review). Sharing would create tangled conditionals.

3. **Module 2 difficulty is determined locally** — After Module 1 completion, count correct answers. ≥60% correct → harder Module 2. <60% → easier Module 2. This is a simplification of College Board's proprietary IRT model but provides a realistic experience.

4. **Pretest questions are real questions marked as unscored** — We don't have actual pretest questions from College Board. We'll randomly designate 2 questions per module as "pretest" (still answered, but not counted in scoring).

5. **Question ordering: domain-grouped, easiest→hardest** — Matches the real SAT's question arrangement within each module.

6. **SAT first, PSAT later** — The onboarding will initially only enable SAT for full-length. PSAT/NMSQT and PSAT 8/9 blueprints can be added later with minimal changes (different question counts and time limits).

7. **Scoring is an approximation** — We can't replicate College Board's exact IRT scoring. We'll use a difficulty-weighted raw score → scaled score mapping that gives reasonable estimates.

---

## Current Codebase Scaffolding

| Component | Full-Length Support |
|-----------|---------------------|
| `validPracticeTypes` | ✅ Includes "full-length" |
| `practice-onboarding.tsx` | ✅ Has full-length option, but **disabled** |
| `PracticeSelections` type | ✅ Supports any string for `practiceType` |
| `PracticeRushMultistep` | ⚠️ No special full-length handling — runs same flow |
| `practice.tsx` URL params | ✅ Accepts "full-length" as valid type |
| `ShareModal` | ✅ Includes practiceType in share URL |
| **Actual full-length logic** | ❌ **None implemented** |

### Files that need modification

- `src/components/practice-onboarding.tsx` — Enable full-length option, add conditional steps
- `src/components/practice.tsx` — Route to FullLengthTest when practiceType is "full-length"
- `src/static-data/validation.ts` — Already has "full-length" in validPracticeTypes

### New files to create

- `src/types/full-length.ts` — Type definitions
- `src/types/full-length-session.ts` — Session types
- `src/static-data/full-length.ts` — Test blueprint constants
- `src/lib/full-length/questionSelector.ts` — Question selection algorithm
- `src/lib/full-length/scoring.ts` — Score approximation
- `src/lib/full-length/fullLengthReducer.ts` — State management reducer
- `src/lib/full-length/results.ts` — Results calculation
- `src/components/full-length/FullLengthTest.tsx` — Main orchestrator
- `src/components/full-length/SectionTimer.tsx` — Countdown timer
- `src/components/full-length/QuestionNavigator.tsx` — Question grid navigation
- `src/components/full-length/TestResultsScreen.tsx` — Results display
- `src/app/api/full-length/questions/route.ts` — Curated question API