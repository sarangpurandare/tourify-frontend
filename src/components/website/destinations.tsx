import { DESTINATIONS, IMG } from "@/lib/website-data";
import { PH } from "./image-components";

const DEST_IMGS: Record<string, string> = {
  "Scotland & Ireland": IMG.scotland,
  "Alaska": IMG.alaska,
  "Balkans": IMG.balkans,
  "Mexico & Cuba": IMG.mexico,
  "Iceland": IMG.iceland,
  "New Zealand": IMG.newzealand,
  "Norway": IMG.norway,
  "Peru & Brazil": IMG.peru,
};

export function Destinations() {
  return (
    <section className="destinations reveal">
      <div className="container">
        <div className="section-head">
          <div>
            <div className="eyebrow">Where we go</div>
            <h2 className="section-title">A <em>well-loved</em><br/>map.</h2>
          </div>
          <div className="section-kicker">
            We travel to destinations we know and love. Each journey is designed to go beyond the surface and into the heart of a place.
          </div>
        </div>
        <div className="dest-grid">
          {DESTINATIONS.map(d => (
            <div className="dest-card" key={d.name}>
              <PH src={DEST_IMGS[d.name] || IMG.scotland} label={`${d.name.toLowerCase()} · ${d.coords}`} coord={d.coord.split(" ")[0]} />
              <div className="label">{d.name}<div className="label-meta">{d.country}</div></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
