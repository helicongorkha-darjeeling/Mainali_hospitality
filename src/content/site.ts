/**
 * All site content lives here.
 * Phase 2: replace these exports with Supabase queries (see IMPLEMENTATION_PLAN.md §4).
 */

export const hotel = {
  name: "Hotel Teesta",
  brand: "Mainali Hospitality",
  city: "Darjeeling",
  address: "Bus Stand, Darjeeling, West Bengal 734101",
  /** The same address in parts, for the Hotel schema. Keep it in step with `address` above. */
  postal: {
    street: "Bus Stand",
    locality: "Darjeeling",
    region: "West Bengal",
    postalCode: "734101",
    country: "IN",
  },
  /**
   * TODO(client): exact coordinates, from Google Maps (right-click the hotel → click the lat/lng to copy).
   * Left null until confirmed: a guessed pin is worse than none, and this is what ties the site to
   * the Maps listing. The Hotel schema leaves `geo` out while this is null.
   */
  geo: null as { lat: number; lng: number } | null,
  /**
   * TODO(client): the hotel's other profiles — Google Business Profile, MakeMyTrip, Booking.com,
   * TripAdvisor. These tell search engines that the 4.1★/672-review listing and this site are the
   * same business, which is how the reviews come to count for the site.
   */
  sameAs: [] as string[],
  // TODO(client): confirm both numbers (read from the hotel signage).
  phones: ["+91 98327 19783", "+91 62945 63420"],
  whatsapp: "919832719783",
  email: "reservations@mainalihospitality.com", // reservations: guests, travel agents, groups
  mapQuery: "Teesta Hotel Bus Stand Darjeeling",
  heroVideo: "/video/hero.mp4", // 720p, desktop
  heroVideoMobile: "/video/hero-mobile.mp4", // 540p, phones and data-saver
  heroPoster: "/video/hero-poster.webp",
  tagline: "Where Darjeeling begins.",
  // TODO(client): confirm the station (the main one is New Jalpaiguri, NJP).
  pickup: "Pickup from Bagdogra Airport, Jalpaiguri train station, Siliguri or Gangtok.",
};

export type HeroChapter = {
  key: string;
  label: string; // short name in the chapter rail
  from: number;
  to: number;
  title: string;
  sub: string;
  note?: string; // optional extra line under the sub
};

/**
 * Text that appears while the hero video scrubs with scroll.
 * `from` / `to` are scroll progress (0 → 1) through the video; they line up with its scenes:
 * street + entrance (0–0.15), restaurant (0.16–0.29), wall of local sights + corridor (0.29–0.41), rooms (0.42–1).
 */
export const heroChapters: HeroChapter[] = [
  { key: "welcome", label: "Welcome", from: 0, to: 0.13, title: "Welcome.", sub: hotel.tagline },
  { key: "food", label: "Food", from: 0.16, to: 0.28, title: "Food.", sub: "Expert chef. Room service or restaurant." },
  { key: "desk", label: "Info desk", from: 0.3, to: 0.43, title: "Information desk.", sub: "Book trending tours at the desk.", note: hotel.pickup },
  { key: "rest", label: "Rest", from: 0.47, to: 0.9, title: "Rest.", sub: "Warm escapes for chilly nights." },
];

export const nav = [
  { label: "Rooms", href: "#rooms" },
  { label: "Dining", href: "#dining" },
  { label: "Experiences", href: "#experiences" },
  { label: "Gallery", href: "#gallery" },
  { label: "Find us", href: "#find-us" },
];

export type RoomSlug = "king" | "triple" | "quad" | "family";

export type Room = {
  slug: RoomSlug;
  name: string;
  occupancy: string; // who it suits
  line: string; // short tagline
  beds: number;
  maxGuests: number;
  features: string[];
  image: string; // card photo
  /** Describes what the card photo shows, for image search and screen readers. */
  imageAlt: string;
  images: string[]; // extra photos for the booking flow
};

/** The four room types, as on the Teesta occupancy chart. */
export const rooms: Room[] = [
  {
    slug: "king",
    name: "The King",
    occupancy: "Single or double occupancy",
    line: "Made for two.",
    beds: 1,
    maxGuests: 2,
    features: ["Double bed", "1–2 guests", "TV in select rooms"],
    image: "/images/teesta-double-room.webp",
    imageAlt: "Double bed with red cushions, a wall-mounted TV and a curtained window in The King room at Hotel Teesta, Darjeeling",
    images: ["/images/teesta-double-room-window.webp", "/images/teesta-double-room-bedside.webp", "/images/teesta-double-room-interior.webp"],
  },
  {
    slug: "triple",
    name: "The Triple",
    occupancy: "3 beds",
    line: "Room for one more.",
    beds: 3,
    maxGuests: 3,
    features: ["3 beds", "Up to 3 guests", "TV in select rooms"],
    image: "/images/teesta-triple-room.webp",
    imageAlt: "Separate beds with red cushions against a wood-panelled wall, with a kettle on the bedside table, in The Triple room at Hotel Teesta, Darjeeling",
    images: ["/images/teesta-multi-bed-room.webp"],
  },
  {
    slug: "quad",
    name: "The Quad",
    occupancy: "4 beds",
    line: "Bring the whole crew.",
    beds: 4,
    maxGuests: 4,
    features: ["4 beds", "Up to 4 guests", "TV"],
    image: "/images/teesta-family-room.webp",
    imageAlt: "Beds side by side with red cushions, a kettle and a curtained window in The Quad room at Hotel Teesta, Darjeeling",
    images: ["/images/teesta-four-person-room.webp"],
  },
  {
    slug: "family",
    name: "Large Family Room",
    occupancy: "Suite · 6 beds · or a group room",
    line: "Everyone, under one roof.",
    beds: 6,
    maxGuests: 6,
    features: ["Suite", "6 beds", "Up to 6 guests", "Families & groups"],
    image: "/images/teesta-family-sofa-room.webp",
    imageAlt: "Sofa seating, a low wooden table, a TV and beds at both ends of the Large Family Room at Hotel Teesta, Darjeeling",
    images: ["/images/teesta-room-seating.webp"],
  },
];

