import { db, pool, reportsTable, dataPointsTable } from "@workspace/db";
import { eq, isNull, and } from "drizzle-orm";

type Scale = "mikro" | "kecil" | "menengah" | "besar";

/**
 * Mirror of the OSS field catalog in
 * `artifacts/lkpm-flow/src/lib/oss-form.ts` (OSS_FIELDS). Kept here as a small,
 * stable copy so this leaf script does not import the frontend artifact. If the
 * catalog changes, update both. Produksi rows are intentionally excluded — they
 * bind by encoded label, not by fieldKey.
 */
const CATALOG: {
  key: string;
  category: string;
  label: string;
  scales: Scale[];
}[] = [
  { key: "inv_tanah", category: "investasi", label: "Pembelian dan pematangan tanah", scales: ["besar", "menengah"] },
  { key: "inv_bangunan", category: "investasi", label: "Bangunan/Gedung", scales: ["besar", "menengah"] },
  { key: "inv_mesin", category: "investasi", label: "Mesin/Peralatan dan Suku Cadang", scales: ["besar", "menengah"] },
  { key: "inv_lain", category: "investasi", label: "Lain-lain (modal tetap)", scales: ["besar", "menengah"] },
  { key: "inv_modal_kerja", category: "investasi", label: "Modal Kerja", scales: ["besar", "menengah"] },
  { key: "inv_modal_tetap_lump", category: "investasi", label: "Realisasi modal tetap", scales: ["mikro", "kecil"] },
  { key: "inv_modal_kerja_lump", category: "investasi", label: "Realisasi modal kerja", scales: ["mikro", "kecil"] },
  { key: "tk_tki_l", category: "tenaga_kerja", label: "Tenaga Kerja Indonesia (laki-laki)", scales: ["mikro", "kecil", "menengah", "besar"] },
  { key: "tk_tki_p", category: "tenaga_kerja", label: "Tenaga Kerja Indonesia (perempuan)", scales: ["mikro", "kecil", "menengah", "besar"] },
  { key: "tk_tka", category: "tenaga_kerja", label: "Tenaga Kerja Asing", scales: ["menengah", "besar"] },
  { key: "kw_kemitraan", category: "kewajiban", label: "Realisasi kemitraan", scales: ["menengah", "besar"] },
  { key: "kw_tjsl", category: "kewajiban", label: "Realisasi TJSL/CSR", scales: ["menengah", "besar"] },
  { key: "kw_lingkungan", category: "kewajiban", label: "Realisasi pengelolaan lingkungan", scales: ["menengah", "besar"] },
  { key: "kw_pelatihan", category: "kewajiban", label: "Pelatihan tenaga kerja Indonesia", scales: ["menengah", "besar"] },
];

function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function resolveKey(
  category: string,
  label: string,
  scale: Scale,
): string | null {
  const candidates = CATALOG.filter(
    (f) => f.category === category && f.scales.includes(scale),
  );
  const exact = candidates.find((f) => f.label === label);
  if (exact) return exact.key;
  const target = normalizeLabel(label);
  const fuzzy = candidates.find((f) => normalizeLabel(f.label) === target);
  return fuzzy ? fuzzy.key : null;
}

async function backfill() {
  const reports = await db
    .select({ id: reportsTable.id, scale: reportsTable.scale })
    .from(reportsTable);

  let updated = 0;
  let skipped = 0;

  for (const report of reports) {
    const rows = await db
      .select()
      .from(dataPointsTable)
      .where(
        and(
          eq(dataPointsTable.reportId, report.id),
          isNull(dataPointsTable.fieldKey),
        ),
      );

    for (const dp of rows) {
      const key = resolveKey(dp.category, dp.label, report.scale as Scale);
      if (!key) {
        skipped++;
        continue;
      }
      await db
        .update(dataPointsTable)
        .set({ fieldKey: key })
        .where(eq(dataPointsTable.id, dp.id));
      updated++;
    }
  }

  console.log(
    `Backfill selesai: ${updated} data point dipetakan, ${skipped} dilewati (non-katalog/produksi).`,
  );
}

backfill()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(err);
    await pool.end();
    process.exit(1);
  });
