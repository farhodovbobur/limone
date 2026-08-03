import { StyleProvider } from '@ant-design/cssinjs';
import { QueryClientProvider } from '@tanstack/react-query';
import { App as AntApp, ConfigProvider } from 'antd';
import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from '../shared/components/ErrorBoundary';
import { queryClient } from './queryClient';
import { theme } from './theme';
import '../shared/i18n';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StyleProvider layer>
      <ConfigProvider theme={theme}>
        <AntApp>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <BrowserRouter>{children}</BrowserRouter>
            </QueryClientProvider>
          </ErrorBoundary>
        </AntApp>
      </ConfigProvider>
    </StyleProvider>
  );
}