/**
 * Every room in the hotel, from the daily booking room chart (25 rooms, 3rd floor numbering).
 * Not shown on the site; used by the booking flow (phase 2: Supabase `room_units`).
 */
export const roomInventory: { no: string; type: RoomSlug; tv: boolean }[] = [
  { no: "301", type: "king", tv: false }, { no: "302", type: "king", tv: false }, { no: "303", type: "king", tv: false },
  { no: "304", type: "triple", tv: true }, { no: "305", type: "king", tv: true }, { no: "306", type: "triple", tv: true },
  { no: "307", type: "quad", tv: true }, { no: "308", type: "quad", tv: true }, { no: "309", type: "quad", tv: true },
  { no: "310", type: "king", tv: false }, { no: "311", type: "king", tv: false }, { no: "312", type: "triple", tv: true },
  { no: "313", type: "king", tv: true }, { no: "314", type: "king", tv: true }, { no: "315", type: "quad", tv: true },
  { no: "316", type: "quad", tv: true }, { no: "317", type: "quad", tv: true },
  { no: "CP318", type: "triple", tv: false }, // TODO(client): what does "CP" mean on the chart?
  { no: "319", type: "king", tv: false }, { no: "320", type: "king", tv: false }, { no: "321", type: "king", tv: false },
  { no: "322", type: "king", tv: false }, { no: "323", type: "triple", tv: false }, { no: "324", type: "family", tv: false },
  { no: "325", type: "triple", tv: false },
];

export const dining = [
  { title: "Teesta Restaurant", line: "Right downstairs.", image: "/images/restruant-full.webp" },
  { title: "Hot plates", line: "Fresh from the kitchen, after a cold day.", image: "/images/teesta-dining.webp" },
  { title: "Slow mornings", line: "Tea, toast and no rush.", image: "/images/restraunt-2.webp" },
];

/**
 * Tours (Experiences tab). Sights are the ones on the hotel's lobby tour wall.
 * Every tour comes with a car and driver. Phase 2: move to a Supabase `tours` table
 * (plus `vehicles` for car types), and fill in duration and price.
 */
export type Tour = {
  slug: string;
  name: string;
  line: string;
  stops: string[];
  duration: string | null; // TODO(client), e.g. "4 hours"
  priceFrom: number | null; // TODO(client), in INR, per car
};

export const tours: Tour[] = [
  { slug: "tiger-hill-sunrise", name: "Tiger Hill sunrise", line: "Up before dawn for the first light.", stops: ["Tiger Hill", "Ghoom Monastery"], duration: null, priceFrom: null },
  { slug: "town-tour", name: "Darjeeling town", line: "The classics, in one day.", stops: ["Peace Pagoda", "HMI & Zoo", "Tenzing Rock", "Cable car"], duration: null, priceFrom: null },
  { slug: "gardens", name: "Gardens & tea", line: "Waterfalls and green slopes.", stops: ["Rock Garden", "Tea garden"], duration: null, priceFrom: null },
  { slug: "mirik", name: "Mirik Lake", line: "A day by the water.", stops: ["Mirik Lake"], duration: null, priceFrom: null },
  { slug: "jore-pokhari", name: "Jore Pokhari", line: "Twin lakes in the pines.", stops: ["Jore Pokhari"], duration: null, priceFrom: null },
];

export const tourIncludes = ["Car + local driver", "Pickup from the hotel"];

/** Gallery fly-through. `ratio` is height / width of the photo. */
export const gallery = [
  { src: "/textures/teesta-arrival.webp", ratio: 1.25, alt: "Arrival" },
  { src: "/textures/teesta-lobby.webp", ratio: 0.71, alt: "Lobby" },
  { src: "/textures/teesta-hotel-on-the-hillside.webp", ratio: 1.42, alt: "Hotel on the hillside" },
  { src: "/textures/warm-wooden-hotel-reception.webp", ratio: 1, alt: "Reception" },
  { src: "/textures/teesta-double-room-interior.webp", ratio: 1.25, alt: "Double room" },
  { src: "/textures/rooms-corroidor-view.webp", ratio: 1.25, alt: "Corridor" },
  { src: "/textures/teesta-dining-room.webp", ratio: 1.25, alt: "Dining room" },
  { src: "/textures/bathroom-full.webp", ratio: 0.8, alt: "Bathroom" },
  { src: "/textures/teesta-room-seating.webp", ratio: 0.68, alt: "Seating" },
  { src: "/textures/teesta-neighbourhood-view.webp", ratio: 1.33, alt: "View from the window" },
  { src: "/textures/teesta-exterior-front.webp", ratio: 0.92, alt: "Front of the hotel" },
];
