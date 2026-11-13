# JOY FaceAttend — CompreFace Docker Setup

Portable CompreFace setup for **local laptop testing today** and **moving to your Email + Docker server PC tomorrow** without port conflicts.

## 1. Start CompreFace Locally
```powershell
cd "docker/compreface"
Copy-Item .env.example .env -ErrorAction SilentlyContinue
docker compose up -d
```
Wait ~30–60 seconds for initialization, then open:
- **CompreFace UI:** http://localhost:8000

## 2. Create a Verification Service & Get API Key
1. Register/sign in on the CompreFace UI (`http://localhost:8000`).
2. Create an Application (e.g., `JOY PeopleHR`).
3. Inside the application, click **Add Service** -> choose **Face Verification** (`VERIFICATION`).
4. Copy the generated **API Key** (`x-api-key`).

## 3. Connect Supabase Edge Function (`face-attend-verify`)
Because Supabase Edge Functions run in the cloud, they need an HTTPS URL to reach CompreFace:
- **On your laptop today (quick tunnel):**
  Run `cloudflared tunnel --url http://localhost:8000` (or `ngrok http 8000`) to get a temporary `https://...` URL.
- **On your dedicated server tomorrow:**
  Reverse-proxy `127.0.0.1:8000` behind Nginx/Caddy/Cloudflare Tunnel on a subdomain like `https://face.yourdomain.com` (leaving ports `80/443/25/465/587/993` untouched for your email server).

Set these two secrets on Supabase:
```powershell
npx supabase secrets set COMPREFACE_URL=https://your-compreface-url COMPREFACE_API_KEY=your-verification-api-key
```

## 4. Moving to Your Other PC Tomorrow
1. Copy the `docker/compreface/` folder to the target PC.
2. Run `docker compose up -d` there (make sure `COMPREFACE_PORT=8000` doesn't clash with anything on that host).
3. Update `COMPREFACE_URL` and `COMPREFACE_API_KEY` in Supabase secrets.

