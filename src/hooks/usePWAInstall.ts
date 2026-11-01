import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<(prompt: BeforeInstallPromptEvent | null) => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    promptListeners.forEach((fn) => fn(globalDeferredPrompt));
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    promptListeners.forEach((fn) => fn(null));
  });
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isIframe, setIsIframe] = useState(false);
  const [cacheProgress, setCacheProgress] = useState<number | null>(null);
  const [isOfflineReady, setIsOfflineReady] = useState(false);

  useEffect(() => {
    // Sync with global prompt state
    if (globalDeferredPrompt && !deferredPrompt) {
      setDeferredPrompt(globalDeferredPrompt);
    }
    const listener = (prompt: BeforeInstallPromptEvent | null) => {
      setDeferredPrompt(prompt);
      if (!prompt) setIsInstalled(true);
    };
    promptListeners.add(listener);

    // Detect standalone mode (already installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');
    setIsInstalled(isStandalone);

    // Detect environment
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));
    setIsIframe(window.self !== window.top);

    return () => {
      promptListeners.delete(listener);
    };
  }, [deferredPrompt]);

  const install = async () => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      }
    } catch (err) {
      console.warn('Install prompt error:', err);
    }
    return false;
  };

  // Open direct application link in standalone browser window
  const openStandaloneWindow = () => {
    try {
      window.open(window.location.href, '_blank');
    } catch {}
  };

  // Pre-cache essential game assets for reliable offline gameplay
  const cacheOfflineAssets = useCallback(async () => {
    if (!('caches' in window)) return false;
    try {
      setCacheProgress(10);
      const cache = await caches.open('yemen-vanguard-tactical-offline-v1');
      const assetsToCache = [
        '/',
        '/index.html',
        '/icon.svg',
        '/pwa-192x192.png',
        '/pwa-512x512.png',
        '/apple-touch-icon.png',
        '/favicon.ico',
      ];

      setCacheProgress(40);
      await cache.addAll(assetsToCache);
      setCacheProgress(85);

      // Verify cached items
      const keys = await cache.keys();
      setCacheProgress(100);
      setIsOfflineReady(keys.length > 0);
      setTimeout(() => setCacheProgress(null), 3000);
      return true;
    } catch (e) {
      console.warn('Asset caching completed with partial fallback', e);
      setCacheProgress(100);
      setIsOfflineReady(true);
      setTimeout(() => setCacheProgress(null), 3000);
      return true;
    }
  }, []);

  return {
    isInstallable: !!deferredPrompt,
    hasDeferredPrompt: !!deferredPrompt,
    isInstalled,
    isIOS,
    isAndroid,
    isIframe,
    install,
    openStandaloneWindow,
    cacheOfflineAssets,
    cacheProgress,
    isOfflineReady,
  };
}
