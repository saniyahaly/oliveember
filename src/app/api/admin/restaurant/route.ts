import { NextRequest } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { bookingSettings } from "@/lib/restaurant";
import { date, integer, mutation, RestaurantError, restaurantResponse, text, uuid } from "@/lib/restaurant-request";

export const runtime = "nodejs";
const reservationStatuses = ["pending", "confirmed", "cancelled", "completed"];
const orderStatuses = ["pending", "accepted", "preparing", "ready", "served", "completed", "cancelled"];

async function requireAdmin() {
  if (!(await isAdminAuthenticated())) throw new RestaurantError("Admin login required.", 401);
}

export async function GET(request: NextRequest) {
  return restaurantResponse(async () => {
    await requireAdmin();
    const sql = getDatabase();
    const params = request.nextUrl.searchParams;
    const section = params.get("section") ?? "overview";
    const settings = await bookingSettings();

    if (section === "overview") {
      const [stats] = await sql`
        SELECT
          (SELECT count(*)::integer FROM public.restaurant_reservations
            WHERE (starts_at AT TIME ZONE ${settings.timezone})::date = ${settings.today}::date
              AND status <> 'cancelled') AS today_reservations,
          (SELECT count(*)::integer FROM public.restaurant_reservations
             WHERE status = 'pending' AND ends_at > NOW()) AS pending_reservations,
          (SELECT count(*)::integer FROM public.restaurant_orders WHERE status = 'pending') AS pending_orders,
          (SELECT count(*)::integer FROM public.restaurant_tables WHERE active) AS active_tables,
          (SELECT count(*)::integer FROM public.restaurant_orders WHERE status = 'completed') AS completed_orders,
          (SELECT COALESCE(sum(total),0)::text FROM public.restaurant_orders
             WHERE payment_status = 'paid' AND (paid_at AT TIME ZONE ${settings.timezone})::date = ${settings.today}::date) AS today_sales
      `;
      return { settings, stats };
    }

    const tables = await sql`SELECT id, name, capacity, active FROM public.restaurant_tables ORDER BY name`;
    if (section === "tables") return { settings, tables };

    const dateParam = params.get("date");
    const day = dateParam ? date(dateParam) : null;
    const status = params.get("status") || null;

    if (section === "reservations") {
      if (status && !reservationStatuses.includes(status)) throw new RestaurantError("Invalid reservation status.");
      const reservations = await sql`
        SELECT r.id, r.table_id, t.name AS table_name, r.starts_at, r.ends_at, r.party_size, r.status, r.requests,
               c.username AS customer, c.email
        FROM public.restaurant_reservations r JOIN public.restaurant_tables t ON r.table_id = t.id
        JOIN public.customer_accounts c ON c.id = r.customer_id
        WHERE (${day}::date IS NULL OR (r.starts_at AT TIME ZONE ${settings.timezone})::date = ${day}::date)
          AND (${day}::date IS NOT NULL OR ${status}::text IS NOT NULL OR r.ends_at > NOW())
          AND (${status}::text IS NULL OR r.status = ${status})
        ORDER BY r.starts_at LIMIT 100
      `;
      return { settings, tables, reservations };
    }

    if (section === "orders") {
      if (status && !orderStatuses.includes(status)) throw new RestaurantError("Invalid order status.");
      const orders = await sql`
        SELECT o.id, o.order_type, o.status, o.payment_status, o.total::text, o.notes, o.created_at,
               t.name AS table_name, c.username AS customer, c.email,
               COALESCE((SELECT json_agg(json_build_object('item_name', i.item_name, 'quantity', i.quantity,
                 'unit_price', i.unit_price::text, 'line_total', i.line_total::text) ORDER BY i.id)
                 FROM public.restaurant_order_items i WHERE i.order_id = o.id),'[]'::json) AS items
        FROM public.restaurant_orders o JOIN public.customer_accounts c ON c.id = o.customer_id
        LEFT JOIN public.restaurant_tables t ON t.id = o.table_id
        WHERE (${day}::date IS NULL OR (o.created_at AT TIME ZONE ${settings.timezone})::date = ${day}::date)
          AND (${status}::text IS NULL OR o.status = ${status})
        ORDER BY o.created_at DESC LIMIT 100
      `;
      return { settings, orders };
    }

    throw new RestaurantError("Unknown section.", 404);
  });
}

function time(value: unknown) {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new RestaurantError("Use a valid opening or closing time.");
  }
  return value;
}

function orderPreviousStatus(status: string) {
  switch (status) {
    case "accepted": return "pending";
    case "preparing": return "accepted";
    case "ready": return "preparing";
    case "served": return "ready";
    default: return null;
  }
}

