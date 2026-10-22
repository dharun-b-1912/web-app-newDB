// supabase/functions/global.d.ts
// Ambient type definitions for Supabase Deno Edge Functions

declare namespace Deno {
  export const env: {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    toObject(): Record<string, string>;
  };
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
  export function serve(options: any, handler: (req: Request) => Response | Promise<Response>): void;
}

declare module 'https://*' {
  const content: any;
  export default content;
  export const serve: any;
  export const createClient: any;
  export const getCorsHeaders: any;
  export const handleCorsPreflight: any;
  export const checkRateLimit: any;
  export const jsPDF: any;
}
