---
name: Billing & credit metering (Stripe monetization)
description: How plan resolution and credit consumption work, and the concurrency/authz rules that must hold.
---

# Billing & credits

LKPM-Flow monetizes via Stripe: subscription plans (Mandiri for perusahaan; Konsultan + Konsultan Pro for konsultan) plus one-time AI-pendampingan credit packs. Anti-hallucination and all manual features stay free; only quota (max companies) and automation (Asisten Penyusun orchestrator + report-draft) are gated.

**Free-tier gating is intentional, not a bug.** Free plan caps BOTH roles at 1 company (`FREE_LIMITS`), and grants 0 monthly credits — automation requires a subscription or a purchased credit pack. A free konsultan is therefore limited to one company until they upgrade.
**Why:** the whole point of monetization is to gate quota/automation; tests that assumed "konsultan = unlimited companies" had to change.

**Graceful degradation when Stripe is disconnected is a hard requirement.** `initStripe()` is non-fatal; `resolvePlan()` returns the free tier whenever there is no customer, no active sub, OR the `stripe.*` schema is absent (query wrapped in try/catch). The server must boot and serve free-tier behavior with Stripe unconnected.

**Credit consumption must be concurrency-safe.** `consumeCredit` reads an aggregate `SUM` then inserts `-1`; this is count-then-insert and is NOT safe on its own. It is made safe by a per-consultant `pg_advisory_xact_lock(hashtext(consultantId))` taken at the top of the transaction so concurrent requests for the same consultant serialize and cannot double-spend.
**How to apply:** any new credit/quota mutation that does read-then-write on the ledger must take the same advisory lock (or a DB-level invariant), or it can be raced.

**Never trust a client-supplied `priceId` at checkout.** `createCheckout` authorizes the requested price against the live Stripe product metadata: product `kind` must be `subscription`|`credit`, product/price must be active, and for subscriptions `metadata.role` must match the account role — else it returns `{ forbidden: true }` → route 403.
**Why:** without this a client could check out any active price in the account (wrong-role sub or unintended product).

**Claim idempotency:** top-up grants are keyed by `creditLedger.stripeRef` UNIQUE + `onConflictDoNothing`, and the claim re-verifies `session.metadata.consultantId` against the caller. Allowance vs topup are separate buckets; allowance usage is scoped to `plan.currentPeriodStart`.
