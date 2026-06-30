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
} from "@workspace/db";

// Capture every prompt the (mocked) AI client is asked to generate, and let each
// test control the model's (adversarial) JSON reply. No real Gemini call is ever
// made.
const { generateContent, calls, draftState } = vi.hoisted(() => {
  const calls: { prompt: string }[] = [];
  const draftState: {
    activityNarrative: string;
    constraintNarrative: string;
    dataNotes: string;
  } = {
    activityNarrative: "Narasi kegiatan.",
    constraintNarrative: "Narasi kendala.",
    dataNotes: "Catatan data.",
  };
  const generateContent = vi.fn(
    async (req: { contents: { parts: { text: string }[] }[] }) => {
      const prompt = req.contents[0].parts[0].text;
      calls.push({ prompt });
      return {
        text: JSON.stringify({
          activityNarrative: draftState.activityNarrative,
          constraintNarrative: draftState.constraintNarrative,
          dataNotes: draftState.dataNotes,
        }),
      };
    },
  );
  return { generateContent, calls, draftState };
});

// Mock the AI client module; re-use the real labels (no side effects).
vi.mock("../lib/ai", async () => {
  const labels =
    await vi.importActual<typeof import("../lib/labels")>("../lib/labels");
  return {
    ai: { models: { generateContent } },
    MODEL: "gemini-2.5-flash",
    SCALE_LABELS: labels.SCALE_LABELS,
    STATUS_LABELS: labels.STATUS_LABELS,
  };
});

// Imported after vi.mock so the router picks up the mocked AI client.
const { default: anthropicRouter } = await import("./anthropic");

const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const CONSULTANT_A = `test-report-draft-${suffix}`;

// Distinctive numeric values (value is a numeric column) let us prove which data
// points reached the prompt and that none of the rejected values leak.
const VALIDATED_VALUE = "123456789";
const REJECTED_NOSOURCE_VALUE = "911111111";
const REJECTED_LOWCONF_VALUE = "922222222";
const REJECTED_BADSTATUS_VALUE = "933333333";

const REJECTED_NOSOURCE_LABEL = `Realisasi tanpa sumber ${suffix}`;
const REJECTED_LOWCONF_LABEL = `Realisasi keyakinan rendah ${suffix}`;
const REJECTED_BADSTATUS_LABEL = `Realisasi status estimasi ${suffix}`;

let reportId = 0;
const createdCompanyIds: number[] = [];

let server: ReturnType<express.Express["listen"]>;
let baseUrl = "";

beforeAll(async () => {
  // The report-draft endpoint now meters pendampingan AI by credits. Grant the
  // test consultant an ample top-up balance so every call in this suite is paid
  // for; the credit gate itself is covered by billing.test.ts.
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
      name: `PT Uji Draf ${suffix}`,
      nib: `NIB-${suffix}`,
      scale: "menengah",
      operatingMode: "komersial",
    })
    .returning({ id: companiesTable.id });
  createdCompanyIds.push(company.id);

  const [izin] = await db
    .insert(izinTable)
    .values({
      companyId: company.id,
      idIzin: `IZIN-${suffix}`,
      scale: "menengah",
    })
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

  await db.insert(dataPointsTable).values([
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
  ]);

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
  app.use("/api", anthropicRouter);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  if (server)
    await new Promise<void>((resolve) => server.close(() => resolve()));
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
  draftState.activityNarrative = "Narasi kegiatan.";
  draftState.constraintNarrative = "Narasi kendala.";
  draftState.dataNotes = "Catatan data.";
});

