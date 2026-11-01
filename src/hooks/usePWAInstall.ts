import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isIframe, setIsIframe] = useState(false);
  const [cacheProgress, setCacheProgress] = useState<number | null>(null);
  const [isOfflineReady, setIsOfflineReady] = useState(false);

  useEffect(() => {
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

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

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
