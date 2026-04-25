import type { SiteConfig } from "@/types/website-template";
import { Polaroid } from "./image-components";

type WhoProps = SiteConfig["who"];

export function Who({ eyebrow, titleHtml, subtitle, images, items }: WhoProps) {
  return (
    <section className="who reveal">
      <div className="container">
        <div className="who-grid">
          <div className="who-img">
            {images.map((img, i) => (
              <div key={i} className={["a", "b", "c"][i]}>
                <Polaroid src={img.src} label={img.label} caption={img.caption} coord="" />
              </div>
            ))}
          </div>
          <div>
            <div className="eyebrow">{eyebrow}</div>
            <h2
              className="section-title"
              dangerouslySetInnerHTML={{ __html: titleHtml }}
            />
            <p
              style={{
                marginTop: 28,
                marginBottom: 32,
                color: "var(--ink-2)",
                fontSize: 17,
                lineHeight: 1.65,
                maxWidth: 520,
              }}
            >
              {subtitle}
            </p>
            <div className="who-list">
              {items.map((it, i) => (
                <div className={`who-item ${it.tone}`} key={i}>
                  <div className="badge">{["i", "ii", "iii"][i]}</div>
                  <div>
                    <h4>{it.heading}</h4>
                    <p>{it.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
