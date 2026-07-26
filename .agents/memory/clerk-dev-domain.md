---
name: Clerk dev domain on Replit
description: How to make Clerk dev instances (pk_test_) work on Replit dev URLs — required steps and why proxy alone isn't enough.
---

# Clerk dev instance on Replit dev domain

## Rule
Clerk dev instances (`pk_test_*`) only allow `localhost` by default. Running on a Replit dev URL (`*.pike.replit.dev`) requires adding `https://*.pike.replit.dev` to the Clerk Dashboard → Configure → Restrictions → **Allowed web origins**. Without this, `POST /v1/dev_browser` returns 501 and Clerk fails to initialize.

**Why:** Clerk's backend validates that API calls from the proxy origin are from a recognized source. An unrecognized origin causes 501 on the `dev_browser` setup endpoint, which manifests as `SyntaxError: Unexpected end of JSON input` in `setupDevelopment`.

**How to apply:** Whenever this project is imported or run on a new Replit account/repl, add `https://*.pike.replit.dev` to Clerk's Allowed Web Origins. This wildcard covers all Replit dev sessions — no need to update per-repl.

## Current proxy setup
- `VITE_CLERK_PROXY_URL=/api/__clerk` (shared env var)
- `artifacts/api-server/src/middlewares/clerkProxyMiddleware.ts` routes `/api/__clerk/*` → `https://frontend-api.clerk.dev`
- In dev mode: proxy works for CDN assets (`/npm/*`) but skips `Clerk-Proxy-Url` + `Clerk-Secret-Key` headers (those headers trigger 501 for unregistered proxies)
- In prod mode: sends full proxy headers (requires the production domain configured in Clerk dashboard too)
