import type { SiteConfig } from "@/types/website-template";
import { PH } from "./image-components";

type JournalProps = SiteConfig["journal"];

export function JournalPreview({ eyebrow, titleHtml, ctaLabel, entries }: JournalProps) {
  return (
    <section className="journal-preview reveal">
      <div className="container">
        <div className="section-head">
          <div>
            <div className="eyebrow">{eyebrow}</div>
            <h2
              className="section-title"
              dangerouslySetInnerHTML={{ __html: titleHtml }}
            />
          </div>
          <span className="btn-text">
            {ctaLabel} <span className="arrow">→</span>
          </span>
        </div>
        <div className="journal-grid">
          {entries[0] && (
            <div className="journal-card featured">
              <div className="img">
                <PH
                  src={entries[0].image}
                  label={entries[0].title.toLowerCase().slice(0, 40)}
                />
              </div>
              <div className="journal-meta">
                <span className="tag-pill">{entries[0].tag}</span>{" "}
                <span>{entries[0].date}</span> <span>·</span>{" "}
                <span>{entries[0].read}</span>
              </div>
              <h3 className="journal-title">{entries[0].title}</h3>
              <p className="journal-excerpt">{entries[0].excerpt}</p>
            </div>
          )}
          {entries.slice(1, 3).map((j) => (
            <div className="journal-card" key={j.slug}>
              <div className="img">
                <PH src={j.image} label={j.title.toLowerCase().slice(0, 30)} />
              </div>
              <div className="journal-meta">
                <span>{j.tag}</span> <span>·</span> <span>{j.read}</span>
              </div>
              <h3 className="journal-title">{j.title}</h3>
              <p className="journal-excerpt">{j.excerpt}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
