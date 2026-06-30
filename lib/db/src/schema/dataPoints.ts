import {
  pgTable,
  serial,
  integer,
  text,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";
import { reportsTable } from "./reports";

export const dataPointsTable = pgTable("data_points", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id")
    .notNull()
    .references(() => reportsTable.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  label: text("label").notNull(),
  fieldKey: text("field_key"),
  value: numeric("value"),
  unit: text("unit"),
  source: text("source"),
  status: text("status").notNull().default("perlu_verifikasi"),
  confidence: integer("confidence").notNull().default(0),
  attribution: text("attribution"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type DataPoint = typeof dataPointsTable.$inferSelect;
export type InsertDataPoint = typeof dataPointsTable.$inferInsert;
