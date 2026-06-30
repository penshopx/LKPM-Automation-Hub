import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Scale, CalendarClock, AlertOctagon, Info } from "lucide-react";

type LegalBasis = {
  ref: string;
  about: string;
};

const legalBasis: LegalBasis[] = [
  {
    ref: "UU No. 25 Tahun 2007 (Pasal 15)",
    about: "Setiap penanam modal wajib membuat laporan kegiatan penanaman modal dan menyampaikannya kepada BKPM/Kementerian Investasi.",
  },
  {
    ref: "Peraturan BKPM No. 5 Tahun 2025",
    about: "Pedoman & tata cara penyelenggaraan perizinan berusaha berbasis risiko dan fasilitas penanaman modal melalui OSS. Menggantikan Perka BKPM 5/2021, berlaku sejak 2 Oktober 2025.",
  },
  {
    ref: "Peraturan BKPM No. 5 Tahun 2021 (Pasal 46-61)",
    about: "Mengatur pengawasan berbasis risiko dan tahapan sanksi administratif. Sebagian ketentuan diperbarui oleh Perka BKPM 5/2025.",
  },
];

type Deadline = {
  scale: string;
  frequency: string;
  period: string;
  due: string;
};

const deadlines: Deadline[] = [
  { scale: "Kecil", frequency: "Semesteran", period: "Semester I (Jan-Jun)", due: "15 Juli" },
  { scale: "Kecil", frequency: "Semesteran", period: "Semester II (Jul-Des)", due: "15 Januari (tahun berikutnya)" },
  { scale: "Menengah & Besar", frequency: "Triwulanan", period: "Triwulan I (Jan-Mar)", due: "15 April" },
  { scale: "Menengah & Besar", frequency: "Triwulanan", period: "Triwulan II (Apr-Jun)", due: "15 Juli" },
  { scale: "Menengah & Besar", frequency: "Triwulanan", period: "Triwulan III (Jul-Sep)", due: "15 Oktober" },
  { scale: "Menengah & Besar", frequency: "Triwulanan", period: "Triwulan IV (Okt-Des)", due: "15 Januari (tahun berikutnya)" },
];

type Sanction = {
  level: number;
  category: string;
  sanction: string;
  trigger: string;
};

const sanctions: Sanction[] = [
  {
    level: 1,
    category: "Pelanggaran ringan",
    sanction: "Peringatan tertulis",
    trigger: "Tidak menyampaikan LKPM atau lalai memenuhi kewajiban administratif ringan.",
  },
  {
    level: 2,
    category: "Pelanggaran sedang",
    sanction: "Penghentian sementara kegiatan usaha",
    trigger: "Tidak menindaklanjuti peringatan tertulis dalam tenggat yang diberikan.",
  },
  {
    level: 3,
    category: "Pelanggaran berat",
    sanction: "Pencabutan Perizinan Berusaha (PB)",
    trigger: "Tetap tidak patuh setelah penghentian sementara; pelanggaran berlanjut.",
  },
  {
    level: 4,
    category: "Pelanggaran berat",
    sanction: "Pencabutan PB-UMKU",
    trigger: "Pencabutan izin penunjang kegiatan usaha sebagai tahap akhir penegakan.",
  },
];

export default function Regulation() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pendalaman Regulasi & Tahapan Sanksi</h1>
        <p className="text-muted-foreground">
          Dasar hukum kewajiban LKPM, kalender tenggat terbaru, dan tahapan sanksi administratif yang diterapkan secara berjenjang.
        </p>
      </div>

      <Card className="border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/10">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium">Perubahan tenggat: tanggal 10 menjadi tanggal 15</p>
              <p className="text-muted-foreground leading-relaxed">
                Sejak <span className="font-medium text-foreground">Perka BKPM No. 5 Tahun 2025</span> (berlaku 2 Oktober 2025), batas akhir penyampaian LKPM diperpanjang dari tanggal 10 menjadi <span className="font-medium text-foreground">tanggal 15</span> bulan pelaporan. Tetap verifikasi ke OSS/JDIH BKPM sebelum tiap siklus karena ketentuan dapat berubah.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Dasar Hukum
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Regulasi</TableHead>
                <TableHead>Pokok Pengaturan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {legalBasis.map((l) => (
                <TableRow key={l.ref}>
                  <TableCell className="font-medium align-top">{l.ref}</TableCell>
                  <TableCell className="text-muted-foreground align-top">{l.about}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Kalender Tenggat (Perka BKPM 5/2025)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Skala</TableHead>
                <TableHead>Frekuensi</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Batas Akhir</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deadlines.map((d) => (
                <TableRow key={d.period}>
                  <TableCell className="font-medium align-top">{d.scale}</TableCell>
                  <TableCell className="align-top text-muted-foreground">{d.frequency}</TableCell>
                  <TableCell className="align-top text-muted-foreground">{d.period}</TableCell>
                  <TableCell className="align-top font-medium">{d.due}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground mt-3">
            Usaha mikro (modal &lt; Rp 1 miliar) dan sektor khusus (hulu migas, perbankan, asuransi) dikecualikan dari kewajiban LKPM.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertOctagon className="h-5 w-5 text-destructive" />
            Tahapan Sanksi Administratif (Berjenjang)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tahap</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Sanksi</TableHead>
                <TableHead>Pemicu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sanctions.map((s) => (
                <TableRow key={s.level}>
                  <TableCell className="font-mono align-top">{s.level}</TableCell>
                  <TableCell className="align-top text-muted-foreground">{s.category}</TableCell>
                  <TableCell className="font-medium align-top">{s.sanction}</TableCell>
                  <TableCell className="align-top text-muted-foreground">{s.trigger}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground mt-3">
            Sanksi diterapkan berjenjang dan kumulatif; terdapat tenggat penyesuaian antar-tahap sebelum sanksi berikutnya dijatuhkan.
          </p>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Ringkasan ini bersumber dari UU 25/2007, Perka BKPM 5/2021, dan pembaruan Perka BKPM 5/2025. Detail teknis, ambang nilai, dan tenggat dapat berubah; selalu verifikasi ke sumber resmi OSS dan JDIH BKPM sebelum setiap siklus pelaporan.
      </p>
    </div>
  );
}
