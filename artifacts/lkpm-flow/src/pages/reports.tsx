import React from "react";
import { useLocation } from "wouter";
import {
  useListReports,
  getListReportsQueryKey,
  useListCompanies,
  getListCompaniesQueryKey,
  useListIzin,
  getListIzinQueryKey,
  useCreateReport,
  type Izin,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Download } from "lucide-react";
import { operatingModeLabels, scaleLabels, statusLabels, periodTypeLabels, labelOf } from "@/lib/labels";
import { toCsv, downloadCsv } from "@/lib/export-csv";
import type { Report } from "@workspace/api-client-react";

const statusColors: Record<string, string> = {
  intake: "bg-slate-100 text-slate-700",
  collect: "bg-blue-100 text-blue-700",
  validate: "bg-indigo-100 text-indigo-700",
  draft: "bg-purple-100 text-purple-700",
  review: "bg-amber-100 text-amber-700",
  submit: "bg-emerald-100 text-emerald-700",
  monitor: "bg-teal-100 text-teal-700",
  archive: "bg-gray-100 text-gray-700",
};

type PeriodType = "triwulan" | "semester" | "tahunan";

function defaultPeriodType(scale?: string): PeriodType {
  if (scale === "besar" || scale === "menengah") return "triwulan";
  if (scale === "mikro") return "tahunan";
  return "semester";
}

function periodPlaceholder(periodType: PeriodType): string {
  if (periodType === "triwulan") return "mis. TW II 2026";
  if (periodType === "semester") return "mis. Semester I 2026";
  return "mis. Tahun 2026";
}

