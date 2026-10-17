import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingFlow } from "@/components/booking/BookingFlow";
import "./booking.css";

export const metadata: Metadata = {
  title: "Book your stay · Hotel Teesta",
  description: "Book Hotel Teesta, Darjeeling direct: best price, no convenience fee.",
  robots: { index: false, follow: true },
};

export default function BookPage() {
  return (
    <Suspense fallback={<div className="bk" />}>
      <BookingFlow />
    </Suspense>
  );
}
