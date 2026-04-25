import Link from "next/link";
import type { SiteConfig } from "@/types/website-template";
import { Polaroid } from "./image-components";

type SpotlightProps = SiteConfig["spotlight"];

export function Spotlight({
  eyebrow,
  titleHtml,
  description,
  images,
  postmark,
  infoCells,
  includes,
  primaryCta,
  secondaryCta,
}: SpotlightProps) {
  return (
    <section className="spotlight reveal">
      <div className="container">
        <div className="spotlight-grid">
          <div className="spotlight-img-wrap">
            {images[0] && (
              <Polaroid
                className="main"
                src={images[0].src}
                label={images[0].label}
                caption={images[0].caption}
                coord={images[0].coord}
              />
            )}
            {images[1] && (
              <Polaroid
                className="small"
                src={images[1].src}
                label={images[1].label}
                caption={images[1].caption}
                coord={images[1].coord}
              />
            )}
            <div className="postmark" style={{ top: 30, right: 30 }}>
              <div>
                {postmark.line1}
                <div className="postmark-line">{postmark.line2}</div>
                {postmark.line3}
              </div>
            </div>
          </div>
          <div className="spotlight-content">
            <div className="eyebrow">{eyebrow}</div>
            <h2
              className="section-title"
              dangerouslySetInnerHTML={{ __html: titleHtml }}
            />
            <p className="spotlight-desc">{description}</p>
            <div className="spotlight-info">
              {infoCells.map((c, i) => (
                <div className="spotlight-info-cell" key={i}>
                  <div className="l">{c.label}</div>
                  <div className="v">
                    {c.value}
                    <br />
                    <span className="mono">{c.valueSub}</span>
                  </div>
                </div>
              ))}
            </div>
            <ul className="spotlight-includes">
              {includes.map((item, i) => (
                <li key={i}>
                  <span className="check">✓</span> {item}
                </li>
              ))}
            </ul>
            <div className="hero-actions">
              <Link className="btn btn-terra" href={primaryCta.href}>
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
          </div>
        </div>
      </div>
    </section>
  );
}
