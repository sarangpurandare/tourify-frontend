import Link from "next/link";

export function CTA() {
  return (
    <section className="cta">
      <div className="container cta-inner">
        <div className="eyebrow">Start your journey</div>
        <h2 className="cta-title">Where <em>should you</em><br/>go next?</h2>
        <p className="cta-sub">A conversation with us, free, no pressure. We&apos;ll talk about what you&apos;re looking for, what kind of experiences excite you — and which trip might be the right next one.</p>
        <div className="cta-actions">
          <Link className="btn btn-primary" href="/contact">Get in touch →</Link>
          <a className="btn btn-ghost" href="https://wa.me/919600587100" target="_blank" rel="noopener noreferrer">WhatsApp us</a>
        </div>
        <div className="cta-fine">No spam. Reply within 24 hrs.</div>
      </div>
    </section>
  );
}
