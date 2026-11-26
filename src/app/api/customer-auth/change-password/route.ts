
import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { isCrossOrigin } from "@/lib/request";
import {
  allowCustomerAuthAttempt,
  getCurrentCustomer,
  hashCustomerToken,
  CUSTOMER_COOKIE,
} from "@/lib/customer-auth";
import {
  validatePassword,
  verifyPassword,
  hashPassword,
} from "@/lib/password";

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

    const customer = await getCurrentCustomer();

    if (!customer) {
      return NextResponse.json(
        { error: "Please log in first." },
        { status: 401 }
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request data." },
        { status: 400 }
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { error: "Invalid request data." },
        { status: 400 }
      );
    }

    const input = body as Record<string, unknown>;
    const currentPassword = input.currentPassword;
    const newPassword = input.newPassword;
    const confirmPassword = input.confirmPassword;

    if (
      typeof currentPassword !== "string" ||
      currentPassword.length === 0 ||
      currentPassword.length > 128 ||
      typeof newPassword !== "string" ||
      typeof confirmPassword !== "string"
    ) {
      return NextResponse.json(
        { error: "Enter valid password details." },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "New passwords do not match." },
        { status: 400 }
      );
    }

    if (!validatePassword(newPassword)) {
      return NextResponse.json(
        {
          error:
            "Password must contain 8–128 characters, uppercase, lowercase, a number and a special character.",
        },
        { status: 400 }
      );
    }

    const token = request.cookies.get(CUSTOMER_COOKIE)?.value;
    if (!token || !/^[0-9a-f]{64}$/.test(token)) {
      return NextResponse.json({ error: "Please log in first." }, { status: 401 });
    }

    if (!(await allowCustomerAuthAttempt(`password:${customer.id}`, 8))) {
      return NextResponse.json({ error: "Too many password changes. Try again in a minute." },
        { status: 429, headers: { "Retry-After": "60" } });
    }

    const sql = getDatabase();

    const accounts = await sql`
      SELECT password_hash
      FROM public.customer_accounts
      WHERE id = ${customer.id}
      LIMIT 1
    `;

    if (accounts.length === 0) {
      return NextResponse.json(
        { error: "Customer account not found." },
        { status: 404 }
      );
    }

    const oldHash = String(accounts[0].password_hash);

    const currentValid = await verifyPassword(
      currentPassword,
      oldHash
    );

    if (!currentValid) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 400 }
      );
    }

    const samePassword = await verifyPassword(
      newPassword,
      oldHash
    );

    if (samePassword) {
      return NextResponse.json(
        {
          error:
            "Your new password must differ from your current password.",
        },
        { status: 400 }
      );
    }

    const newHash = await hashPassword(newPassword);

    const [updated] = await sql.transaction([
      sql`
        UPDATE public.customer_accounts
        SET password_hash = ${newHash}, updated_at = NOW()
        WHERE id = ${customer.id} AND password_hash = ${oldHash}
          AND EXISTS (SELECT 1 FROM public.customer_sessions WHERE customer_id = ${customer.id}
            AND token_hash = ${hashCustomerToken(token)} AND expires_at > NOW())
        RETURNING id
      `,
      sql`
        DELETE FROM public.customer_sessions WHERE customer_id = ${customer.id}
        AND EXISTS (SELECT 1 FROM public.customer_accounts WHERE id = ${customer.id} AND password_hash = ${newHash})
      `,
    ], { isolationLevel: "ReadCommitted" });

    if (updated.length === 0) {
      return NextResponse.json({ error: "Your credentials or session changed. Please log in again." }, { status: 409 });
    }

    const response = NextResponse.json({
      success: true,
      message:
        "Password changed successfully. Please log in again.",
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
    console.error("Password change failed:");

    return NextResponse.json(
      { error: "Unable to change password." },
      { status: 500 }
    );
  }
}
