import { readFileSync } from "node:fs";
import path from "node:path";
import { BookingProvider } from "@/components/BookingProvider";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Rooms } from "@/components/Rooms";
import { Dining } from "@/components/Dining";
import { Experiences } from "@/components/Experiences";
import { Gallery } from "@/components/Gallery";
import { Location } from "@/components/Location";
import { Footer } from "@/components/Footer";
import { BookNow } from "@/components/BookNow";
import { BookingSheet } from "@/components/BookingSheet";
import { JsonLd } from "@/components/JsonLd";
import { homeSchema } from "@/lib/schema";
import { hotel } from "@/content/site";

/** The header logo is inlined so its hover animation (knot turn + gold shine) works. */
function headerLogo() {
  const raw = readFileSync(path.join(process.cwd(), "public/brand/mainali-logo-hover.svg"), "utf8");
  return raw.replace(/<\?xml[^>]*\?>/, "").replace(/<metadata>[\s\S]*?<\/metadata>/, "");
}

export default function Home() {
  return (
    <BookingProvider>
      {/*
        The video poster fills the first screen, so it's an LCP candidate, but as a <video poster>
        the browser finds it late and fetches it at low priority. Preloading it here (homepage only,
        so other pages don't download 87 KB they never show) gets it started with the HTML.
      */}
      <link rel="preload" as="image" href={hotel.heroPoster} fetchPriority="high" />
      <JsonLd data={homeSchema()} />
      <SmoothScroll />
      <Navbar logoSvg={headerLogo()} />
      <main>
        <Hero />
        <Rooms />
        <Dining />
        <Experiences />
        <Gallery />
        <Location />
      </main>
      <Footer />
      <BookNow />
      <BookingSheet />
    </BookingProvider>
  );
}
