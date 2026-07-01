---
name: Replit Mail for reminders
description: Why deadline-reminder email uses Replit Mail and its multi-tenant limitation
---

Deadline reminders are delivered in-app (notification center) + best-effort email.

**Decision:** Email uses Replit Mail (`artifacts/api-server/src/lib/replitmail.ts`) WITH an explicit `to` recipient set to the consultant's own address.

**Why:** Replit Mail's `/api/v2/mailer/send` DOES accept a `to` field (arbitrary recipient) — omitting it falls back to the repl owner, which is wrong for multi-tenant. The consultant's email isn't available server-side (Clerk is proxied, no backend user lookup; no consultant email table), so the frontend Settings page syncs `user.primaryEmailAddress` into `notificationPreferences.email`, and the scheduler sends `to` that stored address.

**How to apply:** In-app notifications are the source of truth (created only when `inAppEnabled`, with an `inApp` flag so email-only reminders never surface in the center even after re-enabling). Email is a best-effort digest of *newly created* rows, guarded by `isEmailAvailable()` AND a non-null `prefs.email`; if no per-consultant email is known, SKIP email rather than misdeliver to the owner. Failures are caught and never block in-app.
