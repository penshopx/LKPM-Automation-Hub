import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookMarked } from "lucide-react";

type Play = {
  code: string;
  name: string;
  trigger: string;
  input: string;
  steps: string[];
  output: string;
  gate: string;
  escalation: string;
};

const plays: Play[] = [
  {
    code: "S1",
    name: "Kepatuhan & Regulasi",
    trigger: "Awal siklus atau ada perubahan regulasi terdeteksi.",
    input: "NIB, nilai modal, KBLI, tahun berjalan, sumber regulasi resmi.",
    steps: [
      "S1.1 pantau perubahan regulasi/ambang dan dampaknya.",
      "S1.2 tentukan skala usaha dan status wajib lapor.",
      "S1.3 hitung periode dan kunci tanggal batas akhir + jadwal pengingat.",
    ],
    output: "Profil kewajiban perusahaan + jadwal lapor terkunci.",
    gate: "G1 — skala & periode terkonfirmasi, kewajiban lapor valid.",
    escalation: "Jika regulasi berubah (mis. tenggat), tahan siklus dan minta verifikasi sumber resmi.",
  },
  {
    code: "S2",
    name: "Pengumpulan Data",
    trigger: "Setelah G1 lolos, Commander memerintah pengumpulan paralel.",
    input: "Akses keuangan, HRIS, data BPJS, catatan produksi & kewajiban.",
    steps: [
      "S2.1 kumpulkan realisasi investasi (modal tetap & kerja).",
      "S2.2 kumpulkan data ketenagakerjaan (TKI/TKA & BPJS).",
      "S2.3 agregasi nilai produksi/omzet.",
      "S2.4 rekap kewajiban (CSR, kemitraan, pelatihan).",
    ],
    output: "Lima komponen data lengkap dan bersumber.",
    gate: "G2 — seluruh komponen lengkap & bersumber.",
    escalation: "Jika sumber data tidak tersedia, tandai gap dan minta data ke PIC terkait.",
  },
  {
    code: "S3",
    name: "Validasi & Rekonsiliasi",
    trigger: "Setelah data terkumpul (G2).",
    input: "Seluruh output S2.",
    steps: [
      "S3.1 rekonsiliasi keuangan antar sumber.",
      "S3.2 cek konsistensi, outlier, dan data hilang.",
      "S3.3 cross-check kesesuaian NIB/proyek.",
    ],
    output: "Laporan rekonsiliasi + daftar temuan terflag.",
    gate: "G3 — 0 anomali kritis, angka balance.",
    escalation: "Jika anomali kritis ditemukan, kembalikan ke S2 untuk perbaikan data.",
  },
  {
    code: "S4",
    name: "Penyusunan Dokumen",
    trigger: "Setelah data tervalidasi (G3).",
    input: "Data tervalidasi + temuan operasional.",
    steps: [
      "S4.1 petakan data ke field formulir OSS.",
      "S4.2 susun narasi kendala & tindak lanjut.",
      "S4.3 kumpulkan & beri label lampiran/bukti.",
    ],
    output: "Draf LKPM terstruktur siap-input + paket lampiran.",
    gate: "Draf lengkap sesuai struktur OSS sebelum review.",
    escalation: "Jika field OSS tidak jelas, rujuk panduan field dan konfirmasi ke S1.",
  },
  {
    code: "S5",
    name: "Submission OSS",
    trigger: "Setelah review & persetujuan (G4).",
    input: "Draf disetujui + kredensial OSS.",
    steps: [
      "S5.1 input & kirim laporan via OSS.",
      "S5.2 simpan tanda terima/bukti.",
      "S5.3 siapkan & kirim tanggapan klarifikasi BKPM bila ada.",
    ],
    output: "Status terkirim + arsip tanda terima.",
    gate: "G5 — tanda terima OSS tersimpan.",
    escalation: "Jika OSS menolak/eror, dokumentasikan dan ulangi setelah perbaikan.",
  },
  {
    code: "S6",
    name: "Monitoring & Risiko",
    trigger: "Berjalan kontinu; intensif menjelang tenggat.",
    input: "Kalender (S1.3), status kepatuhan, seluruh output.",
    steps: [
      "S6.1 keluarkan early-warning H-30/H-14/H-7/H-3/H-1.",
      "S6.2 pantau risiko sanksi & rencana remediasi.",
      "S6.3 arsipkan & versinikan dokumen + jejak audit.",
    ],
    output: "Notifikasi tenggat, status risiko, arsip + audit trail.",
    gate: "Pengingat periode berikutnya terpasang.",
    escalation: "Jika tenggat terlewat, aktifkan jalur remediasi & catat risiko sanksi.",
  },
];

export default function AgentPlaybook() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Playbook Operasional Agen S1-S6</h1>
        <p className="text-muted-foreground">
          Panduan operasional tiap agen spesialis: pemicu, input, langkah, output, gate, dan jalur eskalasi. Bersifat referensi konseptual untuk membantu pembagian peran tim.
        </p>
      </div>

      <div className="space-y-4">
        {plays.map((p) => (
          <Card key={p.code}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Badge variant="secondary" className="font-mono">{p.code}</Badge>
                {p.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm md:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <p className="font-medium">Pemicu</p>
                  <p className="text-muted-foreground leading-relaxed">{p.trigger}</p>
                </div>
                <div>
                  <p className="font-medium">Input</p>
                  <p className="text-muted-foreground leading-relaxed">{p.input}</p>
                </div>
                <div>
                  <p className="font-medium">Langkah</p>
                  <ul className="space-y-1">
                    {p.steps.map((s) => (
                      <li key={s} className="flex gap-2 text-muted-foreground">
                        <span className="text-primary shrink-0">-</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="font-medium">Output</p>
                  <p className="text-muted-foreground leading-relaxed">{p.output}</p>
                </div>
                <div>
                  <p className="font-medium">Gate</p>
                  <p className="text-muted-foreground leading-relaxed">{p.gate}</p>
                </div>
                <div>
                  <p className="font-medium">Eskalasi</p>
                  <p className="text-muted-foreground leading-relaxed">{p.escalation}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground flex items-start gap-2">
        <BookMarked className="h-4 w-4 mt-0.5 shrink-0" />
        Playbook ini adalah model peran konseptual untuk pembagian tugas tim pelaporan LKPM, bukan instruksi sistem otomatis. Sesuaikan dengan struktur organisasi dan kewenangan internal.
      </p>
    </div>
  );
}
