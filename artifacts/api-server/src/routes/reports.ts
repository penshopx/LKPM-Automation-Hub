import { Router, type IRouter } from "express";
import {
  db,
  reportsTable,
  izinTable,
  companiesTable,
  dataPointsTable,
  constraintsTable,
  activitiesTable,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import {
  ListReportsQueryParams,
  ListReportsResponse,
  CreateReportBody,
  CreateReportResponse,
  GetReportParams,
  GetReportResponse,
  UpdateReportParams,
  UpdateReportBody,
  UpdateReportResponse,
  DeleteReportParams,
} from "@workspace/api-zod";
import type { Report, Company, Izin, DataPoint } from "@workspace/db";
import { getConsultantId } from "../middlewares/auth";
import { reportBelongsToConsultant } from "../lib/ownership";

const router: IRouter = Router();

function serializeReport(
  row: Report,
  izin: Pick<Izin, "companyId" | "idIzin" | "projectName">,
  company: Pick<Company, "name" | "operatingMode">,
) {
  return {
    ...row,
    companyId: izin.companyId,
    companyName: company.name,
    idIzin: izin.idIzin,
    projectName: izin.projectName,
    operatingMode: company.operatingMode,
  };
}

function serializeDataPoint(row: DataPoint) {
  return {
    ...row,
    value: row.value === null ? null : Number(row.value),
  };
}

router.get("/reports", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { companyId, izinId, status, scale } = ListReportsQueryParams.parse(
    req.query,
  );
  const conditions = [eq(companiesTable.consultantId, consultantId)];
  if (companyId) conditions.push(eq(izinTable.companyId, companyId));
  if (izinId) conditions.push(eq(reportsTable.izinId, izinId));
  if (status) conditions.push(eq(reportsTable.status, status));
  if (scale) conditions.push(eq(reportsTable.scale, scale));
  const rows = await db
    .select({
      report: reportsTable,
      companyId: izinTable.companyId,
      idIzin: izinTable.idIzin,
      projectName: izinTable.projectName,
      companyName: companiesTable.name,
      operatingMode: companiesTable.operatingMode,
    })
    .from(reportsTable)
    .innerJoin(izinTable, eq(reportsTable.izinId, izinTable.id))
    .innerJoin(companiesTable, eq(izinTable.companyId, companiesTable.id))
    .where(and(...conditions))
    .orderBy(desc(reportsTable.deadline));
  const payload = rows.map((r) => ({
    ...r.report,
    companyId: r.companyId,
    companyName: r.companyName,
    idIzin: r.idIzin,
    projectName: r.projectName,
    operatingMode: r.operatingMode,
  }));
  ListReportsResponse.parse(payload);
  res.json(payload);
});

router.post("/reports", async (req, res) => {
  const consultantId = getConsultantId(req);
  const body = CreateReportBody.parse(req.body);
  const [row] = await db
    .select({ izin: izinTable, company: companiesTable })
    .from(izinTable)
    .innerJoin(companiesTable, eq(izinTable.companyId, companiesTable.id))
    .where(
      and(
        eq(izinTable.id, body.izinId),
        eq(companiesTable.consultantId, consultantId),
      ),
    );
  if (!row) {
    res.status(404).json({ error: "Izin tidak ditemukan" });
    return;
  }
  const { izin, company } = row;
  const [created] = await db
    .insert(reportsTable)
    .values({
      izinId: izin.id,
      scale: izin.scale,
      periodType: body.periodType,
      periodLabel: body.periodLabel,
      year: body.year,
      deadline:
        body.deadline instanceof Date
          ? body.deadline.toISOString().slice(0, 10)
          : String(body.deadline),
      status: body.status ?? "intake",
      narrative: body.narrative ?? null,
      makerName: body.makerName ?? null,
      checkerName: body.checkerName ?? null,
      approverName: body.approverName ?? null,
    })
    .returning();
  const payload = serializeReport(created, izin, company);
  CreateReportResponse.parse(payload);
  res.status(201).json(payload);
});

