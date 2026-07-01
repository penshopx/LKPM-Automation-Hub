import { Storage, type File } from "@google-cloud/storage";
import type { Response } from "express";
import { randomUUID } from "crypto";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

// The object storage client talks to Google Cloud Storage using the Replit
// sidecar for credentials — no static service-account key is needed.
export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

function getPrivateObjectDir(): string {
  const dir = process.env.PRIVATE_OBJECT_DIR || "";
  if (!dir) {
    throw new Error(
      "PRIVATE_OBJECT_DIR belum diset. Buat bucket di tool 'Object Storage' " +
        "lalu set env var PRIVATE_OBJECT_DIR.",
    );
  }
  return dir;
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Path tidak valid: harus memuat minimal nama bucket");
  }
  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");
  return { bucketName, objectName };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
  );
  if (!response.ok) {
    throw new Error(
      `Gagal menandatangani URL objek, kode: ${response.status}. ` +
        "Pastikan aplikasi berjalan di Replit.",
    );
  }
  const { signed_url: signedURL } = (await response.json()) as {
    signed_url: string;
  };
  return signedURL;
}

/**
 * Object storage service scoped to the private directory. Access to individual
 * objects is gated by database ownership (see routes), so no GCS ACL metadata is
 * used — objects always live in the private bucket path and are streamed through
 * the API only after an ownership check.
 */
export class ObjectStorageService {
  // Generates a presigned PUT URL for a brand-new upload and the normalized
  // "/objects/..." path the API stores and later resolves for download.
  async getUploadTarget(): Promise<{ uploadURL: string; objectPath: string }> {
    const privateObjectDir = getPrivateObjectDir();
    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);
    const uploadURL = await signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });
    return { uploadURL, objectPath: `/objects/uploads/${objectId}` };
  }

  // Resolves a normalized "/objects/..." path to a GCS File, throwing
  // ObjectNotFoundError when the path is malformed or the object is missing.
  async getObjectEntityFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }
    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }
    const entityId = parts.slice(1).join("/");
    let entityDir = getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return objectFile;
  }

  // Streams a private object to the response with a download disposition.
  async downloadObject(
    file: File,
    res: Response,
    opts: { fileName?: string; contentType?: string } = {},
  ): Promise<void> {
    const [metadata] = await file.getMetadata();
    const contentType =
      opts.contentType || metadata.contentType || "application/octet-stream";
    res.set({
      "Content-Type": contentType,
      "Content-Length": metadata.size ? String(metadata.size) : undefined,
      "Cache-Control": "private, max-age=3600",
      ...(opts.fileName && {
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          opts.fileName,
        )}"`,
      }),
    });
    const stream = file.createReadStream();
    stream.on("error", (err) => {
      // eslint-disable-next-line no-console
      console.error("Stream error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Gagal mengalirkan berkas" });
      }
    });
    stream.pipe(res);
  }

  // Best-effort delete of the underlying object; missing objects are ignored.
  async deleteObject(objectPath: string): Promise<void> {
    try {
      const file = await this.getObjectEntityFile(objectPath);
      await file.delete({ ignoreNotFound: true });
    } catch (err) {
      if (err instanceof ObjectNotFoundError) return;
      throw err;
    }
  }
}

export const objectStorage = new ObjectStorageService();
