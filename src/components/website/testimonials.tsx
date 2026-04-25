import { TESTIMONIALS } from "@/lib/website-data";

export function Testimonials() {
  return (
    <section className="testimonials reveal">
      <div className="container">
        <div className="testim-head">
          <div className="eyebrow">What our travellers say</div>
          <h2 className="section-title">In their <em>own words.</em></h2>
          <div>
            <span className="stars">★★★★★</span>
            <span className="stars-meta">5/5 · Verified reviews · Google Reviews</span>
          </div>
        </div>
        <div className="testim-masonry">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className={`testim-item ${t.color || ""}`}>
              <div className="testim-stars">★★★★★</div>
              <p className="testim-quote">{t.quote}</p>
              <div className="testim-byline">
                <div className="testim-avatar">{t.name.split(" ").map(s=>s[0]).slice(0,2).join("")}</div>
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
