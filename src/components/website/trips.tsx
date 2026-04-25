import Link from "next/link";
import type { SiteConfig } from "@/types/website-template";
import { PH } from "./image-components";

type TripsProps = SiteConfig["tours"];

export function Trips({
  eyebrow,
  titleHtml,
  kicker,
  ctaLabel,
  ctaHref,
  items,
  images,
}: TripsProps) {
  const featured = items.slice(0, 6);
  return (
    <section className="tours-section reveal" id="trips">
      <div className="container">
        <div className="section-head">
          <div>
            <div className="eyebrow">{eyebrow}</div>
            <h2
              className="section-title"
              dangerouslySetInnerHTML={{ __html: titleHtml }}
            />
          </div>
          <div className="section-kicker">{kicker}</div>
        </div>
        <div className="tours-grid">
          {featured.map((t) => (
            <Link className="tour-card" key={t.slug} href={`/tours#${t.slug}`}>
              <div className="tour-card-img-wrap">
                <PH
                  src={images[t.slug]}
                  label={t.dest.toLowerCase()}
                  coord={t.coord.split(" ")[0]}
                />
                {t.price !== "On Request" && (
                  <div className="price-tag">From {t.price}</div>
                )}
                <div className="ribbon">
                  <span>
                    {t.days} · {t.group} travellers
                  </span>
                  <span className="booking">Booking open</span>
                </div>
              </div>
              <div className="tour-card-meta">
                <div className="tour-card-tags">
                  {t.tags.map((tg, j) => (
                    <span className={`tag ${j === 0 ? t.tagClass : ""}`} key={j}>
                      {tg}
                    </span>
                  ))}
                </div>
                <span className="mono">{t.code}</span>
              </div>
              <h3 className="tour-card-title">
                {t.dest.includes(" & ") ? (
                  <>
                    {t.dest.split(" & ")[0]} <em>& {t.dest.split(" & ")[1]}</em>
                  </>
                ) : (
                  <em>{t.dest}</em>
                )}
              </h3>
              <p className="tour-card-tagline">{t.tagline}</p>
              <div className="tour-card-foot">
                <span className="meta">Season · {t.season}</span>
                <span className="price">
                  {t.price !== "On Request" ? (
                    <>
                      <span className="from">From</span>
                      {t.price}
                    </>
                  ) : (
                    <span
                      style={{
                        fontFamily: "var(--f-mono)",
                        fontSize: 12,
                        letterSpacing: "0.08em",
                      }}
                    >
                      ENQUIRE
                    </span>
                  )}
                </span>
              </div>
            </Link>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 60 }}>
          <Link className="btn btn-ghost" href={ctaHref}>
            {ctaLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
