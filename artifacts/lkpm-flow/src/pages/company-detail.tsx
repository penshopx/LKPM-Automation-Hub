import React from "react";
import { useParams, Link } from "wouter";
import {
  useGetCompany, getGetCompanyQueryKey,
  useListIzin, getListIzinQueryKey,
  useCreateIzin,
  type BusinessScale,
  type RiskLevel,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, MapPin, Hash, Briefcase, ChevronRight, ShieldCheck, Plus, FileText } from "lucide-react";
import { scaleLabels, operatingModeLabels, permitTypeLabels, ssStatusLabels, riskLevelLabels, labelOf } from "@/lib/labels";
import { useToast } from "@/hooks/use-toast";

function NewIzinDialog({ companyId, defaultScale }: { companyId: number; defaultScale: BusinessScale }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createIzin = useCreateIzin();

  const [open, setOpen] = React.useState(false);
  const [idIzin, setIdIzin] = React.useState("");
  const [kbli, setKbli] = React.useState("");
  const [scale, setScale] = React.useState<BusinessScale>(defaultScale);
  const [riskLevel, setRiskLevel] = React.useState<RiskLevel | "">("");
  const [projectName, setProjectName] = React.useState("");
  const [projectLocation, setProjectLocation] = React.useState("");

  React.useEffect(() => {
    if (open) setScale(defaultScale);
  }, [open, defaultScale]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idIzin.trim()) {
      toast({ title: "Id Izin / NIB wajib diisi", variant: "destructive" });
      return;
    }
    createIzin.mutate(
      {
        companyId,
        data: {
          idIzin: idIzin.trim(),
          kbli: kbli.trim() || undefined,
          scale,
          riskLevel: riskLevel || undefined,
          projectName: projectName.trim() || undefined,
          projectLocation: projectLocation.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListIzinQueryKey(companyId) });
          toast({ title: "Izin ditambahkan", description: `${idIzin.trim()} berhasil dibuat.` });
          setOpen(false);
          setIdIzin("");
          setKbli("");
          setRiskLevel("");
          setProjectName("");
          setProjectLocation("");
        },
        onError: () => toast({ title: "Gagal menambah Izin", variant: "destructive" }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" /> Tambah Izin
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Tambah Izin Proyek</DialogTitle>
            <DialogDescription>
              Setiap Izin mewakili satu proyek/NIB. Laporan dibuat di bawah Izin dan mewarisi skala usahanya.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ni-idizin">Id Izin / NIB</Label>
                <Input
                  id="ni-idizin"
                  value={idIzin}
                  onChange={(e) => setIdIzin(e.target.value)}
                  placeholder="Nomor proyek OSS"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ni-scale">Skala Usaha</Label>
                <Select value={scale} onValueChange={(v) => setScale(v as BusinessScale)}>
                  <SelectTrigger id="ni-scale">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(scaleLabels).map(([val, lbl]) => (
                      <SelectItem key={val} value={val}>{lbl}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ni-risk">Tingkat Risiko</Label>
              <Select value={riskLevel} onValueChange={(v) => setRiskLevel(v as RiskLevel)}>
                <SelectTrigger id="ni-risk">
                  <SelectValue placeholder="Opsional — pilih tingkat risiko" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(riskLevelLabels).map(([val, lbl]) => (
                    <SelectItem key={val} value={val}>{lbl}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ni-project">Nama Proyek</Label>
              <Input
                id="ni-project"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Opsional"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ni-kbli">KBLI</Label>
                <Input
                  id="ni-kbli"
                  value={kbli}
                  onChange={(e) => setKbli(e.target.value)}
                  placeholder="Opsional"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ni-location">Lokasi Proyek</Label>
                <Input
                  id="ni-location"
                  value={projectLocation}
                  onChange={(e) => setProjectLocation(e.target.value)}
                  placeholder="Opsional"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={createIzin.isPending}>
              Batal
            </Button>
            <Button type="submit" disabled={createIzin.isPending}>
              {createIzin.isPending ? "Menyimpan..." : "Tambah Izin"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const companyId = parseInt(id || "0", 10);

  const { data: company, isLoading: companyLoading } = useGetCompany(companyId, {
    query: { enabled: !!companyId, queryKey: getGetCompanyQueryKey(companyId) }
  });

  const { data: izinList, isLoading: izinLoading } = useListIzin(companyId, {
    query: { enabled: !!companyId, queryKey: getListIzinQueryKey(companyId) }
  });

  if (companyLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!company) {
    return <div>Perusahaan tidak ditemukan.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link href="/companies" className="hover:text-foreground hover:underline">Perusahaan</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">{company.name}</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">{company.name}</h1>
          <div className="flex items-center gap-3 mt-2 text-muted-foreground">
            <span className="flex items-center gap-1.5"><Hash className="h-4 w-4"/> NIB: {company.nib}</span>
            <Badge variant="secondary">{labelOf(scaleLabels, company.scale)}</Badge>
            <Badge variant="outline">{labelOf(operatingModeLabels, company.operatingMode)}</Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Profil Perusahaan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-y-4 text-sm">
              <div>
                <p className="text-muted-foreground font-medium mb-1">Nama PIC</p>
                <p>{company.picName || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-medium mb-1">Modal Usaha</p>
                <p>{company.capital ? `Rp ${company.capital.toLocaleString("id-ID")}` : "-"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground font-medium mb-1 flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" /> KBLI
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {company.kbli && company.kbli.length > 0 ? (
                    company.kbli.map(k => <Badge key={k} variant="secondary" className="text-xs">{k}</Badge>)
                  ) : "-"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              Perizinan Berusaha
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-y-4 text-sm">
              <div>
                <p className="text-muted-foreground font-medium mb-1">Jenis Perizinan</p>
                <Badge variant="secondary">{labelOf(permitTypeLabels, company.permitType)}</Badge>
              </div>
              <div>
                <p className="text-muted-foreground font-medium mb-1">Status Sertifikat Standar</p>
                <Badge variant="outline">{labelOf(ssStatusLabels, company.ssStatus)}</Badge>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground font-medium mb-1">Mode Operasi</p>
                <p>{labelOf(operatingModeLabels, company.operatingMode)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Alamat & Kontak
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 text-sm">
            <p className="leading-relaxed">{company.address || "Alamat tidak tersedia."}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold tracking-tight">Izin / Proyek</h2>
          <NewIzinDialog companyId={companyId} defaultScale={company.scale} />
        </div>
        <div className="border rounded-md bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Id Izin / Proyek</TableHead>
                <TableHead>KBLI</TableHead>
                <TableHead>Skala</TableHead>
                <TableHead>Tingkat Risiko</TableHead>
                <TableHead>Lokasi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {izinLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8"><Skeleton className="h-4 w-24 mx-auto"/></TableCell></TableRow>
              ) : izinList?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                    Belum ada Izin. Tambah Izin untuk mulai membuat laporan.
                  </TableCell>
                </TableRow>
              ) : (
                izinList?.map(izin => (
                  <TableRow key={izin.id}>
                    <TableCell>
                      <Link href={`/izin/${izin.id}`} className="font-medium text-primary hover:underline flex items-center gap-1.5">
                        <FileText className="h-4 w-4" />
                        {izin.projectName || izin.idIzin}
                      </Link>
                      {izin.projectName && (
                        <p className="text-xs text-muted-foreground ml-5.5">{izin.idIzin}</p>
                      )}
                    </TableCell>
                    <TableCell>{izin.kbli || "-"}</TableCell>
                    <TableCell><Badge variant="outline">{labelOf(scaleLabels, izin.scale)}</Badge></TableCell>
                    <TableCell>
                      {izin.riskLevel ? (
                        <Badge variant="secondary">{labelOf(riskLevelLabels, izin.riskLevel)}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{izin.projectLocation || "-"}</TableCell>
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
