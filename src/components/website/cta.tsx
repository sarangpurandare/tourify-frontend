import Link from "next/link";
import type { SiteConfig } from "@/types/website-template";

type CTAProps = SiteConfig["cta"];

export function CTA({
  eyebrow,
  titleHtml,
  subtitle,
  primaryCta,
  secondaryCta,
  finePrint,
}: CTAProps) {
  return (
    <section className="cta">
      <div className="container cta-inner">
        <div className="eyebrow">{eyebrow}</div>
        <h2
          className="cta-title"
          dangerouslySetInnerHTML={{ __html: titleHtml }}
        />
        <p className="cta-sub">{subtitle}</p>
        <div className="cta-actions">
          <Link className="btn btn-primary" href={primaryCta.href}>
            {primaryCta.label}
          </Link>
          <a
            className="btn btn-ghost"
            href={secondaryCta.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {secondaryCta.label}
          </a>
        </div>
        <div className="cta-fine">{finePrint}</div>
      </div>
    </section>
  );
}
