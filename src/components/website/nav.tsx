"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SiteConfig } from "@/types/website-template";

interface NavProps {
  brand: SiteConfig["brand"];
  links: SiteConfig["nav"]["links"];
  cta: SiteConfig["nav"]["cta"];
}

export function Nav({ brand, links, cta }: NavProps) {
  const pathname = usePathname();

  return (
    <nav className="nav">
      <Link className="nav-brand" href="/">
        <div className="nav-brand-mark">{brand.logoInitial}</div>
        <div>
          <div className="nav-brand-name">{brand.name}</div>
          <div className="nav-brand-sub">{brand.subtitle}</div>
        </div>
      </Link>
      <div className="nav-links">
        {links.map((l) => (
          <Link
            key={l.href}
            className={`nav-link ${pathname === l.href ? "active" : ""}`}
            href={l.href}
          >
            {l.label}
          </Link>
        ))}
      </div>
      <div className="nav-cta">
        <span className="nav-phone">{brand.phone}</span>
        <Link className="btn btn-primary" href={cta.href}>
          {cta.label}
        </Link>
      </div>
    </nav>
  );
}
