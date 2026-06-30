import { Router, type IRouter } from "express";
import {
  db,
  reportsTable,
  izinTable,
  companiesTable,
  dataPointsTable,
  constraintsTable,
} from "@workspace/db";
import { eq, asc, and } from "drizzle-orm";
import type { z } from "zod";
import { OrchestrateReportDraftBody } from "@workspace/api-zod";
import { ai, MODEL, SCALE_LABELS, STATUS_LABELS } from "../lib/ai";
import { getConsultantId } from "../middlewares/auth";
import { getUserRole } from "../lib/user";
import {
  resolvePlan,
  consumeCredit,
  refundCredit,
  type CreditBucket,
} from "../lib/billing";
import { type AgentKey, AGENT_LABELS } from "../lib/agent-keys";
import {
  evaluateGate,
  reconcileRejections,
  sanitizeValidatorSummary,
  sanitizeAgentText,
  sanitizeRecommendations,
  SANITIZED_AGENT_TEXT,
  MIN_CONFIDENCE,
} from "../lib/gate";
import {
  AgentOutputError,
  CollectorSchema,
  ValidatorSchema,
  ComplianceSchema,
  NarrativeSchema,
  DeadlineRiskSchema,
} from "../lib/agent-schemas";

const router: IRouter = Router();

const ORCHESTRATOR_SYSTEM_PROMPT =
  "Anda bagian dari sistem agentik penyusun LKPM yang teliti dan patuh pada doktrin anti-halusinasi data. Anda hanya boleh memakai data yang diberikan dan tidak pernah mengarang angka, sumber, atau fakta hukum. Selalu Bahasa Indonesia formal, tanpa emoji. Selalu balas HANYA objek JSON valid sesuai bentuk yang diminta, tanpa pagar kode dan tanpa teks lain.";

const SECTION_LABELS: Record<string, string> = {
  investasi: "Realisasi Penanaman Modal",
  tenaga_kerja: "Realisasi Penggunaan Tenaga Kerja",
  produksi: "Realisasi Produksi dan Ekspor",
  kewajiban: "Realisasi Kewajiban Perusahaan",
};

function requiredSectionsForScale(scale: string): string[] {
  if (scale === "menengah" || scale === "besar") {
    return ["investasi", "tenaga_kerja", "produksi", "kewajiban"];
  }
  return ["investasi", "tenaga_kerja"];
}

interface DataPointCtx {
  id: number;
  category: string;
  label: string;
  value: string | null;
  unit: string | null;
  source: string | null;
  status: string;
  confidence: number;
}

async function callAgentJSON<S extends z.ZodTypeAny>(
  agent: AgentKey,
  schema: S,
  userPrompt: string,
): Promise<z.infer<S>> {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction: ORCHESTRATOR_SYSTEM_PROMPT,
      responseMimeType: "application/json",
      maxOutputTokens: 8192,
    },
  });
  const text = response.text ?? "";
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new AgentOutputError(
      agent,
      "Balasan agen bukan JSON yang valid.",
      err,
    );
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new AgentOutputError(
      agent,
      "Balasan agen tidak sesuai format yang diharapkan.",
      result.error,
    );
  }
  return result.data;
}

function describeDataPoint(dp: DataPointCtx): string {
  return `- [id ${dp.id}] [${dp.category}] ${dp.label}: ${
    dp.value === null ? "(tidak ada nilai)" : dp.value
  }${dp.unit ? " " + dp.unit : ""} | sumber: ${
    dp.source && dp.source.trim() ? dp.source : "(tidak ada sumber)"
  } | status: ${STATUS_LABELS[dp.status] ?? dp.status} | confidence: ${dp.confidence}`;
}

