import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getDatabase } from "@/lib/db";

export const SESSION_COOKIE = "olive_admin_session";
const SESSION_MAX_AGE = 8 * 60 * 60;

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
  maxAge: SESSION_MAX_AGE,
} as const;

function sign(id: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters.");
  }

  return createHmac("sha256", secret).update(id).digest();
}

function sessionId(token?: string) {
  const match = token?.match(/^([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})\.([A-Za-z0-9_-]{43})$/);
  if (!match) return null;

  const [, id, signature] = match;
  const expected = sign(id).toString("base64url");
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature)) ? id : null;
}

type AdminCredential = { id: number; username: string; password_hash: string };

export async function getAdminCredential() {
  const sql = getDatabase();
  const accounts = await sql`
    SELECT id, username, password_hash FROM admin_credentials LIMIT 2
  `;
  return accounts.length === 1 ? accounts[0] as AdminCredential : null;
}

export async function createSession(credential: AdminCredential) {
  const id = randomUUID();
  const token = `${id}.${sign(id).toString("base64url")}`;
  const sql = getDatabase();

  const [sessions] = await sql.transaction([
    sql`
      INSERT INTO admin_sessions (id, expires_at)
      SELECT ${id}::uuid, NOW() + ${SESSION_MAX_AGE} * INTERVAL '1 second'
      FROM admin_credentials
      WHERE id = ${credential.id} AND password_hash = ${credential.password_hash}
      FOR SHARE
      RETURNING id
    `,
    sql`DELETE FROM admin_sessions WHERE expires_at <= NOW()`,
  ], { isolationLevel: "ReadCommitted" });

  return sessions.length === 1 ? token : null;
}

export async function getActiveSessionId() {
  const id = sessionId((await cookies()).get(SESSION_COOKIE)?.value);
  if (!id) return null;

  const sql = getDatabase();
  const active = await sql`
    SELECT id FROM admin_sessions WHERE id = ${id} AND expires_at > NOW()
  `;
  return active.length === 1 ? id : null;
}

export async function isAdminAuthenticated() {
  return (await getActiveSessionId()) !== null;
}

export async function revokeSession(token?: string) {
  const id = sessionId(token);
  if (!id) return;

  const sql = getDatabase();
  await sql`DELETE FROM admin_sessions WHERE id = ${id}`;
}

export async function allowAdminAttempt(bucket: "admin" | "password-change") {
  const sql = getDatabase();

  // A shared bucket covers all server instances and cannot be bypassed with spoofed IP headers.
  const attempts = await sql`
    INSERT INTO admin_login_limits (bucket, window_started_at, attempts)
    VALUES (${bucket}, NOW(), 1)
    ON CONFLICT (bucket) DO UPDATE
    SET attempts = CASE
          WHEN admin_login_limits.window_started_at <= NOW() - INTERVAL '1 minute' THEN 1
          ELSE admin_login_limits.attempts + 1
        END,
        window_started_at = CASE
          WHEN admin_login_limits.window_started_at <= NOW() - INTERVAL '1 minute' THEN NOW()
          ELSE admin_login_limits.window_started_at
        END
    WHERE admin_login_limits.window_started_at <= NOW() - INTERVAL '1 minute'
       OR admin_login_limits.attempts < 10
    RETURNING attempts
  `;
  return attempts.length === 1;
}
