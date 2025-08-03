// Module declarations for packages without type definitions

declare module 'speakeasy' {
  export function generateSecret(options?: {
    name?: string;
    length?: number;
    symbols?: boolean;
    otpauth_url?: boolean;
    issuer?: string;
  }): {
    ascii: string;
    hex: string;
    base32: string;
    otpauth_url?: string;
  };

  export function totp(options: {
    secret: string;
    encoding?: 'ascii' | 'hex' | 'base32';
    time?: number;
    counter?: number;
    digits?: number;
    step?: number;
    algorithm?: 'sha1' | 'sha256' | 'sha512';
  }): string;
  
  export function verify(options: {
    secret: string;
    encoding?: 'ascii' | 'hex' | 'base32';
    token: string;
    time?: number;
    counter?: number;
    digits?: number;
    step?: number;
    window?: number;
    algorithm?: 'sha1' | 'sha256' | 'sha512';
  }): boolean;
  
  export namespace totp {
    export function verify(options: {
      secret: string;
      encoding?: 'ascii' | 'hex' | 'base32';
      token: string;
      time?: number;
      counter?: number;
      digits?: number;
      step?: number;
      window?: number;
      algorithm?: 'sha1' | 'sha256' | 'sha512';
    }): boolean;
  }
}

declare module 'qrcode' {
  export function toDataURL(
    text: string,
    options?: {
      type?: string;
      rendererOpts?: {
        quality?: number;
      };
      errorCorrectionLevel?: string;
      margin?: number;
      scale?: number;
      width?: number;
      color?: {
        dark?: string;
        light?: string;
      };
    }
  ): Promise<string>;

  export function toString(
    text: string,
    options?: {
      type?: string;
      errorCorrectionLevel?: string;
      margin?: number;
      scale?: number;
      width?: number;
      color?: {
        dark?: string;
        light?: string;
      };
    }
  ): Promise<string>;

  export function toFile(
    path: string,
    text: string,
    options?: {
      type?: string;
      errorCorrectionLevel?: string;
      margin?: number;
      scale?: number;
      width?: number;
      color?: {
        dark?: string;
        light?: string;
      };
    }
  ): Promise<void>;
}