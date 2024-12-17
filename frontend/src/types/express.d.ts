import 'express';

declare module 'express' {
  export interface Response {
    __(key: string, options?: any): string;
  }

  export interface Request {
    __(key: string): string;
    file?: {
      originalname: string;
      buffer: Buffer;
    };
  }
}