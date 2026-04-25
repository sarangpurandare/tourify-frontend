// ─────────────────────────────────────────────────────────
// Boarding Pass Tours – Public Website Static Data
// All data adapted from boardingpasstours.com
// ─────────────────────────────────────────────────────────

// Tour data - these map to the trip_masters in the database
export interface Tour {
  slug: string;
  code: string;
  dest: string;
  subtitle: string;
  tagline: string;
  days: string;
  nights: string;
  group: string;
  season: string;
  price: string;
  priceNum: number;
  region: string;
  style: string;
  tags: string[];
  tagClass: string;
  coord: string;
  stamp: string;
  departures?: { d: string; seats: string; state: string }[];
  highlights?: string[];
  includes?: string[];
  excludes?: string[];
}

export interface Testimonial {
  name: string;
  trip: string;
  color: string;
  quote: string;
}

export interface JournalEntry {
  slug: string;
  tag: string;
  read: string;
  date: string;
  title: string;
  excerpt: string;
}

export interface Destination {
  name: string;
  country: string;
  coord: string;
  coords: string;
}

export interface FAQ {
  q: string;
  a: string;
}

export interface Stat {
  num: string;
  label: string;
}

// ─────────────────────────────────────────────────────────
// Tours
// ─────────────────────────────────────────────────────────

