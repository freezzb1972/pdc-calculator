import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import AntdLocaleProvider from './components/AntdLocaleProvider';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback={null}>
      <I18nextProvider i18n={i18n}>
        <BrowserRouter>
          <AntdLocaleProvider>
            <App />
          </AntdLocaleProvider>
        </BrowserRouter>
      </I18nextProvider>
    </Suspense>
  </React.StrictMode>,
);
