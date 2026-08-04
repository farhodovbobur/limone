import { Navigate, Route, Routes } from 'react-router';
import { RequireAuth } from '../features/auth/components/RequireAuth';
import { RequireRole } from '../features/auth/components/RequireRole';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { ProfilePage } from '../features/profile/pages/ProfilePage';
import { StaffPage } from '../features/users/pages/StaffPage';
import { AuthLayout } from '../layouts/AuthLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { DashboardHomePage } from '../pages/DashboardHomePage';
import { MODULE_ACCESS, type ModuleKey } from '../shared/access';
import { ModulePlaceholder } from '../shared/components/ModulePlaceholder';

const guarded = (key: ModuleKey, element: React.ReactNode) => {
  const allowed = MODULE_ACCESS[key];
  return allowed === 'authenticated' ? (
    element
  ) : (
    <RequireRole roles={allowed}>{element}</RequireRole>
  );
};

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route
        path="/"
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardHomePage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route
          path="change-password"
          element={<Navigate to="/profile?tab=password" replace />}
        />
        <Route path="staff" element={guarded('staff', <StaffPage />)} />
        <Route
          path="orders"
          element={guarded('orders', <ModulePlaceholder navKey="orders" />)}
        />
        <Route
          path="reports"
          element={guarded('reports', <ModulePlaceholder navKey="reports" />)}
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
