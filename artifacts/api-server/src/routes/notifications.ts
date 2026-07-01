import { Router, type IRouter } from "express";
import { db, notificationsTable } from "@workspace/db";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import {
  ListNotificationsResponse,
  MarkNotificationReadParams,
  MarkNotificationReadResponse,
  MarkAllNotificationsReadResponse,
  GetNotificationPreferencesResponse,
  UpdateNotificationPreferencesBody,
  UpdateNotificationPreferencesResponse,
} from "@workspace/api-zod";
import { getConsultantId } from "../middlewares/auth";
import {
  getPreferences,
  upsertPreferences,
  generateNotificationsForConsultant,
} from "../lib/notifications";

const router: IRouter = Router();

function serialize(row: typeof notificationsTable.$inferSelect) {
  return {
    id: row.id,
    reportId: row.reportId,
    type: row.type,
    title: row.title,
    body: row.body,
    deadline: row.deadline,
    read: row.readAt !== null,
    createdAt: row.createdAt,
  };
}

router.get("/notifications", async (req, res) => {
  const consultantId = getConsultantId(req);

  // Freshen reminders for this consultant so the notification center reflects
  // the current deadlines without waiting for the interval scheduler.
  await generateNotificationsForConsultant(consultantId).catch((err) => {
    req.log.warn({ err }, "Gagal menyegarkan pengingat tenggat.");
  });

  const prefs = await getPreferences(consultantId);
  // When in-app delivery is off, keep the center empty (email-only preference).
  if (!prefs.inAppEnabled) {
    res.json(ListNotificationsResponse.parse({ items: [], unreadCount: 0 }));
    return;
  }

  const rows = await db
    .select()
    .from(notificationsTable)
    .where(
      and(
        eq(notificationsTable.consultantId, consultantId),
        // Reminders generated while the in-app channel was off (email-only) are
        // never surfaced in the center, even after the channel is re-enabled.
        eq(notificationsTable.inApp, true),
      ),
    )
    .orderBy(desc(notificationsTable.createdAt))
    .limit(100);

  const unreadCount = rows.filter((r) => r.readAt === null).length;
  res.json(
    ListNotificationsResponse.parse({
      items: rows.map(serialize),
      unreadCount,
    }),
  );
});

router.post("/notifications/:id/read", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { id } = MarkNotificationReadParams.parse(req.params);

  const [updated] = await db
    .update(notificationsTable)
    .set({ readAt: sql`now()` })
    .where(
      and(
        eq(notificationsTable.id, id),
        eq(notificationsTable.consultantId, consultantId),
      ),
    )
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Notifikasi tidak ditemukan." });
    return;
  }
  res.json(MarkNotificationReadResponse.parse(serialize(updated)));
});

router.post("/notifications/read-all", async (req, res) => {
  const consultantId = getConsultantId(req);
  const updated = await db
    .update(notificationsTable)
    .set({ readAt: sql`now()` })
    .where(
      and(
        eq(notificationsTable.consultantId, consultantId),
        isNull(notificationsTable.readAt),
      ),
    )
    .returning({ id: notificationsTable.id });

  res.json(
    MarkAllNotificationsReadResponse.parse({ updated: updated.length }),
  );
});

router.get("/notification-preferences", async (req, res) => {
  const consultantId = getConsultantId(req);
  const prefs = await getPreferences(consultantId);
  res.json(GetNotificationPreferencesResponse.parse(prefs));
});

router.patch("/notification-preferences", async (req, res) => {
  const consultantId = getConsultantId(req);
  const body = UpdateNotificationPreferencesBody.parse(req.body);
  const prefs = await upsertPreferences(consultantId, body);
  res.json(UpdateNotificationPreferencesResponse.parse(prefs));
});

export default router;
