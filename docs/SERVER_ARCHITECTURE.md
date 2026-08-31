# Joy PeopleHR Enterprise — Production Server Documentation (`server.js`)

## 📌 Overview
`server.js` serves as the high-security Node.js / Express backend application server for **Joy PeopleHR Enterprise HRMS** on production (`joypeoplehr.com`) and local development environments.

It provides **military-grade security headers, anti-hijacking validation, intelligent rate-limiting, CORS isolation, specialized server-side API gateways (Resend Email & Google Maps Resolver), and Single Page Application (SPA) static asset distribution**.

---

## 🏗️ Architectural Topology

```
                          [ Client Request ]
                                  │
                                  ▼
      ┌──────────────────────────────────────────────────────────┐
      │          1. Enterprise Security Headers Engine           │
      │   (X-Frame-Options, HSTS, CSP/Permissions, nosniff)     │
      └───────────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
      ┌──────────────────────────────────────────────────────────┐
      │          2. Dynamic CORS & Origin Validator              │
      │  (Whitelists joypeoplehr.com, capacitor://, localhost)   │
      └───────────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
      ┌──────────────────────────────────────────────────────────┐
      │          3. Sliding-Window Rate Limiting Engine          │
      │       (120 req/min per IP with 429 Retry-After)          │
      └───────────────────────────┬──────────────────────────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         │                                                 │
         ▼                                                 ▼
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│     Backend API Micro-Gateways  │       │     Static Assets & SPA Router  │
│                                 │       │                                 │
│ • /api/health                   │       │ • Express Static (`/dist`)      │
│ • /api/auth/validate-session    │       │ • Single Page Application (SPA) │
│ • /api/location/resolve-maps    │       │   Wildcard Fallback (`*`)       │
│ • /api/resend/emails            │       │                                 │
└─────────────────────────────────┘       └─────────────────────────────────┘
```

---

## 🛡️ Core Security Architecture

### 1. Enterprise Security Headers
The server automatically applies hardened HTTP headers on every incoming and outgoing packet:
* **`X-Frame-Options: SAMEORIGIN`**: Eliminates Clickjacking attacks by prohibiting unauthorized frame embeddings.
* **`X-Content-Type-Options: nosniff`**: Prevents browser MIME-type sniffing vulnerabilities.
* **`X-XSS-Protection: 1; mode=block`**: Enables browser-level Cross-Site Scripting filters.
* **`Referrer-Policy: strict-origin-when-cross-origin`**: Protects internal route privacy and sensitive session tokens during outbound links.
* **`Strict-Transport-Security (HSTS)`**: Enforces 1-year (`max-age=31536000`) HTTPS-only communication with preload support.
* **`Permissions-Policy`**: Restricts unauthorized camera/microphone hardware access while scoping `geolocation=(self)` for GPS attendance clocking.

### 2. Strict CORS & Mobile Origin Whitelist
Supports multi-channel access (Web, Progressive Web App, Capacitor, and Ionic iOS/Android hybrid apps) without opening cross-origin attack vectors:
* `https://joypeoplehr.com` & `https://www.joypeoplehr.com`
* `capacitor://localhost` & `ionic://localhost`
* `http://localhost:3000` & `http://localhost:5173`

### 3. Sliding-Window Rate Limiting
Protects against brute-force authentication, credential stuffing, and Denial of Service (DoS):
* **Window Duration:** 60,000 ms (1 Minute)
* **Threshold:** 120 requests per minute per IP address
* **Exceeded Response:** `HTTP 429 Too Many Requests` with a calculated `retryAfterSeconds` payload.

---

## 📡 API Endpoint Reference

### 1. Server Healthcheck
* **Route:** `GET /api/health`
* **Purpose:** Production uptime monitoring, load balancer health checks, and heartbeat verification.
* **Response:**
  ```json
  {
    "status": "ok",
    "uptime": 14238.45,
    "timestamp": "2026-08-31T12:50:00.000Z",
    "environment": "production",
    "security_engine": "active"
  }
  ```

---

### 2. Session Anti-Hijack Validation
* **Route:** `POST /api/auth/validate-session`
* **Purpose:** Validates hardware client fingerprints against current User-Agent signatures to prevent cloned cookies and session hijacking.
* **Request Body:**
  ```json
  {
    "userId": "emp-101",
    "fingerprint": "fp_a8f93bc102"
  }
  ```
* **Response (`200 OK`):**
  ```json
  {
    "valid": true,
    "verified_at": "2026-08-31T12:50:00.000Z",
    "user_id": "emp-101"
  }
  ```

---

### 3. Universal Google Maps & Shortlink Resolver
* **Route:** `POST /api/location/resolve-google-maps`
* **Purpose:** Allows administrators to paste **ANY** Google Maps shortlink (`https://maps.app.goo.gl/...`), place link, or coordinate string. The server follows the redirect server-side (bypassing client browser CORS restrictions), extracts exact pin coordinates `(latitude, longitude)`, and queries reverse geocoding to construct a real structured street address.
* **Request Body:**
  ```json
  {
    "url": "https://maps.app.goo.gl/oJDgaJTNBwzXw9mC7"
  }
  ```
* **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "latitude": 11.0655197,
    "longitude": 77.1519614,
    "name": "Watertec (India) - Unit 3",
    "address": "Watertec (India) Unit 3, Arasur Industrial Area, Coimbatore, Tamil Nadu 641407",
    "resolvedUrl": "https://www.google.com/maps/place/Watertec+(India)+-+Unit+3/@11.0655576,77.1543318..."
  }
  ```

---

### 4. Production Resend Email Gateway Proxy
* **Route:** `POST /api/resend/emails`
* **Purpose:** Dispatches transactional onboarding emails, payroll slips, and attendance alerts through Resend API without exposing secret keys to frontend JavaScript bundles.
* **Headers:** `Authorization: Bearer <JWT/Token>`
* **Request Body:**
  ```json
  {
    "from": "Joy PeopleHR <notifications@joypeoplehr.com>",
    "to": ["employee@example.com"],
    "subject": "Welcome to Joy Corporate Solutions",
    "html": "<p>Your account is activated.</p>"
  }
  ```
* **Response (`200 OK`):**
  ```json
  {
    "id": "re_89f023a_91238",
    "status": "queued"
  }
  ```

---

## 📦 Static Asset Serving & SPA Routing
* **Static Assets:** Serves minified JS, CSS, fonts, and images from the production build directory:
  ```js
  app.use(express.static(path.join(__dirname, 'dist')));
  ```
* **SPA History API Fallback:** All client-side route requests (e.g. `/geofences`, `/employees`, `/payroll`, `/attendance`) automatically route to `dist/index.html`, allowing React Router to handle page navigation seamlessly without `404 Not Found` errors:
  ```js
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
  ```

---

## ⚙️ Environment Variables Configuration

| Variable | Type | Description |
| :--- | :--- | :--- |
| `PORT` | `number` | Server listening port (Default: `3000`). |
| `NODE_ENV` | `string` | Environment designation (`production` or `development`). |
| `RESEND_API_KEY` | `string` | Secret API key for transactional email dispatch. |
| `VITE_SUPABASE_URL` | `string` | Production Supabase database endpoint. |
| `VITE_SUPABASE_ANON_KEY` | `string` | Production Supabase public client authorization key. |
