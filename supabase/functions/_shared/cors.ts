// supabase/functions/_shared/cors.ts
// ============================================================
// Joy PeopleHR Enterprise — Secure CORS & Preflight Handler for Edge Functions
// ============================================================

const ALLOWED_ORIGINS = [
  "https://joypeoplehr.com",
  "https://www.joypeoplehr.com",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
];

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".joypeoplehr.com");

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : (origin ? origin : "https://joypeoplehr.com"),
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-device-fingerprint",
    "Access-Control-Max-Age": "86400",
  };
}

export function handleCorsPreflight(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: getCorsHeaders(req),
    });
  }
  return null;
}
