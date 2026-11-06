import { auth } from '../firebase';

let isInstalled = false;

export function installAuthFetch(): void {
  if (isInstalled || typeof window === 'undefined' || typeof window.fetch !== 'function') {
    return;
  }
  isInstalled = true;

  const originalFetch = window.fetch.bind(window);

  const wrappedFetch: typeof window.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.href
        : input.url;

    if (!url.startsWith('/api/')) {
      return originalFetch(input, init);
    }

    await auth.authStateReady();
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      const headers = new Headers(
        init?.headers ?? (input instanceof Request ? input.headers : undefined)
      );
      headers.set('Authorization', `Bearer ${token}`);
      return originalFetch(input, { ...init, headers });
    }

    return originalFetch(input, init);
  };

  try {
    Object.defineProperty(window, 'fetch', {
      value: wrappedFetch,
      writable: true,
      configurable: true,
    });
  } catch {
    try {
      Object.defineProperty(Window.prototype, 'fetch', {
        value: wrappedFetch,
        writable: true,
        configurable: true,
      });
    } catch {
      // Ignore if environment completely locks fetch descriptor
    }
  }
}
