import {
  pgTable,
  serial,
  text,
  integer,
  date,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { reportsTable } from "./reports";

/**
 * In-app notifications per consultant. Currently used for LKPM deadline
 * reminders (upcoming and overdue).
 *
 * - dedupeKey makes reminder generation idempotent: a given reminder (e.g.
 *   "report 12 at H-7") is created at most once per consultant. The scheduler
 *   inserts with onConflictDoNothing against (consultantId, dedupeKey).
 * - emailedAt records when a best-effort reminder email was sent, so the same
 *   notification is not emailed twice.
 * - inApp records whether in-app delivery was enabled when the reminder was
 *   generated. Reminders generated while the in-app channel was off are stored
 *   (so they can still be emailed and remain deduped) but never surface in the
 *   notification center, even if the channel is re-enabled later.
 */
export const notificationsTable = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    consultantId: text("consultant_id").notNull(),
    reportId: integer("report_id").references(() => reportsTable.id, {
      onDelete: "cascade",
    }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    deadline: date("deadline"),
    dedupeKey: text("dedupe_key").notNull(),
    inApp: boolean("in_app").notNull().default(true),
    readAt: timestamp("read_at", { withTimezone: true }),
    emailedAt: timestamp("emailed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("notifications_consultant_idx").on(t.consultantId),
    uniqueIndex("notifications_consultant_dedupe_idx").on(
      t.consultantId,
      t.dedupeKey,
    ),
  ],
);

export type Notification = typeof notificationsTable.$inferSelect;
export type InsertNotification = typeof notificationsTable.$inferInsert;
