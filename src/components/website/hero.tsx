import { STATS, IMG } from "@/lib/website-data";
import { Polaroid } from "./image-components";

export function Hero() {
  return (
    <section className="hero container-wide" style={{ paddingTop: 80 }}>
      <div className="hero-grid">
        <div>
          <div className="hero-eyebrow-row">
            <span className="hero-eyebrow-dot" />
            <span className="eyebrow">Small groups, big curiosity — where every stamp tells a story</span>
          </div>
          <h1 className="hero-title">
            Small groups.<br/>
            <em>Big adventures.</em>
          </h1>
          <p className="hero-sub">
            We curate unforgettable travel experiences with small groups and expert guides. Travel with a handpicked group of like-minded explorers — never more than 15 to 20 people.
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="/tours">See this year&apos;s trips →</a>
            <a className="btn btn-ghost" href="/contact">Talk to Us</a>
            <span className="hand-note" style={{ fontFamily: "var(--f-hand)", fontSize: 22, color: "var(--terra)", marginLeft: 12, display: "flex", alignItems: "center", gap: 8 }}>↗ no chatbots, we promise</span>
          </div>
        </div>
        <div className="hero-stack">
          <div className="hero-card-1">
            <Polaroid src={IMG.scotland} label="scottish highlands" caption="edinburgh, 2026" coord="57.2°N" />
          </div>
          <div className="hero-card-2">
            <Polaroid src={IMG.morocco} label="atlas mountains" caption="marrakech" coord="31.6°N" />
          </div>
          <div className="hero-card-3">
            <Polaroid src={IMG.iceland} label="golden circle" caption="iceland" coord="64.1°N" />
          </div>
        </div>
      </div>
      <div className="hero-strip">
        {STATS.map((s, i) => (
          <div className="hero-strip-cell" key={i}>
            <div className="num">{s.num}</div>
            <div className="label">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
