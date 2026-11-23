import { NextRequest, NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import { db, users } from "@/db";

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

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Missing session token" }, { status: 401 });
  }

  const cloudHikeUser = await getCloudHikeUser(token);
  if (!cloudHikeUser?.id || !cloudHikeUser?.email) {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  // onConflictDoNothing (no target = any unique constraint, id or email) makes
  // this safe to call on every sign-in: the 100 credit grant only ever lands
  // on the row's first insert.
  const [inserted] = await db
    .insert(users)
    .values({
      id: cloudHikeUser.id,
      email: cloudHikeUser.email,
      name: cloudHikeUser.name ?? null,
      credits: SIGNUP_CREDITS,
    })
    .onConflictDoNothing()
    .returning();

  // A conflict can land on either the id or the email unique constraint
  // (e.g. a returning user whose CloudHike id doesn't match what's stored),
  // so look up by either when the insert didn't happen.
  const user =
    inserted ??
    (
      await db
        .select()
        .from(users)
        .where(or(eq(users.id, cloudHikeUser.id), eq(users.email, cloudHikeUser.email)))
        .limit(1)
    )[0];

  if (!user) {
    return NextResponse.json({ error: "Failed to sync user" }, { status: 500 });
  }

  return NextResponse.json({ user });
}
