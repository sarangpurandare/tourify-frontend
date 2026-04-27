import {
  TOURS,
  TOUR_IMG,
  TESTIMONIALS,
  JOURNAL,
  DESTINATIONS,
  FAQS,
  STATS,
  IMG,
  MAP_DESTS,
  WORLD_PATH,
} from "@/lib/website-data";
import type { WebsiteTemplate, SiteConfig } from "@/types/website-template";

const DEST_IMGS: Record<string, string> = {
  "Scotland & Ireland": IMG.scotland,
  Alaska: IMG.alaska,
  Balkans: IMG.balkans,
  "Mexico & Cuba": IMG.mexico,
  Iceland: IMG.iceland,
  "New Zealand": IMG.newzealand,
  Norway: IMG.norway,
  "Peru & Brazil": IMG.peru,
};

export const defaults: SiteConfig = {
  brand: {
    name: "Boarding Pass",
    tagline: "Where Every Stamp Tells A Story",
    subtitle: "Small-group travel · Mumbai",
    logoInitial: "b",
    phone: "+91 96005 87100",
    whatsapp: "919600587100",
    email: "info@boardingpasstours.com",
    address: "41, Shree Dhanalaxmi CHS,\nTaikalwadi, Mahim,\nMumbai 400016",
    established: "ESTD. 2016 · MUMBAI",
    copyright: "© 2026 Boarding Pass Tours · Mumbai",
    socials: [
      { platform: "Instagram", url: "https://instagram.com/boardingpass.tours" },
      { platform: "Facebook", url: "https://facebook.com/boardingpasstour" },
      { platform: "LinkedIn", url: "https://linkedin.com/company/boardingpass-tours" },
    ],
  },

  nav: {
    links: [
      { label: "Home", href: "/" },
      { label: "Trips", href: "/tours" },
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
    cta: { label: "Plan a trip", href: "/contact" },
  },

  opening: {
    enabled: true,
    pass: {
      brandHtml: "Boarding <em>Pass</em>",
      established: "ESTD. 2016 · MUMBAI",
      origin: { code: "BOM", city: "Mumbai · Origin" },
      destination: { code: "EDI", city: "Edinburgh · Scotland" },
      flightCode: "BP-026",
      flightClass: "WINDOW SEAT",
      flightDate: "2026 — A YEAR",
      metaCells: [
        { label: "Passenger", value: "You" },
        { label: "Group", value: "12" },
        { label: "Pace", value: "Slow" },
        { label: "Boarding", value: "Now" },
      ],
      stampLines: ["Cleared", "For", "Curiosity"],
      stubLabel: "Seat · Window",
      stubNumber: "14A",
      stubSubtext: "somewhere\nworth going",
    },
    map: {
      eyebrow: "Nine destinations · Small groups · One unhurried year",
      headlineHtml: "Where Every Stamp<br/>Tells <em>A Story.</em>",
      subtitle:
        "Hover any pin. These are the places we travel to — small-group journeys for travellers who'd rather know a country than tick it off.",
      cue: "Scroll to see the trips",
      originX: 520,
      originY: 230,
      destinations: MAP_DESTS,
      worldPath: WORLD_PATH,
    },
  },

  hero: {
    eyebrow: "Small groups, big curiosity — where every stamp tells a story",
    titleHtml: "Small groups.<br/><em>Big adventures.</em>",
    subtitle:
      "We curate unforgettable travel experiences with small groups and expert guides. Travel with a handpicked group of like-minded explorers — never more than 15 to 20 people.",
    primaryCta: { label: "See this year's trips →", href: "/tours" },
    secondaryCta: { label: "Talk to Us", href: "/contact" },
    handNote: "↗ no chatbots, we promise",
    images: [
      { src: IMG.scotland, label: "scottish highlands", caption: "edinburgh, 2026", coord: "57.2°N" },
      { src: IMG.morocco, label: "atlas mountains", caption: "marrakech", coord: "31.6°N" },
      { src: IMG.iceland, label: "golden circle", caption: "iceland", coord: "64.1°N" },
    ],
  },

  manifesto: {
    eyebrow: "A small honest note",
    textHtml:
      'We don\'t do <span class="strike">cookie-cutter itineraries</span>. We do thoughtfully crafted journeys featuring hidden trails and local experiences. We don\'t do <span class="strike">rushed photo stops.</span> We do small groups, real connections, and <em>afternoons nobody is in a hurry</em> to end.',
    founder: "— Asha Bhat",
    founderRole: "Founder, Boarding Pass Tours\n10 years · 20+ countries · 300+ friends",
  },

  tours: {
    eyebrow: "2026–27 Departures",
    titleHtml: "Upcoming <em>trips.</em>",
    kicker:
      "Each trip is thoughtfully crafted, with small groups of like-minded travellers. No templates, no compromises — just unforgettable experiences.",
    ctaLabel: "See all trips →",
    ctaHref: "/tours",
    items: TOURS,
    images: TOUR_IMG,
  },

  philosophy: {
    eyebrow: "How we travel",
    introHtml:
      "Most travel companies sell <em>destinations.</em> We design the experiences in between — the local cook, the hidden trail, the morning nobody schedules.",
    items: [
      {
        num: "01",
        title: "Small groups. Never more than 20.",
        description:
          "Travel with a handpicked group of like-minded explorers. One round table at every dinner. Everybody has a seat. Everybody gets heard.",
      },
      {
        num: "02",
        title: "Travel at your own pace.",
        description:
          "No rushing through destinations. Our thoughtfully crafted itineraries give you time to actually experience each place, not just photograph it.",
      },
      {
        num: "03",
        title: "Hidden trails & local experiences.",
        description:
          "We seek the stories behind the destinations. Local guides, family-run stays, and experiences that most travellers never discover.",
      },
      {
        num: "04",
        title: "Stress-free, start to finish.",
        description:
          "Visa support, on-ground logistics, dietary planning — everything handled. Your only job is to show up and enjoy the journey.",
      },
    ],
  },

  spotlight: {
    eyebrow: "Featured Trip",
    titleHtml: "Scotland<br/><em>& Ireland.</em>",
    description:
      "Sixteen days through the Scottish Highlands, Irish countryside, and centuries of Celtic heritage. Small group of just 10 travellers, immersive local experiences, and landscapes that take your breath away.",
    images: [
      { src: IMG.scotland, label: "scottish highlands", caption: "edinburgh", coord: "57.2°N" },
      { src: IMG.scotland2, label: "isle of skye", caption: "hebrides" },
    ],
    postmark: { line1: "Featured", line2: "Scotland", line3: "Booking open" },
    infoCells: [
      { label: "Duration", value: "16 Days", valueSub: "15 Nights" },
      { label: "Group", value: "Max 10", valueSub: "travellers" },
      { label: "Season", value: "2026", valueSub: "departures" },
    ],
    includes: [
      "All accommodation in handpicked heritage stays",
      "Expert local guides throughout",
      "All meals and local experiences",
      "Visa support and travel insurance guidance",
      "Airport transfers and local transport",
      "Small group, maximum 10 travellers",
    ],
    primaryCta: { label: "Enquire about this trip →", href: "/contact" },
    secondaryCta: { label: "WhatsApp Us", href: "https://wa.me/919600587100" },
  },

  who: {
    eyebrow: "Who we're for",
    titleHtml: "If you're <em>curious</em><br/>and love to travel,<br/>we built this for you.",
    subtitle:
      "Our travellers are curious, well-travelled people who are done with cookie-cutter group tours and want something more meaningful. People who'd rather know a place than just visit it.",
    images: [
      { src: IMG.table, label: "group dinner", caption: "day 6" },
      { src: IMG.weaver, label: "local craft", caption: "workshop" },
      { src: IMG.tea, label: "chai stop", caption: "local village" },
    ],
    items: [
      {
        tone: "",
        heading: "You want experiences, not just sightseeing.",
        text: "Hidden trails, local stories, and moments that no guidebook covers. Travel that goes deeper than the surface.",
      },
      {
        tone: "alt",
        heading: "You want company, not crowds.",
        text: "A small group of like-minded travellers, real conversations, and connections that last beyond the trip.",
      },
      {
        tone: "three",
        heading: "You want it all taken care of.",
        text: "Visa support, dietary planning, on-ground logistics — everything handled. Your only job is to enjoy the journey.",
      },
    ],
  },

  testimonials: {
    eyebrow: "What our travellers say",
    titleHtml: "In their <em>own words.</em>",
    reviewSource: "5/5 · Verified reviews · Google Reviews",
    items: TESTIMONIALS,
  },

  destinations: {
    eyebrow: "Where we go",
    titleHtml: "A <em>well-loved</em><br/>map.",
    kicker:
      "We travel to destinations we know and love. Each journey is designed to go beyond the surface and into the heart of a place.",
    items: DESTINATIONS.map((d) => ({
      ...d,
      image: DEST_IMGS[d.name] || IMG.scotland,
    })),
  },

  stats: STATS,

  journal: {
    eyebrow: "From the journal",
    titleHtml: "Long reads,<br/><em>slower journeys.</em>",
    ctaLabel: "Read the journal",
    entries: JOURNAL.map((j, i) => ({
      ...j,
      image: [IMG.scotland, IMG.morocco, IMG.alaska][i] || IMG.scotland,
    })),
  },

  faq: {
    eyebrow: "Honest answers",
    titleHtml: "The questions <em>everyone</em> asks.",
    subtitle: "No marketing-speak. If we don't have an answer, we'll say so.",
    contactLabel: "Ask a different question",
    contactHref: "/contact",
    items: FAQS,
  },

  cta: {
    eyebrow: "Start your journey",
    titleHtml: "Where <em>should you</em><br/>go next?",
    subtitle:
      "A conversation with us, free, no pressure. We'll talk about what you're looking for, what kind of experiences excite you — and which trip might be the right next one.",
    primaryCta: { label: "Get in touch →", href: "/contact" },
    secondaryCta: { label: "WhatsApp us", href: "https://wa.me/919600587100" },
    finePrint: "No spam. Reply within 24 hrs.",
  },

  footer: {
    description:
      "We curate unforgettable travel experiences with small groups and expert guides. Based in Mumbai, designing unhurried journeys since 2016.",
    columns: [
      {
        title: "Trips",
        items: [
          { label: "All journeys", href: "/tours" },
          { label: "Small Group Tours" },
          { label: "Tailor-made Holidays" },
          { label: "Private departures" },
        ],
      },
      {
        title: "Company",
        items: [
          { label: "About Us", href: "/about" },
          { label: "Gallery" },
          { label: "Travel Blogs" },
          { label: "Contact", href: "/contact" },
        ],
      },
    ],
    tagline: "Where Every Stamp Tells A Story",
  },

  images: IMG,

  seo: {
    title: "Boarding Pass Tours — Where Every Stamp Tells A Story",
    description:
      "Small-group travel experiences curated by Boarding Pass Tours. Unforgettable journeys with expert guides, handpicked groups of 10-20 travellers, and destinations that go beyond the obvious.",
    keywords: [
      "small group tours",
      "travel experiences",
      "Boarding Pass Tours",
      "international tours",
      "curated travel",
      "Mumbai travel company",
    ],
    ogType: "website",
    robots: "index, follow",
    locale: "en_IN",
    structuredData: {
      type: "TravelAgency",
      name: "Boarding Pass Tours",
      description:
        "Small-group travel experiences curated by Boarding Pass Tours. Unforgettable journeys with expert guides.",
      url: "https://www.boardingpasstours.com",
      phone: "+919600587100",
      priceRange: "$$",
      address: {
        street: "41, Shree Dhanalaxmi CHS, Taikalwadi, Mahim",
        city: "Mumbai",
        region: "Maharashtra",
        postalCode: "400016",
        country: "IN",
      },
      sameAs: [
        "https://instagram.com/boardingpass.tours",
        "https://facebook.com/boardingpasstour",
        "https://linkedin.com/company/boardingpass-tours",
      ],
    },
  },

  domain: {
    sslEnabled: true,
    verified: false,
  },
};

export const boardingPassTemplate: WebsiteTemplate = {
  id: "boarding-pass",
  name: "Boarding Pass",
  description:
    "A warm, experiential travel template with boarding pass animation, interactive world map, polaroid imagery, and a storytelling-first layout.",
  thumbnail: "/templates/boarding-pass-thumb.png",
  category: "Travel & Tourism",
  tags: ["travel", "experiential", "animated", "storytelling", "warm"],
  defaults,
};
