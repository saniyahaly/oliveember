"use client";

import { useState } from "react";
import { addCartItem, type CartItem } from "./store";

export default function AddToCart({ item }: { item: Omit<CartItem, "quantity"> }) {
  const [message, setMessage] = useState("");
  return (
    <div className="mt-3">
      <button type="button"
        onClick={() => {
          try { setMessage(addCartItem(item) ? "Added to cart." : "Cart limit reached."); }
          catch { setMessage("The cart is unavailable in this browser."); }
        }}
        className="rounded-lg border border-[#667D6C] px-3 py-2 text-sm font-semibold hover:bg-[#EAEFE7]">
        Add to Cart
      </button>
      <p role="status" className="mt-1 min-h-4 text-xs text-[#536157]">{message}</p>
    </div>
  );
}
