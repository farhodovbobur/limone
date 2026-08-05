import { Outlet, useLocation } from 'react-router';
import { IdleWarning } from '../features/auth/components/IdleWarning';
import { useSessionKeepAlive } from '../features/auth/hooks/useSessionKeepAlive';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function DashboardLayout() {
  const location = useLocation();
  const { warnUntil, staySignedIn, signOutNow } = useSessionKeepAlive();

  return (
    <div className="min-h-screen">
      <Sidebar />
      {warnUntil !== null && (
        <IdleWarning
          until={warnUntil}
          onStay={staySignedIn}
          onSignOut={signOutNow}
        />
      )}
      <div className="flex min-h-screen flex-col overflow-clip pt-16 pl-62">
        <Topbar />
        <div key={location.pathname} className="page-enter flex-1 p-7">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
