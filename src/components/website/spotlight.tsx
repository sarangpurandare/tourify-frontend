import Link from "next/link";
import { TOURS, IMG } from "@/lib/website-data";
import { Polaroid } from "./image-components";

export function Spotlight() {
  const t = TOURS[0]; // Scotland & Ireland - featured tour from live site
  return (
    <section className="spotlight reveal">
      <div className="container">
        <div className="spotlight-grid">
          <div className="spotlight-img-wrap">
            <Polaroid className="main" src={IMG.scotland} label="scottish highlands" caption="edinburgh" coord="57.2°N" />
            <Polaroid className="small" src={IMG.scotland2} label="isle of skye" caption="hebrides" coord="" />
            <div className="postmark" style={{ top: 30, right: 30 }}>
              <div>
                Featured
                <div className="postmark-line">Scotland</div>
                Booking open
              </div>
            </div>
          </div>
          <div className="spotlight-content">
            <div className="eyebrow">Featured Trip</div>
            <h2 className="section-title">Scotland<br/><em>& Ireland.</em></h2>
            <p className="spotlight-desc">
              Sixteen days through the Scottish Highlands, Irish countryside, and centuries of Celtic heritage. Small group of just 10 travellers, immersive local experiences, and landscapes that take your breath away.
            </p>
            <div className="spotlight-info">
              <div className="spotlight-info-cell">
                <div className="l">Duration</div>
                <div className="v">16 Days<br/>15 Nights</div>
              </div>
              <div className="spotlight-info-cell">
                <div className="l">Group</div>
                <div className="v">Max 10<br/>travellers</div>
              </div>
              <div className="spotlight-info-cell">
                <div className="l">Season</div>
                <div className="v">2026<br/><span className="mono">departures</span></div>
              </div>
            </div>
            <ul className="spotlight-includes">
              <li><span className="check">✓</span> All accommodation in handpicked heritage stays</li>
              <li><span className="check">✓</span> Expert local guides throughout</li>
              <li><span className="check">✓</span> All meals and local experiences</li>
              <li><span className="check">✓</span> Visa support and travel insurance guidance</li>
              <li><span className="check">✓</span> Airport transfers and local transport</li>
              <li><span className="check">✓</span> Small group, maximum 10 travellers</li>
            </ul>
            <div className="hero-actions">
              <Link className="btn btn-terra" href="/contact">Enquire about this trip →</Link>
              <a className="btn btn-ghost" href="https://wa.me/919600587100" target="_blank" rel="noopener noreferrer">WhatsApp Us</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
