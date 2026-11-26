import { NextRequest, NextResponse } from "next/server";
import {
  allowAdminAttempt,
  getActiveSessionId,
  getAdminCredential,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { hashPassword, validatePassword, verifyPassword } from "@/lib/password";
import { isCrossOrigin, readJsonObject } from "@/lib/request";

export const runtime = "nodejs";

function passwordError(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (isCrossOrigin(request)) return passwordError("Invalid request origin", 403);

  try {
    const sessionId = await getActiveSessionId();
    if (!sessionId) return passwordError("Admin login required", 401);

    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
      return passwordError("Expected application/json", 415);
    }

    const body = await readJsonObject(request);
    const { currentPassword, newPassword, confirmPassword } = body ?? {};
    if (typeof currentPassword !== "string" || !currentPassword || currentPassword.length > 1024) {
      return passwordError("Enter your current password", 400);
    }
    if (typeof newPassword !== "string" || !validatePassword(newPassword)) {
      return passwordError("Use 8–128 characters with uppercase, lowercase, a number and a special character.", 400);
    }
    if (newPassword !== confirmPassword) return passwordError("New passwords do not match", 400);
    if (newPassword === currentPassword) return passwordError("Choose a different password", 400);

    if (!(await allowAdminAttempt("password-change"))) {
      return NextResponse.json(
        { success: false, error: "Too many password-change attempts. Try again in a minute." },
        { status: 429, headers: { "Retry-After": "60", "Cache-Control": "no-store" } }
      );
    }

    const credential = await getAdminCredential();
    if (!credential) return passwordError("Administrator credentials are not configured", 503);
    if (!(await verifyPassword(currentPassword, credential.password_hash))) {
      return passwordError("Current password is incorrect", 403);
    }

    const hash = await hashPassword(newPassword);
    const sql = getDatabase();
    // Login takes a share lock on the credential before inserting a session. This
    // transaction updates that same row, then revokes sessions in a fresh snapshot.
    const [changed] = await sql.transaction([
      sql`
        UPDATE admin_credentials SET password_hash = ${hash}, updated_at = NOW()
        WHERE id = ${credential.id} AND password_hash = ${credential.password_hash}
          AND EXISTS (SELECT 1 FROM admin_sessions WHERE id = ${sessionId} AND expires_at > NOW())
        RETURNING id
      `,
      sql`
        DELETE FROM admin_sessions
        WHERE EXISTS (SELECT 1 FROM admin_credentials WHERE id = ${credential.id} AND password_hash = ${hash})
      `,
    ], { isolationLevel: "ReadCommitted" });
    if (changed.length !== 1) return passwordError("Credentials or session changed. Sign in and try again.", 409);

    const response = NextResponse.json(
      { success: true, message: "Password updated. Please sign in again." },
      { headers: { "Cache-Control": "no-store" } }
    );
    response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
    return response;
  } catch {
    console.error("Admin password change failed.");
    return passwordError("Unable to change password. Please try again.", 500);
  }
}