router.post("/assistant/orchestrate", async (req, res) => {
  const consultantId = getConsultantId(req);
  const body = OrchestrateReportDraftBody.parse(req.body);

  const [row] = await db
    .select({
      report: reportsTable,
      companyName: companiesTable.name,
      scale: reportsTable.scale,
      operatingMode: companiesTable.operatingMode,
    })
    .from(reportsTable)
    .innerJoin(izinTable, eq(reportsTable.izinId, izinTable.id))
    .innerJoin(companiesTable, eq(izinTable.companyId, companiesTable.id))
    .where(
      and(
        eq(reportsTable.id, body.reportId),
        eq(companiesTable.consultantId, consultantId),
      ),
    );

  if (!row) {
    res.status(404).json({ error: "Laporan tidak ditemukan" });
    return;
  }

  // Pendampingan AI dibatasi kredit. Konsumsi 1 kredit (jatah bulanan dulu,
  // lalu saldo beli) sebelum streaming dimulai. Bila tidak ada kredit, tolak
  // dengan 402 sebelum header SSE dikirim. Kredit dikembalikan bila pipeline
  // gagal total (lihat blok catch). Fitur anti-halusinasi lain tetap gratis.
  const role = await getUserRole(consultantId);
  const plan = await resolvePlan(consultantId, role);
  const charge = await consumeCredit(consultantId, plan, "orkestrasi LKPM");
  if (!charge.ok) {
    res.status(402).json({
      error:
        "Kredit pendampingan AI habis. Tingkatkan paket atau beli paket kredit untuk melanjutkan.",
    });
    return;
  }
  const consumedBucket: CreditBucket | null = charge.bucket;

  const [dataPointRows, constraintRows] = await Promise.all([
    db
      .select()
      .from(dataPointsTable)
      .where(eq(dataPointsTable.reportId, body.reportId))
      .orderBy(asc(dataPointsTable.id)),
    db
      .select()
      .from(constraintsTable)
      .where(eq(constraintsTable.reportId, body.reportId))
      .orderBy(asc(constraintsTable.id)),
  ]);

  const dataPoints: DataPointCtx[] = dataPointRows.map((dp) => ({
    id: dp.id,
    category: dp.category,
    label: dp.label,
    value: dp.value,
    unit: dp.unit,
    source: dp.source,
    status: dp.status,
    confidence: dp.confidence,
  }));
  const constraints = constraintRows.map((c) => ({
    issue: c.issue,
    followUp: c.followUp,
  }));

  // --- Deterministic grounding facts ---
  const scaleLabel = SCALE_LABELS[row.scale] ?? row.scale;
  const focus = body.focus?.trim();

  // The gate is enforced DETERMINISTICALLY in code, not by the LLM. A data point
  // is usable ONLY if it has a non-empty source AND an acceptable verification
  // status (terverifikasi or pernyataan_mandiri) AND confidence >=
  // MIN_CONFIDENCE. Evaluated up-front so the rejected raw values are known
  // before the first agent's output is surfaced, letting every free-text channel
  // be sanitized against them.
  const { validated: validatedDataPoints, failures: gateFailures } =
    evaluateGate(dataPoints);
  // The raw values of every rejected point. NO agent free-text the orchestrator
  // surfaces verbatim may contain any of these (anti-hallucination doctrine).
  const rejectedRawValues = gateFailures.map((g) => g.dp.value);

  const requiredSections = requiredSectionsForScale(row.scale);
  const categoriesWithData = new Set(dataPoints.map((dp) => dp.category));
  const missingSections = requiredSections.filter(
    (s) => !categoriesWithData.has(s),
  );

  const deadline = row.report.deadline;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(`${deadline}T00:00:00`);
  const daysRemaining = Math.round(
    (deadlineDate.getTime() - today.getTime()) / 86400000,
  );

  const profileText = `PROFIL LAPORAN:
- Perusahaan: ${row.companyName}
- Skala usaha: ${scaleLabel}
- Mode operasi: ${row.operatingMode}
- Periode: ${row.report.periodLabel} (${row.report.periodType}) tahun ${row.report.year}
- Status pipeline: ${row.report.status}
- Tenggat: ${deadline} (sisa ${daysRemaining} hari dari hari ini)`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (payload: unknown) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };
  const start = (agent: AgentKey) =>
    send({ type: "agent_start", agent, label: AGENT_LABELS[agent] });
  const done = (agent: AgentKey, data: unknown) =>
    send({ type: "agent_done", agent, label: AGENT_LABELS[agent], data });

  // Run an agent and validate its output. On an output/parse problem, emit a
  // clear per-agent error event and return a safe fallback so the pipeline can
  // continue and assemble a recoverable result instead of throwing deep in
  // assembly. Real API/network failures still propagate to the global handler.
  async function runAgent<S extends z.ZodTypeAny>(
    agent: AgentKey,
    schema: S,
    userPrompt: string,
    fallback: z.infer<S>,
  ): Promise<{ value: z.infer<S>; degraded: boolean }> {
    try {
      const value = await callAgentJSON(agent, schema, userPrompt);
      return { value, degraded: false };
    } catch (err) {
      if (err instanceof AgentOutputError) {
        req.log.warn({ agent, err }, "Output agen tidak valid");
        send({
          type: "agent_error",
          agent,
          label: AGENT_LABELS[agent],
          error: `${AGENT_LABELS[agent]} mengembalikan keluaran yang tidak valid (${err.message}). Sistem melanjutkan dengan keluaran terbatas untuk agen ini.`,
        });
        return { value: fallback, degraded: true };
      }
      throw err;
    }
  }

  try {
    // === 1. Agen Pengumpul Data ===
    start("pengumpul");
    const dpListText = dataPoints.length
      ? dataPoints.map(describeDataPoint).join("\n")
      : "(belum ada data point)";
    const constraintText = constraints.length
      ? constraints
          .map(
            (c) =>
              `- Kendala: ${c.issue}${
                c.followUp ? ` | Rencana tindak lanjut: ${c.followUp}` : ""
              }`,
          )
          .join("\n")
      : "(tidak ada kendala tercatat)";

    const { value: collector, degraded: collectorDegraded } = await runAgent(
      "pengumpul",
      CollectorSchema,
      `Anda Agen Pengumpul Data. Rangkum dan strukturkan data point serta kendala laporan berikut tanpa menambah angka atau fakta baru.

${profileText}

DATA POINT:
${dpListText}

KENDALA:
${constraintText}

Kembalikan objek JSON: {"summary": "ringkasan 1-2 kalimat kondisi kelengkapan data", "inventory": "daftar ringkas data yang tersedia dikelompokkan per kategori (investasi, tenaga kerja, produksi, kewajiban) dalam bentuk teks bullet"}`,
      {
        summary:
          "Ringkasan pengumpulan data tidak tersedia karena keluaran agen tidak valid.",
        inventory: "",
      },
    );
    // The collector's free-text is surfaced verbatim (done event + audit), so it
    // must not smuggle a rejected raw value past the gate.
    collector.summary = sanitizeAgentText(
      collector.summary,
      rejectedRawValues,
      SANITIZED_AGENT_TEXT,
    ).text;
    collector.inventory = sanitizeAgentText(
      collector.inventory,
      rejectedRawValues,
      SANITIZED_AGENT_TEXT,
    ).text;
    if (!collectorDegraded) done("pengumpul", collector);

    // === 2. Agen Validator Anti-Halusinasi (GATE) ===
    start("validator");
    // The gate itself was already evaluated deterministically up-front (see
    // `validatedDataPoints`/`gateFailures` above). The LLM is used solely to
    // phrase the human-readable summary and rejection reasons; it cannot promote
    // a data point past the gate. This is the structural anti-hallucination
    // guarantee.
    //
    // The LLM only enriches the summary/rejection wording for points the code
    // has already rejected. It can never widen the usable set (enforced by
    // reconcileRejections below).
    let validatorRaw: {
      rejected: { id: number; label: string; reason: string }[];
      summary: string;
    };
    let validatorDegraded = false;
    if (dataPoints.length) {
      const r = await runAgent(
        "validator",
        ValidatorSchema,
        `Anda Agen Validator Anti-Halusinasi. Keputusan kelayakan data SUDAH ditetapkan secara deterministik oleh sistem (sumber jelas, status Terverifikasi/Pernyataan mandiri, confidence >= ${MIN_CONFIDENCE}). Tugas Anda HANYA menulis ringkasan dan memperjelas alasan untuk data yang DITOLAK di bawah ini. Jangan pernah menyatakan data tertentu layak; jangan mengarang.

DATA LOLOS (${validatedDataPoints.length}):
${validatedDataPoints.length ? validatedDataPoints.map((dp) => `- [${dp.id}] ${dp.label}`).join("\n") : "- (tidak ada)"}

DATA DITOLAK / PERLU DILENGKAPI:
${gateFailures.length ? gateFailures.map((g) => `- [${g.dp.id}] ${g.dp.label}: ${g.reason}`).join("\n") : "- (tidak ada)"}

Kembalikan objek JSON: {"rejected": [{"id": id, "label": "label", "reason": "alasan singkat perlu dilengkapi"}], "summary": "ringkasan hasil validasi 1-2 kalimat"}`,
        { rejected: [], summary: "" },
      );
      validatorRaw = r.value;
      validatorDegraded = r.degraded;
    } else {
      validatorRaw = {
        rejected: [],
        summary: "Belum ada data point untuk divalidasi.",
      };
    }

    const rejected = reconcileRejections(
      dataPoints,
      { validated: validatedDataPoints, failures: gateFailures },
      validatorRaw.rejected,
      rejectedRawValues,
    );

    // Sanitize the validator's free-text summary: it may phrase the result but
    // must never surface a raw value the gate rejected (the structured list is
    // already locked down by reconcileRejections). This closes the free-text
    // bypass of the anti-hallucination guarantee.
    const safeValidatorSummary = sanitizeValidatorSummary(
      validatorRaw.summary,
      rejectedRawValues,
    );
    if (safeValidatorSummary.leaked) {
      req.log.warn(
        { reportId: body.reportId },
        "Ringkasan validator memuat nilai data yang ditolak; ringkasan diganti dengan teks aman",
      );
    }

    const validation = {
      usableCount: validatedDataPoints.length,
      rejected: rejected.map((r) => ({ label: r.label, reason: r.reason })),
      summary: safeValidatorSummary.summary,
    };
    if (!validatorDegraded) done("validator", validation);

    // === 3. Agen Pemeriksa Kepatuhan OSS ===
    start("kepatuhan");
    const requiredText = requiredSections
      .map(
        (s) =>
          `- ${SECTION_LABELS[s]}: ${
            categoriesWithData.has(s) ? "ADA data" : "BELUM ada data"
          }`,
      )
      .join("\n");
    const { value: compliance, degraded: complianceDegraded } = await runAgent(
      "kepatuhan",
      ComplianceSchema,
      `Anda Agen Pemeriksa Kepatuhan OSS. Berdasarkan FAKTA kelengkapan bagian wajib untuk skala ${scaleLabel} berikut (jangan menambah bagian wajib lain), tentukan kepatuhan kelengkapan LKPM.

BAGIAN WAJIB (skala ${scaleLabel}):
${requiredText}

Bagian yang belum ada data: ${
        missingSections.length
          ? missingSections.map((s) => SECTION_LABELS[s]).join(", ")
          : "(tidak ada — semua bagian wajib memiliki data)"
      }

Kembalikan objek JSON: {"status": "lengkap" atau "perlu_dilengkapi", "missing": [{"section": "kode bagian", "label": "nama bagian", "note": "apa yang perlu dilengkapi"}], "summary": "ringkasan kepatuhan 1-2 kalimat"}`,
      { status: "", missing: [], summary: "" },
    );
    // Ground the missing list deterministically so it cannot be hallucinated.
    // The per-section note is LLM free-text, so it is sanitized against rejected
    // raw values before being surfaced.
    compliance.missing = missingSections.map((s) => ({
      section: s,
      label: SECTION_LABELS[s],
      note: sanitizeAgentText(
        compliance.missing?.find((m) => m.section === s)?.note,
        rejectedRawValues,
        "Belum ada data point untuk bagian wajib ini.",
      ).text || "Belum ada data point untuk bagian wajib ini.",
    }));
    // The compliance summary is also surfaced verbatim (done event + audit).
    compliance.summary = sanitizeAgentText(
      compliance.summary,
      rejectedRawValues,
      SANITIZED_AGENT_TEXT,
    ).text;
    compliance.status =
      missingSections.length === 0 ? "lengkap" : "perlu_dilengkapi";
    if (!complianceDegraded) done("kepatuhan", compliance);

    // === 4. Agen Penyusun Narasi (gated: only validated data) ===
    start("narasi");
    const validatedText = validatedDataPoints.length
      ? validatedDataPoints.map(describeDataPoint).join("\n")
      : "(tidak ada data point yang lolos validasi)";
    const rejectedText = rejected.length
      ? rejected.map((r) => `- ${r.label}: ${r.reason}`).join("\n")
      : "(tidak ada)";

    const { value: narrative, degraded: narrativeDegraded } = await runAgent(
      "narasi",
      NarrativeSchema,
      `Anda Agen Penyusun Narasi. Susun narasi LKPM HANYA dari data yang LOLOS VALIDASI di bawah. JANGAN memakai atau menyebut angka dari data yang ditolak, dan JANGAN mengarang. Bila data lolos tidak cukup untuk narasi yang utuh, nyatakan secara eksplisit bagian yang belum dapat dinarasikan karena datanya perlu dilengkapi.

${profileText}

DATA POINT LOLOS VALIDASI (boleh dipakai):
${validatedText}

DATA YANG DITOLAK (JANGAN dipakai untuk angka, hanya untuk menyebut bahwa perlu dilengkapi):
${rejectedText}

KENDALA:
${constraintText}

${focus ? `PENEKANAN DARI PENGGUNA: ${focus}\n\n` : ""}Kembalikan objek JSON: {"activityNarrative": "narasi kegiatan penanaman modal Bahasa Indonesia formal", "constraintNarrative": "narasi kendala dan rencana tindak lanjut; bila tidak ada kendala, nyatakan demikian"}`,
      {
        activityNarrative:
          "Narasi kegiatan tidak dapat disusun otomatis karena keluaran agen tidak valid. Mohon susun narasi secara manual berdasarkan data yang lolos validasi.",
        constraintNarrative:
          "Narasi kendala tidak dapat disusun otomatis karena keluaran agen tidak valid. Mohon lengkapi secara manual.",
      },
    );
    if (!narrativeDegraded) done("narasi", narrative);

    // === 5. Agen Pemantau Tenggat & Risiko Sanksi ===
    start("tenggat");
    const { value: deadlineRisk, degraded: tenggatDegraded } = await runAgent(
      "tenggat",
      DeadlineRiskSchema,
      `Anda Agen Pemantau Tenggat & Risiko Sanksi. Berdasarkan fakta tenggat berikut, nilai tingkat risiko keterlambatan dan sanksi LKPM. Jangan mengarang ketentuan hukum spesifik; cukup mengacu pada konsekuensi umum keterlambatan LKPM (peringatan hingga risiko pembekuan/pencabutan perizinan) dan dorong verifikasi ke OSS.

FAKTA TENGGAT:
- Tenggat: ${deadline}
- Sisa waktu: ${daysRemaining} hari (negatif berarti sudah lewat)
- Status pipeline laporan: ${row.report.status}
- Kelengkapan bagian wajib: ${
      missingSections.length
        ? `belum lengkap (${missingSections
            .map((s) => SECTION_LABELS[s])
            .join(", ")})`
        : "lengkap"
    }

Tentukan riskLevel: "tinggi" bila sudah lewat tenggat atau sisa < 7 hari dengan data belum lengkap; "sedang" bila sisa < 14 hari atau data belum lengkap; selain itu "rendah".

Kembalikan objek JSON: {"riskLevel": "rendah|sedang|tinggi", "summary": "ringkasan risiko 1-2 kalimat", "recommendations": ["langkah konkret 1", "langkah konkret 2"]}`,
      { riskLevel: "", summary: "", recommendations: [] },
    );
    // Ground riskLevel deterministically so it cannot drift from the facts.
    const incomplete = missingSections.length > 0;
    const riskLevel =
      daysRemaining < 0 || (daysRemaining < 7 && incomplete)
        ? "tinggi"
        : daysRemaining < 14 || incomplete
          ? "sedang"
          : "rendah";
    deadlineRisk.riskLevel = riskLevel;
    // The tenggat summary and recommendations are surfaced verbatim (done event,
    // final result, audit), so they must not carry a rejected raw value.
    deadlineRisk.summary = sanitizeAgentText(
      deadlineRisk.summary,
      rejectedRawValues,
      SANITIZED_AGENT_TEXT,
    ).text;
    deadlineRisk.recommendations = sanitizeRecommendations(
      deadlineRisk.recommendations,
      rejectedRawValues,
      SANITIZED_AGENT_TEXT,
    ).recommendations;
    if (!tenggatDegraded)
      done("tenggat", {
        daysRemaining,
        riskLevel,
        summary: deadlineRisk.summary,
        recommendations: deadlineRisk.recommendations ?? [],
      });

    // === Orchestrator final assembly ===
    const dataNotesParts: string[] = [];
    if (validation.rejected.length) {
      dataNotesParts.push(
        `Perlu dilengkapi sebelum disampaikan:\n${validation.rejected
          .map((r) => `- ${r.label}: ${r.reason}`)
          .join("\n")}`,
      );
    }
    if (missingSections.length) {
      dataNotesParts.push(
        `Bagian wajib OSS yang belum berisi data: ${missingSections
          .map((s) => SECTION_LABELS[s])
          .join(", ")}.`,
      );
    }
    if (!dataNotesParts.length) {
      dataNotesParts.push(
        "Seluruh data point lolos validasi dan bagian wajib telah terisi. Tetap verifikasi ulang ke sumber resmi sebelum submit.",
      );
    }

    const result = {
      activityNarrative: narrative.activityNarrative ?? "",
      constraintNarrative: narrative.constraintNarrative ?? "",
      dataNotes: dataNotesParts.join("\n\n"),
      compliance,
      deadlineRisk: {
        daysRemaining,
        riskLevel: deadlineRisk.riskLevel,
        summary: deadlineRisk.summary ?? "",
        recommendations: deadlineRisk.recommendations ?? [],
      },
      validation,
      audit: [
        {
          agent: "pengumpul",
          label: AGENT_LABELS.pengumpul,
          contribution: collector.summary ?? "",
        },
        {
          agent: "validator",
          label: AGENT_LABELS.validator,
          contribution: `${validation.usableCount} data lolos, ${validation.rejected.length} perlu dilengkapi. ${validation.summary}`,
        },
        {
          agent: "kepatuhan",
          label: AGENT_LABELS.kepatuhan,
          contribution: compliance.summary ?? "",
        },
        {
          agent: "narasi",
          label: AGENT_LABELS.narasi,
          contribution:
            "Menyusun narasi kegiatan dan kendala hanya dari data yang lolos validasi.",
        },
        {
          agent: "tenggat",
          label: AGENT_LABELS.tenggat,
          contribution: `Tingkat risiko: ${deadlineRisk.riskLevel}. ${deadlineRisk.summary}`,
        },
      ],
      disclaimer:
        "Draf ini disusun oleh sistem agentik dari data yang tersedia dan hanya memakai data yang lolos validasi. Periksa, verifikasi setiap angka ke sumber resmi, dan sesuaikan sebelum disampaikan melalui OSS.",
    };

    send({ type: "final", result });
    send({ type: "done" });
    res.end();
  } catch (err) {
    req.log.error({ err }, "Gagal menjalankan orkestrasi penyusun LKPM");
    // Pipeline gagal total: kembalikan kredit yang sudah dikonsumsi.
    if (consumedBucket) {
      try {
        await refundCredit(consultantId, consumedBucket, "refund orkestrasi LKPM");
      } catch (refundErr) {
        req.log.error({ err: refundErr }, "Gagal mengembalikan kredit");
      }
    }
    if (err instanceof AgentOutputError) {
      send({
        type: "error",
        agent: err.agent,
        label: AGENT_LABELS[err.agent],
        error: `${AGENT_LABELS[err.agent]} mengembalikan hasil yang tidak dapat diproses. Coba jalankan ulang.`,
      });
    } else {
      send({
        type: "error",
        error:
          "Gagal menjalankan asisten agentik. Periksa kuota layanan AI dan coba lagi.",
      });
    }
    res.end();
  }
});

export default router;
