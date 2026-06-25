import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck, Check, NotebookPen } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Stars } from "@/components/Stars";
import { TeacherNoteCard } from "@/components/TeacherNoteCard";
import { ChapterNavigation } from "@/components/chapter/ChapterNavigation";
import { FormulaCard } from "@/components/chapter/FormulaCard";
import { CHAPTERS, findChapter, getSubject } from "@/lib/data";
import {
  STORAGE_KEYS,
  pushRecent,
  useLocalStorage,
  type Bookmark as BM,
  type Note,
  type Progress,
} from "@/lib/storage";

const TABS = [
  "Overview",
  "Deep Understanding",
  "Visual Breakdown",
  "Formula Origin",
  "Solved Examples",
  "Common Mistakes",
  "Revision Notes",
] as const;

export const Route = createFileRoute("/chapter/$subject/$chapter")({
  head: ({ params }) => {
    const c = findChapter(params.chapter);
    return {
      meta: [
        { title: `${c?.title ?? "Chapter"} — Teacher's Depth` },
        { name: "description", content: c?.summary ?? "Deep chapter notes." },
      ],
    };
  },
  component: ChapterPage,
  notFoundComponent: () => (
    <AppShell back={{ to: "/" }}>
      <p className="text-sm text-muted-foreground">Chapter not found.</p>
    </AppShell>
  ),
});

