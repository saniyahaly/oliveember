
import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { isCrossOrigin } from "@/lib/request";
import {
  CUSTOMER_COOKIE,
  hashCustomerToken,
} from "@/lib/customer-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");

    if (!origin || isCrossOrigin(request)) {
      return NextResponse.json(
        { error: "Invalid request origin." },
        { status: 403 }
      );
    }

    const token = request.cookies.get(CUSTOMER_COOKIE)?.value;

    if (token && /^[0-9a-f]{64}$/.test(token)) {
      const sql = getDatabase();
      const tokenHash = hashCustomerToken(token);

      await sql`
        DELETE FROM public.customer_sessions
        WHERE token_hash = ${tokenHash}
      `;
    }

    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully.",
    });

    response.cookies.set(CUSTOMER_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch {
    console.error("Customer logout failed:");

    return NextResponse.json(
      { error: "Unable to log out right now." },
      { status: 500 }
    );
  }
}
