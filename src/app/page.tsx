"use client";

import Link from "next/link";
import MenuImage from "./MenuImage";
import { formatPrice, useMenu } from "./useMenu";

export default function Home() {
  const { menu, loading, error } = useMenu();

  return (
    <main className="min-h-screen bg-[#F7F5EF] text-[#24382C]">
      {/* NAVBAR */}
      <header className="flex flex-wrap items-center justify-between gap-3 bg-white px-6 py-6 shadow-sm md:px-16">
        <a href="#home" className="font-serif text-2xl font-bold">
          OLIVE <span className="text-[#B99B70]">&</span> EMBER
        </a>

        <nav className="hidden gap-8 text-sm font-medium md:flex">
          <a href="#home" className="hover:text-[#B99B70]">
            Home
          </a>
          <a href="#menu" className="hover:text-[#B99B70]">
            Our Menu
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="#menu"
            className="hidden bg-[#24382C] px-5 py-3 text-xs font-semibold text-white transition hover:bg-[#3A5844] sm:block"
          >
            Explore Menu
          </a>
          <Link
            href="/admin/login"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 border border-[#24382C] px-4 py-3 text-xs font-semibold transition hover:bg-[#EAEFE7]"
          >
            Admin Login
          </Link>
        </div>
      </header>

      {/* HERO SECTION */}
      <section
        id="home"
        className="relative flex min-h-[550px] items-center bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(15,28,19,0.94), rgba(15,28,19,0.4)), url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=85')",
        }}
      >
        <div className="max-w-4xl px-6 py-20 text-white md:px-20">
          <p className="mb-6 text-xs font-bold tracking-[0.25em] text-[#D4B486]">
            WELCOME TO OLIVE & EMBER
          </p>

          <h1 className="mb-7 font-serif text-5xl leading-tight md:text-7xl">
            Delicious food.
            <br />
            <span className="italic text-[#D4B486]">
              Beautiful moments.
            </span>
          </h1>

          <p className="mb-9 max-w-lg text-sm leading-8 text-gray-200">
            Experience unforgettable flavours with freshly prepared
            dishes, crafted with passion and served with care.
          </p>

          <a
            href="#menu"
            className="inline-block bg-[#D4B486] px-8 py-4 text-sm font-semibold text-[#24382C] hover:bg-[#E7CBA3]"
          >
            Discover Our Menu ↗
          </a>
        </div>
      </section>

      {/* INTRODUCTION */}
      <section className="bg-white px-6 py-20 text-center">
        <p className="mb-4 text-xs font-bold tracking-[0.2em] text-[#B99B70]">
          FRESHLY PREPARED WITH LOVE
        </p>

        <h2 className="mb-5 font-serif text-4xl md:text-5xl">
          A taste worth remembering.
        </h2>

        <p className="mx-auto max-w-2xl text-sm leading-8 text-gray-500">
          Explore a thoughtfully prepared collection of delicious
          meals, made using fresh ingredients and inspired by the
          joy of sharing good food.
        </p>
      </section>

      {/* DYNAMIC MENU SECTION */}
      <section id="menu" className="px-6 py-24 md:px-16">
        <div className="mb-12 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-xs font-bold tracking-widest text-[#B99B70]">
              EXPLORE OUR SELECTION
            </p>

            <h2 className="mb-4 font-serif text-4xl md:text-5xl">
              Our Restaurant Menu
            </h2>

            <p className="text-sm text-gray-500">
              Discover our freshly prepared signature dishes.
            </p>
          </div>

          <span className="w-fit rounded-full border border-gray-300 px-5 py-3 text-xs font-semibold">
            {menu.length} Menu Items
          </span>
        </div>

        {/* SUCCESS AND ERROR MESSAGES */}
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-lg bg-red-100 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* MENU CARDS */}
        {loading ? (
          <div className="py-20 text-center text-gray-500">
            Loading menu items...
          </div>
        ) : menu.length === 0 ? (
          <div className="rounded-lg bg-white p-16 text-center">
            <h3 className="font-serif text-2xl">
              No menu items available
            </h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {menu.map((item) => (
              <article
                key={item.id}
                className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-[#E7E4DC] bg-white shadow-sm transition-shadow duration-300 hover:shadow-lg"
              >
                <MenuImage key={item.image_url} url={item.image_url} />
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <h3 className="mb-3 font-serif text-2xl leading-tight wrap-break-word">
                    {item.name}
                  </h3>
                  <p className="mb-5 flex-1 text-sm leading-7 wrap-break-word text-[#536157]">
                    {item.description}
                  </p>
                  <p className="border-t border-[#E7E4DC] pt-4 text-lg font-semibold text-[#24382C]">
                    Rs. {formatPrice(item.price)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer className="flex flex-col justify-between gap-5 bg-[#17271D] px-6 py-12 text-white md:flex-row md:items-center md:px-16">
        <div>
          <h3 className="mb-2 font-serif text-xl font-bold">
            OLIVE <span className="text-[#D4B486]">&</span>{" "}
            EMBER
          </h3>

          <p className="text-xs text-gray-400">
            Good food brings us together.
          </p>
        </div>

        <p className="text-xs text-gray-400">
          © 2026 Olive & Ember
        </p>

        <Link href="/image-credits" className="text-xs text-gray-400 underline underline-offset-4 hover:text-white">
          Image Credits
        </Link>
      </footer>
    </main>
  );
}
