import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Image Credits | Olive & Ember" };

const credits = [
  {
    dish: "Grilled Chicken Steak",
    title: "Grilled chicken served with creamy mashed potatoes and fresh vegetables",
    author: "Shixart1985 (Nenad Stojković)",
    source: "https://commons.wikimedia.org/wiki/File:Grilled_chicken_served_with_creamy_mashed_potatoes_and_fresh_vegetables_undefined.jpg",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
  },
  {
    dish: "Lasagna",
    title: "Lasagna at Raj’s Spanish Cafe",
    author: "Edible Encyclopaedia",
    source: "https://commons.wikimedia.org/wiki/File:Lasagna-Raj%27sSpanishcafe%2CKolkata-WestBengal-02.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  {
    dish: "Margherita Pizza",
    title: "Close-Up of a Baked Pizza With Basil and Mozzarella",
    author: "Christopher Seufert Photography",
    source: "https://www.pexels.com/photo/close-up-of-a-baked-pizza-with-basil-and-mozzarella-7531438/",
    license: "Pexels License",
    licenseUrl: "https://www.pexels.com/license/",
  },
];

export default function ImageCredits() {
  return (
    <main className="min-h-screen bg-[#F7F5EF] px-6 py-12 text-[#24382C] sm:py-20">
      <div className="mx-auto max-w-2xl">
        <Link href="/#menu" className="text-sm font-semibold underline underline-offset-4">
          Back to menu
        </Link>
        <h1 className="mt-6 mb-8 font-serif text-4xl sm:text-5xl">Image Credits</h1>
        <ul className="divide-y divide-[#E7E4DC] rounded-xl border border-[#E7E4DC] bg-white">
          {credits.map(({ dish, title, author, source, license, licenseUrl }) => (
            <li key={source} className="p-5 sm:p-6">
              <h2 className="font-serif text-xl">{dish}</h2>
              <p className="mt-2 text-sm leading-7 text-[#536157]">
                <a href={source} className="underline underline-offset-2">{title}</a>
                {" by "}{author}
                {" · "}<a href={licenseUrl} className="underline underline-offset-2">{license}</a>
                {" · Cropped for display"}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
