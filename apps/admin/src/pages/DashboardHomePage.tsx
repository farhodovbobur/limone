import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../features/auth/store/authStore';
import { Breadcrumbs } from '../layouts/Breadcrumbs';

export function DashboardHomePage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  return (
    <div className="mx-auto max-w-265">
      <Breadcrumbs className="mb-3" />
      <h2 className="m-0 text-xl font-medium">
        {t('dashboard.greeting', { name: user?.firstName ?? '' })}
      </h2>
    </div>
  );
}
