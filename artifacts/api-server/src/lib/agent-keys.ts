export type AgentKey =
  | "pengumpul"
  | "validator"
  | "kepatuhan"
  | "narasi"
  | "tenggat";

export const AGENT_LABELS: Record<AgentKey, string> = {
  pengumpul: "Agen Pengumpul Data",
  validator: "Agen Validator Anti-Halusinasi",
  kepatuhan: "Agen Pemeriksa Kepatuhan OSS",
  narasi: "Agen Penyusun Narasi",
  tenggat: "Agen Pemantau Tenggat & Risiko Sanksi",
};
