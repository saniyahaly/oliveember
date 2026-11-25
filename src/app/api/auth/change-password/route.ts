
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error:
        "Admin password changes are managed through server environment configuration.",
    },
    {
      status: 409,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
