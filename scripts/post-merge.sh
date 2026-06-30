#!/bin/bash
set -e
pnpm install --frozen-lockfile
# Migrasi data-aman ke entitas Izin sebelum push agar push menjadi no-op
# (kolom lama sudah dipindah) dan tidak ada laporan yang hilang.
pnpm --filter @workspace/scripts run migrate-izin
pnpm --filter db push
