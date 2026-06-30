---
name: Date serialization and zod version in api-server
description: Two non-obvious traps when serializing API responses in this Express+Drizzle+Orval stack.
---

## Drizzle `date` columns + Zod `coerce.date()` mutate date-only values

Drizzle `date` columns return `YYYY-MM-DD` strings. The generated response schemas use `coerce.date()`, so `Schema.parse(payload)` turns those strings into `Date` objects, and `res.json` then emits a full ISO datetime — violating an OpenAPI `format: date` field.

**Rule:** validate-then-send-original. Call `Schema.parse(payload)` only to validate (discard the result), then `res.json(payload)` with the un-coerced object.

**Why:** keeps date-only fields (e.g. `deadline`) as `YYYY-MM-DD` per contract while still failing loud on invalid shapes.

**How to apply:** any route returning a `date`-typed field (reports list/create/get/update, dashboard calendar). Numeric/`createdAt` fields are unaffected.

## Generated `@workspace/api-zod` schemas run on Zod v3

The Orval-generated schemas resolve Zod **v3** at runtime (stack traces show `zod/v3/types.js`), even though hand-written schemas may `import "zod/v4"`. A global error handler that does `err instanceof ZodError` from `zod/v4` will NOT catch parse errors thrown by generated schemas.

**Rule:** detect Zod errors by `err?.name === "ZodError"`, not `instanceof`.

**How to apply:** the JSON error-handling middleware in `artifacts/api-server/src/app.ts` returns 400 for `name === "ZodError"`, else 500 — avoids leaking HTML stack traces on bad path params/body.
