import type { Metadata } from "next";
import { getTemplate, DEFAULT_TEMPLATE_ID } from "@/lib/templates";
import { BoardingPassTemplate } from "@/components/website/template-shell";
import type { SiteConfig } from "@/types/website-template";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

interface PublicWebsiteConfigResponse {
  data?: {
    template_id?: string;
    config?: Partial<SiteConfig>;
  };
}

async function getOrgConfig(orgSlug: string): Promise<SiteConfig> {
  const fallbackTemplate = getTemplate(DEFAULT_TEMPLATE_ID)!;
  try {
    const res = await fetch(
      `${API_URL}/public/website/${encodeURIComponent(orgSlug)}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) {
      return fallbackTemplate.defaults;
    }
    const body = (await res.json()) as PublicWebsiteConfigResponse;
    const stored = body?.data?.config;
    if (!stored || Object.keys(stored).length === 0) {
      return fallbackTemplate.defaults;
    }
    const templateId = body?.data?.template_id || DEFAULT_TEMPLATE_ID;
    const template = getTemplate(templateId) ?? fallbackTemplate;
    // Merge over template defaults so missing/new fields keep working.
    return { ...template.defaults, ...(stored as SiteConfig) };
  } catch {
    return fallbackTemplate.defaults;
  }
}

function buildJsonLd(config: SiteConfig) {
  const sd = config.seo.structuredData;
  if (!sd) return null;
  return {
    "@context": "https://schema.org",
    "@type": sd.type,
    name: sd.name,
    description: sd.description,
    ...(sd.url && { url: sd.url }),
    ...(sd.logo && { logo: sd.logo }),
    ...(sd.phone && { telephone: sd.phone }),
    ...(sd.priceRange && { priceRange: sd.priceRange }),
    ...(sd.address && {
      address: {
        "@type": "PostalAddress",
        streetAddress: sd.address.street,
        addressLocality: sd.address.city,
        addressRegion: sd.address.region,
        postalCode: sd.address.postalCode,
        addressCountry: sd.address.country,
      },
    }),
    ...(sd.sameAs && { sameAs: sd.sameAs }),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgId: string }>;
}): Promise<Metadata> {
  const { orgId } = await params;
  const config = await getOrgConfig(orgId);
  const { seo } = config;

  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    robots: seo.robots,
    openGraph: {
      title: seo.title,
      description: seo.description,
      type: seo.ogType as "website",
      ...(seo.ogImage && { images: [seo.ogImage] }),
      locale: seo.locale,
    },
    ...(seo.canonicalUrl && {
      alternates: { canonical: seo.canonicalUrl },
    }),
  };
}

export default async function OrgLandingPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const config = await getOrgConfig(orgId);
  const jsonLd = buildJsonLd(config);

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <BoardingPassTemplate config={config} />
    </>
  );
}
