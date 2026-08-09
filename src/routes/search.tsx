import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { searchEducationContent } from "@/lib/search-index";

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

function SearchPage() {
  const { q: initial } = Route.useSearch();
  const [q, setQ] = useState(initial ?? "");

  useEffect(() => {
    setQ(initial ?? "");
  }, [initial]);

  const results = useMemo(() => {
    const needle = q.trim();
    return {
      indexed: needle ? searchEducationContent(needle) : [],
    };
  }, [q]);

  const hasNoResults = Boolean(q.trim()) && results.indexed.length === 0;

  return (
    <AppShell back={{ to: "/" }} title="Search everything">
      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-border bg-card/70 px-3 py-2 backdrop-blur">
        <SearchIcon size={16} className="text-muted-foreground" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search topics, chapters, formulas, examples…"
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      {!q.trim() && (
        <p className="text-sm text-muted-foreground">
          Search actual educational content such as Electricity, Quadratic Formula, Ohm's Law, Grammar, Map Work, Hindi, Marathi, or Computer.
        </p>
      )}

      <div className="space-y-6">
        {results.indexed.length > 0 && (
          <ResultGroup label="Matching educational content">
            {results.indexed.map((item) => (
              <a
                key={item.id}
                href={item.href}
                className="block rounded-2xl border border-border bg-card/60 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-foreground">{item.title}</div>
                  <span className="rounded-full border border-border bg-background/60 px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    {item.kind}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">{item.subtitle}</div>
                <p className="mt-2 text-sm text-foreground/90">{item.content}</p>
              </a>
            ))}
          </ResultGroup>
        )}

        {hasNoResults && (
          <p className="text-sm text-muted-foreground">No matching content found in the indexed educational database.</p>
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