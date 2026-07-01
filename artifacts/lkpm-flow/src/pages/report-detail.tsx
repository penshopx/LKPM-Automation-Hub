import React from "react";
import { useParams, Link } from "wouter";
import { 
  useGetReport, getGetReportQueryKey,
  useUpdateReport,
  useCreateActivity,
  ReportStatus
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, ShieldAlert, FileText, CheckCircle2, Clock, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { scaleLabels, operatingModeLabels, statusLabels, labelOf } from "@/lib/labels";
import { LkpmForm } from "@/components/lkpm-form";
import { ReadinessPanel } from "@/components/readiness-panel";
import { ConstraintsSection } from "@/components/constraints-section";
import { AttachmentsSection } from "@/components/attachments-section";
import { ApprovalSection } from "@/components/approval-section";
import type { Scale } from "@/lib/oss-form";

const STAGES = Object.values(ReportStatus);

export default function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const reportId = parseInt(id || "0", 10);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: detail, isLoading } = useGetReport(reportId, {
    query: { enabled: !!reportId, queryKey: getGetReportQueryKey(reportId) }
  });

  const updateReport = useUpdateReport();
  const createActivity = useCreateActivity();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!detail) {
    return <div>Laporan tidak ditemukan.</div>;
  }

  const { report, dataPoints, constraints, activities } = detail;
  const scale = report.scale as Scale;
  const currentStageIndex = STAGES.indexOf(report.status);

  const handleAdvanceStage = () => {
    if (currentStageIndex < STAGES.length - 1) {
      const nextStage = STAGES[currentStageIndex + 1];
      updateReport.mutate({ id: reportId, data: { status: nextStage } }, {
        onSuccess: () => {
          createActivity.mutate({ reportId, data: { action: `Status diubah ke ${nextStage}`, actor: "Sistem", detail: "Perubahan manual" } }, {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: getGetReportQueryKey(reportId) });
              toast({ title: "Status diperbarui", description: `Laporan maju ke tahap ${nextStage}.` });
            }
          });
        }
      });
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/companies" className="hover:text-foreground hover:underline">Perusahaan</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={`/companies/${report.companyId}`} className="hover:text-foreground hover:underline">{report.companyName}</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={`/izin/${report.izinId}`} className="hover:text-foreground hover:underline">{report.projectName || report.idIzin}</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">{report.periodLabel}</span>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">{report.companyName} - {report.periodLabel}</h1>
            <div className="flex items-center gap-3 mt-2 text-sm">
              <span className="text-muted-foreground flex items-center gap-1"><FileText className="h-4 w-4"/> Id Izin: {report.idIzin}</span>
              <Badge variant="outline">{labelOf(scaleLabels, report.scale)}</Badge>
              <Badge variant="outline">Mode: {labelOf(operatingModeLabels, report.operatingMode)}</Badge>
              <Badge variant="secondary" className="font-mono">DL: {new Date(report.deadline).toLocaleDateString("id-ID")}</Badge>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/reports/${reportId}/oss-preview`}>
                <ClipboardCheck className="h-4 w-4 mr-1" /> Pratinjau Formulir OSS
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <Card className="bg-slate-50 border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-500">Pipeline Laporan</h3>
            <Button size="sm" onClick={handleAdvanceStage} disabled={currentStageIndex >= STAGES.length - 1 || updateReport.isPending}>
              Maju ke Tahap Selanjutnya
            </Button>
          </div>
          <div className="flex items-center w-full">
            {STAGES.map((stage, idx) => {
              const isPast = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              return (
                <div key={stage} className="flex-1 flex items-center group relative">
                  <div className={`flex flex-col items-center gap-2 relative z-10 w-full`}>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-colors
                      ${isPast ? "bg-primary border-primary text-primary-foreground" : 
                        isCurrent ? "bg-background border-primary text-primary" : "bg-muted border-muted-foreground/30 text-muted-foreground"}
                    `}>
                      {isPast ? <CheckCircle2 className="h-5 w-5" /> : <span className="text-xs font-bold">{idx + 1}</span>}
                    </div>
                    <span className={`text-xs font-medium ${isCurrent ? "text-primary" : "text-muted-foreground"}`}>{labelOf(statusLabels, stage)}</span>
                  </div>
                  {idx < STAGES.length - 1 && (
                    <div className={`absolute top-4 left-1/2 w-full h-[2px] -translate-y-1/2 -z-10
                      ${isPast ? "bg-primary" : "bg-muted-foreground/20"}
                    `} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <ApprovalSection
        reportId={reportId}
        companyId={report.companyId}
        approvalStatus={report.approvalStatus}
        makerId={report.makerId}
        checkerId={report.checkerId}
        approverId={report.approverId}
        makerName={report.makerName}
        checkerName={report.checkerName}
        approverName={report.approverName}
      />

      <div className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          Pemeriksaan Kesiapan OSS
        </h2>
        <ReadinessPanel dataPoints={dataPoints} scale={scale} />
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Simulator Formulir LKPM
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Isi data sesuai struktur formulir OSS untuk skala {labelOf(scaleLabels, report.scale)}. Setiap nilai wajib mencantumkan sumber.
          </p>
        </div>
        <LkpmForm reportId={reportId} scale={scale} dataPoints={dataPoints} />
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <ConstraintsSection reportId={reportId} constraints={constraints} />

        <div>
          <h2 className="text-lg font-bold tracking-tight mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" /> Jejak Audit
          </h2>
          <div className="border rounded-md bg-card p-4 space-y-4">
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada aktivitas terekam.</p>
            ) : (
              <div className="space-y-4">
                {activities.map((act, i) => (
                  <div key={act.id} className="flex gap-4 relative">
                    {i !== activities.length - 1 && <div className="absolute left-1.5 top-6 bottom-0 w-[2px] bg-border -z-10" />}
                    <div className="w-3 h-3 rounded-full bg-primary mt-1.5 ring-4 ring-background z-10 shrink-0" />
                    <div className="flex-1 pb-4">
                      <p className="text-sm font-medium">{act.action}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground/80">{act.actor}</span>
                        <span>•</span>
                        <span>{new Date(act.createdAt).toLocaleString('id-ID')}</span>
                      </div>
                      {act.detail && <p className="text-sm text-muted-foreground mt-1">{act.detail}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AttachmentsSection parent={{ kind: "report", id: reportId }} />
    </div>
  );
}
