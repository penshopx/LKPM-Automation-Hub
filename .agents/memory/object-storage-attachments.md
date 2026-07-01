---
name: Private object storage attachments
description: How file attachments are stored/served in LKPM-Flow and why access is DB-gated, not GCS-ACL-gated
---

Evidence-file attachments (Lampiran) use Replit object storage via the sidecar at
`http://127.0.0.1:1106` (presigned URL flow), NOT the API proxying bytes.

Flow: client `POST /api/uploads/request-url` (validates type+size) → server returns a
presigned PUT `uploadURL` + normalized `/objects/uploads/<uuid>` path → client PUTs the
file directly to GCS → client registers it via `POST /api/{reports|izin|basis-permits}/{id}/attachments`
with the returned objectPath. Download streams through `GET /api/attachments/{id}/download`
(plain Express route, not an Orval hook — binary can't go through generated hooks; the
same-origin `<a href>` carries the Clerk session cookie for auth).

**Why access is DB-gated, not GCS-ACL-gated:** objects always live in the private bucket
dir; there is intentionally no per-object ACL metadata. Ownership is resolved in the DB
(attachment → report/izin/basisPermit → company → consultantId) before any download or
delete, returning 404 on cross-tenant/missing so existence isn't leaked. Keeps the
storage layer dumb and the tenant boundary in one place (`getAttachmentForConsultant`).

**How to apply:** never expose an object's signed GET URL to the client for private files;
always stream through the ownership-checked API route. Validation (20MB max, allowed
content types) is enforced on BOTH request-url and the create-attachment endpoints, and
mirrored client-side for UX only.

Only report attachments log to the audit trail (activitiesTable "Lampiran diunggah" /
"Lampiran dihapus"); izin/basisPermit have no audit table.
