# Teacher's Depth Checkpoint: 2026-08-07

## Purpose

This document captures the official end-of-session baseline so the project can resume from this exact state in the next development session.

## Baseline Summary

Teacher's Depth baseline is defined as a Teacher Operating System focused on teacher workflow reliability first.

Primary workflow baseline:

Upload
-> AI Analysis
-> Scrollable Output Options
-> Generate Prompt
-> Display Generated Prompt

## Confirmed Product Decisions

- Prompt Builder is the primary workflow.
- Single upload belongs to one subject.
- Input support baseline includes:
  - image
  - OCR text
  - typed text
  - handwritten notes
  - single-page PDF
  - multi-page PDF
  - large PDF
- Automatic detection baseline includes:
  - board
  - class
  - subject
  - chapter
  - topic
  - language
  - formulae
  - diagrams
  - tables
  - exercises
  - question types
  - exam importance
- Output options panel is independently scrollable and multi-select.
- Output options are subject-aware.
- Normal Solution is always visible and always selected.
- Prompt output contract includes deep-learning sectioning and teaching-image direction.
- Mobile-first interaction is mandatory (touch-friendly controls, readable fonts, low tap friction).

## Planned But Not Yet Baseline-Critical

These remain roadmap items after runnable baseline stability:

- Comprehensive teaching image generation.
- Image re-import and automatic teaching-card extraction.
- Teaching PDF generation.
- Mobile swipeable teaching deck.
- Large-PDF outline-first selective generation with lazy loading.

## Stability Gate For Future Sessions

Before starting new feature development, verify:

1. npm install succeeds.
2. npm run dev starts localhost successfully.
3. /teaching-engine loads without route/runtime errors.
4. Baseline primary workflow remains functional.

## Resume Checklist (Next Session)

1. Pull latest repository state.
2. Run npm install.
3. Run npm run dev.
4. Open /teaching-engine and execute baseline workflow smoke test.
5. Continue roadmap phase work only after stability gate passes.
