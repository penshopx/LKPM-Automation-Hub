---
name: Destructive migration guardrails
description: Never drop legacy/source columns in a data migration until the backfill is proven complete
---

# Destructive migration guardrails

A migration that backfills a new column from legacy column(s) and then drops the
legacy column(s) must drop them ONLY after asserting the backfill is 100% complete
(e.g. `SELECT count(*) ... WHERE new_col IS NULL` returns 0). If any row is still
unmapped, abort and roll back so the legacy mapping columns survive.

**Why:** In the Izin-elevation migration, the script dropped `reports.id_izin` /
`reports.company_id` unconditionally at the end — even when `reports.izin_id` backfill
was incomplete. That destroys the only source needed to re-map orphaned rows, and the
app joins then silently hide those reports. Idempotent + transactional is NOT enough;
the destructive step itself needs a completeness precondition.

**How to apply:** Structure backfill migrations as: create new schema → backfill →
**guard (count unmapped == 0, else throw)** → add FK/NOT NULL → drop legacy columns.
Also add the natural UNIQUE constraint (e.g. `UNIQUE(company_id, id_izin)`) so the
new entity can't get duplicate identities, and mirror it in the Drizzle schema with
the SAME constraint name so `db push` treats it as a no-op.
