import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  GetCurrentUserResponse,
  SetCurrentUserRoleBody,
} from "@workspace/api-zod";
import { getConsultantId } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/me", async (req, res) => {
  const userId = getConsultantId(req);
  const [row] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.userId, userId));
  res.json(GetCurrentUserResponse.parse({ role: row?.role ?? null }));
});

router.post("/me/role", async (req, res) => {
  const userId = getConsultantId(req);
  const body = SetCurrentUserRoleBody.parse(req.body);
  // Peran hanya ditetapkan sekali; bila sudah ada, peran lama dipertahankan.
  await db
    .insert(usersTable)
    .values({ userId, role: body.role })
    .onConflictDoNothing({ target: usersTable.userId });
  const [row] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.userId, userId));
  res.json(GetCurrentUserResponse.parse({ role: row?.role ?? null }));
});

export default router;
