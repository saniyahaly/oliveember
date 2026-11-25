
"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function logout() {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
    });

    if (response.ok) {
      router.replace("/admin/login");
      router.refresh();
    } else {
      alert("Logout failed. Please try again.");
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="rounded bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700"
    >
      Logout
    </button>
  );
}
