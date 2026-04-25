import { IMG } from "@/lib/website-data";
import { Polaroid } from "./image-components";

export function Who() {
  const items = [
    { tone: "", h: "You want experiences, not just sightseeing.", p: "Hidden trails, local stories, and moments that no guidebook covers. Travel that goes deeper than the surface." },
    { tone: "alt", h: "You want company, not crowds.", p: "A small group of like-minded travellers, real conversations, and connections that last beyond the trip." },
    { tone: "three", h: "You want it all taken care of.", p: "Visa support, dietary planning, on-ground logistics — everything handled. Your only job is to enjoy the journey." },
  ];
  return (
    <section className="who reveal">
      <div className="container">
        <div className="who-grid">
          <div className="who-img">
            <div className="a"><Polaroid src={IMG.table} label="group dinner" caption="day 6" coord="" /></div>
            <div className="b"><Polaroid src={IMG.weaver} label="local craft" caption="workshop" coord="" /></div>
            <div className="c"><Polaroid src={IMG.tea} label="chai stop" caption="local village" coord="" /></div>
          </div>
          <div>
            <div className="eyebrow">Who we&apos;re for</div>
            <h2 className="section-title">If you&apos;re <em>curious</em><br/>and love to travel,<br/>we built this for you.</h2>
            <p style={{ marginTop: 28, marginBottom: 32, color: "var(--ink-2)", fontSize: 17, lineHeight: 1.65, maxWidth: 520 }}>
              Our travellers are curious, well-travelled people who are done with cookie-cutter group tours and want something more meaningful. People who&apos;d rather know a place than just visit it.
            </p>
            <div className="who-list">
              {items.map((it, i) => (
                <div className={`who-item ${it.tone}`} key={i}>
                  <div className="badge">{["i","ii","iii"][i]}</div>
                  <div>
                    <h4>{it.h}</h4>
                    <p>{it.p}</p>
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
