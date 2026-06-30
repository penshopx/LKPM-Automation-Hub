import type { DataPoint } from "@workspace/api-client-react";

export type Scale = "mikro" | "kecil" | "menengah" | "besar";
export type Category = "investasi" | "tenaga_kerja" | "produksi" | "kewajiban";
export type FieldUnit = "IDR" | "orang" | "USD";

export interface OssField {
  key: string;
  category: Category;
  label: string;
  /** Friendly label for dialogs/readiness when `label` is an encoded key. */
  displayLabel?: string;
  unit: string;
  group: string;
  scales: Scale[];
  optional?: boolean;
  hint?: string;
}

export interface OssSection {
  id: string;
  no: number;
  title: string;
  description: string;
  category: Category;
  scales: Scale[];
}

export const ALL_SCALES: Scale[] = ["mikro", "kecil", "menengah", "besar"];

export const OSS_SECTIONS: OssSection[] = [
  {
    id: "investasi",
    no: 1,
    title: "Realisasi Penanaman Modal",
    description:
      "Akumulasi realisasi modal tetap dan modal kerja sampai akhir periode laporan.",
    category: "investasi",
    scales: ["mikro", "kecil", "menengah", "besar"],
  },
  {
    id: "tenaga_kerja",
    no: 2,
    title: "Realisasi Penggunaan Tenaga Kerja",
    description: "Jumlah tenaga kerja yang bekerja pada akhir periode laporan.",
    category: "tenaga_kerja",
    scales: ["mikro", "kecil", "menengah", "besar"],
  },
  {
    id: "produksi",
    no: 3,
    title: "Realisasi Produksi dan Ekspor",
    description:
      "Kapasitas, realisasi, dan nilai ekspor per jenis produk/jasa selama periode laporan (untuk skala menengah dan besar).",
    category: "produksi",
    scales: ["menengah", "besar"],
  },
  {
    id: "kewajiban",
    no: 4,
    title: "Realisasi Kewajiban Perusahaan",
    description:
      "Realisasi kewajiban kemitraan, TJSL/CSR, pengelolaan lingkungan, dan pelatihan tenaga kerja (untuk skala menengah dan besar).",
    category: "kewajiban",
    scales: ["menengah", "besar"],
  },
];

