import { Router, type IRouter } from "express";
import {
  db,
  reportsTable,
  izinTable,
  companiesTable,
  dataPointsTable,
  constraintsTable,
  conversations as conversationsTable,
  messages as messagesTable,
} from "@workspace/db";
import { eq, asc, and } from "drizzle-orm";
import {
  GenerateReportDraftBody,
  GenerateReportDraftResponse,
  CreateAnthropicConversationBody,
  GetAnthropicConversationParams,
  DeleteAnthropicConversationParams,
  SendAnthropicMessageParams,
  SendAnthropicMessageBody,
} from "@workspace/api-zod";
import { getConsultantId } from "../middlewares/auth";
import { getUserRole } from "../lib/user";
import { resolvePlan, consumeCredit, refundCredit } from "../lib/billing";
import { ai, MODEL, SCALE_LABELS, STATUS_LABELS } from "../lib/ai";
import { parseDraftJson } from "../lib/draft-json";
import {
  evaluateGate,
  sanitizeAgentText,
  SANITIZED_AGENT_TEXT,
  type GateDataPoint,
} from "../lib/gate";

const router: IRouter = Router();

const DRAFT_SYSTEM_PROMPT =
  "Anda asisten penyusun draf LKPM yang teliti dan patuh pada doktrin anti-halusinasi data. Anda hanya boleh memakai data yang diberikan, tidak pernah mengarang angka atau sumber. Selalu Bahasa Indonesia, tanpa emoji.";

const MENTOR_SYSTEM_PROMPT = `Anda adalah "Mentor LKPM Gustafta", mentor ahli pelaporan LKPM-BKPM untuk perusahaan Indonesia yang melapor lewat OSS.

Gaya mengajar Anda adalah DIALOG SOCRATES, bukan ceramah:
- Jangan langsung memberi jawaban akhir. Pandu peserta menemukan jawaban lewat pertanyaan yang terarah.
- Ajukan satu sampai dua pertanyaan pendek di tiap giliran untuk menggali pemahaman peserta sebelum melangkah.
- Setelah peserta menjawab, beri penegasan singkat, koreksi bila perlu, lalu lanjut ke pertanyaan berikutnya.
- Bila peserta benar-benar buntu atau memintanya secara eksplisit, baru berikan penjelasan ringkas dan konkret, lalu kembali ke mode bertanya.

Materi yang Anda kuasai: kewajiban LKPM, periode pelaporan (triwulanan untuk skala menengah/besar, semesteran untuk mikro/kecil), tenggat tanggal 15 (Perka BKPM No. 5 Tahun 2025, berlaku 2 Oktober 2025, sebelumnya tanggal 10), komponen LKPM (realisasi investasi, tenaga kerja, kendala), alur OSS, serta doktrin anti-halusinasi data (setiap angka harus punya sumber, status verifikasi, dan tingkat keyakinan/confidence).

Aturan penting:
- Selalu berbahasa Indonesia. Jangan gunakan emoji.
- Jangan mengarang fakta hukum atau angka. Bila tidak yakin akan ketentuan terbaru, sampaikan keterbatasan itu dan sarankan verifikasi ke OSS/JDIH BKPM.
- Jaga jawaban tetap ringkas dan fokus, seperti mentor yang sabar.`;

interface DraftDataPoint extends GateDataPoint {
  category: string;
  value: string | null;
  unit: string | null;
}

interface ReportContext {
  companyName: string;
  scale: string;
  operatingMode: string;
  periodLabel: string;
  periodType: string;
  year: number;
  deadline: string;
  narrative: string | null;
  dataPoints: DraftDataPoint[];
  constraints: { issue: string; followUp: string | null }[];
}

function describeDraftDataPoint(dp: DraftDataPoint): string {
  return `- [${dp.category}] ${dp.label}: ${
    dp.value === null ? "(tidak ada nilai)" : dp.value
  }${dp.unit ? " " + dp.unit : ""} | sumber: ${
    dp.source && dp.source.trim() ? dp.source : "(tidak ada sumber)"
  } | status: ${STATUS_LABELS[dp.status] ?? dp.status} | confidence: ${dp.confidence}`;
}

