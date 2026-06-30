import { pool } from "@workspace/db";

// Migrasi data-aman: menaikkan "Izin" menjadi entitas tersendiri.
// Sebelum: kolom teks reports.id_izin + reports.company_id.
// Sesudah: tabel izin (per company_id + id_izin) dan reports.izin_id.
//
// Idempoten: aman dijalankan berkali-kali. Setiap langkah dijaga dengan
// IF EXISTS / IF NOT EXISTS sehingga tidak ada laporan yang hilang.
async function migrate() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Tabel izin.
    await client.query(`
      CREATE TABLE IF NOT EXISTS izin (
        id serial PRIMARY KEY,
        company_id integer NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        id_izin text NOT NULL,
        kbli text,
        scale text NOT NULL,
        project_name text,
        project_location text,
        created_at timestamp with time zone NOT NULL DEFAULT now()
      )
    `);

    // Apakah kolom lama masih ada? Jika ya, migrasikan datanya.
    const { rows: legacyCols } = await client.query<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'reports' AND column_name IN ('company_id', 'id_izin')
    `);
    const hasCompanyId = legacyCols.some((c) => c.column_name === "company_id");
    const hasIdIzin = legacyCols.some((c) => c.column_name === "id_izin");

    if (hasCompanyId && hasIdIzin) {
      // 2. Buat satu baris Izin untuk tiap kombinasi (company_id, id_izin)
      //    yang belum punya padanan di tabel izin. KBLI/proyek diwarisi dari
      //    perusahaan sebagai nilai awal yang masuk akal.
      await client.query(`
        INSERT INTO izin (company_id, id_izin, kbli, scale, project_name, project_location)
        SELECT DISTINCT ON (r.company_id, r.id_izin)
          r.company_id,
          r.id_izin,
          (c.kbli ->> 0),
          r.scale,
          c.name,
          c.address
        FROM reports r
        JOIN companies c ON c.id = r.company_id
        WHERE NOT EXISTS (
          SELECT 1 FROM izin i
          WHERE i.company_id = r.company_id AND i.id_izin = r.id_izin
        )
        ORDER BY r.company_id, r.id_izin, r.id
      `);
    }

    // 3. Tambah kolom reports.izin_id (nullable dulu agar backfill aman).
    await client.query(
      `ALTER TABLE reports ADD COLUMN IF NOT EXISTS izin_id integer`,
    );

    if (hasCompanyId && hasIdIzin) {
      // 4. Backfill izin_id dari padanan (company_id, id_izin).
      await client.query(`
        UPDATE reports r
        SET izin_id = i.id
        FROM izin i
        WHERE i.company_id = r.company_id
          AND i.id_izin = r.id_izin
          AND r.izin_id IS NULL
      `);
    }

    // 5. Pastikan setiap laporan sudah punya izin_id sebelum melepas kolom lama.
    //    Jika masih ada yang null, JANGAN lepas kolom lama (id_izin/company_id)
    //    karena itu satu-satunya sumber untuk memetakan ulang — abort & rollback
    //    agar tidak ada data yang hilang.
    const { rows: nullCount } = await client.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM reports WHERE izin_id IS NULL`,
    );
    if (Number(nullCount[0].n) > 0) {
      throw new Error(
        `Migrasi dibatalkan: ${nullCount[0].n} laporan belum punya izin_id. ` +
          `Kolom lama (id_izin/company_id) dipertahankan agar data dapat dipetakan ulang.`,
      );
    }

    // 6. Semua baris terisi: tambah FK + NOT NULL, lalu lepas kolom lama.
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'reports_izin_id_izin_id_fk'
        ) THEN
          ALTER TABLE reports
            ADD CONSTRAINT reports_izin_id_izin_id_fk
            FOREIGN KEY (izin_id) REFERENCES izin(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await client.query(`ALTER TABLE reports ALTER COLUMN izin_id SET NOT NULL`);

    // 7. Cegah identitas proyek ganda: satu (company_id, id_izin) = satu Izin.
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'izin_company_id_id_izin_unique'
        ) THEN
          ALTER TABLE izin
            ADD CONSTRAINT izin_company_id_id_izin_unique
            UNIQUE (company_id, id_izin);
        END IF;
      END $$;
    `);

    // 8. Lepas kolom lama (data sudah dipindah ke izin / izin_id).
    await client.query(`ALTER TABLE reports DROP COLUMN IF EXISTS id_izin`);
    await client.query(`ALTER TABLE reports DROP COLUMN IF EXISTS company_id`);

    await client.query("COMMIT");
    console.log("Migrasi Izin selesai.");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

migrate()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error(err);
    await pool.end();
    process.exit(1);
  });
