import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY tidak ditemukan di environment");
}

export const ai = new GoogleGenAI({ apiKey });

export const MODEL = "gemini-2.5-flash";

// Label maps live in labels.ts (no env side effects) so they can be imported by
// pure, testable modules without instantiating the AI client. Re-exported here
// to keep existing `from "../lib/ai"` imports working.
export { SCALE_LABELS, STATUS_LABELS } from "./labels";
