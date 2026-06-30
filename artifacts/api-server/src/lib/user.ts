import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export type AccountRole = "konsultan" | "perusahaan";

export async function getUserRole(userId: string): Promise<AccountRole | null> {
  const [row] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.userId, userId));
  return (row?.role as AccountRole | undefined) ?? null;
}
