import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-auth";
import RestaurantShell from "../../RestaurantShell";
import History from "../History";

export default async function ReservationHistoryPage() {
  if (!(await getCurrentCustomer())) redirect("/login");
  return <RestaurantShell title="My Reservations" back="/account" backLabel="Back to account"><History section="reservations" /></RestaurantShell>;
}