export const OSS_FIELDS: OssField[] = [
  // --- Investasi: Modal Tetap (besar/menengah, rincian) ---
  {
    key: "inv_tanah",
    category: "investasi",
    label: "Pembelian dan pematangan tanah",
    unit: "IDR",
    group: "Modal Tetap",
    scales: ["besar", "menengah"],
    hint: "Realisasi biaya perolehan dan pematangan tanah (kumulatif).",
  },
  {
    key: "inv_bangunan",
    category: "investasi",
    label: "Bangunan/Gedung",
    unit: "IDR",
    group: "Modal Tetap",
    scales: ["besar", "menengah"],
    hint: "Realisasi pembangunan/pembelian gedung dan konstruksi.",
  },
  {
    key: "inv_mesin",
    category: "investasi",
    label: "Mesin/Peralatan dan Suku Cadang",
    unit: "IDR",
    group: "Modal Tetap",
    scales: ["besar", "menengah"],
    hint: "Termasuk biaya pemasangan mesin dan suku cadang.",
  },
  {
    key: "inv_lain",
    category: "investasi",
    label: "Lain-lain (modal tetap)",
    unit: "IDR",
    group: "Modal Tetap",
    scales: ["besar", "menengah"],
    optional: true,
    hint: "Komponen modal tetap lain di luar tanah, bangunan, dan mesin.",
  },
  {
    key: "inv_modal_kerja",
    category: "investasi",
    label: "Modal Kerja",
    unit: "IDR",
    group: "Modal Kerja",
    scales: ["besar", "menengah"],
    hint: "Realisasi modal kerja untuk satu turn over.",
  },
  // --- Investasi: lump untuk mikro/kecil ---
  {
    key: "inv_modal_tetap_lump",
    category: "investasi",
    label: "Realisasi modal tetap",
    unit: "IDR",
    group: "Modal Tetap",
    scales: ["mikro", "kecil"],
    hint: "Total realisasi modal tetap (tanah, bangunan, mesin, lain-lain).",
  },
  {
    key: "inv_modal_kerja_lump",
    category: "investasi",
    label: "Realisasi modal kerja",
    unit: "IDR",
    group: "Modal Kerja",
    scales: ["mikro", "kecil"],
    hint: "Total realisasi modal kerja periode berjalan.",
  },

  // --- Tenaga Kerja ---
  {
    key: "tk_tki_l",
    category: "tenaga_kerja",
    label: "Tenaga Kerja Indonesia (laki-laki)",
    unit: "orang",
    group: "Tenaga Kerja Indonesia",
    scales: ["mikro", "kecil", "menengah", "besar"],
    hint: "Jumlah TKI laki-laki pada akhir periode.",
  },
  {
    key: "tk_tki_p",
    category: "tenaga_kerja",
    label: "Tenaga Kerja Indonesia (perempuan)",
    unit: "orang",
    group: "Tenaga Kerja Indonesia",
    scales: ["mikro", "kecil", "menengah", "besar"],
    hint: "Jumlah TKI perempuan pada akhir periode.",
  },
  {
    key: "tk_tka",
    category: "tenaga_kerja",
    label: "Tenaga Kerja Asing",
    unit: "orang",
    group: "Tenaga Kerja Asing",
    scales: ["menengah", "besar"],
    hint: "Jumlah TKA dengan IMTA aktif; isi 0 bila tidak ada.",
  },

  // --- Produksi & Ekspor: lihat PRODUKSI_METRICS (dinamis per jenis produk/jasa) ---

  // --- Kewajiban ---
  {
    key: "kw_kemitraan",
    category: "kewajiban",
    label: "Realisasi kemitraan",
    unit: "IDR",
    group: "Kewajiban",
    scales: ["menengah", "besar"],
    optional: true,
    hint: "Nilai realisasi kemitraan dengan UMK (bila diwajibkan).",
  },
  {
    key: "kw_tjsl",
    category: "kewajiban",
    label: "Realisasi TJSL/CSR",
    unit: "IDR",
    group: "Kewajiban",
    scales: ["menengah", "besar"],
    hint: "Nilai realisasi tanggung jawab sosial dan lingkungan.",
  },
  {
    key: "kw_lingkungan",
    category: "kewajiban",
    label: "Realisasi pengelolaan lingkungan",
    unit: "IDR",
    group: "Kewajiban",
    scales: ["menengah", "besar"],
    hint: "Realisasi biaya pemenuhan kewajiban pengelolaan lingkungan (UKL-UPL/AMDAL).",
  },
  {
    key: "kw_pelatihan",
    category: "kewajiban",
    label: "Pelatihan tenaga kerja Indonesia",
    unit: "orang",
    group: "Kewajiban",
    scales: ["menengah", "besar"],
    hint: "Jumlah TKI yang mengikuti pelatihan pada periode laporan.",
  },
];

// --- Produksi & Ekspor (dinamis, per jenis produk/jasa) ---
// Data point disimpan dengan label terenkode `${nama} :: ${metrik}` agar muat
// pada model data yang ada tanpa perubahan skema.
export const PRODUKSI_DELIM = " :: ";

export interface ProduksiMetric {
  key: string;
  label: string;
  unit: string;
  optional?: boolean;
  hint: string;
}

export const PRODUKSI_METRICS: ProduksiMetric[] = [
  {
    key: "Kapasitas",
    label: "Kapasitas Produksi",
    unit: "",
    hint: "Kapasitas produksi/jasa terpasang per tahun (sesuai satuan produk).",
  },
  {
    key: "Realisasi",
    label: "Realisasi Produksi",
    unit: "",
    hint: "Realisasi produksi/jasa selama periode laporan (sesuai satuan produk).",
  },
  {
    key: "Nilai Ekspor",
    label: "Nilai Ekspor",
    unit: "USD",
    optional: true,
    hint: "Nilai ekspor produk dalam USD; biarkan 0 bila tidak ada ekspor.",
  },
];

export function produksiEnabled(scale: Scale): boolean {
  return scale === "menengah" || scale === "besar";
}

export function parseProduk(
  label: string,
): { name: string; metric: string } | null {
  const idx = label.indexOf(PRODUKSI_DELIM);
  if (idx === -1) return null;
  const name = label.slice(0, idx).trim();
  const metric = label.slice(idx + PRODUKSI_DELIM.length).trim();
  if (!name || !metric) return null;
  return { name, metric };
}

