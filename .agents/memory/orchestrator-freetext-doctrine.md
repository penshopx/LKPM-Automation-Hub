---
name: Orchestrator free-text anti-hallucination doctrine
description: Which LLM-authored free-text the LKPM orchestrator may surface, and how rejected raw values are kept out of every prose channel.
---

# Orchestrator free-text anti-hallucination doctrine

Rule: NO agent free-text the orchestrator surfaces verbatim may contain a raw
value of a data point the deterministic gate rejected. This covers the validator
summary, the reconciled rejection `reason` strings, the collector
`summary`/`inventory`, the compliance `summary` and per-section missing `note`,
and the tenggat `summary`/`recommendations`. Structured channels (the usable set,
the rejection list ids/labels) are already locked down by `evaluateGate` +
`reconcileRejections`.

**Why:** the gate only blocks rejected *structured* data; a prompt-injected or
misbehaving agent could smuggle an unverified number into the draft through prose
(one agent could even echo a *different* rejected point's value). Two prior tasks
each plugged one prose hole (validator summary, then the rest); the durable
lesson is to treat *every* verbatim LLM string as a potential bypass, not patch
them one at a time.

**How to apply:**
- Sanitize with `sanitizeAgentText` / `sanitizeRecommendations` (in `gate.ts`)
  against `gateFailures.map(g => g.dp.value)`. If a string leaks, the WHOLE
  string is dropped (replaced by a fallback), not redacted — once it embeds a
  forbidden value it can't be trusted at all.
- Evaluate the gate up-front (before the first agent's `done` event) so rejected
  raw values are known in time to sanitize the collector output too.
- Any NEW free-text field added to an agent's output must be sanitized before it
  reaches the SSE body, and covered by a route test in `orchestrator.test.ts`.
- The narasi (narrative) agent is gated differently: it is only ever *shown*
  validated data, so it has no rejected value to echo — it is intentionally not
  run through the value sanitizer.

**Normalization is in scope (so cosmetic reformatting can't bypass the leak
check):** `valueAppears` neutralizes three tricks before matching — casing
(case-insensitive textual match), whitespace (runs collapsed, so "PT  Maju" ==
"PT Maju"), and thousand separators on numbers ("1000000" matches "1.000.000" /
"1,000,000" by comparing separator-stripped digit tokens). Numeric values are
matched by canonical digit-equality per number token, NOT substring, so whole-
number boundaries still hold ("20" never leaks inside "1.020.000" or "3204").
Deliberately OUT of scope to avoid false positives that would blank clean drafts:
space-separated digit groups ("1 000 000") are not merged into one number (spaces
also separate unrelated numbers like "20 30").
