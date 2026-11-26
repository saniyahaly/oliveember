import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-auth";
import RestaurantShell from "../RestaurantShell";
import ReservationForm from "./ReservationForm";

export default async function ReservationsPage() {
  if (!(await getCurrentCustomer())) redirect("/login?next=/reservations");
  return <RestaurantShell title="Reserve a Table"><ReservationForm /></RestaurantShell>;
}
