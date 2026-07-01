import { Router, type IRouter } from "express";
import {
  db,
  reportsTable,
  izinTable,
  companiesTable,
  dataPointsTable,
  constraintsTable,
  activitiesTable,
  teamMembersTable,
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
  TransitionApprovalParams,
  TransitionApprovalBody,
  TransitionApprovalResponse,
} from "@workspace/api-zod";
import type { Report, Company, Izin, DataPoint } from "@workspace/db";
import { getConsultantId } from "../middlewares/auth";
import { canAccessReport, companyAccessCondition } from "../lib/ownership";

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
  const conditions = [companyAccessCondition(consultantId)];
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
    .where(and(eq(reportsTable.id, id), companyAccessCondition(consultantId)));
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
  if (!(await canAccessReport(id, consultantId))) {
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
      ...(body.makerId !== undefined && { makerId: body.makerId }),
      ...(body.checkerId !== undefined && { checkerId: body.checkerId }),
      ...(body.approverId !== undefined && { approverId: body.approverId }),
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
  if (!(await canAccessReport(id, consultantId))) {
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

// Alur maker-checker-approver. approvalStatus: draft -> submitted -> reviewed
// -> approved; reject mengembalikan ke draft. Setiap langkah menegakkan siapa
// yang berwenang (pemilik akun ATAU orang yang ditugaskan pada langkah itu),
// mencatat jejak audit, dan mengembalikan 403 (bukan 404) saat aksi dilarang
// meski pengguna punya akses ke laporan.
const APPROVAL_STEP = {
  submit: { from: "draft", to: "submitted", label: "Diajukan (maker)" },
  review: { from: "submitted", to: "reviewed", label: "Diperiksa (checker)" },
  approve: { from: "reviewed", to: "approved", label: "Disetujui (approver)" },
} as const;

router.post("/reports/:id/approval", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { id } = TransitionApprovalParams.parse(req.params);
  const body = TransitionApprovalBody.parse(req.body);

  const [row] = await db
    .select({
      report: reportsTable,
      ownerId: companiesTable.consultantId,
    })
    .from(reportsTable)
    .innerJoin(izinTable, eq(reportsTable.izinId, izinTable.id))
    .innerJoin(companiesTable, eq(izinTable.companyId, companiesTable.id))
    .where(and(eq(reportsTable.id, id), companyAccessCondition(consultantId)));
  if (!row) {
    res.status(404).json({ error: "Laporan tidak ditemukan" });
    return;
  }
  const report = row.report;
  const isOwner = row.ownerId === consultantId;
  const current = report.approvalStatus;

  // Cek kewenangan: pemilik akun selalu boleh; selain itu hanya orang yang
  // ditugaskan pada langkah terkait.
  const authorizedFor = (assignedId: string | null): boolean =>
    isOwner || (assignedId !== null && assignedId === consultantId);

  let nextStatus: string;
  if (body.action === "reject") {
    if (current !== "submitted" && current !== "reviewed") {
      res.status(409).json({
        error: "Hanya laporan yang diajukan atau diperiksa yang dapat ditolak.",
      });
      return;
    }
    if (
      !(
        isOwner ||
        report.checkerId === consultantId ||
        report.approverId === consultantId
      )
    ) {
      res
        .status(403)
        .json({ error: "Anda tidak berwenang menolak laporan ini." });
      return;
    }
    nextStatus = "draft";
  } else {
    const step = APPROVAL_STEP[body.action];
    if (current !== step.from) {
      res.status(409).json({
        error: `Transisi tidak valid dari status persetujuan "${current}".`,
      });
      return;
    }
    const assignedId =
      body.action === "submit"
        ? report.makerId
        : body.action === "review"
          ? report.checkerId
          : report.approverId;
    if (!authorizedFor(assignedId)) {
      res
        .status(403)
        .json({ error: "Anda tidak berwenang pada langkah persetujuan ini." });
      return;
    }
    nextStatus = step.to;
  }

  const [updated] = await db
    .update(reportsTable)
    .set({ approvalStatus: nextStatus })
    .where(eq(reportsTable.id, id))
    .returning();

  // Label pelaku untuk jejak audit.
  let actorLabel = "Pemilik akun";
  if (!isOwner) {
    const [member] = await db
      .select({ email: teamMembersTable.email })
      .from(teamMembersTable)
      .where(
        and(
          eq(teamMembersTable.ownerId, row.ownerId),
          eq(teamMembersTable.memberId, consultantId),
        ),
      );
    actorLabel = member?.email ?? consultantId;
  }
  const actionLabel =
    body.action === "reject" ? "Ditolak (kembali ke draf)" : APPROVAL_STEP[body.action].label;
  await db.insert(activitiesTable).values({
    reportId: id,
    action: actionLabel,
    actor: actorLabel,
    detail: body.note ?? null,
  });

  const [izin] = await db
    .select()
    .from(izinTable)
    .where(eq(izinTable.id, updated.izinId));
  const [company] = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.id, izin.companyId));
  const payload = serializeReport(updated, izin, company);
  TransitionApprovalResponse.parse(payload);
  res.json(payload);
});

export default router;
