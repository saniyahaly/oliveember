import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { getDatabase } from "@/lib/db";
import { bookingSettings, limitCustomerAction } from "@/lib/restaurant";
import { date, integer, mutation, RestaurantError, restaurantResponse, text, uuid } from "@/lib/restaurant-request";

export const runtime = "nodejs";

async function customer() {
  const current = await getCurrentCustomer();
  if (!current) throw new RestaurantError("Sign in as a customer to manage reservations.", 401);
  return current;
}

export async function GET(request: NextRequest) {
  return restaurantResponse(async () => {
    const current = await customer();
    const settings = await bookingSettings();
    const sql = getDatabase();
    const day = request.nextUrl.searchParams.get("date");
    if (day !== null) {
      const party = Number(request.nextUrl.searchParams.get("party"));
      const slots = await sql`
        SELECT * FROM public.restaurant_available_slots(${date(day)}::date, ${integer(party, 1, 50)}::integer)
        ORDER BY starts_at, table_name
      `;
      return { settings, slots };
    }
    const reservations = await sql`
      SELECT r.id, r.table_id, t.name AS table_name, r.starts_at, r.ends_at, r.party_size,
             r.status, r.requests, r.starts_at > NOW() AND r.status IN ('pending','confirmed') AS can_cancel
      FROM public.restaurant_reservations r JOIN public.restaurant_tables t ON r.table_id = t.id
      WHERE r.customer_id = ${current.id}
      ORDER BY r.starts_at DESC LIMIT 100
    `;
    return { settings, reservations };
  });
}

export async function POST(request: NextRequest) {
  return restaurantResponse(async () => {
    const body = await mutation(request);
    const current = await customer();
    const sql = getDatabase();
    if (body.action === "cancel") {
      const [reservation] = await sql`
        UPDATE public.restaurant_reservations SET status = 'cancelled', updated_at = NOW()
        WHERE id = ${uuid(body.id)} AND customer_id = ${current.id}
          AND status IN ('pending','confirmed') AND starts_at > NOW()
        RETURNING id
      `;
      if (!reservation) throw new RestaurantError("No eligible reservation was found.", 404);
      return { id: reservation.id };
    }
    if (body.action !== "reserve") throw new RestaurantError("Invalid reservation action.");
    const day = date(body.date);
    const party = integer(body.party, 1, 50);
    const table = integer(body.table, 1, 2147483647);
    if (typeof body.slot !== "string" || body.slot.length > 40 || !Number.isFinite(Date.parse(body.slot))) {
      throw new RestaurantError("Choose an available time.");
    }
    const slot = new Date(body.slot).toISOString();
    const requests = text(body.requests, 500);
    await limitCustomerAction(current.id, "reserve");
    const [reservation] = await sql`
      INSERT INTO public.restaurant_reservations (id, customer_id, table_id, starts_at, ends_at, party_size, requests)
      SELECT ${randomUUID()}::uuid, ${current.id}::uuid, t.id, s.starts_at, s.ends_at, ${party}::integer, ${requests}::text
      FROM public.restaurant_available_slots(${day}::date, ${party}::integer) s
      JOIN public.restaurant_tables t ON t.id = s.table_id
      WHERE s.starts_at = ${slot}::timestamptz AND t.id = ${table}
        AND t.active AND t.capacity >= ${party}
      FOR SHARE OF t
      RETURNING id, status
    `;
    if (!reservation) throw new RestaurantError("This table or time is no longer available.", 409);
    return { id: reservation.id, status: reservation.status };
  });
}
