import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, HelpCircle } from "lucide-react";

type Term = {
  term: string;
  definition: string;
};

type Faq = {
  question: string;
  answer: string;
};

const glossary: Term[] = [
  { term: "LKPM", definition: "Laporan Kegiatan Penanaman Modal — laporan berkala atas perkembangan realisasi penanaman modal dan kendala yang dihadapi pelaku usaha." },
  { term: "OSS", definition: "Online Single Submission — sistem perizinan berusaha terintegrasi secara elektronik tempat LKPM disampaikan." },
  { term: "NIB", definition: "Nomor Induk Berusaha — identitas pelaku usaha yang diterbitkan OSS sekaligus berlaku sebagai TDP, API, dan akses kepabeanan." },
  { term: "KBLI", definition: "Klasifikasi Baku Lapangan Usaha Indonesia — kode bidang usaha yang menentukan tingkat risiko dan kewajiban perizinan." },
  { term: "Perizinan Berbasis Risiko (RBA)", definition: "Pendekatan perizinan yang menetapkan jenis izin berdasarkan tingkat risiko kegiatan usaha: rendah, menengah-rendah, menengah-tinggi, atau tinggi." },
  { term: "Sertifikat Standar", definition: "Perizinan berusaha berupa pernyataan dan/atau pemenuhan standar usaha untuk kegiatan risiko menengah." },
  { term: "Izin", definition: "Persetujuan pemerintah yang wajib dipenuhi sebelum menjalankan kegiatan usaha berisiko tinggi." },
  { term: "Modal Tetap", definition: "Investasi pada aktiva tetap seperti tanah, bangunan, mesin, dan peralatan, dicatat dengan nilai perolehan tanpa penyusutan." },
  { term: "Modal Kerja", definition: "Dana untuk membiayai operasional usaha selama satu kali perputaran (bahan baku, gaji, overhead)." },
  { term: "Tahap Konstruksi", definition: "Periode persiapan/pembangunan sebelum usaha berproduksi secara komersial; fokus pelaporan pada realisasi investasi." },
  { term: "Tahap Produksi (Komersial)", definition: "Periode usaha sudah beroperasi/komersial; pelaporan mencakup produksi, tenaga kerja, dan kewajiban." },
  { term: "TKI / TKA", definition: "Tenaga Kerja Indonesia / Tenaga Kerja Asing yang dipekerjakan dan dilaporkan pada bagian realisasi tenaga kerja." },
  { term: "Skala Usaha", definition: "Klasifikasi usaha (mikro, kecil, menengah, besar) berdasarkan nilai modal/aset yang menentukan ritme dan kewajiban pelaporan." },
];

const faqs: Faq[] = [
  {
    question: "Apa yang terjadi jika terlambat menyampaikan LKPM?",
    answer: "Keterlambatan dapat memicu sanksi administratif bertahap, mulai dari peringatan hingga pembekuan atau pencabutan perizinan berusaha. Sampaikan sesegera mungkin meski melewati tenggat, dan dokumentasikan alasannya.",
  },
  {
    question: "Apakah LKPM yang sudah dikirim bisa dikoreksi?",
    answer: "Selama periode pelaporan masih terbuka, LKPM umumnya dapat diperbaiki melalui OSS. Setelah periode ditutup, koreksi biasanya dilakukan pada periode berikutnya atau melalui mekanisme klarifikasi dengan DPMPTSP/BKPM.",
  },
  {
    question: "Apakah harus tetap melapor jika belum ada realisasi (nilai nol)?",
    answer: "Ya. LKPM tetap wajib disampaikan setiap periode meskipun belum ada realisasi investasi. Isi nilai nol dan jelaskan kondisinya pada kolom permasalahan bila relevan.",
  },
  {
    question: "Kapan tenggat penyampaian LKPM tiap periode?",
    answer: "Pelaporan triwulanan jatuh tempo pada bulan setelah triwulan berakhir, sedangkan pelaporan semesteran setelah semester berakhir. Pantau tenggat persisnya pada halaman Kalender.",
  },
  {
    question: "Apa beda LKPM tahap konstruksi dan tahap produksi?",
    answer: "Tahap konstruksi berfokus pada realisasi investasi selama pembangunan. Tahap produksi menambah pelaporan realisasi produksi, tenaga kerja, dan kewajiban penanaman modal karena usaha sudah komersial.",
  },
  {
    question: "Siapa yang wajib menyampaikan LKPM?",
    answer: "Seluruh pelaku usaha dengan NIB wajib melapor, kecuali usaha mikro dan kecil tertentu sesuai ketentuan. Ritme pelaporan mengikuti skala usaha (semester untuk kecil, triwulan untuk menengah dan besar).",
  },
];

export default function GlossaryFaq() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Glosarium & FAQ LKPM</h1>
        <p className="text-muted-foreground">
          Istilah penting seputar OSS, KBLI, dan perizinan berbasis risiko, serta jawaban praktis untuk pertanyaan yang sering muncul saat pelaporan.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Glosarium
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-8 gap-y-4 md:grid-cols-2">
            {glossary.map((g) => (
              <div key={g.term}>
                <dt className="font-semibold text-sm">{g.term}</dt>
                <dd className="text-sm text-muted-foreground leading-relaxed mt-0.5">{g.definition}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Pertanyaan yang Sering Diajukan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {faqs.map((f) => (
              <div key={f.question} className="py-4 first:pt-0 last:pb-0">
                <p className="font-medium text-sm">{f.question}</p>
                <p className="text-sm text-muted-foreground leading-relaxed mt-1">{f.answer}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Informasi bersifat umum sebagai rujukan tim. Untuk ketentuan resmi dan kasus spesifik, rujuk panduan OSS dan ketentuan DPMPTSP/BKPM terbaru.
      </p>
    </div>
  );
}
