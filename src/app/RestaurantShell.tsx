import type { ReactNode } from "react";
import Link from "next/link";

export const fieldClass = "w-full rounded-lg border border-[#D9DFD5] bg-white px-3 py-2.5 text-[#24382C] focus-visible:outline-2 focus-visible:outline-[#48684E]";
export const buttonClass = "inline-flex items-center justify-center rounded-lg bg-[#24382C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#365540] disabled:opacity-50";
export const panelClass = "rounded-xl border border-[#E7E4DC] bg-white p-5 shadow-sm sm:p-7";
export const linkClass = "text-sm font-semibold underline underline-offset-4";

export default function RestaurantShell({ title, back = "/", backLabel = "Back to restaurant", children }: {
  title: string; back?: string; backLabel?: string; children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#F7F5EF] px-5 py-10 text-[#24382C] sm:px-10">
      <div className="mx-auto max-w-5xl">
        <Link href={back} className={linkClass}>{backLabel}</Link>
        <h1 className="my-6 font-serif text-4xl sm:text-5xl">{title}</h1>
        {children}
      </div>
    </main>
  );
}
