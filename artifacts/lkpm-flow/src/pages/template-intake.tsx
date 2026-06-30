import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, CalendarClock, Layers, CheckSquare } from "lucide-react";

type Template = {
  scale: string;
  scaleLabel: string;
  operatingModeLabel: string;
  periodType: string;
  frequency: string;
  description: string;
  dataComponents: string[];
  intakeQuestions: string[];
};

const templates: Template[] = [
  {
    scale: "kecil",
    scaleLabel: "Kecil",
    operatingModeLabel: "Pendamping UMK",
    periodType: "Semester",
    frequency: "2x per tahun (Semester I & II)",
    description:
      "Skala usaha kecil melapor per semester dengan mode pendamping UMK. Fokus pada realisasi investasi dasar dan tenaga kerja.",
    dataComponents: [
      "Realisasi modal tetap",
      "Realisasi modal kerja",
      "Jumlah tenaga kerja Indonesia",
    ],
    intakeQuestions: [
      "Berapa realisasi investasi pada periode ini?",
      "Berapa jumlah tenaga kerja yang terserap?",
      "Apakah ada kendala dalam realisasi investasi?",
    ],
  },
  {
    scale: "menengah",
    scaleLabel: "Menengah",
    operatingModeLabel: "Hibrida",
    periodType: "Triwulan",
    frequency: "4x per tahun (TW I-IV)",
    description:
      "Skala usaha menengah melapor per triwulan dengan mode hibrida. Memerlukan rincian investasi, tenaga kerja, dan produksi.",
    dataComponents: [
      "Realisasi modal tetap",
      "Realisasi modal kerja",
      "Tenaga kerja Indonesia & asing",
      "Nilai produksi",
    ],
    intakeQuestions: [
      "Berapa realisasi investasi triwulan ini beserta sumbernya?",
      "Berapa komposisi tenaga kerja Indonesia dan asing?",
      "Berapa nilai produksi dan apakah sudah terverifikasi?",
      "Apakah ada kendala perizinan atau operasional?",
    ],
  },
  {
    scale: "besar",
    scaleLabel: "Besar",
    operatingModeLabel: "Penuh",
    periodType: "Triwulan",
    frequency: "4x per tahun (TW I-IV)",
    description:
      "Skala usaha besar melapor per triwulan dengan mode penuh (human-in-loop). Memerlukan kelengkapan data dan verifikasi sumber yang ketat.",
    dataComponents: [
      "Realisasi modal tetap",
      "Realisasi modal kerja",
      "Tenaga kerja Indonesia & asing",
      "Nilai produksi",
      "Kewajiban (CSR, pelatihan, kemitraan)",
    ],
    intakeQuestions: [
      "Berapa realisasi investasi per kategori dengan dokumen sumber?",
      "Berapa komposisi dan biaya tenaga kerja?",
      "Berapa nilai produksi terverifikasi dan capaian targetnya?",
      "Bagaimana pemenuhan kewajiban (CSR, pelatihan, kemitraan)?",
      "Apakah seluruh titik data memiliki sumber dan tingkat keyakinan memadai?",
    ],
  },
];

export default function TemplateIntake() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Template Intake per Skala</h1>
        <p className="text-muted-foreground">
          Acuan konfigurasi intake laporan LKPM berdasarkan skala usaha — periode, mode operasi, komponen data, dan pertanyaan intake.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {templates.map((t) => (
          <Card key={t.scale} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  {t.scaleLabel}
                </CardTitle>
                <Badge variant="secondary">{t.operatingModeLabel}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-5 text-sm">
              <p className="text-muted-foreground leading-relaxed">{t.description}</p>

              <div className="flex items-start gap-2">
                <CalendarClock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Periode: {t.periodType}</p>
                  <p className="text-muted-foreground text-xs">{t.frequency}</p>
                </div>
              </div>

              <div>
                <p className="font-medium flex items-center gap-2 mb-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  Komponen Data
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {t.dataComponents.map((c) => (
                    <Badge key={c} variant="outline" className="font-normal text-xs">
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-medium flex items-center gap-2 mb-2">
                  <CheckSquare className="h-4 w-4 text-muted-foreground" />
                  Pertanyaan Intake
                </p>
                <ul className="space-y-1.5 text-muted-foreground">
                  {t.intakeQuestions.map((q) => (
                    <li key={q} className="flex gap-2">
                      <span className="text-primary">-</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
