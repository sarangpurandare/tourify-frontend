import { AppShell } from '@/components/layout/app-shell';
import { ImpersonationBanner } from '@/components/ImpersonationBanner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // ImpersonationBanner is sticky/zero-height when inactive (returns null) and
  // a sticky bar when active. Rendering it inside a flex column keeps the
  // existing AppShell height constraints intact while letting the banner sit
  // at the very top of the viewport.
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <ImpersonationBanner />
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <AppShell>{children}</AppShell>
      </div>
    </div>
  );
}
