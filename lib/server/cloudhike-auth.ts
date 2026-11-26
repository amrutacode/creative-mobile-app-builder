import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, users, type User } from "@/db";

const SIGNUP_CREDITS = 100;

async function getCloudHikeUser(token: string) {
  const res = await fetch(`${process.env.AUTH_URL}/get-session`, {
    headers: {
      "x-api-key": process.env.AUTH_PUBLISHABLE_KEY ?? "",
      authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.user ?? null;
}

// Verifies the bearer token against CloudHike and ensures a matching row
// exists in our `users` table, so callers work even if /api/auth/sync hasn't
// run yet for this session.
export async function authenticateRequest(request: NextRequest): Promise<User | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const cloudHikeUser = await getCloudHikeUser(token);
  if (!cloudHikeUser?.id || !cloudHikeUser?.email) return null;

  // onConflictDoNothing makes this safe to call on every request: the 100
  // credit grant only ever lands on the row's first insert.
  const [inserted] = await db
    .insert(users)
    .values({
      id: cloudHikeUser.id,
      email: cloudHikeUser.email,
      name: cloudHikeUser.name ?? null,
      credits: SIGNUP_CREDITS,
    })
    .onConflictDoNothing({ target: users.id })
    .returning();

  return (
    inserted ?? (await db.select().from(users).where(eq(users.id, cloudHikeUser.id)).limit(1))[0]
  );
}