// Builds the one-shot draft prompt. Like the orchestrator's narrative agent, the
// model is ONLY shown data points that passed the deterministic gate
// (`validated`). Rejected points are listed by label only (never their raw
// value) so the model can say they "perlu dilengkapi" but can never narrate a
// rejected/unverified number. This is the structural half of the
// anti-hallucination guarantee; the free-text output is also sanitized
// afterwards in case a misbehaving model invents or echoes a rejected value.
function buildDraftPrompt(
  ctx: ReportContext,
  validated: DraftDataPoint[],
  rejectedLabels: string[],
  focus?: string,
): string {
  const dpLines = validated.length
    ? validated.map(describeDraftDataPoint).join("\n")
    : "(tidak ada data point yang lolos validasi)";

  const rejectedLines = rejectedLabels.length
    ? rejectedLabels.map((label) => `- ${label}`).join("\n")
    : "(tidak ada)";

  const constraintLines = ctx.constraints.length
    ? ctx.constraints
        .map(
          (c) =>
            `- Kendala: ${c.issue}${
              c.followUp ? ` | Rencana tindak lanjut: ${c.followUp}` : ""
            }`,
        )
        .join("\n")
    : "(tidak ada kendala tercatat)";

  return `Susun draf narasi LKPM untuk laporan berikut. Gunakan HANYA data yang LOLOS VALIDASI di bawah. JANGAN memakai, menyebut, atau menebak angka dari data yang perlu dilengkapi, dan JANGAN mengarang angka, sumber, atau fakta apa pun yang tidak tercantum. Bila data lolos tidak cukup untuk menyusun narasi yang utuh, sebutkan secara eksplisit kekurangan itu alih-alih menebak.

PROFIL:
- Perusahaan: ${ctx.companyName}
- Skala usaha: ${SCALE_LABELS[ctx.scale] ?? ctx.scale}
- Mode operasi: ${ctx.operatingMode}
- Periode: ${ctx.periodLabel} (${ctx.periodType}) tahun ${ctx.year}
- Tenggat: ${ctx.deadline}

DATA POINT LOLOS VALIDASI (boleh dipakai, angka realisasi & lainnya):
${dpLines}

DATA YANG PERLU DILENGKAPI (JANGAN dipakai untuk angka, hanya untuk menyebut bahwa perlu dilengkapi):
${rejectedLines}

KENDALA:
${constraintLines}

${focus ? `PENEKANAN DARI PENGGUNA: ${focus}\n\n` : ""}Kembalikan HANYA objek JSON valid (tanpa pagar kode, tanpa teks lain) dengan bentuk persis:
{
  "activityNarrative": "narasi kegiatan penanaman modal untuk periode ini dalam Bahasa Indonesia formal",
  "constraintNarrative": "narasi kendala dan rencana tindak lanjut; bila tidak ada kendala, nyatakan demikian",
  "dataNotes": "catatan singkat soal kualitas data: data point yang belum terverifikasi, confidence rendah, atau sumber yang belum lengkap, sehingga pengguna tahu apa yang harus diverifikasi sebelum submit"
}
Jangan gunakan emoji. Jangan tambahkan kunci lain.`;
}

router.post("/assistant/report-draft", async (req, res) => {
  const consultantId = getConsultantId(req);
  const body = GenerateReportDraftBody.parse(req.body);

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

  // Penyusunan draf AID dibatasi kredit pendampingan (sama seperti orkestrator).
  const role = await getUserRole(consultantId);
  const plan = await resolvePlan(consultantId, role);
  const charge = await consumeCredit(consultantId, plan, "draf laporan AI");
  if (!charge.ok) {
    res.status(402).json({
      error:
        "Kredit pendampingan AI habis. Tingkatkan paket atau beli paket kredit untuk melanjutkan.",
    });
    return;
  }
  const consumedBucket = charge.bucket;

  const [dataPoints, constraints] = await Promise.all([
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

  const ctx: ReportContext = {
    companyName: row.companyName,
    scale: row.scale,
    operatingMode: row.operatingMode,
    periodLabel: row.report.periodLabel,
    periodType: row.report.periodType,
    year: row.report.year,
    deadline: row.report.deadline,
    narrative: row.report.narrative,
    dataPoints: dataPoints.map((dp) => ({
      id: dp.id,
      category: dp.category,
      label: dp.label,
      value: dp.value,
      unit: dp.unit,
      source: dp.source,
      status: dp.status,
      confidence: dp.confidence,
    })),
    constraints: constraints.map((c) => ({
      issue: c.issue,
      followUp: c.followUp,
    })),
  };

  // Apply the SAME deterministic anti-hallucination gate the orchestrator uses.
  // The model is only ever shown validated data points; rejected ones are passed
  // by label only so the draft can flag them as "perlu dilengkapi" without their
  // raw value ever reaching the prompt. This closes the one-shot fallback's
  // bypass of the gate enforced on the agentic pipeline.
  const { validated, failures } = evaluateGate(ctx.dataPoints);
  const rejectedLabels = failures.map((f) => f.dp.label);
  // The raw values of every rejected point. NONE of the model's free-text output
  // fields (activityNarrative, constraintNarrative, dataNotes) may surface any of
  // these, even if the model invents or echoes them (prompt injection).
  const rejectedRawValues = failures.map((f) => f.dp.value);

  let text = "";
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: buildDraftPrompt(
                ctx,
                validated,
                rejectedLabels,
                body.focus,
              ),
            },
          ],
        },
      ],
      config: {
        systemInstruction: DRAFT_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
      },
    });
    text = response.text ?? "";
  } catch (err) {
    req.log.error({ err }, "Gagal menghasilkan draf laporan");
    if (consumedBucket) {
      try {
        await refundCredit(consultantId, consumedBucket, "refund draf laporan AI");
      } catch (refundErr) {
        req.log.error({ err: refundErr }, "Gagal mengembalikan kredit");
      }
    }
    res.status(502).json({
      error: "Gagal menghasilkan draf. Periksa kuota layanan AI dan coba lagi.",
    });
    return;
  }

  const parsed = parseDraftJson(text);

  // Decision: ALL three free-text fields the model produces (activityNarrative,
  // constraintNarrative, dataNotes) may legitimately carry validated data values,
  // but NONE may carry a gate-rejected raw value. Each is sanitized against the
  // rejected raw values; if any field leaks one, the WHOLE field is dropped (not
  // merely redacted) because a leaking field cannot be trusted at all. The
  // server-set disclaimer is static, so it needs no sanitization.
  const safeActivity = sanitizeAgentText(
    parsed.activityNarrative,
    rejectedRawValues,
    SANITIZED_AGENT_TEXT,
  );
  const safeConstraint = sanitizeAgentText(
    parsed.constraintNarrative,
    rejectedRawValues,
    SANITIZED_AGENT_TEXT,
  );
  const safeDataNotes = sanitizeAgentText(
    parsed.dataNotes,
    rejectedRawValues,
    SANITIZED_AGENT_TEXT,
  );
  if (safeActivity.leaked || safeConstraint.leaked || safeDataNotes.leaked) {
    req.log.warn(
      { reportId: body.reportId },
      "Draf satu-tembak memuat nilai data yang ditolak; bagian terkait diganti dengan teks aman",
    );
  }

  const payload = {
    activityNarrative: safeActivity.text,
    constraintNarrative: safeConstraint.text,
    dataNotes: safeDataNotes.text,
    disclaimer:
      "Draf ini dihasilkan AI dari data yang tersedia. Periksa, verifikasi setiap angka ke sumber resmi, dan sesuaikan sebelum disampaikan melalui OSS.",
  };

  res.json(GenerateReportDraftResponse.parse(payload));
});

