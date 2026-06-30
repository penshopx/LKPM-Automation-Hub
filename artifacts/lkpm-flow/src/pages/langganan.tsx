import React from "react";
import { Link } from "wouter";
import {
  useGetBillingSummary,
  useListBillingPlans,
  useCreateBillingCheckout,
  useCreateBillingPortal,
} from "@workspace/api-client-react";
import type {
  BillingPlan,
  BillingPlanPrice,
} from "@workspace/api-client-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Check,
  Loader2,
  Sparkles,
  Building2,
  Settings,
  Coins,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/lib/role";

function formatIdr(unitAmount: number | null): string {
  if (unitAmount == null) return "-";
  // Stripe stores IDR as rupiah x 100 (2-decimal). Convert back to rupiah.
  const rupiah = Math.round(unitAmount / 100);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(rupiah);
}

function intervalLabel(price: BillingPlanPrice): string {
  if (price.interval === "month") return "/bulan";
  if (price.interval === "year") return "/tahun";
  return "";
}

export default function Langganan() {
  const { toast } = useToast();
  const role = useRole();
  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
  } = useGetBillingSummary();
  const { data: plans, isLoading: plansLoading } = useListBillingPlans();

  const checkout = useCreateBillingCheckout();
  const portal = useCreateBillingPortal();
  const [pendingPrice, setPendingPrice] = React.useState<string | null>(null);

  const onCheckout = (priceId: string) => {
    setPendingPrice(priceId);
    checkout.mutate(
      { data: { priceId } },
      {
        onSuccess: (res) => {
          if (res.url) {
            window.location.href = res.url;
          } else {
            setPendingPrice(null);
            toast({
              title: "Gagal memulai checkout",
              description: "URL pembayaran tidak tersedia. Coba lagi.",
              variant: "destructive",
            });
          }
        },
        onError: () => {
          setPendingPrice(null);
          toast({
            title: "Gagal memulai checkout",
            description:
              "Tidak dapat membuat sesi pembayaran. Pastikan layanan pembayaran aktif.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const onPortal = () => {
    portal.mutate(undefined, {
      onSuccess: (res) => {
        window.location.href = res.url;
      },
      onError: () => {
        toast({
          title: "Gagal membuka portal",
          description: "Belum ada langganan aktif atau layanan belum tersedia.",
          variant: "destructive",
        });
      },
    });
  };

  const subscriptionPlans = (plans ?? []).filter(
    (p) => p.kind === "subscription" && (!p.role || p.role === role),
  );
  const creditPacks = (plans ?? []).filter((p) => p.kind === "credit");

  const activeTier = summary?.plan.status === "active" ? summary.plan.tier : null;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" />
          Langganan & Kredit
        </h1>
        <p className="text-muted-foreground">
          Kelola paket langganan dan kredit pendampingan AI. Fitur validasi
          anti-halusinasi tetap tersedia di semua paket; hanya kuota dan
          otomatisasi yang dibatasi.
        </p>
      </div>

      {summaryError && (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Layanan pembayaran belum tersambung. Hubungi pengelola untuk
            mengaktifkan langganan.
          </CardContent>
        </Card>
      )}

      {summaryLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : summary ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Paket aktif</CardDescription>
              <CardTitle className="text-lg">{summary.plan.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge
                className={
                  summary.plan.status === "active"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-muted text-foreground"
                }
              >
                {summary.plan.status === "active" ? "Aktif" : "Gratis"}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" /> Kredit pendampingan
              </CardDescription>
              <CardTitle className="text-lg">
                {summary.credits.available}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Jatah bulanan: {summary.credits.allowanceRemaining}/
              {summary.credits.allowanceTotal} · Saldo beli:{" "}
              {summary.credits.topupBalance}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" /> Perusahaan
              </CardDescription>
              <CardTitle className="text-lg">
                {summary.limits.companyCount}
                {summary.limits.maxCompanies != null
                  ? ` / ${summary.limits.maxCompanies}`
                  : " / tanpa batas"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summary.plan.status === "active" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPortal}
                  disabled={portal.isPending}
                >
                  {portal.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Settings className="h-4 w-4" />
                  )}
                  Kelola langganan
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div>
        <h2 className="text-lg font-semibold mb-3">Paket Langganan</h2>
        {plansLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : subscriptionPlans.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              Belum ada paket langganan tersedia.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {subscriptionPlans.map((plan) => (
              <PlanCard
                key={plan.productId}
                plan={plan}
                isActive={activeTier != null && plan.tier === activeTier}
                pendingPrice={pendingPrice}
                onCheckout={onCheckout}
              />
            ))}
          </div>
        )}
      </div>

      {creditPacks.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Paket Kredit Pendampingan
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {creditPacks.map((pack) => (
              <CreditPackCard
                key={pack.productId}
                pack={pack}
                pendingPrice={pendingPrice}
                onCheckout={onCheckout}
              />
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Pembayaran diproses dengan aman oleh penyedia pembayaran. Anda dapat
        membatalkan langganan kapan saja melalui tombol Kelola langganan.{" "}
        <Link href="/asisten" className="underline">
          Kembali ke Asisten Penyusun
        </Link>
        .
      </p>
    </div>
  );
}

function PlanCard({
  plan,
  isActive,
  pendingPrice,
  onCheckout,
}: {
  plan: BillingPlan;
  isActive: boolean;
  pendingPrice: string | null;
  onCheckout: (priceId: string) => void;
}) {
  return (
    <Card className={isActive ? "border-primary" : undefined}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{plan.name}</CardTitle>
          {isActive && (
            <Badge className="bg-primary/10 text-primary">Aktif</Badge>
          )}
        </div>
        {plan.description && (
          <CardDescription>{plan.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-1.5 text-sm">
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            {plan.maxCompanies === -1
              ? "Perusahaan tanpa batas"
              : `Hingga ${plan.maxCompanies ?? 1} perusahaan`}
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            {plan.monthlyCredits === -1
              ? "Kredit pendampingan tanpa batas"
              : `${plan.monthlyCredits ?? 0} kredit pendampingan / bulan`}
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            Validasi anti-halusinasi penuh
          </li>
        </ul>
        <div className="space-y-2">
          {plan.prices.map((price) => (
            <Button
              key={price.priceId}
              className="w-full"
              variant={isActive ? "outline" : "default"}
              disabled={pendingPrice != null}
              onClick={() => onCheckout(price.priceId)}
            >
              {pendingPrice === price.priceId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {formatIdr(price.unitAmount)}
              {intervalLabel(price)}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CreditPackCard({
  pack,
  pendingPrice,
  onCheckout,
}: {
  pack: BillingPlan;
  pendingPrice: string | null;
  onCheckout: (priceId: string) => void;
}) {
  const price = pack.prices[0];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{pack.name}</CardTitle>
        <CardDescription>
          {pack.credits != null
            ? `${pack.credits} kredit pendampingan`
            : pack.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {price ? (
          <Button
            className="w-full"
            disabled={pendingPrice != null}
            onClick={() => onCheckout(price.priceId)}
          >
            {pendingPrice === price.priceId ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Beli — {formatIdr(price.unitAmount)}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Harga belum tersedia.</p>
        )}
      </CardContent>
    </Card>
  );
}
