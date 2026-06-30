import { STATUS_LABELS } from "./labels";

// Minimum confidence (0-100) a data point must have to pass the gate.
export const MIN_CONFIDENCE = 60;

// Verification statuses considered trustworthy enough to use in a narrative.
export const ACCEPTED_STATUSES: ReadonlySet<string> = new Set([
  "terverifikasi",
  "pernyataan_mandiri",
]);

// The minimal shape the gate needs to evaluate a data point.
export interface GateDataPoint {
  id: number;
  label: string;
  source: string | null;
  status: string;
  confidence: number;
}

export interface GateFailure<T extends GateDataPoint> {
  dp: T;
  reason: string;
}

export interface GateResult<T extends GateDataPoint> {
  validated: T[];
  failures: GateFailure<T>[];
}

// Returns a human-readable Indonesian reason string when a data point fails the
// anti-hallucination gate, or null when it passes. This is the single source of
// truth for the gate rule: a data point is usable ONLY if it has a non-empty
// source AND an accepted verification status AND confidence >= MIN_CONFIDENCE.
export function gateFailureReason(dp: GateDataPoint): string | null {
  const reasons: string[] = [];
  if (!dp.source || dp.source.trim() === "") {
    reasons.push("sumber data belum dicantumkan");
  }
  if (!ACCEPTED_STATUSES.has(dp.status)) {
    reasons.push(
      `status masih "${STATUS_LABELS[dp.status] ?? dp.status}" (perlu Terverifikasi atau Pernyataan mandiri)`,
    );
  }
  if (dp.confidence < MIN_CONFIDENCE) {
    reasons.push(
      `tingkat keyakinan ${dp.confidence} di bawah ambang ${MIN_CONFIDENCE}`,
    );
  }
  return reasons.length ? reasons.join("; ") : null;
}

// Deterministically partitions data points into those that pass the gate and
// those that fail. The LLM is never consulted here — this is the structural
// anti-hallucination guarantee.
export function evaluateGate<T extends GateDataPoint>(
  dataPoints: T[],
): GateResult<T> {
  const validated: T[] = [];
  const failures: GateFailure<T>[] = [];
  for (const dp of dataPoints) {
    const reason = gateFailureReason(dp);
    if (reason === null) {
      validated.push(dp);
    } else {
      failures.push({ dp, reason });
    }
  }
  return { validated, failures };
}

// A rejection entry the LLM validator may propose. It is advisory only: the LLM
// may supply nicer wording for a point the gate ALREADY rejected, but it can
// never add, remove, or promote a point.
export interface ValidatorLlmRejection {
  id: number;
  label?: string;
  reason?: string;
}

export interface ReconciledRejection {
  id: number;
  label: string;
  reason: string;
}

// Reconciles the deterministic gate failures with the LLM validator's optional
// reword. This is the orchestration-layer half of the anti-hallucination
// guarantee: the returned list has EXACTLY one entry per gate failure (in gate
// order), and the LLM's wording is used only for points the gate already
// rejected. An LLM attempt to reject a validated point, or to invent an id not
// present in the data, is ignored — it can never alter the gate's decision.
export function reconcileRejections<T extends GateDataPoint>(
  dataPoints: T[],
  gate: GateResult<T>,
  llmRejected: ValidatorLlmRejection[] | undefined,
  rejectedValues: (string | null | undefined)[] = [],
): ReconciledRejection[] {
  const idSet = new Set(dataPoints.map((dp) => dp.id));
  const usableSet = new Set(gate.validated.map((dp) => dp.id));
  const forbidden = normalizeForbidden(rejectedValues);

  const llmReasonById = new Map<number, string>();
  for (const r of llmRejected ?? []) {
    // Accept LLM wording only for a real id the gate already rejected.
    if (idSet.has(r.id) && !usableSet.has(r.id) && r.reason?.trim()) {
      const reason = r.reason.trim();
      // ...and never if that wording smuggles a rejected raw value (possibly a
      // DIFFERENT point's value) through the reason free-text. Fall back to the
      // deterministic reason in that case.
      if (!leaksForbidden(reason, forbidden)) {
        llmReasonById.set(r.id, reason);
      }
    }
  }

  return gate.failures.map((g) => ({
    id: g.dp.id,
    label: g.dp.label,
    // The deterministic reason is authoritative; LLM wording is only an
    // optional, more readable restatement.
    reason: llmReasonById.get(g.dp.id) ?? `Perlu dilengkapi: ${g.reason}`,
  }));
}

