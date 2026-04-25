import type { SiteConfig } from "@/types/website-template";
import { Polaroid } from "./image-components";

interface HeroProps {
  hero: SiteConfig["hero"];
  stats: SiteConfig["stats"];
}

export function Hero({ hero, stats }: HeroProps) {
  return (
    <section className="hero container-wide" style={{ paddingTop: 80 }}>
      <div className="hero-grid">
        <div>
          <div className="hero-eyebrow-row">
            <span className="hero-eyebrow-dot" />
            <span className="eyebrow">{hero.eyebrow}</span>
          </div>
          <h1
            className="hero-title"
            dangerouslySetInnerHTML={{ __html: hero.titleHtml }}
          />
          <p className="hero-sub">{hero.subtitle}</p>
          <div className="hero-actions">
            <a className="btn btn-primary" href={hero.primaryCta.href}>
              {hero.primaryCta.label}
            </a>
            <a className="btn btn-ghost" href={hero.secondaryCta.href}>
              {hero.secondaryCta.label}
            </a>
            <span
              className="hand-note"
              style={{
                fontFamily: "var(--f-hand)",
                fontSize: 22,
                color: "var(--terra)",
                marginLeft: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {hero.handNote}
            </span>
          </div>
        </div>
        <div className="hero-stack">
          {hero.images.map((img, i) => (
            <div key={i} className={`hero-card-${i + 1}`}>
              <Polaroid
                src={img.src}
                label={img.label}
                caption={img.caption}
                coord={img.coord}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="hero-strip">
        {stats.map((s, i) => (
          <div className="hero-strip-cell" key={i}>
            <div className="num">{s.num}</div>
            <div className="label">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
