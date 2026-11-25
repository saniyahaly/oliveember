import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import LogoutButton from "./LogoutButton";
import MenuManagement from "./MenuManagement";

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  return (
    <main className="min-h-screen bg-[#F7F5EF] text-[#24382C]">
      <header className="flex flex-wrap items-center justify-between gap-4 bg-white px-6 py-6 shadow-sm md:px-16">
        <h1 className="font-serif text-3xl">Olive & Ember Admin Dashboard</h1>
        <LogoutButton />
      </header>
      <MenuManagement />
    </main>
  );
}
