import './utils/patchPerformance';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { isQuotaExceededError, markCloudQuotaExceeded } from './services/firebaseDb';

// Prevent uncaught browser performance DataCloneErrors or Firebase quota exhaustion errors from breaking UI
window.addEventListener('unhandledrejection', (event) => {
  if (
    event.reason?.name === 'DataCloneError' ||
    String(event.reason).includes('Data cannot be cloned') ||
    String(event.reason).includes("Failed to execute 'measure' on 'Performance'")
  ) {
    event.preventDefault();
    return;
  }
  if (isQuotaExceededError(event.reason)) {
    event.preventDefault();
    markCloudQuotaExceeded();
    console.warn('Paused Cloud Firestore sync cleanly due to daily free quota limits.');
  }
});

window.addEventListener('error', (event) => {
  if (
    event.message?.includes('Data cannot be cloned') ||
    event.message?.includes("Failed to execute 'measure' on 'Performance'") ||
    event.error?.name === 'DataCloneError'
  ) {
    event.preventDefault();
    return;
  }
  if (isQuotaExceededError(event.error || event.message)) {
    event.preventDefault();
    markCloudQuotaExceeded();
    console.warn('Paused Cloud Firestore sync cleanly due to daily free quota limits.');
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