export const TOURS: Tour[] = [
  {
    slug: "scotland-ireland",
    code: "BP-001",
    dest: "Scotland & Ireland",
    subtitle: "Highlands, castles, and Celtic stories",
    tagline:
      "Sixteen days through the Scottish Highlands, Irish countryside, and centuries of Celtic heritage.",
    days: "16D",
    nights: "15N",
    group: "Max 10",
    season: "2026",
    price: "On Request",
    priceNum: 0,
    region: "Europe",
    style: "Heritage",
    tags: ["Heritage", "Cultural"],
    tagClass: "tag-terra",
    coord: "57.2°N 06.2°W",
    stamp: "BP-001 · EDI",
    departures: [{ d: "2026", seats: "Max 10 people", state: "open" }],
  },
  {
    slug: "alaska-canadian-rockies",
    code: "BP-002",
    dest: "Alaska & Canadian Rockies",
    subtitle: "Glaciers, wildlife, and mountain grandeur",
    tagline:
      "Fifteen days through Alaska's wilderness and the majestic Canadian Rockies.",
    days: "15D",
    nights: "14N",
    group: "Max 16",
    season: "2026",
    price: "On Request",
    priceNum: 0,
    region: "North America",
    style: "Adventure",
    tags: ["Adventure", "Nature"],
    tagClass: "tag-teal",
    coord: "61.2°N 149.9°W",
    stamp: "BP-002 · ANC",
    departures: [{ d: "2026", seats: "Max 16 people", state: "open" }],
  },
  {
    slug: "balkans",
    code: "BP-003",
    dest: "Balkans",
    subtitle: "Where East meets West in spectacular fashion",
    tagline:
      "Fifteen days exploring the history, culture, and stunning landscapes of the Balkans.",
    days: "15D",
    nights: "14N",
    group: "Max 18",
    season: "2026",
    price: "On Request",
    priceNum: 0,
    region: "Europe",
    style: "Cultural",
    tags: ["Cultural", "Offbeat"],
    tagClass: "tag-ochre",
    coord: "43.8°N 18.4°E",
    stamp: "BP-003 · DBV",
  },
  {
    slug: "mexico-cuba",
    code: "BP-004",
    dest: "Mexico & Cuba",
    subtitle: "From ancient pyramids to rhythm-filled streets",
    tagline:
      "From ancient pyramids of Chichén Itzá to rhythm-filled streets of Havana — Mayan ruins, cenotes, vintage cars, colonial heritage, and countryside experiences.",
    days: "13D",
    nights: "12N",
    group: "12–15",
    season: "Dec 2026 – Jan 2027",
    price: "On Request",
    priceNum: 0,
    region: "Latin America",
    style: "Cultural",
    tags: ["Cultural", "Heritage"],
    tagClass: "tag-terra",
    coord: "20.6°N 87.0°W",
    stamp: "BP-004 · CUN",
    departures: [
      { d: "23 Dec 2026 – 04 Jan 2027", seats: "12-15 people", state: "open" },
    ],
  },
  {
    slug: "morocco",
    code: "BP-005",
    dest: "Morocco",
    subtitle: "Past the medina, into the mountains",
    tagline:
      "Berber villages, salt caravans, and long lunches in Marrakech riads.",
    days: "11D",
    nights: "10N",
    group: "10–12",
    season: "2026",
    price: "On Request",
    priceNum: 0,
    region: "North Africa",
    style: "Offbeat",
    tags: ["Offbeat", "Cultural"],
    tagClass: "tag-terra",
    coord: "31.6°N 07.9°W",
    stamp: "BP-005 · RAK",
  },
  {
    slug: "iceland",
    code: "BP-006",
    dest: "Iceland",
    subtitle: "Fire, ice, and the northern lights",
    tagline:
      "Volcanic landscapes, geysers, glaciers, and the magical Northern Lights.",
    days: "12D",
    nights: "11N",
    group: "10–12",
    season: "2026",
    price: "On Request",
    priceNum: 0,
    region: "Europe",
    style: "Adventure",
    tags: ["Adventure", "Nature"],
    tagClass: "tag-teal",
    coord: "64.1°N 21.9°W",
    stamp: "BP-006 · KEF",
  },
  {
    slug: "new-zealand",
    code: "BP-007",
    dest: "New Zealand",
    subtitle: "Middle-earth and beyond",
    tagline:
      "Fjords, mountains, Māori culture, and some of the most dramatic landscapes on earth.",
    days: "14D",
    nights: "13N",
    group: "10–12",
    season: "2026",
    price: "On Request",
    priceNum: 0,
    region: "Oceania",
    style: "Adventure",
    tags: ["Adventure", "Nature"],
    tagClass: "tag-teal",
    coord: "44.0°S 170.5°E",
    stamp: "BP-007 · CHC",
  },
  {
    slug: "norway-fjords",
    code: "BP-008",
    dest: "Norway Fjords",
    subtitle: "Dramatic fjords and Arctic light",
    tagline:
      "Cruise through spectacular fjords, explore Viking heritage, and chase the midnight sun.",
    days: "12D",
    nights: "11N",
    group: "10–12",
    season: "2026",
    price: "On Request",
    priceNum: 0,
    region: "Europe",
    style: "Slow Travel",
    tags: ["Slow Travel", "Nature"],
    tagClass: "tag-ochre",
    coord: "61.2°N 06.1°E",
    stamp: "BP-008 · BGO",
  },
  {
    slug: "peru-brazil",
    code: "BP-009",
    dest: "Peru & Brazil",
    subtitle: "Inca trails and Amazonian wonders",
    tagline:
      "From Machu Picchu to the Amazon, Rio's beaches to Cusco's colonial charm.",
    days: "15D",
    nights: "14N",
    group: "10–12",
    season: "2026",
    price: "On Request",
    priceNum: 0,
    region: "South America",
    style: "Adventure",
    tags: ["Adventure", "Cultural"],
    tagClass: "tag-terra",
    coord: "13.5°S 71.9°W",
    stamp: "BP-009 · LIM",
  },
];

// ─────────────────────────────────────────────────────────
// Testimonials
// ─────────────────────────────────────────────────────────

