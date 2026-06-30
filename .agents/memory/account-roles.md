---
name: Account roles (konsultan vs perusahaan)
description: How the two-sided account-role model works and where it must be enforced.
---

# Account roles

LKPM-Flow serves two roles: `konsultan` (manages many client companies) and `perusahaan` (a single self-reporting company). Role is stored in the `users` table keyed by the Clerk `userId` (same value used as the ownership column `consultantId`).

**Ownership column naming:** `companies.consultantId` (and the cascade down to izin/reports/etc.) holds ANY owner's Clerk userId for BOTH roles — it was kept named `consultantId` to avoid churn. Do not assume it implies the consultant role.

**Single-company invariant for perusahaan** is enforced in `POST /companies` only (count existing == abort if >= 1).
**Why:** without this, a perusahaan account could manage multiple companies, breaking the self-reporting model.
**How to apply:** any NEW write path that can create a company for a user must replicate this check, or the invariant leaks.

**Null-role must be rejected on company creation.** A user with no `users` row (role null) is NOT treated as konsultan — `POST /companies` returns 409 "Pilih peran...".
**Why:** code review caught that defaulting null→konsultan let a client skip onboarding (`/me/role`) and bypass the perusahaan single-company limit entirely. Role-based limits are only safe if the role is required server-side, not just in the onboarding UI gate.
**How to apply:** enforce role server-side for any role-gated action; never rely on the frontend OnboardingGate alone (it defaults to konsultan on transient /me errors for UX only).

Known residual edge: the perusahaan single-company create check is count-then-insert and not transactional, so two concurrent creates could both pass. Low risk (same single user). The credit ledger has the same shape but is made safe with a per-consultant `pg_advisory_xact_lock` — see [billing-credits.md](billing-credits.md); apply the same pattern here if it ever matters.
