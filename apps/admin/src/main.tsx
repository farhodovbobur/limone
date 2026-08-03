import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/cormorant-garamond/600.css';
import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { Providers } from './app/providers';
import { AppRoutes } from './app/router';
import './index.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <StrictMode>
    <Providers>
      <AppRoutes />
    </Providers>
  </StrictMode>,
);
