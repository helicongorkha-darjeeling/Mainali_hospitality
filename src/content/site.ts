/**
 * All site content lives here.
 * Phase 2: replace these exports with Supabase queries (see IMPLEMENTATION_PLAN.md §4).
 */

export const hotel = {
  name: "Hotel Teesta",
  brand: "Mainali Hospitality",
  city: "Darjeeling",
  address: "Bus Stand, Darjeeling, West Bengal 734101",
  // TODO(client): confirm both numbers (read from the hotel signage).
  phones: ["+91 98327 19783", "+91 62945 63420"],
  whatsapp: "919832719783",
  email: "",
  mapQuery: "Teesta Hotel Bus Stand Darjeeling",
  heroVideo: "/video/hero.mp4", // 720p, desktop
  heroVideoMobile: "/video/hero-mobile.mp4", // 540p, phones and data-saver
  heroPoster: "/video/hero-poster.webp",
};

/**
 * Text that appears while the hero video scrubs with scroll.
 * `from` / `to` are scroll progress (0 → 1) through the video; they line up with its scenes:
 * street + entrance (0–0.15), restaurant (0.16–0.29), wall of local sights (0.29–0.37), rooms (0.42–1).
 */
export const heroChapters = [
  { key: "arrive", label: "Arrive", from: 0, to: 0.12, title: "Above the clouds.", sub: "Hotel Teesta · Darjeeling" },
  { key: "eat", label: "Eat", from: 0.17, to: 0.28, title: "Eat.", sub: "Our restaurant, downstairs." },
  { key: "explore", label: "Explore", from: 0.3, to: 0.38, title: "Explore.", sub: "Tours from the lobby." },
  { key: "rest", label: "Rest", from: 0.45, to: 0.9, title: "Rest.", sub: "Warm rooms for two to six." },
];

export const nav = [
  { label: "Rooms", href: "#rooms" },
  { label: "Dining", href: "#dining" },
  { label: "Experiences", href: "#experiences" },
  { label: "Gallery", href: "#gallery" },
  { label: "Find us", href: "#find-us" },
];

export type Room = {
  slug: string;
  name: string;
  guests: number;
  line: string;
  image: string;
};

export const rooms: Room[] = [
  { slug: "double", name: "Double", guests: 2, line: "For two.", image: "/images/teesta-double-room.webp" },
  { slug: "double-window", name: "Double, window", guests: 2, line: "Hill light in the morning.", image: "/images/teesta-double-room-window.webp" },
  { slug: "triple", name: "Triple", guests: 3, line: "Room for one more.", image: "/images/teesta-triple-room.webp" },
  { slug: "family", name: "Family", guests: 4, line: "The whole family, together.", image: "/images/teesta-family-room.webp" },
  { slug: "family-lounge", name: "Family lounge", guests: 4, line: "Beds, plus a sofa.", image: "/images/teesta-family-sofa-room.webp" },
  { slug: "four-bed", name: "Four-bed", guests: 4, line: "Friends on a trip.", image: "/images/teesta-four-person-room.webp" },
  { slug: "group", name: "Group", guests: 6, line: "Big groups, one room.", image: "/images/teesta-multi-bed-room.webp" },
];

export const dining = [
  { title: "Teesta Restaurant", line: "Right downstairs.", image: "/images/restruant-full.webp" },
  { title: "Warm tables", line: "Hot meals after a cold day.", image: "/images/teesta-dining.webp" },
  { title: "Quiet corners", line: "Tea, slowly.", image: "/images/restraunt-2.webp" },
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
