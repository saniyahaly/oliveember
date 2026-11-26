import { getDatabase } from "@/lib/db";
import { RestaurantError } from "@/lib/restaurant-request";

export async function bookingSettings() {
  const sql = getDatabase();
  const [settings] = await sql`
    SELECT timezone, opens_at::text, closes_at::text, advance_days, lead_minutes, duration_minutes,
           order_cancel_minutes, ((NOW() AT TIME ZONE timezone)::date)::text AS today,
           ((NOW() AT TIME ZONE timezone)::date + advance_days)::text AS last_day
    FROM public.restaurant_booking_settings WHERE id
  `;
  if (!settings) throw new RestaurantError("Restaurant booking settings are unavailable.", 503);
  return settings;
}

export async function limitCustomerAction(customerId: string, action: "reserve" | "order") {
  const sql = getDatabase();
  const [attempt] = await sql`
    INSERT INTO public.restaurant_action_limits (customer_id, action, window_started_at, attempts)
    VALUES (${customerId}, ${action}, NOW(), 1)
    ON CONFLICT (customer_id, action) DO UPDATE
    SET attempts = CASE WHEN restaurant_action_limits.window_started_at <= NOW() - INTERVAL '10 minutes'
                        THEN 1 ELSE restaurant_action_limits.attempts + 1 END,
        window_started_at = CASE WHEN restaurant_action_limits.window_started_at <= NOW() - INTERVAL '10 minutes'
                                 THEN NOW() ELSE restaurant_action_limits.window_started_at END
    WHERE restaurant_action_limits.window_started_at <= NOW() - INTERVAL '10 minutes'
       OR restaurant_action_limits.attempts < ${action === "reserve" ? 6 : 12}
    RETURNING attempts
  `;
  if (!attempt) throw new RestaurantError("Too many attempts. Try again in a few minutes.", 429);
}
