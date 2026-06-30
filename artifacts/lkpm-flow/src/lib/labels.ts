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

export function labelOf(map: Record<string, string>, key: string): string {
  return map[key] ?? key;
}
