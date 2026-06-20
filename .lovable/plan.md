# Teacher's Depth — Audit + Expansion Plan

The request bundles ~25 new features on top of a full audit. Shipping it all in one pass would burn credits and risk regressions. I'll split into **phases you approve one at a time**. Phase 1 alone delivers the "no blank screens / responsive / stable" promise.

## Phase 1 — Audit & Stability (do now)

1. Smoke-test every route via headless browser at 360x643 (Android mobile):
   `/`, `/tools`, `/bookmarks`, `/search`, `/companion`,
   `/subjects/$slug` (each subject), `/chapter/$subject/$chapter` (sample).
   Capture screenshots + console errors per route.
2. Fix any runtime/hydration/import errors found.
3. Wrap each route in an `<ErrorBoundary>` with a friendly fallback (reuse root `ErrorComponent`).
4. Add **loading skeletons** and **empty states** to: Bookmarks, Search, Recent Chapters, Continue Learning, Companion result panel.
5. Verify Tools tabs (Basic/Scientific Calc, Unit, Percentage, Pomodoro, Stopwatch) all mount on mobile width; fix horizontal-scroll tab overflow.
6. Verify bottom nav, FAB, header search on 360px.
7. Remove dead code / unreferenced components.

**Deliverable:** audit report (routes tested ✓/✗, bugs fixed, screenshots) + stable build.

## Phase 2 — Home & Study Habits (small)

- Daily goal (minutes target, editable)
- Study streak (already partly in storage — surface it)
- Motivational quote rotator (local array)
- Progress card polish

## Phase 3 — More Tools (medium)

Add to existing `/tools` tab strip, reusing the calculator/timer patterns:
- Age calculator
- BMI calculator
- GPA calculator (CBSE/ICSE/IGCSE presets)

## Phase 4 — Study Features (large, split further)

4a. Flashcards (per chapter, spaced repetition lite, localStorage)
4b. MCQ generator with scoring (seeded from chapter data)
4c. Formula library (aggregate from `data.ts`, searchable)
4d. Notes editor with autosave + Weak chapter tracker
4e. Revision planner (calendar-lite)
4f. Mind maps + extra visual diagrams — **needs a library choice**; I'll propose `react-flow` when we get here
4g. Previous year questions — **needs a content source**; will need your input

## Phase 5 — AI Companion upgrades (large)

- Chat history (localStorage threads — one conversation or threads? I'll ask before building)
- Image upload + "ask doubt from photo" (Gemini vision via AI Gateway)
- OCR (Gemini handles this natively from images — no separate OCR lib)
- Voice input (Web Speech API, browser-only)
- Save conversation

## Phase 6 — Export & Backup (small)

- PDF notes export (`jspdf`)
- Backup/restore JSON of all localStorage

## Quality gates each phase

- Reuse existing UI primitives (`card`, `tabs`, `button`, `Stars`, `TeacherNoteCard`)
- No duplicate routes
- Error boundary on every new route
- Browser smoke test before declaring done

---

**Recommend: approve Phase 1 now.** I'll run the full audit, fix what's broken, and report back with screenshots + a list of what's actually working before we spend credits on new features. Reply "go" to start Phase 1, or tell me to jump straight to a specific phase.
