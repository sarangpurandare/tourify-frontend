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

// Premium Cliffside is the first GATED template in the system. It demonstrates
// per-org access control: only orgs that have been granted access via
// /admin/templates can see it on /website. The backend mirrors the
// `requires_grant` flag in `internal/plan/templates.go` (GatedTemplates).

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
    name: "Cliffside",
    tagline: "Quiet Coasts, Bold Horizons",
    subtitle: "Coastal small-group expeditions",
    logoInitial: "c",
    phone: "+91 96005 87100",
    whatsapp: "919600587100",
    email: "hello@cliffsidetravel.com",
    address: "41, Shree Dhanalaxmi CHS,\nTaikalwadi, Mahim,\nMumbai 400016",
    established: "ESTD. 2016 · MUMBAI",
    copyright: "© 2026 Cliffside Travel · Mumbai",
    socials: [
      { platform: "Instagram", url: "https://instagram.com/cliffside.travel" },
      { platform: "Facebook", url: "https://facebook.com/cliffsidetravel" },
      { platform: "LinkedIn", url: "https://linkedin.com/company/cliffside-travel" },
    ],
  },

  nav: {
    links: [
      { label: "Home", href: "/" },
      { label: "Voyages", href: "/tours" },
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
    cta: { label: "Plan a voyage", href: "/contact" },
  },

  opening: {
    enabled: true,
    pass: {
      brandHtml: "Cliff<em>side</em>",
      established: "ESTD. 2016 · MUMBAI",
      origin: { code: "BOM", city: "Mumbai · Origin" },
      destination: { code: "REK", city: "Reykjavík · North" },
      flightCode: "CS-026",
      flightClass: "OCEAN VIEW",
      flightDate: "2026 — A YEAR",
      metaCells: [
        { label: "Voyager", value: "You" },
        { label: "Group", value: "10" },
        { label: "Pace", value: "Coastal" },
        { label: "Boarding", value: "Now" },
      ],
      stampLines: ["Bound", "For", "Quieter Shores"],
      stubLabel: "Berth · Window",
      stubNumber: "07A",
      stubSubtext: "where the\ncliffs meet sky",
    },
    map: {
      eyebrow: "Nine coastlines · Small groups · One unhurried year",
      headlineHtml: "Quiet Coasts,<br/>Bold <em>Horizons.</em>",
      subtitle:
        "Hover any pin. These are the coastlines we travel — slow, salt-air journeys for travellers who'd rather watch a tide than tick a list.",
      cue: "Scroll to chart the voyages",
      originX: 520,
      originY: 230,
      destinations: MAP_DESTS,
      worldPath: WORLD_PATH,
    },
  },

  hero: {
    eyebrow: "Coastal voyages, small groups — where horizons stay open",
    titleHtml: "Quiet coasts.<br/><em>Bold horizons.</em>",
    subtitle:
      "We curate unhurried coastal voyages with small groups and seasoned guides. Travel with a handpicked group of like-minded explorers — never more than 10 to 15 voyagers.",
    primaryCta: { label: "See this year's voyages →", href: "/tours" },
    secondaryCta: { label: "Talk to Us", href: "/contact" },
    handNote: "↗ no chatbots, we promise",
    images: [
      { src: IMG.scotland, label: "scottish cliffs", caption: "edinburgh, 2026", coord: "57.2°N" },
      { src: IMG.iceland, label: "north atlantic", caption: "iceland", coord: "64.1°N" },
      { src: IMG.norway, label: "fjord light", caption: "norway", coord: "60.5°N" },
    ],
  },

  manifesto: {
    eyebrow: "A small honest note",
    textHtml:
      'We don\'t do <span class="strike">crowded buses</span>. We do small boats, quiet coves, and slow mornings. We don\'t do <span class="strike">tick-the-box itineraries.</span> We do small groups, real connections, and <em>afternoons by the sea</em> nobody is in a hurry to leave.',
    founder: "— Asha Bhat",
    founderRole: "Founder, Cliffside Travel\n10 years · 20+ coastlines · 300+ friends",
  },

  tours: {
    eyebrow: "2026–27 Voyages",
    titleHtml: "Upcoming <em>voyages.</em>",
    kicker:
      "Each voyage is thoughtfully charted, with small groups of like-minded travellers. No templates, no compromises — just unforgettable coastlines.",
    ctaLabel: "See all voyages →",
    ctaHref: "/tours",
    items: TOURS,
    images: TOUR_IMG,
  },

  philosophy: {
    eyebrow: "How we voyage",
    introHtml:
      "Most travel companies sell <em>destinations.</em> We design the moments in between — the harbour breakfast, the empty trail, the sunset nobody schedules.",
    items: [
      {
        num: "01",
        title: "Small groups. Never more than 15.",
        description:
          "Travel with a handpicked group of like-minded voyagers. One round table at every dinner. Everybody has a seat. Everybody gets heard.",
      },
      {
        num: "02",
        title: "Move with the tide.",
        description:
          "No rushing. Our charted itineraries leave room for storms, swims and sudden detours — the moments that actually become the trip.",
      },
      {
        num: "03",
        title: "Quiet trails, local stories.",
        description:
          "We seek the stories behind the postcards. Local guides, family-run stays, and coastal experiences that most travellers never discover.",
      },
      {
        num: "04",
        title: "Stress-free, start to finish.",
        description:
          "Visa support, on-ground logistics, dietary planning — everything handled. Your only job is to show up and watch the horizon.",
      },
    ],
  },

  spotlight: {
    eyebrow: "Featured Voyage",
    titleHtml: "Iceland<br/><em>& the Faroes.</em>",
    description:
      "Sixteen days along the North Atlantic — black-sand beaches, basalt cliffs, and centuries of seafaring heritage. Small group of just 10 voyagers, immersive coastal stops, and horizons that take your breath away.",
    images: [
      { src: IMG.iceland, label: "north atlantic", caption: "reykjavík", coord: "64.1°N" },
      { src: IMG.norway, label: "fjord light", caption: "norway" },
    ],
    postmark: { line1: "Featured", line2: "Iceland", line3: "Booking open" },
    infoCells: [
      { label: "Duration", value: "16 Days", valueSub: "15 Nights" },
      { label: "Group", value: "Max 10", valueSub: "voyagers" },
      { label: "Season", value: "2026", valueSub: "departures" },
    ],
    includes: [
      "All accommodation in handpicked coastal stays",
      "Expert local guides throughout",
      "All meals and coastal experiences",
      "Visa support and travel insurance guidance",
      "Airport transfers and local transport",
      "Small group, maximum 10 voyagers",
    ],
    primaryCta: { label: "Enquire about this voyage →", href: "/contact" },
    secondaryCta: { label: "WhatsApp Us", href: "https://wa.me/919600587100" },
  },

  who: {
    eyebrow: "Who we're for",
    titleHtml: "If you love <em>coastlines</em><br/>and unhurried travel,<br/>we built this for you.",
    subtitle:
      "Our voyagers are curious, well-travelled people who are done with cookie-cutter group tours and want something quieter. People who'd rather sit on a cliff than sit in traffic.",
    images: [
      { src: IMG.table, label: "harbour dinner", caption: "day 6" },
      { src: IMG.weaver, label: "local craft", caption: "workshop" },
      { src: IMG.tea, label: "harbour stop", caption: "fishing village" },
    ],
    items: [
      {
        tone: "",
        heading: "You want voyages, not just trips.",
        text: "Quiet trails, local stories, and moments that no guidebook covers. Travel that goes deeper than the surface.",
      },
      {
        tone: "alt",
        heading: "You want company, not crowds.",
        text: "A small group of like-minded voyagers, real conversations, and friendships that last beyond the coast.",
      },
      {
        tone: "three",
        heading: "You want it all taken care of.",
        text: "Visa support, dietary planning, on-ground logistics — everything handled. Your only job is to enjoy the voyage.",
      },
    ],
  },

  testimonials: {
    eyebrow: "What our voyagers say",
    titleHtml: "In their <em>own words.</em>",
    reviewSource: "5/5 · Verified reviews · Google Reviews",
    items: TESTIMONIALS,
  },

  destinations: {
    eyebrow: "Where we sail",
    titleHtml: "A <em>well-loved</em><br/>chart.",
    kicker:
      "We voyage to coastlines we know and love. Each journey is designed to go beyond the postcard and into the heart of a coast.",
    items: DESTINATIONS.map((d) => ({
      ...d,
      image: DEST_IMGS[d.name] || IMG.iceland,
    })),
  },

  stats: STATS,

  journal: {
    eyebrow: "From the logbook",
    titleHtml: "Long reads,<br/><em>slower coasts.</em>",
    ctaLabel: "Read the logbook",
    entries: JOURNAL.map((j, i) => ({
      ...j,
      image: [IMG.iceland, IMG.norway, IMG.alaska][i] || IMG.iceland,
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
    eyebrow: "Start your voyage",
    titleHtml: "Where <em>should you</em><br/>sail next?",
    subtitle:
      "A conversation with us, free, no pressure. We'll talk about what you're looking for, what kind of coast excites you — and which voyage might be the right next one.",
    primaryCta: { label: "Get in touch →", href: "/contact" },
    secondaryCta: { label: "WhatsApp us", href: "https://wa.me/919600587100" },
    finePrint: "No spam. Reply within 24 hrs.",
  },

  footer: {
    description:
      "We curate unhurried coastal voyages with small groups and seasoned guides. Based in Mumbai, charting unhurried journeys since 2016.",
    columns: [
      {
        title: "Voyages",
        items: [
          { label: "All voyages", href: "/tours" },
          { label: "Small Group Voyages" },
          { label: "Tailor-made Holidays" },
          { label: "Private departures" },
        ],
      },
      {
        title: "Company",
        items: [
          { label: "About Us", href: "/about" },
          { label: "Gallery" },
          { label: "Logbook" },
          { label: "Contact", href: "/contact" },
        ],
      },
    ],
    tagline: "Quiet Coasts, Bold Horizons",
  },

  images: IMG,

  seo: {
    title: "Cliffside Travel — Quiet Coasts, Bold Horizons",
    description:
      "Small-group coastal voyages curated by Cliffside Travel. Unhurried journeys with expert guides, handpicked groups of 10-15 voyagers, and coastlines that go beyond the obvious.",
    keywords: [
      "small group voyages",
      "coastal travel",
      "Cliffside Travel",
      "international voyages",
      "curated coastal travel",
      "Mumbai travel company",
    ],
    ogType: "website",
    robots: "index, follow",
    locale: "en_IN",
    structuredData: {
      type: "TravelAgency",
      name: "Cliffside Travel",
      description:
        "Small-group coastal voyages curated by Cliffside Travel. Unhurried journeys with seasoned guides.",
      url: "https://www.cliffsidetravel.com",
      phone: "+919600587100",
      priceRange: "$$$",
      address: {
        street: "41, Shree Dhanalaxmi CHS, Taikalwadi, Mahim",
        city: "Mumbai",
        region: "Maharashtra",
        postalCode: "400016",
        country: "IN",
      },
      sameAs: [
        "https://instagram.com/cliffside.travel",
        "https://facebook.com/cliffsidetravel",
        "https://linkedin.com/company/cliffside-travel",
      ],
    },
  },

  domain: {
    sslEnabled: true,
    verified: false,
  },
};

export const premiumCliffsideTemplate: WebsiteTemplate = {
  id: "premium-cliffside",
  name: "Premium Cliffside",
  description:
    "A premium coastal-voyages template with a deep-blue palette, ocean photography and a quieter, more editorial tone. Gated to selected organisations.",
  thumbnail: "/templates/premium-cliffside-thumb.png",
  category: "Travel & Tourism",
  tags: ["coastal", "premium", "editorial", "slow", "ocean"],
  requires_grant: true,
  defaults,
};
