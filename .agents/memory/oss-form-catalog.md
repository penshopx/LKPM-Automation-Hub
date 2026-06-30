---
name: OSS form catalog matching
description: How the LKPM simulator maps stored data points to the scale-aware OSS field catalog, and why nothing must be hidden.
---

The LKPM report simulator (`artifacts/lkpm-flow/src/lib/oss-form.ts`) renders a
scale-aware (mikro/kecil/menengah/besar) form mirroring the official OSS LKPM
form. The field catalog there is the single source of truth.

Data points now carry an optional persisted `fieldKey` (DB col `field_key`, in
the OpenAPI DataPoint/Input/Update schemas). Catalog binding (`matchDataPoint`
in `oss-form.ts`) resolves in priority order: (1) `fieldKey === field.key`
(authoritative), (2) exact `category + label` for points with no fieldKey,
(3) normalized `category + label` (`normalizeLabel`: lowercase, strip
punctuation, collapse whitespace) as a fuzzy legacy fallback. A point with a
*different* fieldKey is never claimed by label, so explicit bindings stay stable.

**Rule:** any data point NOT bound to a catalog slot must remain
visible/editable under "Data Tambahan". `additionalDataPoints` is computed by
*consumed IDs* (`consumedDataPointIds` uses the same `matchDataPoint`), each
catalog field consuming at most one point — duplicates and unmatched points
surface in Data Tambahan instead of silently disappearing.

**Why:** label-only matching was fragile — capitalization/wording/punctuation
drift pushed valid sourced data into Data Tambahan and broke subtotals/OSS
readiness. The dialog now persists `fieldKey` when saving a catalog field
(non-produksi), so future label edits never break the binding; the normalized
fallback covers legacy points until they're re-saved.

**How to apply:** produksi rows bind by encoded label (`name :: metric`), NOT
fieldKey — keep their fieldKey null. If you change the catalog, keep the
consumed-ID invariant AND mirror key/label/scales into the backfill copy in
`scripts/src/backfill-field-keys.ts` (run `pnpm --filter @workspace/scripts run
backfill-field-keys` to set fieldKey on pre-existing rows).
