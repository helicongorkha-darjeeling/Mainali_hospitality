/**
 * JSON-LD for the site: what tells Google and the AI answer engines that this is a hotel in
 * Darjeeling, what it costs, when you can check in and what's in the rooms.
 *
 * Everything here is serialised from src/content, so the markup can't drift from the page.
 * That matters: Google requires structured data to match the visible text.
 *
 * One rule to keep: do NOT add `aggregateRating` or `review` from the Google Business Profile.
 * Google's review-snippet policy forbids aggregating reviews from other sites, and reviews about
 * yourself are ineligible for star snippets. Reviews can be shown as page text, never as markup.
 */
import { dining, hotel, roomInventory, rooms, type Room } from "@/content/site";
import { amenities, mealPlans, roomRates, stayTimes } from "@/content/booking";
import { abs } from "@/lib/seo";

/** Stable @id values, so the nodes can reference each other instead of repeating themselves. */
const id = {
  organization: abs("/#organization"),
  hotel: abs("/#hotel"),
  website: abs("/#website"),
  restaurant: abs("/#restaurant"),
  room: (slug: string) => abs(`/#room-${slug}`),
};

const phone = hotel.phones[0].replace(/\s/g, "");
/** "12:00" in the content files; schema.org wants a full ISO 8601 time. */
const asTime = (hhmm: string) => `${hhmm}:00`;
const rate = (r: Room) => roomRates[r.slug].direct;

const postalAddress = {
  "@type": "PostalAddress",
  streetAddress: hotel.postal.street,
  addressLocality: hotel.postal.locality,
  addressRegion: hotel.postal.region,
  postalCode: hotel.postal.postalCode,
  addressCountry: hotel.postal.country,
};

/** Every amenity across the groups, de-duplicated ("Warm blanket" is listed twice). */
const amenityFeature = [...new Set(amenities.flatMap((g) => g.items))].map((name) => ({
  "@type": "LocationFeatureSpecification",
  name,
  value: true,
}));

/** "₹1,868–₹4,468" — the cheapest and dearest direct rate actually shown on the site. */
function priceRange() {
  const all = rooms.map(rate);
  const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  return `${inr(Math.min(...all))}–${inr(Math.max(...all))}`;
}

/**
 * What a room *is*. Not what it costs: schema.org has no valid way to hang an Offer off a
 * HotelRoom (`offers` is for Products and Services, and `itemOffered` won't take an
 * Accommodation), so the rates live in the hotel's `makesOffer` below, linked by name.
 */
function hotelRoom(r: Room) {
  return {
    "@type": "HotelRoom",
    "@id": id.room(r.slug),
    name: r.name,
    description: `${r.occupancy}. ${r.line}`,
    bed: { "@type": "BedDetails", numberOfBeds: r.beds },
    occupancy: { "@type": "QuantitativeValue", maxValue: r.maxGuests, unitCode: "C62" },
    image: abs(r.image),
    amenityFeature: r.features.map((name) => ({ "@type": "LocationFeatureSpecification", name, value: true })),
  };
}

/** A nightly room rate, as an Offer on the hotel. `makesOffer` is valid here because a Hotel is an Organization. */
function roomOffer(r: Room) {
  return {
    "@type": "Offer",
    name: `${r.name} — per room per night`,
    price: rate(r),
    priceCurrency: "INR",
    availability: "https://schema.org/InStock",
    url: abs(`/book?room=${r.slug}`),
    // Spelled out so the figure can't be read as a total for the whole stay.
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: rate(r),
      priceCurrency: "INR",
      unitText: "per room per night",
    },
  };
}

function organization() {
  return {
    "@type": "Organization",
    "@id": id.organization,
    name: hotel.brand,
    url: abs("/"),
    logo: { "@type": "ImageObject", url: abs("/brand/mainali-logo-intro-dark.svg") },
    email: hotel.email,
    telephone: phone,
  };
}

function website() {
  return {
    "@type": "WebSite",
    "@id": id.website,
    url: abs("/"),
    name: hotel.name,
    publisher: { "@id": id.organization },
    inLanguage: "en-IN",
  };
}