// Deterministic fallback used when the validator's free-text summary cannot be
// trusted because it embedded a rejected data point's raw value.
export const SANITIZED_VALIDATOR_SUMMARY =
  "Ringkasan validasi dari agen tidak ditampilkan karena memuat nilai data yang ditolak. Lihat daftar data yang perlu dilengkapi.";

// Generic fallback used when ANY other agent free-text channel (collector
// summary/inventory, compliance summary/notes, tenggat summary/recommendations)
// has to be dropped because it leaked a rejected raw value.
export const SANITIZED_AGENT_TEXT =
  "Bagian ini tidak ditampilkan karena memuat nilai data yang ditolak. Lihat daftar data yang perlu dilengkapi.";

// Normalizes a list of (possibly null) raw values into the non-empty, trimmed
// strings that must never appear in any LLM-authored free-text the orchestrator
// surfaces verbatim.
function normalizeForbidden(
  rejectedValues: (string | null | undefined)[],
): string[] {
  return rejectedValues.map((v) => (v ?? "").trim()).filter((v) => v.length > 0);
}

// Escapes a raw value so it can be embedded literally in a RegExp.
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Normalization is IN SCOPE for leak detection. A misbehaving agent must not be
// able to smuggle a rejected raw value through cosmetic reformatting, so before
// matching we neutralize three formatting tricks:
//   1. Casing      — "PT Maju" vs "pt maju"      (textual match is case-insensitive)
//   2. Whitespace  — "PT  Maju" vs "PT Maju"     (whitespace runs are collapsed)
//   3. Separators  — "1000000" vs "1.000.000"    (thousand separators stripped for numbers)
// Out of scope (documented limitations, to avoid FALSE positives that would blank
// clean drafts): space-separated digit groups ("1 000 000") are NOT merged into one
// number, because spaces also delimit unrelated numbers ("20 30"); and separator
// normalization for the digits embedded inside a mixed alphanumeric value is not
// applied (the value is matched textually with only case/whitespace normalization).

// Lowercases and collapses all whitespace runs to a single space so casing and
// spacing tricks cannot hide an alphabetic/mixed value.
function normalizeText(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ");
}

// A value is "numeric" when it is made up solely of digits and the separators a
// thousand/decimal format would use (".", ",", whitespace) and contains at least
// one digit. Such values are matched by canonical numeric equality, not as text.
function isNumericValue(value: string): boolean {
  return /[0-9]/.test(value) && /^[0-9.,\s]+$/.test(value);
}

// Reduces a formatted number to just its digits ("1.000.000" -> "1000000") so
// two spellings of the same number compare equal regardless of separators.
function canonicalDigits(s: string): string {
  return s.replace(/[^0-9]/g, "");
}

// True when the text contains a number token equal (ignoring "." / "," thousand
// separators) to the forbidden number. Tokens are maximal digit-and-separator
// runs, so whole-number boundaries are preserved: a rejected "20" does NOT match
// inside "1.020.000" (-> "1020000") or "3204", but DOES match "Rp1.000.000" when
// the rejected value is "1000000".
function numericLeak(text: string, value: string): boolean {
  const target = canonicalDigits(value);
  if (!target) return false;
  const tokens = text.match(/[0-9][0-9.,]*[0-9]|[0-9]/g) ?? [];
  return tokens.some((t) => canonicalDigits(t) === target);
}

// Whole-token textual match with case + whitespace normalization. Both the text
// and the value are lowercased and have their whitespace collapsed first, so
// "PT  Maju" leaks "pt maju". Boundary lookarounds keep it a whole-token match
// (so "maju" does not leak inside "majuapi").
function textualLeak(text: string, value: string): boolean {
  const normValue = normalizeText(value).trim();
  if (!normValue) return false;
  const pattern =
    boundaryBefore(normValue[0]) +
    escapeRegExp(normValue) +
    boundaryAfter(normValue[normValue.length - 1]);
  return new RegExp(pattern).test(normalizeText(text));
}

