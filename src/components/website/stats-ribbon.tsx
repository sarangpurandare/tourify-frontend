import { STATS } from "@/lib/website-data";

export function StatsRibbon() {
  return (
    <section className="stats-ribbon">
      <div className="container">
        <div className="stats-ribbon-grid">
          {STATS.map((s, i) => (
            <div key={i}>
              <div className="num">{s.num}</div>
              <div className="label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
