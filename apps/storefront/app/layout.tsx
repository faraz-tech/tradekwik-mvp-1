import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Buy direct from Indian businesses`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Discover machines, food, garments and more from verified Indian small businesses. Send an inquiry and deal directly with the seller — no middlemen.",
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    locale: "en_IN",
  },
};

function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="text-xl font-bold tracking-tight text-blue-700">
          Trade<span className="text-stone-900">Kwik</span>
        </Link>
        <form action="/search" className="order-last w-full sm:order-none sm:w-auto sm:flex-1 sm:max-w-md">
          <input
            type="search"
            name="q"
            placeholder="Search products, machines, services…"
            className="w-full rounded-full border border-stone-300 bg-stone-50 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white"
          />
        </form>
        <nav className="ml-auto">
          <Link href="/search" className="text-sm font-medium text-stone-600 hover:text-blue-700">
            Browse all
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-stone-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-stone-500">
        <p className="font-semibold text-stone-700">{SITE_NAME}</p>
        <p className="mt-1">
          Connecting buyers directly with Indian small businesses. Inquire, negotiate on
          WhatsApp or phone, and deal direct.
        </p>
        <p className="mt-4 text-xs">© {new Date().getFullYear()} {SITE_NAME}</p>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
