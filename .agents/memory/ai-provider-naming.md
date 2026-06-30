---
name: AI provider vs endpoint naming
description: Why the /anthropic API routes and *Anthropic* hooks are actually backed by Google Gemini
---

The two Agentic AI features ("Asisten Penyusun Laporan" draft + "Mentor LKPM" Socratic chat) are served by routes/hooks/schemas named `anthropic` (paths `/api/anthropic/*`, operationIds like `useListAnthropicConversations`, `getSendAnthropicMessageUrl`), but the backend implementation uses **Google Gemini 2.5 Flash** via `@google/genai` and `process.env.GEMINI_API_KEY`. The draft route lives at `/api/assistant/report-draft`.

**Why:** Provider was swapped from Anthropic to Gemini for cost (user: "cari yang paling murah"). The `anthropic` names were kept deliberately to avoid OpenAPI regen + frontend churn — renaming would cascade through generated hooks/Zod and every page. It is naming debt only, not a runtime defect.

**How to apply:** Do not assume Anthropic just because the code says so. To change the model, edit `MODEL`/the `GoogleGenAI` client in `artifacts/api-server/src/routes/anthropic.ts`. Use the user's own `GEMINI_API_KEY` (standard Google endpoint), NOT the Replit AI Integrations proxy (proxy was blocked by phone verification). The unused `@workspace/integrations-anthropic-ai` lib was deleted. If you ever do rename the paths, regenerate clients and update all frontend pages in lockstep.
