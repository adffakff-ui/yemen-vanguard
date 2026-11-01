import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept known Chromium engine warnings, Vite HMR socket disconnects & Google Maps script load errors
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const msg = typeof reason === 'string' ? reason : (reason?.message || reason?.name || '');
  if (
    msg.includes('If you see this error we have a bug') ||
    msg.includes('report this bug to chromium') ||
    msg.includes('pointer lock') ||
    msg.includes('PointerLock') ||
    msg.includes('AudioContext') ||
    msg.includes('Google Maps JavaScript API') ||
    msg.includes('script.onerror') ||
    msg.includes("reading 'send'") ||
    msg.includes('vite')
  ) {
    event.preventDefault();
  }
});

window.addEventListener('error', (event) => {
  const msg = String(event?.message || event?.error || '');
  if (
    msg.includes('Google Maps JavaScript API') ||
    msg.includes('script.onerror') ||
    msg.includes('could not load') ||
    msg.includes("reading 'send'") ||
    msg.includes('vite')
  ) {
    event.preventDefault();
    if (msg.includes('Google Maps') || msg.includes('script.onerror')) {
      window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    }
  }
});

// Register early global Google Maps quota listener and console interceptor
(window as any).gm_authFailure = () => {
  window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
};
const origConsoleError = console.error;
console.error = (...args: unknown[]) => {
  origConsoleError.apply(console, args);
  const msg = args.map((a) => String(a)).join(' ');
  if (msg.includes('OverQuotaMapError') || msg.includes('QuotaExceededError')) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  }
};

// Register Service Worker for PWA & offline capabilities in production
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD && window.location.protocol === 'https:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Service Worker registration skipped:', err);
      });
    });
  } else {
    // In development mode, unregister any active service worker to prevent Vite module interception
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  }
}
createRoot(document.getElementById('root')!).render(<App />);

