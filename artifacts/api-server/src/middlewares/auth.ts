import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      consultantId?: string;
    }
  }
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Sesi tidak valid. Silakan masuk kembali." });
    return;
  }
  req.consultantId = userId;
  next();
}

export function getConsultantId(req: Request): string {
  const id = req.consultantId;
  if (!id) {
    throw new Error("consultantId tidak tersedia; requireAuth belum dijalankan");
  }
  return id;
}
