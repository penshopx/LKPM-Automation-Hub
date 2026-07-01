import React from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListReports,
  useGetBillingSummary,
  getGetBillingSummaryQueryKey,
  getOrchestrateReportDraftUrl,
} from "@workspace/api-client-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  ClipboardCopy,
  Check,
  CircleCheck,
  Loader2,
  Circle,
  CircleX,
  ShieldCheck,
  ClipboardList,
  CalendarClock,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type AgentKey = "pengumpul" | "validator" | "kepatuhan" | "narasi" | "tenggat";
type AgentStatus = "menunggu" | "berjalan" | "selesai" | "gagal";

const AGENT_ORDER: { key: AgentKey; label: string; description: string }[] = [
  {
    key: "pengumpul",
    label: "Agen Pengumpul Data",
    description: "Merangkai dan menstrukturkan data point serta kendala.",
  },
  {
    key: "validator",
    label: "Agen Validator Anti-Halusinasi",
    description: "Menilai data layak pakai; menolak data yang perlu dilengkapi.",
  },
  {
    key: "kepatuhan",
    label: "Agen Pemeriksa Kepatuhan OSS",
    description: "Memeriksa kelengkapan bagian wajib sesuai skala usaha.",
  },
  {
    key: "narasi",
    label: "Agen Penyusun Narasi",
    description: "Menyusun narasi hanya dari data yang lolos validasi.",
  },
  {
    key: "tenggat",
    label: "Agen Pemantau Tenggat & Risiko Sanksi",
    description: "Menilai risiko keterlambatan dan sanksi.",
  },
];

interface ValidationData {
  usableCount: number;
  rejected: { label: string; reason: string }[];
  summary: string;
}
interface ComplianceData {
  status: string;
  missing: { section: string; label: string; note: string }[];
  permits?: {
    type: string;
    label: string;
    status: string;
    statusLabel: string;
    expired: boolean;
    issue: string;
  }[];
  summary: string;
}
interface DeadlineRiskData {
  daysRemaining: number;
  riskLevel: string;
  summary: string;
  recommendations: string[];
}
interface OrchestrationResult {
  activityNarrative: string;
  constraintNarrative: string;
  dataNotes: string;
  compliance: ComplianceData;
  deadlineRisk: DeadlineRiskData;
  validation: ValidationData;
  audit: { agent: string; label: string; contribution: string }[];
  disclaimer: string;
}

type AgentData =
  | { summary: string; inventory: string }
  | ValidationData
  | ComplianceData
  | DeadlineRiskData
  | { activityNarrative: string; constraintNarrative: string };

function StatusIcon({ status }: { status: AgentStatus }) {
  if (status === "berjalan")
    return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  if (status === "selesai")
    return <CircleCheck className="h-4 w-4 text-emerald-600" />;
  if (status === "gagal") return <CircleX className="h-4 w-4 text-destructive" />;
  return <Circle className="h-4 w-4 text-muted-foreground" />;
}

function agentContribution(key: AgentKey, data: AgentData | undefined): string {
  if (!data) return "";
  if (key === "pengumpul" && "inventory" in data) return data.summary;
  if (key === "validator" && "usableCount" in data)
    return `${data.usableCount} data lolos, ${data.rejected.length} perlu dilengkapi.`;
  if (key === "kepatuhan" && "status" in data) return data.summary;
  if (key === "narasi" && "activityNarrative" in data)
    return "Narasi tersusun dari data terverifikasi.";
  if (key === "tenggat" && "riskLevel" in data)
    return `Risiko ${data.riskLevel}.`;
  return "";
}

function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = React.useState(false);
  const onCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="outline" size="sm" onClick={onCopy} disabled={!content}>
      {copied ? (
        <Check className="h-4 w-4" />
      ) : (
        <ClipboardCopy className="h-4 w-4" />
      )}
      Salin
    </Button>
  );
}

function DraftSection({
  title,
  description,
  content,
}: {
  title: string;
  description: string;
  content: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <CopyButton content={content} />
        </div>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {content || "-"}
        </p>
      </CardContent>
    </Card>
  );
}

const RISK_VARIANT: Record<string, string> = {
  rendah: "bg-emerald-100 text-emerald-800",
  sedang: "bg-amber-100 text-amber-800",
  tinggi: "bg-red-100 text-red-800",
};

