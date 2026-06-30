import { Link } from "wouter";
import {
  ShieldAlert,
  Building2,
  FileText,
  CalendarCheck,
  GaugeCircle,
  LockKeyhole,
  Sparkles,
  ClipboardCheck,
  ScrollText,
  ArrowRight,
  AlertTriangle,
  Briefcase,
  UserCheck,
  Headset,
} from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// Tiga cara melapor: mandiri, didampingi AI (Konsultan Online), atau konsultan manusia.
const audiences = [
  {
    icon: Building2,
    badge: "Lapor sendiri",
    title: "Perusahaan yang mandiri",
    desc: "Perusahaan ber-NIB dapat menyusun, memvalidasi, dan menyampaikan LKPM secara mandiri dalam satu ruang kerja yang rapi.",
    points: [
      "Kelola satu perusahaan beserta seluruh Izin/NIB-nya",
      "Susun draf dari data yang sudah terverifikasi",
      "Pantau tenggat agar tidak terlambat melapor",
    ],
  },
  {
    icon: Headset,
    badge: "Konsultan Online",
    title: "Didampingi AI LKPM-Flow",
    desc: "Tanpa menyewa konsultan, aplikasi sendiri mendampingi Anda dari memahami aturan, menyusun draf, hingga siap menyampaikan.",
    points: [
      "Mentor LKPM untuk tanya-jawab kontekstual",
      "Asisten penyusun agentik dari data tervalidasi",
      "Helpdesk cepat seputar LKPM/OSS/NIB/KBLI",
    ],
  },
  {
    icon: Briefcase,
    badge: "Konsultan manusia",
    title: "Dibantu konsultan",
    desc: "Untuk kasus kompleks, konsultan penanaman modal dapat menangani pelaporan banyak perusahaan klien sekaligus.",
    points: [
      "Kelola banyak perusahaan klien dalam satu ruang kerja",
      "Isolasi data penuh antar-klien",
      "Alur maker/checker/approver untuk kontrol kualitas",
    ],
  },
];

// INTEREST — fakta kewajiban LKPM (berdasarkan ketentuan, tanpa klaim angka karangan)
const facts = [
  {
    icon: ScrollText,
    title: "Kewajiban berkala",
    desc: "Setiap pelaku usaha dengan NIB wajib menyampaikan LKPM secara berkala melalui sistem OSS.",
  },
  {
    icon: CalendarCheck,
    title: "Periode pelaporan",
    desc: "Triwulanan untuk skala menengah dan besar; semesteran untuk skala mikro dan kecil.",
  },
  {
    icon: AlertTriangle,
    title: "Risiko sanksi",
    desc: "Kelalaian melapor dapat berujung sanksi administratif sesuai ketentuan perizinan berusaha.",
  },
];

// DESIRE — kemampuan platform (fitur nyata yang ada di aplikasi)
const capabilities = [
  {
    icon: Building2,
    title: "Ruang kerja yang rapi",
    desc: "Perusahaan mengelola entitasnya sendiri; konsultan mengelola banyak klien — semuanya terisolasi penuh antar-akun.",
  },
  {
    icon: FileText,
    title: "Alur kerja pipeline",
    desc: "Dari intake, pengumpulan data, validasi, penyusunan, review, hingga arsip dengan peran maker/checker/approver.",
  },
  {
    icon: GaugeCircle,
    title: "Doktrin anti-halusinasi data",
    desc: "Setiap data point membawa sumber, status verifikasi, dan tingkat keyakinan sehingga setiap klaim dapat ditelusuri.",
  },
  {
    icon: Sparkles,
    title: "Asisten penyusun agentik",
    desc: "Pipeline beberapa agen menyusun draf hanya dari data tervalidasi; data yang ditolak menjadi daftar 'perlu dilengkapi', bukan tebakan.",
  },
  {
    icon: CalendarCheck,
    title: "Kalender tenggat",
    desc: "Hitung mundur H- tiap tenggat dan indikator status pelaporan tiap perusahaan.",
  },
  {
    icon: ClipboardCheck,
    title: "Pemeriksaan kepatuhan OSS",
    desc: "Bantu pastikan komponen laporan selaras dengan format yang diminta OSS sebelum disampaikan.",
  },
];

