import type { NextRequest } from "next/server";

export function isCrossOrigin(request: NextRequest) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site" || fetchSite === "same-site") return true;

  const origin = request.headers.get("origin");
  if (origin === null) return false;

  const host = request.headers.get("host");
  if (!host) return origin !== request.nextUrl.origin;

  // NextURL normalizes loopback hostnames. Use the request host for origin checks.
  try {
    return origin !== new URL(`${request.nextUrl.protocol}//${host}`).origin;
  } catch {
    return true;
  }
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json();
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  } catch {
    // Invalid JSON is reported as a client error by the caller.
  }
  return null;
}