export default function Asisten() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: reports, isLoading } = useListReports();
  const { data: billing } = useGetBillingSummary();

  const [reportId, setReportId] = React.useState<string>("");
  const [focus, setFocus] = React.useState("");
  const [running, setRunning] = React.useState(false);
  const [outOfCredits, setOutOfCredits] = React.useState(false);
  const [statuses, setStatuses] = React.useState<Record<AgentKey, AgentStatus>>(
    {
      pengumpul: "menunggu",
      validator: "menunggu",
      kepatuhan: "menunggu",
      narasi: "menunggu",
      tenggat: "menunggu",
    },
  );
  const [agentData, setAgentData] = React.useState<
    Partial<Record<AgentKey, AgentData>>
  >({});
  const [result, setResult] = React.useState<OrchestrationResult | null>(null);

  const resetRun = () => {
    setStatuses({
      pengumpul: "menunggu",
      validator: "menunggu",
      kepatuhan: "menunggu",
      narasi: "menunggu",
      tenggat: "menunggu",
    });
    setAgentData({});
    setResult(null);
  };

  const onRun = async () => {
    if (!reportId) {
      toast({ title: "Pilih laporan terlebih dahulu", variant: "destructive" });
      return;
    }
    resetRun();
    setOutOfCredits(false);
    setRunning(true);

    try {
      const res = await fetch(getOrchestrateReportDraftUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: Number(reportId),
          ...(focus.trim() ? { focus: focus.trim() } : {}),
        }),
      });
      if (res.status === 402) {
        setOutOfCredits(true);
        toast({
          title: "Kredit pendampingan habis",
          description:
            "Tingkatkan paket atau beli paket kredit untuk menjalankan asisten.",
          variant: "destructive",
        });
        return;
      }
      if (!res.ok || !res.body) throw new Error("stream error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          let payload: {
            type?: string;
            agent?: AgentKey;
            data?: AgentData;
            result?: OrchestrationResult;
            error?: string;
          };
          try {
            payload = JSON.parse(trimmed.slice(5).trim());
          } catch {
            continue;
          }
          if (payload.type === "agent_start" && payload.agent) {
            setStatuses((p) => ({ ...p, [payload.agent!]: "berjalan" }));
          } else if (payload.type === "agent_done" && payload.agent) {
            setStatuses((p) => ({ ...p, [payload.agent!]: "selesai" }));
            if (payload.data)
              setAgentData((p) => ({ ...p, [payload.agent!]: payload.data }));
          } else if (payload.type === "agent_error" && payload.agent) {
            setStatuses((p) => ({ ...p, [payload.agent!]: "gagal" }));
            toast({
              title: "Keluaran agen tidak valid",
              description:
                payload.error ??
                "Salah satu agen mengembalikan keluaran yang tidak valid; sistem melanjutkan dengan keluaran terbatas.",
              variant: "destructive",
            });
          } else if (payload.type === "final" && payload.result) {
            setResult(payload.result);
          } else if (payload.type === "error") {
            throw new Error(payload.error ?? "error");
          }
        }
      }
    } catch {
      setStatuses((p) => {
        const next = { ...p };
        for (const k of Object.keys(next) as AgentKey[]) {
          if (next[k] === "berjalan") next[k] = "gagal";
        }
        return next;
      });
      toast({
        title: "Gagal menjalankan asisten",
        description:
          "Periksa koneksi atau kuota layanan AI Anda, lalu coba lagi.",
        variant: "destructive",
      });
    } finally {
      setRunning(false);
      // Credit balance changes after a run (consumed, or refunded on failure).
      void queryClient.invalidateQueries({
        queryKey: getGetBillingSummaryQueryKey(),
      });
    }
  };

  const fullDraft = result
    ? `${result.activityNarrative}\n\n${result.constraintNarrative}`
    : "";

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Asisten Penyusun Laporan
        </h1>
        <p className="text-muted-foreground">
          Sistem agentik menyusun draf LKPM melalui lima agen khusus. Penyusun
          narasi hanya memakai data yang lolos validasi anti-halusinasi.
        </p>
      </div>

      {billing && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/40 px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-medium">
              Kredit pendampingan: {billing.credits.available}
            </span>
            <span className="text-muted-foreground">
              (setiap proses memakai 1 kredit)
            </span>
          </div>
          <Link
            href="/langganan"
            className="text-sm font-medium text-primary underline"
          >
            Kelola langganan & kredit
          </Link>
        </div>
      )}

      {outOfCredits && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-base text-destructive">
              Kredit pendampingan habis
            </CardTitle>
            <CardDescription>
              Anda telah menggunakan seluruh kredit pendampingan AI. Fitur
              validasi anti-halusinasi tetap tersedia, namun untuk menjalankan
              asisten otomatis diperlukan kredit.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/langganan">Tingkatkan paket atau beli kredit</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pilih laporan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Laporan</Label>
            <Select value={reportId} onValueChange={setReportId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={isLoading ? "Memuat..." : "Pilih laporan"}
                />
              </SelectTrigger>
              <SelectContent>
                {(reports ?? []).map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.companyName} — {r.periodLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Penekanan (opsional)</Label>
            <Textarea
              placeholder="Mis. tonjolkan realisasi investasi mesin dan penyerapan tenaga kerja"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              rows={2}
            />
          </div>
          <Button onClick={onRun} disabled={running}>
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {running ? "Menjalankan agen..." : "Jalankan Asisten Agentik"}
          </Button>
        </CardContent>
      </Card>

      {(running || result) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Proses Agen</CardTitle>
            <CardDescription>
              Kemajuan tiap agen ditampilkan secara berurutan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {AGENT_ORDER.map((a) => {
              const status = statuses[a.key];
              const contribution = agentContribution(a.key, agentData[a.key]);
              return (
                <div key={a.key} className="flex gap-3">
                  <div className="mt-0.5">
                    <StatusIcon status={status} />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">{a.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {status === "selesai" && contribution
                        ? contribution
                        : a.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Hasil Susunan</h2>
            <CopyButton content={fullDraft} />
          </div>

          <DraftSection
            title="Narasi Kegiatan"
            description="Draf narasi kegiatan penanaman modal untuk periode ini."
            content={result.activityNarrative}
          />
          <DraftSection
            title="Narasi Kendala & Tindak Lanjut"
            description="Draf narasi kendala dan rencana tindak lanjut."
            content={result.constraintNarrative}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Validasi Anti-Halusinasi
              </CardTitle>
              <CardDescription>{result.validation.summary}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">
                {result.validation.usableCount} data lolos validasi dan dipakai
                untuk narasi.
              </p>
              {result.validation.rejected.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Perlu dilengkapi:</p>
                  <ul className="space-y-1">
                    {result.validation.rejected.map((r, i) => (
                      <li key={i} className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {r.label}
                        </span>
                        : {r.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                Kepatuhan OSS
              </CardTitle>
              <CardDescription>{result.compliance.summary}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge
                className={
                  result.compliance.status === "lengkap"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }
              >
                {result.compliance.status === "lengkap"
                  ? "Bagian wajib lengkap"
                  : "Perlu dilengkapi"}
              </Badge>
              {result.compliance.missing.length > 0 && (
                <ul className="space-y-1">
                  {result.compliance.missing.map((m, i) => (
                    <li key={i} className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {m.label}
                      </span>
                      : {m.note}
                    </li>
                  ))}
                </ul>
              )}
              {result.compliance.permits &&
                result.compliance.permits.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      Perizinan dasar OSS
                    </p>
                    <ul className="space-y-1">
                      {result.compliance.permits.map((p, i) => (
                        <li
                          key={i}
                          className="text-sm text-muted-foreground flex items-start gap-1.5"
                        >
                          <AlertTriangle
                            className={
                              p.expired
                                ? "h-3.5 w-3.5 mt-0.5 shrink-0 text-destructive"
                                : "h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600"
                            }
                          />
                          <span>
                            <span className="font-medium text-foreground">
                              {p.label}
                            </span>{" "}
                            ({p.statusLabel}): {p.issue}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary" />
                Tenggat & Risiko Sanksi
              </CardTitle>
              <CardDescription>{result.deadlineRisk.summary}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    RISK_VARIANT[result.deadlineRisk.riskLevel] ??
                    "bg-muted text-foreground"
                  }
                >
                  Risiko {result.deadlineRisk.riskLevel}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {result.deadlineRisk.daysRemaining >= 0
                    ? `H-${result.deadlineRisk.daysRemaining}`
                    : `Lewat ${Math.abs(
                        result.deadlineRisk.daysRemaining,
                      )} hari`}
                </span>
              </div>
              {result.deadlineRisk.recommendations.length > 0 && (
                <ul className="list-disc pl-5 space-y-1">
                  {result.deadlineRisk.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-muted-foreground">
                      {rec}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <DraftSection
            title="Catatan Kualitas Data"
            description="Hal yang perlu diverifikasi atau dilengkapi sebelum laporan disampaikan."
            content={result.dataNotes}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Jejak Audit Agen</CardTitle>
              <CardDescription>
                Kontribusi tiap agen dalam menyusun draf ini.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {result.audit.map((a, i) => (
                <div key={i} className="text-sm">
                  <span className="font-medium">{a.label}:</span>{" "}
                  <span className="text-muted-foreground">{a.contribution}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">{result.disclaimer}</p>
        </div>
      )}
    </div>
  );
}
