import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";

/**
 * Ledger of AI "pendampingan" credits per consultant. Append-only.
 *
 * - amount > 0: a grant (top-up purchase). amount < 0: a consumption (or refund
 *   compensation when amount > 0 with reason "refund...").
 * - bucket: "allowance" entries are drawn against the monthly subscription quota
 *   (counted only within the current billing period); "topup" entries form a
 *   persistent purchased balance (grants minus consumptions).
 * - stripeRef: the Stripe Checkout Session id for purchased grants; UNIQUE so a
 *   purchase can be claimed at most once (idempotent top-up). NULL for
 *   consumption/refund rows.
 */
export const creditLedgerTable = pgTable(
  "credit_ledger",
  {
    id: serial("id").primaryKey(),
    consultantId: text("consultant_id").notNull(),
    amount: integer("amount").notNull(),
    bucket: text("bucket").notNull(),
    reason: text("reason").notNull(),
    stripeRef: text("stripe_ref").unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("credit_ledger_consultant_idx").on(t.consultantId)],
);

export type CreditLedgerEntry = typeof creditLedgerTable.$inferSelect;
export type InsertCreditLedgerEntry = typeof creditLedgerTable.$inferInsert;
