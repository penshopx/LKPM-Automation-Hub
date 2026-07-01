import { Router, type IRouter } from "express";
import {
  db,
  attachmentsTable,
  activitiesTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
  ListReportAttachmentsParams,
  ListReportAttachmentsResponse,
  CreateReportAttachmentParams,
  CreateReportAttachmentBody,
  CreateReportAttachmentResponse,
  ListIzinAttachmentsParams,
  ListIzinAttachmentsResponse,
  CreateIzinAttachmentParams,
  CreateIzinAttachmentBody,
  CreateIzinAttachmentResponse,
  ListBasisPermitAttachmentsParams,
  ListBasisPermitAttachmentsResponse,
  CreateBasisPermitAttachmentParams,
  CreateBasisPermitAttachmentBody,
  CreateBasisPermitAttachmentResponse,
  DeleteAttachmentParams,
} from "@workspace/api-zod";
import type { Attachment } from "@workspace/db";
import { getConsultantId } from "../middlewares/auth";
import {
  reportBelongsToConsultant,
  izinBelongsToConsultant,
  basisPermitBelongsToConsultant,
  getAttachmentForConsultant,
} from "../lib/ownership";
import {
  objectStorage,
  ObjectNotFoundError,
} from "../lib/objectStorage";

const router: IRouter = Router();

// Batas ukuran berkas lampiran: 20 MB.
const MAX_FILE_SIZE = 20 * 1024 * 1024;

// Tipe berkas bukti yang diizinkan: PDF, gambar umum, dan dokumen kantor.
const ALLOWED_CONTENT_TYPES = new Set<string>([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/tiff",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
]);

function serializeAttachment(row: Attachment) {
  return {
    id: row.id,
    reportId: row.reportId,
    izinId: row.izinId,
    basisPermitId: row.basisPermitId,
    fileName: row.fileName,
    contentType: row.contentType,
    size: row.size,
    uploadedBy: row.uploadedBy,
    createdAt: row.createdAt,
  };
}

function validateFileMeta(size: number, contentType: string): string | null {
  if (size > MAX_FILE_SIZE) {
    return "Ukuran berkas melebihi batas 20 MB.";
  }
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    return "Tipe berkas tidak didukung. Gunakan PDF, gambar, atau dokumen kantor.";
  }
  return null;
}

// Meminta URL unggah bertanda tangan. Berkas diunggah langsung oleh klien ke
// object storage privat; tidak ada byte berkas yang melewati API ini.
router.post("/uploads/request-url", async (req, res) => {
  getConsultantId(req);
  const body = RequestUploadUrlBody.parse(req.body);
  const invalid = validateFileMeta(body.size, body.contentType);
  if (invalid) {
    res.status(400).json({ error: invalid });
    return;
  }
  const target = await objectStorage.getUploadTarget();
  const payload = { uploadURL: target.uploadURL, objectPath: target.objectPath };
  RequestUploadUrlResponse.parse(payload);
  res.json(payload);
});

// ---- Lampiran laporan ----

router.get("/reports/:reportId/attachments", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { reportId } = ListReportAttachmentsParams.parse(req.params);
  if (!(await reportBelongsToConsultant(reportId, consultantId))) {
    res.status(404).json({ error: "Laporan tidak ditemukan" });
    return;
  }
  const rows = await db
    .select()
    .from(attachmentsTable)
    .where(eq(attachmentsTable.reportId, reportId))
    .orderBy(desc(attachmentsTable.createdAt));
  const payload = rows.map(serializeAttachment);
  ListReportAttachmentsResponse.parse(payload);
  res.json(payload);
});

router.post("/reports/:reportId/attachments", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { reportId } = CreateReportAttachmentParams.parse(req.params);
  const body = CreateReportAttachmentBody.parse(req.body);
  if (!(await reportBelongsToConsultant(reportId, consultantId))) {
    res.status(404).json({ error: "Laporan tidak ditemukan" });
    return;
  }
  const invalid = validateFileMeta(body.size, body.contentType);
  if (invalid) {
    res.status(400).json({ error: invalid });
    return;
  }
  const [created] = await db
    .insert(attachmentsTable)
    .values({
      reportId,
      fileName: body.fileName,
      contentType: body.contentType,
      size: body.size,
      objectPath: body.objectPath,
      uploadedBy: consultantId,
    })
    .returning();
  await db.insert(activitiesTable).values({
    reportId,
    action: "Lampiran diunggah",
    actor: "Konsultan",
    detail: body.fileName,
  });
  const payload = serializeAttachment(created);
  CreateReportAttachmentResponse.parse(payload);
  res.status(201).json(payload);
});

// ---- Lampiran izin ----

