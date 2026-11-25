
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";

export default async function AdminSettingsPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  return (
    <main className="min-h-screen bg-[#F7F5EF] px-6 py-16 text-[#24382C]">
      <div className="mx-auto max-w-xl rounded-3xl border border-[#E2E6DC] bg-white p-8 shadow-lg">
        <h1 className="font-serif text-3xl">
          Admin Account Settings
        </h1>

        <p className="mt-4 leading-7 text-[#536157]">
          Administrator credentials are securely configured
          through the server environment.
        </p>

        <div className="mt-6 rounded-xl bg-[#F7F5EF] p-5 text-sm leading-7">
          <p className="font-semibold">
            Password Management
          </p>

          <p className="mt-2">
            To update administrator credentials, change the
            environment configuration and redeploy the website.
          </p>

          <p className="mt-2">
            Customer account passwords are managed separately.
          </p>
        </div>

        <Link
          href="/admin"
          className="mt-8 inline-flex rounded-xl bg-[#24382C] px-6 py-3 font-semibold text-white hover:bg-[#365540]"
        >
          Back to Dashboard
        </Link>
      </div>
    </main>
  );
}
