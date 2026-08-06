import { Button } from 'antd';
import { Icons } from '../icons';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    return this.state.hasError ? <CrashFallback /> : this.props.children;
  }
}

function CrashFallback() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-surface-subtle px-6 text-center">
      <h2 className="m-0 text-[22px] font-medium">{t('shell.crashTitle')}</h2>
      <p className="m-0 max-w-90 text-sm text-ink-secondary">
        {t('users.errBody')}
      </p>
      <Button
        type="primary"
        className="mt-3"
        icon={<Icons.retry size={15} />}
        onClick={() => window.location.reload()}
      >
        {t('shell.reload')}
      </Button>
    </div>
  );
}
