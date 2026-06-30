import React from "react";
import { Link } from "wouter";
import { useGetDataQuality, getGetDataQualityQueryKey } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, ShieldAlert, XCircle, SearchX } from "lucide-react";

export default function DataQuality() {
  const { data: quality, isLoading } = useGetDataQuality({
    query: { queryKey: getGetDataQualityQueryKey() }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kualitas Data</h1>
          <p className="text-muted-foreground">Pusat kendali anti-halusinasi data. Pantau titik data berisiko.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className={quality?.missingSourceCount ? "border-destructive/50 shadow-sm" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tanpa Sumber</CardTitle>
            <SearchX className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold text-destructive">{quality?.missingSourceCount || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Risiko kepatuhan tinggi</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tingkat Keyakinan Rendah</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold">{quality?.lowConfidenceCount || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Skor &lt; 70%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status Estimasi</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold">{quality?.estimateCount || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Nilai perkiraan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Perlu Verifikasi</CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold">{quality?.needsVerificationCount || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Menunggu peninjau</p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-bold tracking-tight mt-8 mb-4">Titik Data Berisiko</h2>
      
      {isLoading ? (
        <div className="border rounded-md bg-card p-4 space-y-4">
           {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : quality?.flagged.length === 0 ? (
        <div className="border rounded-md border-dashed border-emerald-200 bg-emerald-50/50 p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-emerald-900 mb-1">Data Bersih dan Terverifikasi</h3>
          <p className="text-emerald-700/80 text-sm max-w-sm mx-auto">
            Luar biasa! Tidak ada data yang berstatus estimasi, tanpa sumber, atau dengan tingkat keyakinan rendah.
          </p>
        </div>
      ) : (
        <div className="border rounded-md bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Perusahaan / Laporan</TableHead>
                <TableHead>Label Data</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Keyakinan</TableHead>
                <TableHead>Masalah</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quality?.flagged.map((point) => (
                <TableRow key={point.id}>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-sm">{point.companyName}</span>
                      <Link href={`/reports/${point.reportId}`} className="text-xs text-primary hover:underline">
                        Lihat Laporan
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{point.label}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize text-xs">{point.category.replace('_', ' ')}</Badge></TableCell>
                  <TableCell>
                    <span className="text-xs capitalize flex items-center gap-1.5">
                      {point.status === 'estimasi' && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                      {point.status.replace('_', ' ')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${point.confidence < 70 ? 'bg-destructive' : 'bg-amber-400'}`} 
                          style={{ width: `${point.confidence}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono">{point.confidence}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {!point.source && (
                      <Badge variant="destructive" className="text-[10px]">Tanpa Sumber</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
