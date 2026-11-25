"use client";

import { useEffect, useState } from "react";

export type MenuItem = {
  id: number;
  name: string;
  price: string | number;
  description: string;
  image_url: string | null;
};

export function useMenu() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/menu", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to load menu.");
        }
        if (!controller.signal.aborted) setMenu(data.items);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setError(error instanceof Error ? error.message : "Failed to load menu.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  return { menu, setMenu, loading, error, setError };
}

export function formatPrice(value: MenuItem["price"]) {
  return Number(value).toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
