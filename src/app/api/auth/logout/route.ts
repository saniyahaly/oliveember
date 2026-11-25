import { NextRequest, NextResponse } from "next/server";
import { revokeSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { isCrossOrigin } from "@/lib/request";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (isCrossOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  try {
    await revokeSession(request.cookies.get(SESSION_COOKIE)?.value);
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
    return response;
  } catch {
    console.error("Admin logout failed. Check server configuration and auth schema.");
    return NextResponse.json({ error: "Logout failed. Please try again." }, { status: 500 });
  }
}
