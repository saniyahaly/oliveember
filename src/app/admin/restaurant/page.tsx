import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import RestaurantShell from "../../RestaurantShell";
import AdminNavigation from "../AdminNavigation";
import LogoutButton from "../LogoutButton";
import RestaurantManagement from "./RestaurantManagement";

const titles = {
  overview: "Restaurant Overview",
  tables: "Restaurant Tables",
  reservations: "Reservations",
  orders: "Orders",
} as const;

export default async function RestaurantAdminPage({ searchParams }: { searchParams: Promise<{ section?: string | string[] }> }) {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  const { section } = await searchParams;
  const view = section === "tables" || section === "reservations" || section === "orders" ? section : "overview";
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white pr-5">
        <AdminNavigation />
        <LogoutButton />
      </div>
      <RestaurantShell title={titles[view]} back="/admin" backLabel="Menu management">
        <RestaurantManagement key={view} section={view} />
      </RestaurantShell>
    </>
  );
}
