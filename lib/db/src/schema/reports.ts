import {
  pgTable,
  serial,
  integer,
  text,
  date,
  timestamp,
} from "drizzle-orm/pg-core";
import { izinTable } from "./izin";

export const reportsTable = pgTable("reports", {
  id: serial("id").primaryKey(),
  izinId: integer("izin_id")
    .notNull()
    .references(() => izinTable.id, { onDelete: "cascade" }),
  scale: text("scale").notNull(),
  periodType: text("period_type").notNull(),
  periodLabel: text("period_label").notNull(),
  year: integer("year").notNull(),
  deadline: date("deadline").notNull(),
  status: text("status").notNull().default("intake"),
  narrative: text("narrative"),
  ossReceipt: text("oss_receipt"),
  makerName: text("maker_name"),
  checkerName: text("checker_name"),
  approverName: text("approver_name"),
  makerId: text("maker_id"),
  checkerId: text("checker_id"),
  approverId: text("approver_id"),
  approvalStatus: text("approval_status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Report = typeof reportsTable.$inferSelect;
export type InsertReport = typeof reportsTable.$inferInsert;
