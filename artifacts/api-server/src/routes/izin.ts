import { Router, type IRouter } from "express";
import {
  db,
  izinTable,
  reportsTable,
  companiesTable,
  basisPermitsTable,
} from "@workspace/db";
import { eq, and, desc, asc } from "drizzle-orm";
import {
  ListIzinParams,
  ListIzinResponse,
  CreateIzinParams,
  CreateIzinBody,
  CreateIzinResponse,
  GetIzinParams,
  GetIzinResponse,
  UpdateIzinParams,
  UpdateIzinBody,
  UpdateIzinResponse,
  DeleteIzinParams,
} from "@workspace/api-zod";
import type { Izin } from "@workspace/db";
import { getConsultantId } from "../middlewares/auth";
import {
  companyBelongsToConsultant,
  izinBelongsToConsultant,
  canAccessCompany,
  companyAccessCondition,
} from "../lib/ownership";

const router: IRouter = Router();

function serializeIzin(row: Izin) {
  return { ...row };
}

router.get("/companies/:companyId/izin", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { companyId } = ListIzinParams.parse(req.params);
  if (!(await canAccessCompany(companyId, consultantId))) {
    res.status(404).json({ error: "Perusahaan tidak ditemukan" });
    return;
  }
  const rows = await db
    .select()
    .from(izinTable)
    .where(eq(izinTable.companyId, companyId))
    .orderBy(desc(izinTable.createdAt));
  res.json(ListIzinResponse.parse(rows.map(serializeIzin)));
});

router.post("/companies/:companyId/izin", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { companyId } = CreateIzinParams.parse(req.params);
  const body = CreateIzinBody.parse(req.body);
  if (!(await companyBelongsToConsultant(companyId, consultantId))) {
    res.status(404).json({ error: "Perusahaan tidak ditemukan" });
    return;
  }
  const [row] = await db
    .insert(izinTable)
    .values({
      companyId,
      idIzin: body.idIzin,
      kbli: body.kbli ?? null,
      scale: body.scale,
      projectName: body.projectName ?? null,
      projectLocation: body.projectLocation ?? null,
      riskLevel: body.riskLevel ?? null,
    })
    .returning();
  res.status(201).json(CreateIzinResponse.parse(serializeIzin(row)));
});

router.get("/izin/:id", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { id } = GetIzinParams.parse(req.params);
  const [row] = await db
    .select({
      izin: izinTable,
      companyName: companiesTable.name,
      operatingMode: companiesTable.operatingMode,
    })
    .from(izinTable)
    .innerJoin(companiesTable, eq(izinTable.companyId, companiesTable.id))
    .where(and(eq(izinTable.id, id), companyAccessCondition(consultantId)));
  if (!row) {
    res.status(404).json({ error: "Izin tidak ditemukan" });
    return;
  }
  const [reports, basisPermits] = await Promise.all([
    db
      .select()
      .from(reportsTable)
      .where(eq(reportsTable.izinId, id))
      .orderBy(desc(reportsTable.deadline)),
    db
      .select()
      .from(basisPermitsTable)
      .where(eq(basisPermitsTable.izinId, id))
      .orderBy(asc(basisPermitsTable.id)),
  ]);
  const payload = {
    izin: serializeIzin(row.izin),
    reports: reports.map((r) => ({
      ...r,
      companyId: row.izin.companyId,
      companyName: row.companyName,
      idIzin: row.izin.idIzin,
      projectName: row.izin.projectName,
      operatingMode: row.operatingMode,
    })),
    basisPermits: basisPermits.map((p) => ({ ...p })),
  };
  GetIzinResponse.parse(payload);
  res.json(payload);
});

router.patch("/izin/:id", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { id } = UpdateIzinParams.parse(req.params);
  const body = UpdateIzinBody.parse(req.body);
  if (!(await izinBelongsToConsultant(id, consultantId))) {
    res.status(404).json({ error: "Izin tidak ditemukan" });
    return;
  }
  const [row] = await db
    .update(izinTable)
    .set({
      ...(body.idIzin !== undefined && { idIzin: body.idIzin }),
      ...(body.kbli !== undefined && { kbli: body.kbli }),
      ...(body.scale !== undefined && { scale: body.scale }),
      ...(body.projectName !== undefined && { projectName: body.projectName }),
      ...(body.projectLocation !== undefined && {
        projectLocation: body.projectLocation,
      }),
      ...(body.riskLevel !== undefined && { riskLevel: body.riskLevel }),
    })
    .where(eq(izinTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Izin tidak ditemukan" });
    return;
  }
  res.json(UpdateIzinResponse.parse(serializeIzin(row)));
});

router.delete("/izin/:id", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { id } = DeleteIzinParams.parse(req.params);
  if (!(await izinBelongsToConsultant(id, consultantId))) {
    res.status(404).json({ error: "Izin tidak ditemukan" });
    return;
  }
  const deleted = await db
    .delete(izinTable)
    .where(eq(izinTable.id, id))
    .returning({ id: izinTable.id });
  if (deleted.length === 0) {
    res.status(404).json({ error: "Izin tidak ditemukan" });
    return;
  }
  res.status(204).send();
});

export default router;
