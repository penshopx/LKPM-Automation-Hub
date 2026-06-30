import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { reportsTable } from "./reports";

export const activitiesTable = pgTable("activities", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id")
    .notNull()
    .references(() => reportsTable.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  actor: text("actor").notNull(),
  detail: text("detail"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Activity = typeof activitiesTable.$inferSelect;
export type InsertActivity = typeof activitiesTable.$inferInsert;