export function encodeProdukLabel(name: string, metric: string): string {
  return `${name}${PRODUKSI_DELIM}${metric}`;
}

export interface ProdukGroup {
  name: string;
  /** keyed by metric key (Kapasitas/Realisasi/Nilai Ekspor) */
  metrics: Record<string, DataPoint | undefined>;
}

/** Group produksi data points (encoded labels) into one entry per jenis produk/jasa. */
export function produkGroups(dataPoints: DataPoint[]): ProdukGroup[] {
  const order: string[] = [];
  const map = new Map<string, ProdukGroup>();
  for (const dp of dataPoints) {
    if (dp.category !== "produksi") continue;
    const parsed = parseProduk(dp.label);
    if (!parsed) continue;
    if (!map.has(parsed.name)) {
      map.set(parsed.name, { name: parsed.name, metrics: {} });
      order.push(parsed.name);
    }
    map.get(parsed.name)!.metrics[parsed.metric] = dp;
  }
  return order.map((n) => map.get(n)!);
}

/** Satuan (unit) used for Kapasitas/Realisasi of a product, derived from existing rows. */
export function produkUnit(group: ProdukGroup): string {
  return (
    group.metrics["Kapasitas"]?.unit ||
    group.metrics["Realisasi"]?.unit ||
    ""
  );
}

export function sectionsForScale(scale: Scale): OssSection[] {
  return OSS_SECTIONS.filter((s) => s.scales.includes(scale));
}

export function fieldsForScale(scale: Scale): OssField[] {
  return OSS_FIELDS.filter((f) => f.scales.includes(scale));
}

export function fieldsForSection(sectionId: string, scale: Scale): OssField[] {
  return OSS_FIELDS.filter(
    (f) => f.category === sectionId && f.scales.includes(scale),
  );
}

export function groupsForSection(sectionId: string, scale: Scale): string[] {
  const groups: string[] = [];
  for (const f of fieldsForSection(sectionId, scale)) {
    if (!groups.includes(f.group)) groups.push(f.group);
  }
  return groups;
}

/**
 * Find an official OSS catalog field (for the given scale) whose category and
 * label match a custom entry. Comparison is trimmed and case-insensitive so we
 * can warn about near-collisions, not just byte-identical labels. Used by the
 * data point dialog to steer users away from duplicating an official field.
 */
export function findOfficialFieldMatch(
  category: string,
  label: string,
  scale: Scale,
): OssField | undefined {
  const normalize = (s: string) => s.trim().toLowerCase();
  const target = normalize(label);
  if (!target) return undefined;
  return fieldsForScale(scale).find(
    (f) => f.category === category && normalize(f.label) === target,
  );
}

/**
 * Normalize a label for fuzzy fallback matching: lowercased, punctuation
 * stripped, and whitespace collapsed. Used only for legacy data points that
 * have no `fieldKey` yet, so minor wording/capitalization/punctuation drift
 * does not push valid data into "Data Tambahan".
 */
export function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Resolve the data point bound to a catalog `field`, respecting an optional set
 * of already-taken ids (for one-to-one consumption). Match priority:
 *  1. stable `fieldKey` (authoritative — label edits never break it)
 *  2. exact category + label (only for points without a fieldKey)
 *  3. normalized category + label (fuzzy legacy fallback)
 * A data point carrying a different `fieldKey` is never claimed by label so
 * explicit bindings stay stable.
 */
function matchDataPoint(
  dataPoints: DataPoint[],
  field: OssField,
  taken?: Set<number>,
): DataPoint | undefined {
  const free = (dp: DataPoint) => !taken || !taken.has(dp.id);

  const byKey = dataPoints.find((dp) => dp.fieldKey === field.key && free(dp));
  if (byKey) return byKey;

  const byLabel = dataPoints.find(
    (dp) =>
      !dp.fieldKey &&
      dp.category === field.category &&
      dp.label === field.label &&
      free(dp),
  );
  if (byLabel) return byLabel;

  const target = normalizeLabel(field.label);
  return dataPoints.find(
    (dp) =>
      !dp.fieldKey &&
      dp.category === field.category &&
      normalizeLabel(dp.label) === target &&
      free(dp),
  );
}

export interface ProduksiSlotMatch {
  name: string;
  metric: string;
  /** Human-readable "<metrik> — <produk>" label for the colliding slot. */
  displayLabel: string;
}

