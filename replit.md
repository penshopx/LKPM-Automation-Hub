# LKPM-Flow

Platform pelaporan LKPM-BKPM untuk mengelola Laporan Kegiatan Penanaman Modal (LKPM) perusahaan Indonesia yang disampaikan melalui OSS, dengan alur kerja berbasis pipeline dan doktrin anti-halusinasi data.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/lkpm-flow run dev` — run the web frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed` — seed the database with sample data. Set `SEED_CONSULTANT_A` / `SEED_CONSULTANT_B` to real Clerk user IDs so seeded companies show up for those signed-in consultants; otherwise placeholder IDs are used and the demo data stays isolated from real logins.
- `pnpm --filter @workspace/scripts run backfill-field-keys` — set `fieldKey` on pre-existing data points by catalog match
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Frontend: React + Vite + wouter + TanStack Query
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for the API contract
- `lib/db/src/schema/` — Drizzle schema (companies, izin, reports, dataPoints, constraints, activities)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/lkpm-flow/src/pages/` — frontend pages (dashboard, companies, reports, calendar, data-quality)
- `scripts/src/seed.ts` — sample data seeding
- Generated hooks: `@workspace/api-client-react`; generated Zod schemas: `@workspace/api-zod`

## Architecture decisions

- Entity hierarchy: Konsultan → Perusahaan → Izin → Laporan. A company has many Izin (each Izin is one OSS project/NIB with `idIzin`, `kbli`, `scale`, `projectName`, `projectLocation`). Reports belong to an Izin (`reports.izinId`, FK cascade) and inherit `scale` from the Izin at creation (`reports.scale` is kept because form/readiness logic depends on it). The Report API response still derives `companyId`/`companyName`/`idIzin`/`projectName`/`scale` via the izin join to minimize frontend churn; `ReportInput` takes only `izinId` (no `companyId`/`idIzin`). Izin has no `consultantId` of its own — ownership is enforced by joining Izin → Company and checking the company's `consultantId` (`izinBelongsToConsultant`).
- Multi-tenant by consultant: the platform is a consultant workspace. Auth is Replit-managed Clerk (cookie-based on web). `requireAuth` gates every non-public API route; `consultantId` is the Clerk `userId` (no separate local user table). All companies/izin/reports/dataPoints/constraints/activities/dashboard queries scope by `consultantId` via ownership helpers, returning 404 (not 403) on cross-consultant access so existence is not leaked. `consultantId` is server-derived and never trusted from the client; Zod response schemas strip it from payloads.
- Anti-hallucination doctrine: every data point carries `source`, `verificationStatus`, and `confidence` (0-100) so report claims are traceable. Leak detection on agent free-text (`gate.ts` `valueAppears`) normalizes casing and whitespace and compares numbers by separator-stripped digit tokens, so a rejected value can't slip through reformatting (`1000000` vs `1.000.000`, `PT Maju` vs `PT  Maju`) while keeping whole-token boundaries so clean drafts aren't blanked.
- Reports move through pipeline stages (intake→collect→validate→draft→review→submit→monitor→archive) with maker/checker/approver names modeled as fields; workflow separation is handled in the UI, not enforced as a hard backend gate.
- API error responses use the shape `{ error: string }` (matches the OpenAPI `Error` schema).
- `deadline` is a `date` column and is emitted as `YYYY-MM-DD`; routes validate response payloads with Zod but send the original (un-coerced) object so date-only values are not turned into ISO datetimes.
- Drizzle `numeric` columns return strings — convert with `Number()` before serializing.

## Product

- Dashboard: pipeline status, business-scale breakdown, upcoming deadlines, and data-health summary.
- Companies: managed by business scale (mikro/kecil/menengah/besar) with NIB/search filtering; company detail lists its Izin and has an add-Izin dialog.
- Izin: each Izin (project/NIB) has a detail page listing its reports; new reports are created under an Izin and inherit its scale.
- Reports: detail view with data points, constraints, and audit activity trail; breadcrumb links back through Izin and company.
- Asisten Penyusun (agentic): orchestrated pipeline of 1 orchestrator + 5 agents (Pengumpul Data, Validator Anti-Halusinasi [gate], Pemeriksa Kepatuhan OSS, Penyusun Narasi, Pemantau Tenggat & Risiko Sanksi) streamed over SSE (`POST /api/assistant/orchestrate`). The Validator gate decides which data points are usable; the Narasi agent only receives validated data, and rejected data becomes an explicit "perlu dilengkapi" list (never guessed). Output: assembled draft + OSS-compliance summary + deadline/risk warnings + per-agent audit trail. The old one-shot `POST /api/assistant/report-draft` remains as a fallback.
- Calendar: reporting deadlines with H- countdown and overdue/submitted indicators.
- Data quality: surfaces unverified and low-confidence data points.
- UI is in Indonesian, no emojis.

## User preferences

- UI language: Indonesian (Bahasa Indonesia). No emojis anywhere in the UI.

## Gotchas

- After changing DB schema, run `pnpm --filter @workspace/db run push` then re-seed.
- Drizzle `date` columns return strings; do not let Zod `coerce.date()` mutate response payloads before `res.json` (validate-then-send-original).
- Do not change the OpenAPI `info.title` — it controls generated filenames.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
