import { NextRequest, NextResponse } from "next/server";
import { isCrossOrigin } from "@/lib/request";

export class RestaurantError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

export function integer(value: unknown, min: number, max: number) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) {
    throw new RestaurantError("Enter a valid number.");
  }
  return value;
}

export function text(value: unknown, max: number, min = 0) {
  if (value === undefined && !min) return "";
  if (typeof value !== "string" || value.includes("\0")) throw new RestaurantError("Enter valid text.");
  const result = value.trim();
  if (result.length < min || result.length > max) throw new RestaurantError("Check the text length.");
  return result;
}

export function date(value: unknown) {
  if (typeof value !== "string" || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) {
    throw new RestaurantError("Choose a valid date.");
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new RestaurantError("Choose a valid date.");
  }
  return value;
}

export function uuid(value: unknown) {
  if (typeof value !== "string" || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)) {
    throw new RestaurantError("Invalid record reference.");
  }
  return value.toLowerCase();
}

const MAX_BODY_BYTES = 16 * 1024;

async function boundedJson(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new RestaurantError("Expected a valid JSON object.");

  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let contents = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) throw new RestaurantError("Request body is too large.", 413);
      contents += decoder.decode(value, { stream: true });
    }
    return JSON.parse(contents + decoder.decode());
  } catch (error) {
    void reader.cancel().catch(() => {});
    if (error instanceof RestaurantError) throw error;
    throw new RestaurantError("Expected a valid JSON object.");
  } finally {
    reader.releaseLock();
  }
}

export async function mutation(request: NextRequest) {
  if (isCrossOrigin(request)) throw new RestaurantError("Invalid request origin.", 403);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new RestaurantError("Expected a JSON request.", 415);
  }
  const body = await boundedJson(request);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new RestaurantError("Expected a valid JSON object.");
  }
  return body as Record<string, unknown>;
}

export async function restaurantResponse(run: () => Promise<unknown>, status = 200) {
  try {
    return NextResponse.json(await run(), { status, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RestaurantError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const code = (error as { code?: string } | null)?.code;
    if (code === "23P01") return NextResponse.json({ error: "That table is no longer available for this time." }, { status: 409 });
    if (code === "23505") return NextResponse.json({ error: "That value is already in use." }, { status: 409 });
    if (code === "23503") return NextResponse.json({ error: "A selected record changed. Refresh and try again." }, { status: 409 });
    console.error("Restaurant operation failed");
    return NextResponse.json({ error: "Unable to complete this request." }, { status: 500 });
  }
}
