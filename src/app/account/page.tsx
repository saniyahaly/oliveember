
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentCustomer } from "@/lib/customer-auth";
import CustomerLogoutButton from "./CustomerLogoutButton";

export default async function CustomerAccountPage() {
  const customer = await getCurrentCustomer();

  if (!customer) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[#F7F5EF]">
      <header className="border-b border-gray-200 bg-white px-6 py-6 md:px-16">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="font-serif text-2xl font-bold text-[#24382C]"
          >
            OLIVE{" "}
            <span className="text-[#C9A978]">&</span>{" "}
            EMBER
          </Link>

          <CustomerLogoutButton />
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <p className="mb-3 text-xs font-bold tracking-[0.2em] text-[#B99B70]">
          YOUR CUSTOMER ACCOUNT
        </p>

        <h1 className="font-serif text-4xl text-[#24382C]">
          Welcome, {customer.username}!
        </h1>

        <p className="mt-4 text-gray-500">
          You are successfully signed in to Olive & Ember.
        </p>

        <div className="mt-10 rounded-xl bg-white p-8 shadow-sm">
          <h2 className="font-serif text-2xl text-[#24382C]">
            Account Details
          </h2>

          <div className="mt-6 space-y-5">
            <div>
              <p className="text-xs font-bold text-gray-400">
                USERNAME
              </p>
              <p className="mt-2 font-medium">
                {customer.username}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-400">
                EMAIL
              </p>
              <p className="mt-2 font-medium">
                {customer.email}
              </p>
            </div>
<Link
  href="/account/settings"
  className="mt-6 inline-block rounded-md bg-[#24382C] px-6 py-3 text-sm font-semibold text-white hover:bg-[#3A5844]"
>
  Change Password
</Link>
            <div>
              <p className="text-xs font-bold text-gray-400">
                ACCOUNT TYPE
              </p>
              <p className="mt-2 font-medium">
                Customer
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-xl bg-white p-8 shadow-sm">
          <h2 className="font-serif text-2xl text-[#24382C]">
            Explore Olive & Ember
          </h2>

          <p className="mt-3 text-sm leading-7 text-gray-500">
            Browse our restaurant menu and discover
            freshly prepared dishes.
          </p>

          <Link
            href="/#menu"
            className="mt-6 inline-block rounded bg-[#24382C] px-6 py-3 text-sm font-semibold text-white hover:bg-[#3A5844]"
          >
            View Restaurant Menu
          </Link>
        </div>
      </section>
    </main>
  );
}