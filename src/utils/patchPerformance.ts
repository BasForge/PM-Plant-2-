// Patch window.performance.measure and window.performance.mark
// to prevent "Uncaught DataCloneError: Failed to execute 'measure' on 'Performance': Data cannot be cloned, out of memory."
// which occurs in Chromium browsers when React Dev / Profiler passes Fiber nodes with circular structures as measure options.

if (typeof window !== 'undefined' && window.performance) {
  if (typeof window.performance.measure === 'function') {
    const originalMeasure = window.performance.measure.bind(window.performance);
    window.performance.measure = function (name: string, startOrOptions?: any, endMark?: string) {
      try {
        return originalMeasure(name, startOrOptions, endMark);
      } catch (err: any) {
        // Fallback: If options contains uncloneable/out-of-memory objects (like React Fiber), measure without options
        try {
          return originalMeasure(name);
        } catch {
          return undefined as any;
        }
      }
    };
  }

  if (typeof window.performance.mark === 'function') {
    const originalMark = window.performance.mark.bind(window.performance);
    window.performance.mark = function (name: string, markOptions?: any) {
      try {
        return originalMark(name, markOptions);
      } catch (err: any) {
        try {
          return originalMark(name);
        } catch {
          return undefined as any;
        }
      }
    };
  }
}

// Intercept Firestore quota limit and maximum backoff errors to prevent crashing test/dev environment
if (typeof window !== 'undefined' && window.console && window.console.error) {
  const originalConsoleError = window.console.error.bind(window.console);
  window.console.error = function (...args: any[]) {
    const errorStr = args
      .map(a => (a instanceof Error ? `${a.name}: ${a.message}\n${a.stack}` : typeof a === 'object' ? JSON.stringify(a) : String(a)))
      .join(' ')
      .toLowerCase();

    if (
      errorStr.includes('resource-exhausted') ||
      errorStr.includes('quota limit exceeded') ||
      errorStr.includes('free daily write units') ||
      errorStr.includes('free daily read units') ||
      errorStr.includes('maximum backoff delay') ||
      errorStr.includes('quota exceeded for quota metric')
    ) {
      try {
        const today = new Date().toISOString().slice(0, 10);
        localStorage.setItem('firestore_quota_exceeded_date', today);
        sessionStorage.setItem('firestore_quota_exceeded_date', today);
        window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
      } catch {}
      console.warn('[Cloud Firestore Free Daily Quota Reached - Local LAN/Offline Mode Active]', ...args);
      return;
    }

    return originalConsoleError(...args);
  };
}

