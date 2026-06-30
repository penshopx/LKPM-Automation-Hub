// Defensive parsing of the model's draft reply for the fallback report-draft
// endpoint. The model is asked for a JSON object, but in practice it can return
// prose, a code-fenced block, a JSON primitive, `null`, or an array. Accessing
// properties on a parsed `null` would throw, so this normalizes every shape to
// a predictable object and NEVER throws.

export interface DraftFields {
  activityNarrative: string;
  constraintNarrative: string;
  dataNotes: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function parseDraftJson(text: string): DraftFields {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Not JSON at all: surface the raw text as the narrative so the user still
    // gets the model's output instead of an error.
    return { activityNarrative: text, constraintNarrative: "", dataNotes: "" };
  }

  if (!isRecord(parsed)) {
    // Valid JSON but not an object (null, array, string, number): fall back to
    // the raw text rather than crashing on property access.
    return { activityNarrative: text, constraintNarrative: "", dataNotes: "" };
  }

  return {
    activityNarrative: asString(parsed.activityNarrative),
    constraintNarrative: asString(parsed.constraintNarrative),
    dataNotes: asString(parsed.dataNotes),
  };
}
