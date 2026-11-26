"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { price, restaurantJson, restaurantTime } from "@/lib/restaurant-client";
import { buttonClass, fieldClass, panelClass } from "../RestaurantShell";
import { clearCart, useCart } from "../cart/store";

type Option = { id: string; table_name: string; starts_at: string };
type Confirmation = { id: string; total: string };

async function orderKey(serialized: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(serialized));
  const fingerprint = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const storageKey = "olive-ember-order-request";
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed.fingerprint === fingerprint && typeof parsed.key === "string") return parsed.key as string;
  }
  const key = crypto.randomUUID();
  localStorage.setItem(storageKey, JSON.stringify({ key, fingerprint }));
  return key;
}

export default function Checkout() {
  const cart = useCart();
  const itemsKey = JSON.stringify(cart.map(({ id, quantity }) => ({ id, quantity })).sort((a, b) => a.id - b.id));
  const [orderType, setOrderType] = useState("takeaway");
  const [reservationId, setReservationId] = useState("");
  const [notes, setNotes] = useState("");
  const [available, setAvailable] = useState<{ settings: { timezone: string }; reservations: Option[] }>();
  const [quote, setQuote] = useState<{ key: string; total: string }>();
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [quoteError, setQuoteError] = useState<{ key: string; message: string }>();
  const [confirmation, setConfirmation] = useState<Confirmation>();

  useEffect(() => {
    let current = true;
    void restaurantJson<typeof available>("/api/orders?eligible=1")
      .then((data) => { if (current) setAvailable(data); })
      .catch((err: Error) => { if (current) setError(err.message); });
    return () => { current = false; };
  }, []);

  useEffect(() => {
    if (itemsKey === "[]") return;
    let current = true;
    void restaurantJson<{ total: string }>("/api/orders", { action: "quote", items: JSON.parse(itemsKey) })
      .then(({ total }) => {
        if (!current) return;
        setQuote({ key: itemsKey, total });
        setQuoteError(undefined);
      })
      .catch((err: Error) => { if (current) setQuoteError({ key: itemsKey, message: err.message }); });
    return () => { current = false; };
  }, [itemsKey, refresh]);

  const total = quote?.key === itemsKey ? quote.total : undefined;

  if (confirmation) return (
    <section className={panelClass} role="status">
      <h2 className="font-serif text-3xl">Order received</h2>
      <p className="mt-3 break-all">Order number {confirmation.id}</p>
      <p className="mt-2">{price(confirmation.total)} · Pay at Restaurant</p>
      <Link className={`${buttonClass} mt-5`} href={`/account/orders?id=${confirmation.id}`}>View order</Link>
    </section>
  );
  if (cart.length === 0) return <div className={panelClass}>Your cart is empty. <Link href="/#menu" className="underline">Browse the menu</Link>.</div>;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || total === undefined) return;
    setBusy(true);
    setError("");
    try {
      const payload = { action: "order", items: JSON.parse(itemsKey), orderType, reservationId: orderType === "dine-in" ? reservationId : undefined, notes };
      const key = await orderKey(JSON.stringify(payload));
      const result = await restaurantJson<Confirmation>("/api/orders", { ...payload, key, reviewedTotal: total });
      setConfirmation(result);
      clearCart();
      localStorage.removeItem("olive-ember-order-request");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to place the order.");
      setQuote(undefined);
      setRefresh((value) => value + 1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={`${panelClass} grid gap-5`} onSubmit={submit}>
      <ul className="space-y-2 border-b border-[#E7E4DC] pb-4">
        {cart.map(({ id, name, quantity }) => <li key={id}>{quantity} × {name}</li>)}
      </ul>
      <label className="grid gap-2 font-semibold">Order type
        <select className={fieldClass} value={orderType} onChange={(event) => setOrderType(event.target.value)}>
          <option value="takeaway">Takeaway</option><option value="dine-in">Dine-in</option>
        </select>
      </label>
      {orderType === "dine-in" && <label className="grid gap-2 font-semibold">Confirmed reservation
        <select required className={fieldClass} value={reservationId} onChange={(event) => setReservationId(event.target.value)}>
          <option value="">Choose a reservation</option>
          {available?.reservations.map((r) => <option value={r.id} key={r.id}>{r.table_name} · {restaurantTime(r.starts_at, available.settings.timezone)}</option>)}
        </select>
        <span className="text-sm font-normal">Dine-in orders require your own confirmed reservation during its scheduled time.</span>
      </label>}
      <label className="grid gap-2 font-semibold">Order notes <textarea className={fieldClass} rows={3} value={notes} maxLength={500} onChange={(event) => setNotes(event.target.value)} /></label>
      <p>Payment method · Pay at Restaurant</p>
      <p role="status" className="font-semibold">{total === undefined ? (quoteError?.key === itemsKey ? quoteError.message : "Checking the menu total…") : `Order total ${price(total)}`}</p>
      {quoteError?.key === itemsKey && <button type="button" className="justify-self-start underline" onClick={() => setRefresh((value) => value + 1)}>Retry total</button>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <button type="submit" className={buttonClass} disabled={busy || total === undefined || (orderType === "dine-in" && !reservationId)}>
        {busy ? "Placing order…" : "Place order"}
      </button>
    </form>
  );
}
