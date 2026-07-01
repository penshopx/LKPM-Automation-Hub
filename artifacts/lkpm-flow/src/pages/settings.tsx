import React from "react";
import { useUser } from "@clerk/react";
import {
  useGetNotificationPreferences,
  getGetNotificationPreferencesQueryKey,
  useUpdateNotificationPreferences,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/lib/role";
import { Bell, Mail, UserRound, Loader2 } from "lucide-react";

const LEAD_DAY_OPTIONS = [1, 3, 7, 14, 30];

export default function Settings() {
  const { user } = useUser();
  const role = useRole();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const prefsKey = getGetNotificationPreferencesQueryKey();

  const { data: prefs, isLoading } = useGetNotificationPreferences({
    query: { queryKey: prefsKey },
  });
  const update = useUpdateNotificationPreferences();

  const displayName =
    user?.fullName ||
    user?.primaryEmailAddress?.emailAddress ||
    user?.username ||
    "Pengguna";
  const email = user?.primaryEmailAddress?.emailAddress;
  const roleLabel = role === "perusahaan" ? "Perusahaan" : "Konsultan";

  React.useEffect(() => {
    // Sync the signed-in consultant's own email so reminder emails reach them
    // (not the repl owner). Runs once when prefs load and the stored value is
    // stale or missing.
    if (!prefs || !email) return;
    if (prefs.email !== email) {
      update.mutate(
        { data: { email } },
        {
          onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: prefsKey }),
        },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs?.email, email]);

  const save = (patch: {
    enabled?: boolean;
    inAppEnabled?: boolean;
    emailEnabled?: boolean;
    reminderLeadDays?: number[];
  }) => {
    update.mutate(
      { data: patch },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: prefsKey });
        },
        onError: () => {
          toast({
            title: "Gagal menyimpan preferensi",
            description: "Coba lagi beberapa saat.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const toggleLeadDay = (day: number) => {
    if (!prefs) return;
    const current = prefs.reminderLeadDays ?? [];
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => b - a);
    save({ reminderLeadDays: next });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pengaturan</h1>
        <p className="text-muted-foreground">
          Kelola profil akun dan preferensi pengingat tenggat LKPM.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserRound className="h-5 w-5 text-primary" />
            Profil
          </CardTitle>
          <CardDescription>
            Informasi akun Anda yang tersimpan pada sistem masuk.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-medium text-foreground">
                {displayName}
              </p>
              {email && (
                <p className="truncate text-sm text-muted-foreground">{email}</p>
              )}
              <Badge variant="secondary" className="mt-2">
                {roleLabel}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-primary" />
            Pengingat Tenggat
          </CardTitle>
          <CardDescription>
            Atur pengingat otomatis untuk tenggat LKPM (tanggal 15 setiap periode
            pelaporan) dan laporan yang telah lewat tenggat.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading || !prefs ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="pref-enabled" className="text-sm font-medium">
                    Aktifkan pengingat tenggat
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Sakelar utama. Bila nonaktif, tidak ada pengingat yang
                    dibuat.
                  </p>
                </div>
                <Switch
                  id="pref-enabled"
                  checked={prefs.enabled}
                  onCheckedChange={(v) => save({ enabled: v })}
                  disabled={update.isPending}
                />
              </div>

              <div className="space-y-4 border-t pt-4">
                <p className="text-sm font-medium text-foreground">
                  Kanal pengiriman
                </p>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <div className="space-y-0.5">
                      <Label
                        htmlFor="pref-inapp"
                        className="text-sm font-medium"
                      >
                        Notifikasi di aplikasi
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Tampil di pusat notifikasi.
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="pref-inapp"
                    checked={prefs.inAppEnabled}
                    onCheckedChange={(v) => save({ inAppEnabled: v })}
                    disabled={!prefs.enabled || update.isPending}
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div className="space-y-0.5">
                      <Label
                        htmlFor="pref-email"
                        className="text-sm font-medium"
                      >
                        Email
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {email
                          ? `Dikirim ke ${email} bila layanan email tersedia; jika tidak, pengingat tetap tampil di aplikasi.`
                          : "Dikirim ke alamat akun Anda bila tersedia; jika tidak, pengingat tetap tampil di aplikasi."}
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="pref-email"
                    checked={prefs.emailEnabled}
                    onCheckedChange={(v) => save({ emailEnabled: v })}
                    disabled={!prefs.enabled || update.isPending}
                  />
                </div>
              </div>

              <div className="space-y-3 border-t pt-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">
                    Tenggang hari pengingat
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Pilih kapan pengingat dikirim sebelum tenggat (mis. H-7, H-3,
                    H-1).
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {LEAD_DAY_OPTIONS.map((day) => {
                    const active = (prefs.reminderLeadDays ?? []).includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleLeadDay(day)}
                        disabled={!prefs.enabled || update.isPending}
                        className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-background text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        H-{day}
                      </button>
                    );
                  })}
                </div>
                {(prefs.reminderLeadDays ?? []).length === 0 && (
                  <p className="text-xs text-amber-600">
                    Belum ada tenggang dipilih; hanya pengingat keterlambatan
                    yang akan dibuat.
                  </p>
                )}
              </div>

              {update.isPending && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Menyimpan...
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