router.get("/anthropic/conversations", async (req, res) => {
  const consultantId = getConsultantId(req);
  const rows = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.consultantId, consultantId))
    .orderBy(asc(conversationsTable.id));
  res.json(
    rows.map((c) => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt.toISOString(),
    })),
  );
});

router.post("/anthropic/conversations", async (req, res) => {
  const consultantId = getConsultantId(req);
  const body = CreateAnthropicConversationBody.parse(req.body);
  const [row] = await db
    .insert(conversationsTable)
    .values({ title: body.title, consultantId })
    .returning();
  res.status(201).json({
    id: row.id,
    title: row.title,
    createdAt: row.createdAt.toISOString(),
  });
});

router.get("/anthropic/conversations/:id", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { id } = GetAnthropicConversationParams.parse(req.params);
  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(
      and(
        eq(conversationsTable.id, id),
        eq(conversationsTable.consultantId, consultantId),
      ),
    );
  if (!conv) {
    res.status(404).json({ error: "Percakapan tidak ditemukan" });
    return;
  }
  const msgs = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, id))
    .orderBy(asc(messagesTable.id));
  res.json({
    id: conv.id,
    title: conv.title,
    createdAt: conv.createdAt.toISOString(),
    messages: msgs.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
  });
});

router.delete("/anthropic/conversations/:id", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { id } = DeleteAnthropicConversationParams.parse(req.params);
  const deleted = await db
    .delete(conversationsTable)
    .where(
      and(
        eq(conversationsTable.id, id),
        eq(conversationsTable.consultantId, consultantId),
      ),
    )
    .returning({ id: conversationsTable.id });
  if (deleted.length === 0) {
    res.status(404).json({ error: "Percakapan tidak ditemukan" });
    return;
  }
  res.status(204).send();
});

router.post("/anthropic/conversations/:id/messages", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { id } = SendAnthropicMessageParams.parse(req.params);
  const body = SendAnthropicMessageBody.parse(req.body);

  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(
      and(
        eq(conversationsTable.id, id),
        eq(conversationsTable.consultantId, consultantId),
      ),
    );
  if (!conv) {
    res.status(404).json({ error: "Percakapan tidak ditemukan" });
    return;
  }

  await db
    .insert(messagesTable)
    .values({ conversationId: id, role: "user", content: body.content });

  const history = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, id))
    .orderBy(asc(messagesTable.id));

  const chatMessages = history.map((m) => ({
    role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
    content: m.content,
  }));

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";
  try {
    const stream = await ai.models.generateContentStream({
      model: MODEL,
      contents: chatMessages.map((m) => ({
        role: m.role === "assistant" ? ("model" as const) : ("user" as const),
        parts: [{ text: m.content }],
      })),
      config: {
        systemInstruction: MENTOR_SYSTEM_PROMPT,
        maxOutputTokens: 8192,
      },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }

    await db.insert(messagesTable).values({
      conversationId: id,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Gagal melakukan streaming jawaban mentor");
    res.write(
      `data: ${JSON.stringify({
        error: "Gagal menghasilkan jawaban. Coba lagi.",
      })}\n\n`,
    );
    res.end();
  }
});

export default router;
