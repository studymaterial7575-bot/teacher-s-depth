# Teacher's Depth — Architecture & Developer Guide

**Last Updated:** June 26, 2026  
**Status:** Production-ready full-stack learning platform  
**Framework:** TanStack Start + React 19 + Tailwind CSS  
**Target User:** Solo developers using Emergent Lab

---

## Table of Contents

1. [Overall Architecture](#overall-architecture)
2. [Folder Structure & Purpose](#folder-structure--purpose)
3. [How TanStack Router Works](#how-tanstack-router-works)
4. [Adding New Features](#adding-new-features)
5. [Files That Should Be Touched](#files-that-should-be-touched)
6. [Files That Should Rarely Be Touched](#files-that-should-rarely-be-touched)
7. [Dependency Map](#dependency-map)
8. [Safe Development Workflow](#safe-development-workflow)
9. [How to Avoid Breaking the App](#how-to-avoid-breaking-the-app)
10. [Repository Map for Solo Developers](#repository-map-for-solo-developers)
11. [Maintenance Guide & Best Practices](#maintenance-guide--best-practices)

---

## 2026-08-07 Architecture Addendum (Official Baseline)

This addendum preserves prior architecture notes and records the current official development baseline.

### Product Positioning

Teacher's Depth is positioned as a Teacher Operating System, not a traditional student-only learning app.

Primary objective:
- Transform one uploaded academic source into teaching-ready output that allows confident delivery after short preparation.

### Primary Workflow (Current Runnable Baseline)

1. Upload source content.
2. Run local AI analysis/extraction.
3. Select subject-aware output options in a scrollable panel.
4. Generate optimized prompt.
5. Display generated prompt and summary.

Route:
- /teaching-engine

### Input Model

Supported inputs under single-subject-per-upload assumption:
- Image / camera photo
- OCR text (pasted or extracted)
- Typed text
- Handwritten notes (via OCR path)
- Single-page PDF
- Multi-page PDF
- Large PDF (analysis-first model; full generation deferred by phase)

### Detection Contract

The extraction model is designed to infer:
- Board
- Class
- Subject
- Chapter
- Topic
- Language
- Formulae
- Diagrams
- Tables (flag)
- Exercises (flag)
- Question type(s)
- Exam importance

When confidence is low, values may remain Unknown/Not identified and are editable in UI.

### Output Option Selector Contract

Behavioral rules:
- Independent vertical scroll area.
- Multi-select enabled.
- Subject-aware option filtering.
- Normal Solution always visible and always selected.
- Sticky bottom actions: Select All, Clear All, Generate Prompt.

### Prompt Builder Contract

Prompt must include:
- Uploaded content context.
- Detected metadata.
- Selected output options.
- Subject-aware teaching instructions.
- Structured output instructions for ChatGPT.

Current output structure enforced in prompt builder:
- SECTION 1: Normal Solution
- SECTION 2: Scrollable Deep Learning Section
- SECTION 3: Create Teaching Image

### Future Pipeline (Planned, Not Required for Runnable Baseline)

Phased items tracked in roadmap:
- Comprehensive teaching image generation.
- Image re-import and card segmentation.
- Teaching PDF export (one card per page).
- Mobile swipeable teaching deck.
- Large-PDF outline-first selective generation with lazy loading.

### Baseline Stability Rule

Before adding advanced features, maintain a runnable baseline:
- npm install succeeds.
- npm run dev starts localhost.
- /teaching-engine opens and supports the primary workflow end-to-end.

