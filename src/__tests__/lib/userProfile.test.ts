import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateLevel,
  getXPForNextLevel,
  getLevelProgress,
} from "@/types/userProfile";
import {
  getUserProfile,
  saveUserProfile,
  addXPForCorrectAnswer,
  reduceXPForIncorrectAnswer,
  getXPStatistics,
  resetUserProfile,
} from "@/lib/userProfile";
import type { UserProfileWithHistory } from "@/types/userProfile";

const USER_PROFILE_KEY = "userProfile";

function setLocalStorage(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

describe("calculateLevel (from @/types/userProfile)", () => {
  it("returns 0 for 0 XP", () => {
    expect(calculateLevel(0)).toBe(0);
  });

  it("returns 0 for 99 XP (just below level 1)", () => {
    expect(calculateLevel(99)).toBe(0);
  });

  it("returns 1 for 100 XP (sqrt(1) = 1)", () => {
    expect(calculateLevel(100)).toBe(1);
  });

  it("returns 1 for 399 XP (sqrt(3.99) ≈ 1.997)", () => {
    expect(calculateLevel(399)).toBe(1);
  });

  it("returns 2 for 400 XP (sqrt(4) = 2)", () => {
    expect(calculateLevel(400)).toBe(2);
  });

  it("returns 3 for 900 XP (sqrt(9) = 3)", () => {
    expect(calculateLevel(900)).toBe(3);
  });

  it("returns 10 for 10000 XP (sqrt(100) = 10)", () => {
    expect(calculateLevel(10000)).toBe(10);
  });
});

describe("getXPForNextLevel (from @/types/userProfile)", () => {
  it("returns 100 for level 0 (1² × 100)", () => {
    expect(getXPForNextLevel(0)).toBe(100);
  });

  it("returns 400 for level 1 (2² × 100)", () => {
    expect(getXPForNextLevel(1)).toBe(400);
  });

  it("returns 900 for level 2 (3² × 100)", () => {
    expect(getXPForNextLevel(2)).toBe(900);
  });
});

describe("getLevelProgress (from @/types/userProfile)", () => {
  it("returns correct progress at 0 XP (level 0, 0% progress)", () => {
    const result = getLevelProgress(0);
    expect(result.currentLevel).toBe(0);
    expect(result.currentLevelXP).toBe(0);
    expect(result.nextLevelXP).toBe(100);
    expect(result.progressPercentage).toBe(0);
  });

  it("returns correct progress at 100 XP (level 1, 0% progress toward level 2)", () => {
    const result = getLevelProgress(100);
    expect(result.currentLevel).toBe(1);
    expect(result.currentLevelXP).toBe(100);
    expect(result.nextLevelXP).toBe(400);
    expect(result.progressPercentage).toBe(0);
  });

  it("returns correct progress at 250 XP (level 1, some % progress)", () => {
    const result = getLevelProgress(250);
    expect(result.currentLevel).toBe(1);
    expect(result.currentLevelXP).toBe(100);
    expect(result.nextLevelXP).toBe(400);
    // (250 - 100) / (400 - 100) * 100 = 150 / 300 * 100 = 50
    expect(result.progressPercentage).toBe(50);
  });

  it("progress percentage is clamped between 0 and 100", () => {
    // Well above level 1's XP requirement
    const result = getLevelProgress(10000);
    expect(result.progressPercentage).toBeGreaterThanOrEqual(0);
    expect(result.progressPercentage).toBeLessThanOrEqual(100);
  });
});

describe("getUserProfile (from @/lib/userProfile)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns default profile when no data in localStorage", () => {
    const profile = getUserProfile();
    expect(profile.totalXP).toBe(0);
    expect(profile.level).toBe(0);
    expect(profile.questionsAnswered).toBe(0);
    expect(profile.correctAnswers).toBe(0);
    expect(profile.incorrectAnswers).toBe(0);
    expect(profile.xpHistory).toEqual([]);
    // Should also persist the default profile
    const stored = localStorage.getItem(USER_PROFILE_KEY);
    expect(stored).not.toBeNull();
  });

  it("returns stored profile when data exists", () => {
    const storedProfile: UserProfileWithHistory = {
      totalXP: 500,
      level: 2,
      questionsAnswered: 10,
      correctAnswers: 7,
      incorrectAnswers: 3,
      lastActivity: "2025-01-01T00:00:00.000Z",
      createdAt: "2024-01-01T00:00:00.000Z",
      xpHistory: [],
    };
    setLocalStorage(USER_PROFILE_KEY, storedProfile);

    const profile = getUserProfile();
    expect(profile.totalXP).toBe(500);
    expect(profile.level).toBe(2);
    expect(profile.questionsAnswered).toBe(10);
    expect(profile.correctAnswers).toBe(7);
    expect(profile.incorrectAnswers).toBe(3);
  });

  it("fills in missing fields with defaults (totalXP→0, level→calculated, xpHistory→[])", () => {
    // Store a partial profile
    setLocalStorage(USER_PROFILE_KEY, {
      totalXP: 250,
      // level omitted intentionally
      questionsAnswered: 5,
      correctAnswers: 3,
      // incorrectAnswers omitted
      lastActivity: "2025-06-01T00:00:00.000Z",
      // createdAt omitted
      // xpHistory omitted
    });

    const profile = getUserProfile();
    expect(profile.totalXP).toBe(250);
    // level is recalculated: floor(sqrt(250/100)) = floor(sqrt(2.5)) = floor(1.58) = 1
    expect(profile.level).toBe(1);
    expect(profile.questionsAnswered).toBe(5);
    expect(profile.correctAnswers).toBe(3);
    expect(profile.incorrectAnswers).toBe(0);
    expect(profile.xpHistory).toEqual([]);
    expect(profile.createdAt).toBeDefined();
  });

  it("returns default profile on JSON parse error", () => {
    localStorage.setItem(USER_PROFILE_KEY, "not-valid-json");
    const profile = getUserProfile();
    expect(profile.totalXP).toBe(0);
    expect(profile.level).toBe(0);
    expect(profile.xpHistory).toEqual([]);
  });
});

