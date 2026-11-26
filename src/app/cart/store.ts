"use client";

import { useSyncExternalStore } from "react";

const cartKey = "olive-ember-cart";
export type CartItem = { id: number; name: string; price: string | number; quantity: number };

function readCart() {
  try { return localStorage.getItem(cartKey) ?? "[]"; } catch { return "[]"; }
}

function subscribe(onChange: () => void) {
  window.addEventListener("olive-cart-change", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("olive-cart-change", onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function getCart(): CartItem[] {
  return parseCart(readCart());
}

function parseCart(serialized: string): CartItem[] {
  try {
    const items: unknown = JSON.parse(serialized);
    if (!Array.isArray(items)) return [];
    return items.filter((item): item is CartItem =>
      item && Number.isInteger(item.id) && item.id > 0 &&
      typeof item.name === "string" && Number.isFinite(Number(item.price)) &&
      Number(item.price) >= 0 && Number.isInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 20
    ).slice(0, 30);
  } catch {
    return [];
  }
}

export function useCart() {
  return parseCart(useSyncExternalStore(subscribe, readCart, () => "[]"));
}

function save(items: CartItem[]) {
  localStorage.setItem(cartKey, JSON.stringify(items));
  window.dispatchEvent(new Event("olive-cart-change"));
}

export function setQuantity(id: number, quantity: number) {
  save(getCart().flatMap((item) => {
    if (item.id !== id) return [item];
    return quantity > 0 ? [{ ...item, quantity: Math.min(quantity, 20) }] : [];
  }));
}

export function addCartItem(item: Omit<CartItem, "quantity">) {
  const items = getCart();
  const old = items.find((entry) => entry.id === item.id);
  if ((old && old.quantity >= 20) || (!old && items.length >= 30)) return false;
  save(old
    ? items.map((entry) => entry.id === item.id ? { ...item, quantity: entry.quantity + 1 } : entry)
    : [...items, { ...item, quantity: 1 }]);
  return true;
}

export function clearCart() {
  save([]);
}