export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Traveller, Morocco 2026",
    trip: "Morocco, March 2026",
    color: "warm",
    quote:
      "An absolutely incredible experience. The attention to detail, the local guides, and the cultural immersion were beyond anything we expected. Asha's planning made everything seamless.",
  },
  {
    name: "Traveller, Morocco 2026",
    trip: "Morocco, March 2026",
    color: "",
    quote:
      "Asha Bhat and her team delivered a truly professional and deeply personal travel experience. Every detail was thought through, from the accommodations to the local experiences.",
  },
  {
    name: "Traveller, Morocco 2026",
    trip: "Morocco, March 2026",
    color: "teal",
    quote:
      "The cultural immersion was extraordinary. Our local guides were knowledgeable and passionate, and the small group size meant we could have genuine, meaningful interactions everywhere we went.",
  },
  {
    name: "Happy Traveller",
    trip: "Group Tour, 2025",
    color: "",
    quote:
      "What sets Boarding Pass apart is the personal touch. You're not just a booking number — you're part of a small group of like-minded people who become friends by the end of the trip.",
  },
  {
    name: "Repeat Traveller",
    trip: "Multiple Tours",
    color: "dark",
    quote:
      "We've travelled with Boarding Pass three times now. Each trip has been better than the last. The pace is perfect — we have time to actually experience each place, not just rush through.",
  },
  {
    name: "Solo Traveller",
    trip: "Group Tour, 2025",
    color: "",
    quote:
      "I was nervous about travelling solo, but within the first day I had new friends. By the end of the trip, we were already planning our next adventure together.",
  },
  {
    name: "Couple, 2025",
    trip: "International Tour",
    color: "warm",
    quote:
      "The all-inclusive pricing meant zero stress about budgets. Everything was taken care of — flights, hotels, local transport, meals, experiences. We just had to show up and enjoy.",
  },
];

// ─────────────────────────────────────────────────────────
// Journal / Blog
// ─────────────────────────────────────────────────────────

export const JOURNAL: JournalEntry[] = [
  {
    slug: "why-small-groups",
    tag: "TRAVEL PHILOSOPHY",
    read: "7 min",
    date: "March 2026",
    title: "Why we keep our groups small — and what it means for your trip",
    excerpt:
      "Never more than 15 to 20 people. Here's why that number matters, and what it means for the kind of experience you'll have.",
  },
  {
    slug: "tailor-made-holidays",
    tag: "PLANNING",
    read: "5 min",
    date: "Feb 2026",
    title: "Your dream trip, built exactly around you",
    excerpt:
      "No templates, no compromises. How we design tailor-made holidays that fit your pace, interests, and travel style.",
  },
  {
    slug: "visa-guide",
    tag: "PRACTICAL",
    read: "9 min",
    date: "Jan 2026",
    title: "The honest visa and travel prep guide for Indian travellers",
    excerpt:
      "Everything you need to know about visas, travel insurance, and preparation — from people who've handled hundreds of trips.",
  },
];

// ─────────────────────────────────────────────────────────
// Destinations (for map and listing)
// ─────────────────────────────────────────────────────────

export const DESTINATIONS: Destination[] = [
  {
    name: "Scotland & Ireland",
    country: "United Kingdom & Ireland",
    coord: "57.2°N 06.2°W",
    coords: "highlands & celtic",
  },
  {
    name: "Alaska",
    country: "United States",
    coord: "61.2°N 149.9°W",
    coords: "glaciers & wildlife",
  },
  {
    name: "Balkans",
    country: "Southeast Europe",
    coord: "43.8°N 18.4°E",
    coords: "history & culture",
  },
  {
    name: "Mexico & Cuba",
    country: "Latin America",
    coord: "20.6°N 87.0°W",
    coords: "pyramids & rhythm",
  },
  {
    name: "Iceland",
    country: "Nordic",
    coord: "64.1°N 21.9°W",
    coords: "fire & ice",
  },
  {
    name: "New Zealand",
    country: "Oceania",
    coord: "44.0°S 170.5°E",
    coords: "fjords & mountains",
  },
  {
    name: "Norway",
    country: "Nordic",
    coord: "61.2°N 06.1°E",
    coords: "fjords & midnight sun",
  },
  {
    name: "Peru & Brazil",
    country: "South America",
    coord: "13.5°S 71.9°W",
    coords: "inca & amazon",
  },
];

// ─────────────────────────────────────────────────────────
// FAQs
// ─────────────────────────────────────────────────────────

