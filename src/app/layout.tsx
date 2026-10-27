import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { hotel } from "@/content/site";
import { siteUrl } from "@/lib/seo";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const title = "Hotel Teesta · Darjeeling";
const description =
  "Where Darjeeling begins. Warm rooms, an expert chef and trending tours, 50 seconds from the Darjeeling bus stand. By Mainali Hospitality.";

/** 1200×630 social card, built by scripts/make-og-image.mjs. */
const ogImage = {
  url: "/images/og-card.jpg",
  width: 1200,
  height: 630,
  alt: `${hotel.name}, ${hotel.address}`,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  // Child pages set just their own name: "Rooms" becomes "Rooms · Hotel Teesta".
  title: { default: title, template: `%s · ${hotel.name}` },
  description,
  applicationName: hotel.name,
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Let Google quote as much as it likes and show full-size image previews.
      // Both are the default, but saying so stops a future change from silently shrinking them.
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: hotel.name,
    locale: "en_IN",
    title,
    description: "Where Darjeeling begins. 50 seconds from the bus stand.",
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: "Where Darjeeling begins. 50 seconds from the bus stand.",
    images: [ogImage],
  },
};

export const viewport: Viewport = {
  themeColor: "#12100d",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
}
