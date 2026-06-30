import React from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LayoutDashboard,
  Building2,
  FileText,
  Calendar as CalendarIcon,
  ShieldAlert,
  ClipboardList,
  FileSpreadsheet,
  BookOpen,
  MessageSquareText,
  Printer,
  Workflow,
  Database,
  BookMarked,
  Clapperboard,
  Scale,
  Sparkles,
  GraduationCap,
  ArrowRight,
} from "lucide-react";

type MapItem = {
  href: string;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
};

type MapSection = {
  title: string;
  items: MapItem[];
};

const sections: MapSection[] = [
  {
    title: "Operasional",
    items: [
      { href: "/", label: "Dasbor", desc: "Status pipeline, ringkasan skala usaha, tenggat terdekat, dan KPI kualitas data.", icon: LayoutDashboard },
      { href: "/companies", label: "Perusahaan", desc: "Daftar perusahaan per skala usaha dengan NIB, jenis & status perizinan.", icon: Building2 },
      { href: "/reports", label: "Laporan LKPM", desc: "Daftar dan detail laporan: titik data, kendala, dan jejak audit.", icon: FileText },
      { href: "/calendar", label: "Kalender", desc: "Tenggat pelaporan dengan hitung mundur H- dan penanda terlambat/terkirim.", icon: CalendarIcon },
      { href: "/data-quality", label: "Kualitas Data", desc: "Titik data belum terverifikasi dan berkeyakinan rendah yang perlu ditindak.", icon: ShieldAlert },
    ],
  },
  {
    title: "Asisten AI",
    items: [
      { href: "/asisten", label: "Asisten Penyusun", desc: "Susun draf narasi LKPM dari data laporan tanpa mengarang angka atau sumber.", icon: Sparkles },
      { href: "/mentor", label: "Mentor LKPM", desc: "Belajar LKPM lewat dialog Socrates yang memandu dengan pertanyaan.", icon: GraduationCap },
    ],
  },
  {
    title: "Referensi & Panduan",
    items: [
      { href: "/blueprint", label: "Blueprint & Arsitektur", desc: "Pipeline delapan tahap, hierarki agen S1-S6, RACI, dan KPI keberhasilan.", icon: Workflow },
      { href: "/template-intake", label: "Template Intake", desc: "Checklist intake per skala usaha sebelum siklus pelaporan dimulai.", icon: ClipboardList },
      { href: "/oss-field-guide", label: "Panduan Field OSS", desc: "Peta komponen data ke field formulir OSS, klasifikasi modal, dan jebakan umum.", icon: FileSpreadsheet },
      { href: "/glossary-faq", label: "Glosarium & FAQ", desc: "Istilah kunci LKPM/OSS dan jawaban pertanyaan yang sering muncul.", icon: BookOpen },
      { href: "/narrative-templates", label: "Template Narasi", desc: "Contoh narasi kendala dan tindak lanjut untuk kolom permasalahan OSS.", icon: MessageSquareText },
      { href: "/print-checklist", label: "Checklist Cetak", desc: "Lembar checklist siap-cetak per periode untuk PIC lapangan.", icon: Printer },
    ],
  },
  {
    title: "Pendalaman",
    items: [
      { href: "/sop-data", label: "SOP Data", desc: "Prosedur pengumpulan & verifikasi 5 komponen data dengan gate G2-G3.", icon: Database },
      { href: "/agent-playbook", label: "Playbook Agen", desc: "Pemicu, input, langkah, output, gate, dan eskalasi tiap agen S1-S6.", icon: BookMarked },
      { href: "/case-studies", label: "Studi Kasus", desc: "Tiga skenario siklus end-to-end H-30 hingga arsip per skala usaha.", icon: Clapperboard },
      { href: "/regulation", label: "Regulasi & Sanksi", desc: "Dasar hukum, kalender tenggat terbaru, dan tahapan sanksi berjenjang.", icon: Scale },
    ],
  },
];

export default function IndexMap() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Peta Dokumen & Halaman</h1>
        <p className="text-muted-foreground">
          Indeks seluruh halaman sistem LKPM-Flow. Gunakan sebagai titik awal untuk membuka halaman operasional maupun referensi.
        </p>
      </div>

      {sections.map((section) => (
        <div key={section.title} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {section.title}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <Card className="h-full transition-colors hover:border-primary cursor-pointer">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2">
                          <Icon className="h-5 w-5 text-primary" />
                          {item.label}
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
