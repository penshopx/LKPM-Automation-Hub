import {
  pgTable,
  serial,
  text,
  numeric,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const companiesTable = pgTable("companies", {
  id: serial("id").primaryKey(),
  consultantId: text("consultant_id").notNull(),
  name: text("name").notNull(),
  nib: text("nib").notNull(),
  scale: text("scale").notNull(),
  operatingMode: text("operating_mode").notNull(),
  permitType: text("permit_type").notNull().default("nib"),
  ssStatus: text("ss_status").notNull().default("tidak_ada"),
  kbli: jsonb("kbli").$type<string[]>().notNull().default([]),
  capital: numeric("capital"),
  address: text("address"),
  picName: text("pic_name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Company = typeof companiesTable.$inferSelect;
export type InsertCompany = typeof companiesTable.$inferInsert;
