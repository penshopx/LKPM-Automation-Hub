import { Router, type IRouter } from "express";
import { db, basisPermitsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import {
  ListBasisPermitsParams,
  ListBasisPermitsResponse,
  CreateBasisPermitParams,
  CreateBasisPermitBody,
  CreateBasisPermitResponse,
  UpdateBasisPermitParams,
  UpdateBasisPermitBody,
  UpdateBasisPermitResponse,
  DeleteBasisPermitParams,
} from "@workspace/api-zod";
import type { BasisPermit } from "@workspace/db";
import { getConsultantId } from "../middlewares/auth";
import {
  izinBelongsToConsultant,
  basisPermitBelongsToConsultant,
} from "../lib/ownership";

const router: IRouter = Router();

function serializeBasisPermit(row: BasisPermit) {
  return { ...row };
}

router.get("/izin/:izinId/basis-permits", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { izinId } = ListBasisPermitsParams.parse(req.params);
  if (!(await izinBelongsToConsultant(izinId, consultantId))) {
    res.status(404).json({ error: "Izin tidak ditemukan" });
    return;
  }
  const rows = await db
    .select()
    .from(basisPermitsTable)
    .where(eq(basisPermitsTable.izinId, izinId))
    .orderBy(asc(basisPermitsTable.id));
  const payload = rows.map(serializeBasisPermit);
  ListBasisPermitsResponse.parse(payload);
  res.json(payload);
});

router.post("/izin/:izinId/basis-permits", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { izinId } = CreateBasisPermitParams.parse(req.params);
  const body = CreateBasisPermitBody.parse(req.body);
  if (!(await izinBelongsToConsultant(izinId, consultantId))) {
    res.status(404).json({ error: "Izin tidak ditemukan" });
    return;
  }
  const [row] = await db
    .insert(basisPermitsTable)
    .values({
      izinId,
      type: body.type,
      documentNumber: body.documentNumber ?? null,
      issuedDate: body.issuedDate
        ? body.issuedDate.toISOString().slice(0, 10)
        : null,
      validUntil: body.validUntil
        ? body.validUntil.toISOString().slice(0, 10)
        : null,
      status: body.status ?? "belum_ada",
      notes: body.notes ?? null,
    })
    .returning();
  const payload = serializeBasisPermit(row);
  CreateBasisPermitResponse.parse(payload);
  res.status(201).json(payload);
});

router.patch("/basis-permits/:id", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { id } = UpdateBasisPermitParams.parse(req.params);
  const body = UpdateBasisPermitBody.parse(req.body);
  if (!(await basisPermitBelongsToConsultant(id, consultantId))) {
    res.status(404).json({ error: "Perizinan dasar tidak ditemukan" });
    return;
  }
  const [row] = await db
    .update(basisPermitsTable)
    .set({
      ...(body.type !== undefined && { type: body.type }),
      ...(body.documentNumber !== undefined && {
        documentNumber: body.documentNumber,
      }),
      ...(body.issuedDate !== undefined && {
        issuedDate: body.issuedDate
          ? body.issuedDate.toISOString().slice(0, 10)
          : null,
      }),
      ...(body.validUntil !== undefined && {
        validUntil: body.validUntil
          ? body.validUntil.toISOString().slice(0, 10)
          : null,
      }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.notes !== undefined && { notes: body.notes }),
    })
    .where(eq(basisPermitsTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Perizinan dasar tidak ditemukan" });
    return;
  }
  const payload = serializeBasisPermit(row);
  UpdateBasisPermitResponse.parse(payload);
  res.json(payload);
});

router.delete("/basis-permits/:id", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { id } = DeleteBasisPermitParams.parse(req.params);
  if (!(await basisPermitBelongsToConsultant(id, consultantId))) {
    res.status(404).json({ error: "Perizinan dasar tidak ditemukan" });
    return;
  }
  const deleted = await db
    .delete(basisPermitsTable)
    .where(eq(basisPermitsTable.id, id))
    .returning({ id: basisPermitsTable.id });
  if (deleted.length === 0) {
    res.status(404).json({ error: "Perizinan dasar tidak ditemukan" });
    return;
  }
  res.status(204).send();
});

export default router;
