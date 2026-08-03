import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icons } from '../shared/icons';
import { findActiveNav } from './nav';

interface Crumb {
  labelKey: string;
  path?: string;
}

function crumbsFor(pathname: string): Crumb[] {
  if (pathname === '/') return [{ labelKey: 'nav.dashboard' }];
  if (pathname.startsWith('/change-password'))
    return [{ labelKey: 'cp.title' }];
  const active = findActiveNav(pathname);
  if (!active) return [];
  // Sub-path after the module root decides the action crumb:
  // '' → List, '/create' → Create, '/:id/edit' → Edit, '/:id' → View.
  const rest = pathname.slice(active.path.length).replace(/\/$/, '');
  const action = rest.endsWith('/create')
    ? 'create'
    : rest.endsWith('/edit')
      ? 'edit'
      : rest
        ? 'view'
        : 'list';
  return [
    { labelKey: `nav.${active.key}`, path: active.path },
    { labelKey: `crumb.${action}` },
  ];
}

export function Breadcrumbs({ className }: { className?: string }) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const crumbs = crumbsFor(location.pathname);

  const canGoBack =
    ((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0;
  const upPath = crumbs.find((c) => c.path)?.path;
  const backDisabled = !canGoBack && !upPath && location.pathname === '/';

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <button
        type="button"
        aria-label={t('shell.back')}
        title={t('shell.back')}
        disabled={backDisabled}
        onClick={() =>
          canGoBack ? void navigate(-1) : void navigate(upPath ?? '/')
        }
        className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-md border border-line-strong text-ink-secondary u-focus transition-colors enabled:hover:bg-olive-100 enabled:hover:text-olive-800 enabled:active:bg-olive-200 disabled:opacity-35"
      >
        <Icons.arrowLeft size={16} />
      </button>
      <span className="h-5 w-px flex-none bg-line-strong/60" aria-hidden />
      <nav aria-label={t('shell.breadcrumb')}>
        <ol className="m-0 flex list-none items-center gap-1.5 p-0 text-[13px]">
          {crumbs.map((c, i) =>
            i === crumbs.length - 1 ? (
              <li
                key={c.labelKey}
                aria-current="page"
                className="font-medium text-ink"
              >
                {t(c.labelKey)}
              </li>
            ) : (
              <li key={c.labelKey} className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void navigate(c.path ?? '/')}
                  className="rounded text-ink-tertiary u-focus transition-colors hover:text-olive-700"
                >
                  {t(c.labelKey)}
                </button>
                <Icons.caretRight
                  size={12}
                  className="text-ink-tertiary/70"
                  aria-hidden
                />
              </li>
            ),
          )}
        </ol>
      </nav>
    </div>
  );
}
