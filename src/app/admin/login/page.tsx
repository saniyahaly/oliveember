
"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F5EF] px-5 py-12">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-xl md:p-10">
        <div className="mb-9 text-center">
          <Link
            href="/"
            className="font-serif text-2xl font-bold text-[#24382C]"
          >
            OLIVE <span className="text-[#C9A978]">&</span> EMBER
          </Link>
          <p className="mt-3 text-xs font-semibold tracking-[0.2em] text-[#B99B70]">
            RESTAURANT MANAGEMENT
          </p>

          <h1 className="mt-7 font-serif text-3xl text-[#24382C]">
            Admin Login
          </h1>

          <p className="mt-3 text-sm text-gray-500">
            Sign in to manage your restaurant menu.
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="mb-5 rounded bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label
              htmlFor="username"
              className="mb-2 block text-xs font-bold tracking-wider"
            >
              USERNAME
            </label>

            <input
              id="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full rounded border border-gray-200 bg-gray-50 px-4 py-4 text-sm outline-none focus:border-[#24382C]"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-xs font-bold tracking-wider"
            >
              PASSWORD
            </label>

            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded border border-gray-200 bg-gray-50 px-4 py-4 pr-16 text-sm outline-none focus:border-[#24382C]"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-sm text-[#24382C] hover:underline"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-[#24382C] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#3A5844] disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Login to Dashboard"}
          </button>
        </form>

        <Link
          href="/"
          className="mt-7 block text-center text-sm text-gray-500 hover:text-[#24382C]"
        >
          ← Back to Restaurant Website
        </Link>
      </div>
    </main>
  );
}
