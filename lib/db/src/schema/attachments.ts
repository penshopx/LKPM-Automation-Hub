import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { reportsTable } from "./reports";
import { izinTable } from "./izin";
import { basisPermitsTable } from "./basisPermits";

export const attachmentsTable = pgTable("attachments", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").references(() => reportsTable.id, {
    onDelete: "cascade",
  }),
  izinId: integer("izin_id").references(() => izinTable.id, {
    onDelete: "cascade",
  }),
  basisPermitId: integer("basis_permit_id").references(
    () => basisPermitsTable.id,
    { onDelete: "cascade" },
  ),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  objectPath: text("object_path").notNull(),
  uploadedBy: text("uploaded_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Attachment = typeof attachmentsTable.$inferSelect;
export type InsertAttachment = typeof attachmentsTable.$inferInsert;
