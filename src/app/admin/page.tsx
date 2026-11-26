
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import LogoutButton from "./LogoutButton";
import MenuManagement from "./MenuManagement";
import AdminNavigation from "./AdminNavigation";

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  return (
    <main className="min-h-screen bg-[#F7F5EF] text-[#24382C]">
      <header className="flex flex-wrap items-center justify-between gap-4 bg-white px-6 py-6 shadow-sm md:px-16">
        <h1 className="font-serif text-3xl">
          Olive & Ember Admin Dashboard
        </h1>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/settings"
            className="inline-flex items-center gap-2 rounded-xl border border-[#24382C]/20 bg-[#F7F5EF] px-5 py-3 font-medium transition hover:bg-[#E8EBE2]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.9 1.9-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.06 1.57V21h-2.7v-.99a1.7 1.7 0 0 0-1.06-1.57 1.7 1.7 0 0 0-1.88.34l-.06.06-1.9-1.9.06-.06A1.7 1.7 0 0 0 7.7 15a1.7 1.7 0 0 0-1.57-1.06H5v-2.7h1.13A1.7 1.7 0 0 0 7.7 10.18a1.7 1.7 0 0 0-.34-1.88L7.3 8.24l1.9-1.9.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 12.2 5.17V4h2.7v1.17a1.7 1.7 0 0 0 1.06 1.57 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.9 1.9-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.57 1.06H22v2.7h-1.03A1.7 1.7 0 0 0 19.4 15Z" />
            </svg>
            Settings
          </Link>

          <LogoutButton />
        </div>
      </header>

      <AdminNavigation />
      <MenuManagement />
    </main>
  );
}
