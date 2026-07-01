import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const teamMembersTable = pgTable("team_members", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  memberId: text("member_id"),
  email: text("email").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type TeamMember = typeof teamMembersTable.$inferSelect;
export type InsertTeamMember = typeof teamMembersTable.$inferInsert;
