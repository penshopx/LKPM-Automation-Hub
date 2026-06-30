import { describe, it, expect } from "vitest";
import {
  evaluateGate,
  gateFailureReason,
  reconcileRejections,
  sanitizeAgentText,
  sanitizeRecommendations,
  sanitizeValidatorSummary,
  MIN_CONFIDENCE,
  type GateDataPoint,
} from "./gate";

function dp(overrides: Partial<GateDataPoint> = {}): GateDataPoint {
  return {
    id: 1,
    label: "Realisasi investasi",
    source: "Laporan keuangan teraudit 2025",
    status: "terverifikasi",
    confidence: 90,
    ...overrides,
  };
}

describe("anti-hallucination gate", () => {
  it("passes a data point with source, accepted status, and high confidence", () => {
    expect(gateFailureReason(dp())).toBeNull();
    expect(gateFailureReason(dp({ status: "pernyataan_mandiri" }))).toBeNull();
  });

  it("rejects a data point without a source", () => {
    expect(gateFailureReason(dp({ source: null }))).not.toBeNull();
    expect(gateFailureReason(dp({ source: "" }))).not.toBeNull();
    expect(gateFailureReason(dp({ source: "   " }))).not.toBeNull();
  });

  it("rejects data points whose status is not trustworthy", () => {
    expect(gateFailureReason(dp({ status: "perlu_verifikasi" }))).not.toBeNull();
    expect(gateFailureReason(dp({ status: "estimasi" }))).not.toBeNull();
  });

  it("rejects data points below the confidence threshold", () => {
    expect(
      gateFailureReason(dp({ confidence: MIN_CONFIDENCE - 1 })),
    ).not.toBeNull();
    expect(gateFailureReason(dp({ confidence: MIN_CONFIDENCE }))).toBeNull();
  });

  it("partitions a mixed set so only fully compliant points are validated", () => {
    const points: GateDataPoint[] = [
      dp({ id: 1 }), // valid
      dp({ id: 2, source: null }), // no source
      dp({ id: 3, status: "perlu_verifikasi" }), // bad status
      dp({ id: 4, status: "estimasi" }), // bad status
      dp({ id: 5, confidence: 10 }), // low confidence
      dp({ id: 6, status: "pernyataan_mandiri", confidence: 75 }), // valid
    ];

    const { validated, failures } = evaluateGate(points);

    expect(validated.map((p) => p.id).sort()).toEqual([1, 6]);
    expect(failures.map((f) => f.dp.id).sort()).toEqual([2, 3, 4, 5]);
    // Every failure carries a non-empty, human-readable reason.
    for (const f of failures) {
      expect(f.reason.length).toBeGreaterThan(0);
    }
  });

  it("never lets an unverified point reach the validated set (the narasi input)", () => {
    const unverified: GateDataPoint[] = [
      dp({ id: 10, source: null }),
      dp({ id: 11, status: "estimasi" }),
      dp({ id: 12, confidence: 0 }),
    ];
    const { validated } = evaluateGate(unverified);
    expect(validated).toHaveLength(0);
  });
});

