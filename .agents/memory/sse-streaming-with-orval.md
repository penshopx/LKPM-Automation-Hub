---
name: SSE streaming with Orval
description: How to consume server-sent-event streaming endpoints in this contract-first (OpenAPI/Orval) repo where generated hooks can't type a stream.
---

# SSE streaming with Orval

Orval generates a normal mutation hook for a streaming POST endpoint, but it
buffers the whole body and cannot expose the incremental stream. Do not use the
generated `use*` hook to consume an SSE response.

**Pattern that works:**
- Use the generated URL helper (e.g. `getSendAnthropicMessageUrl(id)`) for the
  path so you don't hardcode `/api/...`. The repo bakes `baseUrl: "/api"` into
  these helpers, and the frontend + API share an origin behind the proxy, so a
  plain relative `fetch()` to that URL works.
- Consume with `fetch()` + `res.body.getReader()` + `TextDecoder`, split the
  buffer on `\n\n` event boundaries, keep the trailing partial in the buffer,
  and `JSON.parse` each `data:` line inside its own try/catch (skip malformed
  chunks so one bad frame doesn't abort the stream).
- The generated request-body Zod schema (e.g. `SendAnthropicMessageBody`) is
  still useful for validating the POST body; only the *response* stream is the
  part Orval can't help with.

**Why:** Orval's react-query client has no streaming abstraction; trying to bend
the generated hook to stream wastes time. The URL helper keeps you contract-safe
without a hardcoded path.
