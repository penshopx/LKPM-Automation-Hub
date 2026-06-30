import React from "react";
import { useParams, Link } from "wouter";
import { useGetIzin, getGetIzinQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronRight, FileText, Hash, Briefcase, MapPin } from "lucide-react";
import { scaleLabels, statusLabels, periodTypeLabels, labelOf } from "@/lib/labels";

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

  const { izin, reports } = data;

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
          <div className="flex items-center gap-3 mt-2 text-muted-foreground text-sm">
            <span className="flex items-center gap-1.5"><Hash className="h-4 w-4"/> Id Izin: {izin.idIzin}</span>
            <Badge variant="secondary">{labelOf(scaleLabels, izin.scale)}</Badge>
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
                <p className="text-muted-foreground font-medium mb-1">KBLI</p>
                <p>{izin.kbli || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-medium mb-1">Lokasi Proyek</p>
                <p>{izin.projectLocation || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
