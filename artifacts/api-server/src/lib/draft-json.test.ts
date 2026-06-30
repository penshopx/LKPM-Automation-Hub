import { describe, it, expect } from "vitest";
import { parseDraftJson } from "./draft-json";

describe("parseDraftJson (fallback draft resilience)", () => {
  it("parses a well-formed JSON object", () => {
    const out = parseDraftJson(
      JSON.stringify({
        activityNarrative: "Narasi kegiatan",
        constraintNarrative: "Tidak ada kendala",
        dataNotes: "Semua data terverifikasi",
      }),
    );
    expect(out).toEqual({
      activityNarrative: "Narasi kegiatan",
      constraintNarrative: "Tidak ada kendala",
      dataNotes: "Semua data terverifikasi",
    });
  });

  it("strips a json code fence before parsing", () => {
    const out = parseDraftJson(
      '```json\n{"activityNarrative":"X","constraintNarrative":"Y","dataNotes":"Z"}\n```',
    );
    expect(out.activityNarrative).toBe("X");
    expect(out.constraintNarrative).toBe("Y");
    expect(out.dataNotes).toBe("Z");
  });

  it("does not throw on a JSON null reply (the crash path)", () => {
    expect(() => parseDraftJson("null")).not.toThrow();
    const out = parseDraftJson("null");
    expect(out.activityNarrative).toBe("null");
    expect(out.constraintNarrative).toBe("");
    expect(out.dataNotes).toBe("");
  });

  it("does not throw on a JSON array reply", () => {
    const out = parseDraftJson('["a","b"]');
    expect(out.constraintNarrative).toBe("");
    expect(out.dataNotes).toBe("");
  });

  it("does not throw on a JSON primitive reply", () => {
    expect(() => parseDraftJson("123")).not.toThrow();
    expect(() => parseDraftJson('"just a string"')).not.toThrow();
  });

  it("falls back to raw text when the reply is not JSON at all", () => {
    const out = parseDraftJson("Maaf, saya tidak dapat memproses permintaan.");
    expect(out.activityNarrative).toBe(
      "Maaf, saya tidak dapat memproses permintaan.",
    );
  });

  it("coerces non-string fields to empty strings", () => {
    const out = parseDraftJson(
      JSON.stringify({
        activityNarrative: 42,
        constraintNarrative: null,
        dataNotes: { nested: true },
      }),
    );
    expect(out.activityNarrative).toBe("");
    expect(out.constraintNarrative).toBe("");
    expect(out.dataNotes).toBe("");
  });

  it("defaults missing keys to empty strings", () => {
    const out = parseDraftJson(JSON.stringify({ activityNarrative: "only" }));
    expect(out.activityNarrative).toBe("only");
    expect(out.constraintNarrative).toBe("");
    expect(out.dataNotes).toBe("");
  });
});
