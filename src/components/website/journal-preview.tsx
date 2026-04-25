import { JOURNAL, IMG } from "@/lib/website-data";
import { PH } from "./image-components";

export function JournalPreview() {
  return (
    <section className="journal-preview reveal">
      <div className="container">
        <div className="section-head">
          <div>
            <div className="eyebrow">From the journal</div>
            <h2 className="section-title">Long reads,<br/><em>slower journeys.</em></h2>
          </div>
          <span className="btn-text">Read the journal <span className="arrow">→</span></span>
        </div>
        <div className="journal-grid">
          <div className="journal-card featured">
            <div className="img"><PH src={IMG.scotland} label={JOURNAL[0].title.toLowerCase().slice(0, 40)} /></div>
            <div className="journal-meta"><span className="tag-pill">{JOURNAL[0].tag}</span> <span>{JOURNAL[0].date}</span> <span>·</span> <span>{JOURNAL[0].read}</span></div>
            <h3 className="journal-title">{JOURNAL[0].title}</h3>
            <p className="journal-excerpt">{JOURNAL[0].excerpt}</p>
          </div>
          {JOURNAL.slice(1, 3).map((j, i) => {
            const imgs = [IMG.morocco, IMG.alaska];
            return (
              <div className="journal-card" key={j.slug}>
                <div className="img"><PH src={imgs[i]} label={j.title.toLowerCase().slice(0, 30)} /></div>
                <div className="journal-meta"><span>{j.tag}</span> <span>·</span> <span>{j.read}</span></div>
                <h3 className="journal-title">{j.title}</h3>
                <p className="journal-excerpt">{j.excerpt}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
