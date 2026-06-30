import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import {
  computeReadiness,
  categoryLabels,
  READINESS_CONFIDENCE_THRESHOLD,
  type Scale,
} from "@/lib/oss-form";
import type { DataPoint } from "@workspace/api-client-react";

interface ReadinessPanelProps {
  dataPoints: DataPoint[];
  scale: Scale;
}

export function ReadinessPanel({ dataPoints, scale }: ReadinessPanelProps) {
  const readiness = computeReadiness(dataPoints, scale);
  const pct =
    readiness.total === 0
      ? 0
      : Math.round((readiness.okCount / readiness.total) * 100);

  return (
    <Card
      className={
        readiness.ready
          ? "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/10 dark:border-emerald-900"
          : "border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-900"
      }
    >
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {readiness.ready ? (
              <ShieldCheck className="h-8 w-8 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-amber-600 shrink-0" />
            )}
            <div>
              <h3 className="font-bold text-base">
                {readiness.ready
                  ? "Siap disalin ke OSS"
                  : "Belum siap disalin ke OSS"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {readiness.okCount} dari {readiness.total} isian wajib sudah lengkap,
                bersumber, terverifikasi, dan keyakinan ≥ {READINESS_CONFIDENCE_THRESHOLD}%.
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={
              readiness.ready
                ? "border-emerald-300 text-emerald-700 bg-white"
                : "border-amber-300 text-amber-700 bg-white"
            }
          >
            {pct}%
          </Badge>
        </div>

        <Progress value={pct} className="h-2" />

        {readiness.blocking.length > 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Perlu dilengkapi
            </p>
            <ul className="space-y-2">
              {readiness.blocking.map((item) => {
                const issues: string[] = [];
                if (item.missing) issues.push("nilai belum diisi");
                if (item.noSource) issues.push("tanpa sumber");
                if (item.unverified) issues.push("belum terverifikasi");
                if (item.lowConfidence)
                  issues.push(`keyakinan < ${READINESS_CONFIDENCE_THRESHOLD}%`);
                return (
                  <li
                    key={item.field.key}
                    className="flex items-start gap-2 text-sm"
                  >
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <span>
                      <span className="font-medium">{item.field.label}</span>{" "}
                      <span className="text-muted-foreground text-xs">
                        ({categoryLabels[item.field.category]})
                      </span>
                      <span className="text-muted-foreground"> — {issues.join(", ")}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {readiness.ready && (
          <p className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Semua isian wajib telah memenuhi kontrol anti-halusinasi.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
