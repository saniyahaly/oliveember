import Link from "next/link";

const links = [
  ["Overview", "/admin/restaurant"],
  ["Menu Management", "/admin"],
  ["Restaurant Tables", "/admin/restaurant?section=tables"],
  ["Reservations", "/admin/restaurant?section=reservations"],
  ["Orders", "/admin/restaurant?section=orders"],
  ["Account Settings", "/admin/settings"],
];

export default function AdminNavigation() {
  return (
    <nav aria-label="Administrator" className="flex flex-wrap gap-x-5 gap-y-3 border-b border-[#E7E4DC] px-5 py-4 text-sm font-semibold text-[#24382C] sm:px-10">
      {links.map(([label, href]) => <Link key={href} className="hover:underline" href={href}>{label}</Link>)}
    </nav>
  );
}
