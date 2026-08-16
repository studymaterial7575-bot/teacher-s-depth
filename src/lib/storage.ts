import { useEffect, useState } from "react";

const isBrowser = typeof window !== "undefined";

export function useLocalStorage<T>(key: string, initial: T) {
  // Always start with `initial` so SSR and the first client render match.
  // Hydrate from localStorage in an effect after mount to avoid hydration
  // mismatch warnings.
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (!isBrowser) return;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw) as T);
    } catch {}
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (!isBrowser || !hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value, hydrated]);
  return [value, setValue] as const;
}

export type BookmarkKind = "chapter" | "formula" | "example" | "note";
export type Bookmark = {
  id: string;
  kind: BookmarkKind;
  title: string;
  subtitle?: string;
  href: string;
  addedAt: number;
};

export type Note = {
  id: string;
  title: string;
  body: string;
  updatedAt: number;
};

export type Progress = {
  completed: string[]; // chapter ids
  todayMinutes: number;
  weekly: number[]; // last 7 days minutes
  streak: number;
  lastStudyDay: string; // YYYY-MM-DD
};

export type Recent = {
  id: string;
  title: string;
  subject: string;
  href: string;
  visitedAt: number;
};

export const STORAGE_KEYS = {
  bookmarks: "td.bookmarks",
  notes: "td.notes",
  progress: "td.progress",
  recents: "td.recents",
  language: "td.language",
  teachingEngineOcrText: "td.teaching-engine.ocr-text",
  teachingEngineExtracted: "td.teaching-engine.extracted",
  teachingEngineExtractedItems: "td.teaching-engine.extracted-items",
  teachingEngineStudentProfile: "td.teaching-engine.student-profile",
  teachingEngineDepthOptions: "td.teaching-engine.depth-options",
  teachingEngineOutputOptions: "td.teaching-engine.output-options",
  teachingEngineOutputSelectionMode: "td.teaching-engine.output-selection-mode",
  teachingEngineVisualStyle: "td.teaching-engine.visual-style",
  teachingEngineExplanationStyle: "td.teaching-engine.explanation-style",
  teachingEngineObjective: "td.teaching-engine.objective",
  teachingEnginePrompt: "td.teaching-engine.prompt",
  teachingEngineResponse: "td.teaching-engine.response",
  teachingEngineImageSpec: "td.teaching-engine.image-spec",
  teachingEngineImageAnalysis: "td.teaching-engine.image-analysis",
  teachingEngineCards: "td.teaching-engine.cards",
  teachingEngineWorkflowStep: "td.teaching-engine.workflow-step",
} as const;

export function clearTeachingRunDerivedState() {
  if (!isBrowser) return;

  const keysToReset = [
    STORAGE_KEYS.teachingEnginePrompt,
    STORAGE_KEYS.teachingEngineResponse,
    STORAGE_KEYS.teachingEngineImageSpec,
    STORAGE_KEYS.teachingEngineImageAnalysis,
    STORAGE_KEYS.teachingEngineCards,
  ];

  for (const key of keysToReset) {
    window.localStorage.removeItem(key);
  }
}

export type Language = "en" | "hi" | "mr";

export function pushRecent(rec: Omit<Recent, "visitedAt">) {
  if (!isBrowser) return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.recents);
    const list: Recent[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((r) => r.id !== rec.id);
    const next = [{ ...rec, visitedAt: Date.now() }, ...filtered].slice(0, 12);
    window.localStorage.setItem(STORAGE_KEYS.recents, JSON.stringify(next));
  } catch {}
}