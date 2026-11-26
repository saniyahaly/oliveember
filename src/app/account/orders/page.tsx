import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-auth";
import RestaurantShell from "../../RestaurantShell";
import History from "../History";

export default async function OrderHistoryPage({ searchParams }: { searchParams: Promise<{ id?: string | string[] }> }) {
  if (!(await getCurrentCustomer())) redirect("/login");
  const { id } = await searchParams;
  const order = typeof id === "string" ? id : undefined;
  return (
    <RestaurantShell title={order ? "Order Details" : "My Orders"} back={order ? "/account/orders" : "/account"} backLabel={order ? "Back to orders" : "Back to account"}>
      <History key={order || "orders"} section="orders" id={order} />
    </RestaurantShell>
  );
}