function ChapterPage() {
  const { chapter: chapterId, subject: subjectKey } = Route.useParams();
  const chapter = findChapter(chapterId);
  if (!chapter) throw notFound();
  const subject = getSubject(subjectKey)!;
  const [active, setActive] = useState(0);
  const [bookmarks, setBookmarks] = useLocalStorage<BM[]>(STORAGE_KEYS.bookmarks, []);
  const [notes, setNotes] = useLocalStorage<Note[]>(STORAGE_KEYS.notes, []);
  const [progress, setProgress] = useLocalStorage<Progress>(STORAGE_KEYS.progress, {
    completed: [],
    todayMinutes: 0,
    weekly: [0, 0, 0, 0, 0, 0, 0],
    streak: 0,
    lastStudyDay: "",
  });
  const [draft, setDraft] = useState("");

  useEffect(() => {
    pushRecent({
      id: chapter.id,
      title: chapter.title,
      subject: subject.name,
      href: `/chapter/${chapter.subject}/${chapter.id}`,
    });
  }, [chapter, subject.name]);

  const isCompleted = progress.completed.includes(chapter.id);
  function toggleComplete() {
    setProgress((p) => ({
      ...p,
      completed: isCompleted
        ? p.completed.filter((x) => x !== chapter!.id)
        : [...p.completed, chapter!.id],
      todayMinutes: p.todayMinutes + (isCompleted ? 0 : 5),
    }));
  }

  function toggleBookmark(b: Omit<BM, "addedAt">) {
    setBookmarks((list) => {
      const exists = list.find((x) => x.id === b.id);
      if (exists) return list.filter((x) => x.id !== b.id);
      return [{ ...b, addedAt: Date.now() }, ...list];
    });
  }
  const isBookmarked = (id: string) => bookmarks.some((b) => b.id === id);

  const chapterBmId = `chapter:${chapter.id}`;
  const chapterIndex = CHAPTERS.findIndex((c) => c.id === chapter.id);
  const previousChapter = chapterIndex > 0 ? CHAPTERS[chapterIndex - 1] : undefined;
  const nextChapter = chapterIndex >= 0 && chapterIndex < CHAPTERS.length - 1 ? CHAPTERS[chapterIndex + 1] : undefined;

  function addNote() {
    if (!draft.trim()) return;
    setNotes((n) => [
      { id: `${Date.now()}`, title: chapter!.title, body: draft.trim(), updatedAt: Date.now() },
      ...n,
    ]);
    setDraft("");
  }

  return (
    <AppShell back={{ to: `/subjects/${subject.key}`, label: subject.name }}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Stars value={chapter.importance} />
        <button
          onClick={() =>
            toggleBookmark({
              id: chapterBmId,
              kind: "chapter",
              title: chapter.title,
              subtitle: subject.name,
              href: `/chapter/${chapter.subject}/${chapter.id}`,
            })
          }
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-foreground/80 hover:text-foreground"
        >
          {isBookmarked(chapterBmId) ? <BookmarkCheck size={12} className="text-primary" /> : <Bookmark size={12} />}
          {isBookmarked(chapterBmId) ? "Bookmarked" : "Bookmark"}
        </button>
        <button
          onClick={toggleComplete}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
            isCompleted ? "border-primary/40 bg-primary/15 text-primary" : "border-border bg-card/60 text-foreground/80"
          }`}
        >
          <Check size={12} /> {isCompleted ? "Completed" : "Mark complete"}
        </button>
      </div>

      <h1 className="text-3xl font-black tracking-tight text-foreground">{chapter.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{chapter.summary}</p>

      <div className="-mx-4 mt-5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-2">
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setActive(i)}
              className={
                "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition " +
                (i === active
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-elegant)]"
                  : "border border-border bg-card/60 text-muted-foreground hover:text-foreground")
              }
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <section className="mt-5 space-y-4">
        {active === 0 && (
          <Card>
            <p className="text-[15px] leading-relaxed text-foreground">{chapter.overview}</p>
          </Card>
        )}

        {active === 1 && (
          <>
            <Card>
              <p className="text-[15px] leading-relaxed text-foreground">{chapter.deepUnderstanding}</p>
            </Card>
            <div className="grid gap-3">
              {chapter.teacherNotes.slice(0, 2).map((n, i) => (
                <TeacherNoteCard key={i} note={n} />
              ))}
            </div>
          </>
        )}

        {active === 2 && (
          <div className="grid gap-3">
            {chapter.visualBreakdown.map((v, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card/70 p-4 backdrop-blur">
                <div className="text-sm font-bold text-foreground">{v.title}</div>
                <p className="mt-1 text-xs text-muted-foreground">{v.description}</p>
                {v.svg && (
                  <div
                    className="mt-3 overflow-hidden rounded-xl bg-background/40 p-3"
                    dangerouslySetInnerHTML={{ __html: v.svg }}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {active === 3 && (
          <div className="grid gap-3">
            {chapter.formulas.length === 0 && (
              <Card>
                <p className="text-sm text-muted-foreground">No formulas in this chapter.</p>
              </Card>
            )}
            {chapter.formulas.map((f) => {
              const id = `formula:${chapter.id}:${f.id}`;
              return (
                <FormulaCard
                  key={f.id}
                  formula={f}
                  chapterId={chapter.id}
                  isBookmarked={isBookmarked(id)}
                  onBookmarkToggle={() =>
                    toggleBookmark({
                      id,
                      kind: "formula",
                      title: f.title,
                      subtitle: chapter.title,
                      href: `/chapter/${chapter.subject}/${chapter.id}`,
                    })
                  }
                />
              );
            })}
            {chapter.teacherNotes
              .filter((n) => n.kind === "why")
              .map((n, i) => (
                <TeacherNoteCard key={i} note={n} />
              ))}
          </div>
        )}

        {active === 4 && (
          <div className="grid gap-3">
            {chapter.examples.map((e, i) => {
              const id = `example:${chapter.id}:${e.id}`;
              return (
                <div key={e.id} className="rounded-2xl border border-border bg-card/70 p-4 backdrop-blur">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[11px] font-semibold text-primary">
                        Example {i + 1}
                      </span>
                      <div className="mt-2 text-sm font-semibold text-foreground">{e.title}</div>
                    </div>
                    <button
                      onClick={() =>
                        toggleBookmark({
                          id,
                          kind: "example",
                          title: e.title,
                          subtitle: chapter.title,
                          href: `/chapter/${chapter.subject}/${chapter.id}`,
                        })
                      }
                      className="text-muted-foreground hover:text-primary"
                    >
                      {isBookmarked(id) ? <BookmarkCheck size={16} className="text-primary" /> : <Bookmark size={16} />}
                    </button>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Q. </span>
                    {e.problem}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{e.solution}</p>
                </div>
              );
            })}
          </div>
        )}

        {active === 5 && (
          <div className="grid gap-3">
            {chapter.mistakes.map((m) => (
              <div key={m.id} className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-rose-300">Wrong</div>
                <p className="mt-1 text-sm text-foreground">{m.wrong}</p>
                <div className="mt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">Right</div>
                <p className="mt-1 text-sm text-foreground">{m.right}</p>
              </div>
            ))}
            {chapter.teacherNotes
              .filter((n) => n.kind === "error")
              .map((n, i) => (
                <TeacherNoteCard key={i} note={n} />
              ))}
          </div>
        )}

        {active === 6 && (
          <div className="space-y-4">
            <Card>
              <ul className="space-y-2 text-sm text-foreground">
                {chapter.revision.map((r, i) => (
                  <li key={i} className="flex gap-2">
                    <Check size={16} className="mt-0.5 shrink-0 text-primary" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <div className="grid gap-3">
              {chapter.teacherNotes.map((n, i) => (
                <TeacherNoteCard key={i} note={n} />
              ))}
            </div>

            <Card>
              <div className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                <NotebookPen size={14} /> My Notes
              </div>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Jot anything you don't want to forget…"
                className="min-h-[80px] w-full resize-y rounded-xl border border-border bg-background/40 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="mt-2 flex justify-end">
                <button
                  onClick={addNote}
                  className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground"
                >
                  Save note
                </button>
              </div>
              {notes.filter((n) => n.title === chapter.title).length > 0 && (
                <ul className="mt-3 space-y-2">
                  {notes
                    .filter((n) => n.title === chapter.title)
                    .map((n) => (
                      <li key={n.id} className="rounded-xl bg-background/40 p-3 text-xs text-foreground">
                        <div className="whitespace-pre-wrap">{n.body}</div>
                        <button
                          onClick={() => setNotes((all) => all.filter((x) => x.id !== n.id))}
                          className="mt-2 text-[11px] text-muted-foreground hover:text-destructive"
                        >
                          Delete
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </Card>
          </div>
        )}
      </section>

      <div className="mt-8 space-y-3">
        <ChapterNavigation previousChapter={previousChapter} nextChapter={nextChapter} subject={subject} />
        <div className="flex justify-between text-xs text-muted-foreground">
          <Link to="/subjects/$slug" params={{ slug: subject.key }} className="hover:text-foreground">
            ← All {subject.name} chapters
          </Link>
          <Link to="/companion" className="hover:text-foreground">
            Ask AI about this →
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 p-5 shadow-[var(--shadow-elegant)] backdrop-blur">
      {children}
    </div>
  );
}
