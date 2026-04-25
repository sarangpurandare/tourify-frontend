import type { SiteConfig } from "@/types/website-template";
import { Nav } from "./nav";
import { OpeningSequence } from "./opening";
import { Hero } from "./hero";
import { Manifesto } from "./manifesto";
import { Trips } from "./trips";
import { Philosophy } from "./philosophy";
import { Spotlight } from "./spotlight";
import { Who } from "./who";
import { Testimonials } from "./testimonials";
import { Destinations } from "./destinations";
import { StatsRibbon } from "./stats-ribbon";
import { JournalPreview } from "./journal-preview";
import { FAQ } from "./faq";
import { CTA } from "./cta";
import { Footer } from "./footer";
import { Floaters } from "./floaters";
import { RevealProvider } from "./reveal";

interface TemplateShellProps {
  config: SiteConfig;
}

export function BoardingPassTemplate({ config }: TemplateShellProps) {
  return (
    <>
      <Nav brand={config.brand} links={config.nav.links} cta={config.nav.cta} />
      <OpeningSequence {...config.opening} />
      <Hero hero={config.hero} stats={config.stats} />
      <Manifesto {...config.manifesto} />
      <Trips {...config.tours} />
      <Philosophy {...config.philosophy} />
      <Spotlight {...config.spotlight} />
      <Who {...config.who} />
      <Testimonials {...config.testimonials} />
      <Destinations {...config.destinations} />
      <StatsRibbon stats={config.stats} />
      <JournalPreview {...config.journal} />
      <FAQ {...config.faq} />
      <CTA {...config.cta} />
      <Footer brand={config.brand} footer={config.footer} />
      <Floaters whatsapp={config.brand.whatsapp} phone={config.brand.phone} />
      <RevealProvider />
    </>
  );
}
