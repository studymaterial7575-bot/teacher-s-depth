# Teacher's Depth

Deep, pedagogical learning companion for CBSE, ICSE, and IGCSE students. Provides structured content across 7 subjects with formulas, examples, visual breakdowns, and AI-powered analysis tools. Includes study tools, progress tracking, and bookmarks.

## Official Baseline Checkpoint (2026-08-07)

Teacher's Depth baseline is now defined as a Teacher Operating System with Prompt Builder as the primary workflow.

Current baseline workflow:

Upload
-> AI Analysis
-> Scrollable Output Options
-> Generate Prompt
-> Display Generated Prompt

Key baseline decisions saved in this checkpoint:
- Single-subject upload model.
- Input support for image, OCR text, typed text, handwritten notes, single-page PDF, multi-page PDF, and large PDF.
- Automatic detection targets: board, class, subject, chapter, topic, language, formulas, diagrams, tables, exercises.
- Subject-aware output options with multi-select.
- Normal Solution always enabled.
- Prompt generation oriented for ChatGPT handoff.
- Mobile-first usability with large touch-friendly controls.
- Large-PDF outline-first workflow and lazy generation planned in roadmap phases.

Checkpoint documents:
- ARCHITECTURE.md (latest architecture addendum)
- ROADMAP.md (phased implementation reset)
- docs/checkpoints/2026-08-07-teacher-os-baseline.md (session checkpoint)

## Quick Start

```bash
npm install
npm run dev
npm run build
```

## Running Teacher's Depth on Mobile

A. Laptop/local access

- Start development server:

```bash
npm run dev -- --host 0.0.0.0
```

- Open on laptop browser:

http://localhost:<PORT>

B. Same-Wi-Fi mobile access during development

- Keep the same dev server running on laptop.
- In the terminal output, copy the Network URL shown by Vite (for example: http://192.168.x.x:<PORT>).
- Open that URL in Android mobile browser connected to the same Wi-Fi.
- Laptop and mobile will load the same running app and current development state.

C. Production HTTPS access after deployment

- Deploy the production build to a public hosting platform with HTTPS.
- Users then open Teacher's Depth from a permanent HTTPS URL on laptop, mobile, or tablet.
- Production access does not depend on localhost, private LAN IPs, or same Wi-Fi.

## How to use Teacher's Depth after deployment

Mobile:

- Open the permanent HTTPS URL in Chrome on Android.

Laptop:

- Open the same HTTPS URL in any browser.

Important:

- No laptop is required after deployment.
- The deployed app runs on hosting infrastructure, not on localhost or your laptop IP.

### Production build and preview commands

- Build command: `npm run build`
- Type check: `npm run typecheck`
- Test suite: `npm test`
- Production-style preview (after build): `npm run preview -- --host 0.0.0.0 --port 4173`

### Required environment variables

Use `.env.example` as reference. Do not commit real secrets.

- `GEMINI_API_KEY`
  - Required for AI companion analysis and remote diagram/image-analysis APIs.
  - Must be configured in hosting platform environment settings.
  - Must remain server-side only.

### Authentication readiness (no fake login)

Authentication is not implemented in this repository yet.

Recommended production approach:

1. Use managed auth with secure sessions (for example: Auth.js, Clerk, or Supabase Auth).
2. Keep credentials and provider secrets in hosting environment variables only.
3. Store password hashes only (never plaintext passwords).
4. Enforce server-side session validation on protected API routes.
5. Add role-based access checks before exposing teacher or student private data.

### Deployment configuration (private GitHub repo supported)

Recommended platform: Vercel (repository can remain private).

1. Connect private GitHub repository to Vercel.
2. In Vercel Project Settings -> Environment Variables, add:
	- `GEMINI_API_KEY`
	- `NITRO_PRESET=vercel`
3. Keep build command as:
	- `npm run build`
4. Deploy.

The build outputs Vercel-compatible artifacts in `.vercel/output` when `NITRO_PRESET=vercel` is set.

### Post-deployment verification steps

After deploy, verify all of the following using the permanent HTTPS domain:

1. Open `/`, `/search`, `/teaching-engine`, `/subjects/math`, `/chapter/math/math-quadratic`, `/companion` directly in browser.
2. Refresh each route and confirm no blank page and no 404.
3. Verify API-backed flows:
	- Companion analysis (`/api/analyze` via UI)
	- Diagram generation (`/api/diagram-image` via UI)
	- Teaching-image analysis (`/api/teaching-image-analyze` via UI)
4. On Android and tablet, confirm:
	- text remains readable,
	- buttons are touch-usable,
	- no horizontal overflow,
	- teaching cards and PDF generation workflow remain usable.

## Android Packaging Notes

This project is ready to package as an Android APK/AAB with current behavior unchanged.

- Production build is generated with `npm run build`.
- Persistent teaching-engine state is implemented in browser storage:
	- `localStorage` for OCR text, metadata, profile/depth selections, workflow step, and generated prompt.
	- `IndexedDB` for attached files (screenshots, PDFs, camera images).
- `Clear` is the intended action to reset saved teaching-engine state.

Before packaging in a WebView wrapper (Capacitor/Cordova/TWA), verify platform integration settings:

- Camera/photo capture permissions are enabled.
- External link opening is allowed for ChatGPT handoff (`window.open`).
- WebView storage is not configured as ephemeral (to preserve persistence).

Temporary verification assets have been removed from the repository for release cleanliness.
