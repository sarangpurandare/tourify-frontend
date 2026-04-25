import type { SiteConfig } from "@/types/website-template";

type PhilosophyProps = SiteConfig["philosophy"];

export function Philosophy({ eyebrow, introHtml, items }: PhilosophyProps) {
  return (
    <section className="philosophy reveal">
      <div className="container">
        <div className="philosophy-grid">
          <div>
            <div className="eyebrow">{eyebrow}</div>
            <p
              className="philosophy-text"
              style={{ marginTop: 24 }}
              dangerouslySetInnerHTML={{ __html: introHtml }}
            />
          </div>
          <div className="philosophy-cards">
            {items.map((it) => (
              <div className="philosophy-card" key={it.num}>
                <div className="head">
                  <span className="num">{it.num}</span>
                  <h4>{it.title}</h4>
                </div>
                <p>{it.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
