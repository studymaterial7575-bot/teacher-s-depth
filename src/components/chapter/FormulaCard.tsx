import { Bookmark, BookmarkCheck, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { Formula } from "@/lib/data";

interface FormulaCardProps {
  formula: Formula;
  chapterId: string;
  isBookmarked: boolean;
  onBookmarkToggle: () => void;
}

export function FormulaCard({
  formula,
  chapterId,
  isBookmarked,
  onBookmarkToggle,
}: FormulaCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-border bg-card/70 p-4 backdrop-blur transition">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-[0.18em] text-primary">{formula.title}</div>
          <div className="mt-2 font-mono text-base text-foreground">{formula.expression}</div>
        </div>
        <button
          onClick={onBookmarkToggle}
          className="shrink-0 text-muted-foreground transition hover:text-primary"
          aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
          data-chapter-id={chapterId}
        >
          {isBookmarked ? (
            <BookmarkCheck size={16} className="text-primary" />
          ) : (
            <Bookmark size={16} />
          )}
        </button>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 flex w-full items-center justify-between gap-2 rounded-xl bg-background/40 p-3 text-xs text-muted-foreground transition hover:text-foreground"
      >
        <div className="text-left">
          <span className="font-semibold text-foreground">Why this formula?</span>
          {!expanded && <p className="mt-1 line-clamp-1">{formula.meaning}</p>}
        </div>
        {expanded ? <ChevronUp size={14} className="shrink-0" /> : <ChevronDown size={14} className="shrink-0" />}
      </button>

      {expanded && (
        <p className="mt-3 rounded-xl bg-background/40 p-3 text-xs text-muted-foreground">
          {formula.meaning}
        </p>
      )}
    </div>
  );
}
