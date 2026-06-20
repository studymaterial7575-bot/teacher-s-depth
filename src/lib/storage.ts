import { useEffect, useState } from "react";

const isBrowser = typeof window !== "undefined";

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    if (!isBrowser) return initial;
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    if (!isBrowser) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
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
} as const;

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