import { GoogleGenAI } from "@google/genai";

// Prefer Replit AI Integrations (Gemini access without a personal API key,
// billed to Replit credits). Falls back to a raw GEMINI_API_KEY if provided.
const baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
const apiKey =
  process.env.AI_INTEGRATIONS_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error(
    "Kredensial Gemini tidak ditemukan. Aktifkan integrasi AI Replit " +
      "(AI_INTEGRATIONS_GEMINI_API_KEY) atau setel GEMINI_API_KEY.",
  );
}

export const ai = new GoogleGenAI(
  baseUrl ? { apiKey, httpOptions: { baseUrl } } : { apiKey },
);

export const MODEL = "gemini-2.5-flash";

// Label maps live in labels.ts (no env side effects) so they can be imported by
// pure, testable modules without instantiating the AI client. Re-exported here
// to keep existing `from "../lib/ai"` imports working.
export { SCALE_LABELS, STATUS_LABELS } from "./labels";