/**
 * Detect a custom produksi entry that collides with an existing product/metric
 * slot. Produksi rows are stored with encoded labels (`nama :: metrik`) and are
 * not part of the static OSS catalog, so `findOfficialFieldMatch` cannot catch
 * them. We compare the candidate label against the produksi data points already
 * present (trimmed, case-insensitive) so manual entries don't create duplicates
 * that risk double-counting. `excludeId` skips the row being edited.
 */
export function findProduksiSlotMatch(
  category: string,
  label: string,
  dataPoints: DataPoint[],
  excludeId?: number,
): ProduksiSlotMatch | undefined {
  if (category !== "produksi") return undefined;
  const parsed = parseProduk(label);
  if (!parsed) return undefined;
  const normalize = (s: string) => s.trim().toLowerCase();
  const target = normalize(label);
  const existing = dataPoints.find(
    (dp) =>
      dp.id !== excludeId &&
      dp.category === "produksi" &&
      normalize(dp.label) === target,
  );
  if (!existing) return undefined;
  const metricLabel =
    PRODUKSI_METRICS.find(
      (m) => normalize(m.key) === normalize(parsed.metric),
    )?.label ?? parsed.metric;
  return {
    name: parsed.name,
    metric: parsed.metric,
    displayLabel: `${metricLabel} — ${parsed.name}`,
  };
}

export function findDataPoint(
  dataPoints: DataPoint[],
  field: OssField,
): DataPoint | undefined {
  return matchDataPoint(dataPoints, field);
}

/**
 * IDs of data points actually bound to a catalog slot for this scale.
 * Each catalog field consumes at most one data point (the one `findDataPoint`
 * resolves to), so duplicates sharing the same category+label are NOT consumed
 * and remain visible under "Data Tambahan".
 */
export function consumedDataPointIds(
  dataPoints: DataPoint[],
  scale: Scale,
): Set<number> {
  const consumed = new Set<number>();
  for (const field of fieldsForScale(scale)) {
    const dp = matchDataPoint(dataPoints, field, consumed);
    if (dp) consumed.add(dp.id);
  }
  // Dynamic produksi rows are owned by the Produksi section, but only the rows
  // that are actually rendered as a known metric slot (Kapasitas/Realisasi/Nilai
  // Ekspor) are consumed. Unknown metrics and duplicate rows for the same
  // product+metric stay visible under "Data Tambahan" so no data point is hidden.
  if (produksiEnabled(scale)) {
    const knownMetrics = new Set(PRODUKSI_METRICS.map((m) => m.key));
    for (const group of produkGroups(dataPoints)) {
      for (const key of knownMetrics) {
        const dp = group.metrics[key];
        if (dp) consumed.add(dp.id);
      }
    }
  }
  return consumed;
}

/**
 * Data points not bound to any catalog slot for the report's scale. Includes
 * non-catalog points AND extra duplicates of catalog fields, so no data point
 * is ever hidden from the UI.
 */
export function additionalDataPoints(
  dataPoints: DataPoint[],
  scale: Scale,
): DataPoint[] {
  const consumed = consumedDataPointIds(dataPoints, scale);
  return dataPoints.filter((dp) => !consumed.has(dp.id));
}

function sumGroup(
  dataPoints: DataPoint[],
  scale: Scale,
  sectionId: string,
  group: string,
): number {
  return fieldsForSection(sectionId, scale)
    .filter((f) => f.group === group)
    .reduce((acc, f) => {
      const dp = findDataPoint(dataPoints, f);
      return acc + (dp?.value ?? 0);
    }, 0);
}

export interface InvestmentTotals {
  modalTetap: number;
  modalKerja: number;
  jumlah: number;
}

export function computeInvestmentTotals(
  dataPoints: DataPoint[],
  scale: Scale,
): InvestmentTotals {
  const modalTetap = sumGroup(dataPoints, scale, "investasi", "Modal Tetap");
  const modalKerja = sumGroup(dataPoints, scale, "investasi", "Modal Kerja");
  return { modalTetap, modalKerja, jumlah: modalTetap + modalKerja };
}

export interface LaborTotals {
  tki: number;
  tka: number;
  total: number;
}

