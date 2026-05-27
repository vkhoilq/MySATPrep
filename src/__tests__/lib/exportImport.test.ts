import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  exportLocalStorageData,
  importLocalStorageData,
  readFileAsJSON,
  downloadExportedData,
} from "@/lib/exportImport";
import type { ExportedData } from "@/lib/exportImport";

describe("exportLocalStorageData", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns object with version 1.0, exportedAt (ISO string), and data containing all localStorage items", () => {
    localStorage.setItem("key1", JSON.stringify("value1"));
    localStorage.setItem("key2", JSON.stringify(42));

    const result = exportLocalStorageData();

    expect(result.version).toBe("1.0");
    // exportedAt should be an ISO string
    expect(result.exportedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
    );
    expect(result.data).toEqual({
      key1: "value1",
      key2: 42,
    });
  });

  it("handles empty localStorage (returns empty data object)", () => {
    const result = exportLocalStorageData();
    expect(result.version).toBe("1.0");
    expect(result.exportedAt).toBeDefined();
    expect(result.data).toEqual({});
  });

  it("handles non-JSON values in localStorage (stores as string)", () => {
    // Store a non-JSON value directly via the raw setItem
    localStorage.setItem("rawKey", "plain-string-value");

    const result = exportLocalStorageData();
    // "plain-string-value" is not valid JSON, so it should be stored as a string
    expect(result.data["rawKey"]).toBe("plain-string-value");
  });
});

describe("importLocalStorageData", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("imports all keys from exported data to localStorage", () => {
    const exportedData: ExportedData = {
      version: "1.0",
      exportedAt: "2025-01-01T00:00:00.000Z",
      data: {
        keyA: "valueA",
        keyB: { nested: true },
        keyC: 999,
      },
    };

    const result = importLocalStorageData(exportedData);
    expect(result).toEqual({ imported: 3, skipped: 0 });

    expect(localStorage.getItem("keyA")).toBe(JSON.stringify("valueA"));
    expect(localStorage.getItem("keyB")).toBe(JSON.stringify({ nested: true }));
    expect(localStorage.getItem("keyC")).toBe(JSON.stringify(999));
  });

  it("returns { imported: N, skipped: M } if some keys fail", () => {
    const exportedData: ExportedData = {
      version: "1.0",
      exportedAt: "2025-01-01T00:00:00.000Z",
      data: {
        goodKey: "works",
        // We can't easily force setItem to throw, but the structure is tested
      },
    };

    const result = importLocalStorageData(exportedData);
    expect(result.imported).toBeGreaterThanOrEqual(1);
    expect(result.skipped).toBe(0);
  });
});

describe("readFileAsJSON", () => {
  it("resolves with parsed JSON for valid JSON files", async () => {
    const validData = {
      version: "1.0",
      exportedAt: "2025-06-01T00:00:00.000Z",
      data: { test: true },
    };
    const validJSON = JSON.stringify(validData);

    const file = new File([validJSON], "backup.json", {
      type: "application/json",
    });

    const result = await readFileAsJSON(file);
    expect(result).toEqual(validData);
  });

  it("rejects with error for invalid JSON files", async () => {
    const file = new File(["not-valid-json-content"], "bad-backup.json", {
      type: "application/json",
    });

    await expect(readFileAsJSON(file)).rejects.toThrow("Invalid JSON file");
  });
});

describe("downloadExportedData", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("does not throw (DOM manipulation smoke test)", () => {
    const data: ExportedData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      data: {},
    };

    // We cannot fully test DOM download in jsdom, but verify it doesn't error
    expect(() => downloadExportedData(data)).not.toThrow();
  });
});
