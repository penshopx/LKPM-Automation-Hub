import { Link } from "wouter";
import {
  Headset,
  Sparkles,
  GraduationCap,
  MessageCircle,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { openHelpdesk } from "@/components/helpdesk-widget";

const steps = [
  {
    no: "01",
    title: "Pelajari & konsultasikan",
    desc: "Tanya kewajiban, periode, dan format LKPM lewat Mentor LKPM — pendamping yang menjawab kontekstual sesuai kasus Anda.",
  },
  {
    no: "02",
    title: "Susun draf otomatis",
    desc: "Asisten Penyusun merangkai draf dari data yang sudah tervalidasi, lengkap dengan pemeriksaan kepatuhan OSS dan pemantauan tenggat.",
  },
  {
    no: "03",
    title: "Pastikan & sampaikan",
    desc: "Tinjau daftar 'perlu dilengkapi', perbaiki kekurangan, lalu sampaikan laporan melalui OSS dengan percaya diri.",
  },
];

export default function KonsultanOnline() {
  return (
    <div className="space-y-8">
      <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-6 md:p-8">
        <div className="flex items-center gap-2 text-primary">
          <Headset className="h-6 w-6" />
          <span className="text-sm font-semibold uppercase tracking-wide">
            Konsultan Online
          </span>
        </div>
        <h1 className="mt-3 max-w-2xl text-2xl font-bold tracking-tight md:text-3xl">
          LKPM-Flow sebagai konsultan online Anda
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Tidak perlu menyewa konsultan untuk melapor. Aplikasi ini
          mendampingi Anda dari memahami kewajiban, menyusun draf, hingga siap
          menyampaikan LKPM melalui OSS — dengan doktrin anti-halusinasi data
          sehingga setiap klaim tetap dapat ditelusuri.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link href="/asisten">
            <Button className="gap-2">
              Mulai susun laporan
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="outline" className="gap-2" onClick={openHelpdesk}>
            <MessageCircle className="h-4 w-4" />
            Tanya cepat
          </Button>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold">Tiga langkah pendampingan</h2>
        <p className="text-sm text-muted-foreground">
          Alur terpadu yang menggabungkan seluruh kemampuan AI LKPM-Flow.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.no} className="rounded-xl border bg-card p-5">
              <span className="text-2xl font-bold text-primary/30">{s.no}</span>
              <h3 className="mt-2 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <GraduationCap className="h-6 w-6" />
            </div>
            <CardTitle className="mt-3 text-base">Mentor LKPM</CardTitle>
            <CardDescription>
              Sesi tanya-jawab mendalam untuk memahami aturan, periode, dan cara
              mengisi tiap bagian laporan.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Link href="/mentor">
              <Button variant="outline" className="w-full gap-2">
                Buka Mentor
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <CardTitle className="mt-3 text-base">Asisten Penyusun</CardTitle>
            <CardDescription>
              Pipeline agen menyusun draf dari data tervalidasi; data yang
              ditolak menjadi daftar 'perlu dilengkapi', bukan tebakan.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Link href="/asisten">
              <Button variant="outline" className="w-full gap-2">
                Buka Asisten
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MessageCircle className="h-6 w-6" />
            </div>
            <CardTitle className="mt-3 text-base">Helpdesk</CardTitle>
            <CardDescription>
              Bantuan cepat seputar aplikasi dan istilah LKPM/OSS/NIB/KBLI,
              tersedia kapan saja.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={openHelpdesk}
            >
              Buka Helpdesk
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-start gap-3 rounded-xl border bg-muted/40 p-5">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-medium text-foreground">
            Tetap butuh konsultan manusia?
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Untuk kasus yang kompleks, konsultan penanaman modal tetap dapat
            menangani pelaporan Anda. Konsultan Online dirancang untuk membantu
            Anda melapor sendiri dengan tertib dan tertelusur.
          </p>
        </div>
      </div>
    </div>
  );
}
