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

window.addEventListener('error', (event) => {
  const msg = String(event.message || event.error?.message || '');
  if (
    msg.includes('If you see this error we have a bug') ||
    msg.includes('report this bug to chromium')
  ) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(<App />);
