
import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import {
  allowLoginAttempt,
  createSession,
  revokeSession,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { isCrossOrigin, readJsonObject } from "@/lib/request";

export const runtime = "nodejs";

function secureCompare(a: string, b: string) {
  return timingSafeEqual(
    createHash("sha256").update(a).digest(),
    createHash("sha256").update(b).digest()
  );
}

export async function POST(request: NextRequest) {
  if (isCrossOrigin(request)) {
    return NextResponse.json(
      { error: "Invalid request origin" },
      { status: 403 }
    );
  }

  try {
    const body = await readJsonObject(request);

    if (
      !body ||
      typeof body.username !== "string" ||
      typeof body.password !== "string" ||
      !body.username.trim() ||
      !body.password ||
      body.username.length > 1024 ||
      body.password.length > 1024
    ) {
      return NextResponse.json(
        { error: "Enter a valid username and password" },
        { status: 400 }
      );
    }

    if (!(await allowLoginAttempt())) {
      return NextResponse.json(
        { error: "Too many login attempts. Try again in a minute." },
        {
          status: 429,
          headers: { "Retry-After": "60" },
        }
      );
    }

    const sql = getDatabase();
    const submittedUsername = body.username.trim();
    const submittedPassword = body.password;

    let rows = await sql`
      SELECT id, username, password_hash
      FROM public.admin_credentials
      WHERE id = 1
      LIMIT 1
    `;

    // Initialise the administrator account only if it
    // has not been created in the database yet.
    if (rows.length === 0) {
      const initialUsername = process.env.ADMIN_USERNAME;
      const initialPassword = process.env.ADMIN_PASSWORD;

      if (!initialUsername || !initialPassword) {
        throw new Error(
          "Initial administrator credentials are not configured."
        );
      }

      const usernameMatches = secureCompare(
        submittedUsername.toLowerCase(),
        initialUsername.trim().toLowerCase()
      );

      const passwordMatches = secureCompare(
        submittedPassword,
        initialPassword
      );

      if (!usernameMatches || !passwordMatches) {
        return NextResponse.json(
          { error: "Invalid username or password" },
          { status: 401 }
        );
      }

      const passwordHash = await hashPassword(initialPassword);

      await sql`
        INSERT INTO public.admin_credentials (
          id,
          username,
          password_hash
        )
        VALUES (
          1,
          ${initialUsername.trim()},
          ${passwordHash}
        )
        ON CONFLICT (id) DO NOTHING
      `;

      rows = await sql`
        SELECT id, username, password_hash
        FROM public.admin_credentials
        WHERE id = 1
        LIMIT 1
      `;
    }

    if (rows.length !== 1) {
      throw new Error("Administrator account was not found.");
    }

    const admin = rows[0];

    const usernameMatches = secureCompare(
      submittedUsername.toLowerCase(),
      String(admin.username).toLowerCase()
    );

    const passwordMatches = await verifyPassword(
      submittedPassword,
      String(admin.password_hash)
    );

    if (!usernameMatches || !passwordMatches) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    await revokeSession(
      request.cookies.get(SESSION_COOKIE)?.value
    );

    const token = await createSession();

    const response = NextResponse.json({
      success: true,
    });

    response.cookies.set(
      SESSION_COOKIE,
      token,
      sessionCookieOptions
    );

    return response;
  } catch (error) {
    console.error("Admin login failed:", error);

    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
