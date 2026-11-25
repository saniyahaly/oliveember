
import { NextRequest, NextResponse } from "next/server";
import {
  getActiveSessionId,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { isCrossOrigin, readJsonObject } from "@/lib/request";

export const runtime = "nodejs";

function strongPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    password.length <= 128 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  );
}

export async function POST(request: NextRequest) {
  if (isCrossOrigin(request)) {
    return errorResponse("Invalid request origin", 403);
  }

  try {
    const sessionId = await getActiveSessionId();

    if (!sessionId) {
      return errorResponse("Administrator login required", 401);
    }

    const body = await readJsonObject(request);

    if (
      !body ||
      typeof body.currentPassword !== "string" ||
      typeof body.newPassword !== "string" ||
      typeof body.confirmPassword !== "string"
    ) {
      return errorResponse("Enter all password fields", 400);
    }

    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = body;

    if (
      !currentPassword ||
      currentPassword.length > 128 ||
      !strongPassword(newPassword)
    ) {
      return errorResponse(
        "New password must contain 8–128 characters, " +
        "including uppercase, lowercase, number and special character.",
        400
      );
    }

    if (newPassword !== confirmPassword) {
      return errorResponse("New passwords do not match", 400);
    }

    const sql = getDatabase();

    const rows = await sql`
      SELECT password_hash
      FROM public.admin_credentials
      WHERE id = 1
      LIMIT 1
    `;

    if (rows.length !== 1) {
      return errorResponse("Administrator account not found", 404);
    }

    const oldHash = String(rows[0].password_hash);

    const validCurrentPassword = await verifyPassword(
      currentPassword,
      oldHash
    );

    if (!validCurrentPassword) {
      return errorResponse("Current password is incorrect", 400);
    }

    const samePassword = await verifyPassword(
      newPassword,
      oldHash
    );

    if (samePassword) {
      return errorResponse(
        "New password must be different from the current password",
        400
      );
    }

    const newHash = await hashPassword(newPassword);

    // Update the password and revoke all admin sessions
    // together in one database statement.
    const result = await sql`
      WITH changed AS (
        UPDATE public.admin_credentials
        SET
          password_hash = ${newHash},
          updated_at = NOW()
        WHERE id = 1
          AND password_hash = ${oldHash}
          AND EXISTS (
            SELECT 1
            FROM public.admin_sessions
            WHERE id = ${sessionId}
              AND expires_at > NOW()
            FOR KEY SHARE
          )
        RETURNING id
      ),
      invalidated AS (
        DELETE FROM public.admin_sessions
        WHERE EXISTS (SELECT 1 FROM changed)
        RETURNING id
      )
      SELECT
        (SELECT COUNT(*) FROM changed)::int AS changed_count,
        (SELECT COUNT(*) FROM invalidated)::int AS invalidated_count
    `;

    if (Number(result[0]?.changed_count) !== 1) {
      return errorResponse(
        "Your session or password has changed. Please log in again.",
        409
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "Password changed. Please log in again.",
    });

    response.cookies.set(SESSION_COOKIE, "", {
      ...sessionCookieOptions,
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("Admin password change failed:", error);

    return errorResponse(
      "Unable to change password. Please try again.",
      500
    );
  }
}
