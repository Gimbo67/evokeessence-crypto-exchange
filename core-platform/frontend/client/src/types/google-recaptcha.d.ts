// Type definitions for Google reCAPTCHA API
interface Window {
  grecaptcha?: {
    ready: (callback: () => void) => void;
    execute: (siteKey?: string, action?: { action: string }) => void;
    render: (element: HTMLElement | string, options: any) => number;
    reset: (widgetId?: number) => void;
  };
}

// Extending React reCAPTCHA component with proper TypeScript defs
declare namespace ReactReCAPTCHA {
  interface ReCAPTCHAProps {
    sitekey: string;
    onChange?: (token: string | null) => void;
    grecaptcha?: Window['grecaptcha'];
    onExpired?: () => void;
    onError?: () => void;
    onVerify?: (response: string) => void;
    size?: 'invisible' | 'normal' | 'compact';
    theme?: 'dark' | 'light';
    type?: 'audio' | 'image';
    tabindex?: number;
    badge?: 'bottomright' | 'bottomleft' | 'inline';
    hl?: string;
  }

  interface ReCAPTCHA {
    execute: () => void;
    reset: () => void;
    executeAsync: () => Promise<string>;
  }
}