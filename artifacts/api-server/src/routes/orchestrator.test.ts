import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import { inArray, eq } from "drizzle-orm";
import type { AddressInfo } from "node:net";
import express from "express";
import {
  db,
  companiesTable,
  izinTable,
  reportsTable,
  dataPointsTable,
  constraintsTable,
  creditLedgerTable,
  basisPermitsTable,
} from "@workspace/db";

// Capture every prompt the (mocked) AI client is asked to generate so the test
// can inspect exactly what the narrative agent was fed. The mock returns canned,
// schema-valid JSON per agent so no real Gemini call is ever made.
const { generateContent, calls, validatorState, collectorState, complianceState, tenggatState } =
  vi.hoisted(() => {
    const calls: { prompt: string }[] = [];
    // Mutable holders so a test can make each (mocked) agent LLM return
    // adversarial free-text without re-mocking the whole AI client.
    const validatorState: {
      rejected: { id: number; label: string; reason: string }[];
      summary: string;
    } = { rejected: [], summary: "Ringkasan validasi." };
    const collectorState: { summary: string; inventory: string } = {
      summary: "Ringkasan pengumpulan data.",
      inventory: "- investasi: ada",
    };
    const complianceState: {
      missing: { section: string; label: string; note: string }[];
      summary: string;
    } = { missing: [], summary: "Ringkasan kepatuhan." };
    const tenggatState: { summary: string; recommendations: string[] } = {
      summary: "Ringkasan tenggat.",
      recommendations: ["Segera lengkapi data."],
    };
    const generateContent = vi.fn(
      async (req: { contents: { parts: { text: string }[] }[] }) => {
        const prompt = req.contents[0].parts[0].text;
        calls.push({ prompt });
        if (prompt.includes("Agen Pengumpul Data")) {
          return {
            text: JSON.stringify({
              summary: collectorState.summary,
              inventory: collectorState.inventory,
            }),
          };
        }
        if (prompt.includes("Agen Validator Anti-Halusinasi")) {
          return {
            text: JSON.stringify({
              rejected: validatorState.rejected,
              summary: validatorState.summary,
            }),
          };
        }
        if (prompt.includes("Agen Pemeriksa Kepatuhan OSS")) {
          return {
            text: JSON.stringify({
              status: "perlu_dilengkapi",
              missing: complianceState.missing,
              summary: complianceState.summary,
            }),
          };
        }
        if (prompt.includes("Agen Penyusun Narasi")) {
          return {
            text: JSON.stringify({
              activityNarrative: "Narasi kegiatan.",
              constraintNarrative: "Narasi kendala.",
            }),
          };
        }
        if (prompt.includes("Agen Pemantau Tenggat")) {
          return {
            text: JSON.stringify({
              riskLevel: "sedang",
              summary: tenggatState.summary,
              recommendations: tenggatState.recommendations,
            }),
          };
        }
        return { text: "{}" };
      },
    );
    return {
      generateContent,
      calls,
      validatorState,
      collectorState,
      complianceState,
      tenggatState,
    };
  });

// Mock the AI client module. Labels have no side effects, so re-use the real
// ones; only the network-calling `ai` object is replaced.
vi.mock("../lib/ai", async () => {
  const labels =
    await vi.importActual<typeof import("../lib/labels")>("../lib/labels");
  return {
    ai: { models: { generateContent } },
    MODEL: "gemini-2.5-flash",
    SCALE_LABELS: labels.SCALE_LABELS,
    STATUS_LABELS: labels.STATUS_LABELS,
    BASIS_PERMIT_TYPE_LABELS: labels.BASIS_PERMIT_TYPE_LABELS,
    BASIS_PERMIT_STATUS_LABELS: labels.BASIS_PERMIT_STATUS_LABELS,
  };
});

// Imported after vi.mock so the router picks up the mocked AI client.
const { default: orchestratorRouter } = await import("./orchestrator");

const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const CONSULTANT_A = `test-orchestrator-${suffix}`;

// Distinctive numeric values let us prove which data points reached the
// narrative agent. `value` is a numeric column, so values must be numeric.
const VALIDATED_VALUE = "123456789";
const REJECTED_NOSOURCE_VALUE = "911111111";
const REJECTED_LOWCONF_VALUE = "922222222";
const REJECTED_BADSTATUS_VALUE = "933333333";

