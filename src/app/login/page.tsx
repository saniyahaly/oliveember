
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { FormEvent } from "react";

export default function CustomerLoginPage() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/customer-auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          identifier,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Login failed.");
      }

      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(next === "/checkout" || next === "/reservations" ? next : "/account");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to log in."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F5EF] px-5 py-12">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl md:p-10">

        <div className="mb-8 text-center">
          <Link
            href="/"
            className="font-serif text-2xl font-bold text-[#24382C]"
          >
            OLIVE <span className="text-[#C9A978]">&</span> EMBER
          </Link>

          <p className="mt-3 text-xs font-semibold tracking-[0.2em] text-[#B99B70]">
            WELCOME BACK
          </p>

          <h1 className="mt-7 font-serif text-3xl text-[#24382C]">
            Customer Login
          </h1>

          <p className="mt-3 text-sm text-gray-500">
            Sign in to your Olive & Ember account.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-md bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">

          <div>
            <label
              htmlFor="identifier"
              className="mb-2 block text-xs font-bold text-[#24382C]"
            >
              USERNAME OR EMAIL
            </label>

            <input
              id="identifier"
              type="text"
              required
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Enter username or email"
              className="w-full rounded-md border border-gray-200 bg-gray-50 px-4 py-4 text-sm outline-none focus:border-[#24382C]"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-xs font-bold text-[#24382C]"
            >
              PASSWORD
            </label>

            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full rounded-md border border-gray-200 bg-gray-50 px-4 py-4 pr-16 text-sm outline-none focus:border-[#24382C]"
              />

              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-4 text-xs font-semibold text-[#24382C]"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[#24382C] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#3A5844] disabled:opacity-50"
          >
            {loading ? "Signing In..." : "Login"}
          </button>

        </form>

        <div className="mt-8 border-t border-gray-100 pt-6 text-center">
          <p className="text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-[#24382C] underline"
            >
              Register
            </Link>
          </p>

          <Link
            href="/"
            className="mt-5 block text-xs text-gray-500 hover:underline"
          >
            ← Back to Restaurant
          </Link>
        </div>

      </div>
    </main>
  );
}
