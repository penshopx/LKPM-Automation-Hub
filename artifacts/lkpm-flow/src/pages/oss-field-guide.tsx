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
import { FileSpreadsheet, Coins, Wallet, AlertTriangle } from "lucide-react";

type FieldMap = {
  trackerField: string;
  ossField: string;
  note: string;
};

const fieldMaps: FieldMap[] = [
  {
    trackerField: "NIB / ID Izin",
    ossField: "Data Perusahaan — Nomor Induk Berusaha",
    note: "Otomatis terisi dari profil OSS; pastikan KBLI yang dilaporkan sesuai izin.",
  },
  {
    trackerField: "Periode & Tahun",
    ossField: "Pilihan Periode Pelaporan (Triwulan / Semester)",
    note: "Skala kecil melapor per semester; menengah dan besar per triwulan.",
  },
  {
    trackerField: "Realisasi Modal Tetap",
    ossField: "Realisasi Investasi — Modal Tetap (tanah, bangunan, mesin/peralatan, lain-lain)",
    note: "Gunakan nilai perolehan tanpa penyusutan. Pisahkan per komponen.",
  },
  {
    trackerField: "Realisasi Modal Kerja",
    ossField: "Realisasi Investasi — Modal Kerja",
    note: "Biaya operasional untuk satu kali perputaran usaha; jangan dicampur dengan modal tetap.",
  },
  {
    trackerField: "Tenaga Kerja Indonesia (TKI)",
    ossField: "Realisasi Tenaga Kerja — TKI (laki-laki / perempuan)",
    note: "Jumlah tenaga kerja yang aktif pada akhir periode pelaporan.",
  },
  {
    trackerField: "Tenaga Kerja Asing (TKA)",
    ossField: "Realisasi Tenaga Kerja — TKA",
    note: "Hanya diisi pada tahap produksi/operasi bila ada; lengkapi dengan dokumen RPTKA bila relevan.",
  },
  {
    trackerField: "Nilai Produksi",
    ossField: "Realisasi Produksi / Jasa (tahap produksi)",
    note: "Diisi setelah memasuki tahap komersial; satuan dan nilai harus konsisten antarperiode.",
  },
  {
    trackerField: "Kendala / Permasalahan",
    ossField: "Permasalahan yang Dihadapi",
    note: "Uraikan kendala riil (perizinan, lahan, pasar) agar bisa difasilitasi DPMPTSP/BKPM.",
  },
  {
    trackerField: "Kewajiban (CSR, pelatihan, kemitraan)",
    ossField: "Realisasi Kewajiban Penanaman Modal",
    note: "Wajib untuk skala besar; lampirkan bukti pelaksanaan bila diminta.",
  },
];

const capitalCategories = [
  {
    title: "Modal Tetap",
    icon: Coins,
    items: [
      "Tanah (nilai perolehan)",
      "Bangunan / gedung",
      "Mesin & peralatan",
      "Lain-lain (kendaraan, perabot, instalasi)",
    ],
    rule: "Catat dengan nilai perolehan, bukan nilai buku. Penyusutan tidak diperhitungkan.",
  },
  {
    title: "Modal Kerja",
    icon: Wallet,
    items: [
      "Bahan baku & penolong",
      "Gaji & upah",
      "Biaya overhead operasional",
      "Biaya untuk satu kali perputaran usaha",
    ],
    rule: "Hitung kebutuhan untuk satu turnover (siklus) usaha, bukan akumulasi seluruh tahun.",
  },
];

const pitfalls = [
  "Memasukkan penyusutan ke nilai modal tetap — gunakan nilai perolehan.",
  "Salah klasifikasi: biaya operasional dimasukkan ke modal tetap atau sebaliknya.",
  "Tidak melapor walau realisasi nol — LKPM tetap wajib disampaikan setiap periode.",
  "Salah memilih tahap (Konstruksi vs Produksi) sehingga field yang muncul tidak sesuai.",
  "Nilai antarperiode tidak konsisten (misal realisasi turun tanpa penjelasan).",
  "Melewati tenggat — laporan terlambat dapat memicu sanksi administratif.",
];

export default function OssFieldGuide() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panduan Pengisian Field OSS LKPM</h1>
        <p className="text-muted-foreground">
          Peta setiap komponen data Tracker ke kolom formulir LKPM di OSS, beserta klasifikasi modal dan jebakan umum yang sering membuat laporan ditolak.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Peta Data Tracker ke Field OSS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Komponen Tracker</TableHead>
                <TableHead>Field Formulir OSS</TableHead>
                <TableHead>Catatan Pengisian</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fieldMaps.map((f) => (
                <TableRow key={f.trackerField}>
                  <TableCell className="font-medium align-top">{f.trackerField}</TableCell>
                  <TableCell className="align-top">{f.ossField}</TableCell>
                  <TableCell className="text-muted-foreground align-top">{f.note}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {capitalCategories.map((cat) => {
          const Icon = cat.icon;
          return (
            <Card key={cat.title}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  {cat.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-1.5">
                  {cat.items.map((item) => (
                    <Badge key={item} variant="outline" className="font-normal text-xs">
                      {item}
                    </Badge>
                  ))}
                </div>
                <p className="text-muted-foreground leading-relaxed">{cat.rule}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Jebakan Umum yang Membuat Laporan Ditolak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {pitfalls.map((p) => (
              <li key={p} className="flex gap-2">
                <span className="text-amber-500 shrink-0">-</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Panduan ini bersifat umum dan mengikuti ketentuan OSS / Perizinan Berbasis Risiko. Selalu rujuk panduan resmi OSS dan ketentuan DPMPTSP/BKPM terbaru untuk kasus spesifik.
      </p>
    </div>
  );
}
