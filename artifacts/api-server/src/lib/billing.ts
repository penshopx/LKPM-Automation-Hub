import type Stripe from "stripe";
import { db, usersTable, creditLedgerTable } from "@workspace/db";
import { eq, and, gte, sql } from "drizzle-orm";
import { getUncachableStripeClient } from "./stripeClient";
import {
  FREE_LIMITS,
  FREE_TIER,
  FREE_TIER_NAME,
  type AccountRole,
} from "./plans";

export interface ResolvedPlan {
  tier: string;
  name: string;
  status: "active" | "none";
  maxCompanies: number;
  monthlyCredits: number;
  currentPeriodStart: Date | null;
}

export interface CreditState {
  allowanceTotal: number;
  allowanceRemaining: number;
  topupBalance: number;
  available: number;
}

export type CreditBucket = "allowance" | "topup";

interface SubRow {
  status: string;
  current_period_start: number | null;
  name: string;
  metadata: Record<string, string> | null;
}

export async function getStripeCustomerId(
  consultantId: string,
): Promise<string | null> {
  const [u] = await db
    .select({ id: usersTable.stripeCustomerId })
    .from(usersTable)
    .where(eq(usersTable.userId, consultantId));
  return u?.id ?? null;
}

/**
 * Determine the consultant's current plan from the synced Stripe data. Returns
 * the free tier when there is no Stripe customer, no active subscription, or
 * when the Stripe schema is not yet present (integration not connected).
 */
export async function resolvePlan(
  consultantId: string,
  role: AccountRole | null,
): Promise<ResolvedPlan> {
  const freeLimits = role
    ? FREE_LIMITS[role]
    : { maxCompanies: 1, monthlyCredits: 0 };
  const free: ResolvedPlan = {
    tier: FREE_TIER,
    name: FREE_TIER_NAME,
    status: "none",
    maxCompanies: freeLimits.maxCompanies,
    monthlyCredits: freeLimits.monthlyCredits,
    currentPeriodStart: null,
  };

  const customerId = await getStripeCustomerId(consultantId);
  if (!customerId) return free;

  let rows: SubRow[];
  try {
    const result = await db.execute(sql`
      SELECT s.status AS status,
             s.current_period_start AS current_period_start,
             p.name AS name,
             p.metadata AS metadata
      FROM stripe.subscriptions s
      JOIN stripe.subscription_items si ON si.subscription = s.id
      JOIN stripe.prices pr ON pr.id = si.price
      JOIN stripe.products p ON p.id = pr.product
      WHERE s.customer = ${customerId}
        AND s.status IN ('active', 'trialing')
      ORDER BY s.created DESC
      LIMIT 1
    `);
    rows = result.rows as unknown as SubRow[];
  } catch {
    return free;
  }

  const sub = rows[0];
  if (!sub) return free;

  const meta = sub.metadata ?? {};
  const maxCompanies =
    meta.maxCompanies !== undefined
      ? Number(meta.maxCompanies)
      : free.maxCompanies;
  const monthlyCredits =
    meta.monthlyCredits !== undefined ? Number(meta.monthlyCredits) : 0;
  return {
    tier: meta.tier ?? "langganan",
    name: sub.name,
    status: "active",
    maxCompanies: Number.isNaN(maxCompanies) ? free.maxCompanies : maxCompanies,
    monthlyCredits: Number.isNaN(monthlyCredits) ? 0 : monthlyCredits,
    currentPeriodStart: sub.current_period_start
      ? new Date(sub.current_period_start * 1000)
      : null,
  };
}

export async function getCreditState(
  consultantId: string,
  plan: ResolvedPlan,
): Promise<CreditState> {
  const allowanceTotal = plan.monthlyCredits;
  let allowanceUsed = 0;
  if (plan.currentPeriodStart && allowanceTotal > 0) {
    const [r] = await db
      .select({
        used: sql<number>`COALESCE(-SUM(${creditLedgerTable.amount}), 0)::int`,
      })
      .from(creditLedgerTable)
      .where(
        and(
          eq(creditLedgerTable.consultantId, consultantId),
          eq(creditLedgerTable.bucket, "allowance"),
          gte(creditLedgerTable.createdAt, plan.currentPeriodStart),
        ),
      );
    allowanceUsed = Number(r?.used ?? 0);
  }
  const allowanceRemaining = Math.max(0, allowanceTotal - allowanceUsed);

  const [t] = await db
    .select({
      bal: sql<number>`COALESCE(SUM(${creditLedgerTable.amount}), 0)::int`,
    })
    .from(creditLedgerTable)
    .where(
      and(
        eq(creditLedgerTable.consultantId, consultantId),
        eq(creditLedgerTable.bucket, "topup"),
      ),
    );
  const topupBalance = Number(t?.bal ?? 0);

  return {
    allowanceTotal,
    allowanceRemaining,
    topupBalance,
    available: allowanceRemaining + topupBalance,
  };
}

