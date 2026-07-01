import { GoogleGenAI } from "@google/genai";

// Prefer Replit AI Integrations (Gemini access without a personal API key,
// billed to Replit credits). Falls back to a raw GEMINI_API_KEY if provided.
const integrationKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
const integrationBaseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
const apiKey = integrationKey ?? process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error(
    "Kredensial Gemini tidak ditemukan. Aktifkan integrasi AI Replit " +
      "(AI_INTEGRATIONS_GEMINI_API_KEY) atau setel GEMINI_API_KEY.",
  );
}

// Only route through the Replit integration endpoint when BOTH the integration
// key and its base URL are present. This prevents a mixed/misconfigured env
// (base URL set but integration key missing) from sending a raw GEMINI_API_KEY
// to the integration proxy — that path uses the standard Gemini endpoint.
const useIntegration = Boolean(integrationKey && integrationBaseUrl);

export const ai = new GoogleGenAI(
  useIntegration
    ? { apiKey, httpOptions: { baseUrl: integrationBaseUrl } }
    : { apiKey },
);

export const MODEL = "gemini-2.5-flash";

// Label maps live in labels.ts (no env side effects) so they can be imported by
// pure, testable modules without instantiating the AI client. Re-exported here
// to keep existing `from "../lib/ai"` imports working.
export {
  SCALE_LABELS,
  STATUS_LABELS,
  BASIS_PERMIT_TYPE_LABELS,
  BASIS_PERMIT_STATUS_LABELS,
} from "./labels";
