import Link from "next/link";
import type { SiteConfig } from "@/types/website-template";

interface FooterProps {
  brand: SiteConfig["brand"];
  footer: SiteConfig["footer"];
}

export function Footer({ brand, footer }: FooterProps) {
  return (
    <footer>
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="mark">{brand.name}</div>
            <p>{footer.description}</p>
          </div>
          {footer.columns.map((col) => (
            <div className="footer-col" key={col.title}>
              <h4>{col.title}</h4>
              <ul>
                {col.items.map((item) => (
                  <li key={item.label}>
                    {item.href ? (
                      <Link href={item.href}>{item.label}</Link>
                    ) : (
                      item.label
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="footer-col footer-contact">
            <h4>Get In Touch</h4>
            <p className="phone">{brand.phone}</p>
            <p>{brand.email}</p>
            <p
              style={{ marginTop: 14, whiteSpace: "pre-line" }}
            >
              {brand.address}
            </p>
          </div>
        </div>
        <div className="footer-bottom">
          <div>{brand.copyright}</div>
          <div className="footer-social">
            {brand.socials.map((s) => (
              <a
                key={s.platform}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {s.platform}
              </a>
            ))}
          </div>
          <div>{footer.tagline}</div>
        </div>
      </div>
    </footer>
  );
}
