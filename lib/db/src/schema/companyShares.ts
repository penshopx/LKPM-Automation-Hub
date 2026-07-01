import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";

export const companySharesTable = pgTable(
  "company_shares",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companiesTable.id, { onDelete: "cascade" }),
    memberId: text("member_id").notNull(),
    ownerId: text("owner_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("company_shares_company_member_uq").on(t.companyId, t.memberId)],
);

export type CompanyShare = typeof companySharesTable.$inferSelect;
export type InsertCompanyShare = typeof companySharesTable.$inferInsert;
