import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import { HeaderSearch } from "@/components/header-search";
import { AccountNav } from "@/components/account-nav";
import { BuyerAuthProvider } from "@/components/buyer-auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SELLER_APP_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";

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
        <HeaderSearch />
        <nav className="ml-auto flex items-center gap-4">
          <Link href="/search" className="text-sm font-medium text-stone-600 hover:text-blue-700">
            Browse all
          </Link>
          <a
            href={`${SELLER_APP_URL}/register`}
            className="hidden text-sm font-medium text-stone-600 hover:text-blue-700 sm:inline"
          >
            Sell on TradeKwik
          </a>
          <AccountNav />
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
        <p className="mt-3">
          <a href={`${SELLER_APP_URL}/register`} className="font-medium text-blue-700 hover:underline">
            Are you a manufacturer, wholesaler or retailer? Register your business →
          </a>
          <span className="mx-2 text-stone-300">|</span>
          <a href={`${SELLER_APP_URL}/login`} className="hover:underline">Seller login</a>
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
        <BuyerAuthProvider>
          <Header />
          <div className="flex-1">{children}</div>
          <Footer />
        </BuyerAuthProvider>
      </body>
    </html>
  );
}
