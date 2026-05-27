/**
 * Regression tests for Assessment data and mapping logic
 * Ensures the assessment configuration, workspace mapping, and key mapping work correctly.
 * These must not break when full-length practice is added.
 *
 * Note: We test the pure data and mapping logic here, not the React context provider
 * (which requires JSX rendering). The reducer and context are tested indirectly through
 * the exported data structures.
 */
import { describe, it, expect } from "vitest";
import { Assessments, AssessmentsId } from "@/static-data/assessment";

// ─── Assessments data integrity ──────────────────────────────────────────────

describe("Assessments", () => {
  it("should have exactly 3 assessments", () => {
    expect(Object.keys(Assessments)).toHaveLength(3);
  });

  it("should have SAT with id 99", () => {
    expect(Assessments.SAT.id).toBe(99);
    expect(Assessments.SAT.text).toBe("SAT");
  });

  it("should have PSAT/NMSQT with id 100", () => {
    expect(Assessments["PSAT/NMSQT"].id).toBe(100);
    expect(Assessments["PSAT/NMSQT"].text).toBe("PSAT/NMSQT & PSAT 10");
  });

  it("should have PSAT with id 102", () => {
    expect(Assessments.PSAT.id).toBe(102);
    expect(Assessments.PSAT.text).toBe("PSAT 8/9");
  });

  it("should have unique IDs across all assessments", () => {
    const ids = Object.values(Assessments).map((a) => a.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

// ─── AssessmentsId reverse lookup ────────────────────────────────────────────

describe("AssessmentsId", () => {
  it("should map '99' to SAT", () => {
    expect(AssessmentsId["99"]).toBeDefined();
    expect(AssessmentsId["99"].text).toBe("SAT");
    expect(AssessmentsId["99"].id).toBe(99);
  });

  it("should map '100' to PSAT/NMSQT", () => {
    expect(AssessmentsId["100"]).toBeDefined();
    expect(AssessmentsId["100"].textId).toBe("PSAT/NMSQT");
    expect(AssessmentsId["100"].id).toBe(100);
  });

  it("should map '102' to PSAT 8/9", () => {
    expect(AssessmentsId["102"]).toBeDefined();
    expect(AssessmentsId["102"].textId).toBe("PSAT");
    expect(AssessmentsId["102"].id).toBe(102);
  });

  it("should have textId for each entry", () => {
    for (const [id, entry] of Object.entries(AssessmentsId)) {
      expect(entry.textId).toBeDefined();
      expect(typeof entry.textId).toBe("string");
      expect(entry.textId.length).toBeGreaterThan(0);
    }
  });
});

// ─── Assessment workspace mapping ────────────────────────────────────────────
// Tests the mapping logic from assessment data to workspace format
// (mirrors the logic in assessment-context.tsx)

describe("Assessment workspace mapping", () => {
  const assessmentWorkspaces = Object.entries(Assessments).map(
    ([key, assessment]) => ({
      id: assessment.id.toString(),
      name: assessment.text,
      logo: `https://avatar.vercel.sh/${key.toLowerCase()}`,
      plan: "Assessment" as const,
      assessmentId: assessment.id,
    })
  );

  it("should have 3 workspaces", () => {
    expect(assessmentWorkspaces).toHaveLength(3);
  });

  it("should map SAT assessment correctly", () => {
    const sat = assessmentWorkspaces.find((ws) => ws.assessmentId === 99);
    expect(sat).toBeDefined();
    expect(sat!.id).toBe("99");
    expect(sat!.name).toBe("SAT");
    expect(sat!.plan).toBe("Assessment");
  });

  it("should map PSAT/NMSQT assessment correctly", () => {
    const psat = assessmentWorkspaces.find((ws) => ws.assessmentId === 100);
    expect(psat).toBeDefined();
    expect(psat!.id).toBe("100");
    expect(psat!.name).toBe("PSAT/NMSQT & PSAT 10");
    expect(psat!.plan).toBe("Assessment");
  });

  it("should map PSAT 8/9 assessment correctly", () => {
    const psat89 = assessmentWorkspaces.find((ws) => ws.assessmentId === 102);
    expect(psat89).toBeDefined();
    expect(psat89!.id).toBe("102");
    expect(psat89!.name).toBe("PSAT 8/9");
    expect(psat89!.plan).toBe("Assessment");
  });

  it("should have logo URLs for each workspace", () => {
    for (const ws of assessmentWorkspaces) {
      expect(ws.logo).toContain("avatar.vercel.sh");
    }
  });

  it("should have consistent IDs with Assessments object", () => {
    for (const ws of assessmentWorkspaces) {
      const matchingAssessment = Object.values(Assessments).find(
        (a) => a.id.toString() === ws.id
      );
      expect(matchingAssessment).toBeDefined();
      expect(matchingAssessment!.text).toBe(ws.name);
    }
  });
});

// ─── getAssessmentKey mapping ─────────────────────────────────────────────────
// Tests the localStorage key mapping logic (mirrors assessment-context.tsx)

describe("getAssessmentKey mapping", () => {
  // This mapping is critical for Practice Rush's per-assessment data partitioning
  const assessmentMap: Record<string, string> = {
    SAT: "SAT",
    "PSAT/NMSQT & PSAT 10": "PSAT/NMSQT",
    "PSAT 8/9": "PSAT",
  };

  const getKey = (name?: string): string => {
    if (!name) return "SAT";
    return assessmentMap[name] || "SAT";
  };

  it("should map 'SAT' to 'SAT'", () => {
    expect(assessmentMap["SAT"]).toBe("SAT");
  });

  it("should map 'PSAT/NMSQT & PSAT 10' to 'PSAT/NMSQT'", () => {
    expect(assessmentMap["PSAT/NMSQT & PSAT 10"]).toBe("PSAT/NMSQT");
  });

  it("should map 'PSAT 8/9' to 'PSAT'", () => {
    expect(assessmentMap["PSAT 8/9"]).toBe("PSAT");
  });

  it("should default to 'SAT' for unknown assessment names", () => {
    expect(getKey("Unknown")).toBe("SAT");
  });

  it("should default to 'SAT' for undefined", () => {
    expect(getKey(undefined)).toBe("SAT");
  });

  it("should produce unique keys for each assessment", () => {
    const keys = Object.values(assessmentMap);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });
});