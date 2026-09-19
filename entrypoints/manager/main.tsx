import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '../../src/styles/globals.css';
import { initTheme } from '../../src/core/utils/theme';

initTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
