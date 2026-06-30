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
import { Coins, Users, Factory, HeartHandshake, AlertTriangle, ShieldCheck } from "lucide-react";

type Component = {
  key: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  sources: string[];
  howTo: string;
  verification: string;
  reconciliation: string;
  pitfalls: string[];
};

const components: Component[] = [
  {
    key: "investasi",
    title: "Realisasi Investasi",
    icon: Coins,
    sources: ["General ledger / laporan keuangan", "Daftar aset tetap", "Bukti pembelian & invoice", "Rekening koran"],
    howTo: "Pisahkan modal tetap (tanah, bangunan, mesin/peralatan, lain-lain) dari modal kerja. Gunakan nilai perolehan, tanpa penyusutan.",
    verification: "Cocokkan nilai aset dengan bukti perolehan; pastikan modal kerja hanya satu kali perputaran usaha.",
    reconciliation: "Total realisasi kumulatif harus konsisten dengan periode sebelumnya (tidak menurun tanpa penjelasan).",
    pitfalls: [
      "Memasukkan penyusutan ke nilai modal tetap.",
      "Mencampur biaya operasional ke dalam modal tetap.",
      "Akumulasi modal kerja seluruh tahun, bukan satu turnover.",
    ],
  },
  {
    key: "tenaga-kerja",
    title: "Penyerapan Tenaga Kerja",
    icon: Users,
    sources: ["HRIS / daftar karyawan", "Data kepesertaan BPJS Ketenagakerjaan & Kesehatan", "Dokumen RPTKA (untuk TKA)"],
    howTo: "Hitung jumlah TKI (laki-laki/perempuan) dan TKA yang aktif pada akhir periode pelaporan.",
    verification: "Bandingkan jumlah dengan data BPJS; pastikan TKA didukung dokumen RPTKA yang berlaku.",
    reconciliation: "Selisih jumlah tenaga kerja antarperiode harus dapat dijelaskan (rekrutmen/pengurangan).",
    pitfalls: [
      "Menghitung tenaga kerja yang sudah tidak aktif.",
      "Mengisi TKA pada tahap konstruksi tanpa dasar.",
      "Tidak memisahkan TKI laki-laki dan perempuan.",
    ],
  },
  {
    key: "produksi",
    title: "Produksi Barang / Jasa",
    icon: Factory,
    sources: ["Data penjualan / omzet", "Laporan produksi", "Faktur pajak / e-faktur"],
    howTo: "Agregasi nilai produksi atau omzet selama periode. Hanya diisi setelah memasuki tahap komersial/produksi.",
    verification: "Cocokkan nilai produksi dengan catatan penjualan dan pajak; pastikan satuan konsisten.",
    reconciliation: "Nilai produksi sejalan dengan kapasitas terpasang dan tenaga kerja yang dilaporkan.",
    pitfalls: [
      "Mengisi nilai produksi saat masih tahap konstruksi.",
      "Satuan/nilai tidak konsisten antarperiode.",
      "Mencampur omzet di luar lingkup proyek/NIB.",
    ],
  },
  {
    key: "kewajiban",
    title: "Kewajiban Perusahaan",
    icon: HeartHandshake,
    sources: ["Catatan CSR / TJSL", "Perjanjian kemitraan", "Bukti pelatihan & pembinaan", "Status BPJS"],
    howTo: "Rekap pelaksanaan CSR, kemitraan, pelatihan, dan kepesertaan BPJS sesuai komitmen perizinan.",
    verification: "Lampirkan bukti pelaksanaan; pastikan sesuai komitmen yang tercatat di NIB/izin.",
    reconciliation: "Realisasi kewajiban selaras dengan kewajiban yang melekat pada skala usaha (terutama besar).",
    pitfalls: [
      "Melaporkan komitmen tanpa bukti pelaksanaan.",
      "Mengabaikan kewajiban kemitraan untuk usaha besar.",
      "BPJS belum aktif untuk seluruh tenaga kerja.",
    ],
  },
  {
    key: "kendala",
    title: "Kendala Usaha",
    icon: AlertTriangle,
    sources: ["Catatan operasional", "Notulen rapat proyek", "Korespondensi perizinan"],
    howTo: "Uraikan kendala riil (perizinan, lahan, pasar, pendanaan) beserta rencana tindak lanjut.",
    verification: "Pastikan kendala faktual dan spesifik, bukan keterangan umum, agar dapat difasilitasi DPMPTSP/BKPM.",
    reconciliation: "Kendala konsisten dengan realisasi yang dilaporkan (mis. realisasi rendah disertai penjelasan).",
    pitfalls: [
      "Mengisi 'tidak ada kendala' padahal realisasi jauh dari rencana.",
      "Narasi terlalu umum tanpa konteks.",
      "Tidak mencantumkan rencana tindak lanjut.",
    ],
  },
];

const gates = [
  {
    code: "G2",
    title: "Gate setelah Collect",
    rule: "Seluruh 5 komponen data lengkap dan memiliki sumber yang jelas. Jika ada komponen kosong tanpa alasan, kembali ke pengumpulan data.",
  },
  {
    code: "G3",
    title: "Gate setelah Validate",
    rule: "0 anomali kritis, angka rekonsiliasi balance antar sumber. Jika ditemukan anomali, perbaiki sebelum drafting.",
  },
];

export default function SopData() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">SOP Pengumpulan & Verifikasi 5 Komponen Data</h1>
        <p className="text-muted-foreground">
          Prosedur operasional baku untuk tiap komponen data LKPM: sumber data, cara tarik, langkah verifikasi, rekonsiliasi, dan kesalahan umum. Selaras dengan gate G2-G3 pada pipeline.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {components.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.key}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  {c.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-medium mb-1">Sumber data</p>
                  <div className="flex flex-wrap gap-1.5">
                    {c.sources.map((s) => (
                      <Badge key={s} variant="outline" className="font-normal text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-medium">Cara tarik</p>
                  <p className="text-muted-foreground leading-relaxed">{c.howTo}</p>
                </div>
                <div>
                  <p className="font-medium">Verifikasi</p>
                  <p className="text-muted-foreground leading-relaxed">{c.verification}</p>
                </div>
                <div>
                  <p className="font-medium">Rekonsiliasi</p>
                  <p className="text-muted-foreground leading-relaxed">{c.reconciliation}</p>
                </div>
                <div>
                  <p className="font-medium">Kesalahan umum</p>
                  <ul className="space-y-1">
                    {c.pitfalls.map((p) => (
                      <li key={p} className="flex gap-2 text-muted-foreground">
                        <span className="text-amber-500 shrink-0">-</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Gate Kualitas (G2-G3)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gate</TableHead>
                <TableHead>Tahap</TableHead>
                <TableHead>Syarat Lolos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gates.map((g) => (
                <TableRow key={g.code}>
                  <TableCell className="font-mono align-top">{g.code}</TableCell>
                  <TableCell className="font-medium align-top">{g.title}</TableCell>
                  <TableCell className="text-muted-foreground align-top">{g.rule}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        SOP ini bersifat umum dan mengikuti prinsip data tertelusur (setiap angka punya sumber). Sesuaikan dengan sistem pencatatan internal perusahaan dan rujuk ketentuan OSS/BKPM terbaru.
      </p>
    </div>
  );
}
