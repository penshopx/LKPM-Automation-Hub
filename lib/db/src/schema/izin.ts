import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";

export const izinTable = pgTable(
  "izin",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companiesTable.id, { onDelete: "cascade" }),
    idIzin: text("id_izin").notNull(),
    kbli: text("kbli"),
    scale: text("scale").notNull(),
    projectName: text("project_name"),
    projectLocation: text("project_location"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("izin_company_id_id_izin_unique").on(t.companyId, t.idIzin)],
);

export type Izin = typeof izinTable.$inferSelect;
export type InsertIzin = typeof izinTable.$inferInsert;