function restaurant() {
  const r = dining[0];
  return {
    "@type": "Restaurant",
    "@id": id.restaurant,
    name: r.title,
    description: r.line,
    image: abs(r.image),
    address: postalAddress,
    telephone: phone,
    servesCuisine: "Indian",
    priceRange: "₹₹",
    parentOrganization: { "@id": id.hotel },
  };
}

function lodging() {
  return {
    "@type": "Hotel",
    "@id": id.hotel,
    name: hotel.name,
    description: `${hotel.name} is a hotel in central ${hotel.city}, ${hotel.postal.region}, a minute's walk from the ${hotel.city} bus stand. Rooms sleep one to six guests, with a restaurant downstairs and tours arranged at the front desk.`,
    url: abs("/"),
    telephone: phone,
    email: hotel.email,
    address: postalAddress,
    // `geo` is omitted entirely until the real coordinates are confirmed (see site.ts).
    ...(hotel.geo ? { geo: { "@type": "GeoCoordinates", latitude: hotel.geo.lat, longitude: hotel.geo.lng } } : {}),
    ...(hotel.sameAs.length ? { sameAs: hotel.sameAs } : {}),
    image: [abs("/images/og-card.jpg"), ...rooms.map((r) => abs(r.image))],
    priceRange: priceRange(),
    currenciesAccepted: "INR",
    // Only what the booking flow actually supports. TODO(client): add "Cash" / "Card" once confirmed.
    paymentAccepted: "UPI",
    checkinTime: asTime(stayTimes.checkIn),
    checkoutTime: asTime(stayTimes.checkOut),
    // Counted from the room chart (25), confirmed by the owner. An aggregator listing says 24.
    numberOfRooms: roomInventory.length,
    // TODO(client): `petsAllowed` is a useful field, but left out until the hotel confirms its policy.
    // Structured data has to match reality, so an unverified guess is worse than silence.
    amenityFeature,
    containsPlace: rooms.map(hotelRoom),
    makesOffer: [
      ...rooms.map(roomOffer),
      ...mealPlans.map((m) => ({
        "@type": "Offer",
        name: `${m.name} (${m.code}) — per guest per night`,
        price: m.perGuestNight,
        priceCurrency: "INR",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: m.perGuestNight,
          priceCurrency: "INR",
          unitText: "per guest per night",
        },
      })),
    ],
    parentOrganization: { "@id": id.organization },
  };
}

/** The homepage graph: the hotel, its rooms, the restaurant, the brand and the site itself. */
export function homeSchema() {
  return { "@context": "https://schema.org", "@graph": [organization(), website(), lodging(), restaurant()] };
}

/**
 * Any sub-page: the page itself, breadcrumbs back to the homepage, and whatever extra nodes
 * that page has (an FAQPage, a list of rooms). `about` ties every page to the hotel entity,
 * which is how a search engine knows these pages are all about the same business.
 */
export function pageSchema(
  path: string,
  title: string,
  description: string,
  { type = "WebPage", extra = [] as object[] } = {}
) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": type,
        "@id": abs(path),
        url: abs(path),
        name: title,
        description,
        isPartOf: { "@id": id.website },
        about: { "@id": id.hotel },
        inLanguage: "en-IN",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: hotel.name, item: abs("/") },
          { "@type": "ListItem", position: 2, name: title },
        ],
      },
      ...extra,
    ],
  };
}

/** A policy page. */
export const policySchema = (slug: string, title: string, description: string) =>
  pageSchema(`/policies/${slug}`, title, description);

/**
 * Questions and answers. Google retired FAQ rich results in May 2026, so this earns no stars —
 * it stays because it is still the clearest way to hand a question-and-answer pair to a machine.
 * Only answered questions go in; an empty answer would be worse than none.
 */
export function faqSchema(items: { q: string; a: string | null }[]) {
  const answered = items.filter((i) => i.a);
  if (!answered.length) return null;
  return {
    "@type": "FAQPage",
    mainEntity: answered.map((i) => ({
      "@type": "Question",
      name: i.q,
      acceptedAnswer: { "@type": "Answer", text: i.a },
    })),
  };
}

/** The room types as an ordered list, for the /rooms page. */
export function roomListSchema() {
  return {
    "@type": "ItemList",
    name: `Room types at ${hotel.name}`,
    itemListElement: rooms.map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: hotelRoom(r),
    })),
  };
}

/** One room type, for its own page. */
export const roomSchema = (r: Room) => hotelRoom(r);
