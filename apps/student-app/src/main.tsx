/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-11-09
 * Scope: Optional browser error, network and WebSocket diagnostics without user content.
 * Author review: <to be completed by yanhwee>
 */
// AI-generated (edited by yanhwee)
import { startBrowserTelemetry } from '@campus-errand/browser-observability';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

startBrowserTelemetry('student-app', import.meta.env.VITE_OBSERVABILITY_ENABLED === 'true');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