export const FAQS: FAQ[] = [
  {
    q: "How big are your groups?",
    a: "Our small group tours typically have 10 to 20 travellers — never more. This ensures a personal, intimate experience where everyone gets to connect meaningfully with the destination and each other.",
  },
  {
    q: "Can you plan a private trip for my family?",
    a: "Absolutely. Our tailor-made holidays are built exactly around you. No templates, no compromises. Tell us your dream trip, and we'll design it from scratch — your dates, your pace, your interests.",
  },
  {
    q: "What's included in the trip price?",
    a: "Our pricing is all-inclusive. Accommodation, meals, local transport, guided experiences, and on-ground support are all covered. We'll provide a detailed breakdown when you enquire about a specific trip.",
  },
  {
    q: "Do you help with visas and travel insurance?",
    a: "Yes, we provide complete visa guidance and support throughout the process. We also help you choose the right travel insurance. Stress-free logistics is part of what you're paying for.",
  },
  {
    q: "What if I'm travelling solo?",
    a: "Many of our travellers come solo and leave with new friends. Our small groups create a warm, welcoming environment. We can help with room sharing arrangements if you prefer.",
  },
  {
    q: "What's your cancellation policy?",
    a: "We have a fair cancellation policy with full details provided at booking. We strongly recommend trip insurance. Contact us for specific terms for your chosen trip.",
  },
  {
    q: "How fit do I need to be?",
    a: "Each trip clearly lists its pace and activity level. We design itineraries that are thoughtfully paced — travel at your own pace without rushing. If you have specific concerns, we'll be honest about what suits you best.",
  },
];

// ─────────────────────────────────────────────────────────
// Stats
// ─────────────────────────────────────────────────────────

export const STATS: Stat[] = [
  { num: "300+", label: "Happy travellers and counting" },
  { num: "20+", label: "Countries on the map" },
  { num: "98%", label: "Travellers who book again" },
  { num: "10 yrs", label: "Of curating experiences" },
];

// ─────────────────────────────────────────────────────────
// Images (Unsplash placeholders)
// ─────────────────────────────────────────────────────────

export const IMG: Record<string, string> = {
  scotland:
    "https://images.unsplash.com/photo-1580974928064-f0aeef70895a?w=1400&q=80",
  scotland2:
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1400&q=80",
  alaska:
    "https://images.unsplash.com/photo-1531176175280-33e3f52e5e49?w=1400&q=80",
  balkans:
    "https://images.unsplash.com/photo-1555990793-da11153b2473?w=1400&q=80",
  mexico:
    "https://images.unsplash.com/photo-1518638150340-f706e86654de?w=1400&q=80",
  cuba: "https://images.unsplash.com/photo-1500759285222-a95626b934cb?w=1400&q=80",
  morocco:
    "https://images.unsplash.com/photo-1597211684565-dca64d72bdfe?w=1400&q=80",
  morocco2:
    "https://images.unsplash.com/photo-1548013146-72479768bada?w=1400&q=80",
  iceland:
    "https://images.unsplash.com/photo-1504829857797-ddff29c27927?w=1400&q=80",
  newzealand:
    "https://images.unsplash.com/photo-1469521669194-babb45599def?w=1400&q=80",
  norway:
    "https://images.unsplash.com/photo-1520769945061-0a448c463865?w=1400&q=80",
  peru: "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=1400&q=80",
  bhutan:
    "https://images.unsplash.com/photo-1578645510447-e20b4311e3ce?w=1400&q=80",
  bhutan2:
    "https://images.unsplash.com/photo-1551649001-7a2482d98d05?w=1400&q=80",
  bhutan3:
    "https://images.unsplash.com/photo-1543340904-0b1d843bccda?w=1400&q=80",
  kerala:
    "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1400&q=80",
  georgia:
    "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=1400&q=80",
  uzbek:
    "https://images.unsplash.com/photo-1547558840-cd61e4af49ad?w=1400&q=80",
  japan:
    "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=1400&q=80",
  table:
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1400&q=80",
  hands:
    "https://images.unsplash.com/photo-1541614101331-1a5a3a194e92?w=1400&q=80",
  weaver:
    "https://images.unsplash.com/photo-1606293459339-aa5d34a7b0e1?w=1400&q=80",
  tea: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=1400&q=80",
  spice:
    "https://images.unsplash.com/photo-1532336414038-cf19250c5757?w=1400&q=80",
};

