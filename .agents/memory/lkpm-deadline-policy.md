---
name: LKPM deadline policy
description: Current LKPM reporting deadline and the rule that reference content and seed data must stay consistent.
---

LKPM reporting deadline moved from the 10th to the **15th** of the reporting month, per **Perka BKPM No. 5 Tahun 2025** (effective 2 Oct 2025, replacing Perka BKPM 5/2021). Verified via web search before asserting.

**Why:** This app enforces an anti-hallucination / data-traceability doctrine — operational views (calendar, seed sample reports) and reference pages (regulation page) must not show contradictory deadlines. A prior change failed review because the regulation page said the 15th while seed/calendar still said the 10th.

**How to apply:** If the deadline policy changes again, update BOTH the reference content (regulation page) AND the seeded/sample deadlines (`scripts/src/seed.ts`) in the same change, then re-seed. Always verify the regulation against OSS/JDIH BKPM before asserting a specific date.
