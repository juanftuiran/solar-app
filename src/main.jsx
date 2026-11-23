import React from 'react';
import { createRoot } from 'react-dom/client';
import './tokens.css';
import './base.css';
import './app.css';
import './refine.css';
import './styles/mobile.css';
import App from './App.jsx';

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
