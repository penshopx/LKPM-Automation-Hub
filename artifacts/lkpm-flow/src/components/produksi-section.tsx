import React from "react";
import {
  useCreateDataPoint,
  useDeleteDataPoint,
  getGetReportQueryKey,
  type DataPoint,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Pencil, Plus, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DataPointDialog } from "@/components/datapoint-dialog";
import {
  produkGroups,
  produkUnit,
  encodeProdukLabel,
  PRODUKSI_METRICS,
  formatFieldValue,
  dataStatusLabels,
  READINESS_CONFIDENCE_THRESHOLD,
  type OssField,
  type OssSection,
  type ProduksiMetric,
  type Scale,
} from "@/lib/oss-form";

interface ProduksiSectionProps {
  reportId: number;
  dataPoints: DataPoint[];
  section: OssSection;
  scale: Scale;
}

function MetricStatus({ dp }: { dp?: DataPoint }) {
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

function MetricSource({ dp }: { dp?: DataPoint }) {
  if (!dp || dp.value == null)
    return <span className="text-muted-foreground text-xs">-</span>;
  return dp.source ? (
    <span className="text-sm font-mono text-muted-foreground">{dp.source}</span>
  ) : (
    <Badge variant="destructive" className="text-[10px]">
      Tanpa sumber
    </Badge>
  );
}

function metricField(
  name: string,
  metric: ProduksiMetric,
  unit: string,
): OssField {
  return {
    key: `prod_${name}_${metric.key}`,
    category: "produksi",
    label: encodeProdukLabel(name, metric.key),
    displayLabel: `${metric.label} — ${name}`,
    unit: metric.key === "Nilai Ekspor" ? "USD" : unit,
    group: "Produksi",
    scales: [],
    optional: metric.optional,
    hint: metric.hint,
  };
}

export function ProduksiSection({
  reportId,
  dataPoints,
  section,
  scale,
}: ProduksiSectionProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createDataPoint = useCreateDataPoint();
  const deleteDataPoint = useDeleteDataPoint();

  const groups = produkGroups(dataPoints);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [activeField, setActiveField] = React.useState<OssField | undefined>();
  const [activeDp, setActiveDp] = React.useState<DataPoint | undefined>();

  const [addOpen, setAddOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newUnit, setNewUnit] = React.useState("");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getGetReportQueryKey(reportId) });

  const openMetric = (name: string, metric: ProduksiMetric, dp?: DataPoint) => {
    const unit = produkUnit({ name, metrics: {} }) || "";
    const group = groups.find((g) => g.name === name);
    setActiveField(metricField(name, metric, group ? produkUnit(group) : unit));
    setActiveDp(dp);
    setDialogOpen(true);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) {
      toast({ title: "Nama jenis produk/jasa wajib diisi", variant: "destructive" });
      return;
    }
    if (name.includes(":")) {
      toast({ title: "Nama tidak boleh mengandung tanda ':'", variant: "destructive" });
      return;
    }
    if (groups.some((g) => g.name === name)) {
      toast({ title: "Jenis produk/jasa sudah ada", variant: "destructive" });
      return;
    }
    const unit = newUnit.trim();
    try {
      for (const metric of PRODUKSI_METRICS) {
        await createDataPoint.mutateAsync({
          reportId,
          data: {
            category: "produksi",
            label: encodeProdukLabel(name, metric.key),
            unit: metric.key === "Nilai Ekspor" ? "USD" : unit || undefined,
            status: "perlu_verifikasi",
            confidence: 0,
          },
        });
      }
      invalidate();
      toast({ title: "Jenis produk/jasa ditambahkan" });
      setAddOpen(false);
      setNewName("");
      setNewUnit("");
    } catch {
      toast({ title: "Gagal menambah jenis produk/jasa", variant: "destructive" });
    }
  };

  const handleDeleteProduct = async (name: string) => {
    const group = groups.find((g) => g.name === name);
    if (!group) return;
    try {
      for (const dp of Object.values(group.metrics)) {
        if (dp) await deleteDataPoint.mutateAsync({ id: dp.id });
      }
      invalidate();
      toast({ title: "Jenis produk/jasa dihapus" });
    } catch {
      toast({ title: "Gagal menghapus jenis produk/jasa", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
              {section.no}
            </span>
            {section.title}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1.5">
            {section.description}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddOpen(true)}
          className="print:hidden shrink-0"
        >
          <Plus className="h-4 w-4 mr-1" /> Jenis Produk/Jasa
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {groups.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground text-center">
            Belum ada jenis produk/jasa. Tambahkan minimal satu untuk skala ini.
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.name} className="border-t">
              <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
                <div className="text-sm font-semibold">
                  {group.name}
                  {produkUnit(group) && (
                    <span className="text-xs font-normal text-muted-foreground ml-2">
                      Satuan: {produkUnit(group)}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive print:hidden"
                  onClick={() => handleDeleteProduct(group.name)}
                  disabled={deleteDataPoint.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              {PRODUKSI_METRICS.map((metric) => {
                const dp = group.metrics[metric.key];
                const filled = dp && dp.value != null;
                const unit =
                  metric.key === "Nilai Ekspor" ? "USD" : produkUnit(group);
                return (
                  <div
                    key={metric.key}
                    className={`grid grid-cols-12 gap-3 items-center px-4 py-3 border-t ${
                      filled &&
                      (!dp?.source ||
                        dp.confidence < READINESS_CONFIDENCE_THRESHOLD)
                        ? "bg-red-50/30 dark:bg-red-950/10"
                        : ""
                    }`}
                  >
                    <div className="col-span-12 md:col-span-4">
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        {metric.label}
                        {metric.optional && (
                          <span className="text-[10px] text-muted-foreground font-normal">
                            (opsional)
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="col-span-4 md:col-span-2 text-sm font-mono">
                      {formatFieldValue(dp?.value, unit)}
                    </div>
                    <div className="col-span-8 md:col-span-3">
                      <MetricSource dp={dp} />
                    </div>
                    <div className="col-span-8 md:col-span-2">
                      <MetricStatus dp={dp} />
                    </div>
                    <div className="col-span-4 md:col-span-1 flex justify-end print:hidden">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openMetric(group.name, metric, dp)}
                      >
                        {filled ? (
                          <Pencil className="h-3.5 w-3.5" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </CardContent>

      <DataPointDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        reportId={reportId}
        field={activeField}
        dataPoint={activeDp}
        scale={scale}
        dataPoints={dataPoints}
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleAddProduct}>
            <DialogHeader>
              <DialogTitle>Tambah Jenis Produk/Jasa</DialogTitle>
              <DialogDescription>
                Tentukan nama dan satuan; kapasitas, realisasi, dan nilai ekspor
                diisi setelahnya.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="prod-name">Nama jenis produk/jasa</Label>
                <Input
                  id="prod-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="mis. Tepung Ikan"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prod-unit">Satuan (kapasitas & realisasi)</Label>
                <Input
                  id="prod-unit"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  placeholder="mis. ton/tahun, unit/tahun"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
                disabled={createDataPoint.isPending}
              >
                Batal
              </Button>
              <Button type="submit" disabled={createDataPoint.isPending}>
                {createDataPoint.isPending ? "Menyimpan..." : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
