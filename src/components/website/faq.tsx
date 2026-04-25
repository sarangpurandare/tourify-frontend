"use client";

import { useState } from "react";
import Link from "next/link";
import type { SiteConfig } from "@/types/website-template";

type FAQProps = SiteConfig["faq"];

export function FAQ({
  eyebrow,
  titleHtml,
  subtitle,
  contactLabel,
  contactHref,
  items,
}: FAQProps) {
  const [open, setOpen] = useState(0);
  return (
    <section className="faq reveal" id="faq">
      <div className="container">
        <div className="faq-grid">
          <div>
            <div className="eyebrow">{eyebrow}</div>
            <h2
              className="section-title"
              style={{ marginTop: 16 }}
              dangerouslySetInnerHTML={{ __html: titleHtml }}
            />
            <p style={{ marginTop: 28, color: "var(--ink-2)", lineHeight: 1.65 }}>
              {subtitle}
            </p>
            <Link
              className="btn-text"
              href={contactHref}
              style={{ marginTop: 24 }}
            >
              {contactLabel} <span className="arrow">→</span>
            </Link>
          </div>
          <div className="faq-list">
            {items.map((f, i) => (
              <div
                className={`faq-item ${i === open ? "open" : ""}`}
                key={i}
                onClick={() => setOpen(i === open ? -1 : i)}
              >
                <div className="faq-q">
                  <span>{f.q}</span>
                  <span className="icon">+</span>
                </div>
                <div className="faq-a">
                  <div style={{ paddingTop: 8 }}>{f.a}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
