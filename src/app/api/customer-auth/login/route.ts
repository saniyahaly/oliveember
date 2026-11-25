
import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { getDatabase } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  allowLoginAttempt,
  createSession,
  revokeSession,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth";
import { isCrossOrigin, readJsonObject } from "@/lib/request";

export const runtime = "nodejs";

function secureCompare(a: string, b: string): boolean {
  const first = createHash("sha256").update(a).digest();
  const second = createHash("sha256").update(b).digest();

  return timingSafeEqual(first, second);
}

export async function POST(request: NextRequest) {
  if (isCrossOrigin(request)) {
    return NextResponse.json(
      { error: "Invalid request origin" },
      { status: 403 }
    );
  }

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

  try {
    if (!(await allowLoginAttempt())) {
      return NextResponse.json(
        {
          error: "Too many login attempts. Try again in a minute.",
        },
        {
          status: 429,
          headers: { "Retry-After": "60" },
        }
      );
    }

    const sql = getDatabase();

    let admins = await sql`
      SELECT id, username, password_hash
      FROM public.admin_credentials
      WHERE id = 1
      LIMIT 1
    `;

    // Initial setup only:
    // Create the admin credential record when none exists.
    // The environment password is NEVER used as a
    // fallback once the database record exists.
    if (admins.length === 0) {
      const initialUsername = process.env.ADMIN_USERNAME;
      const initialPassword = process.env.ADMIN_PASSWORD;

      if (!initialUsername || !initialPassword) {
        throw new Error("Initial admin credentials are missing");
      }

      const usernameMatches = secureCompare(
        body.username.trim().toLowerCase(),
        initialUsername.trim().toLowerCase()
      );

      const passwordMatches = secureCompare(
        body.password,
        initialPassword
      );

      if (!usernameMatches || !passwordMatches) {
        return NextResponse.json(
          { error: "Invalid username or password" },
          { status: 401 }
        );
      }

      const initialHash = await hashPassword(initialPassword);

      await sql`
        INSERT INTO public.admin_credentials
          (id, username, password_hash)
        VALUES
          (1, ${initialUsername.trim()}, ${initialHash})
        ON CONFLICT (id) DO NOTHING
      `;

      admins = await sql`
        SELECT id, username, password_hash
        FROM public.admin_credentials
        WHERE id = 1
        LIMIT 1
      `;
    }

    if (admins.length === 0) {
      throw new Error("Admin credentials not initialised");
    }

    const admin = admins[0];

    const validUsername = secureCompare(
      body.username.trim().toLowerCase(),
      String(admin.username).toLowerCase()
    );

    const validPassword = await verifyPassword(
      body.password,
      String(admin.password_hash)
    );

    if (!validUsername || !validPassword) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Revoke the previous admin session, if present.
    await revokeSession(
      request.cookies.get(SESSION_COOKIE)?.value
    );

    // Preserve the existing admin session mechanism.
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
  } catch {
    console.error(
      "Admin login failed. Check auth configuration and database schema."
    );

    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
