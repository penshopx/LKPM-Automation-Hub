import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db, creditLedgerTable } from "@workspace/db";
import {
  consumeCredit,
  refundCredit,
  getCreditState,
  type ResolvedPlan,
} from "./billing";

// A consultant id unique to this run so the ledger fixtures never collide with
// seeded/real data or with concurrent test runs.
const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const CONSULTANT = `test-billing-${suffix}`;

const FREE_PLAN: ResolvedPlan = {
  tier: "gratis",
  name: "Gratis",
  status: "none",
  maxCompanies: 1,
  monthlyCredits: 0,
  currentPeriodStart: null,
};

// An active subscription whose period started yesterday, granting 5 monthly
// allowance credits.
function activePlan(monthlyCredits: number): ResolvedPlan {
  const start = new Date();
  start.setDate(start.getDate() - 1);
  return {
    tier: "konsultan",
    name: "Konsultan",
    status: "active",
    maxCompanies: 25,
    monthlyCredits,
    currentPeriodStart: start,
  };
}

async function clearLedger(): Promise<void> {
  await db
    .delete(creditLedgerTable)
    .where(eq(creditLedgerTable.consultantId, CONSULTANT));
}

beforeEach(clearLedger);
afterAll(clearLedger);

describe("credit metering", () => {
  it("free plan with no top-up cannot consume a credit", async () => {
    const res = await consumeCredit(CONSULTANT, FREE_PLAN);
    expect(res.ok).toBe(false);
    expect(res.bucket).toBeNull();

    const state = await getCreditState(CONSULTANT, FREE_PLAN);
    expect(state.available).toBe(0);
  });

  it("draws from the monthly allowance before the top-up balance", async () => {
    const plan = activePlan(2);
    // Give the consultant a top-up balance too, so we can prove allowance wins.
    await db
      .insert(creditLedgerTable)
      .values({ consultantId: CONSULTANT, amount: 3, bucket: "topup", reason: "beli" });

    const before = await getCreditState(CONSULTANT, plan);
    expect(before.allowanceTotal).toBe(2);
    expect(before.allowanceRemaining).toBe(2);
    expect(before.topupBalance).toBe(3);
    expect(before.available).toBe(5);

    const first = await consumeCredit(CONSULTANT, plan);
    expect(first.ok).toBe(true);
    expect(first.bucket).toBe("allowance");

    const second = await consumeCredit(CONSULTANT, plan);
    expect(second.ok).toBe(true);
    expect(second.bucket).toBe("allowance");

    // Allowance now exhausted; the third draw must fall back to top-up.
    const third = await consumeCredit(CONSULTANT, plan);
    expect(third.ok).toBe(true);
    expect(third.bucket).toBe("topup");

    const after = await getCreditState(CONSULTANT, plan);
    expect(after.allowanceRemaining).toBe(0);
    expect(after.topupBalance).toBe(2);
    expect(after.available).toBe(2);
  });

  it("falls back to top-up when the plan grants no allowance", async () => {
    await db
      .insert(creditLedgerTable)
      .values({ consultantId: CONSULTANT, amount: 1, bucket: "topup", reason: "beli" });

    const res = await consumeCredit(CONSULTANT, FREE_PLAN);
    expect(res.ok).toBe(true);
    expect(res.bucket).toBe("topup");

    const state = await getCreditState(CONSULTANT, FREE_PLAN);
    expect(state.available).toBe(0);

    // No credit left: the next attempt fails.
    const next = await consumeCredit(CONSULTANT, FREE_PLAN);
    expect(next.ok).toBe(false);
  });

  it("refunds a consumed credit back to its bucket", async () => {
    const plan = activePlan(1);
    const charge = await consumeCredit(CONSULTANT, plan);
    expect(charge.ok).toBe(true);
    expect(charge.bucket).toBe("allowance");

    let state = await getCreditState(CONSULTANT, plan);
    expect(state.allowanceRemaining).toBe(0);

    await refundCredit(CONSULTANT, charge.bucket!);

    state = await getCreditState(CONSULTANT, plan);
    expect(state.allowanceRemaining).toBe(1);
    expect(state.available).toBe(1);
  });

  it("ignores allowance usage from before the current billing period", async () => {
    const plan = activePlan(3);
    // A consumption stamped before the period start must not count against the
    // current allowance.
    const old = new Date(plan.currentPeriodStart!);
    old.setDate(old.getDate() - 10);
    await db.insert(creditLedgerTable).values({
      consultantId: CONSULTANT,
      amount: -1,
      bucket: "allowance",
      reason: "periode lalu",
      createdAt: old,
    });

    const state = await getCreditState(CONSULTANT, plan);
    expect(state.allowanceRemaining).toBe(3);
  });
});
