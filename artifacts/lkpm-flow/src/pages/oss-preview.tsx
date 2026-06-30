import React from "react";
import { useParams, Link } from "wouter";
import { useGetReport, getGetReportQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import {
  sectionsForScale,
  groupsForSection,
  fieldsForSection,
  findDataPoint,
  computeInvestmentTotals,
  computeLaborTotals,
  formatFieldValue,
  produkGroups,
  produkUnit,
  PRODUKSI_METRICS,
  type Scale,
} from "@/lib/oss-form";
import { scaleLabels, labelOf } from "@/lib/labels";

export default function OssPreview() {
  const { id } = useParams<{ id: string }>();
  const reportId = parseInt(id || "0", 10);

  const { data: detail, isLoading } = useGetReport(reportId, {
    query: { enabled: !!reportId, queryKey: getGetReportQueryKey(reportId) },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!detail) return <div>Laporan tidak ditemukan.</div>;

  const { report, dataPoints, constraints } = detail;
  const scale = report.scale as Scale;
  const sections = sectionsForScale(scale);
  const investasiTotals = computeInvestmentTotals(dataPoints, scale);
  const laborTotals = computeLaborTotals(dataPoints, scale);

  return (
    <div className="max-w-4xl mx-auto space-y-6 print:space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/reports/${reportId}`}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Kembali ke laporan
          </Link>
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-1" /> Cetak / Simpan PDF
        </Button>
      </div>

      <div className="border rounded-md bg-card p-6 print:border-0 print:p-0 space-y-6">
        <div className="text-center border-b pb-4">
          <h1 className="text-xl font-bold">
            Laporan Kegiatan Penanaman Modal (LKPM)
          </h1>
          <p className="text-sm text-muted-foreground">
            Pratinjau formulir untuk disalin ke OSS
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div className="flex justify-between border-b border-dashed py-1">
            <span className="text-muted-foreground">Perusahaan</span>
            <span className="font-medium">{report.companyName}</span>
          </div>
          <div className="flex justify-between border-b border-dashed py-1">
            <span className="text-muted-foreground">NIB / Id Izin</span>
            <span className="font-medium font-mono">{report.idIzin}</span>
          </div>
          <div className="flex justify-between border-b border-dashed py-1">
            <span className="text-muted-foreground">Periode</span>
            <span className="font-medium">{report.periodLabel}</span>
          </div>
          <div className="flex justify-between border-b border-dashed py-1">
            <span className="text-muted-foreground">Skala Usaha</span>
            <span className="font-medium">{labelOf(scaleLabels, report.scale)}</span>
          </div>
        </div>

        {sections.map((section) => {
          if (section.id === "produksi") {
            const groups = produkGroups(dataPoints);
            return (
              <div key={section.id} className="space-y-2">
                <h2 className="font-bold text-sm border-b pb-1">
                  {section.no}. {section.title}
                </h2>
                {groups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Belum ada jenis produk/jasa.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <tbody>
                      {groups.map((group) => {
                        const unit = produkUnit(group);
                        return (
                          <React.Fragment key={group.name}>
                            <tr>
                              <td
                                colSpan={2}
                                className="pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                              >
                                {group.name}
                                {unit ? ` (${unit})` : ""}
                              </td>
                            </tr>
                            {PRODUKSI_METRICS.map((metric) => {
                              const dp = group.metrics[metric.key];
                              const u =
                                metric.key === "Nilai Ekspor" ? "USD" : unit;
                              return (
                                <tr
                                  key={metric.key}
                                  className="border-b border-dashed"
                                >
                                  <td className="py-1.5 pr-4">{metric.label}</td>
                                  <td className="py-1.5 text-right font-mono whitespace-nowrap">
                                    {formatFieldValue(dp?.value, u)}
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            );
          }
          return (
          <div key={section.id} className="space-y-2">
            <h2 className="font-bold text-sm border-b pb-1">
              {section.no}. {section.title}
            </h2>
            <table className="w-full text-sm">
              <tbody>
                {groupsForSection(section.id, scale).map((group) => {
                  const fields = fieldsForSection(section.id, scale).filter(
                    (f) => f.group === group,
                  );
                  return (
                    <React.Fragment key={group}>
                      {groupsForSection(section.id, scale).length > 1 && (
                        <tr>
                          <td
                            colSpan={2}
                            className="pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                          >
                            {group}
                          </td>
                        </tr>
                      )}
                      {fields.map((field) => {
                        const dp = findDataPoint(dataPoints, field);
                        return (
                          <tr key={field.key} className="border-b border-dashed">
                            <td className="py-1.5 pr-4">{field.label}</td>
                            <td className="py-1.5 text-right font-mono whitespace-nowrap">
                              {formatFieldValue(dp?.value, field.unit)}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
                {section.id === "investasi" && (
                  <>
                    <tr className="border-b">
                      <td className="py-1.5 pr-4 font-semibold">Sub-jumlah Modal Tetap</td>
                      <td className="py-1.5 text-right font-mono font-semibold">
                        {formatFieldValue(investasiTotals.modalTetap, "IDR")}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-1.5 pr-4 font-semibold">Sub-jumlah Modal Kerja</td>
                      <td className="py-1.5 text-right font-mono font-semibold">
                        {formatFieldValue(investasiTotals.modalKerja, "IDR")}
                      </td>
                    </tr>
                    <tr className="border-b-2 border-foreground/40">
                      <td className="py-1.5 pr-4 font-bold">Jumlah Realisasi Investasi</td>
                      <td className="py-1.5 text-right font-mono font-bold">
                        {formatFieldValue(investasiTotals.jumlah, "IDR")}
                      </td>
                    </tr>
                  </>
                )}
                {section.id === "tenaga_kerja" && (
                  <>
                    <tr className="border-b">
                      <td className="py-1.5 pr-4 font-semibold">Total Tenaga Kerja Indonesia</td>
                      <td className="py-1.5 text-right font-mono font-semibold">
                        {formatFieldValue(laborTotals.tki, "orang")}
                      </td>
                    </tr>
                    <tr className="border-b-2 border-foreground/40">
                      <td className="py-1.5 pr-4 font-bold">Total Tenaga Kerja</td>
                      <td className="py-1.5 text-right font-mono font-bold">
                        {formatFieldValue(laborTotals.total, "orang")}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
          );
        })}

        <div className="space-y-2">
          <h2 className="font-bold text-sm border-b pb-1">
            {sections.length + 1}. Permasalahan yang Dihadapi
          </h2>
          {constraints.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tidak ada permasalahan.</p>
          ) : (
            <ol className="list-decimal list-inside space-y-1 text-sm">
              {constraints.map((c) => (
                <li key={c.id}>
                  {c.issue}
                  {c.followUp && (
                    <span className="text-muted-foreground"> — Tindak lanjut: {c.followUp}</span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>

        {report.narrative && (
          <div className="space-y-2">
            <h2 className="font-bold text-sm border-b pb-1">Catatan</h2>
            <p className="text-sm whitespace-pre-line">{report.narrative}</p>
          </div>
        )}
      </div>
    </div>
  );
}
