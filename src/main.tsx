import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept known Chromium internal engine warnings/DOMExceptions (e.g. pointer lock edge-case in iframe)
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const msg = typeof reason === 'string' ? reason : (reason?.message || reason?.name || '');
  if (
    msg.includes('If you see this error we have a bug') ||
    msg.includes('report this bug to chromium') ||
    msg.includes('pointer lock') ||
    msg.includes('PointerLock') ||
    msg.includes('AudioContext')
  ) {
    event.preventDefault();
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

createRoot(document.getElementById('root')!).render(<App />);
