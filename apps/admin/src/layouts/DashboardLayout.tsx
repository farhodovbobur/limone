import { useTranslation } from 'react-i18next';
import { Outlet, useLocation } from 'react-router';
import { IdleWarning } from '../features/auth/components/IdleWarning';
import { useSessionKeepAlive } from '../features/auth/hooks/useSessionKeepAlive';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useNavDrawer } from './useNavDrawer';

export function DashboardLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const { warnUntil, staySignedIn, signOutNow } = useSessionKeepAlive();
  const { collapsed, drawerOpen, close, panelRef } = useNavDrawer();

  return (
    <div className="min-h-screen">
      <Sidebar panelRef={panelRef} />
      <button
        type="button"
        tabIndex={-1}
        aria-label={t('shell.closeNav')}
        onClick={close}
        className={`fixed inset-0 z-25 bg-ink/40 transition-opacity ease-out lg:hidden ${
          collapsed
            ? 'pointer-events-none opacity-0 duration-150'
            : 'opacity-100 duration-200'
        }`}
      />

      {warnUntil !== null && (
        <IdleWarning
          until={warnUntil}
          onStay={staySignedIn}
          onSignOut={signOutNow}
        />
      )}

      <div
        inert={drawerOpen}
        className={`shell-motion flex min-h-screen flex-col overflow-clip pt-16 pl-0 ${
          collapsed ? '' : 'lg:pl-62'
        }`}
      >
        <Topbar />
        <div key={location.pathname} className="page-enter flex-1 p-4 lg:p-7">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
