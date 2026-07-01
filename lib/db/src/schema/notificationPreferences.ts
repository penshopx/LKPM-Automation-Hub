import { pgTable, text, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";

/**
 * Per-consultant notification preferences. A missing row means "defaults"
 * (reminders on, both channels on, H-7/H-3/H-1). Rows are upserted on first
 * write from the Settings page.
 *
 * - enabled: master switch for deadline reminders.
 * - inAppEnabled / emailEnabled: delivery channels.
 * - reminderLeadDays: lead-day thresholds (e.g. [7, 3, 1]) at which upcoming
 *   deadlines produce a reminder.
 * - email: the consultant's own address, synced from the signed-in profile so
 *   reminder emails are delivered to the consultant (not the repl owner). Null
 *   until first synced; email delivery is skipped while null.
 */
export const notificationPreferencesTable = pgTable("notification_preferences", {
  consultantId: text("consultant_id").primaryKey(),
  enabled: boolean("enabled").notNull().default(true),
  inAppEnabled: boolean("in_app_enabled").notNull().default(true),
  emailEnabled: boolean("email_enabled").notNull().default(true),
  email: text("email"),
  reminderLeadDays: jsonb("reminder_lead_days")
    .$type<number[]>()
    .notNull()
    .default([7, 3, 1]),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type NotificationPreferences =
  typeof notificationPreferencesTable.$inferSelect;
export type InsertNotificationPreferences =
  typeof notificationPreferencesTable.$inferInsert;
