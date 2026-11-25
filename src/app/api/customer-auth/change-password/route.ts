
import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import {
  getCurrentCustomer,
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

    if (origin !== request.nextUrl.origin) {
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

    // Conditional update prevents overwriting a password
    // that has been changed by another request.
    const updated = await sql`
      UPDATE public.customer_accounts
      SET password_hash = ${newHash},
          updated_at = NOW()
      WHERE id = ${customer.id}
        AND password_hash = ${oldHash}
      RETURNING id
    `;

    if (updated.length === 0) {
      return NextResponse.json(
        {
          error:
            "Your password changed during this request. Please log in again.",
        },
        { status: 409 }
      );
    }

    // Revoke all customer sessions for this account.
    await sql`
      DELETE FROM public.customer_sessions
      WHERE customer_id = ${customer.id}
    `;

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
  } catch (error) {
    console.error("Password change failed:", error);

    return NextResponse.json(
      { error: "Unable to change password." },
      { status: 500 }
    );
  }
}
