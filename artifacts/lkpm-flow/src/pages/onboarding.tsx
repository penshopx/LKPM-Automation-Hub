import { useState } from "react";
import { Building2, Briefcase, Loader2, ShieldAlert, Check } from "lucide-react";
import { useSetCurrentUserRole } from "@workspace/api-client-react";
import type { AccountRole } from "@/lib/role";

const OPTIONS: {
  role: AccountRole;
  title: string;
  desc: string;
  points: string[];
  icon: typeof Building2;
}[] = [
  {
    role: "perusahaan",
    title: "Saya mewakili Perusahaan",
    desc: "Perusahaan yang menyusun dan menyampaikan LKPM sendiri.",
    points: [
      "Kelola satu perusahaan milik Anda",
      "Susun, validasi, dan pantau LKPM secara mandiri",
      "Cocok bila Anda menangani pelaporan internal",
    ],
    icon: Building2,
  },
  {
    role: "konsultan",
    title: "Saya seorang Konsultan",
    desc: "Konsultan yang membantu banyak perusahaan klien melapor.",
    points: [
      "Kelola banyak perusahaan klien dalam satu ruang kerja",
      "Pisahkan data antar-klien secara aman",
      "Cocok untuk biro/konsultan penanaman modal",
    ],
    icon: Briefcase,
  },
];

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [selected, setSelected] = useState<AccountRole | null>(null);
  const { mutate, isPending } = useSetCurrentUserRole();

  const choose = (role: AccountRole) => {
    if (isPending) return;
    setSelected(role);
    mutate({ data: { role } }, { onSuccess: () => onDone() });
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <div className="mb-3 flex items-center justify-center gap-2 text-primary">
            <ShieldAlert className="h-6 w-6" />
            <span className="text-lg font-semibold">LKPM-Flow</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Anda menggunakan LKPM-Flow sebagai?
          </h1>
          <p className="mt-2 text-muted-foreground">
            Pilih peran akun Anda. Pilihan ini menyesuaikan tampilan dan cara
            kerja aplikasi.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = selected === opt.role;
            return (
              <button
                key={opt.role}
                type="button"
                onClick={() => choose(opt.role)}
                disabled={isPending}
                className={`flex flex-col rounded-2xl border p-6 text-left transition-colors disabled:opacity-70 ${
                  active
                    ? "border-primary bg-primary/5"
                    : "bg-card hover:border-primary/50 hover:bg-muted"
                }`}
              >
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <p className="text-base font-semibold text-foreground">
                  {opt.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{opt.desc}</p>
                <ul className="mt-4 space-y-2">
                  {opt.points.map((p) => (
                    <li
                      key={p}
                      className="flex items-start gap-2 text-sm text-foreground"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
                {active && isPending && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Menyiapkan ruang kerja Anda...
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Perusahaan yang merasa kesulitan menyusun LKPM tetap dapat dibantu oleh
          konsultan penanaman modal.
        </p>
      </div>
    </div>
  );
}
