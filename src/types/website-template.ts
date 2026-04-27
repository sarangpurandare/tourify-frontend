import type { Tour, Testimonial, JournalEntry, Destination, FAQ, Stat } from "@/lib/website-data";

export type { Tour, Testimonial, JournalEntry, Destination, FAQ, Stat };

export interface LinkItem {
  label: string;
  href: string;
}

export interface ImageItem {
  src: string;
  label?: string;
  caption?: string;
  coord?: string;
}

export interface MapDest {
  name: string;
  code: string;
  x: number;
  y: number;
  tone: string;
  img: string;
  cap: string;
}

export interface SiteConfig {
  brand: {
    name: string;
    tagline: string;
    subtitle: string;
    logoInitial: string;
    logoUrl?: string;
    phone: string;
    whatsapp: string;
    email: string;
    address: string;
    established: string;
    copyright: string;
    socials: { platform: string; url: string }[];
  };

  nav: {
    links: LinkItem[];
    cta: LinkItem;
  };

  opening: {
    enabled: boolean;
    pass: {
      brandHtml: string;
      established: string;
      origin: { code: string; city: string };
      destination: { code: string; city: string };
      flightCode: string;
      flightClass: string;
      flightDate: string;
      metaCells: { label: string; value: string }[];
      stampLines: string[];
      stubLabel: string;
      stubNumber: string;
      stubSubtext: string;
    };
    map: {
      eyebrow: string;
      headlineHtml: string;
      subtitle: string;
      cue: string;
      originX: number;
      originY: number;
      destinations: MapDest[];
      worldPath: string;
    };
  };

  hero: {
    eyebrow: string;
    titleHtml: string;
    subtitle: string;
    primaryCta: LinkItem;
    secondaryCta: LinkItem;
    handNote: string;
    images: ImageItem[];
  };

  manifesto: {
    eyebrow: string;
    textHtml: string;
    founder: string;
    founderRole: string;
  };

  tours: {
    eyebrow: string;
    titleHtml: string;
    kicker: string;
    ctaLabel: string;
    ctaHref: string;
    items: Tour[];
    images: Record<string, string>;
  };

  philosophy: {
    eyebrow: string;
    introHtml: string;
    items: { num: string; title: string; description: string }[];
  };

  spotlight: {
    eyebrow: string;
    titleHtml: string;
    description: string;
    images: ImageItem[];
    postmark: { line1: string; line2: string; line3: string };
    infoCells: { label: string; value: string; valueSub: string }[];
    includes: string[];
    primaryCta: LinkItem;
    secondaryCta: LinkItem;
  };

  who: {
    eyebrow: string;
    titleHtml: string;
    subtitle: string;
    images: ImageItem[];
    items: { tone: string; heading: string; text: string }[];
  };

  testimonials: {
    eyebrow: string;
    titleHtml: string;
    reviewSource: string;
    items: Testimonial[];
  };

  destinations: {
    eyebrow: string;
    titleHtml: string;
    kicker: string;
    items: (Destination & { image: string })[];
  };

  stats: Stat[];

  journal: {
    eyebrow: string;
    titleHtml: string;
    ctaLabel: string;
    entries: (JournalEntry & { image: string })[];
  };

  faq: {
    eyebrow: string;
    titleHtml: string;
    subtitle: string;
    contactLabel: string;
    contactHref: string;
    items: FAQ[];
  };

  cta: {
    eyebrow: string;
    titleHtml: string;
    subtitle: string;
    primaryCta: LinkItem;
    secondaryCta: LinkItem;
    finePrint: string;
  };

  footer: {
    description: string;
    columns: { title: string; items: { label: string; href?: string }[] }[];
    tagline: string;
  };

  images: Record<string, string>;

  seo: {
    title: string;
    description: string;
    keywords: string[];
    ogImage?: string;
    ogType: string;
    canonicalUrl?: string;
    robots: string;
    locale: string;
    structuredData?: {
      type: string;
      name: string;
      description: string;
      url?: string;
      logo?: string;
      address?: { street: string; city: string; region: string; postalCode: string; country: string };
      phone?: string;
      priceRange?: string;
      sameAs?: string[];
    };
  };

  domain?: {
    customDomain?: string;
    sslEnabled: boolean;
    verified: boolean;
    verificationToken?: string;
    dnsRecords?: { type: string; name: string; value: string; status: 'pending' | 'verified' | 'error' }[];
  };
}

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: string;
  tags: string[];
  /**
   * When true, this template is gated and only visible to organisations
   * that have been explicitly granted access via the platform-admin
   * /admin/templates page. Defaults to false (template available to all).
   *
   * IMPORTANT: keep this in sync with the canonical list in
   * `backend/internal/plan/templates.go` (`GatedTemplates`). The backend
   * relies on its own list to enforce the gate on PUT /api/v1/website/config.
   */
  requires_grant?: boolean;
}

export interface WebsiteTemplate extends TemplateInfo {
  defaults: SiteConfig;
}
