import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Store, Building, Factory } from "lucide-react";

type Step = {
  phase: string;
  action: string;
};

type CaseStudy = {
  key: string;
  scale: string;
  mode: string;
  icon: React.ComponentType<{ className?: string }>;
  profile: string;
  frequency: string;
  timeline: Step[];
};

const cases: CaseStudy[] = [
  {
    key: "kecil",
    scale: "Usaha Kecil",
    mode: "Mode Pendamping UMK",
    icon: Store,
    profile: "Modal Rp 1-5 miliar, satu lokasi usaha, tim administrasi ringkas.",
    frequency: "Semesteran (Sem I: Jan-Jun, Sem II: Jul-Des).",
    timeline: [
      { phase: "H-30", action: "Pendamping mengingatkan PIC; konfirmasi periode & status wajib lapor." },
      { phase: "H-21", action: "Kumpulkan realisasi investasi dan jumlah tenaga kerja dari catatan sederhana." },
      { phase: "H-14", action: "Verifikasi angka, isi narasi kendala bila realisasi belum optimal." },
      { phase: "H-7", action: "Pendamping bantu petakan ke field OSS, review cepat bersama pemilik." },
      { phase: "H-3", action: "Input ke OSS dan submit." },
      { phase: "H-0", action: "Simpan tanda terima, arsipkan, set pengingat semester berikutnya." },
    ],
  },
  {
    key: "menengah",
    scale: "Usaha Menengah",
    mode: "Mode Hibrida",
    icon: Building,
    profile: "Modal Rp 5-10 miliar, beberapa fungsi (keuangan, HR) terpisah.",
    frequency: "Triwulanan (TW I-IV).",
    timeline: [
      { phase: "H-30", action: "Early-warning otomatis; kunci deadline triwulan, tetapkan maker/checker." },
      { phase: "H-21", action: "Pengumpulan paralel: keuangan tarik investasi, HR tarik tenaga kerja & BPJS." },
      { phase: "H-14", action: "Rekonsiliasi keuangan & cek anomali; perbaiki gap data." },
      { phase: "H-10", action: "Susun draf field OSS + narasi kendala & lampiran." },
      { phase: "H-7", action: "Review maker-checker; penanggung jawab menyetujui." },
      { phase: "H-3", action: "Submit ke OSS, simpan tanda terima." },
      { phase: "H-0", action: "Monitoring klarifikasi, arsip, set pengingat triwulan berikut." },
    ],
  },
  {
    key: "besar",
    scale: "Usaha Besar",
    mode: "Mode Penuh / Human-in-loop",
    icon: Factory,
    profile: "Modal > Rp 10 miliar, multi-proyek/NIB, kewajiban CSR & kemitraan.",
    frequency: "Triwulanan (TW I-IV), kontrol berlapis.",
    timeline: [
      { phase: "H-30", action: "Buka siklus; konfirmasi seluruh proyek/NIB yang wajib dilaporkan." },
      { phase: "H-24", action: "Pengumpulan data lengkap 5 komponen per proyek, termasuk kewajiban." },
      { phase: "H-18", action: "Validasi berlapis: rekonsiliasi keuangan, konsistensi, cross-check NIB/proyek." },
      { phase: "H-12", action: "Drafting per proyek + paket lampiran & bukti pendukung." },
      { phase: "H-8", action: "QA kepatuhan, review maker-checker, persetujuan direksi (human-in-loop)." },
      { phase: "H-4", action: "Submit seluruh laporan via OSS, kumpulkan tanda terima." },
      { phase: "H-0", action: "Pantau klarifikasi BKPM, arsip + audit trail, set pengingat berikutnya." },
    ],
  },
];

export default function CaseStudies() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Studi Kasus Siklus Lengkap per Skala</h1>
        <p className="text-muted-foreground">
          Tiga skenario end-to-end (H-30 hingga arsip) sesuai skala usaha dan tingkat keterlibatan: Kecil, Menengah, dan Besar. Bersifat ilustrasi alur kerja, bukan data perusahaan nyata.
        </p>
      </div>

      <div className="space-y-6">
        {cases.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.key}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  {c.scale}
                  <Badge variant="secondary" className="font-normal">{c.mode}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid gap-2 sm:grid-cols-2">
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Profil: </span>{c.profile}
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Frekuensi: </span>{c.frequency}
                  </p>
                </div>
                <div className="space-y-2">
                  {c.timeline.map((t) => (
                    <div key={t.phase} className="flex gap-3 items-start">
                      <Badge variant="outline" className="font-mono shrink-0 w-14 justify-center">{t.phase}</Badge>
                      <span className="text-muted-foreground leading-relaxed">{t.action}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Studi kasus ini adalah ilustrasi alur kerja per skala usaha, bukan data perusahaan nyata. Tanggal H- bersifat indikatif; sesuaikan dengan tenggat resmi periode berjalan.
      </p>
    </div>
  );
}
