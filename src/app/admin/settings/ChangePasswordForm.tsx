
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ChangePasswordForm() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (
      newPassword.length < 8 ||
      newPassword.length > 128 ||
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) ||
      !/[^A-Za-z0-9]/.test(newPassword)
    ) {
      setError(
        "Use 8–128 characters with uppercase, lowercase, " +
        "a number and a special character."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/auth/change-password",
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

      if (!response.ok || !data.success) {
        setError(data.error || "Unable to change password.");
        return;
      }

      setSuccess(
        "Password updated successfully. Please log in again."
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      router.replace("/admin/login");
      router.refresh();
    } catch {
      setError(
        "Connection error. Please check your internet and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-[#D9DFD5] bg-[#FAFBF8] " +
    "px-4 py-3 text-[#24382C] outline-none transition " +
    "focus:border-[#48684E] focus:ring-2 focus:ring-[#48684E]/15";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="currentPassword"
          className="mb-2 block text-sm font-semibold"
        >
          Current Password
        </label>

        <input
          id="currentPassword"
          type={showPasswords ? "text" : "password"}
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className={inputClass}
          autoComplete="current-password"
          placeholder="Enter current password"
          required
          maxLength={128}
        />
      </div>

      <div>
        <label
          htmlFor="newPassword"
          className="mb-2 block text-sm font-semibold"
        >
          New Password
        </label>

        <input
          id="newPassword"
          type={showPasswords ? "text" : "password"}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={inputClass}
          autoComplete="new-password"
          placeholder="Create a strong new password"
          required
          minLength={8}
          maxLength={128}
        />
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="mb-2 block text-sm font-semibold"
        >
          Confirm New Password
        </label>

        <input
          id="confirmPassword"
          type={showPasswords ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={inputClass}
          autoComplete="new-password"
          placeholder="Re-enter new password"
          required
          maxLength={128}
        />
      </div>

      <label className="flex cursor-pointer items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={showPasswords}
          onChange={(e) => setShowPasswords(e.target.checked)}
          className="h-4 w-4 accent-[#24382C]"
        />
        Show passwords
      </label>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-[#24382C] px-5 py-4 font-semibold text-white transition hover:bg-[#365540] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Updating Password..." : "Update Password"}
      </button>

      <p className="text-center text-xs leading-5 text-[#7B847B]">
        For security, changing your password will sign out all
        administrator sessions. Customer sessions are unaffected.
      </p>
    </form>
  );
}
