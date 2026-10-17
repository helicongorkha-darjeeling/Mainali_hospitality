import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
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

// The live site is www.mainalihospitality.com (the bare domain redirects there).
const siteUrl = process.env.VERCEL ? "https://www.mainalihospitality.com" : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Hotel Teesta · Darjeeling",
  description: "Where Darjeeling begins. Warm rooms, an expert chef and trending tours, 50 seconds from the Darjeeling bus stand. By Mainali Hospitality.",
  openGraph: {
    title: "Hotel Teesta · Darjeeling",
    description: "Where Darjeeling begins. 50 seconds from the bus stand.",
    images: ["/images/teesta-hotel-under-the-blue-sky.webp"],
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
