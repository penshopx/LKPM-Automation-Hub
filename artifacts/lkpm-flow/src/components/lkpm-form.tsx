import React from "react";
import {
  useDeleteDataPoint,
  getGetReportQueryKey,
  type DataPoint,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Plus, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DataPointDialog } from "@/components/datapoint-dialog";
import { ProduksiSection } from "@/components/produksi-section";
import {
  sectionsForScale,
  groupsForSection,
  fieldsForSection,
  findDataPoint,
  additionalDataPoints,
  computeInvestmentTotals,
  computeLaborTotals,
  formatFieldValue,
  categoryLabels,
  dataStatusLabels,
  READINESS_CONFIDENCE_THRESHOLD,
  type Scale,
  type OssField,
} from "@/lib/oss-form";

interface LkpmFormProps {
  reportId: number;
  scale: Scale;
  dataPoints: DataPoint[];
}

function StatusCell({ dp }: { dp?: DataPoint }) {
  if (!dp || dp.value == null) {
    return <span className="text-xs text-muted-foreground">Belum diisi</span>;
  }
  const low = dp.confidence < READINESS_CONFIDENCE_THRESHOLD;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs flex items-center gap-1">
        {dp.status === "estimasi" && (
          <AlertTriangle className="h-3 w-3 text-amber-500" />
        )}
        {dp.status === "terverifikasi" && (
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
        )}
        {dataStatusLabels[dp.status] ?? dp.status}
      </span>
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full ${low ? "bg-destructive" : "bg-emerald-500"}`}
            style={{ width: `${dp.confidence}%` }}
          />
        </div>
        <span
          className={`text-[10px] font-mono ${low ? "text-destructive font-bold" : "text-muted-foreground"}`}
        >
          {dp.confidence}%
        </span>
      </div>
    </div>
  );
}

function SourceCell({ dp }: { dp?: DataPoint }) {
  if (!dp || dp.value == null) return <span className="text-muted-foreground text-xs">-</span>;
  return dp.source ? (
    <span className="text-sm font-mono text-muted-foreground">{dp.source}</span>
  ) : (
    <Badge variant="destructive" className="text-[10px]">
      Tanpa sumber
    </Badge>
  );
}

export function LkpmForm({ reportId, scale, dataPoints }: LkpmFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deleteDataPoint = useDeleteDataPoint();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [activeField, setActiveField] = React.useState<OssField | undefined>();
  const [activeDp, setActiveDp] = React.useState<DataPoint | undefined>();

  const sections = sectionsForScale(scale);
  const extras = additionalDataPoints(dataPoints, scale);
  const investasiTotals = computeInvestmentTotals(dataPoints, scale);
  const laborTotals = computeLaborTotals(dataPoints, scale);

  const openField = (field: OssField, dp?: DataPoint) => {
    setActiveField(field);
    setActiveDp(dp);
    setDialogOpen(true);
  };

  const openCustom = (dp?: DataPoint) => {
    setActiveField(undefined);
    setActiveDp(dp);
    setDialogOpen(true);
  };

  const handleDelete = (dp: DataPoint) => {
    deleteDataPoint.mutate(
      { id: dp.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetReportQueryKey(reportId) });
          toast({ title: "Titik data dihapus" });
        },
        onError: () => toast({ title: "Gagal menghapus data", variant: "destructive" }),
      },
    );
  };

  const fieldRow = (field: OssField) => {
    const dp = findDataPoint(dataPoints, field);
    const filled = dp && dp.value != null;
    return (
      <div
        key={field.key}
        className={`grid grid-cols-12 gap-3 items-center px-4 py-3 border-t first:border-t-0 ${
          filled && (!dp?.source || dp.confidence < READINESS_CONFIDENCE_THRESHOLD)
            ? "bg-red-50/30 dark:bg-red-950/10"
            : ""
        }`}
      >
        <div className="col-span-12 md:col-span-4">
          <p className="text-sm font-medium flex items-center gap-1.5">
            {field.label}
            {field.optional && (
              <span className="text-[10px] text-muted-foreground font-normal">(opsional)</span>
            )}
          </p>
          {field.hint && (
            <p className="text-xs text-muted-foreground mt-0.5">{field.hint}</p>
          )}
        </div>
        <div className="col-span-4 md:col-span-2 text-sm font-mono">
          {formatFieldValue(dp?.value, field.unit)}
        </div>
        <div className="col-span-8 md:col-span-3">
          <SourceCell dp={dp} />
        </div>
        <div className="col-span-8 md:col-span-2">
          <StatusCell dp={dp} />
        </div>
        <div className="col-span-4 md:col-span-1 flex justify-end print:hidden">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openField(field, dp)}>
            {filled ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    );
  };

  const totalRow = (label: string, value: string) => (
    <div className="grid grid-cols-12 gap-3 items-center px-4 py-2.5 border-t bg-muted/40">
      <div className="col-span-8 md:col-span-4 text-sm font-semibold">{label}</div>
      <div className="col-span-4 md:col-span-2 text-sm font-mono font-semibold">{value}</div>
      <div className="hidden md:block md:col-span-6" />
    </div>
  );

  return (
    <div className="space-y-6">
      {sections.map((section) => {
        if (section.id === "produksi") {
          return (
            <ProduksiSection
              key={section.id}
              reportId={reportId}
              dataPoints={dataPoints}
              section={section}
              scale={scale}
            />
          );
        }
        const groups = groupsForSection(section.id, scale);
        return (
          <Card key={section.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {section.no}
                </span>
                {section.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{section.description}</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 bg-muted/50 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <div className="col-span-4">Komponen</div>
                <div className="col-span-2">Nilai</div>
                <div className="col-span-3">Sumber</div>
                <div className="col-span-2">Status & Keyakinan</div>
                <div className="col-span-1" />
              </div>

              {groups.map((group) => {
                const fields = fieldsForSection(section.id, scale).filter(
                  (f) => f.group === group,
                );
                return (
                  <div key={group}>
                    {groups.length > 1 && (
                      <div className="px-4 py-1.5 bg-muted/20 text-xs font-semibold text-muted-foreground border-t">
                        {group}
                      </div>
                    )}
                    {fields.map(fieldRow)}
                  </div>
                );
              })}

              {section.id === "investasi" && (
                <>
                  {totalRow(
                    "Sub-jumlah Modal Tetap",
                    formatFieldValue(investasiTotals.modalTetap, "IDR"),
                  )}
                  {totalRow(
                    "Sub-jumlah Modal Kerja",
                    formatFieldValue(investasiTotals.modalKerja, "IDR"),
                  )}
                  {totalRow(
                    "Jumlah Realisasi Investasi",
                    formatFieldValue(investasiTotals.jumlah, "IDR"),
                  )}
                </>
              )}
              {section.id === "tenaga_kerja" && (
                <>
                  {totalRow(
                    "Total Tenaga Kerja Indonesia",
                    formatFieldValue(laborTotals.tki, "orang"),
                  )}
                  {totalRow(
                    "Total Tenaga Kerja",
                    formatFieldValue(laborTotals.total, "orang"),
                  )}
                </>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base font-bold">Data Tambahan</CardTitle>
            <p className="text-sm text-muted-foreground">
              Titik data di luar formulir standar untuk skala ini.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => openCustom()} className="print:hidden">
            <Plus className="h-4 w-4 mr-1" /> Tambah
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {extras.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">
              Tidak ada data tambahan.
            </p>
          ) : (
            <div>
              {extras.map((dp) => (
                <div
                  key={dp.id}
                  className="grid grid-cols-12 gap-3 items-center px-4 py-3 border-t"
                >
                  <div className="col-span-12 md:col-span-4">
                    <p className="text-sm font-medium">{dp.label}</p>
                    <Badge variant="secondary" className="text-[10px] mt-1 font-normal">
                      {categoryLabels[dp.category] ?? dp.category}
                    </Badge>
                  </div>
                  <div className="col-span-4 md:col-span-2 text-sm font-mono">
                    {formatFieldValue(dp.value, dp.unit)}
                  </div>
                  <div className="col-span-8 md:col-span-3">
                    <SourceCell dp={dp} />
                  </div>
                  <div className="col-span-8 md:col-span-2">
                    <StatusCell dp={dp} />
                  </div>
                  <div className="col-span-4 md:col-span-1 flex justify-end gap-1 print:hidden">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openCustom(dp)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(dp)}
                      disabled={deleteDataPoint.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <DataPointDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        reportId={reportId}
        field={activeField}
        dataPoint={activeDp}
        scale={scale}
        dataPoints={dataPoints}
      />
    </div>
  );
}
