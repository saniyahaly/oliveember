
import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import {
  hashPassword,
  validatePassword,
} from "@/lib/password";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");

    if (origin && origin !== request.nextUrl.origin) {
      return NextResponse.json(
        { error: "Invalid request origin" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const username =
      typeof body.username === "string"
        ? body.username.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password = body.password;
    const confirmPassword = body.confirmPassword;

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return NextResponse.json(
        {
          error:
            "Username must contain 3–30 letters, numbers or underscores.",
        },
        { status: 400 }
      );
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 255
    ) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    if (
      typeof password !== "string" ||
      !validatePassword(password)
    ) {
      return NextResponse.json(
        {
          error:
            "Password must contain at least 8 characters, uppercase, lowercase, a number and a special character.",
        },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const sql = getDatabase();

    try {
      await sql`
        INSERT INTO public.customer_accounts
          (username, email, password_hash)
        VALUES
          (${username}, ${email}, ${passwordHash})
      `;
    } catch (error) {
      // PostgreSQL unique constraint violation
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
      ) {
        return NextResponse.json(
          { error: "Username or email is already registered." },
          { status: 409 }
        );
      }

      throw error;
    }

    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully.",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON request." },
        { status: 400 }
      );
    }

    console.error("Customer registration failed:", error);

    return NextResponse.json(
      { error: "Unable to create account." },
      { status: 500 }
    );
  }
}
