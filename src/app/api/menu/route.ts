import { NextRequest, NextResponse } from "next/server";
import { getActiveSessionId } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { validateMenuImageUrl } from "@/lib/menu-image";
import { isCrossOrigin, readJsonObject } from "@/lib/request";

export const runtime = "nodejs";

function validId(id: unknown): id is number {
  return typeof id === "number" && Number.isInteger(id) && id > 0 && id <= 2147483647;
}

function readDish(body: Record<string, unknown>) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const { price } = body;

  if (
    !name || name.length > 150 || name.includes("\0") ||
    !description || description.length > 5000 || description.includes("\0") ||
    typeof price !== "number" || !Number.isFinite(price) ||
    price < 0 || price > 99999999.99 ||
    Number(price.toFixed(2)) !== price
  ) {
    return { error: "Enter valid dish details" } as const;
  }

  const { url, error } = validateMenuImageUrl(body.image_url);
  if (error) return { error } as const;
  const imageUrl = body.image_url === undefined ? undefined : url;

  return { dish: { name, description, price, imageUrl } } as const;
}

function menuError(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

async function writeMenu(
  request: NextRequest,
  write: (body: Record<string, unknown>, sessionId: string) => Promise<NextResponse>
) {
  if (isCrossOrigin(request)) return menuError("Invalid request origin", 403);

  try {
    const sessionId = await getActiveSessionId();
    if (!sessionId) return menuError("Admin login required", 401);

    const body = await readJsonObject(request);
    if (!body) return menuError("Expected a valid JSON object", 400);

    return await write(body, sessionId);
  } catch {
    console.error("Menu write failed.");
    return menuError("Menu write failed", 500);
  }
}

export async function GET() {
  try {
    const sql = getDatabase();
    const items = await sql`
      SELECT id, name, price, description, image_url FROM menu_items ORDER BY id DESC
    `;
    return NextResponse.json({ success: true, items });
  } catch {
    console.error("Menu read failed.");
    return menuError("Failed to fetch menu", 500);
  }
}

export async function POST(request: NextRequest) {
  return writeMenu(request, async (body, sessionId) => {
    const result = readDish(body);
    if (result.error !== undefined) return menuError(result.error, 400);
    const { dish } = result;

    const sql = getDatabase();
    const [item] = await sql`
      INSERT INTO menu_items (name, price, description, image_url)
      SELECT ${dish.name}, ${dish.price}::numeric, ${dish.description}, ${dish.imageUrl ?? null}::text
      FROM admin_sessions WHERE id = ${sessionId} AND expires_at > NOW()
      FOR KEY SHARE
      RETURNING id, name, price, description, image_url
    `;
    if (!item) return menuError("Admin login required", 401);
    return NextResponse.json({ success: true, item }, { status: 201 });
  });
}

export async function PUT(request: NextRequest) {
  return writeMenu(request, async (body, sessionId) => {
    const { id } = body;
    if (!validId(id)) return menuError("Invalid item ID", 400);
    const result = readDish(body);
    if (result.error !== undefined) return menuError(result.error, 400);
    const { dish } = result;

    const sql = getDatabase();
    const [item] = await sql`
      UPDATE menu_items
      SET name = ${dish.name},
          price = ${dish.price},
          description = ${dish.description},
          image_url = CASE WHEN ${dish.imageUrl !== undefined}::boolean
                           THEN ${dish.imageUrl ?? null}::text ELSE image_url END
      WHERE id = ${id} AND EXISTS (
        SELECT id FROM admin_sessions WHERE id = ${sessionId} AND expires_at > NOW()
        FOR KEY SHARE
      )
      RETURNING id, name, price, description, image_url
    `;
    if (!item) {
      return (await getActiveSessionId())
        ? menuError("Menu item not found", 404)
        : menuError("Admin login required", 401);
    }
    return NextResponse.json({ success: true, item, message: "Menu item updated successfully" });
  });
}

export async function DELETE(request: NextRequest) {
  return writeMenu(request, async ({ id }, sessionId) => {
    if (!validId(id)) return menuError("Invalid item ID", 400);

    const sql = getDatabase();
    const [item] = await sql`
      DELETE FROM menu_items
      WHERE id = ${id} AND EXISTS (
        SELECT id FROM admin_sessions WHERE id = ${sessionId} AND expires_at > NOW()
        FOR KEY SHARE
      )
      RETURNING id
    `;
    if (!item) {
      return (await getActiveSessionId())
        ? menuError("Dish not found", 404)
        : menuError("Admin login required", 401);
    }
    return NextResponse.json({ success: true, message: "Dish deleted successfully" });
  });
}
