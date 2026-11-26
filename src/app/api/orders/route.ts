import { createHash, randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { getDatabase } from "@/lib/db";
import { orderItems } from "@/lib/order-input";
import { bookingSettings, limitCustomerAction } from "@/lib/restaurant";
import { mutation, RestaurantError, restaurantResponse, text, uuid } from "@/lib/restaurant-request";

export const runtime = "nodejs";

async function customer() {
  const current = await getCurrentCustomer();
  if (!current) throw new RestaurantError("Sign in as a customer to manage orders.", 401);
  return current;
}

export async function GET(request: NextRequest) {
  return restaurantResponse(async () => {
    const current = await customer();
    const settings = await bookingSettings();
    const sql = getDatabase();
    if (request.nextUrl.searchParams.get("eligible") === "1") {
      const reservations = await sql`
        SELECT r.id, t.name AS table_name, r.starts_at, r.ends_at
        FROM public.restaurant_reservations r JOIN public.restaurant_tables t ON t.id = r.table_id
        WHERE r.customer_id = ${current.id} AND r.status = 'confirmed'
          AND r.starts_at <= NOW() AND r.ends_at > NOW() AND t.active
        ORDER BY r.starts_at
      `;
      return { settings, reservations };
    }
    const rawId = request.nextUrl.searchParams.get("id");
    const id = rawId ? uuid(rawId) : null;
    const orders = await sql`
      SELECT o.id, o.order_type, o.status, o.payment_status, o.total::text, o.notes, o.created_at,
             t.name AS table_name,
             o.status = 'pending' AND o.payment_status = 'unpaid'
               AND o.created_at + cfg.order_cancel_minutes * INTERVAL '1 minute' > NOW() AS can_cancel,
             COALESCE((SELECT json_agg(json_build_object('item_name', i.item_name, 'quantity', i.quantity,
               'unit_price', i.unit_price::text, 'line_total', i.line_total::text) ORDER BY i.id)
               FROM public.restaurant_order_items i WHERE i.order_id = o.id),'[]'::json) AS items
      FROM public.restaurant_orders o CROSS JOIN public.restaurant_booking_settings cfg
      LEFT JOIN public.restaurant_tables t ON t.id = o.table_id
      WHERE cfg.id AND o.customer_id = ${current.id} AND (${id}::uuid IS NULL OR o.id = ${id}::uuid)
      ORDER BY o.created_at DESC LIMIT 100
    `;
    if (id && orders.length === 0) throw new RestaurantError("Order not found.", 404);
    return { settings, orders };
  });
}

export async function POST(request: NextRequest) {
  return restaurantResponse(async () => {
    const body = await mutation(request);
    const current = await customer();
    const sql = getDatabase();
    if (body.action === "cancel") {
      const [cancelled] = await sql`
        UPDATE public.restaurant_orders o SET status = 'cancelled', updated_at = NOW()
        FROM public.restaurant_booking_settings cfg
        WHERE cfg.id AND o.id = ${uuid(body.id)} AND o.customer_id = ${current.id}
          AND o.status = 'pending' AND o.payment_status = 'unpaid'
          AND o.created_at + cfg.order_cancel_minutes * INTERVAL '1 minute' > NOW()
        RETURNING o.id
      `;
      if (!cancelled) throw new RestaurantError("No eligible order was found.", 404);
      return cancelled;
    }

    if (body.action !== "quote" && body.action !== "order") throw new RestaurantError("Invalid order action.");
    const items = JSON.stringify(orderItems(body.items));
    if (body.action === "quote") {
      const [quote] = await sql`
        SELECT sum(m.price * i.quantity)::text AS total
        FROM jsonb_to_recordset(${items}::jsonb) i(id integer, quantity integer)
        JOIN public.menu_items m ON m.id = i.id
        HAVING count(*) = jsonb_array_length(${items}::jsonb)
      `;
      if (!quote) throw new RestaurantError("A dish is no longer on the menu.", 409);
      return quote;
    }

    const orderType = body.orderType;
    if (orderType !== "takeaway" && orderType !== "dine-in") throw new RestaurantError("Choose an order type.");
    const reservationId = orderType === "dine-in" ? uuid(body.reservationId) : null;
    if (orderType === "takeaway" && body.reservationId) throw new RestaurantError("Takeaway orders do not use a table.");
    const notes = text(body.notes, 500);
    const key = uuid(body.key);
    const fingerprint = createHash("sha256").update(JSON.stringify([items, orderType, reservationId, notes])).digest("hex");
    const existing = async () => {
      const [order] = await sql`
        SELECT id, total::text, status, request_fingerprint FROM public.restaurant_orders
        WHERE customer_id = ${current.id} AND request_key = ${key}
      `;
      if (!order) return null;
      if (order.request_fingerprint !== fingerprint) throw new RestaurantError("This order key was already used.", 409);
      return { id: order.id, total: order.total, status: order.status };
    };
    const previous = await existing();
    if (previous) return previous;

    const reviewedTotal = body.reviewedTotal;
    if (typeof reviewedTotal !== "string" || !/^\d{1,12}(?:\.\d{1,2})?$/.test(reviewedTotal)) {
      throw new RestaurantError("Review the order total before placing the order.");
    }
    await limitCustomerAction(current.id, "order");
    const [order] = await sql`
      WITH priced AS MATERIALIZED (
        SELECT m.id, m.name, m.price, i.quantity
        FROM jsonb_to_recordset(${items}::jsonb) i(id integer, quantity integer)
        JOIN public.menu_items m ON m.id = i.id
        ORDER BY m.id FOR SHARE OF m
      ), verified_table AS MATERIALIZED (
        SELECT r.id, r.table_id FROM public.restaurant_reservations r
        JOIN public.restaurant_tables t ON t.id = r.table_id
        WHERE r.id = ${reservationId}::uuid AND r.customer_id = ${current.id}
          AND r.status = 'confirmed' AND r.starts_at <= NOW() AND r.ends_at > NOW() AND t.active
        FOR SHARE OF r,t
      ), totals AS (
        SELECT sum(price * quantity) AS total FROM priced
        HAVING count(*) = jsonb_array_length(${items}::jsonb)
      ), inserted AS (
        INSERT INTO public.restaurant_orders (id, customer_id, request_key, request_fingerprint,
          order_type, reservation_id, table_id, notes, total)
        SELECT ${randomUUID()}::uuid, ${current.id}::uuid, ${key}::uuid, ${fingerprint}::text,
          ${orderType}::text, r.id, r.table_id, ${notes}::text, totals.total
        FROM totals LEFT JOIN verified_table r ON TRUE
        WHERE (${orderType} = 'takeaway' OR r.id IS NOT NULL) AND totals.total = ${reviewedTotal}::numeric
        ON CONFLICT (customer_id, request_key) DO NOTHING
        RETURNING id, total, status
      ), lines AS (
        INSERT INTO public.restaurant_order_items (order_id, menu_item_id, item_name, quantity, unit_price)
        SELECT o.id, p.id, p.name, p.quantity, p.price FROM inserted o CROSS JOIN priced p
      )
      SELECT id, total::text, status FROM inserted
    `;
    if (order) return order;
    const repeated = await existing();
    if (repeated) return repeated;
    throw new RestaurantError("The menu total or reservation changed. Review checkout and try again.", 409);
  });
}