export async function POST(request: NextRequest) {
  return restaurantResponse(async () => {
    const body = await mutation(request);
    await requireAdmin();
    const sql = getDatabase();

    if (body.action === "table") {
      const name = text(body.name, 40, 1);
      const capacity = integer(body.capacity, 1, 50);
      if (typeof body.active !== "boolean") throw new RestaurantError("Choose a table status.");
      const active = body.active;
      if (body.id === undefined) {
        const [table] = await sql`
          INSERT INTO public.restaurant_tables (name, capacity, active)
          VALUES (${name}, ${capacity}, ${active}) RETURNING id
        `;
        return table;
      }
      const id = integer(body.id, 1, 2147483647);
      const [, updated] = await sql.transaction([
        sql`SELECT id FROM public.restaurant_tables WHERE id = ${id} FOR NO KEY UPDATE`,
        sql`
          UPDATE public.restaurant_tables t SET name = ${name}, capacity = ${capacity}, active = ${active}, updated_at = NOW()
          WHERE t.id = ${id} AND NOT EXISTS (
            SELECT 1 FROM public.restaurant_reservations r
            WHERE r.table_id = t.id AND r.status IN ('pending','confirmed') AND r.ends_at > NOW()
              AND (NOT ${active}::boolean OR r.party_size > ${capacity})
          )
          RETURNING id
        `,
      ], { isolationLevel: "ReadCommitted" });
      if (!updated.length) throw new RestaurantError("Table unavailable or has bookings that conflict with this change.", 409);
      return updated[0];
    }

    if (body.action === "settings") {
      const zone = text(body.timezone, 80, 1);
      const opens = time(body.opens);
      const closes = time(body.closes);
      const advance = integer(body.advance, 1, 365);
      const lead = integer(body.lead, 0, 1440);
      const duration = integer(body.duration, 30, 240);
      const cancel = integer(body.cancel, 0, 120);
      const [updated] = await sql`
        UPDATE public.restaurant_booking_settings SET timezone = ${zone}, opens_at = ${opens}::time,
          closes_at = ${closes}::time, advance_days = ${advance}, lead_minutes = ${lead},
          duration_minutes = ${duration}, order_cancel_minutes = ${cancel}
        WHERE id AND EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = ${zone})
          AND ${closes}::time - ${opens}::time >= ${duration} * INTERVAL '1 minute'
        RETURNING id
      `;
      if (!updated) throw new RestaurantError("Check the time zone and ensure opening hours fit a reservation.");
      return { success: true };
    }

    if (body.action === "reservation") {
      const id = uuid(body.id);
      const status = text(body.status, 12, 1);
      const table = body.table === undefined ? null : integer(body.table, 1, 2147483647);
      if (!["assign", "confirmed", "cancelled", "completed"].includes(status)) {
        throw new RestaurantError("Invalid reservation transition.");
      }
      if (status === "assign" && !table) throw new RestaurantError("Choose a table.");
      if (status === "assign" || status === "confirmed") {
        const [, changed] = await sql.transaction([
          sql`SELECT id FROM public.restaurant_reservations WHERE id = ${id} FOR NO KEY UPDATE`,
          sql`
          WITH candidate AS MATERIALIZED (
            SELECT t.id
            FROM public.restaurant_reservations r
            JOIN public.restaurant_tables t ON t.id = COALESCE(${table}::integer,r.table_id)
            WHERE r.id = ${id} AND t.active AND t.capacity >= r.party_size
            FOR SHARE OF t
          )
          UPDATE public.restaurant_reservations r SET table_id = c.id,
            status = CASE WHEN ${status} = 'confirmed' THEN 'confirmed' ELSE r.status END, updated_at = NOW()
          FROM candidate c
          WHERE r.id = ${id} AND r.ends_at > NOW()
            AND ((${status} = 'confirmed' AND r.status = 'pending') OR
                 (${status} = 'assign' AND r.status IN ('pending','confirmed')))
            AND (r.table_id = c.id OR NOT EXISTS (SELECT 1 FROM public.restaurant_orders WHERE reservation_id = r.id))
          RETURNING r.id
          `,
        ], { isolationLevel: "ReadCommitted" });
        if (!changed.length) throw new RestaurantError("A suitable table or eligible reservation was not found.", 409);
        return changed[0];
      }
      const [, updated] = await sql.transaction([
        sql`SELECT id FROM public.restaurant_reservations WHERE id = ${id} FOR NO KEY UPDATE`,
        sql`
          UPDATE public.restaurant_reservations r SET status = ${status}, updated_at = NOW()
          WHERE r.id = ${id} AND (
            (${status} = 'cancelled' AND r.status IN ('pending','confirmed')) OR
            (${status} = 'completed' AND r.status = 'confirmed' AND r.starts_at <= NOW())
          )
          AND NOT EXISTS (SELECT 1 FROM public.restaurant_orders WHERE reservation_id = r.id
                           AND status NOT IN ('completed','cancelled'))
          RETURNING id
        `,
      ], { isolationLevel: "ReadCommitted" });
      if (!updated.length) throw new RestaurantError("Reservation status or active orders prevent this change.", 409);
      return updated[0];
    }

    if (body.action === "order") {
      const id = uuid(body.id);
      const status = text(body.status, 12, 1);
      if (status === "paid") {
        const [paid] = await sql`
          UPDATE public.restaurant_orders SET payment_status = 'paid', paid_at = NOW(), updated_at = NOW()
          WHERE id = ${id} AND status IN ('accepted','preparing','ready','served') AND payment_status = 'unpaid'
          RETURNING id
        `;
        if (!paid) throw new RestaurantError("Payment cannot be recorded for this order.", 409);
        return paid;
      }
      const previous = orderPreviousStatus(status);
      if (!previous && status !== "completed" && status !== "cancelled") {
        throw new RestaurantError("Invalid order transition.");
      }
      const [updated] = await sql`
        UPDATE public.restaurant_orders SET status = ${status}, updated_at = NOW()
        WHERE id = ${id} AND (
          (status = ${previous} AND (${status} <> 'served' OR order_type = 'dine-in')) OR
          (${status} = 'completed' AND payment_status = 'paid' AND
            ((order_type = 'takeaway' AND status = 'ready') OR (order_type = 'dine-in' AND status = 'served'))) OR
          (${status} = 'cancelled' AND payment_status = 'unpaid' AND status IN ('pending','accepted','preparing','ready'))
        )
        RETURNING id
      `;
      if (!updated) throw new RestaurantError("This order cannot move to that status.", 409);
      return updated;
    }

    throw new RestaurantError("Unknown management action.");
  });
}
