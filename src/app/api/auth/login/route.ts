
import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";

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

    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
      console.error("Admin environment credentials are missing");

      return NextResponse.json(
        { error: "Administrator login is not configured" },
        { status: 500 }
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

    const validUsername = secureCompare(
      body.username.trim().toLowerCase(),
      adminUsername.trim().toLowerCase()
    );

    const validPassword = secureCompare(
      body.password,
      adminPassword
    );

    if (!validUsername || !validPassword) {
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
      message: "Admin login successful",
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
