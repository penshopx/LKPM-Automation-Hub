export const scaleLabels: Record<string, string> = {
  mikro: "Mikro",
  kecil: "Kecil",
  menengah: "Menengah",
  besar: "Besar",
};

export const periodTypeLabels: Record<string, string> = {
  triwulan: "Triwulanan",
  semester: "Semesteran",
  tahunan: "Tahunan",
};

export const operatingModeLabels: Record<string, string> = {
  pendamping: "Pendamping UMK",
  hibrida: "Hibrida",
  penuh: "Penuh",
};

export const permitTypeLabels: Record<string, string> = {
  nib: "NIB",
  sertifikat_standar: "Sertifikat Standar",
  izin: "Izin",
};

export const ssStatusLabels: Record<string, string> = {
  tidak_ada: "Tidak Ada",
  pernyataan_mandiri: "Pernyataan Mandiri",
  perlu_verifikasi: "Perlu Verifikasi",
  terverifikasi: "Terverifikasi",
};

export const statusLabels: Record<string, string> = {
  intake: "Intake",
  collect: "Pengumpulan",
  validate: "Validasi",
  draft: "Draf",
  review: "Ulasan",
  submit: "Penyampaian",
  monitor: "Pemantauan",
  archive: "Arsip",
};

export const riskLevelLabels: Record<string, string> = {
  rendah: "Risiko Rendah",
  menengah_rendah: "Menengah-Rendah",
  menengah_tinggi: "Menengah-Tinggi",
  tinggi: "Risiko Tinggi",
};

export const basisPermitTypeLabels: Record<string, string> = {
  kkpr: "KKPR / PKKPR",
  persetujuan_lingkungan: "Persetujuan Lingkungan",
  pbg: "PBG",
  slf: "SLF",
  sertifikat_standar: "Sertifikat Standar",
  izin: "Izin",
};

export const basisPermitStatusLabels: Record<string, string> = {
  belum_ada: "Belum Ada",
  dalam_proses: "Dalam Proses",
  terbit: "Terbit",
  kedaluwarsa: "Kedaluwarsa",
};

export function labelOf(map: Record<string, string>, key: string): string {
  return map[key] ?? key;
}
