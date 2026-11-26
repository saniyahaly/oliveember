import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import ChangePasswordForm from "./ChangePasswordForm";

export default async function AdminSettingsPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  return (
    <main className="min-h-screen bg-[#F7F5EF] px-6 py-12 text-[#24382C] md:py-16">
      <div className="mx-auto max-w-xl rounded-3xl border border-[#E2E6DC] bg-white p-6 shadow-lg sm:p-8">
        <Link href="/admin" className="text-sm font-semibold underline underline-offset-4">
          Back to Dashboard
        </Link>
        <h1 className="mt-6 font-serif text-3xl">Change Administrator Password</h1>
        <p className="mt-3 mb-6 text-sm leading-6 text-[#536157]">
          Use 8–128 characters with uppercase, lowercase, a number, and a special character.
        </p>
        <ChangePasswordForm />
      </div>
    </main>
  );
}
