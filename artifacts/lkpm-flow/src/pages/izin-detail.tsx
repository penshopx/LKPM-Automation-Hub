import React from "react";
import { useParams, Link } from "wouter";
import {
  useGetIzin,
  getGetIzinQueryKey,
  useCreateBasisPermit,
  useUpdateBasisPermit,
  useDeleteBasisPermit,
  type BasisPermit,
  type BasisPermitType,
  type BasisPermitStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronRight, FileText, Hash, Briefcase, MapPin, ShieldCheck, Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import {
  scaleLabels, statusLabels, periodTypeLabels,
  riskLevelLabels, basisPermitTypeLabels, basisPermitStatusLabels, labelOf,
} from "@/lib/labels";
import { useToast } from "@/hooks/use-toast";

const PERMIT_TYPES: BasisPermitType[] = [
  "kkpr", "persetujuan_lingkungan", "pbg", "slf", "sertifikat_standar", "izin",
];
const PERMIT_STATUSES: BasisPermitStatus[] = [
  "belum_ada", "dalam_proses", "terbit", "kedaluwarsa",
];

function statusBadgeVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  if (status === "terbit") return "default";
  if (status === "kedaluwarsa") return "destructive";
  if (status === "dalam_proses") return "secondary";
  return "outline";
}

function riskBadgeClass(risk: string | null | undefined): string {
  switch (risk) {
    case "rendah": return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "menengah_rendah": return "bg-lime-100 text-lime-800 border-lime-200";
    case "menengah_tinggi": return "bg-amber-100 text-amber-800 border-amber-200";
    case "tinggi": return "bg-red-100 text-red-800 border-red-200";
    default: return "";
  }
}

function isPastValidUntil(validUntil: string | Date | null | undefined): boolean {
  if (!validUntil) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(validUntil) < today;
}

function toDateInput(value: string | Date | null | undefined): string {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID");
}

function BasisPermitDialog({
  izinId,
  permit,
  trigger,
}: {
  izinId: number;
  permit?: BasisPermit;
  trigger: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createPermit = useCreateBasisPermit();
  const updatePermit = useUpdateBasisPermit();
  const isEdit = !!permit;

  const [open, setOpen] = React.useState(false);
  const [type, setType] = React.useState<BasisPermitType>(permit?.type ?? "kkpr");
  const [status, setStatus] = React.useState<BasisPermitStatus>(permit?.status ?? "belum_ada");
  const [documentNumber, setDocumentNumber] = React.useState(permit?.documentNumber ?? "");
  const [issuedDate, setIssuedDate] = React.useState(toDateInput(permit?.issuedDate));
  const [validUntil, setValidUntil] = React.useState(toDateInput(permit?.validUntil));
  const [notes, setNotes] = React.useState(permit?.notes ?? "");

  React.useEffect(() => {
    if (open) {
      setType(permit?.type ?? "kkpr");
      setStatus(permit?.status ?? "belum_ada");
      setDocumentNumber(permit?.documentNumber ?? "");
      setIssuedDate(toDateInput(permit?.issuedDate));
      setValidUntil(toDateInput(permit?.validUntil));
      setNotes(permit?.notes ?? "");
    }
  }, [open, permit]);

  const isPending = createPermit.isPending || updatePermit.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      type,
      status,
      documentNumber: documentNumber.trim() || undefined,
      issuedDate: issuedDate || undefined,
      validUntil: validUntil || undefined,
      notes: notes.trim() || undefined,
    };
    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: getGetIzinQueryKey(izinId) });
      toast({
        title: isEdit ? "Perizinan dasar diperbarui" : "Perizinan dasar ditambahkan",
      });
      setOpen(false);
    };
    const onError = () =>
      toast({ title: "Gagal menyimpan perizinan dasar", variant: "destructive" });

    if (isEdit) {
      updatePermit.mutate({ id: permit.id, data }, { onSuccess, onError });
    } else {
      createPermit.mutate({ izinId, data }, { onSuccess, onError });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Ubah Perizinan Dasar" : "Tambah Perizinan Dasar"}</DialogTitle>
            <DialogDescription>
              Catat perizinan dasar OSS RBA (KKPR, Persetujuan Lingkungan, PBG, SLF, dll.) untuk Izin ini.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bp-type">Jenis</Label>
                <Select value={type} onValueChange={(v) => setType(v as BasisPermitType)}>
                  <SelectTrigger id="bp-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERMIT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{labelOf(basisPermitTypeLabels, t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bp-status">Status Kelengkapan</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as BasisPermitStatus)}>
                  <SelectTrigger id="bp-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERMIT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{labelOf(basisPermitStatusLabels, s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bp-docnum">Nomor Dokumen</Label>
              <Input
                id="bp-docnum"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="Opsional"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bp-issued">Tanggal Terbit</Label>
                <Input
                  id="bp-issued"
                  type="date"
                  value={issuedDate}
                  onChange={(e) => setIssuedDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bp-valid">Berlaku Sampai</Label>
                <Input
                  id="bp-valid"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bp-notes">Catatan</Label>
              <Textarea
                id="bp-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Opsional — mis. AMDAL / UKL-UPL / SPPL, atau catatan proses"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Batal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeletePermitButton({ izinId, permitId }: { izinId: number; permitId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deletePermit = useDeleteBasisPermit();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-destructive"
      disabled={deletePermit.isPending}
      onClick={() =>
        deletePermit.mutate(
          { id: permitId },
          {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: getGetIzinQueryKey(izinId) });
              toast({ title: "Perizinan dasar dihapus" });
            },
            onError: () => toast({ title: "Gagal menghapus", variant: "destructive" }),
          },
        )
      }
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

