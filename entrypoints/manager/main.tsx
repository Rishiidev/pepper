import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { DesignPage } from '../../src/components/ui/DesignPage';
import '../../src/styles/globals.css';
import { initTheme } from '../../src/core/utils/theme';

initTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {new URLSearchParams(window.location.search).get('view') === 'design' ? <DesignPage /> : <App />}
  </React.StrictMode>
);
