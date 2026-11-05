import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

const BUILD_CACHE_VERSION = 'atelier-pwa-v5.0';

if (typeof window !== 'undefined') {
  try {
    const lastVersion = localStorage.getItem('atelier_build_cache_version');
    if (lastVersion !== BUILD_CACHE_VERSION || import.meta.env.DEV) {
      localStorage.setItem('atelier_build_cache_version', BUILD_CACHE_VERSION);
      if ('caches' in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => {
            caches.delete(key);
          });
        });
      }
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((reg) => {
            if (import.meta.env.DEV) {
              reg.unregister();
            } else {
              reg.update();
            }
          });
        });
      }
    }
  } catch {
    // Ignore storage access errors in restricted webviews
  }

  if (!import.meta.env.DEV) {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        updateSW(true);
      },
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