// Picks the left-boundary lookbehind for a forbidden value based on its first
// character. The goal is "whole token / numeric boundary" matching so a short
// rejected number ("20") is NOT detected inside an unrelated larger number
// ("2026", "120", "200") or word, while still catching it as a standalone
// token ("20", "Rp20", "(20)").
function boundaryBefore(firstChar: string): string {
  // Numeric value: only reject a digit immediately before (a digit would make
  // this part of a larger number). A letter before is a genuine boundary.
  if (/[0-9]/.test(firstChar)) return "(?<![0-9])";
  // Alphabetic value: reject any adjacent alphanumeric so it isn't a fragment
  // of a longer word/identifier.
  if (/[a-z]/i.test(firstChar)) return "(?<![0-9A-Za-z])";
  // Punctuation/symbol start is its own boundary; no lookbehind needed.
  return "";
}

// Mirror of `boundaryBefore` for the right edge, based on the last character.
function boundaryAfter(lastChar: string): string {
  if (/[0-9]/.test(lastChar)) return "(?![0-9])";
  if (/[a-z]/i.test(lastChar)) return "(?![0-9A-Za-z])";
  return "";
}

// True when `value` appears in `text` as a whole token rather than as a
// coincidental substring of a larger number or word. This is the core of the
// false-positive fix: naive `text.includes(value)` would blank a clean draft
// whose legitimate number merely contains a rejected value's digits.
function valueAppears(text: string, value: string): boolean {
  if (!value) return false;
  // Numbers are matched by canonical (separator-insensitive) equality; all other
  // values are matched textually with case + whitespace normalization. Both paths
  // keep whole-token boundaries so a clean draft is never blanked by a
  // coincidental fragment.
  return isNumericValue(value)
    ? numericLeak(text, value)
    : textualLeak(text, value);
}

// True when any forbidden raw value leaks into `text` as a whole token. Shared
// by every sanitization channel so behavior is identical across endpoints.
function leaksForbidden(text: string, forbidden: string[]): boolean {
  return forbidden.some((v) => valueAppears(text, v));
}

// Doctrine: NO agent free-text the orchestrator surfaces verbatim may carry a
// raw value the deterministic gate rejected. Structured channels (the rejection
// list, the usable set) are already locked down; this guards the prose ones.
// The validator LLM (and every other agent) may phrase its text, but if that
// text embeds any rejected raw value the WHOLE string is dropped — not merely
// redacted — because once it smuggles a forbidden value it cannot be trusted at
// all (it may also carry fabricated facts). Returns the trimmed original when
// clean, or `fallback` when it leaks.
export function sanitizeAgentText(
  text: string | null | undefined,
  rejectedValues: (string | null | undefined)[],
  fallback: string,
): { text: string; leaked: boolean } {
  const clean = (text ?? "").trim();
  if (!clean) return { text: "", leaked: false };

  const forbidden = normalizeForbidden(rejectedValues);
  const leaked = leaksForbidden(clean, forbidden);
  if (leaked) return { text: fallback, leaked: true };
  return { text: clean, leaked: false };
}

// Same doctrine for a list channel (tenggat recommendations): if ANY item leaks
// a rejected raw value the whole list is suspect (the agent is misbehaving), so
// it is replaced by a single safe fallback item rather than partially trusted.
export function sanitizeRecommendations(
  recommendations: (string | null | undefined)[] | undefined,
  rejectedValues: (string | null | undefined)[],
  fallback: string,
): { recommendations: string[]; leaked: boolean } {
  const items = (recommendations ?? [])
    .map((r) => (r ?? "").trim())
    .filter((r) => r.length > 0);
  const forbidden = normalizeForbidden(rejectedValues);
  const leaked = items.some((item) => leaksForbidden(item, forbidden));
  if (leaked) return { recommendations: [fallback], leaked: true };
  return { recommendations: items, leaked: false };
}

// Validator-summary-specific wrapper around `sanitizeAgentText` kept for its
// dedicated fallback wording and its `{ summary }`-shaped return.
export function sanitizeValidatorSummary(
  summary: string | null | undefined,
  rejectedValues: (string | null | undefined)[],
): { summary: string; leaked: boolean } {
  const { text, leaked } = sanitizeAgentText(
    summary,
    rejectedValues,
    SANITIZED_VALIDATOR_SUMMARY,
  );
  return { summary: text, leaked };
}