const REJECTED_NOSOURCE_LABEL = `Realisasi tanpa sumber ${suffix}`;
const REJECTED_LOWCONF_LABEL = `Realisasi keyakinan rendah ${suffix}`;
const REJECTED_BADSTATUS_LABEL = `Realisasi status estimasi ${suffix}`;

let reportId = 0;
let validatedDataPointId = 0;
const createdCompanyIds: number[] = [];

// An id guaranteed not to exist among this report's data points, used to prove
// a misbehaving validator cannot smuggle a phantom rejection through.
const NON_EXISTENT_ID = 999999999;

let server: ReturnType<express.Express["listen"]>;
let baseUrl = "";

beforeAll(async () => {
  // The orchestrator now meters pendampingan AI by credits. Grant the test
  // consultant an ample top-up balance so every orchestrate call in this suite
  // is paid for; the credit gate itself is covered by billing.test.ts.
  await db.insert(creditLedgerTable).values({
    consultantId: CONSULTANT_A,
    amount: 1000,
    bucket: "topup",
    reason: "uji",
  });

  const [company] = await db
    .insert(companiesTable)
    .values({
      consultantId: CONSULTANT_A,
      name: `PT Uji Orkestrasi ${suffix}`,
      nib: `NIB-${suffix}`,
      scale: "menengah",
      operatingMode: "komersial",
    })
    .returning({ id: companiesTable.id });
  createdCompanyIds.push(company.id);

  const [izin] = await db
    .insert(izinTable)
    .values({ companyId: company.id, idIzin: `IZIN-${suffix}`, scale: "menengah" })
    .returning({ id: izinTable.id });

  const [report] = await db
    .insert(reportsTable)
    .values({
      izinId: izin.id,
      scale: "menengah",
      periodType: "triwulan",
      periodLabel: "Triwulan I",
      year: 2026,
      deadline: "2026-04-15",
    })
    .returning({ id: reportsTable.id });
  reportId = report.id;

  const insertedDataPoints = await db
    .insert(dataPointsTable)
    .values([
    // Passes the gate: non-empty source, accepted status, confidence >= 60.
    {
      reportId,
      category: "investasi",
      label: "Realisasi investasi modal",
      value: VALIDATED_VALUE,
      unit: "IDR",
      source: "Laporan keuangan Q1",
      status: "terverifikasi",
      confidence: 95,
    },
    // Fails: no source.
    {
      reportId,
      category: "tenaga_kerja",
      label: REJECTED_NOSOURCE_LABEL,
      value: REJECTED_NOSOURCE_VALUE,
      unit: "orang",
      source: null,
      status: "terverifikasi",
      confidence: 95,
    },
    // Fails: confidence below threshold.
    {
      reportId,
      category: "tenaga_kerja",
      label: REJECTED_LOWCONF_LABEL,
      value: REJECTED_LOWCONF_VALUE,
      unit: "orang",
      source: "Catatan internal",
      status: "terverifikasi",
      confidence: 20,
    },
    // Fails: status not accepted.
    {
      reportId,
      category: "produksi",
      label: REJECTED_BADSTATUS_LABEL,
      value: REJECTED_BADSTATUS_VALUE,
      unit: "unit",
      source: "Perkiraan manajemen",
      status: "estimasi",
      confidence: 95,
    },
    ])
    .returning({ id: dataPointsTable.id, value: dataPointsTable.value });

  validatedDataPointId = insertedDataPoints.find(
    (dp) => dp.value === VALIDATED_VALUE,
  )!.id;

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.consultantId = CONSULTANT_A;
    (req as unknown as { log: Record<string, () => void> }).log = {
      warn: () => {},
      error: () => {},
      info: () => {},
    };
    next();
  });
  app.use("/api", orchestratorRouter);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  if (createdCompanyIds.length) {
    await db
      .delete(companiesTable)
      .where(inArray(companiesTable.id, createdCompanyIds));
  }
  await db
    .delete(creditLedgerTable)
    .where(eq(creditLedgerTable.consultantId, CONSULTANT_A));
});

beforeEach(() => {
  calls.length = 0;
  generateContent.mockClear();
  validatorState.rejected = [];
  validatorState.summary = "Ringkasan validasi.";
  collectorState.summary = "Ringkasan pengumpulan data.";
  collectorState.inventory = "- investasi: ada";
  complianceState.missing = [];
  complianceState.summary = "Ringkasan kepatuhan.";
  tenggatState.summary = "Ringkasan tenggat.";
  tenggatState.recommendations = ["Segera lengkapi data."];
});

