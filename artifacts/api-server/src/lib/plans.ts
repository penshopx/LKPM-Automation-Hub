export type AccountRole = "konsultan" | "perusahaan";

/** Sentinel for "no limit" on number of companies a plan may manage. */
export const UNLIMITED = -1;

export const FREE_TIER = "gratis";
export const FREE_TIER_NAME = "Gratis";

/**
 * Entitlements for accounts without an active subscription. The Asisten
 * Penyusun (pendampingan AI) is metered by credits, so the free tier grants no
 * monthly credits — users buy a credit pack or subscribe to use it. All
 * anti-hallucination and manual features remain fully available on the free
 * tier; only automation quota is gated.
 */
export const FREE_LIMITS: Record<
  AccountRole,
  { maxCompanies: number; monthlyCredits: number }
> = {
  perusahaan: { maxCompanies: 1, monthlyCredits: 0 },
  konsultan: { maxCompanies: 1, monthlyCredits: 0 },
};
