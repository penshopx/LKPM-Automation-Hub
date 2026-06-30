import React from "react";
import {
  useCreateDataPoint,
  useUpdateDataPoint,
  getGetReportQueryKey,
  type DataPoint,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  categoryLabels,
  dataStatusLabels,
  findOfficialFieldMatch,
  findProduksiSlotMatch,
  type OssField,
  type Scale,
} from "@/lib/oss-form";
import { AlertTriangle } from "lucide-react";

type Mode = "field" | "custom";

interface DataPointDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: number;
  /** When provided, label/category/unit are locked to the catalog field. */
  field?: OssField;
  /** Existing data point to edit (catalog or custom). */
  dataPoint?: DataPoint;
  /**
   * Report's business scale. When set, custom entries that collide with an
   * official OSS catalog field for this scale trigger an inline warning.
   */
  scale?: Scale;
  /**
   * Existing report data points. Used to detect custom produksi entries that
   * collide with an already-encoded product/metric slot (which the static OSS
   * catalog cannot represent) so we can warn before creating a duplicate.
   */
  dataPoints?: DataPoint[];
}

const STATUS_OPTIONS = ["terverifikasi", "perlu_verifikasi", "estimasi"] as const;
const CATEGORY_OPTIONS = ["investasi", "tenaga_kerja", "produksi", "kewajiban"] as const;

