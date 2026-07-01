import { z } from "zod";
import type { AgentKey } from "./agent-keys";

// Error thrown when an agent's JSON reply cannot be parsed or fails its schema.
// Carries the agent key so the orchestrator can emit a clear, per-agent SSE
// error instead of failing the whole pipeline with an opaque message.
export class AgentOutputError extends Error {
  constructor(
    public agent: AgentKey,
    message: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = "AgentOutputError";
  }
}

export const CollectorSchema = z.object({
  summary: z.string(),
  inventory: z.string(),
});

export const ValidatorSchema = z.object({
  rejected: z.array(
    z.object({
      id: z.number(),
      label: z.string(),
      reason: z.string(),
    }),
  ),
  summary: z.string(),
});

export const ComplianceSchema = z.object({
  status: z.string(),
  missing: z.array(
    z.object({
      section: z.string(),
      label: z.string(),
      note: z.string(),
    }),
  ),
  // Grounded deterministically in the orchestrator from the Izin's basis
  // permits; optional here so an LLM reply that omits it still parses.
  permits: z
    .array(
      z.object({
        type: z.string(),
        label: z.string(),
        status: z.string(),
        statusLabel: z.string(),
        expired: z.boolean(),
        issue: z.string(),
      }),
    )
    .optional(),
  summary: z.string(),
});

export const NarrativeSchema = z.object({
  activityNarrative: z.string(),
  constraintNarrative: z.string(),
});

export const DeadlineRiskSchema = z.object({
  riskLevel: z.string(),
  summary: z.string(),
  recommendations: z.array(z.string()),
});
