import { describe, it, expect } from "vitest";
import {
  validSkillCds,
  mathDomains,
  rwDomains,
  mathSkillPrefixes,
  rwSkillCds,
  validSubjects,
  validPracticeTypes,
} from "@/static-data/validation";
import { Assessments, AssessmentsId } from "@/static-data/assessment";
import {
  domains,
  getSubjectBySkillCd,
  getSubjectByPrimaryClassCd,
  skillCdsObjectData,
  primaryClassCdObjectData,
} from "@/static-data/domains";

// ---------------------------------------------------------------------------
// validSkillCds
// ---------------------------------------------------------------------------

describe("validSkillCds", () => {
  it("is an array with length > 0", () => {
    expect(Array.isArray(validSkillCds)).toBe(true);
    expect(validSkillCds.length).toBeGreaterThan(0);
  });

  it("contains expected R&W skill codes", () => {
    expect(validSkillCds).toContain("CID");
    expect(validSkillCds).toContain("INF");
  });

  it("contains expected Math skill codes (with dot notation)", () => {
    expect(validSkillCds).toContain("H.A.");
    expect(validSkillCds).toContain("Q.C.");
  });

  it("contains all 29 skill codes", () => {
    expect(validSkillCds).toHaveLength(29);
  });

  it("all values are strings", () => {
    validSkillCds.forEach((cd) => {
      expect(typeof cd).toBe("string");
    });
  });
});

// ---------------------------------------------------------------------------
// mathDomains
// ---------------------------------------------------------------------------

