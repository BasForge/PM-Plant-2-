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
