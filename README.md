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
