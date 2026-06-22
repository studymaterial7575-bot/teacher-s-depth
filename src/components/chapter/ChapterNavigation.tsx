import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Chapter, SubjectMeta } from "@/lib/data";

type ChapterNavigationProps = {
  previousChapter?: Chapter;
  nextChapter?: Chapter;
  subject: SubjectMeta;
};

export function ChapterNavigation({ previousChapter, nextChapter, subject }: ChapterNavigationProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {previousChapter ? (
        <Link
          to="/chapter/$subject/$chapter"
          params={{ subject: previousChapter.subject, chapter: previousChapter.id }}
          className="group rounded-2xl border border-border bg-card/60 p-4 backdrop-blur transition hover:border-primary/50"
        >
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Previous chapter
          </div>
          <div className="mt-2 flex items-start gap-3">
            <span className="mt-0.5 rounded-full border border-border bg-background/50 p-1 text-muted-foreground">
              <ChevronLeft size={14} />
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-foreground">
                {previousChapter.title}
              </div>
              <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {previousChapter.summary}
              </div>
            </div>
          </div>
        </Link>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-4 text-sm text-muted-foreground">
          You’re at the beginning of {subject.name}.
        </div>
      )}

      {nextChapter ? (
        <Link
          to="/chapter/$subject/$chapter"
          params={{ subject: nextChapter.subject, chapter: nextChapter.id }}
          className="group rounded-2xl border border-border bg-card/60 p-4 backdrop-blur transition hover:border-primary/50"
        >
          <div className="text-right text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Next chapter
          </div>
          <div className="mt-2 flex items-start justify-between gap-3">
            <div className="min-w-0 text-right">
              <div className="truncate text-sm font-semibold text-foreground">
                {nextChapter.title}
              </div>
              <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {nextChapter.summary}
              </div>
            </div>
            <span className="mt-0.5 rounded-full border border-border bg-background/50 p-1 text-muted-foreground">
              <ChevronRight size={14} />
            </span>
          </div>
        </Link>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-4 text-sm text-muted-foreground sm:text-right">
          You’ve reached the latest verified {subject.name} chapter.
        </div>
      )}
    </div>
  );
}
