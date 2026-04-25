"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Nav() {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;

  return (
    <nav className="nav">
      <Link className="nav-brand" href="/">
        <div className="nav-brand-mark">b</div>
        <div>
          <div className="nav-brand-name">Boarding Pass</div>
          <div className="nav-brand-sub">Small-group travel · Mumbai</div>
        </div>
      </Link>
      <div className="nav-links">
        <Link className={`nav-link ${isActive("/") ? "active" : ""}`} href="/">Home</Link>
        <Link className={`nav-link ${isActive("/tours") ? "active" : ""}`} href="/tours">Trips</Link>
        <Link className={`nav-link ${isActive("/about") ? "active" : ""}`} href="/about">About</Link>
        <Link className={`nav-link ${isActive("/contact") ? "active" : ""}`} href="/contact">Contact</Link>
      </div>
      <div className="nav-cta">
        <span className="nav-phone">+91 96005 87100</span>
        <Link className="btn btn-primary" href="/contact">Plan a trip</Link>
      </div>
    </nav>
  );
}
