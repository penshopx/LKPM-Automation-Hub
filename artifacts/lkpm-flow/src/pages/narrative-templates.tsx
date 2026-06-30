import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquareText, Check, Copy, Lightbulb } from "lucide-react";

type NarrativeTemplate = {
  category: string;
  situation: string;
  followUp: string;
};

const templates: NarrativeTemplate[] = [
  {
    category: "Tidak ada kendala (berjalan normal)",
    situation:
      "Pada periode [periode], kegiatan penanaman modal berjalan sesuai rencana tanpa kendala berarti. Realisasi investasi dan penyerapan tenaga kerja sesuai target.",
    followUp:
      "Perusahaan melanjutkan kegiatan operasional sesuai rencana dan menjaga konsistensi realisasi serta pelaporan pada periode berikutnya.",
  },
  {
    category: "Perizinan / regulasi",
    situation:
      "Proses penyelesaian [jenis izin/sertifikat] mengalami keterlambatan sehingga sebagian kegiatan [konstruksi/operasional] tertunda pada periode [periode].",
    followUp:
      "Perusahaan berkoordinasi dengan [DPMPTSP/instansi terkait] untuk mempercepat penyelesaian dan menargetkan rampung pada [periode/tanggal].",
  },
  {
    category: "Lahan / lokasi",
    situation:
      "Pembebasan/pematangan lahan di [lokasi] belum selesai sehingga memengaruhi jadwal pembangunan pada periode [periode].",
    followUp:
      "Perusahaan menempuh [negosiasi/penyesuaian desain/alternatif lokasi] dan memperkirakan penyelesaian pada [periode].",
  },
  {
    category: "Pasar / permintaan",
    situation:
      "Permintaan pasar pada periode [periode] lebih rendah dari proyeksi sehingga realisasi produksi/penjualan belum mencapai target.",
    followUp:
      "Perusahaan melakukan [diversifikasi produk/perluasan pemasaran/penyesuaian kapasitas] untuk memulihkan kinerja pada periode berikutnya.",
  },
  {
    category: "Pendanaan / modal",
    situation:
      "Pencairan pendanaan/penyertaan modal tertunda sehingga realisasi investasi pada periode [periode] lebih kecil dari rencana.",
    followUp:
      "Perusahaan sedang memproses [pinjaman/penambahan modal] dengan target pencairan pada [periode].",
  },
  {
    category: "Tenaga kerja",
    situation:
      "Perusahaan menghadapi keterbatasan ketersediaan tenaga kerja [terampil/sesuai kualifikasi] pada periode [periode].",
    followUp:
      "Perusahaan melakukan [rekrutmen/pelatihan/kerja sama dengan lembaga pelatihan] untuk memenuhi kebutuhan tenaga kerja.",
  },
  {
    category: "Pasokan bahan baku / impor mesin",
    situation:
      "Keterlambatan [pasokan bahan baku/pengiriman mesin impor] memengaruhi jadwal [produksi/instalasi] pada periode [periode].",
    followUp:
      "Perusahaan mencari [pemasok alternatif/penyesuaian jadwal] dan memperkirakan kegiatan normal kembali pada [periode].",
  },
  {
    category: "Force majeure",
    situation:
      "Kegiatan usaha terdampak [bencana/kondisi force majeure] pada periode [periode] sehingga sebagian rencana tidak terealisasi.",
    followUp:
      "Perusahaan melakukan [pemulihan operasional/penyesuaian rencana] dan akan melaporkan perkembangannya pada periode berikutnya.",
  },
];

const tips = [
  "Sebutkan periode secara eksplisit dan gunakan angka bila memungkinkan (lebih kredibel).",
  "Selalu pasangkan kendala dengan tindak lanjut konkret dan target waktu.",
  "Tulis faktual dan netral; hindari menyalahkan pihak lain.",
  "Jangan kosongkan kolom Permasalahan walau realisasi normal — gunakan template pertama.",
  "Konsisten antarperiode agar perkembangan kendala mudah ditelusuri.",
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 gap-1.5 text-xs">
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-green-600" />
          Tersalin
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          Salin
        </>
      )}
    </Button>
  );
}

export default function NarrativeTemplates() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Template Narasi Kendala & Tindak Lanjut</h1>
        <p className="text-muted-foreground">
          Kalimat siap-pakai untuk kolom "Permasalahan yang Dihadapi" di formulir LKPM OSS. Salin, lalu sesuaikan teks dalam tanda kurung siku.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {templates.map((t) => (
          <Card key={t.category} className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquareText className="h-4 w-4 text-primary" />
                {t.category}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-4 text-sm">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Narasi Kendala
                  </span>
                  <CopyButton text={t.situation} />
                </div>
                <p className="leading-relaxed rounded-md bg-muted/50 p-3">{t.situation}</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Tindak Lanjut
                  </span>
                  <CopyButton text={t.followUp} />
                </div>
                <p className="leading-relaxed rounded-md bg-muted/50 p-3">{t.followUp}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            Tips Menulis Narasi yang Baik
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {tips.map((tip) => (
              <li key={tip} className="flex gap-2">
                <span className="text-primary shrink-0">-</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Template bersifat umum sebagai titik awal. Sesuaikan dengan kondisi riil perusahaan dan rujuk ketentuan OSS/BKPM terbaru.
      </p>
    </div>
  );
}