/** Convenience: resolve plan + credit state and return the available total. */
export async function getCreditStateAvailable(
  consultantId: string,
): Promise<number> {
  const { getUserRole } = await import("./user");
  const role = await getUserRole(consultantId);
  const plan = await resolvePlan(consultantId, role);
  const state = await getCreditState(consultantId, plan);
  return state.available;
}

/**
 * Atomically consume one credit, drawing from the monthly allowance first and
 * the purchased top-up balance second. Returns which bucket was charged (for a
 * possible refund) or { ok: false } when no credit is available.
 */
export async function consumeCredit(
  consultantId: string,
  plan: ResolvedPlan,
  reason = "pendampingan AI",
): Promise<{ ok: boolean; bucket: CreditBucket | null }> {
  return db.transaction(async (tx) => {
    // Serialize concurrent consumption for this consultant so two in-flight
    // requests cannot both observe the same balance and double-spend. The lock
    // is held until the transaction commits/rolls back.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${consultantId}))`);

    let allowanceRemaining = 0;
    if (plan.currentPeriodStart && plan.monthlyCredits > 0) {
      const [r] = await tx
        .select({
          used: sql<number>`COALESCE(-SUM(${creditLedgerTable.amount}), 0)::int`,
        })
        .from(creditLedgerTable)
        .where(
          and(
            eq(creditLedgerTable.consultantId, consultantId),
            eq(creditLedgerTable.bucket, "allowance"),
            gte(creditLedgerTable.createdAt, plan.currentPeriodStart),
          ),
        );
      allowanceRemaining = Math.max(
        0,
        plan.monthlyCredits - Number(r?.used ?? 0),
      );
    }

    let bucket: CreditBucket | null = null;
    if (allowanceRemaining > 0) {
      bucket = "allowance";
    } else {
      const [t] = await tx
        .select({
          bal: sql<number>`COALESCE(SUM(${creditLedgerTable.amount}), 0)::int`,
        })
        .from(creditLedgerTable)
        .where(
          and(
            eq(creditLedgerTable.consultantId, consultantId),
            eq(creditLedgerTable.bucket, "topup"),
          ),
        );
      if (Number(t?.bal ?? 0) > 0) bucket = "topup";
    }

    if (!bucket) return { ok: false, bucket: null };
    await tx
      .insert(creditLedgerTable)
      .values({ consultantId, amount: -1, bucket, reason });
    return { ok: true, bucket };
  });
}

/** Compensate a previously consumed credit (e.g. after a fatal pipeline error). */
export async function refundCredit(
  consultantId: string,
  bucket: CreditBucket,
  reason = "refund pendampingan AI",
): Promise<void> {
  await db
    .insert(creditLedgerTable)
    .values({ consultantId, amount: 1, bucket, reason });
}

/**
 * Grant top-up credits for a completed one-time Checkout session. Verified
 * against the live Stripe API (not the synced tables, to avoid sync lag) and
 * idempotent via the UNIQUE stripeRef.
 */
export async function claimCheckoutCredits(
  consultantId: string,
  sessionId: string,
): Promise<{ granted: number }> {
  const stripe = await getUncachableStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.mode !== "payment") return { granted: 0 };
  const paid =
    session.payment_status === "paid" ||
    session.payment_status === "no_payment_required";
  if (!paid) return { granted: 0 };
  const meta = session.metadata ?? {};
  if (meta.consultantId !== consultantId) return { granted: 0 };
  const credits = Number(meta.credits ?? 0);
  if (!credits || Number.isNaN(credits)) return { granted: 0 };

  const inserted = await db
    .insert(creditLedgerTable)
    .values({
      consultantId,
      amount: credits,
      bucket: "topup",
      reason: "pembelian kredit pendampingan",
      stripeRef: session.id,
    })
    .onConflictDoNothing({ target: creditLedgerTable.stripeRef })
    .returning({ id: creditLedgerTable.id });

  return { granted: inserted.length ? credits : 0 };
}

