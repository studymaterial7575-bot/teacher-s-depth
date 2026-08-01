# Teacher's Depth

Deep, pedagogical learning companion for CBSE, ICSE, and IGCSE students. Provides structured content across 7 subjects with formulas, examples, visual breakdowns, and AI-powered analysis tools. Includes study tools, progress tracking, and bookmarks.

## Quick Start

```bash
npm install
npm run dev
npm run build
```

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
