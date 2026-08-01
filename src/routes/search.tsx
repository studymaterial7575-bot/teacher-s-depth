import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CHAPTERS, SUBJECTS } from "@/lib/data";

type SearchParams = { q?: string };
type SearchMatch<T> = { score: number; item: T };
type NoteResult = { chapter: (typeof CHAPTERS)[number]; text: string };

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "between",
  "by",
  "define",
  "describe",
  "difference",
  "does",
  "equation",
  "example",
  "examples",
  "explain",
  "find",
  "for",
  "formula",
  "from",
  "how",
  "in",
  "is",
  "law",
  "of",
  "on",
  "principle",
  "prove",
  "show",
  "solve",
  "state",
  "the",
  "to",
  "types",
  "what",
  "when",
  "where",
  "which",
  "why",
]);

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function scoreMatch(content: string, normalizedQuery: string, queryTokens: string[]) {
  const normalizedContent = normalizeText(content);
  if (!normalizedContent) return 0;
  if (normalizedQuery && normalizedContent.includes(normalizedQuery)) {
    return 100 + normalizedQuery.length;
  }

  if (queryTokens.length === 0) return 0;

  const contentTokens = new Set(tokenize(content));
  const matchedTokens = queryTokens.filter((token) => contentTokens.has(token));
  if (matchedTokens.length === 0) return 0;

  const matchRatio = matchedTokens.length / queryTokens.length;
  const minimumMatches = queryTokens.length <= 2 ? queryTokens.length : 2;
  if (matchedTokens.length < minimumMatches && matchRatio < 0.75) {
    return 0;
  }

  return Math.round(matchRatio * 100) + matchedTokens.length;
}

function rankMatches<T>(
  items: T[],
  query: string,
  getContent: (item: T) => string,
): T[] {
  const normalizedQuery = normalizeText(query);
  const queryTokens = tokenize(query);

  return items
    .map((item) => ({
      item,
      score: scoreMatch(getContent(item), normalizedQuery, queryTokens),
    }))
    .filter((match): match is SearchMatch<T> => match.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((match) => match.item);
}

function getChapterSearchText(chapter: (typeof CHAPTERS)[number]) {
  return [
    chapter.title,
    chapter.summary,
    chapter.overview,
    chapter.deepUnderstanding,
    ...(chapter.searchKeywords ?? []),
    ...chapter.visualBreakdown.flatMap((item) => [item.title, item.description]),
    ...chapter.teacherNotes.map((note) => note.text),
    ...(chapter.topicSections ?? []).flatMap((topic) => [
      topic.title,
      topic.definition,
      topic.formula,
      topic.explanation,
      topic.workedExample.problem,
      topic.workedExample.solution,
      ...topic.commonMistakes,
      ...topic.revisionNotes,
      ...topic.searchKeywords,
    ]),
  ].join(" ");
}

function getFormulaSearchText(entry: { chapter: (typeof CHAPTERS)[number]; f: (typeof CHAPTERS)[number]["formulas"][number] }) {
  return [
    entry.chapter.title,
    SUBJECTS.find((subject) => subject.key === entry.chapter.subject)?.name ?? "",
    entry.f.title,
    entry.f.expression,
    entry.f.meaning,
  ].join(" ");
}

function getExampleSearchText(entry: { chapter: (typeof CHAPTERS)[number]; e: (typeof CHAPTERS)[number]["examples"][number] }) {
  return [entry.chapter.title, entry.e.title, entry.e.problem, entry.e.solution].join(" ");
}

function getNoteSearchText(entry: NoteResult) {
  return [entry.chapter.title, entry.text].join(" ");
}

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    q: typeof s.q === "string" ? s.q : "",
  }),
  head: () => ({
    meta: [{ title: "Search — Teacher's Depth" }],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q: initial } = Route.useSearch();
  const [q, setQ] = useState(initial ?? "");

  useEffect(() => {
    setQ(initial ?? "");
  }, [initial]);

  const results = useMemo(() => {
    const needle = q.trim();
    if (!needle) return { chapters: [], formulas: [], examples: [], notes: [] };
    const chapters = rankMatches(CHAPTERS, needle, getChapterSearchText);
    const formulas = rankMatches(
      CHAPTERS.flatMap((chapter) => chapter.formulas.map((f) => ({ chapter, f }))),
      needle,
      getFormulaSearchText,
    );
    const examples = rankMatches(
      CHAPTERS.flatMap((chapter) => chapter.examples.map((e) => ({ chapter, e }))),
      needle,
      getExampleSearchText,
    );
    const notes = rankMatches(
      CHAPTERS.flatMap((chapter) => [
        ...chapter.revision.map((text) => ({ chapter, text })),
        ...chapter.teacherNotes.map((note) => ({ chapter, text: note.text })),
        ...chapter.mistakes.map((mistake) => ({
          chapter,
          text: `Common mistake: ${mistake.wrong} Correct approach: ${mistake.right}`,
        })),
        ...(chapter.topicSections ?? []).flatMap((topic) => [
          {
            chapter,
            text: `${topic.title} definition: ${topic.definition}`,
          },
          {
            chapter,
            text: `${topic.title} explanation: ${topic.explanation}`,
          },
          {
            chapter,
            text: `${topic.title} worked example: ${topic.workedExample.problem} ${topic.workedExample.solution}`,
          },
          {
            chapter,
            text: `${topic.title} revision: ${topic.revisionNotes.join(" ")}`,
          },
          {
            chapter,
            text: `${topic.title} keywords: ${topic.searchKeywords.join(" ")}`,
          },
          ...topic.commonMistakes.map((mistake) => ({
            chapter,
            text: `${topic.title} common mistake: ${mistake}`,
          })),
        ]),
        ...chapter.visualBreakdown.map((item) => ({
          chapter,
          text: `${item.title} ${item.description}`,
        })),
      ]),
      needle,
      getNoteSearchText,
    );
    return { chapters, formulas, examples, notes };
  }, [q]);

  const totalLocalResults =
    results.chapters.length + results.formulas.length + results.examples.length + results.notes.length;
  const hasNoLocalResults = Boolean(q.trim()) && totalLocalResults === 0;

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
        <p className="text-sm text-muted-foreground">Start typing to search across chapters, formulas, solved examples, notes and textbook content.</p>
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
          <ResultGroup label="Notes">
            {results.notes.map(({ chapter, text }, i) => (
              <Link key={i} to="/chapter/$subject/$chapter" params={{ subject: chapter.subject, chapter: chapter.id }} className="block rounded-2xl border border-border bg-card/60 p-3">
                <div className="text-sm text-foreground">{text}</div>
                <div className="text-[11px] text-muted-foreground">{chapter.title}</div>
              </Link>
            ))}
          </ResultGroup>
        )}

        {hasNoLocalResults && (
          <p className="text-sm text-muted-foreground">No matching content found in the local database.</p>
        )}
      </div>
    </AppShell>
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