describe("saveUserProfile (from @/lib/userProfile)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves profile to localStorage under userProfile key", () => {
    const profile: UserProfileWithHistory = {
      totalXP: 300,
      level: 1,
      questionsAnswered: 3,
      correctAnswers: 2,
      incorrectAnswers: 1,
      lastActivity: "2025-01-01T00:00:00.000Z",
      createdAt: "2024-06-01T00:00:00.000Z",
      xpHistory: [],
    };

    saveUserProfile(profile);

    const stored = localStorage.getItem(USER_PROFILE_KEY);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!) as UserProfileWithHistory;
    expect(parsed.totalXP).toBe(300);
  });

  it("auto-updates level based on totalXP using calculateLevel", () => {
    const profile: UserProfileWithHistory = {
      totalXP: 900,
      level: 0, // intentionally wrong
      questionsAnswered: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      lastActivity: "2025-01-01T00:00:00.000Z",
      createdAt: "2024-06-01T00:00:00.000Z",
      xpHistory: [],
    };

    saveUserProfile(profile);

    const stored = JSON.parse(localStorage.getItem(USER_PROFILE_KEY)!) as UserProfileWithHistory;
    expect(stored.level).toBe(3); // floor(sqrt(900/100)) = floor(sqrt(9)) = 3
  });

  it("auto-updates lastActivity to current ISO timestamp", () => {
    const before = new Date();
    const profile: UserProfileWithHistory = {
      totalXP: 0,
      level: 0,
      questionsAnswered: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      lastActivity: "2000-01-01T00:00:00.000Z",
      createdAt: "2024-06-01T00:00:00.000Z",
      xpHistory: [],
    };

    saveUserProfile(profile);

    const stored = JSON.parse(localStorage.getItem(USER_PROFILE_KEY)!) as UserProfileWithHistory;
    const savedDate = new Date(stored.lastActivity).getTime();
    const after = new Date();
    expect(savedDate).toBeGreaterThanOrEqual(before.getTime());
    expect(savedDate).toBeLessThanOrEqual(after.getTime());
  });
});

describe("addXPForCorrectAnswer (from @/lib/userProfile)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("increases totalXP by scoreBandRange * 10", () => {
    const profile = addXPForCorrectAnswer("q1", 3);
    expect(profile.totalXP).toBe(30); // 3 * 10
  });

  it("increments questionsAnswered by 1", () => {
    const profile = addXPForCorrectAnswer("q1", 2);
    expect(profile.questionsAnswered).toBe(1);
  });

  it("increments correctAnswers by 1", () => {
    const profile = addXPForCorrectAnswer("q1", 2);
    expect(profile.correctAnswers).toBe(1);
  });

  it("adds XPTransaction to xpHistory with reason correct_answer", () => {
    const profile = addXPForCorrectAnswer("q1", 4);
    expect(profile.xpHistory).toHaveLength(1);
    expect(profile.xpHistory[0].questionId).toBe("q1");
    expect(profile.xpHistory[0].change).toBe(40);
    expect(profile.xpHistory[0].reason).toBe("correct_answer");
    expect(profile.xpHistory[0].scoreBandRange).toBe(4);
  });

  it("caps xpHistory at 100 entries (FIFO)", () => {
    // Add 101 correct answers to trigger capping
    for (let i = 0; i < 101; i++) {
      addXPForCorrectAnswer(`q${i}`, 1);
    }

    const profile = getUserProfile();
    expect(profile.xpHistory).toHaveLength(100);
    // The first entry (q0) should have been removed, q1 should be first
    expect(profile.xpHistory[0].questionId).toBe("q1");
    expect(profile.xpHistory[99].questionId).toBe("q100");
  });

  it("saves to localStorage", () => {
    addXPForCorrectAnswer("q1", 2);

    const stored = localStorage.getItem(USER_PROFILE_KEY);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!) as UserProfileWithHistory;
    expect(parsed.totalXP).toBe(20);
    expect(parsed.xpHistory).toHaveLength(1);
  });
});

