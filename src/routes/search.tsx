import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import type { AnalysisResult } from "@/components/companion/types";
import { CHAPTERS, SUBJECTS } from "@/lib/data";

type SearchParams = { q?: string };

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    q: typeof s.q === "string" ? s.q : "",
  }),
  head: () => ({
    meta: [{ title: "Search — Teacher's Depth" }],
  }),
  component: SearchPage,
});

const ACADEMIC_KEYWORDS = [
  "what", "why", "how", "when", "where", "which",
  "explain", "define", "describe", "calculate", "solve",
  "find", "prove", "derive", "state", "evaluate", "compare",
  "formula", "equation", "theorem", "law", "principle",
  "difference between", "example", "types of",
];

function isAcademicQuestion(text: string): boolean {
  const lower = text.trim().toLowerCase();
  if (!lower) return false;
  if (lower.endsWith("?")) return true;
  return ACADEMIC_KEYWORDS.some((kw) => lower.includes(kw));
}

function SearchPage() {
  const { q: initial } = Route.useSearch();
  const [q, setQ] = useState(initial ?? "");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AnalysisResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return { chapters: [], formulas: [], examples: [], notes: [] };
    const chapters = CHAPTERS.filter((c) =>
      [c.title, c.summary, c.overview].some((t) => t.toLowerCase().includes(needle)),
    );
    const formulas = CHAPTERS.flatMap((c) =>
      c.formulas
        .filter((f) => `${f.title} ${f.expression} ${f.meaning}`.toLowerCase().includes(needle))
        .map((f) => ({ chapter: c, f })),
    );
    const examples = CHAPTERS.flatMap((c) =>
      c.examples
        .filter((e) => `${e.title} ${e.problem} ${e.solution}`.toLowerCase().includes(needle))
        .map((e) => ({ chapter: c, e })),
    );
    const notes = CHAPTERS.flatMap((c) =>
      c.revision.filter((r) => r.toLowerCase().includes(needle)).map((r) => ({ chapter: c, r })),
    );
    return { chapters, formulas, examples, notes };
  }, [q]);

  const totalLocalResults =
    results.chapters.length + results.formulas.length + results.examples.length + results.notes.length;
  const hasNoLocalResults = Boolean(q.trim()) && totalLocalResults === 0;
  const shouldTriggerAI = hasNoLocalResults && isAcademicQuestion(q);

  useEffect(() => {
    setAiResult(null);
    setAiError(null);
    setAiLoading(false);
    if (!shouldTriggerAI) return;

    let cancelled = false;
    setAiLoading(true);

    (async () => {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject: "General", text: q.trim(), files: [] }),
        });
        if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
        if (!cancelled) setAiResult((await res.json()) as AnalysisResult);
      } catch (e: unknown) {
        if (!cancelled) {
          setAiError(e instanceof Error ? e.message : "Something went wrong.");
        }
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [q, shouldTriggerAI]);

  return (
    <AppShell back={{ to: "/" }} title="Search everything">
      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-border bg-card/70 px-3 py-2 backdrop-blur">
        <SearchIcon size={16} className="text-muted-foreground" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type a chapter, formula, example…"
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      {!q.trim() && (
        <p className="text-sm text-muted-foreground">Start typing to search across chapters, formulas, examples and revision notes.</p>
      )}

      <div className="space-y-6">
        {results.chapters.length > 0 && (
          <ResultGroup label="Chapters">
            {results.chapters.map((c) => (
              <Link
                key={c.id}
                to="/chapter/$subject/$chapter"
                params={{ subject: c.subject, chapter: c.id }}
                className="block rounded-2xl border border-border bg-card/60 p-3"
              >
                <div className="text-sm font-semibold text-foreground">{c.title}</div>
                <div className="text-[11px] text-muted-foreground">
                  {SUBJECTS.find((s) => s.key === c.subject)?.name} · {c.summary}
                </div>
              </Link>
            ))}
          </ResultGroup>
        )}
        {results.formulas.length > 0 && (
          <ResultGroup label="Formulas">
            {results.formulas.map(({ chapter, f }) => (
              <Link key={`${chapter.id}-${f.id}`} to="/chapter/$subject/$chapter" params={{ subject: chapter.subject, chapter: chapter.id }} className="block rounded-2xl border border-border bg-card/60 p-3">
                <div className="font-mono text-sm text-foreground">{f.expression}</div>
                <div className="text-[11px] text-muted-foreground">{f.title} · {chapter.title}</div>
              </Link>
            ))}
          </ResultGroup>
        )}
        {results.examples.length > 0 && (
          <ResultGroup label="Examples">
            {results.examples.map(({ chapter, e }) => (
              <Link key={`${chapter.id}-${e.id}`} to="/chapter/$subject/$chapter" params={{ subject: chapter.subject, chapter: chapter.id }} className="block rounded-2xl border border-border bg-card/60 p-3">
                <div className="text-sm font-semibold text-foreground">{e.title}</div>
                <div className="text-[11px] text-muted-foreground">{chapter.title} · {e.problem}</div>
              </Link>
            ))}
          </ResultGroup>
        )}
        {results.notes.length > 0 && (
          <ResultGroup label="Revision Notes">
            {results.notes.map(({ chapter, r }, i) => (
              <Link key={i} to="/chapter/$subject/$chapter" params={{ subject: chapter.subject, chapter: chapter.id }} className="block rounded-2xl border border-border bg-card/60 p-3">
                <div className="text-sm text-foreground">{r}</div>
                <div className="text-[11px] text-muted-foreground">{chapter.title}</div>
              </Link>
            ))}
          </ResultGroup>
        )}

        {/* No local results — not an academic question */}
        {hasNoLocalResults && !shouldTriggerAI && (
          <p className="text-sm text-muted-foreground">No matches for "{q}".</p>
        )}

        {/* No local results — academic question: loading */}
        {shouldTriggerAI && aiLoading && (
          <div className="space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">AI Analysis</div>
            <Skeleton className="h-4 w-3/4 rounded-xl" />
            <Skeleton className="h-4 w-full rounded-xl" />
            <Skeleton className="h-4 w-5/6 rounded-xl" />
            <Skeleton className="h-4 w-full rounded-xl" />
            <Skeleton className="h-4 w-2/3 rounded-xl" />
          </div>
        )}

        {/* No local results — academic question: error */}
        {shouldTriggerAI && !aiLoading && aiError && (
          <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            {aiError}
          </p>
        )}

        {/* No local results — academic question: result */}
        {shouldTriggerAI && !aiLoading && aiResult && (
          <AiResultPanel result={aiResult} />
        )}
      </div>
    </AppShell>
  );
}

