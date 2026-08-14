<div align="center">
  <img width="1200" height="475" alt="WorkForceOS Banner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# WorkForceOS Enterprise HRMS

Enterprise HRMS platform providing full workforce, organization, RBAC, employee directory, leave & attendance tracking, ATS recruitment, and AI assistant foundation exported from **Google AI Studio**.

- **AI Studio App Link:** [View App in Google AI Studio](https://ai.studio/apps/498d1e49-2aa4-48e0-adab-693b0478c011)
- **Tech Stack:** React 19, TypeScript 5.8, Vite 6, Tailwind CSS v4, Google GenAI SDK (`@google/genai`), Supabase JS, Framer Motion, Recharts, Lucide Icons.

---

## Quick Start & Local Setup

### 1. Prerequisites
- **Node.js** (v18.x or higher)
- **npm** or **bun** / **yarn** / **pnpm**

### 2. Installation
```bash
# Clone or navigate into the repository root
cd workforceos-enterprise-hrms

# Install dependencies
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your environment variables in `.env.local`:
- **`VITE_GEMINI_API_KEY`**: Set your [Google Gemini API Key](https://aistudio.google.com/) for live AI assistant support.
- **`VITE_SUPABASE_URL`** & **`VITE_SUPABASE_ANON_KEY`**: Optional. If omitted or kept as placeholder, the app operates seamlessly using its built-in reactive mock store.

### 4. Running the Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:3000`.

---

## Available NPM Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts Vite local development server on port 3000 |
| `npm run build` | Builds optimized production bundle to `dist/` |
| `npm run preview` | Previews production build locally |
| `npm run typecheck` | Runs TypeScript compiler (`tsc --noEmit`) without generating files |
| `npm run lint` | Alias for `npm run typecheck` |
| `npm run clean` | Removes build artifacts (`dist/`, `server.js`) |

---

## Project Structure & Architecture

```
workforceos-enterprise-hrms/
├── src/
│   ├── components/       # Shared UI components (AppShell, Button, Drawer, Toast, RouteGuard)
│   ├── features/         # Domain-driven HR modules
│   │   ├── admin/        # System Administration & Audit Logs
│   │   ├── analytics/    # HR & Workforce Intelligence Dashboards
│   │   ├── assistant/    # AI Copilot Assistant Drawer (Google GenAI powered)
│   │   ├── attendance/   # Attendance, Biometrics & Shift Management
│   │   ├── auth/         # Authentication & Login Views
│   │   ├── automation/   # Workflow & Approval Automations
│   │   ├── compliance/   # Policy & Employee Relations
│   │   ├── dashboard/    # Executive & Workforce Overview
│   │   ├── documents/    # Enterprise Document Management
│   │   ├── leave/        # Leave Management System
│   │   ├── offboarding/  # Exit & Offboarding Workflows
│   │   ├── onboarding/   # Employee Onboarding Sequences
│   │   ├── organization/ # Structure, Departments, Locations & Assets
│   │   ├── people/       # Employee Directory & Profile Cards
│   │   ├── rbac/         # Role-Based Access Control
│   │   ├── settings/     # System & Tenant Settings
│   │   ├── talent/       # ATS Recruitment & Talent Management
│   │   ├── time/         # Time Tracking & Payroll Integrations
│   │   └── workspace/    # Employee Self-Service Workspace
│   ├── hooks/            # Context hooks (useAuth, useTenant, useToast)
│   ├── lib/              # Utility & Supabase client wrapper
│   ├── services/         # API layer, Mock Data, and Gemini Service (`geminiService.ts`)
│   ├── types/            # TypeScript interfaces & schemas
│   ├── App.tsx           # Main application routing shell
│   ├── main.tsx          # Application entry point
│   └── vite-env.d.ts     # Vite environment type declarations
├── .env.example          # Environment template
├── .env.local            # Local development environment file
├── metadata.json         # Google AI Studio applet metadata
├── package.json          # Package manifest & scripts
├── tsconfig.json         # TypeScript compiler configuration
└── vite.config.ts        # Vite build & server configuration
```

---

## Google AI Studio Integration Details

When deployed in Google AI Studio or Cloud Run:
- The runtime automatically injects `GEMINI_API_KEY` from AI Studio user secrets.
- The Copilot Assistant in `src/services/geminiService.ts` automatically detects the injected key and uses Google's official `@google/genai` SDK with the `gemini-2.5-flash` model.
- Fallback mock intelligence is provided when running offline without an API key.
