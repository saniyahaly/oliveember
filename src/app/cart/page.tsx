import RestaurantShell from "../RestaurantShell";
import CartPanel from "./CartPanel";

export default function CartPage() {
  return <RestaurantShell title="Your Cart" back="/#menu" backLabel="Back to menu"><CartPanel /></RestaurantShell>;
}
