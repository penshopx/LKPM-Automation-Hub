import {
  db,
  pool,
  companiesTable,
  izinTable,
  reportsTable,
  dataPointsTable,
  constraintsTable,
  activitiesTable,
} from "@workspace/db";

// ID konsultan contoh (placeholder bergaya Clerk userId). Ganti dengan userId
// Clerk asli agar data tampil saat konsultan tersebut masuk. Dua konsultan
// dipakai untuk menunjukkan isolasi data antar-akun.
const CONSULTANT_A =
  process.env.SEED_CONSULTANT_A ?? "user_seed_konsultan_a_demo";
const CONSULTANT_B =
  process.env.SEED_CONSULTANT_B ?? "user_seed_konsultan_b_demo";

async function seed() {
  console.log("Membersihkan data lama...");
  await db.delete(activitiesTable);
  await db.delete(constraintsTable);
  await db.delete(dataPointsTable);
  await db.delete(reportsTable);
  await db.delete(izinTable);
  await db.delete(companiesTable);

  console.log("Menambahkan perusahaan...");
  const companies = await db
    .insert(companiesTable)
    .values([
      {
        consultantId: CONSULTANT_A,
        name: "PT Sinar Nusantara Manufaktur",
        nib: "1234567890123",
        scale: "besar",
        operatingMode: "penuh",
        permitType: "izin",
        ssStatus: "terverifikasi",
        kbli: ["10110", "10130"],
        capital: "75000000000",
        address: "Kawasan Industri MM2100, Bekasi, Jawa Barat",
        picName: "Andi Wijaya",
      },
      {
        consultantId: CONSULTANT_A,
        name: "CV Bumi Karya Logistik",
        nib: "2345678901234",
        scale: "menengah",
        operatingMode: "hibrida",
        permitType: "sertifikat_standar",
        ssStatus: "perlu_verifikasi",
        kbli: ["49431"],
        capital: "8000000000",
        address: "Jl. Raya Bogor KM 24, Jakarta Timur",
        picName: "Siti Rahmawati",
      },
      {
        consultantId: CONSULTANT_B,
        name: "UD Mekar Jaya Tekstil",
        nib: "3456789012345",
        scale: "kecil",
        operatingMode: "pendamping",
        permitType: "nib",
        ssStatus: "pernyataan_mandiri",
        kbli: ["13134"],
        capital: "1200000000",
        address: "Jl. Cigondewah Raya No. 88, Bandung",
        picName: "Bambang Sutejo",
      },
      {
        consultantId: CONSULTANT_B,
        name: "PT Tani Digital Sejahtera",
        nib: "4567890123456",
        scale: "menengah",
        operatingMode: "penuh",
        permitType: "izin",
        ssStatus: "terverifikasi",
        kbli: ["01111", "46201"],
        capital: "15000000000",
        address: "Jl. Diponegoro No. 45, Surabaya, Jawa Timur",
        picName: "Dewi Lestari",
      },
    ])
    .returning();

  const [sinar, bumi, mekar, tani] = companies;

  console.log("Menambahkan izin...");
  const izinRows = await db
    .insert(izinTable)
    .values([
      {
        companyId: sinar.id,
        idIzin: "91234567890123",
        kbli: "10110",
        scale: "besar",
        projectName: "Pabrik Tepung Ikan Bekasi",
        projectLocation: "Kawasan Industri MM2100, Bekasi, Jawa Barat",
      },
      {
        companyId: sinar.id,
        idIzin: "91234567890999",
        kbli: "10130",
        scale: "besar",
        projectName: "Lini Pengolahan Daging Olahan",
        projectLocation: "Kawasan Industri MM2100, Bekasi, Jawa Barat",
      },
      {
        companyId: bumi.id,
        idIzin: "92345678901234",
        kbli: "49431",
        scale: "menengah",
        projectName: "Gudang Distribusi Cibitung",
        projectLocation: "Jl. Raya Bogor KM 24, Jakarta Timur",
      },
      {
        companyId: mekar.id,
        idIzin: "93456789012345",
        kbli: "13134",
        scale: "kecil",
        projectName: "Unit Tenun Cigondewah",
        projectLocation: "Jl. Cigondewah Raya No. 88, Bandung",
      },
      {
        companyId: tani.id,
        idIzin: "94567890123456",
        kbli: "01111",
        scale: "menengah",
        projectName: "Kebun Padi Digital Sidoarjo",
        projectLocation: "Jl. Diponegoro No. 45, Surabaya, Jawa Timur",
      },
    ])
    .returning();

  const [izSinar, , izBumi, izMekar, izTani] = izinRows;

  console.log("Menambahkan laporan...");
  const reports = await db
    .insert(reportsTable)
    .values([
      {
        izinId: izSinar.id,
        scale: izSinar.scale,
        periodType: "triwulan",
        periodLabel: "TW II 2026",
        year: 2026,
        deadline: "2026-07-15",
        status: "review",
        narrative:
          "Realisasi investasi triwulan II berjalan sesuai rencana dengan beberapa kendala impor mesin.",
        makerName: "Rina (Maker)",
        checkerName: "Budi (Checker)",
        approverName: "Hendra (Approver)",
      },
      {
        izinId: izBumi.id,
        scale: izBumi.scale,
        periodType: "triwulan",
        periodLabel: "TW II 2026",
        year: 2026,
        deadline: "2026-07-15",
        status: "collect",
        narrative: null,
        makerName: "Siti (Maker)",
        checkerName: null,
        approverName: null,
      },
      {
        izinId: izMekar.id,
        scale: izMekar.scale,
        periodType: "semester",
        periodLabel: "Semester I 2026",
        year: 2026,
        deadline: "2026-07-15",
        status: "draft",
        narrative: "Penyusunan draft laporan semester I dalam proses.",
        makerName: "Bambang (Maker)",
        checkerName: null,
        approverName: null,
      },
      {
        izinId: izTani.id,
        scale: izTani.scale,
        periodType: "triwulan",
        periodLabel: "TW I 2026",
        year: 2026,
        deadline: "2026-04-15",
        status: "submit",
        narrative: "Laporan TW I telah disampaikan melalui OSS.",
        ossReceipt: "OSS-LKPM-2026-04-0099",
        makerName: "Dewi (Maker)",
        checkerName: "Agus (Checker)",
        approverName: "Yanti (Approver)",
      },
    ])
    .returning();

  const [rSinar, rBumi, rMekar, rTani] = reports;

  console.log("Menambahkan data point...");
  await db.insert(dataPointsTable).values([
    {
      reportId: rSinar.id,
      category: "investasi",
      label: "Mesin/Peralatan dan Suku Cadang",
      fieldKey: "inv_mesin",
      value: "42000000000",
      unit: "IDR",
      source: "GL-2026-Q2, baris 88",
      status: "terverifikasi",
      confidence: 95,
      attribution: "S3 - Validasi",
    },
    {
      reportId: rSinar.id,
      category: "tenaga_kerja",
      label: "Tenaga Kerja Indonesia (laki-laki)",
      fieldKey: "tk_tki_l",
      value: "320",
      unit: "orang",
      source: "Daftar gaji Juni 2026",
      status: "terverifikasi",
      confidence: 90,
      attribution: "HRD",
    },
    {
      reportId: rSinar.id,
      category: "produksi",
      label: "Tepung Ikan :: Kapasitas",
      value: "12000",
      unit: "ton/tahun",
      source: "Spesifikasi lini produksi 2026",
      status: "terverifikasi",
      confidence: 92,
      attribution: "Produksi",
    },
    {
      reportId: rSinar.id,
      category: "produksi",
      label: "Tepung Ikan :: Realisasi",
      value: "9500",
      unit: "ton/tahun",
      source: null,
      status: "perlu_verifikasi",
      confidence: 55,
      attribution: "Estimasi produksi",
    },
    {
      reportId: rSinar.id,
      category: "produksi",
      label: "Tepung Ikan :: Nilai Ekspor",
      value: "1500000",
      unit: "USD",
      source: "PEB Bea Cukai Q2 2026",
      status: "terverifikasi",
      confidence: 88,
      attribution: "Ekspor",
    },
    {
      reportId: rSinar.id,
      category: "kewajiban",
      label: "Realisasi pengelolaan lingkungan",
      fieldKey: "kw_lingkungan",
      value: "850000000",
      unit: "IDR",
      source: "Laporan UKL-UPL Semester I 2026",
      status: "terverifikasi",
      confidence: 90,
      attribution: "HSE",
    },
    {
      reportId: rBumi.id,
      category: "investasi",
      label: "Modal Kerja",
      fieldKey: "inv_modal_kerja",
      value: "3500000000",
      unit: "IDR",
      source: "Rekening koran BCA",
      status: "perlu_verifikasi",
      confidence: 60,
      attribution: "Finance",
    },
    {
      reportId: rBumi.id,
      category: "tenaga_kerja",
      label: "Tenaga Kerja Asing",
      fieldKey: "tk_tka",
      value: "2",
      unit: "orang",
      source: "IMTA aktif",
      status: "terverifikasi",
      confidence: 100,
      attribution: "HRD",
    },
    {
      reportId: rMekar.id,
      category: "investasi",
      label: "Realisasi modal tetap",
      fieldKey: "inv_modal_tetap_lump",
      value: null,
      unit: null,
      source: null,
      status: "estimasi",
      confidence: 30,
      attribution: "Belum ada bukti",
    },
    {
      reportId: rTani.id,
      category: "investasi",
      label: "Bangunan/Gedung",
      fieldKey: "inv_bangunan",
      value: "9000000000",
      unit: "IDR",
      source: "Laporan keuangan TW I 2026",
      status: "terverifikasi",
      confidence: 98,
      attribution: "Auditor internal",
    },
  ]);

  console.log("Menambahkan kendala...");
  await db.insert(constraintsTable).values([
    {
      reportId: rSinar.id,
      issue: "Keterlambatan impor mesin produksi dari Tiongkok",
      followUp: "Koordinasi dengan bea cukai, target rilis akhir Juli 2026",
    },
    {
      reportId: rMekar.id,
      issue: "Bukti realisasi pelatihan tenaga kerja belum lengkap",
      followUp: "Kumpulkan sertifikat pelatihan dari vendor",
    },
  ]);

  console.log("Menambahkan jejak audit...");
  await db.insert(activitiesTable).values([
    {
      reportId: rSinar.id,
      action: "Laporan dibuat",
      actor: "Rina (Maker)",
      detail: "Intake periode TW II 2026",
    },
    {
      reportId: rSinar.id,
      action: "Data divalidasi",
      actor: "S3 - Validasi",
      detail: "Gate G3 lolos untuk kategori investasi",
    },
    {
      reportId: rSinar.id,
      action: "Diteruskan ke review",
      actor: "Budi (Checker)",
      detail: null,
    },
    {
      reportId: rTani.id,
      action: "Laporan disampaikan ke OSS",
      actor: "Yanti (Approver)",
      detail: "Tanda terima OSS-LKPM-2026-04-0099",
    },
  ]);

  console.log("Seed selesai.");
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