describe("reconcileRejections (LLM cannot alter the gate decision)", () => {
  const points: GateDataPoint[] = [
    dp({ id: 1 }), // valid (passes gate)
    dp({ id: 2, source: null }), // rejected by gate
    dp({ id: 3, status: "estimasi" }), // rejected by gate
  ];
  const gate = evaluateGate(points);

  it("returns exactly one entry per gate failure, in gate order", () => {
    const out = reconcileRejections(points, gate, []);
    expect(out.map((r) => r.id)).toEqual([2, 3]);
    for (const r of out) {
      expect(r.reason.length).toBeGreaterThan(0);
    }
  });

  it("uses LLM wording only for points the gate already rejected", () => {
    const out = reconcileRejections(points, gate, [
      { id: 2, reason: "Mohon lampirkan sumber resmi" },
    ]);
    const r2 = out.find((r) => r.id === 2);
    expect(r2?.reason).toBe("Mohon lampirkan sumber resmi");
    // id 3 had no LLM reword, so it keeps the deterministic reason.
    const r3 = out.find((r) => r.id === 3);
    expect(r3?.reason).toMatch(/^Perlu dilengkapi:/);
  });

  it("ignores an LLM attempt to reject a validated point", () => {
    const out = reconcileRejections(points, gate, [
      { id: 1, reason: "Saya rasa ini juga meragukan" },
    ]);
    // The validated point (id 1) must never appear in the rejection list.
    expect(out.map((r) => r.id)).toEqual([2, 3]);
    expect(out.find((r) => r.id === 1)).toBeUndefined();
  });

  it("ignores an LLM-invented id not present in the data", () => {
    const out = reconcileRejections(points, gate, [
      { id: 999, reason: "Data fiktif yang dikarang model" },
    ]);
    expect(out.map((r) => r.id)).toEqual([2, 3]);
    expect(out.find((r) => r.id === 999)).toBeUndefined();
  });

  it("ignores blank LLM reasons and keeps the deterministic reason", () => {
    const out = reconcileRejections(points, gate, [{ id: 2, reason: "   " }]);
    const r2 = out.find((r) => r.id === 2);
    expect(r2?.reason).toMatch(/^Perlu dilengkapi:/);
  });

  it("handles an undefined LLM rejection list", () => {
    const out = reconcileRejections(points, gate, undefined);
    expect(out.map((r) => r.id)).toEqual([2, 3]);
  });

  it("keeps LLM wording that merely contains a rejected value's digits", () => {
    // Rejected raw value "20" is a substring of the year "2026" — the LLM
    // reword must NOT be discarded just for a coincidental digit overlap.
    const out = reconcileRejections(
      points,
      gate,
      [{ id: 2, reason: "Lengkapi sumber sebelum tenggat 2026" }],
      ["20"],
    );
    const r2 = out.find((r) => r.id === 2);
    expect(r2?.reason).toBe("Lengkapi sumber sebelum tenggat 2026");
  });

  it("still drops LLM wording that leaks a rejected value as a whole token", () => {
    const out = reconcileRejections(
      points,
      gate,
      [{ id: 2, reason: "Nilai 20 belum terverifikasi" }],
      ["20"],
    );
    const r2 = out.find((r) => r.id === 2);
    expect(r2?.reason).toMatch(/^Perlu dilengkapi:/);
  });
});

describe("sanitizeAgentText (whole-token forbidden-value matching)", () => {
  it("preserves a clean narrative whose number merely contains rejected digits", () => {
    // Rejected value "20"; the narrative legitimately mentions 2026, 120, 200.
    const narrative =
      "Realisasi pada tahun 2026 mencapai 120 unit dengan target 200 unit.";
    const out = sanitizeAgentText(narrative, ["20"], "FALLBACK");
    expect(out.leaked).toBe(false);
    expect(out.text).toBe(narrative);
  });

  it("drops a narrative that leaks a rejected value as a standalone token", () => {
    const narrative = "Nilai investasi adalah 20 miliar rupiah.";
    const out = sanitizeAgentText(narrative, ["20"], "FALLBACK");
    expect(out.leaked).toBe(true);
    expect(out.text).toBe("FALLBACK");
  });

  it("detects a rejected number even when glued to a non-digit (currency/unit)", () => {
    expect(sanitizeAgentText("Rp20 juta", ["20"], "X").leaked).toBe(true);
    expect(sanitizeAgentText("sekitar (20) unit", ["20"], "X").leaked).toBe(
      true,
    );
  });

  it("does not blank a draft when a rejected number sits inside a larger number", () => {
    // "20" inside "1.020.000" (thousand-separated) and "3204" must not match.
    expect(sanitizeAgentText("Total Rp1.020.000", ["20"], "X").leaked).toBe(
      false,
    );
    expect(sanitizeAgentText("Kode proyek 3204", ["20"], "X").leaked).toBe(
      false,
    );
  });

  it("matches alphabetic rejected values as whole words only", () => {
    // "Maju" must not match inside "Maju Jaya"? It is a whole word here -> leak.
    expect(
      sanitizeAgentText("Disusun oleh PT Maju Jaya", ["Maju"], "X").leaked,
    ).toBe(true);
    // "ada" must not match inside "kepada" (substring of a longer word).
    expect(
      sanitizeAgentText("Laporan disampaikan kepada OSS", ["ada"], "X").leaked,
    ).toBe(false);
  });
});