// DESIRE — alur kerja singkat (AIDA: memperkuat keinginan dengan kejelasan langkah)
const steps = [
  {
    no: "01",
    title: "Catat perusahaan & Izin",
    desc: "Daftarkan perusahaan (milik sendiri atau klien) dan tiap Izin/NIB beserta skala usahanya.",
  },
  {
    no: "02",
    title: "Kumpulkan data terverifikasi",
    desc: "Masukkan realisasi investasi, tenaga kerja, dan kendala — lengkap dengan sumbernya.",
  },
  {
    no: "03",
    title: "Susun & validasi draf",
    desc: "Asisten menyusun narasi dari data yang lolos validasi anti-halusinasi.",
  },
  {
    no: "04",
    title: "Pantau tenggat & sampaikan",
    desc: "Ikuti hitung mundur tenggat, periksa kepatuhan, lalu sampaikan melalui OSS.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-6 backdrop-blur md:px-10">
        <div className="flex items-center gap-2 text-lg font-semibold text-primary">
          <ShieldAlert className="h-6 w-6" />
          LKPM-Flow
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="rounded-md px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Masuk
          </Link>
          <Link
            href="/sign-up"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Daftar
          </Link>
        </div>
      </header>

      <main>
        {/* ATTENTION */}
        <section className="relative overflow-hidden border-b">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "radial-gradient(hsl(var(--primary)) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-5xl px-6 py-20 text-center md:px-10 md:py-28">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
              <LockKeyhole className="h-3.5 w-3.5" />
              Platform pelaporan LKPM-BKPM untuk perusahaan & konsultan
            </div>
            <h1 className="mx-auto max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">
              Pelaporan LKPM yang tertib, tertelusur, dan tepat waktu
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
              Perusahaan ber-NIB dapat menyusun dan menyampaikan Laporan Kegiatan
              Penanaman Modal sendiri melalui OSS — didampingi Konsultan Online
              (AI) di dalam aplikasi, atau diserahkan kepada konsultan penanaman
              modal. Semuanya dengan doktrin anti-halusinasi data dan isolasi
              data yang ketat.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Mulai kelola pelaporan
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/sign-in"
                className="rounded-md border px-6 py-3 text-sm font-medium transition-colors hover:bg-muted"
              >
                Masuk ke akun
              </Link>
            </div>
          </div>
        </section>

        {/* TIGA CARA MELAPOR */}
        <section className="border-b">
          <div className="mx-auto max-w-5xl px-6 py-16 md:px-10 md:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                Satu platform, tiga cara melapor
              </h2>
              <p className="mt-3 text-muted-foreground">
                Lapor sendiri sebagai perusahaan, biarkan Konsultan Online (AI)
                mendampingi Anda, atau serahkan kepada konsultan penanaman modal.
              </p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {audiences.map((a) => {
                const Icon = a.icon;
                return (
                  <div
                    key={a.badge}
                    className="flex flex-col rounded-2xl border bg-card p-6 text-left md:p-8"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
                        {a.badge}
                      </span>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">{a.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {a.desc}
                    </p>
                    <ul className="mt-4 space-y-2">
                      {a.points.map((p) => (
                        <li
                          key={p}
                          className="flex items-start gap-2 text-sm text-foreground"
                        >
                          <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* INTEREST */}
        <section className="border-b bg-card/40">
          <div className="mx-auto max-w-5xl px-6 py-16 md:px-10 md:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                Mengapa LKPM perlu dikelola dengan serius
              </h2>
              <p className="mt-3 text-muted-foreground">
                LKPM adalah kewajiban pelaporan berkala bagi pelaku usaha
                ber-NIB. Mengelolanya secara rapi menjaga kepatuhan dan
                menghindari risiko sanksi.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {facts.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="rounded-xl border bg-card p-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 font-semibold">{f.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {f.desc}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-muted-foreground">
              Ketentuan periode dan tenggat mengikuti regulasi yang berlaku.
              Selalu verifikasi ketentuan terbaru pada OSS dan JDIH BKPM.
            </p>
          </div>
        </section>

        {/* DESIRE — capabilities */}
        <section className="border-b">
          <div className="mx-auto max-w-5xl px-6 py-16 md:px-10 md:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                Semua yang dibutuhkan untuk melapor, dalam satu alur
              </h2>
              <p className="mt-3 text-muted-foreground">
                Dirancang untuk pelaporan yang presisi — baik oleh perusahaan
                sendiri maupun konsultan: data yang tertelusur, alur yang jelas,
                dan tenggat yang terpantau.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {capabilities.map((c) => {
                const Icon = c.icon;
                return (
                  <div
                    key={c.title}
                    className="rounded-xl border bg-card p-6 text-left"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 font-semibold">{c.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {c.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* DESIRE — how it works */}
        <section className="border-b bg-card/40">
          <div className="mx-auto max-w-5xl px-6 py-16 md:px-10 md:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                Empat langkah dari data ke laporan
              </h2>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s) => (
                <div key={s.no} className="rounded-xl border bg-card p-6">
                  <span className="text-2xl font-bold text-primary/30">
                    {s.no}
                  </span>
                  <h3 className="mt-2 font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ACTION */}
        <section className="px-6 py-20 md:px-10 md:py-24">
          <div className="mx-auto max-w-3xl rounded-2xl border bg-primary px-8 py-12 text-center text-primary-foreground">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              Mulai kelola pelaporan LKPM Anda
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-primary-foreground/80 md:text-base">
              Daftar sebagai perusahaan untuk melapor sendiri, atau sebagai
              konsultan untuk membantu klien — pilih peran Anda saat mendaftar.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 rounded-md bg-card px-6 py-3 text-sm font-medium text-foreground transition-opacity hover:opacity-90"
              >
                Daftar sekarang
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/sign-in"
                className="rounded-md border border-primary-foreground/30 px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-white/10"
              >
                Masuk ke akun
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        LKPM-Flow — Platform pelaporan LKPM-BKPM untuk perusahaan dan konsultan
        penanaman modal.
        <span className="sr-only">{basePath}</span>
      </footer>
    </div>
  );
}
