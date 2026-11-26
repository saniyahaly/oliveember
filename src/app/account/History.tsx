"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { price, restaurantJson, restaurantTime, statusLabel, type Order, type Reservation } from "@/lib/restaurant-client";
import { buttonClass, panelClass } from "../RestaurantShell";

type Data = { settings: { timezone: string }; orders?: Order[]; reservations?: (Reservation & { can_cancel: boolean })[] };

export function OrderContents({ order }: { order: Order }) {
  return (
    <>
      <p className="mt-2 text-sm">Order {order.id}</p>
      <p>{statusLabel(order.order_type)}{order.table_name ? ` · ${order.table_name}` : ""}</p>
      <p>Payment · Pay at Restaurant · {statusLabel(order.payment_status)}</p>
      <ul className="my-3 space-y-1 border-y border-[#E7E4DC] py-3">
        {order.items.map((item, index) => <li key={`${item.item_name}/${index}`} className="flex flex-wrap justify-between gap-2">
          <span>{item.quantity} × {item.item_name}</span><span>{price(item.line_total)}</span>
        </li>)}
      </ul>
      <p className="font-semibold">Total {price(order.total)}</p>
      {order.notes && <p className="mt-2 whitespace-pre-wrap break-words">Notes · {order.notes}</p>}
    </>
  );
}

export default function History({ section, id }: { section: "orders" | "reservations"; id?: string }) {
  const endpoint = `/api/${section}`;
  const url = id ? `${endpoint}?id=${encodeURIComponent(id)}` : endpoint;
  const [data, setData] = useState<Data>();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void restaurantJson<Data>(url)
      .then((result) => { if (active) setData(result); })
      .catch((err: Error) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [url]);

  async function cancel(record: string) {
    if (!window.confirm(`Cancel this ${section === "orders" ? "order" : "reservation"}?`)) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await restaurantJson(endpoint, { action: "cancel", id: record });
      setMessage(section === "orders" ? "Order cancelled." : "Reservation cancelled.");
      setData(await restaurantJson<Data>(url));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to cancel.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4">
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {message && <p role="status">{message}</p>}
      {!data && !error && <p role="status">Loading…</p>}
      {data?.reservations?.length === 0 && <p className={panelClass}>You have no reservations. <Link className="underline" href="/reservations">Reserve a table</Link>.</p>}
      {data?.orders?.length === 0 && <p className={panelClass}>You have no orders. <Link className="underline" href="/#menu">Browse the menu</Link>.</p>}
      {data?.reservations?.map((r) => (
        <article key={r.id} className={panelClass}>
          <h2 className="font-serif text-2xl">{r.table_name} · {statusLabel(r.status)}</h2>
          <p className="mt-2">{restaurantTime(r.starts_at, data.settings.timezone)} · {r.party_size} guests</p>
          {r.requests && <p className="mt-2 whitespace-pre-wrap break-words">{r.requests}</p>}
          {r.can_cancel && <button type="button" disabled={busy} className={`${buttonClass} mt-4`} onClick={() => void cancel(r.id)}>Cancel reservation</button>}
        </article>
      ))}
      {data?.orders?.map((order) => (
        <article key={order.id} className={panelClass}>
          <h2 className="font-serif text-2xl">{statusLabel(order.status)} · {price(order.total)}</h2>
          <p className="mt-2">{restaurantTime(order.created_at, data.settings.timezone)}</p>
          {id ? <OrderContents order={order} /> : <>
            <p>Payment · {statusLabel(order.payment_status)}</p>
            <Link className="mt-3 inline-block font-semibold underline" href={`/account/orders?id=${order.id}`}>View order details</Link>
          </>}
          {order.can_cancel && <button type="button" disabled={busy} className={`${buttonClass} mt-4 block`} onClick={() => void cancel(order.id)}>Cancel order</button>}
        </article>
      ))}
    </div>
  );
}