describe("reduceXPForIncorrectAnswer (from @/lib/userProfile)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("decreases totalXP by floor((scoreBandRange * 10) / 2)", () => {
    // Start with some XP
    addXPForCorrectAnswer("q-seed", 10); // +100 XP
    const profile = reduceXPForIncorrectAnswer("q-wrong", 5);
    // loss = floor((5 * 10) / 2) = floor(50/2) = 25
    // XP = 100 - 25 = 75
    expect(profile.totalXP).toBe(75);
  });

  it("does NOT go below 0 (XP floor is 0)", () => {
    // Start with 0 XP (default)
    const profile = reduceXPForIncorrectAnswer("q-wrong", 100);
    // loss = floor(1000 / 2) = 500, but XP is 0, so stays 0
    expect(profile.totalXP).toBe(0);
  });

  it("increments questionsAnswered by 1", () => {
    const profile = reduceXPForIncorrectAnswer("q-wrong", 3);
    expect(profile.questionsAnswered).toBe(1);
  });

  it("increments incorrectAnswers by 1", () => {
    const profile = reduceXPForIncorrectAnswer("q-wrong", 3);
    expect(profile.incorrectAnswers).toBe(1);
  });

  it("adds XPTransaction with negative change and reason incorrect_answer", () => {
    addXPForCorrectAnswer("q-seed", 10); // +100 XP
    const profile = reduceXPForIncorrectAnswer("q-wrong", 4);
    // loss = floor(40/2) = 20
    expect(profile.xpHistory).toHaveLength(2);
    const transaction = profile.xpHistory[1];
    expect(transaction.questionId).toBe("q-wrong");
    expect(transaction.change).toBe(-20);
    expect(transaction.reason).toBe("incorrect_answer");
    expect(transaction.scoreBandRange).toBe(4);
  });

  it("caps xpHistory at 100 entries", () => {
    // Add 50 correct answers first
    for (let i = 0; i < 50; i++) {
      addXPForCorrectAnswer(`q-c${i}`, 1);
    }
    // Add 60 incorrect answers
    for (let i = 0; i < 60; i++) {
      reduceXPForIncorrectAnswer(`q-w${i}`, 1);
    }

    const profile = getUserProfile();
    expect(profile.xpHistory).toHaveLength(100);
  });
});

describe("getXPStatistics (from @/lib/userProfile)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns correct stats for recent transactions", () => {
    addXPForCorrectAnswer("q1", 5);  // +50 XP
    addXPForCorrectAnswer("q2", 3);  // +30 XP
    reduceXPForIncorrectAnswer("q3", 4); // -20 XP

    const stats = getXPStatistics(7);
    expect(stats.totalXPGained).toBe(80);
    expect(stats.totalXPLost).toBe(20);
    expect(stats.netXPChange).toBe(60);
    expect(stats.questionsAnswered).toBe(3);
    expect(stats.correctAnswers).toBe(2);
    expect(stats.incorrectAnswers).toBe(1);
  });

  it("filters by days parameter (default 7)", () => {
    addXPForCorrectAnswer("q1", 5); // +50 XP

    const stats = getXPStatistics(7);
    expect(stats.totalXPGained).toBe(50);
  });

  it("calculates totalXPGained, totalXPLost, netXPChange correctly", () => {
    addXPForCorrectAnswer("q1", 10); // +100
    reduceXPForIncorrectAnswer("q2", 6); // -30
    addXPForCorrectAnswer("q3", 5); // +50

    const stats = getXPStatistics(7);
    expect(stats.totalXPGained).toBe(150);
    expect(stats.totalXPLost).toBe(30);
    expect(stats.netXPChange).toBe(120);
  });
});

describe("resetUserProfile (from @/lib/userProfile)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns a fresh profile with all zeros", () => {
    // Set up an existing profile with data
    addXPForCorrectAnswer("q1", 10);
    addXPForCorrectAnswer("q2", 5);

    const fresh = resetUserProfile();
    expect(fresh.totalXP).toBe(0);
    expect(fresh.level).toBe(0);
    expect(fresh.questionsAnswered).toBe(0);
    expect(fresh.correctAnswers).toBe(0);
    expect(fresh.incorrectAnswers).toBe(0);
    expect(fresh.xpHistory).toEqual([]);
  });

  it("saves to localStorage", () => {
    resetUserProfile();

    const stored = localStorage.getItem(USER_PROFILE_KEY);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!) as UserProfileWithHistory;
    expect(parsed.totalXP).toBe(0);
  });
});