function AiResultPanel({ result }: { result: AnalysisResult }) {
  return (
    <div className="space-y-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">AI Analysis</div>
      {result.topic && (
        <div className="text-xs text-muted-foreground">
          Topic · <span className="text-foreground">{result.topic}</span>
        </div>
      )}

      <div className="space-y-2">
        <SectionLabel>Step-by-step Solution</SectionLabel>
        <div className="whitespace-pre-wrap rounded-2xl border border-border bg-card/60 p-4 text-sm leading-relaxed text-foreground">
          {result.solution || "—"}
        </div>
      </div>

      <div className="space-y-2">
        <SectionLabel>Explanation</SectionLabel>
        <div className="whitespace-pre-wrap rounded-2xl border border-border bg-card/60 p-4 text-sm leading-relaxed text-foreground">
          {result.why || "—"}
        </div>
      </div>

      {(result.topic || result.teacherNote) && (
        <div className="space-y-2">
          <SectionLabel>Final Answer</SectionLabel>
          <div className="rounded-2xl border border-border bg-card/60 p-4 text-sm text-foreground">
            {result.topic && <div className="font-semibold">{result.topic}</div>}
            {result.teacherNote && (
              <div className="mt-1 text-muted-foreground">{result.teacherNote}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">{children}</div>
  );
}

function ResultGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">{label}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}