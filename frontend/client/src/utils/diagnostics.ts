/**
 * Cookie and security diagnostics utility
 * Moved from inline script to improve CSP compliance
 */
export const runCookieDiagnostics = () => {
  // Only run in development mode
  if (import.meta.env.DEV) {
    console.log("Document cookie state:", {
      hasCookies: document.cookie.length > 0,
      cookieCount: document.cookie.split(';').length,
      secure: window.location.protocol === 'https:'
    });
  }
};

/**
 * Initialize diagnostics on page load
 */
export const initializeDiagnostics = () => {
  if (import.meta.env.DEV) {
    // Run when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runCookieDiagnostics);
    } else {
      runCookieDiagnostics();
    }
  }
};