import React from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

type ChecklistSection = {
  title: string;
  phase: string;
  items: string[];
};

const sections: ChecklistSection[] = [
  {
    title: "Persiapan",
    phase: "H-30 s/d H-14",
    items: [
      "Tentukan periode pelaporan dan tenggat di OSS",
      "Konfirmasi tahap usaha (Konstruksi / Produksi)",
      "Pastikan akses OSS aktif (hak akses & sandi)",
      "Kumpulkan dokumen sumber (laporan keuangan, daftar tenaga kerja, bukti realisasi)",
    ],
  },
  {
    title: "Pengumpulan Data",
    phase: "H-14 s/d H-7",
    items: [
      "Realisasi modal tetap (tanah, bangunan, mesin, lain-lain) — nilai perolehan",
      "Realisasi modal kerja (satu kali perputaran usaha)",
      "Jumlah Tenaga Kerja Indonesia (laki-laki / perempuan)",
      "Jumlah Tenaga Kerja Asing (bila ada)",
      "Nilai produksi (untuk tahap produksi)",
      "Catat sumber data untuk setiap komponen",
    ],
  },
  {
    title: "Validasi & Kualitas Data (QC)",
    phase: "H-7 s/d H-3",
    items: [
      "Verifikasi setiap titik data memiliki sumber yang jelas",
      "Pastikan skor keyakinan (confidence) memadai",
      "Cek konsistensi nilai dengan periode sebelumnya",
      "Pastikan klasifikasi modal tetap vs modal kerja sudah benar",
    ],
  },
  {
    title: "Pengisian di OSS",
    phase: "H-3 s/d H-1",
    items: [
      "Login OSS dan buka menu LKPM",
      "Pilih periode pelaporan yang tepat",
      "Isi field realisasi investasi dan tenaga kerja",
      "Isi kolom Permasalahan + tindak lanjut (gunakan Template Narasi)",
      "Tinjau ulang seluruh isian sebelum submit",
    ],
  },
  {
    title: "Penyampaian & Arsip",
    phase: "H-1 s/d H",
    items: [
      "Submit LKPM sebelum tenggat",
      "Simpan tanda terima / bukti penyampaian",
      "Perbarui status di Tracker menjadi Terkirim",
      "Arsipkan dokumen pendukung",
    ],
  },
];

const headerFields = ["Perusahaan", "NIB", "Skala Usaha", "Periode", "Tahun", "PIC"];

export default function PrintChecklist() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lembar Checklist Cetak per Periode</h1>
          <p className="text-muted-foreground">
            Versi ringkas siap-print untuk PIC lapangan. Klik Cetak untuk mencetak atau menyimpan sebagai PDF.
          </p>
        </div>
        <Button onClick={() => window.print()} className="gap-2 shrink-0">
          <Printer className="h-4 w-4" />
          Cetak
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-6 md:p-8 print:border-0 print:p-0 print:shadow-none">
        <div className="hidden print:block mb-6">
          <h2 className="text-xl font-bold">Checklist Pelaporan LKPM per Periode</h2>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-8">
          {headerFields.map((f) => (
            <div key={f} className="flex items-end gap-2 text-sm">
              <span className="font-medium whitespace-nowrap">{f}:</span>
              <span className="flex-1 border-b border-dashed border-muted-foreground/40 h-5" />
            </div>
          ))}
        </div>

        <div className="space-y-6">
          {sections.map((section, idx) => (
            <div key={section.title} className="break-inside-avoid">
              <div className="flex items-baseline justify-between border-b pb-1 mb-3">
                <h3 className="font-semibold">
                  {idx + 1}. {section.title}
                </h3>
                <span className="text-xs text-muted-foreground">{section.phase}</span>
              </div>
              <ul className="space-y-2">
                {section.items.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border border-muted-foreground/60" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-10 mt-10 pt-6 border-t text-sm">
          <div>
            <p className="mb-10">Disiapkan oleh (PIC):</p>
            <span className="block border-b border-muted-foreground/40 w-3/4" />
          </div>
          <div>
            <p className="mb-10">Disetujui oleh (Approver):</p>
            <span className="block border-b border-muted-foreground/40 w-3/4" />
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground print:hidden">
        Tata letak dioptimalkan untuk cetak (navigasi disembunyikan otomatis saat mencetak). Sesuaikan isian dengan kondisi riil perusahaan.
      </p>
    </div>
  );
}
