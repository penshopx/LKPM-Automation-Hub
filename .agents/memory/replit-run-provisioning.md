---
name: Replit run provisioning (AI + Auth)
description: What a code import can't carry into a fresh Replit workspace, and how this app's AI/auth/run wiring is set up.
---

# Running LKPM-Flow natively on Replit

A code import/clone brings the source but NOT per-workspace provisioned credentials.
Two things must be enabled in each new workspace and cannot be copied from code:

- **AI (Gemini)** — either enable the Replit AI Integrations Gemini blueprint (sets
  `AI_INTEGRATIONS_GEMINI_BASE_URL` / `AI_INTEGRATIONS_GEMINI_API_KEY`, billed to
  credits, no personal key) OR provide a raw `GEMINI_API_KEY` secret.
- **Auth (Clerk)** — Replit-managed Auth must be turned on in the workspace Auth
  pane (Tools → Auth). That auto-creates `CLERK_SECRET_KEY`,
  `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`. There is NO agent tool to
  provision these — it is a manual user step. Frontend `App.tsx` throws at module
  load without `VITE_CLERK_PUBLISHABLE_KEY` (white screen until Auth is on).

**AI client convention:** `artifacts/api-server/src/lib/ai.ts` prefers
`AI_INTEGRATIONS_GEMINI_*` and falls back to `GEMINI_API_KEY`, wiring the
`@google/genai` client's `httpOptions.baseUrl` only when the integration base URL
is present. Keep this fallback order so both provisioning paths work.

**Run model:** this is a multi-artifact monorepo (API on 8080, web on 24225 under
the artifact orchestrator, path-routed). When the artifact orchestrator's native
workflows aren't registered in a given workspace, run as plain workflows instead:
API = `PORT=8080 pnpm --filter @workspace/api-server run dev` (console); web needs
`PORT`+`BASE_PATH` and a dev-only Vite `/api` proxy → `localhost:8080` (added to
`vite.config.ts`; it's a no-op under the artifact router and in production).

**Why:** newly-added secrets only reach freshly-spawned processes; a stale
workflow env snapshot won't see them (restart the workflow, or the whole repl if a
restart still can't see them).
