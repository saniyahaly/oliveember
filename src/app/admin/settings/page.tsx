
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import ChangePasswordForm from "./ChangePasswordForm";

export default async function AdminSettingsPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  return (
    <main className="min-h-screen bg-[#F7F5EF] px-5 py-12 text-[#24382C] md:py-20">
      <div className="mx-auto max-w-xl">
        <Link
          href="/admin"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium hover:underline"
        >
          ← Back to Admin Dashboard
        </Link>

        <div className="overflow-hidden rounded-3xl border border-[#E2E6DC] bg-white shadow-xl">
          <div className="border-b border-[#E2E6DC] bg-[#24382C] px-7 py-9 text-white">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <span className="text-2xl">⚙</span>
            </div>

            <h1 className="font-serif text-3xl">
              Admin Account Settings
            </h1>

            <p className="mt-2 text-sm text-white/75">
              Manage the security of your Olive & Ember
              administrator account.
            </p>
          </div>

          <div className="px-7 py-8">
            <h2 className="mb-2 text-xl font-semibold">
              Change Password
            </h2>

            <p className="mb-7 text-sm leading-6 text-[#6B756E]">
              Choose a strong password that you have not used
              before. All administrator sessions will be signed
              out after the password is changed.
            </p>

            <ChangePasswordForm />
          </div>
        </div>
      </div>
    </main>
  );
}
