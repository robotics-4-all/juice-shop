import 'express';

interface TranslationOptions {
  context?: string; // Disambiguation (e.g., male/female user)
  count?: number;   // For pluralization
  [key: string]: string | number | undefined; // Support additional dynamic keys
}

declare module 'express' {
  export interface Response {
    __(key: string, options?: TranslationOptions): string;
  }

  export interface Request {
    __(key: string): string;
    file?: {
      originalname: string;
      buffer: Buffer;
    };
  }
}