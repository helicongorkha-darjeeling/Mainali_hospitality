import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingFlow } from "@/components/booking/BookingFlow";
import "./booking.css";

export const metadata: Metadata = {
  title: "Book your stay", // the layout template adds "· Hotel Teesta"
  description: "Book Hotel Teesta, Darjeeling direct: best price, no convenience fee.",
  // Its own canonical, so it doesn't inherit the layout's "/".
  alternates: { canonical: "/book" },
  robots: { index: false, follow: true },
};

export default function BookPage() {
  return (
    <Suspense fallback={<div className="bk" />}>
      <BookingFlow />
    </Suspense>
  );
}
