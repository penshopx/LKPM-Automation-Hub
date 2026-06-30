import React from "react";
import { Link } from "wouter";
import { 
  useGetDashboardSummary, getGetDashboardSummaryQueryKey,
  useGetReportingCalendar, getGetReportingCalendarQueryKey,
  useGetDataQuality, getGetDataQualityQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, FileText, AlertTriangle, ShieldCheck, Clock, CheckCircle2, SearchX, AlertCircle, ChevronRight, Activity, Calendar, Wallet, BadgeCheck, Gauge } from "lucide-react";
import { scaleLabels, labelOf } from "@/lib/labels";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const STATUS_ORDER = ["intake", "collect", "validate", "draft", "review", "submit", "monitor", "archive"];

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });

  const { data: calendar, isLoading: isLoadingCalendar } = useGetReportingCalendar({
    query: { queryKey: getGetReportingCalendarQueryKey() }
  });

  const { data: quality, isLoading: isLoadingQuality } = useGetDataQuality({
    query: { queryKey: getGetDataQualityQueryKey() }
  });

  if (isLoadingSummary || isLoadingCalendar || isLoadingQuality) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Dasbor Kepatuhan</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-80 col-span-2" />
          <Skeleton className="h-80 col-span-1" />
        </div>
      </div>
    );
  }

  if (!summary || !calendar || !quality) return null;

  // Compute max count for pipeline bars
  const maxPipelineCount = Math.max(...summary.byStatus.map(s => s.count), 1);
  const maxScaleCount = Math.max(...summary.byScale.map(s => s.count), 1);

  // Take top 5 upcoming deadlines
  const upcomingDeadlines = calendar.slice(0, 5);

  const formatIDR = (value: number) => {
    if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
    if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} Jt`;
    return `Rp ${value.toLocaleString("id-ID")}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dasbor Kepatuhan</h1>
        <p className="text-muted-foreground">Ringkasan status pelaporan LKPM dan kualitas data.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Perusahaan</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalCompanies}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Laporan Aktif</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalReports}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.submittedReports} telah dikirim
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Segera Jatuh Tempo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.dueSoonReports}</div>
            <p className="text-xs text-destructive mt-1">
              {summary.overdueReports} terlambat
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Belum Terverifikasi</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.unverifiedDataPoints}</div>
            <p className="text-xs text-muted-foreground mt-1">Titik data perlu ulasan</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Realisasi Investasi</CardTitle>
            <Wallet className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatIDR(summary.totalInvestmentRealization)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total nilai titik data investasi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Terverifikasi</CardTitle>
            <BadgeCheck className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.verifiedDataPointPercent}%</div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${summary.verifiedDataPointPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rata-rata Keyakinan</CardTitle>
            <Gauge className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.averageConfidence}%</div>
            <p className="text-xs text-muted-foreground mt-1">Skor keyakinan seluruh titik data</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="col-span-2 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Pipeline Laporan
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-4">
              {STATUS_ORDER.map(status => {
                const stat = summary.byStatus.find(s => s.status === status);
                const count = stat ? stat.count : 0;
                const percentage = (count / maxPipelineCount) * 100;
                
                return (
                  <div key={status} className="flex items-center gap-4">
                    <div className="w-24 text-sm font-medium capitalize text-muted-foreground shrink-0">
                      {status}
                    </div>
                    <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden relative group">
                      <div 
                        className={`h-full transition-all duration-500 ${count > 0 ? 'bg-primary' : 'bg-transparent'}`}
                        style={{ width: `${Math.max(percentage, count > 0 ? 2 : 0)}%` }}
                      />
                    </div>
                    <div className="w-8 text-sm text-right font-mono font-medium">
                      {count}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-primary" />
              Sebaran Skala Usaha
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            <div className="space-y-6">
              {summary.byScale.map(stat => {
                const percentage = (stat.count / maxScaleCount) * 100;
                return (
                  <div key={stat.scale} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{labelOf(scaleLabels, stat.scale)}</span>
                      <span className="font-mono text-muted-foreground">{stat.count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(percentage, stat.count > 0 ? 5 : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-primary" />
              Tenggat Terdekat
            </CardTitle>
            <Link href="/calendar" className="text-sm text-primary hover:underline flex items-center">
              Lihat Kalender <ChevronRight className="h-3 w-3 ml-1" />
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Tidak ada tenggat waktu terdekat.</p>
            ) : (
              <div className="space-y-4">
                {upcomingDeadlines.map(entry => {
                  const isSubmitted = ["submit", "monitor", "archive"].includes(entry.status);
                  
                  return (
                    <div key={entry.reportId} className="flex items-start justify-between border-b last:border-0 pb-4 last:pb-0">
                      <div>
                        <Link href={`/reports/${entry.reportId}`} className="font-medium hover:text-primary hover:underline transition-colors">
                          {entry.companyName}
                        </Link>
                        <p className="text-sm text-muted-foreground mt-0.5">{entry.periodLabel}</p>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className="text-sm font-medium">
                          {new Date(entry.deadline).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                        </span>
                        <div className="mt-1">
                          {isSubmitted ? (
                            <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200">Selesai</Badge>
                          ) : entry.overdue ? (
                            <Badge variant="destructive">Terlambat</Badge>
                          ) : entry.daysRemaining <= 14 ? (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">H-{entry.daysRemaining}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">{entry.daysRemaining} hari</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Kesehatan Data
            </CardTitle>
            <Link href="/data-quality" className="text-sm text-primary hover:underline flex items-center">
              Pusat Kendali <ChevronRight className="h-3 w-3 ml-1" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-md bg-emerald-50/50 border border-emerald-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-emerald-900">Terverifikasi</p>
                    <p className="text-xs text-emerald-700">Data valid dengan sumber</p>
                  </div>
                </div>
                <span className="text-xl font-bold text-emerald-700">{quality.verifiedCount}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-md bg-amber-50/50 border border-amber-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-amber-100 text-amber-600">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-amber-900">Perlu Verifikasi</p>
                    <p className="text-xs text-amber-700">Menunggu tinjauan</p>
                  </div>
                </div>
                <span className="text-xl font-bold text-amber-700">{quality.needsVerificationCount}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-md bg-destructive/5 border border-destructive/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-destructive/10 text-destructive">
                    <SearchX className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-destructive">Tanpa Sumber</p>
                    <p className="text-xs text-destructive/80">Risiko halusinasi data</p>
                  </div>
                </div>
                <span className="text-xl font-bold text-destructive">{quality.missingSourceCount}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-md border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-muted text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Keyakinan Rendah</p>
                    <p className="text-xs text-muted-foreground">Skor di bawah 70%</p>
                  </div>
                </div>
                <span className="text-xl font-bold">{quality.lowConfidenceCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
