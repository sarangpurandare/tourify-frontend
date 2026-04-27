'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const TABS = [
  { href: '/website', label: 'Templates' },
  { href: '/website/customize', label: 'Customise' },
  { href: '/website/seo', label: 'SEO' },
  { href: '/website/domain', label: 'Domain' },
];

export default function WebsiteLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="crm-stack" style={{ gap: 0 }}>
      <div style={{ padding: '0 32px', borderBottom: '1px solid var(--crm-hairline)' }}>
        <div className="crm-tabs">
          {TABS.map((t) => {
            const isActive = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`crm-tab${isActive ? ' active' : ''}`}
                style={{ textDecoration: 'none' }}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>
      {children}
    </div>
  );
}
