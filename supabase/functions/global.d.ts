// supabase/functions/global.d.ts
// Ambient type definitions for Supabase Deno Edge Functions

declare namespace Deno {
  export const env: {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    toObject(): Record<string, string>;
  };
}

declare module 'https://*' {
  const content: any;
  export default content;
  export const serve: any;
  export const createClient: any;
  export const getCorsHeaders: any;
  export const handleCorsPreflight: any;
  export const checkRateLimit: any;
}
