import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function DashboardLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="flex min-h-screen flex-col overflow-clip pt-16 pl-62">
        <Topbar />
        <div key={location.pathname} className="page-enter flex-1 p-7">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
