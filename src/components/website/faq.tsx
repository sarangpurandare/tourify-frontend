"use client";

import { useState } from "react";
import Link from "next/link";
import { FAQS } from "@/lib/website-data";

export function FAQ() {
  const [open, setOpen] = useState(0);
  return (
    <section className="faq reveal" id="faq">
      <div className="container">
        <div className="faq-grid">
          <div>
            <div className="eyebrow">Honest answers</div>
            <h2 className="section-title" style={{ marginTop: 16 }}>The questions <em>everyone</em> asks.</h2>
            <p style={{ marginTop: 28, color: "var(--ink-2)", lineHeight: 1.65 }}>
              No marketing-speak. If we don&apos;t have an answer, we&apos;ll say so.
            </p>
            <Link className="btn-text" href="/contact" style={{ marginTop: 24 }}>Ask a different question <span className="arrow">→</span></Link>
          </div>
          <div className="faq-list">
            {FAQS.map((f, i) => (
              <div className={`faq-item ${i === open ? "open" : ""}`} key={i} onClick={() => setOpen(i === open ? -1 : i)}>
                <div className="faq-q">
                  <span>{f.q}</span>
                  <span className="icon">+</span>
                </div>
                <div className="faq-a"><div style={{ paddingTop: 8 }}>{f.a}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