describe("mathDomains", () => {
  it("is ['H', 'P', 'Q', 'S']", () => {
    expect(mathDomains).toEqual(["H", "P", "Q", "S"]);
  });

  it("has exactly 4 entries", () => {
    expect(mathDomains).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// rwDomains
// ---------------------------------------------------------------------------

describe("rwDomains", () => {
  it("is ['INI', 'CAS', 'EOI', 'SEC']", () => {
    expect(rwDomains).toEqual(["INI", "CAS", "EOI", "SEC"]);
  });

  it("has exactly 4 entries", () => {
    expect(rwDomains).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// mathSkillPrefixes
// ---------------------------------------------------------------------------

describe("mathSkillPrefixes", () => {
  it("is ['H.', 'P.', 'Q.', 'S.']", () => {
    expect(mathSkillPrefixes).toEqual(["H.", "P.", "Q.", "S."]);
  });

  it("has exactly 4 entries", () => {
    expect(mathSkillPrefixes).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// rwSkillCds
// ---------------------------------------------------------------------------

describe("rwSkillCds", () => {
  it("contains all 10 R&W skill codes", () => {
    expect(rwSkillCds).toEqual([
      "CID",
      "INF",
      "COE",
      "WIC",
      "TSP",
      "CTC",
      "SYN",
      "TRA",
      "BOU",
      "FSS",
    ]);
  });

  it("has exactly 10 entries", () => {
    expect(rwSkillCds).toHaveLength(10);
  });
});

// ---------------------------------------------------------------------------
// validSubjects
// ---------------------------------------------------------------------------

describe("validSubjects", () => {
  it("is ['math', 'reading-writing']", () => {
    expect(validSubjects).toEqual(["math", "reading-writing"]);
  });

  it("has exactly 2 entries", () => {
    expect(validSubjects).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// validPracticeTypes
// ---------------------------------------------------------------------------

describe("validPracticeTypes", () => {
  it("is ['rush', 'full-length']", () => {
    expect(validPracticeTypes).toEqual(["rush", "full-length"]);
  });

  it("MUST include 'rush' (regression: Practice Rush must remain valid)", () => {
    expect(validPracticeTypes).toContain("rush");
  });

  it("has exactly 2 entries", () => {
    expect(validPracticeTypes).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Assessments
// ---------------------------------------------------------------------------

describe("Assessments", () => {
  it("has SAT with id 99", () => {
    expect(Assessments.SAT).toBeDefined();
    expect(Assessments.SAT.id).toBe(99);
    expect(Assessments.SAT.text).toBe("SAT");
  });

  it("has PSAT/NMSQT with id 100", () => {
    expect(Assessments["PSAT/NMSQT"]).toBeDefined();
    expect(Assessments["PSAT/NMSQT"].id).toBe(100);
  });

  it("has PSAT with id 102", () => {
    expect(Assessments.PSAT).toBeDefined();
    expect(Assessments.PSAT.id).toBe(102);
  });
});

// ---------------------------------------------------------------------------
// AssessmentsId
// ---------------------------------------------------------------------------

describe("AssessmentsId", () => {
  it("maps '99' to SAT", () => {
    expect(AssessmentsId["99"]).toBeDefined();
    expect(AssessmentsId["99"].textId).toBe("SAT");
  });

  it("maps '100' to PSAT/NMSQT", () => {
    expect(AssessmentsId["100"]).toBeDefined();
    expect(AssessmentsId["100"].textId).toBe("PSAT/NMSQT");
  });

  it("maps '102' to PSAT", () => {
    expect(AssessmentsId["102"]).toBeDefined();
    expect(AssessmentsId["102"].textId).toBe("PSAT");
  });
});

// ---------------------------------------------------------------------------
// domains
// ---------------------------------------------------------------------------

describe("domains", () => {
  it("has 'R&W' and 'Math' keys", () => {
    expect(domains).toHaveProperty("R&W");
    expect(domains).toHaveProperty("Math");
  });

  it("R&W has 4 domains (INI, CAS, EOI, SEC)", () => {
    const rw = domains["R&W"];
    expect(rw).toHaveLength(4);
    expect(rw[0].primaryClassCd).toBe("INI");
    expect(rw[1].primaryClassCd).toBe("CAS");
    expect(rw[2].primaryClassCd).toBe("EOI");
    expect(rw[3].primaryClassCd).toBe("SEC");
  });

  it("Math has 4 domains (H, P, Q, S)", () => {
    const math = domains.Math;
    expect(math).toHaveLength(4);
    expect(math[0].primaryClassCd).toBe("H");
    expect(math[1].primaryClassCd).toBe("P");
    expect(math[2].primaryClassCd).toBe("Q");
    expect(math[3].primaryClassCd).toBe("S");
  });
});

// ---------------------------------------------------------------------------
// getSubjectBySkillCd
// ---------------------------------------------------------------------------

describe("getSubjectBySkillCd", () => {
  it("returns 'reading-writing' for 'CID'", () => {
    expect(getSubjectBySkillCd("CID")).toBe("reading-writing");
  });

  it("returns 'reading-writing' for 'INF'", () => {
    expect(getSubjectBySkillCd("INF")).toBe("reading-writing");
  });

  it("returns 'reading-writing' for 'COE'", () => {
    expect(getSubjectBySkillCd("COE")).toBe("reading-writing");
  });

  it("returns 'reading-writing' for 'WIC'", () => {
    expect(getSubjectBySkillCd("WIC")).toBe("reading-writing");
  });

  it("returns 'reading-writing' for 'TSP'", () => {
    expect(getSubjectBySkillCd("TSP")).toBe("reading-writing");
  });

  it("returns 'reading-writing' for 'CTC'", () => {
    expect(getSubjectBySkillCd("CTC")).toBe("reading-writing");
  });

  it("returns 'reading-writing' for 'SYN'", () => {
    expect(getSubjectBySkillCd("SYN")).toBe("reading-writing");
  });

  it("returns 'reading-writing' for 'TRA'", () => {
    expect(getSubjectBySkillCd("TRA")).toBe("reading-writing");
  });

  it("returns 'reading-writing' for 'BOU'", () => {
    expect(getSubjectBySkillCd("BOU")).toBe("reading-writing");
  });

  it("returns 'reading-writing' for 'FSS'", () => {
    expect(getSubjectBySkillCd("FSS")).toBe("reading-writing");
  });

  it("returns 'math' for 'H.A.'", () => {
    expect(getSubjectBySkillCd("H.A.")).toBe("math");
  });

  it("returns 'math' for 'P.A.'", () => {
    expect(getSubjectBySkillCd("P.A.")).toBe("math");
  });

  it("returns 'math' for 'Q.C.'", () => {
    expect(getSubjectBySkillCd("Q.C.")).toBe("math");
  });

  it("returns 'math' for 'S.D.'", () => {
    expect(getSubjectBySkillCd("S.D.")).toBe("math");
  });

  it("returns undefined for unknown skill codes", () => {
    expect(getSubjectBySkillCd("UNKNOWN")).toBeUndefined();
    expect(getSubjectBySkillCd("")).toBeUndefined();
    expect(getSubjectBySkillCd("XYZ")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getSubjectByPrimaryClassCd
// ---------------------------------------------------------------------------

describe("getSubjectByPrimaryClassCd", () => {
  it("returns 'reading-writing' for 'INI'", () => {
    expect(getSubjectByPrimaryClassCd("INI")).toBe("reading-writing");
  });

  it("returns 'reading-writing' for 'CAS'", () => {
    expect(getSubjectByPrimaryClassCd("CAS")).toBe("reading-writing");
  });

  it("returns 'reading-writing' for 'EOI'", () => {
    expect(getSubjectByPrimaryClassCd("EOI")).toBe("reading-writing");
  });

  it("returns 'reading-writing' for 'SEC'", () => {
    expect(getSubjectByPrimaryClassCd("SEC")).toBe("reading-writing");
  });

  it("returns 'math' for 'H'", () => {
    expect(getSubjectByPrimaryClassCd("H")).toBe("math");
  });

  it("returns 'math' for 'P'", () => {
    expect(getSubjectByPrimaryClassCd("P")).toBe("math");
  });

  it("returns 'math' for 'Q'", () => {
    expect(getSubjectByPrimaryClassCd("Q")).toBe("math");
  });

  it("returns 'math' for 'S'", () => {
    expect(getSubjectByPrimaryClassCd("S")).toBe("math");
  });

  it("returns undefined for unknown codes", () => {
    expect(getSubjectByPrimaryClassCd("UNKNOWN")).toBeUndefined();
    expect(getSubjectByPrimaryClassCd("")).toBeUndefined();
    expect(getSubjectByPrimaryClassCd("XYZ")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// skillCdsObjectData
// ---------------------------------------------------------------------------

describe("skillCdsObjectData", () => {
  it("is a non-empty object", () => {
    expect(skillCdsObjectData).toBeDefined();
    expect(typeof skillCdsObjectData).toBe("object");
    expect(Object.keys(skillCdsObjectData).length).toBeGreaterThan(0);
  });

  it("each key maps to an object with text, id, skill_cd", () => {
    Object.values(skillCdsObjectData).forEach((entry) => {
      expect(entry).toHaveProperty("text");
      expect(entry).toHaveProperty("id");
      expect(entry).toHaveProperty("skill_cd");
      expect(typeof entry.text).toBe("string");
      expect(typeof entry.id).toBe("string");
      expect(typeof entry.skill_cd).toBe("string");
    });
  });

  it("contains a representative sample of skill codes", () => {
    expect(skillCdsObjectData["CID"]).toBeDefined();
    expect(skillCdsObjectData["CID"].skill_cd).toBe("CID");
    expect(skillCdsObjectData["H.A."]).toBeDefined();
    expect(skillCdsObjectData["H.A."].skill_cd).toBe("H.A.");
    expect(skillCdsObjectData["FSS"]).toBeDefined();
    expect(skillCdsObjectData["FSS"].skill_cd).toBe("FSS");
  });

  it("includes all validSkillCds as keys", () => {
    validSkillCds.forEach((cd) => {
      expect(skillCdsObjectData).toHaveProperty(cd);
    });
  });
});

// ---------------------------------------------------------------------------
// primaryClassCdObjectData
// ---------------------------------------------------------------------------

describe("primaryClassCdObjectData", () => {
  it("is a non-empty object", () => {
    expect(primaryClassCdObjectData).toBeDefined();
    expect(typeof primaryClassCdObjectData).toBe("object");
    expect(Object.keys(primaryClassCdObjectData).length).toBeGreaterThan(0);
  });

  it("each key maps to an object with subject, text, id, primaryClassCd", () => {
    Object.values(primaryClassCdObjectData).forEach((entry) => {
      expect(entry).toHaveProperty("subject");
      expect(entry).toHaveProperty("text");
      expect(entry).toHaveProperty("id");
      expect(entry).toHaveProperty("primaryClassCd");
      expect(typeof entry.subject).toBe("string");
      expect(typeof entry.text).toBe("string");
      expect(typeof entry.id).toBe("string");
      expect(typeof entry.primaryClassCd).toBe("string");
    });
  });

  it("maps R&W primaryClassCds with correct subjects (raw key 'R&W')", () => {
    // primaryClassCdObjectData stores the raw domain key, not the translated subject
    expect(primaryClassCdObjectData["INI"].subject).toBe("R&W");
    expect(primaryClassCdObjectData["CAS"].subject).toBe("R&W");
    expect(primaryClassCdObjectData["EOI"].subject).toBe("R&W");
    expect(primaryClassCdObjectData["SEC"].subject).toBe("R&W");
  });

  it("maps Math primaryClassCds with correct subjects (raw key 'Math')", () => {
    expect(primaryClassCdObjectData["H"].subject).toBe("Math");
    expect(primaryClassCdObjectData["P"].subject).toBe("Math");
    expect(primaryClassCdObjectData["Q"].subject).toBe("Math");
    expect(primaryClassCdObjectData["S"].subject).toBe("Math");
  });
});
