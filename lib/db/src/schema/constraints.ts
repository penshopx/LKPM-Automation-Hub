import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { reportsTable } from "./reports";

export const constraintsTable = pgTable("constraints", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id")
    .notNull()
    .references(() => reportsTable.id, { onDelete: "cascade" }),
  issue: text("issue").notNull(),
  followUp: text("follow_up"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Constraint = typeof constraintsTable.$inferSelect;
export type InsertConstraint = typeof constraintsTable.$inferInsert;
