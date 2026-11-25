
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

export default function CustomerSettingsPage() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] =
    useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        "/api/customer-auth/change-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            currentPassword,
            newPassword,
            confirmPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to change password."
        );
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setSuccess(
        "Password updated! Please log in with your new password."
      );

      setTimeout(() => {
        router.replace("/login");
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#24382C]";

  return (
    <main className="min-h-screen bg-[#F7F5EF] px-5 py-14">
      <div className="mx-auto max-w-md rounded-xl bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="font-serif text-2xl font-bold text-[#24382C]"
          >
            OLIVE <span className="text-[#C9A978]">&</span> EMBER
          </Link>

          <p className="mt-4 text-xs font-semibold tracking-[0.2em] text-[#B99B70]">
            ACCOUNT SECURITY
          </p>

          <h1 className="mt-5 font-serif text-3xl text-[#24382C]">
            Change Password
          </h1>

          <p className="mt-3 text-sm text-gray-500">
            Update your customer account password.
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
          <p
            role="status"
            className="mb-5 rounded bg-green-50 p-3 text-sm text-green-800"
          >
            {success}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="currentPassword"
              className="mb-2 block text-xs font-bold"
            >
              CURRENT PASSWORD
            </label>
            <input
              id="currentPassword"
              type={showPasswords ? "text" : "password"}
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) =>
                setCurrentPassword(e.target.value)
              }
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="newPassword"
              className="mb-2 block text-xs font-bold"
            >
              NEW PASSWORD
            </label>
            <input
              id="newPassword"
              type={showPasswords ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) =>
                setNewPassword(e.target.value)
              }
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-xs font-bold"
            >
              CONFIRM NEW PASSWORD
            </label>
            <input
              id="confirmPassword"
              type={showPasswords ? "text" : "password"}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
              className={inputClass}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showPasswords}
              onChange={(e) =>
                setShowPasswords(e.target.checked)
              }
            />
            Show passwords
          </label>

          <p className="text-xs leading-5 text-gray-500">
            Use 8–128 characters with uppercase and lowercase
            letters, a number and a special character.
          </p>

          <button
            type="submit"
            disabled={loading || Boolean(success)}
            className="w-full rounded-md bg-[#24382C] px-6 py-4 text-sm font-semibold text-white hover:bg-[#3A5844] disabled:opacity-50"
          >
            {loading ? "Updating..." : "Change Password"}
          </button>
        </form>

        <Link
          href="/account"
          className="mt-7 block text-center text-sm text-gray-500 hover:underline"
        >
          ← Back to Customer Account
        </Link>
      </div>
    </main>
  );
}
