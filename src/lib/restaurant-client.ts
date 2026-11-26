export async function restaurantJson<T>(url: string, body?: object): Promise<T> {
  const response = await fetch(url, body ? {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  } : { cache: "no-store" });

  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Unable to complete this request.");
  return result as T;
}

export type Reservation = {
  id: string;
  table_name: string;
  table_id: number;
  starts_at: string;
  ends_at: string;
  party_size: number;
  status: string;
  requests: string;
  customer?: string;
  email?: string;
};

export type OrderLine = { item_name: string; quantity: number; unit_price: string; line_total: string };
export type Order = {
  id: string;
  order_type: string;
  status: string;
  payment_status: string;
  total: string;
  notes: string;
  created_at: string;
  can_cancel: boolean;
  items: OrderLine[];
  table_name?: string;
  customer?: string;
  email?: string;
};

export function restaurantTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-PK", {
    timeZone, dateStyle: "medium", timeStyle: "short",
  }).format(new Date(value));
}

export function price(value: number | string) {
  return `Rs. ${Number(value).toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;
}

export function statusLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll("-", " ");
}
