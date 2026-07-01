import { Router, type IRouter } from "express";
import {
  db,
  reportsTable,
  izinTable,
  companiesTable,
  dataPointsTable,
  basisPermitsTable,
} from "@workspace/db";
import { and, eq, ne, sql } from "drizzle-orm";
import {
  GetDashboardSummaryResponse,
  GetReportingCalendarResponse,
  GetDataQualityResponse,
} from "@workspace/api-zod";
import { getConsultantId } from "../middlewares/auth";

const router: IRouter = Router();

const SUBMITTED_STATUSES = ["submit", "monitor", "archive"];

const PERMIT_EXPIRY_WARNING_DAYS = 60;

function daysBetween(deadline: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(deadline);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

router.get("/dashboard/summary", async (req, res) => {
  const consultantId = getConsultantId(req);
  const [companies, reports, unverified, dataPoints] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(companiesTable)
      .where(eq(companiesTable.consultantId, consultantId)),
    db
      .select({ report: reportsTable })
      .from(reportsTable)
      .innerJoin(izinTable, eq(reportsTable.izinId, izinTable.id))
      .innerJoin(companiesTable, eq(izinTable.companyId, companiesTable.id))
      .where(eq(companiesTable.consultantId, consultantId))
      .then((rows) => rows.map((r) => r.report)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(dataPointsTable)
      .innerJoin(reportsTable, eq(dataPointsTable.reportId, reportsTable.id))
      .innerJoin(izinTable, eq(reportsTable.izinId, izinTable.id))
      .innerJoin(companiesTable, eq(izinTable.companyId, companiesTable.id))
      .where(
        and(
          ne(dataPointsTable.status, "terverifikasi"),
          eq(companiesTable.consultantId, consultantId),
        ),
      ),
    db
      .select({ dp: dataPointsTable })
      .from(dataPointsTable)
      .innerJoin(reportsTable, eq(dataPointsTable.reportId, reportsTable.id))
      .innerJoin(izinTable, eq(reportsTable.izinId, izinTable.id))
      .innerJoin(companiesTable, eq(izinTable.companyId, companiesTable.id))
      .where(eq(companiesTable.consultantId, consultantId))
      .then((rows) => rows.map((r) => r.dp)),
  ]);

  let totalInvestmentRealization = 0;
  let verifiedDataPoints = 0;
  let confidenceSum = 0;
  for (const dp of dataPoints) {
    if (dp.category === "investasi" && dp.value !== null) {
      totalInvestmentRealization += Number(dp.value);
    }
    if (dp.status === "terverifikasi") verifiedDataPoints += 1;
    confidenceSum += dp.confidence;
  }
  const verifiedDataPointPercent = dataPoints.length
    ? Math.round((verifiedDataPoints / dataPoints.length) * 100)
    : 0;
  const averageConfidence = dataPoints.length
    ? Math.round(confidenceSum / dataPoints.length)
    : 0;

  let submittedReports = 0;
  let overdueReports = 0;
  let dueSoonReports = 0;
  const statusMap = new Map<string, number>();
  const scaleMap = new Map<string, number>();

  for (const r of reports) {
    const submitted = SUBMITTED_STATUSES.includes(r.status);
    if (submitted) submittedReports += 1;
    const remaining = daysBetween(r.deadline);
    if (!submitted && remaining < 0) overdueReports += 1;
    if (!submitted && remaining >= 0 && remaining <= 30) dueSoonReports += 1;
    statusMap.set(r.status, (statusMap.get(r.status) ?? 0) + 1);
    scaleMap.set(r.scale, (scaleMap.get(r.scale) ?? 0) + 1);
  }

  res.json(
    GetDashboardSummaryResponse.parse({
      totalCompanies: companies[0].count,
      totalReports: reports.length,
      submittedReports,
      overdueReports,
      dueSoonReports,
      unverifiedDataPoints: unverified[0].count,
      totalInvestmentRealization,
      verifiedDataPointPercent,
      averageConfidence,
      byStatus: Array.from(statusMap.entries()).map(([status, count]) => ({
        status,
        count,
      })),
      byScale: Array.from(scaleMap.entries()).map(([scale, count]) => ({
        scale,
        count,
      })),
    }),
  );
});

router.get("/dashboard/calendar", async (req, res) => {
  const consultantId = getConsultantId(req);
  const rows = await db
    .select({
      report: reportsTable,
      izinId: izinTable.id,
      idIzin: izinTable.idIzin,
      projectName: izinTable.projectName,
      companyName: companiesTable.name,
    })
    .from(reportsTable)
    .innerJoin(izinTable, eq(reportsTable.izinId, izinTable.id))
    .innerJoin(companiesTable, eq(izinTable.companyId, companiesTable.id))
    .where(eq(companiesTable.consultantId, consultantId))
    .orderBy(reportsTable.deadline);
  const entries = rows.map((r) => {
    const remaining = daysBetween(r.report.deadline);
    const submitted = SUBMITTED_STATUSES.includes(r.report.status);
    return {
      reportId: r.report.id,
      izinId: r.izinId,
      companyName: r.companyName,
      idIzin: r.idIzin,
      projectName: r.projectName,
      periodLabel: r.report.periodLabel,
      deadline: r.report.deadline,
      status: r.report.status,
      daysRemaining: remaining,
      overdue: !submitted && remaining < 0,
    };
  });
  GetReportingCalendarResponse.parse(entries);
  res.json(entries);
});

