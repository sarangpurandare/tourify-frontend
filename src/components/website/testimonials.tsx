import type { SiteConfig } from "@/types/website-template";

type TestimonialsProps = SiteConfig["testimonials"];

export function Testimonials({
  eyebrow,
  titleHtml,
  reviewSource,
  items,
}: TestimonialsProps) {
  return (
    <section className="testimonials reveal">
      <div className="container">
        <div className="testim-head">
          <div className="eyebrow">{eyebrow}</div>
          <h2
            className="section-title"
            dangerouslySetInnerHTML={{ __html: titleHtml }}
          />
          <div>
            <span className="stars">★★★★★</span>
            <span className="stars-meta">{reviewSource}</span>
          </div>
        </div>
        <div className="testim-masonry">
          {items.map((t, i) => (
            <div key={i} className={`testim-item ${t.color || ""}`}>
              <div className="testim-stars">★★★★★</div>
              <p className="testim-quote">{t.quote}</p>
              <div className="testim-byline">
                <div className="testim-avatar">
                  {t.name
                    .split(" ")
                    .map((s) => s[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div>
                  <span className="testim-name">{t.name}</span>
                  <span className="testim-meta">{t.trip}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
