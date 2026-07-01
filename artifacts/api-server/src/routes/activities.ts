import { Router, type IRouter } from "express";
import { db, activitiesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  ListActivitiesParams,
  ListActivitiesResponse,
  CreateActivityParams,
  CreateActivityBody,
  CreateActivityResponse,
} from "@workspace/api-zod";
import { getConsultantId } from "../middlewares/auth";
import { canAccessReport } from "../lib/ownership";

const router: IRouter = Router();

router.get("/reports/:reportId/activities", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { reportId } = ListActivitiesParams.parse(req.params);
  if (!(await canAccessReport(reportId, consultantId))) {
    res.status(404).json({ error: "Laporan tidak ditemukan" });
    return;
  }
  const rows = await db
    .select()
    .from(activitiesTable)
    .where(eq(activitiesTable.reportId, reportId))
    .orderBy(desc(activitiesTable.createdAt));
  res.json(ListActivitiesResponse.parse(rows));
});

router.post("/reports/:reportId/activities", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { reportId } = CreateActivityParams.parse(req.params);
  if (!(await canAccessReport(reportId, consultantId))) {
    res.status(404).json({ error: "Laporan tidak ditemukan" });
    return;
  }
  const body = CreateActivityBody.parse(req.body);
  const [row] = await db
    .insert(activitiesTable)
    .values({
      reportId,
      action: body.action,
      actor: body.actor,
      detail: body.detail ?? null,
    })
    .returning();
  res.status(201).json(CreateActivityResponse.parse(row));
});

export default router;
