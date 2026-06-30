---
name: AI client import side effects
description: api-server lib/ai.ts throws at module load if GEMINI_API_KEY is missing — keep pure/testable logic out of its import graph
---

# AI client import side effects

`artifacts/api-server/src/lib/ai.ts` instantiates the Gemini client at module
load and throws `"GEMINI_API_KEY tidak ditemukan di environment"` if the env var
is missing. Any module that transitively imports it inherits that throw.

**Why:** unit tests (e.g. the anti-hallucination gate test) run without
`GEMINI_API_KEY`. If the code under test imports `ai.ts` (even just for a label
map), the test crashes at import time before any assertion runs.

**How to apply:** keep pure, testable logic (gate rules, label maps, schemas) in
side-effect-free modules (`lib/labels.ts`, `lib/gate.ts`, `lib/agent-keys.ts`,
`lib/agent-schemas.ts`). `ai.ts` may re-export those for back-compat, but the
pure modules must not import `ai.ts`.
