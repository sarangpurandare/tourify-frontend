import type { SiteConfig } from "@/types/website-template";

interface StatsRibbonProps {
  stats: SiteConfig["stats"];
}

export function StatsRibbon({ stats }: StatsRibbonProps) {
  return (
    <section className="stats-ribbon">
      <div className="container">
        <div className="stats-ribbon-grid">
          {stats.map((s, i) => (
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
