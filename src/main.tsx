import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { isQuotaExceededError, markCloudQuotaExceeded } from './services/firebaseDb';

// Prevent uncaught Firebase quota exhaustion errors from breaking UI or looping
window.addEventListener('unhandledrejection', (event) => {
  if (isQuotaExceededError(event.reason)) {
    event.preventDefault();
    markCloudQuotaExceeded();
    console.warn('Paused Cloud Firestore sync cleanly due to daily free quota limits.');
  }
});

window.addEventListener('error', (event) => {
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