async function ensureCustomer(
  consultantId: string,
  email?: string,
): Promise<string> {
  const existing = await getStripeCustomerId(consultantId);
  if (existing) return existing;
  const stripe = await getUncachableStripeClient();
  const customer = await stripe.customers.create({
    ...(email ? { email } : {}),
    metadata: { consultantId },
  });
  await db
    .update(usersTable)
    .set({ stripeCustomerId: customer.id })
    .where(eq(usersTable.userId, consultantId));
  return customer.id;
}

export async function createCheckout(
  consultantId: string,
  email: string | undefined,
  priceId: string,
  origin: string,
  role: AccountRole,
): Promise<{ url: string | null } | { forbidden: true }> {
  const stripe = await getUncachableStripeClient();
  const price = await stripe.prices.retrieve(priceId, { expand: ["product"] });
  const isSub = !!price.recurring;
  const product = price.product as Stripe.Product;

  // Authorize the requested price against our managed catalog: the client may
  // send any priceId, so never trust it. The product must be one of ours (a
  // known `kind`), active, and — for subscriptions — match the account's role.
  const meta = product.metadata ?? {};
  const kind = meta.kind ?? (isSub ? "subscription" : "credit");
  const managed = kind === "subscription" || kind === "credit";
  const active = product.active !== false && price.active !== false;
  const roleOk = kind !== "subscription" || !meta.role || meta.role === role;
  if (!managed || !active || !roleOk) return { forbidden: true };

  const customerId = await ensureCustomer(consultantId, email);
  const credits = meta.credits;

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: isSub ? "subscription" : "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/langganan/sukses?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/langganan`,
    metadata: { consultantId, ...(credits ? { credits } : {}) },
    ...(isSub
      ? {}
      : {
          payment_intent_data: {
            metadata: { consultantId, ...(credits ? { credits } : {}) },
          },
        }),
  });

  return { url: session.url };
}

export async function createPortal(
  consultantId: string,
  origin: string,
): Promise<{ url: string } | null> {
  const customerId = await getStripeCustomerId(consultantId);
  if (!customerId) return null;
  const stripe = await getUncachableStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/langganan`,
  });
  return { url: session.url };
}

export interface PlanPrice {
  priceId: string;
  unitAmount: number | null;
  currency: string;
  interval: string | null;
}

export interface PlanProduct {
  productId: string;
  name: string;
  description: string | null;
  kind: string;
  tier: string | null;
  role: string | null;
  maxCompanies: number | null;
  monthlyCredits: number | null;
  credits: number | null;
  prices: PlanPrice[];
}

interface PlanRow {
  product_id: string;
  name: string;
  description: string | null;
  metadata: Record<string, string> | null;
  price_id: string;
  unit_amount: number | null;
  currency: string;
  recurring: { interval?: string } | null;
}

export async function listPlans(): Promise<PlanProduct[]> {
  let rows: PlanRow[];
  try {
    const result = await db.execute(sql`
      SELECT p.id AS product_id, p.name AS name, p.description AS description,
             p.metadata AS metadata, pr.id AS price_id, pr.unit_amount AS unit_amount,
             pr.currency AS currency, pr.recurring AS recurring
      FROM stripe.products p
      JOIN stripe.prices pr ON pr.product = p.id
      WHERE p.active = true AND pr.active = true
      ORDER BY pr.unit_amount ASC NULLS LAST
    `);
    rows = result.rows as unknown as PlanRow[];
  } catch {
    return [];
  }

  const map = new Map<string, PlanProduct>();
  for (const r of rows) {
    const meta = r.metadata ?? {};
    const kind = meta.kind ?? (r.recurring ? "subscription" : "credit");
    if (kind !== "subscription" && kind !== "credit") continue;
    let prod = map.get(r.product_id);
    if (!prod) {
      prod = {
        productId: r.product_id,
        name: r.name,
        description: r.description ?? null,
        kind,
        tier: meta.tier ?? null,
        role: meta.role ?? null,
        maxCompanies:
          meta.maxCompanies !== undefined ? Number(meta.maxCompanies) : null,
        monthlyCredits:
          meta.monthlyCredits !== undefined
            ? Number(meta.monthlyCredits)
            : null,
        credits: meta.credits !== undefined ? Number(meta.credits) : null,
        prices: [],
      };
      map.set(r.product_id, prod);
    }
    prod.prices.push({
      priceId: r.price_id,
      unitAmount: r.unit_amount ?? null,
      currency: r.currency,
      interval: r.recurring?.interval ?? null,
    });
  }
  return Array.from(map.values());
}
