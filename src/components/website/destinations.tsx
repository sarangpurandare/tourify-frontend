import type { SiteConfig } from "@/types/website-template";
import { PH } from "./image-components";

type DestinationsProps = SiteConfig["destinations"];

export function Destinations({ eyebrow, titleHtml, kicker, items }: DestinationsProps) {
  return (
    <section className="destinations reveal">
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
        <div className="dest-grid">
          {items.map((d) => (
            <div className="dest-card" key={d.name}>
              <PH
                src={d.image}
                label={`${d.name.toLowerCase()} · ${d.coords}`}
                coord={d.coord.split(" ")[0]}
              />
              <div className="label">
                {d.name}
                <div className="label-meta">{d.country}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