router.get("/izin/:izinId/attachments", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { izinId } = ListIzinAttachmentsParams.parse(req.params);
  if (!(await izinBelongsToConsultant(izinId, consultantId))) {
    res.status(404).json({ error: "Izin tidak ditemukan" });
    return;
  }
  const rows = await db
    .select()
    .from(attachmentsTable)
    .where(eq(attachmentsTable.izinId, izinId))
    .orderBy(desc(attachmentsTable.createdAt));
  const payload = rows.map(serializeAttachment);
  ListIzinAttachmentsResponse.parse(payload);
  res.json(payload);
});

router.post("/izin/:izinId/attachments", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { izinId } = CreateIzinAttachmentParams.parse(req.params);
  const body = CreateIzinAttachmentBody.parse(req.body);
  if (!(await izinBelongsToConsultant(izinId, consultantId))) {
    res.status(404).json({ error: "Izin tidak ditemukan" });
    return;
  }
  const invalid = validateFileMeta(body.size, body.contentType);
  if (invalid) {
    res.status(400).json({ error: invalid });
    return;
  }
  const [created] = await db
    .insert(attachmentsTable)
    .values({
      izinId,
      fileName: body.fileName,
      contentType: body.contentType,
      size: body.size,
      objectPath: body.objectPath,
      uploadedBy: consultantId,
    })
    .returning();
  const payload = serializeAttachment(created);
  CreateIzinAttachmentResponse.parse(payload);
  res.status(201).json(payload);
});

// ---- Lampiran perizinan dasar ----

router.get("/basis-permits/:basisPermitId/attachments", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { basisPermitId } = ListBasisPermitAttachmentsParams.parse(req.params);
  if (!(await basisPermitBelongsToConsultant(basisPermitId, consultantId))) {
    res.status(404).json({ error: "Perizinan dasar tidak ditemukan" });
    return;
  }
  const rows = await db
    .select()
    .from(attachmentsTable)
    .where(eq(attachmentsTable.basisPermitId, basisPermitId))
    .orderBy(desc(attachmentsTable.createdAt));
  const payload = rows.map(serializeAttachment);
  ListBasisPermitAttachmentsResponse.parse(payload);
  res.json(payload);
});

router.post("/basis-permits/:basisPermitId/attachments", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { basisPermitId } = CreateBasisPermitAttachmentParams.parse(req.params);
  const body = CreateBasisPermitAttachmentBody.parse(req.body);
  if (!(await basisPermitBelongsToConsultant(basisPermitId, consultantId))) {
    res.status(404).json({ error: "Perizinan dasar tidak ditemukan" });
    return;
  }
  const invalid = validateFileMeta(body.size, body.contentType);
  if (invalid) {
    res.status(400).json({ error: invalid });
    return;
  }
  const [created] = await db
    .insert(attachmentsTable)
    .values({
      basisPermitId,
      fileName: body.fileName,
      contentType: body.contentType,
      size: body.size,
      objectPath: body.objectPath,
      uploadedBy: consultantId,
    })
    .returning();
  const payload = serializeAttachment(created);
  CreateBasisPermitAttachmentResponse.parse(payload);
  res.status(201).json(payload);
});

// ---- Unduh & hapus lampiran ----

// Streaming biner tidak bisa lewat hook Orval; klien mengunduh via <a href>
// sehingga cookie sesi Clerk ikut terkirim untuk otorisasi.
router.get("/attachments/:id/download", async (req, res) => {
  const consultantId = getConsultantId(req);
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(404).json({ error: "Lampiran tidak ditemukan" });
    return;
  }
  const attachment = await getAttachmentForConsultant(id, consultantId);
  if (!attachment) {
    res.status(404).json({ error: "Lampiran tidak ditemukan" });
    return;
  }
  try {
    const file = await objectStorage.getObjectEntityFile(attachment.objectPath);
    await objectStorage.downloadObject(file, res, {
      fileName: attachment.fileName,
      contentType: attachment.contentType,
    });
  } catch (err) {
    if (err instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Berkas tidak ditemukan" });
      return;
    }
    throw err;
  }
});

router.delete("/attachments/:id", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { id } = DeleteAttachmentParams.parse(req.params);
  const attachment = await getAttachmentForConsultant(id, consultantId);
  if (!attachment) {
    res.status(404).json({ error: "Lampiran tidak ditemukan" });
    return;
  }
  await db.delete(attachmentsTable).where(eq(attachmentsTable.id, id));
  await objectStorage.deleteObject(attachment.objectPath);
  if (attachment.reportId != null) {
    await db.insert(activitiesTable).values({
      reportId: attachment.reportId,
      action: "Lampiran dihapus",
      actor: "Konsultan",
      detail: attachment.fileName,
    });
  }
  res.status(204).send();
});

export default router;
