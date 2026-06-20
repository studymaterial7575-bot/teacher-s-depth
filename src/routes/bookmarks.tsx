import { createFileRoute, Link } from "@tanstack/react-router";
import { Bookmark as BookmarkIcon, Flame, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { STORAGE_KEYS, useLocalStorage, type Bookmark, type Note, type Progress } from "@/lib/storage";
import { CHAPTERS } from "@/lib/data";

export const Route = createFileRoute("/bookmarks")({
  head: () => ({
    meta: [
      { title: "My Saved — Teacher's Depth" },
      { name: "description", content: "Bookmarked chapters, formulas, examples and personal notes." },
    ],
  }),
  component: BookmarksPage,
});

function BookmarksPage() {
  const [bookmarks, setBookmarks] = useLocalStorage<Bookmark[]>(STORAGE_KEYS.bookmarks, []);
  const [notes, setNotes] = useLocalStorage<Note[]>(STORAGE_KEYS.notes, []);
  const [progress] = useLocalStorage<Progress>(STORAGE_KEYS.progress, {
    completed: [],
    todayMinutes: 0,
    weekly: [0, 0, 0, 0, 0, 0, 0],
    streak: 0,
    lastStudyDay: "",
  });
  const completionPct = Math.min(100, Math.round((progress.completed.length / Math.max(CHAPTERS.length, 1)) * 100));
  const max = Math.max(1, ...progress.weekly);

  const groups = (["chapter", "formula", "example", "note"] as const).map((k) => ({
    k,
    items: bookmarks.filter((b) => b.kind === k),
  }));

  return (
    <AppShell back={{ to: "/" }} title="My Library">
      {/* Progress block */}
      <section className="mb-6 rounded-3xl border border-border bg-card/70 p-5 shadow-[var(--shadow-elegant)] backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Progress</div>
            <div className="text-2xl font-black text-foreground">{completionPct}%</div>
            <div className="text-xs text-muted-foreground">{progress.completed.length} / {CHAPTERS.length} chapters complete</div>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-background/40 px-3 py-1 text-xs text-amber-300">
            <Flame size={12} /> {progress.streak}-day streak
          </div>
        </div>
        <div className="mt-4 flex items-end gap-1.5">
          {progress.weekly.map((m, i) => (
            <div key={i} className="flex-1">
              <div
                className="rounded-t-md"
                style={{
                  height: `${(m / max) * 60 + 4}px`,
                  background: "var(--gradient-primary)",
                  opacity: 0.4 + (m / max) * 0.6,
                }}
              />
              <div className="mt-1 text-center text-[10px] text-muted-foreground">{["M","T","W","T","F","S","S"][i]}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-[11px] text-muted-foreground">Today: {progress.todayMinutes} min</div>
      </section>

      {/* Bookmarks */}
      <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-foreground">Bookmarks</h2>
      {bookmarks.length === 0 && (
        <p className="rounded-2xl border border-border bg-card/60 p-5 text-sm text-muted-foreground">
          You haven't bookmarked anything yet. Tap the <BookmarkIcon size={12} className="inline" /> icon inside any chapter.
        </p>
      )}
      <div className="space-y-5">
        {groups.map((g) => g.items.length > 0 && (
          <div key={g.k}>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">{g.k}s</div>
            <div className="space-y-2">
              {g.items.map((b) => (
                <div key={b.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card/60 p-3">
                  <Link to={b.href} className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">{b.title}</div>
                    {b.subtitle && <div className="truncate text-[11px] text-muted-foreground">{b.subtitle}</div>}
                  </Link>
                  <button
                    onClick={() => setBookmarks((list) => list.filter((x) => x.id !== b.id))}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Notes */}
      <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-[0.18em] text-foreground">My Notes</h2>
      {notes.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card/60 p-5 text-sm text-muted-foreground">No personal notes yet.</p>
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <div key={n.id} className="rounded-2xl border border-border bg-card/60 p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-[0.18em] text-primary">{n.title}</div>
                <button onClick={() => setNotes((all) => all.filter((x) => x.id !== n.id))} className="text-muted-foreground hover:text-destructive">
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{n.body}</p>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}