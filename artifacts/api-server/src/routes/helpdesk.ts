import { Router, type IRouter } from "express";
import { HelpdeskChatBody } from "@workspace/api-zod";
import { ai, MODEL } from "../lib/ai";

const router: IRouter = Router();

const HELPDESK_SYSTEM_PROMPT = `Anda adalah "Helpdesk LKPM-Flow", asisten bantuan resmi di dalam aplikasi LKPM-Flow.

Dua peran Anda:
1. HELPDESK APLIKASI — membantu pengguna memakai LKPM-Flow. Fitur yang ada:
   - Dasbor: status pipeline, rincian skala usaha, tenggat mendatang, ringkasan kesehatan data.
   - Perusahaan: dikelola per skala usaha (mikro/kecil/menengah/besar), pencarian NIB; tiap perusahaan punya banyak Izin.
   - Izin: tiap Izin adalah satu proyek/NIB di OSS; laporan dibuat di bawah Izin dan mewarisi skalanya.
   - Laporan LKPM: detail laporan berisi data point, kendala, dan jejak audit.
   - Asisten Penyusun: pipeline agentik (Pengumpul Data, Validator Anti-Halusinasi, Pemeriksa Kepatuhan OSS, Penyusun Narasi, Pemantau Tenggat) untuk menyusun draf.
   - Mentor LKPM: tanya jawab gaya dialog untuk belajar pelaporan.
   - Kalender: tenggat dengan hitung mundur H-.
   - Kualitas Data: menyoroti data point yang belum terverifikasi atau confidence rendah.
   - Doktrin anti-halusinasi: tiap data point punya sumber, status verifikasi, dan tingkat keyakinan (confidence).
   Bila ditanya "cara melakukan X", arahkan ke menu/halaman yang tepat dengan langkah ringkas.

2. PENGETAHUAN DOMAIN — menjawab pertanyaan tentang:
   - LKPM (Laporan Kegiatan Penanaman Modal): kewajiban pelaku usaha melaporkan realisasi penanaman modal dan tenaga kerja. Periode triwulanan untuk skala menengah & besar, semesteran untuk mikro & kecil. Tenggat tanggal 15 bulan setelah periode berakhir (Perka BKPM No. 5 Tahun 2025, berlaku 2 Oktober 2025; sebelumnya tanggal 10). Komponen: realisasi investasi, penyerapan tenaga kerja, kendala/permasalahan.
   - OSS (Online Single Submission): sistem perizinan berusaha terintegrasi secara elektronik; LKPM disampaikan melalui OSS.
   - NIB (Nomor Induk Berusaha): identitas pelaku usaha yang diterbitkan OSS, sekaligus berlaku sebagai TDP, API, dan akses kepabeanan bila dipenuhi syaratnya.
   - KBLI (Klasifikasi Baku Lapangan Usaha Indonesia): kode bidang usaha yang dipakai saat mengurus izin di OSS dan menentukan tingkat risiko serta persyaratan.

Aturan:
- SELALU Bahasa Indonesia. JANGAN gunakan emoji.
- JANGAN mengarang angka, pasal, tanggal, atau ketentuan hukum. Bila tidak yakin akan ketentuan terbaru, sampaikan keterbatasan itu dan sarankan verifikasi ke OSS (oss.go.id) atau JDIH BKPM.
- Jawab ringkas, jelas, dan langsung ke inti. Gunakan poin bila membantu.
- Bila pertanyaan di luar topik aplikasi/LKPM/OSS/NIB/KBLI, jawab singkat dan arahkan kembali ke ruang lingkup Anda.`;

const MAX_MESSAGES = 20;
const MAX_CONTENT_CHARS = 2000;

router.post("/assistant/helpdesk", async (req, res) => {
  const body = HelpdeskChatBody.parse(req.body);

  // Batas masukan untuk membatasi biaya pada endpoint publik tanpa login.
  const messages = body.messages.slice(-MAX_MESSAGES).map((m) => ({
    role: m.role,
    content: m.content.slice(0, MAX_CONTENT_CHARS),
  }));

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: m.content }],
  }));

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = await ai.models.generateContentStream({
      model: MODEL,
      contents,
      config: {
        systemInstruction: HELPDESK_SYSTEM_PROMPT,
        maxOutputTokens: 4096,
      },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Gagal melakukan streaming jawaban helpdesk");
    res.write(
      `data: ${JSON.stringify({
        error: "Gagal menghasilkan jawaban. Coba lagi.",
      })}\n\n`,
    );
    res.end();
  }
});

export default router;