// Parses an SSE response body into the list of decoded event payloads.
function parseSseEvents(body: string): Record<string, unknown>[] {
  return body
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => JSON.parse(line.slice("data: ".length)));
}

describe("POST /api/assistant/orchestrate end-to-end gating", () => {
  it("feeds only validated data into the narrative agent and never leaks rejected values", async () => {
    const res = await fetch(`${baseUrl}/api/assistant/orchestrate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId }),
    });
    expect(res.status).toBe(200);
    await res.text();

    const narrativeCall = calls.find((c) =>
      c.prompt.includes("Agen Penyusun Narasi"),
    );
    expect(narrativeCall).toBeDefined();
    const narrativePrompt = narrativeCall!.prompt;

    // The validated value MUST appear in the usable section of the prompt.
    expect(narrativePrompt).toContain(VALIDATED_VALUE);

    // No rejected/low-confidence/unsourced VALUE may ever reach the narrative.
    expect(narrativePrompt).not.toContain(REJECTED_NOSOURCE_VALUE);
    expect(narrativePrompt).not.toContain(REJECTED_LOWCONF_VALUE);
    expect(narrativePrompt).not.toContain(REJECTED_BADSTATUS_VALUE);

    // The "boleh dipakai" (usable) block must list only the validated point.
    const usableBlock = narrativePrompt.slice(
      narrativePrompt.indexOf("DATA POINT LOLOS VALIDASI"),
      narrativePrompt.indexOf("DATA YANG DITOLAK"),
    );
    expect(usableBlock).toContain("Realisasi investasi modal");
    expect(usableBlock).not.toContain(REJECTED_NOSOURCE_LABEL);
    expect(usableBlock).not.toContain(REJECTED_LOWCONF_LABEL);
    expect(usableBlock).not.toContain(REJECTED_BADSTATUS_LABEL);
  });

  it("surfaces every rejected point as 'perlu dilengkapi' in validation.rejected and dataNotes", async () => {
    const res = await fetch(`${baseUrl}/api/assistant/orchestrate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId }),
    });
    expect(res.status).toBe(200);
    const body = await res.text();
    const events = parseSseEvents(body);

    const finalEvent = events.find((e) => e.type === "final");
    expect(finalEvent).toBeDefined();
    const result = finalEvent!.result as {
      validation: {
        usableCount: number;
        rejected: { label: string; reason: string }[];
      };
      dataNotes: string;
    };

    expect(result.validation.usableCount).toBe(1);

    const rejectedLabels = result.validation.rejected.map((r) => r.label);
    expect(rejectedLabels).toContain(REJECTED_NOSOURCE_LABEL);
    expect(rejectedLabels).toContain(REJECTED_LOWCONF_LABEL);
    expect(rejectedLabels).toContain(REJECTED_BADSTATUS_LABEL);
    expect(result.validation.rejected).toHaveLength(3);

    // dataNotes must call out the rejected points under "perlu dilengkapi".
    expect(result.dataNotes).toContain("Perlu dilengkapi");
    expect(result.dataNotes).toContain(REJECTED_NOSOURCE_LABEL);
    expect(result.dataNotes).toContain(REJECTED_LOWCONF_LABEL);
    expect(result.dataNotes).toContain(REJECTED_BADSTATUS_LABEL);

    // Rejected raw values must not leak into the assembled, user-facing result.
    expect(body).not.toContain(REJECTED_NOSOURCE_VALUE);
    expect(body).not.toContain(REJECTED_LOWCONF_VALUE);
    expect(body).not.toContain(REJECTED_BADSTATUS_VALUE);
  });

  it("ignores a misbehaving validator that rejects a validated point or invents an id", async () => {
    // Adversarial validator output: it tries to (a) reject the point that the
    // deterministic gate already passed and (b) invent a rejection for an id
    // that does not exist in this report's data at all.
    validatorState.rejected = [
      {
        id: validatedDataPointId,
        label: "Realisasi investasi modal",
        reason: "Validator LLM mencoba menolak data yang sudah lolos.",
      },
      {
        id: NON_EXISTENT_ID,
        label: "Data hantu yang dikarang validator",
        reason: "Validator LLM mengarang id yang tidak ada.",
      },
    ];

    const res = await fetch(`${baseUrl}/api/assistant/orchestrate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId }),
    });
    expect(res.status).toBe(200);
    const body = await res.text();
    const events = parseSseEvents(body);

    // The validated point must still reach the narrative agent unchanged: the
    // LLM cannot demote a point the gate passed.
    const narrativeCall = calls.find((c) =>
      c.prompt.includes("Agen Penyusun Narasi"),
    );
    expect(narrativeCall).toBeDefined();
    const narrativePrompt = narrativeCall!.prompt;
    const usableBlock = narrativePrompt.slice(
      narrativePrompt.indexOf("DATA POINT LOLOS VALIDASI"),
      narrativePrompt.indexOf("DATA YANG DITOLAK"),
    );
    expect(usableBlock).toContain("Realisasi investasi modal");
    expect(usableBlock).toContain(VALIDATED_VALUE);

    const finalEvent = events.find((e) => e.type === "final");
    expect(finalEvent).toBeDefined();
    const result = finalEvent!.result as {
      validation: {
        usableCount: number;
        rejected: { label: string; reason: string }[];
      };
      dataNotes: string;
    };

    // The usable set is unchanged — still exactly the one gate-validated point.
    expect(result.validation.usableCount).toBe(1);

    // The gate's three real failures are reported, and nothing else: the
    // validated point was NOT demoted into the rejected list.
    expect(result.validation.rejected).toHaveLength(3);
    const rejectedLabels = result.validation.rejected.map((r) => r.label);
    expect(rejectedLabels).toContain(REJECTED_NOSOURCE_LABEL);
    expect(rejectedLabels).toContain(REJECTED_LOWCONF_LABEL);
    expect(rejectedLabels).toContain(REJECTED_BADSTATUS_LABEL);
    expect(rejectedLabels).not.toContain("Realisasi investasi modal");

    // The invented id's label/reason must never surface anywhere user-facing.
    expect(rejectedLabels).not.toContain("Data hantu yang dikarang validator");
    expect(result.dataNotes).not.toContain(
      "Data hantu yang dikarang validator",
    );
    expect(body).not.toContain("Data hantu yang dikarang validator");
    expect(body).not.toContain(String(NON_EXISTENT_ID));
  });

  it("sanitizes a validator summary that smuggles a rejected raw value through free text", async () => {
    // Adversarial / prompt-injected validator: the structured rejection list is
    // empty (so reconcileRejections has nothing to catch), but the free-text
    // summary tucks in a rejected data point's raw value to bypass the gate
    // through prose instead of the structured channel.
    validatorState.summary = `Validasi selesai. Realisasi tercatat ${REJECTED_NOSOURCE_VALUE} dan semuanya layak.`;

    const res = await fetch(`${baseUrl}/api/assistant/orchestrate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId }),
    });
    expect(res.status).toBe(200);
    const body = await res.text();
    const events = parseSseEvents(body);

    const finalEvent = events.find((e) => e.type === "final");
    expect(finalEvent).toBeDefined();
    const result = finalEvent!.result as {
      validation: { summary: string };
      audit: { agent: string; contribution: string }[];
    };

    // The rejected raw value must never reach the user-facing validation summary.
    expect(result.validation.summary).not.toContain(REJECTED_NOSOURCE_VALUE);
    // The whole untrusted summary is dropped, replaced by the safe fallback.
    expect(result.validation.summary).toBe(
      "Ringkasan validasi dari agen tidak ditampilkan karena memuat nilai data yang ditolak. Lihat daftar data yang perlu dilengkapi.",
    );

    // Nor may it leak through the validator's audit contribution...
    const validatorAudit = result.audit.find((a) => a.agent === "validator");
    expect(validatorAudit).toBeDefined();
    expect(validatorAudit!.contribution).not.toContain(REJECTED_NOSOURCE_VALUE);

    // ...nor anywhere else in the SSE stream (including the agent_done event).
    expect(body).not.toContain(REJECTED_NOSOURCE_VALUE);
  });

  it("preserves a clean validator summary verbatim", async () => {
    validatorState.summary = "Validasi berjalan baik tanpa temuan tambahan.";

    const res = await fetch(`${baseUrl}/api/assistant/orchestrate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId }),
    });
    expect(res.status).toBe(200);
    const body = await res.text();
    const events = parseSseEvents(body);

    const finalEvent = events.find((e) => e.type === "final");
    expect(finalEvent).toBeDefined();
    const result = finalEvent!.result as {
      validation: { summary: string };
    };
    expect(result.validation.summary).toBe(
      "Validasi berjalan baik tanpa temuan tambahan.",
    );
  });

  const SAFE_FALLBACK =
    "Bagian ini tidak ditampilkan karena memuat nilai data yang ditolak. Lihat daftar data yang perlu dilengkapi.";

  it("drops a rejected raw value smuggled through an LLM rejection reason", async () => {
    // The validator's structured rejection reason for one rejected point tucks
    // in a DIFFERENT rejected point's raw value. The deterministic reason must
    // win so the smuggled value never reaches the result/SSE body.
    const noSourcePoint = await db
      .select({ id: dataPointsTable.id })
      .from(dataPointsTable)
      .where(inArray(dataPointsTable.value, [REJECTED_NOSOURCE_VALUE]));
    validatorState.rejected = [
      {
        id: noSourcePoint[0].id,
        label: REJECTED_NOSOURCE_LABEL,
        reason: `Perlu dilengkapi; bandingkan dengan nilai ${REJECTED_LOWCONF_VALUE}.`,
      },
    ];

    const res = await fetch(`${baseUrl}/api/assistant/orchestrate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId }),
    });
    expect(res.status).toBe(200);
    const body = await res.text();
    const events = parseSseEvents(body);

    const finalEvent = events.find((e) => e.type === "final");
    const result = finalEvent!.result as {
      validation: { rejected: { label: string; reason: string }[] };
    };
    const noSourceRejection = result.validation.rejected.find(
      (r) => r.label === REJECTED_NOSOURCE_LABEL,
    );
    expect(noSourceRejection).toBeDefined();
    expect(noSourceRejection!.reason).not.toContain(REJECTED_LOWCONF_VALUE);
    // The smuggled value must not appear anywhere in the stream.
    expect(body).not.toContain(REJECTED_LOWCONF_VALUE);
  });

  it("drops a rejected raw value smuggled through the collector summary/inventory", async () => {
    collectorState.summary = `Pengumpulan selesai, termasuk nilai ${REJECTED_NOSOURCE_VALUE}.`;
    collectorState.inventory = `- tenaga kerja: ${REJECTED_LOWCONF_VALUE} orang`;

    const res = await fetch(`${baseUrl}/api/assistant/orchestrate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId }),
    });
    expect(res.status).toBe(200);
    const body = await res.text();
    const events = parseSseEvents(body);

    const collectorDone = events.find(
      (e) => e.type === "agent_done" && e.agent === "pengumpul",
    );
    expect(collectorDone).toBeDefined();
    const data = collectorDone!.data as { summary: string; inventory: string };
    expect(data.summary).toBe(SAFE_FALLBACK);
    expect(data.inventory).toBe(SAFE_FALLBACK);

    // And nowhere else in the stream (final result + audit included).
    expect(body).not.toContain(REJECTED_NOSOURCE_VALUE);
    expect(body).not.toContain(REJECTED_LOWCONF_VALUE);
  });

  it("drops a rejected raw value smuggled through the compliance summary", async () => {
    complianceState.summary = `Belum patuh; perhatikan nilai ${REJECTED_BADSTATUS_VALUE}.`;

    const res = await fetch(`${baseUrl}/api/assistant/orchestrate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId }),
    });
    expect(res.status).toBe(200);
    const body = await res.text();
    const events = parseSseEvents(body);

    const finalEvent = events.find((e) => e.type === "final");
    const result = finalEvent!.result as {
      compliance: { summary: string };
    };
    expect(result.compliance.summary).toBe(SAFE_FALLBACK);
    expect(body).not.toContain(REJECTED_BADSTATUS_VALUE);
  });

  it("drops a rejected raw value smuggled through a compliance missing-section note", async () => {
    // kewajiban is a required section for menengah scale with no data at all in
    // this report, so it appears in the deterministically-grounded missing list;
    // its note is LLM free-text and must be sanitized.
    complianceState.missing = [
      {
        section: "kewajiban",
        label: "Realisasi Kewajiban Perusahaan",
        note: `Lengkapi; nilai ${REJECTED_BADSTATUS_VALUE} belum sah.`,
      },
    ];

    const res = await fetch(`${baseUrl}/api/assistant/orchestrate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId }),
    });
    expect(res.status).toBe(200);
    const body = await res.text();
    const events = parseSseEvents(body);

    const finalEvent = events.find((e) => e.type === "final");
    const result = finalEvent!.result as {
      compliance: { missing: { section: string; note: string }[] };
    };
    const kewajibanNote = result.compliance.missing.find(
      (m) => m.section === "kewajiban",
    );
    expect(kewajibanNote).toBeDefined();
    expect(kewajibanNote!.note).not.toContain(REJECTED_BADSTATUS_VALUE);
    expect(body).not.toContain(REJECTED_BADSTATUS_VALUE);
  });

  it("drops a rejected raw value smuggled through the tenggat summary/recommendations", async () => {
    tenggatState.summary = `Risiko sedang; nilai ${REJECTED_NOSOURCE_VALUE} belum terverifikasi.`;
    tenggatState.recommendations = [
      "Segera lengkapi data.",
      `Verifikasi angka ${REJECTED_LOWCONF_VALUE} ke OSS.`,
    ];

    const res = await fetch(`${baseUrl}/api/assistant/orchestrate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId }),
    });
    expect(res.status).toBe(200);
    const body = await res.text();
    const events = parseSseEvents(body);

    const finalEvent = events.find((e) => e.type === "final");
    const result = finalEvent!.result as {
      deadlineRisk: { summary: string; recommendations: string[] };
    };
    expect(result.deadlineRisk.summary).toBe(SAFE_FALLBACK);
    // The whole recommendation list is replaced by the single safe fallback.
    expect(result.deadlineRisk.recommendations).toEqual([SAFE_FALLBACK]);
    expect(body).not.toContain(REJECTED_NOSOURCE_VALUE);
    expect(body).not.toContain(REJECTED_LOWCONF_VALUE);
  });

  it("flags incomplete and expired basis permits in the compliance output and audit", async () => {
    // A dedicated company/izin/report whose Izin has three basis permits: one
    // fulfilled (terbit, still valid), one not yet issued, and one lapsed past
    // its validUntil. Only the two problematic ones must be flagged.
    const [company] = await db
      .insert(companiesTable)
      .values({
        consultantId: CONSULTANT_A,
        name: `PT Uji Perizinan ${suffix}`,
        nib: `NIB-PERMIT-${suffix}`,
        scale: "kecil",
        operatingMode: "komersial",
      })
      .returning({ id: companiesTable.id });
    createdCompanyIds.push(company.id);

    const [izin] = await db
      .insert(izinTable)
      .values({
        companyId: company.id,
        idIzin: `IZIN-PERMIT-${suffix}`,
        scale: "kecil",
      })
      .returning({ id: izinTable.id });

    const [permitReport] = await db
      .insert(reportsTable)
      .values({
        izinId: izin.id,
        scale: "kecil",
        periodType: "triwulan",
        periodLabel: "Triwulan I",
        year: 2026,
        deadline: "2026-04-15",
      })
      .returning({ id: reportsTable.id });

    await db.insert(basisPermitsTable).values([
      { izinId: izin.id, type: "kkpr", status: "terbit" },
      { izinId: izin.id, type: "persetujuan_lingkungan", status: "belum_ada" },
      {
        izinId: izin.id,
        type: "pbg",
        status: "terbit",
        validUntil: "2020-01-01",
      },
    ]);

    const res = await fetch(`${baseUrl}/api/assistant/orchestrate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId: permitReport.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.text();
    const events = parseSseEvents(body);

    const finalEvent = events.find((e) => e.type === "final");
    expect(finalEvent).toBeDefined();
    const result = finalEvent!.result as {
      compliance: {
        status: string;
        permits: {
          type: string;
          label: string;
          expired: boolean;
          issue: string;
        }[];
      };
      dataNotes: string;
      audit: { agent: string; contribution: string }[];
    };

    // The fulfilled permit (kkpr, terbit, valid) is NOT flagged; the other two
    // are, with the lapsed one marked expired.
    const permits = result.compliance.permits;
    expect(permits).toHaveLength(2);
    const byType = Object.fromEntries(permits.map((p) => [p.type, p]));
    expect(byType.kkpr).toBeUndefined();
    expect(byType.persetujuan_lingkungan).toBeDefined();
    expect(byType.persetujuan_lingkungan.expired).toBe(false);
    expect(byType.pbg).toBeDefined();
    expect(byType.pbg.expired).toBe(true);

    // Incomplete permits keep readiness at "perlu_dilengkapi".
    expect(result.compliance.status).toBe("perlu_dilengkapi");

    // The warnings surface in the assembled dataNotes and the compliance audit.
    expect(result.dataNotes).toContain("Perizinan dasar OSS");
    const kepatuhanAudit = result.audit.find((a) => a.agent === "kepatuhan");
    expect(kepatuhanAudit).toBeDefined();
    expect(kepatuhanAudit!.contribution).toContain(
      "Perizinan dasar perlu perhatian",
    );
  });
});