export const TOUR_IMG: Record<string, string> = {
  "scotland-ireland": IMG.scotland,
  "alaska-canadian-rockies": IMG.alaska,
  balkans: IMG.balkans,
  "mexico-cuba": IMG.mexico,
  morocco: IMG.morocco,
  iceland: IMG.iceland,
  "new-zealand": IMG.newzealand,
  "norway-fjords": IMG.norway,
  "peru-brazil": IMG.peru,
};

// ─────────────────────────────────────────────────────────
// Map pins (used by the interactive world map)
// ─────────────────────────────────────────────────────────

export const MAP_DESTS = [
  {
    name: "Scotland & Ireland",
    code: "EDI",
    x: 482,
    y: 130,
    tone: "gold",
    img: IMG.scotland,
    cap: "highlands & celtic",
  },
  {
    name: "Alaska",
    code: "ANC",
    x: 160,
    y: 120,
    tone: "",
    img: IMG.alaska,
    cap: "glaciers & wildlife",
  },
  {
    name: "Balkans",
    code: "DBV",
    x: 530,
    y: 175,
    tone: "teal",
    img: IMG.balkans,
    cap: "history & culture",
  },
  {
    name: "Mexico & Cuba",
    code: "CUN",
    x: 260,
    y: 230,
    tone: "",
    img: IMG.mexico,
    cap: "pyramids & rhythm",
  },
  {
    name: "Morocco",
    code: "RAK",
    x: 460,
    y: 220,
    tone: "gold",
    img: IMG.morocco,
    cap: "atlas mountains",
  },
  {
    name: "Iceland",
    code: "KEF",
    x: 440,
    y: 100,
    tone: "teal",
    img: IMG.iceland,
    cap: "fire & ice",
  },
  {
    name: "New Zealand",
    code: "CHC",
    x: 880,
    y: 400,
    tone: "",
    img: IMG.newzealand,
    cap: "fjords & mountains",
  },
  {
    name: "Norway",
    code: "BGO",
    x: 510,
    y: 120,
    tone: "gold",
    img: IMG.norway,
    cap: "fjords & midnight sun",
  },
  {
    name: "Peru & Brazil",
    code: "LIM",
    x: 310,
    y: 330,
    tone: "teal",
    img: IMG.peru,
    cap: "inca & amazon",
  },
];

// ─────────────────────────────────────────────────────────
// SVG Map Paths (simplified world outlines)
// ─────────────────────────────────────────────────────────

export const WORLD_PATH =
  "M120,180 C130,150 170,130 220,135 C260,138 290,150 330,148 C370,145 400,130 430,140 C460,150 470,170 488,165 C500,162 510,150 520,160 C530,170 525,185 540,188 C560,192 580,180 600,175 C625,170 645,180 660,200 C672,215 670,230 680,240 C690,252 705,250 715,260 C725,272 720,290 705,295 C685,302 660,290 640,300 C615,312 590,335 570,340 C545,348 510,335 478,332 C450,330 425,340 400,335 C370,330 345,310 320,308 C290,305 265,318 240,310 C210,300 180,275 158,250 C140,230 115,210 120,180 Z M462,108 C476,98 500,100 515,112 C525,122 525,138 510,140 C490,143 470,135 462,125 Z M740,140 C770,135 815,148 850,155 C880,160 895,175 875,195 C855,215 815,210 785,200 C760,192 735,175 740,140 Z M450,265 C490,260 525,275 540,300 C560,335 555,380 528,408 C500,432 460,440 430,420 C405,402 395,370 405,335 C413,305 425,278 450,265 Z";

// North America outline
export const NA_PATH =
  "M120,100 C140,80 180,75 220,85 C260,95 300,100 320,90 C350,75 380,100 350,130 C330,155 300,170 280,190 C260,210 240,230 250,250 C260,270 240,290 220,285 C200,280 180,260 160,240 C140,220 125,190 120,165 C115,140 110,120 120,100 Z";

// South America outline
export const SA_PATH =
  "M280,270 C300,260 320,275 310,300 C305,320 300,345 305,365 C310,385 305,410 290,425 C275,440 265,430 270,405 C275,380 260,355 255,330 C250,310 260,280 280,270 Z";
