"use client";

import Link from "next/link";
import { price } from "@/lib/restaurant-client";
import { buttonClass, panelClass } from "../RestaurantShell";
import { setQuantity, useCart } from "./store";

export default function CartPanel() {
  const items = useCart();
  if (!items.length) return <div className={panelClass}>Your cart is empty. <Link className="underline" href="/#menu">Browse the menu</Link>.</div>;

  return (
    <section aria-label="Shopping cart" className={panelClass}>
      <ul className="divide-y divide-[#E7E4DC]">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0">
            <div>
              <h2 className="font-serif text-xl">{item.name}</h2>
              <p>{price(item.price)} each</p>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" className="rounded border px-3 py-1" aria-label={`Decrease ${item.name}`} disabled={item.quantity <= 1} onClick={() => setQuantity(item.id, item.quantity - 1)}>−</button>
              <span aria-label="Quantity">{item.quantity}</span>
              <button type="button" className="rounded border px-3 py-1" aria-label={`Increase ${item.name}`} disabled={item.quantity >= 20} onClick={() => setQuantity(item.id, item.quantity + 1)}>+</button>
              <button type="button" className="text-sm underline" onClick={() => setQuantity(item.id, 0)}>Remove<span className="sr-only"> {item.name}</span></button>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#E7E4DC] pt-4">
        <p className="font-semibold">Subtotal {price(items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0))}</p>
        <Link href="/checkout" className={buttonClass}>Checkout</Link>
      </div>
    </section>
  );
}
