import type { AnalysisResult } from "./types";

export function ImportanceBadge({ result }: { result: AnalysisResult }) {
  const stars = result.importanceStars ?? 3;
  const label =
    result.importanceLabel ??
    (stars === 5
      ? "Very Important"
      : stars === 4
        ? "Important"
        : stars === 3
          ? "Moderate"
          : "Optional");
  const note = result.teacherNote ?? "";

  const tone =
    stars === 5
      ? "from-primary/30 to-accent/20 text-primary border-primary/40"
      : stars === 4
        ? "from-primary/20 to-primary/5 text-primary border-primary/30"
        : stars === 3
          ? "from-accent/20 to-accent/5 text-accent border-accent/30"
          : "from-muted to-muted/40 text-muted-foreground border-border";

  return (
    <div
      className={`mb-3 rounded-2xl border bg-gradient-to-br p-3.5 shadow-[var(--shadow-elegant)] ${tone}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="text-base leading-none tracking-[2px]"
            aria-label={`${stars} of 5 stars`}
          >
            {"★".repeat(stars)}
            <span className="opacity-25">{"★".repeat(5 - stars)}</span>
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.18em]">
            {label}
          </span>
        </div>
      </div>
      {note && (
        <p className="mt-2 text-xs leading-relaxed text-foreground">
          <span className="font-semibold uppercase tracking-wider text-muted-foreground">
            Teacher Note:{" "}
          </span>
          {note}
        </p>
      )}
    </div>
  );
}