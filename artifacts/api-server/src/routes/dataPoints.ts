import { Router, type IRouter } from "express";
import { db, dataPointsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ListDataPointsParams,
  ListDataPointsResponse,
  CreateDataPointParams,
  CreateDataPointBody,
  CreateDataPointResponse,
  UpdateDataPointParams,
  UpdateDataPointBody,
  UpdateDataPointResponse,
  DeleteDataPointParams,
} from "@workspace/api-zod";
import type { DataPoint } from "@workspace/db";
import { getConsultantId } from "../middlewares/auth";
import {
  canAccessDataPoint,
  canAccessReport,
} from "../lib/ownership";

const router: IRouter = Router();

function serialize(row: DataPoint) {
  return {
    ...row,
    value: row.value === null ? null : Number(row.value),
  };
}

router.get("/reports/:reportId/data-points", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { reportId } = ListDataPointsParams.parse(req.params);
  if (!(await canAccessReport(reportId, consultantId))) {
    res.status(404).json({ error: "Laporan tidak ditemukan" });
    return;
  }
  const rows = await db
    .select()
    .from(dataPointsTable)
    .where(eq(dataPointsTable.reportId, reportId))
    .orderBy(dataPointsTable.id);
  res.json(ListDataPointsResponse.parse(rows.map(serialize)));
});

router.post("/reports/:reportId/data-points", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { reportId } = CreateDataPointParams.parse(req.params);
  if (!(await canAccessReport(reportId, consultantId))) {
    res.status(404).json({ error: "Laporan tidak ditemukan" });
    return;
  }
  const body = CreateDataPointBody.parse(req.body);
  const [row] = await db
    .insert(dataPointsTable)
    .values({
      reportId,
      category: body.category,
      label: body.label,
      fieldKey: body.fieldKey ?? null,
      value: body.value === undefined ? null : String(body.value),
      unit: body.unit ?? null,
      source: body.source ?? null,
      status: body.status,
      confidence: body.confidence,
      attribution: body.attribution ?? null,
    })
    .returning();
  res.status(201).json(CreateDataPointResponse.parse(serialize(row)));
});

router.patch("/data-points/:id", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { id } = UpdateDataPointParams.parse(req.params);
  if (!(await canAccessDataPoint(id, consultantId))) {
    res.status(404).json({ error: "Data point tidak ditemukan" });
    return;
  }
  const body = UpdateDataPointBody.parse(req.body);
  const [row] = await db
    .update(dataPointsTable)
    .set({
      ...(body.category !== undefined && { category: body.category }),
      ...(body.label !== undefined && { label: body.label }),
      ...(body.fieldKey !== undefined && { fieldKey: body.fieldKey }),
      ...(body.value !== undefined && { value: String(body.value) }),
      ...(body.unit !== undefined && { unit: body.unit }),
      ...(body.source !== undefined && { source: body.source }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.confidence !== undefined && { confidence: body.confidence }),
      ...(body.attribution !== undefined && { attribution: body.attribution }),
    })
    .where(eq(dataPointsTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Data point tidak ditemukan" });
    return;
  }
  res.json(UpdateDataPointResponse.parse(serialize(row)));
});

router.delete("/data-points/:id", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { id } = DeleteDataPointParams.parse(req.params);
  if (!(await canAccessDataPoint(id, consultantId))) {
    res.status(404).json({ error: "Data point tidak ditemukan" });
    return;
  }
  const deleted = await db
    .delete(dataPointsTable)
    .where(eq(dataPointsTable.id, id))
    .returning({ id: dataPointsTable.id });
  if (deleted.length === 0) {
    res.status(404).json({ error: "Data point tidak ditemukan" });
    return;
  }
  res.status(204).send();
});

export default router;
