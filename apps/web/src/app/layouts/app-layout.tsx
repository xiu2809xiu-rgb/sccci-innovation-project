import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { PermissionDenied } from '@/components/common/permission-denied';

import { useRequiredPermission } from '../route-handle';
import { useSession } from '../session/use-session';
import { AppSidebar } from '../shell/app-sidebar';
import { TopBar } from '../shell/top-bar';
import { RouteFallback } from './route-fallback';

/**
 * The signed-in frame: skip link, sidebar, top bar and one <main> landmark.
 * A page the role may not open shows the permission-denied state instead.
 */
export function AppLayout() {
  const { t } = useTranslation();
  const session = useSession();
  const required = useRequiredPermission();
  const allowed = required === undefined || session.permissions.includes(required);

  return (
    <SidebarProvider>
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {t('shell.skipToContent')}
      </a>
      <AppSidebar />
      <SidebarInset>
        <TopBar />
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-(--content-max-width) flex-1 px-4 py-6 outline-none md:px-8 md:py-8"
        >
          <Suspense fallback={<RouteFallback />}>
            {allowed ? <Outlet /> : <PermissionDenied role={session.role} />}
          </Suspense>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
