import type { Metadata } from "next";
import Link from "next/link";
import { hotel } from "@/content/site";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="flex min-h-[100svh] flex-col items-center justify-center bg-ink px-5 text-center">
      <p className="eyebrow">404</p>
      <h1 className="h-section mt-3">This page has checked out.</h1>
      <p className="sub mt-4 max-w-md">
        The page you were looking for isn&apos;t here. The front desk can still help.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="btn-gold">
          Back to {hotel.name}
        </Link>
        <a href={`tel:${hotel.phones[0].replace(/\s/g, "")}`} className="btn-ghost">
          Call the front desk
        </a>
      </div>
    </main>
  );
}