router.get("/dashboard/data-quality", async (req, res) => {
  const consultantId = getConsultantId(req);
  const rows = await db
    .select({ dp: dataPointsTable, companyName: companiesTable.name })
    .from(dataPointsTable)
    .innerJoin(reportsTable, eq(dataPointsTable.reportId, reportsTable.id))
    .innerJoin(izinTable, eq(reportsTable.izinId, izinTable.id))
    .innerJoin(companiesTable, eq(izinTable.companyId, companiesTable.id))
    .where(eq(companiesTable.consultantId, consultantId))
    .orderBy(dataPointsTable.confidence);

  let verifiedCount = 0;
  let needsVerificationCount = 0;
  let estimateCount = 0;
  let missingSourceCount = 0;
  let lowConfidenceCount = 0;
  const flagged = [];

  for (const { dp, companyName } of rows) {
    if (dp.status === "terverifikasi") verifiedCount += 1;
    if (dp.status === "perlu_verifikasi") needsVerificationCount += 1;
    if (dp.status === "estimasi") estimateCount += 1;
    const missingSource = !dp.source || dp.source.trim() === "";
    if (missingSource) missingSourceCount += 1;
    const lowConfidence = dp.confidence < 70;
    if (lowConfidence) lowConfidenceCount += 1;
    if (dp.status !== "terverifikasi" || missingSource || lowConfidence) {
      flagged.push({
        id: dp.id,
        reportId: dp.reportId,
        companyName,
        category: dp.category,
        label: dp.label,
        value: dp.value === null ? null : Number(dp.value),
        source: dp.source,
        status: dp.status,
        confidence: dp.confidence,
      });
    }
  }

  const permitRows = await db
    .select({
      permit: basisPermitsTable,
      izinId: izinTable.id,
      idIzin: izinTable.idIzin,
      projectName: izinTable.projectName,
      companyId: companiesTable.id,
      companyName: companiesTable.name,
    })
    .from(basisPermitsTable)
    .innerJoin(izinTable, eq(basisPermitsTable.izinId, izinTable.id))
    .innerJoin(companiesTable, eq(izinTable.companyId, companiesTable.id))
    .where(eq(companiesTable.consultantId, consultantId));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  type PermitAgg = {
    izinId: number;
    companyId: number;
    companyName: string;
    idIzin: string;
    projectName: string | null;
    totalCount: number;
    fulfilledCount: number;
    incomplete: boolean;
    expired: boolean;
    expiringSoon: boolean;
    daysUntilExpiry: number | null;
  };
  const permitMap = new Map<number, PermitAgg>();

  for (const r of permitRows) {
    let agg = permitMap.get(r.izinId);
    if (!agg) {
      agg = {
        izinId: r.izinId,
        companyId: r.companyId,
        companyName: r.companyName,
        idIzin: r.idIzin,
        projectName: r.projectName,
        totalCount: 0,
        fulfilledCount: 0,
        incomplete: false,
        expired: false,
        expiringSoon: false,
        daysUntilExpiry: null,
      };
      permitMap.set(r.izinId, agg);
    }
    const p = r.permit;
    agg.totalCount += 1;
    const pastValidUntil =
      p.validUntil !== null && new Date(p.validUntil) < today;
    const isExpired = p.status === "kedaluwarsa" || pastValidUntil;
    const isFulfilled = p.status === "terbit" && !pastValidUntil;
    if (isFulfilled) agg.fulfilledCount += 1;
    else agg.incomplete = true;
    if (isExpired) agg.expired = true;
    if (!isExpired && p.validUntil !== null) {
      const remaining = daysBetween(p.validUntil);
      if (remaining >= 0 && remaining <= PERMIT_EXPIRY_WARNING_DAYS) {
        agg.expiringSoon = true;
        agg.daysUntilExpiry =
          agg.daysUntilExpiry === null
            ? remaining
            : Math.min(agg.daysUntilExpiry, remaining);
      }
    }
  }

  const permitFlags = Array.from(permitMap.values()).filter(
    (a) => a.incomplete || a.expired || a.expiringSoon,
  );
  const incompletePermitCount = permitFlags.filter((a) => a.incomplete).length;
  const expiredPermitCount = permitFlags.filter((a) => a.expired).length;
  const expiringSoonPermitCount = permitFlags.filter(
    (a) => a.expiringSoon,
  ).length;

  res.json(
    GetDataQualityResponse.parse({
      verifiedCount,
      needsVerificationCount,
      estimateCount,
      missingSourceCount,
      lowConfidenceCount,
      flagged,
      incompletePermitCount,
      expiredPermitCount,
      expiringSoonPermitCount,
      permitFlags,
    }),
  );
});

export default router;
