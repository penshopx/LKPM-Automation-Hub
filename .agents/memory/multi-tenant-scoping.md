---
name: Multi-tenant consultant scoping
description: Rule for keeping per-consultant data isolation airtight across all tables and routes
---

# Multi-tenant consultant scoping

Every table that holds consultant-owned data must carry a `consultantId` column, and
every route touching it must scope reads/writes/deletes by `getConsultantId(req)`,
returning 404 (not 403) on cross-consultant access so existence is not leaked.

**Why:** During the Clerk auth + isolation work, the core business tables (companies,
reports, dataPoints, constraints, activities, dashboard) were scoped, but the
`conversations`/`messages` tables (the AI mentor chat) were missed — they had no
`consultantId` and the endpoints authorized only by row id, an IDOR letting any
authenticated consultant read/delete/append to another consultant's conversations.
Auth-gating alone (requireAuth) is NOT isolation; a logged-in user is still a
potential attacker against other tenants' rows.

**How to apply:** When adding any new table or route, ask "does this hold tenant data?"
If yes: add `consultant_id text not null`, scope every query with
`and(eq(table.id, id), eq(table.consultantId, consultantId))`, and never trust an id
from params/body as sufficient authorization. Search routes for `eq(<table>.id` without
a companion consultant predicate to catch gaps.