router.get("/reports/:id", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { id } = GetReportParams.parse(req.params);
  const [row] = await db
    .select({
      report: reportsTable,
      companyId: izinTable.companyId,
      idIzin: izinTable.idIzin,
      projectName: izinTable.projectName,
      companyName: companiesTable.name,
      operatingMode: companiesTable.operatingMode,
    })
    .from(reportsTable)
    .innerJoin(izinTable, eq(reportsTable.izinId, izinTable.id))
    .innerJoin(companiesTable, eq(izinTable.companyId, companiesTable.id))
    .where(
      and(
        eq(reportsTable.id, id),
        eq(companiesTable.consultantId, consultantId),
      ),
    );
  if (!row) {
    res.status(404).json({ error: "Laporan tidak ditemukan" });
    return;
  }
  const [dataPoints, constraints, activities] = await Promise.all([
    db
      .select()
      .from(dataPointsTable)
      .where(eq(dataPointsTable.reportId, id))
      .orderBy(dataPointsTable.id),
    db
      .select()
      .from(constraintsTable)
      .where(eq(constraintsTable.reportId, id))
      .orderBy(constraintsTable.id),
    db
      .select()
      .from(activitiesTable)
      .where(eq(activitiesTable.reportId, id))
      .orderBy(desc(activitiesTable.createdAt)),
  ]);
  const payload = {
    report: {
      ...row.report,
      companyId: row.companyId,
      companyName: row.companyName,
      idIzin: row.idIzin,
      projectName: row.projectName,
      operatingMode: row.operatingMode,
    },
    dataPoints: dataPoints.map(serializeDataPoint),
    constraints,
    activities,
  };
  GetReportResponse.parse(payload);
  res.json(payload);
});

router.patch("/reports/:id", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { id } = UpdateReportParams.parse(req.params);
  const body = UpdateReportBody.parse(req.body);
  if (!(await reportBelongsToConsultant(id, consultantId))) {
    res.status(404).json({ error: "Laporan tidak ditemukan" });
    return;
  }
  const [updated] = await db
    .update(reportsTable)
    .set({
      ...(body.periodType !== undefined && { periodType: body.periodType }),
      ...(body.periodLabel !== undefined && { periodLabel: body.periodLabel }),
      ...(body.year !== undefined && { year: body.year }),
      ...(body.deadline !== undefined && {
        deadline:
          body.deadline instanceof Date
            ? body.deadline.toISOString().slice(0, 10)
            : String(body.deadline),
      }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.narrative !== undefined && { narrative: body.narrative }),
      ...(body.ossReceipt !== undefined && { ossReceipt: body.ossReceipt }),
      ...(body.makerName !== undefined && { makerName: body.makerName }),
      ...(body.checkerName !== undefined && { checkerName: body.checkerName }),
      ...(body.approverName !== undefined && {
        approverName: body.approverName,
      }),
    })
    .where(eq(reportsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Laporan tidak ditemukan" });
    return;
  }
  const [izin] = await db
    .select()
    .from(izinTable)
    .where(eq(izinTable.id, updated.izinId));
  const [company] = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.id, izin.companyId));
  const payload = serializeReport(updated, izin, company);
  UpdateReportResponse.parse(payload);
  res.json(payload);
});

router.delete("/reports/:id", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { id } = DeleteReportParams.parse(req.params);
  if (!(await reportBelongsToConsultant(id, consultantId))) {
    res.status(404).json({ error: "Laporan tidak ditemukan" });
    return;
  }
  const deleted = await db
    .delete(reportsTable)
    .where(eq(reportsTable.id, id))
    .returning({ id: reportsTable.id });
  if (deleted.length === 0) {
    res.status(404).json({ error: "Laporan tidak ditemukan" });
    return;
  }
  res.status(204).send();
});

export default router;
