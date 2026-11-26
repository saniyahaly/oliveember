import { NextRequest, NextResponse } from "next/server";
import {
  allowCustomerAuthAttempt,
  CUSTOMER_COOKIE,
  CUSTOMER_SESSION_DURATION,
  generateCustomerToken,
  hashCustomerToken,
} from "@/lib/customer-auth";
import { getDatabase } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { isCrossOrigin, readJsonObject } from "@/lib/request";

export const runtime = "nodejs";

const dummyHash = `${"0".repeat(32)}:${"0".repeat(128)}`;

export async function POST(request: NextRequest) {
  if (isCrossOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return NextResponse.json({ error: "Expected application/json" }, { status: 415 });
  }

  const body = await readJsonObject(request);
  const identifier = typeof body?.identifier === "string" ? body.identifier.trim() : "";
  const password = body?.password;
  if (!identifier || identifier.length > 255 || typeof password !== "string" || !password || password.length > 128) {
    return NextResponse.json({ error: "Enter your username or email and password" }, { status: 400 });
  }

  try {
    const sql = getDatabase();
    if (!(await allowCustomerAuthAttempt("login", 30))) {
      return NextResponse.json(
        { error: "Too many login attempts. Try again in a minute." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const accounts = identifier.includes("@")
      ? await sql`SELECT id, password_hash FROM public.customer_accounts WHERE lower(email) = lower(${identifier}) LIMIT 2`
      : await sql`SELECT id, password_hash FROM public.customer_accounts WHERE lower(username) = lower(${identifier}) LIMIT 2`;
    const account = accounts.length === 1 ? accounts[0] : undefined;
    const verified = await verifyPassword(password, account?.password_hash ?? dummyHash);
    if (!verified || !account) {
      return NextResponse.json({ error: "Invalid username, email, or password" }, { status: 401 });
    }

    const token = generateCustomerToken();
    const [session] = await sql`
      INSERT INTO public.customer_sessions (customer_id, token_hash, expires_at)
      SELECT id, ${hashCustomerToken(token)}, NOW() + ${CUSTOMER_SESSION_DURATION} * INTERVAL '1 second'
      FROM public.customer_accounts WHERE id = ${account.id} AND password_hash = ${account.password_hash}
      FOR SHARE
      RETURNING id
    `;
    if (!session) {
      return NextResponse.json({ error: "Invalid username, email, or password" }, { status: 401 });
    }

    const previous = request.cookies.get(CUSTOMER_COOKIE)?.value;
    if (previous && /^[0-9a-f]{64}$/.test(previous)) {
      await sql`DELETE FROM public.customer_sessions WHERE token_hash = ${hashCustomerToken(previous)}`;
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(CUSTOMER_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: CUSTOMER_SESSION_DURATION,
    });
    return response;
  } catch {
    console.error("Customer login failed.");
    return NextResponse.json({ error: "Unable to log in right now" }, { status: 500 });
  }
}
