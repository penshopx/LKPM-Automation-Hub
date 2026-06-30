import React from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useClaimBillingCredits,
  getGetBillingSummaryQueryKey,
} from "@workspace/api-client-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CircleCheck, Loader2 } from "lucide-react";

export default function LanggananSukses() {
  const queryClient = useQueryClient();
  const claim = useClaimBillingCredits();
  const [granted, setGranted] = React.useState<number | null>(null);
  const ranRef = React.useRef(false);

  React.useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");

    // Subscriptions activate via webhook; only credit-pack purchases need to be
    // claimed here. Claim is idempotent server-side (unique stripeRef), so a
    // refresh never double-grants.
    if (sessionId) {
      claim.mutate(
        { data: { sessionId } },
        {
          onSettled: () => {
            void queryClient.invalidateQueries({
              queryKey: getGetBillingSummaryQueryKey(),
            });
          },
          onSuccess: (res) => {
            setGranted(res.granted);
          },
        },
      );
    } else {
      void queryClient.invalidateQueries({
        queryKey: getGetBillingSummaryQueryKey(),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            {claim.isPending ? (
              <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
            ) : (
              <CircleCheck className="h-6 w-6 text-emerald-700" />
            )}
          </div>
          <CardTitle>Pembayaran berhasil</CardTitle>
          <CardDescription>
            {claim.isPending
              ? "Memproses pembelian Anda..."
              : granted != null && granted > 0
                ? `${granted} kredit pendampingan telah ditambahkan ke akun Anda.`
                : "Terima kasih. Langganan Anda sedang diaktifkan dan akan segera tersedia."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button asChild>
            <Link href="/langganan">Lihat langganan saya</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/asisten">Buka Asisten Penyusun</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
