import type { SiteConfig } from "@/types/website-template";

type ManifestoProps = SiteConfig["manifesto"];

export function Manifesto({ eyebrow, textHtml, founder, founderRole }: ManifestoProps) {
  return (
    <section className="manifesto reveal">
      <div className="container manifesto-wrap">
        <div className="eyebrow">{eyebrow}</div>
        <p
          className="manifesto-text"
          dangerouslySetInnerHTML={{ __html: textHtml }}
        />
        <div className="manifesto-sig">
          <div
            className="hand"
            style={{
              fontSize: 38,
              fontFamily: "var(--f-hand)",
              fontWeight: 500,
              color: "var(--terra)",
            }}
          >
            {founder}
          </div>
          <div className="manifesto-sig">
            <div
              className="role"
              style={{
                fontFamily: "var(--f-mono)",
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--ink-3)",
                textAlign: "left",
                whiteSpace: "pre-line",
              }}
            >
              {founderRole}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
