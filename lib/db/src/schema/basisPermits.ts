import {
  pgTable,
  serial,
  integer,
  text,
  date,
  timestamp,
} from "drizzle-orm/pg-core";
import { izinTable } from "./izin";

export const basisPermitsTable = pgTable("basis_permits", {
  id: serial("id").primaryKey(),
  izinId: integer("izin_id")
    .notNull()
    .references(() => izinTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  documentNumber: text("document_number"),
  issuedDate: date("issued_date"),
  validUntil: date("valid_until"),
  status: text("status").notNull().default("belum_ada"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type BasisPermit = typeof basisPermitsTable.$inferSelect;
export type InsertBasisPermit = typeof basisPermitsTable.$inferInsert;
