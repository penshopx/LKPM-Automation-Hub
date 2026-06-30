import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Workflow,
  Search,
  Database,
  CheckCircle2,
  FileEdit,
  ClipboardCheck,
  Send,
  Activity,
  Archive,
  ShieldCheck,
} from "lucide-react";

type Stage = {
  no: number;
  key: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
  gate?: string;
};

const stages: Stage[] = [
  {
    no: 1,
    key: "intake",
    title: "Intake",
    icon: Search,
    desc: "Identifikasi NIB/Id Izin, skala usaha, KBLI, dan periode jatuh tempo.",
    gate: "Skala usaha & periode terkonfirmasi, kewajiban lapor valid.",
  },
  {
    no: 2,
    key: "collect",
    title: "Collect",
    icon: Database,
    desc: "Tarik data realisasi: investasi, tenaga kerja, produksi, dan kewajiban.",
    gate: "Seluruh 5 komponen data lengkap & bersumber.",
  },
  {
    no: 3,
    key: "validate",
    title: "Validate",
    icon: CheckCircle2,
    desc: "Rekonsiliasi, cek konsistensi, deteksi anomali dan data yang hilang.",
    gate: "0 anomali kritis, angka rekonsiliasi balance.",
  },
  {
    no: 4,
    key: "draft",
    title: "Draft",
    icon: FileEdit,
    desc: "Petakan data ke field OSS serta susun narasi kendala dan tindak lanjut.",
  },
  {
    no: 5,
    key: "review",
    title: "Review",
    icon: ClipboardCheck,
    desc: "QA kepatuhan dan persetujuan internal (maker-checker-approver).",
    gate: "Disetujui checker / penanggung jawab.",
  },
  {
    no: 6,
    key: "submit",
    title: "Submit",
    icon: Send,
    desc: "Input dan kirim laporan melalui OSS, simpan tanda terima.",
    gate: "Tanda terima OSS tersimpan.",
  },
  {
    no: 7,
    key: "monitor",
    title: "Monitor",
    icon: Activity,
    desc: "Pantau status pelaporan dan tanggapi klarifikasi dari BKPM.",
  },
  {
    no: 8,
    key: "archive",
    title: "Archive",
    icon: Archive,
    desc: "Arsipkan dokumen, jejak audit, dan set pengingat periode berikutnya.",
  },
];

type Specialist = {
  code: string;
  name: string;
  mission: string;
  subs: string[];
};

const specialists: Specialist[] = [
  {
    code: "S1",
    name: "Kepatuhan & Regulasi",
    mission: "Memastikan dasar hukum, klasifikasi, dan jadwal selalu benar & mutakhir.",
    subs: [
      "S1.1 Pemantau Regulasi (UU/Perban update)",
      "S1.2 Klasifikasi Skala & KBLI",
      "S1.3 Kalender & Deadline",
    ],
  },
  {
    code: "S2",
    name: "Pengumpulan Data",
    mission: "Mengumpulkan 5 komponen data realisasi secara lengkap & bersumber.",
    subs: [
      "S2.1 Realisasi Investasi (modal tetap & kerja)",
      "S2.2 Ketenagakerjaan (TKI/TKA & BPJS)",
      "S2.3 Produksi & Omzet",
      "S2.4 Kewajiban (CSR, kemitraan)",
    ],
  },
  {
    code: "S3",
    name: "Validasi & Rekonsiliasi",
    mission: "Menjamin data akurat, konsisten, dan bebas anomali sebelum drafting.",
    subs: [
      "S3.1 Rekonsiliasi Keuangan",
      "S3.2 Konsistensi & Deteksi Anomali",
      "S3.3 Cross-check NIB/Proyek",
    ],
  },
  {
    code: "S4",
    name: "Penyusunan Dokumen",
    mission: "Menyusun draf LKPM siap-input sesuai struktur OSS.",
    subs: [
      "S4.1 Mapping Field OSS",
      "S4.2 Narasi Kendala & Tindak Lanjut",
      "S4.3 Lampiran & Bukti Pendukung",
    ],
  },
  {
    code: "S5",
    name: "Submission OSS",
    mission: "Mengirim laporan ke OSS dan mengamankan bukti.",
    subs: [
      "S5.1 Entry & Kirim OSS",
      "S5.2 Tanda Terima & Bukti",
      "S5.3 Klarifikasi / Respon BKPM",
    ],
  },
  {
    code: "S6",
    name: "Monitoring & Risiko",
    mission: "Mencegah keterlambatan & memitigasi risiko sanksi.",
    subs: [
      "S6.1 Early-Warning Deadline",
      "S6.2 Tracking Sanksi & Remediasi",
      "S6.3 Arsip & Audit Trail",
    ],
  },
];

