import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-auth";

export default async function CustomerSettingsLayout({ children }: { children: ReactNode }) {
  if (!(await getCurrentCustomer())) redirect("/login");
  return children;
}