export function DataPointDialog({
  open,
  onOpenChange,
  reportId,
  field,
  dataPoint,
  scale,
  dataPoints,
}: DataPointDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createDataPoint = useCreateDataPoint();
  const updateDataPoint = useUpdateDataPoint();

  const [label, setLabel] = React.useState("");
  const [category, setCategory] = React.useState<string>("investasi");
  const [unit, setUnit] = React.useState<string>("");
  const [value, setValue] = React.useState<string>("");
  const [source, setSource] = React.useState<string>("");
  const [status, setStatus] = React.useState<string>("perlu_verifikasi");
  const [confidence, setConfidence] = React.useState<string>("0");
  // Official field the user accepted from the duplicate warning (custom mode).
  const [acceptedField, setAcceptedField] = React.useState<OssField | undefined>();

  const activeField = field ?? acceptedField;
  const mode: Mode = activeField ? "field" : "custom";

  React.useEffect(() => {
    if (!open) return;
    setAcceptedField(undefined);
    setLabel(dataPoint?.label ?? field?.label ?? "");
    setCategory(dataPoint?.category ?? field?.category ?? "investasi");
    setUnit(dataPoint?.unit ?? field?.unit ?? "");
    setValue(dataPoint?.value != null ? String(dataPoint.value) : "");
    setSource(dataPoint?.source ?? "");
    setStatus(dataPoint?.status ?? "perlu_verifikasi");
    setConfidence(String(dataPoint?.confidence ?? 0));
  }, [open, dataPoint, field]);

  // Detect a custom entry that collides with an official OSS catalog field for
  // the report's scale, so we can warn before the user creates a duplicate.
  const duplicateField =
    mode === "custom" && scale
      ? findOfficialFieldMatch(category, label, scale)
      : undefined;

  // Produksi rows live outside the static catalog (encoded `nama :: metrik`
  // labels), so warn separately when a custom entry collides with an existing
  // product/metric slot. Only checked when there's no catalog match already.
  const duplicateProduksi =
    mode === "custom" && !duplicateField && dataPoints
      ? findProduksiSlotMatch(category, label, dataPoints, dataPoint?.id)
      : undefined;

  const acceptOfficialField = () => {
    if (!duplicateField) return;
    setAcceptedField(duplicateField);
    setLabel(duplicateField.label);
    setCategory(duplicateField.category);
    setUnit(duplicateField.unit);
  };

  const isPending = createDataPoint.isPending || updateDataPoint.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      toast({ title: "Label wajib diisi", variant: "destructive" });
      return;
    }
    const parsedValue = value.trim() === "" ? undefined : Number(value);
    if (parsedValue !== undefined && Number.isNaN(parsedValue)) {
      toast({ title: "Nilai harus berupa angka", variant: "destructive" });
      return;
    }
    let conf = parseInt(confidence || "0", 10);
    if (Number.isNaN(conf)) conf = 0;
    conf = Math.max(0, Math.min(100, conf));

    const data = {
      category: category as DataPoint["category"],
      label: label.trim(),
      // Bind catalog fields by their stable key so later label edits never
      // break the OSS mapping. Dynamic produksi rows match by encoded label.
      ...(field && field.category !== "produksi"
        ? { fieldKey: field.key }
        : {}),
      value: parsedValue,
      unit: unit.trim() || undefined,
      source: source.trim() || undefined,
      status: status as DataPoint["status"],
      confidence: conf,
    };

    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: getGetReportQueryKey(reportId) });
      toast({ title: dataPoint ? "Data diperbarui" : "Data ditambahkan" });
      onOpenChange(false);
    };
    const onError = () => {
      toast({ title: "Gagal menyimpan data", variant: "destructive" });
    };

    if (dataPoint) {
      updateDataPoint.mutate({ id: dataPoint.id, data }, { onSuccess, onError });
    } else {
      createDataPoint.mutate({ reportId, data }, { onSuccess, onError });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {dataPoint ? "Ubah Titik Data" : "Isi Titik Data"}
            </DialogTitle>
            <DialogDescription>
              {mode === "field" && activeField?.hint
                ? activeField.hint
                : "Setiap nilai wajib mencantumkan sumber (anti-halusinasi)."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {mode === "custom" ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="dp-label">Label</Label>
                  <Input
                    id="dp-label"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="mis. Realisasi modal tetap"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dp-category">Kategori</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="dp-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {categoryLabels[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dp-unit">Satuan</Label>
                  <Input
                    id="dp-unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="IDR / orang / USD"
                  />
                </div>
                {duplicateField && (
                  <div className="col-span-2 flex gap-2.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm dark:border-amber-900 dark:bg-amber-950/40">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" />
                    <div className="space-y-2">
                      <p className="text-amber-800 dark:text-amber-200">
                        Sudah ada field resmi OSS untuk nilai ini:{" "}
                        <span className="font-medium">
                          {duplicateField.displayLabel ?? duplicateField.label}
                        </span>{" "}
                        ({categoryLabels[duplicateField.category]}). Menyimpan
                        sebagai data tambahan berisiko menyebabkan perhitungan
                        ganda dan laporan yang tidak rapi.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 border-amber-400 bg-white text-amber-800 hover:bg-amber-100 dark:bg-transparent dark:text-amber-200"
                        onClick={acceptOfficialField}
                      >
                        Isi field resmi saja
                      </Button>
                    </div>
                  </div>
                )}
                {duplicateProduksi && (
                  <div className="col-span-2 flex gap-2.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm dark:border-amber-900 dark:bg-amber-950/40">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" />
                    <div className="space-y-2">
                      <p className="text-amber-800 dark:text-amber-200">
                        Sudah ada slot produksi untuk nilai ini:{" "}
                        <span className="font-medium">
                          {duplicateProduksi.displayLabel}
                        </span>{" "}
                        (Produksi). Isi melalui bagian Produksi agar tidak
                        terjadi perhitungan ganda dan laporan yang tidak rapi.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <p className="font-medium">
                  {activeField?.displayLabel ?? activeField?.label}
                </p>
                <p className="text-muted-foreground text-xs">
                  {categoryLabels[activeField?.category ?? ""]}
                  {activeField?.unit ? ` · Satuan: ${activeField.unit}` : ""}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dp-value">
                  Nilai{mode === "field" ? ` (${activeField?.unit})` : ""}
                </Label>
                <Input
                  id="dp-value"
                  inputMode="decimal"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dp-confidence">Keyakinan (0-100)</Label>
                <Input
                  id="dp-confidence"
                  inputMode="numeric"
                  value={confidence}
                  onChange={(e) => setConfidence(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dp-source">Sumber (Anti-Halusinasi)</Label>
              <Input
                id="dp-source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="mis. GL-2026-Q2, baris 88"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dp-status">Status Verifikasi</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="dp-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {dataStatusLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
