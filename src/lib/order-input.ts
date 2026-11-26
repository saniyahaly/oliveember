import { integer, RestaurantError } from "@/lib/restaurant-request";

export function orderItems(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 30) {
    throw new RestaurantError("Choose 1–30 different dishes.");
  }
  const items = value.map((raw: unknown) => {
    if (!raw || typeof raw !== "object") throw new RestaurantError("Invalid cart item.");
    const item = raw as { id?: unknown; quantity?: unknown };
    return { id: integer(item.id, 1, 2147483647), quantity: integer(item.quantity, 1, 20) };
  });
  if (new Set(items.map((item) => item.id)).size !== items.length) {
    throw new RestaurantError("Duplicate dishes in the cart.");
  }
  return items.sort((a, b) => a.id - b.id);
}
