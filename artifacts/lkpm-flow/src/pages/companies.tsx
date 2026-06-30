import React from "react";
import { useLocation } from "wouter";
import { useListCompanies, getListCompaniesQueryKey } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { scaleLabels, operatingModeLabels, permitTypeLabels, ssStatusLabels, labelOf } from "@/lib/labels";

export default function Companies() {
  const [, setLocation] = useLocation();
  const { data: companies, isLoading } = useListCompanies({}, {
    query: { queryKey: getListCompaniesQueryKey({}) }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Perusahaan</h1>
          <p className="text-muted-foreground">Kelola data penanam modal dan entitas bisnis.</p>
        </div>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Perusahaan</TableHead>
              <TableHead>NIB</TableHead>
              <TableHead>Skala Usaha</TableHead>
              <TableHead>Jenis Perizinan</TableHead>
              <TableHead>Status SS</TableHead>
              <TableHead>Mode Operasi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                </TableRow>
              ))
            ) : companies?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  Tidak ada data perusahaan
                </TableCell>
              </TableRow>
            ) : (
              companies?.map((company) => (
                <TableRow 
                  key={company.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setLocation(`/companies/${company.id}`)}
                >
                  <TableCell className="font-medium text-primary">{company.name}</TableCell>
                  <TableCell className="font-mono text-sm">{company.nib}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {labelOf(scaleLabels, company.scale)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {labelOf(permitTypeLabels, company.permitType)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {labelOf(ssStatusLabels, company.ssStatus)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {labelOf(operatingModeLabels, company.operatingMode)}
                    </span>
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