export function computeLaborTotals(
  dataPoints: DataPoint[],
  scale: Scale,
): LaborTotals {
  const tki = sumGroup(
    dataPoints,
    scale,
    "tenaga_kerja",
    "Tenaga Kerja Indonesia",
  );
  const tka = sumGroup(dataPoints, scale, "tenaga_kerja", "Tenaga Kerja Asing");
  return { tki, tka, total: tki + tka };
}

export const READINESS_CONFIDENCE_THRESHOLD = 70;

export interface ReadinessItem {
  field: OssField;
  dataPoint?: DataPoint;
  missing: boolean;
  noSource: boolean;
  unverified: boolean;
  lowConfidence: boolean;
}

export interface ReadinessReport {
  ready: boolean;
  total: number;
  okCount: number;
  items: ReadinessItem[];
  blocking: ReadinessItem[];
}

export function computeReadiness(
  dataPoints: DataPoint[],
  scale: Scale,
): ReadinessReport {
  const mandatory = fieldsForScale(scale).filter((f) => !f.optional);
  const items: ReadinessItem[] = mandatory.map((field) => {
    const dp = findDataPoint(dataPoints, field);
    const missing = !dp || dp.value == null;
    const noSource = !missing && !dp?.source;
    const unverified = !missing && dp?.status !== "terverifikasi";
    const lowConfidence =
      !missing && (dp?.confidence ?? 0) < READINESS_CONFIDENCE_THRESHOLD;
    return { field, dataPoint: dp, missing, noSource, unverified, lowConfidence };
  });
  items.push(...produksiReadinessItems(dataPoints, scale));
  const blocking = items.filter(
    (it) => it.missing || it.noSource || it.unverified || it.lowConfidence,
  );
  return {
    ready: blocking.length === 0,
    total: items.length,
    okCount: items.length - blocking.length,
    items,
    blocking,
  };
}

/**
 * Readiness for the dynamic Produksi section: at least one jenis produk/jasa is
 * required (menengah/besar), and each product's Kapasitas + Realisasi must be
 * filled, sourced, verified, and confident. Nilai Ekspor is optional.
 */
function produksiReadinessItems(
  dataPoints: DataPoint[],
  scale: Scale,
): ReadinessItem[] {
  if (!produksiEnabled(scale)) return [];
  const groups = produkGroups(dataPoints);
  if (groups.length === 0) {
    return [
      {
        field: {
          key: "prod_empty",
          category: "produksi",
          label: "Jenis produk/jasa",
          unit: "",
          group: "Produksi",
          scales: [scale],
          hint: "Tambahkan minimal satu jenis produk/jasa.",
        },
        dataPoint: undefined,
        missing: true,
        noSource: false,
        unverified: false,
        lowConfidence: false,
      },
    ];
  }
  const items: ReadinessItem[] = [];
  for (const g of groups) {
    for (const m of PRODUKSI_METRICS) {
      if (m.optional) continue;
      const dp = g.metrics[m.key];
      const missing = !dp || dp.value == null;
      const noSource = !missing && !dp?.source;
      const unverified = !missing && dp?.status !== "terverifikasi";
      const lowConfidence =
        !missing && (dp?.confidence ?? 0) < READINESS_CONFIDENCE_THRESHOLD;
      items.push({
        field: {
          key: `prod_${g.name}_${m.key}`,
          category: "produksi",
          label: `${g.name} — ${m.label}`,
          unit: m.unit,
          group: "Produksi",
          scales: [scale],
        },
        dataPoint: dp,
        missing,
        noSource,
        unverified,
        lowConfidence,
      });
    }
  }
  return items;
}

export function formatFieldValue(
  value: number | null | undefined,
  unit: FieldUnit | string | null | undefined,
): string {
  if (value == null) return "-";
  if (unit === "IDR") return `Rp ${value.toLocaleString("id-ID")}`;
  if (unit === "USD") return `USD ${value.toLocaleString("id-ID")}`;
  if (unit === "orang") return `${value.toLocaleString("id-ID")} orang`;
  return `${value.toLocaleString("id-ID")}${unit ? ` ${unit}` : ""}`;
}

export const categoryLabels: Record<string, string> = {
  investasi: "Investasi",
  tenaga_kerja: "Tenaga Kerja",
  produksi: "Produksi",
  kewajiban: "Kewajiban",
};

export const dataStatusLabels: Record<string, string> = {
  terverifikasi: "Terverifikasi",
  perlu_verifikasi: "Perlu Verifikasi",
  estimasi: "Estimasi",
};