describe("leak detection survives formatting tricks (normalization)", () => {
  describe("thousand-separator tricks on numbers", () => {
    it("catches a rejected plain number reformatted with dot separators", () => {
      const out = sanitizeAgentText(
        "Nilai investasi adalah Rp1.000.000 sesuai laporan.",
        ["1000000"],
        "FALLBACK",
      );
      expect(out.leaked).toBe(true);
      expect(out.text).toBe("FALLBACK");
    });

    it("catches a rejected plain number reformatted with comma separators", () => {
      expect(
        sanitizeAgentText("Total USD 1,000,000 disetujui", ["1000000"], "X")
          .leaked,
      ).toBe(true);
    });

    it("catches a rejected separator-formatted number written plainly", () => {
      // Rejected raw "1.000.000"; narrative writes it as bare "1000000".
      expect(
        sanitizeAgentText("Totalnya 1000000 rupiah", ["1.000.000"], "X").leaked,
      ).toBe(true);
    });

    it("matches regardless of which separator style each side uses", () => {
      expect(
        sanitizeAgentText("Senilai 1,000,000", ["1.000.000"], "X").leaked,
      ).toBe(true);
    });

    it("does not flag a different number that shares the rejected digits", () => {
      // "21.000.000" (-> 21000000) must not match rejected "1000000".
      expect(
        sanitizeAgentText("Proyek tahun 2026 senilai 21.000.000", ["1000000"], "X")
          .leaked,
      ).toBe(false);
    });

    it("still does not flag a rejected number nested inside a larger one", () => {
      // Preserves the existing boundary guarantee under separator normalization.
      expect(
        sanitizeAgentText("Total Rp1.020.000", ["20"], "X").leaked,
      ).toBe(false);
    });
  });

  describe("casing tricks on names/identifiers", () => {
    it("catches a rejected name leaked in a different case", () => {
      expect(
        sanitizeAgentText("Disusun oleh pt maju jaya", ["PT Maju"], "X").leaked,
      ).toBe(true);
    });

    it("catches a rejected lowercase value leaked in upper/mixed case", () => {
      expect(
        sanitizeAgentText("Disusun oleh PT MAJU", ["pt maju"], "X").leaked,
      ).toBe(true);
    });

    it("does not flag a case-insensitive fragment inside a longer word", () => {
      expect(
        sanitizeAgentText("Dokumen majuapi terlampir", ["maju"], "X").leaked,
      ).toBe(false);
    });
  });

  describe("whitespace tricks on names/identifiers", () => {
    it("catches a rejected value when extra spaces are inserted in the text", () => {
      expect(
        sanitizeAgentText("Disusun oleh PT  Maju Jaya", ["PT Maju"], "X").leaked,
      ).toBe(true);
    });

    it("catches a rejected value padded with extra internal spaces", () => {
      expect(
        sanitizeAgentText("Disusun oleh PT Maju", ["PT  Maju"], "X").leaked,
      ).toBe(true);
    });

    it("catches a rejected value when whitespace differs by kind (tab/newline)", () => {
      expect(
        sanitizeAgentText("Disusun oleh PT\tMaju Jaya", ["PT Maju"], "X").leaked,
      ).toBe(true);
    });
  });

  describe("clean drafts are still preserved under normalization", () => {
    it("does not blank a clean narrative with unrelated names and numbers", () => {
      const narrative =
        "PT Sejahtera melaporkan realisasi 2.026.000 pada tahun 2026.";
      const out = sanitizeAgentText(narrative, ["1000000", "PT Maju"], "X");
      expect(out.leaked).toBe(false);
      expect(out.text).toBe(narrative);
    });

    it("applies identically to recommendations and validator summary", () => {
      expect(
        sanitizeRecommendations(
          ["Lengkapi sebelum tenggat", "Sertakan Rp1.000.000 final"],
          ["1000000"],
          "FALLBACK",
        ).leaked,
      ).toBe(true);
      expect(
        sanitizeValidatorSummary("Angka 1.000.000 belum terverifikasi", [
          "1000000",
        ]).leaked,
      ).toBe(true);
    });
  });
});

describe("sanitizeRecommendations (whole-token forbidden-value matching)", () => {
  it("preserves recommendations whose numbers merely contain rejected digits", () => {
    const recs = ["Selesaikan sebelum 2026", "Targetkan 200 unit"];
    const out = sanitizeRecommendations(recs, ["20"], "FALLBACK");
    expect(out.leaked).toBe(false);
    expect(out.recommendations).toEqual(recs);
  });

  it("replaces the whole list when an item leaks a rejected token", () => {
    const recs = ["Aman", "Nilai 20 perlu diperiksa"];
    const out = sanitizeRecommendations(recs, ["20"], "FALLBACK");
    expect(out.leaked).toBe(true);
    expect(out.recommendations).toEqual(["FALLBACK"]);
  });
});

describe("sanitizeValidatorSummary (whole-token forbidden-value matching)", () => {
  it("preserves a summary whose number merely contains rejected digits", () => {
    const summary = "Validasi selesai untuk periode 2026.";
    const out = sanitizeValidatorSummary(summary, ["20"]);
    expect(out.leaked).toBe(false);
    expect(out.summary).toBe(summary);
  });

  it("drops a summary that leaks a rejected value as a whole token", () => {
    const out = sanitizeValidatorSummary("Angka 20 tidak valid", ["20"]);
    expect(out.leaked).toBe(true);
    expect(out.summary).not.toBe("Angka 20 tidak valid");
  });
});
