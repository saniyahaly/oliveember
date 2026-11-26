import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-auth";
import RestaurantShell from "../RestaurantShell";
import Checkout from "./Checkout";

export default async function CheckoutPage() {
  if (!(await getCurrentCustomer())) redirect("/login?next=/checkout");
  return <RestaurantShell title="Checkout" back="/cart" backLabel="Back to cart"><Checkout /></RestaurantShell>;
}