describe("POST /api/assistant/report-draft anti-hallucination gating", () => {
  it("only shows validated data points to the model, never rejected raw values", async () => {
    const res = await fetch(`${baseUrl}/api/assistant/report-draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId }),
    });
    expect(res.status).toBe(200);
    await res.json();

    expect(calls).toHaveLength(1);
    const prompt = calls[0].prompt;

    // The validated value must appear in the usable section of the prompt.
    expect(prompt).toContain(VALIDATED_VALUE);

    // No rejected/low-confidence/unsourced VALUE may reach the model.
    expect(prompt).not.toContain(REJECTED_NOSOURCE_VALUE);
    expect(prompt).not.toContain(REJECTED_LOWCONF_VALUE);
    expect(prompt).not.toContain(REJECTED_BADSTATUS_VALUE);

    // The "boleh dipakai" (usable) block lists only the validated point; the
    // rejected points are only named (by label) in the "perlu dilengkapi" block.
    const usableBlock = prompt.slice(
      prompt.indexOf("DATA POINT LOLOS VALIDASI"),
      prompt.indexOf("DATA YANG PERLU DILENGKAPI"),
    );
    expect(usableBlock).toContain("Realisasi investasi modal");
    expect(usableBlock).not.toContain(REJECTED_NOSOURCE_LABEL);
    expect(usableBlock).not.toContain(REJECTED_LOWCONF_LABEL);
    expect(usableBlock).not.toContain(REJECTED_BADSTATUS_LABEL);
  });

  it("drops a rejected raw value smuggled through the activity narrative", async () => {
    // Adversarial / prompt-injected model: it tucks a rejected data point's raw
    // value into the activity narrative to bypass the gate through prose.
    draftState.activityNarrative = `Realisasi investasi tercatat ${REJECTED_NOSOURCE_VALUE} dan sudah final.`;

    const res = await fetch(`${baseUrl}/api/assistant/report-draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      activityNarrative: string;
      constraintNarrative: string;
      dataNotes: string;
      disclaimer: string;
    };

    // The whole leaking field is dropped and replaced by the safe fallback.
    expect(body.activityNarrative).not.toContain(REJECTED_NOSOURCE_VALUE);
    expect(body.activityNarrative).toBe(
      "Bagian ini tidak ditampilkan karena memuat nilai data yang ditolak. Lihat daftar data yang perlu dilengkapi.",
    );
    // And nowhere in the full response body.
    expect(JSON.stringify(body)).not.toContain(REJECTED_NOSOURCE_VALUE);
  });

  it("drops rejected raw values smuggled through constraint narrative and data notes", async () => {
    draftState.constraintNarrative = `Kendala terkait nilai ${REJECTED_LOWCONF_VALUE}.`;
    draftState.dataNotes = `Periksa nilai ${REJECTED_BADSTATUS_VALUE}.`;

    const res = await fetch(`${baseUrl}/api/assistant/report-draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      activityNarrative: string;
      constraintNarrative: string;
      dataNotes: string;
      disclaimer: string;
    };

    const SAFE =
      "Bagian ini tidak ditampilkan karena memuat nilai data yang ditolak. Lihat daftar data yang perlu dilengkapi.";
    expect(body.constraintNarrative).toBe(SAFE);
    expect(body.dataNotes).toBe(SAFE);

    expect(JSON.stringify(body)).not.toContain(REJECTED_LOWCONF_VALUE);
    expect(JSON.stringify(body)).not.toContain(REJECTED_BADSTATUS_VALUE);
  });

  it("preserves clean narratives verbatim", async () => {
    draftState.activityNarrative = "Realisasi penanaman modal berjalan baik.";
    draftState.constraintNarrative = "Tidak ada kendala berarti.";
    draftState.dataNotes = "Semua data point siap diverifikasi.";

    const res = await fetch(`${baseUrl}/api/assistant/report-draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      activityNarrative: string;
      constraintNarrative: string;
      dataNotes: string;
      disclaimer: string;
    };

    expect(body.activityNarrative).toBe(
      "Realisasi penanaman modal berjalan baik.",
    );
    expect(body.constraintNarrative).toBe("Tidak ada kendala berarti.");
    expect(body.dataNotes).toBe("Semua data point siap diverifikasi.");
  });
});
