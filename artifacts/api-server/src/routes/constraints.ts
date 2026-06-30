import { Router, type IRouter } from "express";
import { db, constraintsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ListConstraintsParams,
  ListConstraintsResponse,
  CreateConstraintParams,
  CreateConstraintBody,
  CreateConstraintResponse,
  UpdateConstraintParams,
  UpdateConstraintBody,
  UpdateConstraintResponse,
  DeleteConstraintParams,
} from "@workspace/api-zod";
import { getConsultantId } from "../middlewares/auth";
import {
  constraintBelongsToConsultant,
  reportBelongsToConsultant,
} from "../lib/ownership";

const router: IRouter = Router();

router.get("/reports/:reportId/constraints", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { reportId } = ListConstraintsParams.parse(req.params);
  if (!(await reportBelongsToConsultant(reportId, consultantId))) {
    res.status(404).json({ error: "Laporan tidak ditemukan" });
    return;
  }
  const rows = await db
    .select()
    .from(constraintsTable)
    .where(eq(constraintsTable.reportId, reportId))
    .orderBy(constraintsTable.id);
  res.json(ListConstraintsResponse.parse(rows));
});

router.post("/reports/:reportId/constraints", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { reportId } = CreateConstraintParams.parse(req.params);
  if (!(await reportBelongsToConsultant(reportId, consultantId))) {
    res.status(404).json({ error: "Laporan tidak ditemukan" });
    return;
  }
  const body = CreateConstraintBody.parse(req.body);
  const [row] = await db
    .insert(constraintsTable)
    .values({
      reportId,
      issue: body.issue,
      followUp: body.followUp ?? null,
    })
    .returning();
  res.status(201).json(CreateConstraintResponse.parse(row));
});

router.patch("/constraints/:id", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { id } = UpdateConstraintParams.parse(req.params);
  if (!(await constraintBelongsToConsultant(id, consultantId))) {
    res.status(404).json({ error: "Kendala tidak ditemukan" });
    return;
  }
  const body = UpdateConstraintBody.parse(req.body);
  const [row] = await db
    .update(constraintsTable)
    .set({
      ...(body.issue !== undefined && { issue: body.issue }),
      ...(body.followUp !== undefined && { followUp: body.followUp }),
    })
    .where(eq(constraintsTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Kendala tidak ditemukan" });
    return;
  }
  res.json(UpdateConstraintResponse.parse(row));
});

router.delete("/constraints/:id", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { id } = DeleteConstraintParams.parse(req.params);
  if (!(await constraintBelongsToConsultant(id, consultantId))) {
    res.status(404).json({ error: "Kendala tidak ditemukan" });
    return;
  }
  const deleted = await db
    .delete(constraintsTable)
    .where(eq(constraintsTable.id, id))
    .returning({ id: constraintsTable.id });
  if (deleted.length === 0) {
    res.status(404).json({ error: "Kendala tidak ditemukan" });
    return;
  }
  res.status(204).send();
});

export default router;
