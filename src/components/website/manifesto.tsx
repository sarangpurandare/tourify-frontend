export function Manifesto() {
  return (
    <section className="manifesto reveal">
      <div className="container manifesto-wrap">
        <div className="eyebrow">A small honest note</div>
        <p className="manifesto-text">
          We don&apos;t do <span className="strike">cookie-cutter itineraries</span>. We do thoughtfully crafted journeys featuring hidden trails and local experiences. We don&apos;t do <span className="strike">rushed photo stops.</span> We do small groups, real connections, and <em>afternoons nobody is in a hurry</em> to end.
        </p>
        <div className="manifesto-sig">
          <div className="hand" style={{ fontSize: 38, fontFamily: "var(--f-hand)", fontWeight: 500, color: "var(--terra)" }}>— Asha Bhat</div>
          <div className="manifesto-sig">
            <div className="role" style={{ fontFamily: "var(--f-mono)", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-3)", textAlign: "left" }}>Founder, Boarding Pass Tours<br/>10 years · 20+ countries · 300+ friends</div>
          </div>
        </div>
      </div>
    </section>
  );
}
