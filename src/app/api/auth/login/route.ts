import { NextRequest, NextResponse } from "next/server";
import {
  allowAdminAttempt,
  createSession,
  getAdminCredential,
  revokeSession,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { isCrossOrigin, readJsonObject } from "@/lib/request";

export const runtime = "nodejs";

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
    if (!(await allowAdminAttempt("admin"))) {
      return NextResponse.json(
        { error: "Too many login attempts. Try again in a minute." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const credential = await getAdminCredential();
    if (!credential) {
      return NextResponse.json({ error: "Administrator login is not configured" }, { status: 503 });
    }

    const validPassword = await verifyPassword(body.password, credential.password_hash);
    if (!validPassword || body.username.trim().toLowerCase() !== credential.username.trim().toLowerCase()) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    const token = await createSession(credential);
    if (!token) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    await revokeSession(request.cookies.get(SESSION_COOKIE)?.value);
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return response;
  } catch {
    console.error("Admin login failed.");
    return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 });
  }
}