type RaciRow = {
  activity: string;
  responsible: string;
  accountable: string;
  consulted: string;
  informed: string;
};

const raci: RaciRow[] = [
  { activity: "Klasifikasi & jadwal", responsible: "S1", accountable: "Commander", consulted: "-", informed: "Manajemen" },
  { activity: "Pengumpulan data", responsible: "S2", accountable: "Commander", consulted: "Keuangan/HR", informed: "S3" },
  { activity: "Validasi", responsible: "S3", accountable: "Commander", consulted: "S2", informed: "S4" },
  { activity: "Penyusunan draf", responsible: "S4", accountable: "Commander", consulted: "S1, S3", informed: "Reviewer" },
  { activity: "Persetujuan", responsible: "Penanggung jawab", accountable: "Direksi", consulted: "S4", informed: "S5" },
  { activity: "Submission OSS", responsible: "S5", accountable: "Commander", consulted: "-", informed: "Manajemen" },
  { activity: "Monitoring & arsip", responsible: "S6", accountable: "Commander", consulted: "S5", informed: "Semua" },
];

const kpis = [
  { kpi: "Ketepatan waktu lapor", target: "100% (zero missed deadline)" },
  { kpi: "Kelengkapan data sebelum drafting", target: "≥ 99%" },
  { kpi: "Anomali kritis lolos ke OSS", target: "0" },
  { kpi: "Lead time siklus (Intake→Submit)", target: "≤ 5 hari kerja" },
  { kpi: "Klarifikasi BKPM terjawab tepat waktu", target: "100%" },
];

export default function Blueprint() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Blueprint & Arsitektur Pipeline LKPM</h1>
        <p className="text-muted-foreground">
          Peta lini produksi pelaporan LKPM end-to-end: delapan tahap pipeline dengan gate validasi, hierarki agen spesialis S1-S6, matriks RACI, dan KPI keberhasilan. Halaman ini bersifat referensi konseptual.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Workflow className="h-5 w-5 text-primary" />
            Pipeline Delapan Tahap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stages.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.key} className="rounded-lg border p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold shrink-0">
                      {s.no}
                    </span>
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="font-semibold">{s.title}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                  {s.gate && (
                    <p className="text-xs text-muted-foreground border-t pt-2 mt-auto">
                      <span className="font-medium text-foreground">Gate: </span>
                      {s.gate}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Hierarki Agen Spesialis (LKPM-COMMANDER)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            Orchestrator LKPM-COMMANDER mengoordinasikan enam agen spesialis. Setiap spesialis membawahi sub-agen dengan tugas atomik yang dapat diaudit. Commander mendelegasikan, menjaga deadline, dan menegakkan gate.
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {specialists.map((sp) => (
              <div key={sp.code} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono">{sp.code}</Badge>
                  <span className="font-semibold">{sp.name}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{sp.mission}</p>
                <ul className="space-y-1 text-sm">
                  {sp.subs.map((sub) => (
                    <li key={sub} className="flex gap-2">
                      <span className="text-primary shrink-0">-</span>
                      <span className="text-muted-foreground">{sub}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Matriks RACI</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aktivitas</TableHead>
                  <TableHead>R</TableHead>
                  <TableHead>A</TableHead>
                  <TableHead>C</TableHead>
                  <TableHead>I</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {raci.map((r) => (
                  <TableRow key={r.activity}>
                    <TableCell className="font-medium align-top">{r.activity}</TableCell>
                    <TableCell className="align-top text-muted-foreground">{r.responsible}</TableCell>
                    <TableCell className="align-top text-muted-foreground">{r.accountable}</TableCell>
                    <TableCell className="align-top text-muted-foreground">{r.consulted}</TableCell>
                    <TableCell className="align-top text-muted-foreground">{r.informed}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground mt-3">
              R = Responsible, A = Accountable, C = Consulted, I = Informed.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">KPI & Metrik Keberhasilan</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>KPI</TableHead>
                  <TableHead>Target</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kpis.map((k) => (
                  <TableRow key={k.kpi}>
                    <TableCell className="font-medium align-top">{k.kpi}</TableCell>
                    <TableCell className="align-top text-muted-foreground">{k.target}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Blueprint ini bersifat konseptual dan mengikuti prinsip single source of truth, deadline-driven, validasi berlapis, dan audit trail penuh. Detail teknis field OSS, ambang nilai, dan tenggat dapat berubah mengikuti kebijakan terbaru Kementerian Investasi/BKPM; selalu verifikasi ke sumber resmi OSS sebelum setiap siklus pelaporan.
      </p>
    </div>
  );
}
