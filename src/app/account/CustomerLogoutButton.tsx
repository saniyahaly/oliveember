
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CustomerLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);

    try {
      const response = await fetch(
        "/api/customer-auth/logout",
        {
          method: "POST",
          credentials: "same-origin",
        }
      );

      if (!response.ok) {
        throw new Error("Logout failed.");
      }

      router.replace("/login");
      router.refresh();
    } catch {
      alert("Unable to log out. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="rounded-md bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
    >
      {loading ? "Logging Out..." : "Logout"}
    </button>
  );
}
