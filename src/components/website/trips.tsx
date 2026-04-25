import Link from "next/link";
import { TOURS, TOUR_IMG } from "@/lib/website-data";
import { PH } from "./image-components";

export function Trips() {
  const featured = TOURS.slice(0, 6);
  return (
    <section className="tours-section reveal" id="trips">
      <div className="container">
        <div className="section-head">
          <div>
            <div className="eyebrow">2026–27 Departures</div>
            <h2 className="section-title">Upcoming <em>trips.</em></h2>
          </div>
          <div className="section-kicker">
            Each trip is thoughtfully crafted, with small groups of like-minded travellers. No templates, no compromises — just unforgettable experiences.
          </div>
        </div>
        <div className="tours-grid">
          {featured.map((t, i) => (
            <Link className="tour-card" key={t.slug} href={`/tours#${t.slug}`}>
              <div className="tour-card-img-wrap">
                <PH src={TOUR_IMG[t.slug]} label={`${t.dest.toLowerCase()}`} coord={t.coord.split(" ")[0]} />
                {t.price !== "On Request" && <div className="price-tag">From {t.price}</div>}
                <div className="ribbon">
                  <span>{t.days} · {t.group} travellers</span>
                  <span className="booking">Booking open</span>
                </div>
              </div>
              <div className="tour-card-meta">
                <div className="tour-card-tags">
                  {t.tags.map((tg, j) => (
                    <span className={`tag ${j === 0 ? t.tagClass : ""}`} key={j}>{tg}</span>
                  ))}
                </div>
                <span className="mono">{t.code}</span>
              </div>
              <h3 className="tour-card-title">
                {t.dest.includes(" & ") ? <>{t.dest.split(" & ")[0]} <em>& {t.dest.split(" & ")[1]}</em></> : <em>{t.dest}</em>}
              </h3>
              <p className="tour-card-tagline">{t.tagline}</p>
              <div className="tour-card-foot">
                <span className="meta">Season · {t.season}</span>
                <span className="price">{t.price !== "On Request" ? <><span className="from">From</span>{t.price}</> : <span style={{ fontFamily: "var(--f-mono)", fontSize: 12, letterSpacing: "0.08em" }}>ENQUIRE</span>}</span>
              </div>
            </Link>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 60 }}>
          <Link className="btn btn-ghost" href="/tours">See all trips →</Link>
        </div>
      </div>
    </section>
  );
}
