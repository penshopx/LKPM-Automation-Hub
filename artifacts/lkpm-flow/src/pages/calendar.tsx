import React from "react";
import { Link } from "wouter";
import { useGetReportingCalendar, getGetReportingCalendarQueryKey } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CalendarIcon, Clock, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function Calendar() {
  const { data: calendar, isLoading } = useGetReportingCalendar({
    query: { queryKey: getGetReportingCalendarQueryKey() }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kalender Pelaporan</h1>
          <p className="text-muted-foreground">Tenggat waktu laporan LKPM mendatang.</p>
        </div>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenggat Waktu</TableHead>
              <TableHead>Sisa Waktu</TableHead>
              <TableHead>Perusahaan / Izin</TableHead>
              <TableHead>Periode</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-[80px]" /></TableCell>
                </TableRow>
              ))
            ) : calendar?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-32">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <CalendarIcon className="h-8 w-8 mb-2 opacity-50" />
                    <p>Tidak ada tenggat waktu dalam waktu dekat.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              calendar?.map((entry) => {
                const isSubmitted = ["submit", "monitor", "archive"].includes(entry.status);
                
                return (
                  <TableRow key={entry.reportId}>
                    <TableCell className="font-medium">
                      {new Date(entry.deadline).toLocaleDateString("id-ID", {
                        day: "numeric", month: "short", year: "numeric"
                      })}
                    </TableCell>
                    <TableCell>
                      {isSubmitted ? (
                        <span className="flex items-center gap-1.5 text-emerald-600 font-medium text-sm">
                          <CheckCircle2 className="h-4 w-4" />
                          Selesai
                        </span>
                      ) : entry.overdue ? (
                        <span className="flex items-center gap-1.5 text-destructive font-medium text-sm">
                          <AlertCircle className="h-4 w-4" />
                          Terlambat {Math.abs(entry.daysRemaining)} hari
                        </span>
                      ) : entry.daysRemaining <= 30 ? (
                        <span className="flex items-center gap-1.5 text-amber-600 font-medium text-sm">
                          <Clock className="h-4 w-4" />
                          H-{entry.daysRemaining}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">{entry.daysRemaining} hari lagi</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/reports/${entry.reportId}`} className="font-medium text-primary hover:underline">
                        {entry.companyName}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {entry.projectName ? `${entry.projectName} · ` : ""}
                        {entry.idIzin}
                      </p>
                    </TableCell>
                    <TableCell>{entry.periodLabel}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {entry.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
