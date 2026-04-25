import { Nav } from "@/components/website/nav";
import { OpeningSequence } from "@/components/website/opening";
import { Hero } from "@/components/website/hero";
import { Manifesto } from "@/components/website/manifesto";
import { Trips } from "@/components/website/trips";
import { Philosophy } from "@/components/website/philosophy";
import { Spotlight } from "@/components/website/spotlight";
import { Who } from "@/components/website/who";
import { Testimonials } from "@/components/website/testimonials";
import { Destinations } from "@/components/website/destinations";
import { StatsRibbon } from "@/components/website/stats-ribbon";
import { JournalPreview } from "@/components/website/journal-preview";
import { FAQ } from "@/components/website/faq";
import { CTA } from "@/components/website/cta";
import { Footer } from "@/components/website/footer";
import { Floaters } from "@/components/website/floaters";
import { RevealProvider } from "@/components/website/reveal";

export default async function OrgLandingPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  return (
    <>
      <Nav />
      <OpeningSequence />
      <Hero />
      <Manifesto />
      <Trips />
      <Philosophy />
      <Spotlight />
      <Who />
      <Testimonials />
      <Destinations />
      <StatsRibbon />
      <JournalPreview />
      <FAQ />
      <CTA />
      <Footer />
      <Floaters />
      <RevealProvider />
    </>
  );
}