function NewReportDialog() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createReport = useCreateReport();
  const { data: companies } = useListCompanies({}, {
    query: { queryKey: getListCompaniesQueryKey({}) },
  });

  const [open, setOpen] = React.useState(false);
  const [companyId, setCompanyId] = React.useState<string>("");
  const [izinId, setIzinId] = React.useState<string>("");
  const [periodType, setPeriodType] = React.useState<PeriodType>("triwulan");
  const [periodLabel, setPeriodLabel] = React.useState("");
  const [year, setYear] = React.useState(String(new Date().getFullYear()));
  const [deadline, setDeadline] = React.useState("");

  const numericCompanyId = Number(companyId);
  const { data: izinList } = useListIzin(numericCompanyId, {
    query: {
      enabled: !!companyId,
      queryKey: getListIzinQueryKey(numericCompanyId),
    },
  });

  const selectedIzin: Izin | undefined = izinList?.find(
    (i) => String(i.id) === izinId,
  );

  const handleCompanyChange = (val: string) => {
    setCompanyId(val);
    setIzinId("");
  };

  const handleIzinChange = (val: string) => {
    setIzinId(val);
    const izin = izinList?.find((i) => String(i.id) === val);
    if (izin) setPeriodType(defaultPeriodType(izin.scale));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) {
      toast({ title: "Pilih perusahaan", variant: "destructive" });
      return;
    }
    if (!izinId) {
      toast({ title: "Pilih Izin proyek", variant: "destructive" });
      return;
    }
    if (!periodLabel.trim() || !deadline) {
      toast({ title: "Periode dan tenggat wajib diisi", variant: "destructive" });
      return;
    }
    const yearNum = parseInt(year, 10);
    createReport.mutate(
      {
        data: {
          izinId: Number(izinId),
          periodType,
          periodLabel: periodLabel.trim(),
          year: Number.isNaN(yearNum) ? new Date().getFullYear() : yearNum,
          deadline,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListReportsQueryKey({}) });
          toast({ title: "Laporan dibuat", description: `${periodLabel.trim()} berhasil ditambahkan.` });
          setOpen(false);
          setCompanyId("");
          setIzinId("");
          setPeriodLabel("");
          setDeadline("");
        },
        onError: () => toast({ title: "Gagal membuat laporan", variant: "destructive" }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-1" /> Laporan Baru
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Buat Laporan LKPM</DialogTitle>
            <DialogDescription>
              Pilih perusahaan dan periode pelaporan. Frekuensi default mengikuti skala usaha.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="nr-company">Perusahaan</Label>
              <Select value={companyId} onValueChange={handleCompanyChange}>
                <SelectTrigger id="nr-company">
                  <SelectValue placeholder="Pilih perusahaan" />
                </SelectTrigger>
                <SelectContent>
                  {companies?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name} ({labelOf(scaleLabels, c.scale)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nr-izin">Izin / Proyek</Label>
              <Select
                value={izinId}
                onValueChange={handleIzinChange}
                disabled={!companyId}
              >
                <SelectTrigger id="nr-izin">
                  <SelectValue
                    placeholder={
                      companyId
                        ? izinList && izinList.length > 0
                          ? "Pilih Izin proyek"
                          : "Perusahaan belum punya Izin"
                        : "Pilih perusahaan dahulu"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {izinList?.map((i) => (
                    <SelectItem key={i.id} value={String(i.id)}>
                      {i.projectName ? `${i.projectName} · ` : ""}
                      {i.idIzin} ({labelOf(scaleLabels, i.scale)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedIzin && (
                <p className="text-xs text-muted-foreground">
                  Skala {labelOf(scaleLabels, selectedIzin.scale)} (mengikuti Izin) ·
                  default {labelOf(periodTypeLabels, periodType).toLowerCase()}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="nr-periodtype">Jenis Periode</Label>
                <Select value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
                  <SelectTrigger id="nr-periodtype">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="triwulan">Triwulan</SelectItem>
                    <SelectItem value="semester">Semester</SelectItem>
                    <SelectItem value="tahunan">Tahunan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nr-year">Tahun</Label>
                <Input
                  id="nr-year"
                  inputMode="numeric"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nr-period">Label Periode</Label>
              <Input
                id="nr-period"
                value={periodLabel}
                onChange={(e) => setPeriodLabel(e.target.value)}
                placeholder={periodPlaceholder(periodType)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nr-deadline">Tenggat Waktu</Label>
              <Input
                id="nr-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={createReport.isPending}>
              Batal
            </Button>
            <Button type="submit" disabled={createReport.isPending}>
              {createReport.isPending ? "Menyimpan..." : "Buat Laporan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function exportReportsCsv(reports: Report[]) {
  const headers = [
    "Perusahaan",
    "Proyek",
    "Id Izin / NIB",
    "Skala",
    "Mode Operasi",
    "Jenis Periode",
    "Periode",
    "Tahun",
    "Tenggat",
    "Status",
    "Maker",
    "Checker",
    "Approver",
    "Resi OSS",
  ];
  const rows = reports.map((r) => [
    r.companyName,
    r.projectName ?? "",
    r.idIzin,
    labelOf(scaleLabels, r.scale),
    labelOf(operatingModeLabels, r.operatingMode),
    labelOf(periodTypeLabels, r.periodType),
    r.periodLabel,
    r.year,
    r.deadline,
    labelOf(statusLabels, r.status),
    r.makerName ?? "",
    r.checkerName ?? "",
    r.approverName ?? "",
    r.ossReceipt ?? "",
  ]);
  const csv = toCsv(headers, rows);
  const stamp = new Date().toISOString().slice(0, 10);
  downloadCsv(`laporan-lkpm-${stamp}.csv`, csv);
}

export default function Reports() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: reports, isLoading } = useListReports({}, {
    query: { queryKey: getListReportsQueryKey({}) }
  });

  const handleExport = () => {
    if (!reports || reports.length === 0) {
      toast({ title: "Tidak ada laporan untuk diekspor" });
      return;
    }
    exportReportsCsv(reports);
    toast({
      title: "Ekspor berhasil",
      description: `${reports.length} laporan diunduh sebagai CSV.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Laporan LKPM</h1>
          <p className="text-muted-foreground">Pantau dan kelola seluruh pelaporan aktivitas investasi.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isLoading || !reports || reports.length === 0}
          >
            <Download className="h-4 w-4 mr-1" /> Ekspor CSV
          </Button>
          <NewReportDialog />
        </div>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Perusahaan</TableHead>
              <TableHead>Periode</TableHead>
              <TableHead>Mode Operasi</TableHead>
              <TableHead>Tenggat Waktu</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-[80px]" /></TableCell>
                </TableRow>
              ))
            ) : reports?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  Tidak ada data laporan
                </TableCell>
              </TableRow>
            ) : (
              reports?.map((report) => (
                <TableRow 
                  key={report.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setLocation(`/reports/${report.id}`)}
                >
                  <TableCell className="font-medium text-primary">{report.companyName}</TableCell>
                  <TableCell>
                    {report.periodLabel}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {labelOf(operatingModeLabels, report.operatingMode)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {new Date(report.deadline).toLocaleDateString("id-ID")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`border-none ${statusColors[report.status] || ""}`}>
                      {labelOf(statusLabels, report.status)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
