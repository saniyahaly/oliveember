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

function secureCompare(a: string, b: string) {
  return timingSafeEqual(
    createHash("sha256").update(a).digest(),
    createHash("sha256").update(b).digest()
  );
}

export async function POST(request: NextRequest) {
  if (isCrossOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
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
    return NextResponse.json({ error: "Enter a valid username and password" }, { status: 400 });
  }

  try {
    const username = process.env.ADMIN_USERNAME;
    const password = process.env.ADMIN_PASSWORD;
    if (!username || !password) {
      throw new Error("Admin credentials are not configured");
    }

    if (!(await allowLoginAttempt())) {
      return NextResponse.json(
        { error: "Too many login attempts. Try again in a minute." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const validUsername = secureCompare(body.username.trim(), username);
    const validPassword = secureCompare(body.password, password);
    if (!validUsername || !validPassword) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    await revokeSession(request.cookies.get(SESSION_COOKIE)?.value);
    const token = await createSession();
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return response;
  } catch {
    console.error("Admin login failed. Check server configuration and auth schema.");
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