export default function IzinDetail() {
  const { id } = useParams<{ id: string }>();
  const izinId = parseInt(id || "0", 10);

  const { data, isLoading } = useGetIzin(izinId, {
    query: { enabled: !!izinId, queryKey: getGetIzinQueryKey(izinId) },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!data) {
    return <div>Izin tidak ditemukan.</div>;
  }

  const { izin, reports, basisPermits } = data;

  const fulfilledCount = basisPermits.filter(
    (p) => p.status === "terbit" && !isPastValidUntil(p.validUntil),
  ).length;
  const totalPermits = basisPermits.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link href="/companies" className="hover:text-foreground hover:underline">Perusahaan</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={`/companies/${izin.companyId}`} className="hover:text-foreground hover:underline">Perusahaan</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">{izin.projectName || izin.idIzin}</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            {izin.projectName || izin.idIzin}
          </h1>
          <div className="flex items-center gap-3 mt-2 text-muted-foreground text-sm flex-wrap">
            <span className="flex items-center gap-1.5"><Hash className="h-4 w-4"/> Id Izin: {izin.idIzin}</span>
            <Badge variant="secondary">{labelOf(scaleLabels, izin.scale)}</Badge>
            {izin.riskLevel && (
              <Badge variant="outline" className={riskBadgeClass(izin.riskLevel)}>
                {labelOf(riskLevelLabels, izin.riskLevel)}
              </Badge>
            )}
            {izin.kbli && (
              <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4"/> KBLI: {izin.kbli}</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Detail Proyek
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-y-4 text-sm">
              <div>
                <p className="text-muted-foreground font-medium mb-1">Nama Proyek</p>
                <p>{izin.projectName || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-medium mb-1">Skala Usaha</p>
                <Badge variant="outline">{labelOf(scaleLabels, izin.scale)}</Badge>
              </div>
              <div>
                <p className="text-muted-foreground font-medium mb-1">Tingkat Risiko</p>
                {izin.riskLevel ? (
                  <Badge variant="outline" className={riskBadgeClass(izin.riskLevel)}>
                    {labelOf(riskLevelLabels, izin.riskLevel)}
                  </Badge>
                ) : (
                  <p>-</p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground font-medium mb-1">KBLI</p>
                <p>{izin.kbli || "-"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground font-medium mb-1">Lokasi Proyek</p>
                <p>{izin.projectLocation || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              Kelengkapan Perizinan Dasar
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {totalPermits === 0 ? (
              <p className="text-sm text-muted-foreground">
                Belum ada perizinan dasar tercatat.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{fulfilledCount}</span>
                  <span className="text-muted-foreground text-sm">
                    dari {totalPermits} syarat terpenuhi
                  </span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${totalPermits ? (fulfilledCount / totalPermits) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Perizinan dianggap terpenuhi bila berstatus terbit dan belum melewati masa berlaku.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold tracking-tight">Perizinan Dasar</h2>
          <BasisPermitDialog
            izinId={izinId}
            trigger={
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Tambah Perizinan</Button>
            }
          />
        </div>
        <div className="border rounded-md bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jenis</TableHead>
                <TableHead>Nomor Dokumen</TableHead>
                <TableHead>Terbit</TableHead>
                <TableHead>Berlaku Sampai</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {basisPermits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                    Belum ada perizinan dasar. Tambahkan untuk memantau kelengkapan OSS RBA.
                  </TableCell>
                </TableRow>
              ) : (
                basisPermits.map((permit) => {
                  const expired = permit.status === "kedaluwarsa" || isPastValidUntil(permit.validUntil);
                  return (
                    <TableRow key={permit.id}>
                      <TableCell className="font-medium">
                        {labelOf(basisPermitTypeLabels, permit.type)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{permit.documentNumber || "-"}</TableCell>
                      <TableCell>{formatDate(permit.issuedDate)}</TableCell>
                      <TableCell>
                        <span className={expired ? "text-destructive flex items-center gap-1" : ""}>
                          {expired && <AlertTriangle className="h-3.5 w-3.5" />}
                          {formatDate(permit.validUntil)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(permit.status)}>
                          {labelOf(basisPermitStatusLabels, permit.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <BasisPermitDialog
                            izinId={izinId}
                            permit={permit}
                            trigger={
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <DeletePermitButton izinId={izinId} permitId={permit.id} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold tracking-tight mb-4">Laporan</h2>
        <div className="border rounded-md bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Periode</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Tenggat Waktu</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                    Belum ada laporan untuk Izin ini.
                  </TableCell>
                </TableRow>
              ) : (
                reports.map(report => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <Link href={`/reports/${report.id}`} className="font-medium text-primary hover:underline flex items-center gap-1.5">
                        <FileText className="h-4 w-4" />
                        {report.periodLabel}
                      </Link>
                    </TableCell>
                    <TableCell>{labelOf(periodTypeLabels, report.periodType)}</TableCell>
                    <TableCell>{new Date(report.deadline).toLocaleDateString("id-ID")}</TableCell>
                    <TableCell><Badge variant="outline">{labelOf(statusLabels, report.status)}</Badge></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
