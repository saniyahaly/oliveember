
"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleRegister(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        "/api/customer-auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            email,
            password,
            confirmPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Registration failed."
        );
      }

      setSuccess(
        "Account created successfully! You can now log in."
      );

      setUsername("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Registration failed."
      );
    } finally {
      setLoading(false);
    }
  }

  const inputStyle =
    "w-full rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#24382C]";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F5EF] px-5 py-12">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl md:p-10">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="font-serif text-2xl font-bold text-[#24382C]"
          >
            OLIVE{" "}
            <span className="text-[#C9A978]">&</span>{" "}
            EMBER
          </Link>

          <p className="mt-3 text-xs font-semibold tracking-[0.2em] text-[#B99B70]">
            JOIN OUR RESTAURANT
          </p>

          <h1 className="mt-6 font-serif text-3xl text-[#24382C]">
            Create an Account
          </h1>

          <p className="mt-3 text-sm text-gray-500">
            Register to join the Olive & Ember community.
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

        {success && (
          <div
            role="status"
            className="mb-5 rounded bg-green-50 p-4 text-sm text-green-800"
          >
            {success}

            <Link
              href="/login"
              className="mt-2 block font-semibold underline"
            >
              Continue to Login
            </Link>
          </div>
        )}

        <form
          onSubmit={handleRegister}
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="username"
              className="mb-2 block text-xs font-bold"
            >
              USERNAME
            </label>

            <input
              id="username"
              type="text"
              required
              minLength={3}
              maxLength={30}
              autoComplete="username"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value)
              }
              placeholder="Choose a username"
              className={inputStyle}
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-xs font-bold"
            >
              EMAIL ADDRESS
            </label>

            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="you@example.com"
              className={inputStyle}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-xs font-bold"
            >
              PASSWORD
            </label>

            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="Create a strong password"
                className={`${inputStyle} pr-16`}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(!showPassword)
                }
                className="absolute inset-y-0 right-3 text-xs font-semibold text-[#24382C]"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <p className="mt-2 text-xs leading-5 text-gray-500">
              Use at least 8 characters with uppercase,
              lowercase, numbers and a special character.
            </p>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-xs font-bold"
            >
              CONFIRM PASSWORD
            </label>

            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
              placeholder="Repeat your password"
              className={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[#24382C] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#3A5844] disabled:opacity-50"
          >
            {loading
              ? "Creating Account..."
              : "Create Account"}
          </button>
        </form>

        <p className="mt-7 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#24382C] underline"
          >
            Login
          </Link>
        </p>

        <Link
          href="/"
          className="mt-5 block text-center text-xs text-gray-500 hover:underline"
        >
          ← Back to Restaurant
        </Link>
      </div>
    </main>
  );
}
