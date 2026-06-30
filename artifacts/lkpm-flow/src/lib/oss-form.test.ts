import { describe, expect, it } from "vitest";
import { findOfficialFieldMatch } from "./oss-form";

describe("findOfficialFieldMatch", () => {
  it("matches an exact category + label for the scale", () => {
    const match = findOfficialFieldMatch(
      "investasi",
      "Pembelian dan pematangan tanah",
      "besar",
    );
    expect(match?.key).toBe("inv_tanah");
  });

  it("matches case-insensitively", () => {
    const match = findOfficialFieldMatch(
      "investasi",
      "pembelian dan pematangan TANAH",
      "besar",
    );
    expect(match?.key).toBe("inv_tanah");
  });

  it("matches after trimming surrounding whitespace", () => {
    const match = findOfficialFieldMatch(
      "investasi",
      "   Pembelian dan pematangan tanah   ",
      "menengah",
    );
    expect(match?.key).toBe("inv_tanah");
  });

  it("does not match when the category is wrong", () => {
    const match = findOfficialFieldMatch(
      "tenaga_kerja",
      "Pembelian dan pematangan tanah",
      "besar",
    );
    expect(match).toBeUndefined();
  });

  it("does not match a field that is not part of the given scale's catalog", () => {
    // inv_tanah only exists for besar/menengah, so it must not match for mikro.
    const match = findOfficialFieldMatch(
      "investasi",
      "Pembelian dan pematangan tanah",
      "mikro",
    );
    expect(match).toBeUndefined();
  });

  it("matches a scale-specific (lump) field only for its own scale", () => {
    expect(
      findOfficialFieldMatch("investasi", "Realisasi modal tetap", "mikro")
        ?.key,
    ).toBe("inv_modal_tetap_lump");
    expect(
      findOfficialFieldMatch("investasi", "Realisasi modal tetap", "besar"),
    ).toBeUndefined();
  });

  it("returns undefined for an empty/whitespace-only label", () => {
    expect(findOfficialFieldMatch("investasi", "", "besar")).toBeUndefined();
    expect(findOfficialFieldMatch("investasi", "   ", "besar")).toBeUndefined();
  });

  it("returns undefined for a label that is not an official field", () => {
    const match = findOfficialFieldMatch(
      "investasi",
      "Biaya tak terduga lainnya",
      "besar",
    );
    expect(match).toBeUndefined();
  });
});
