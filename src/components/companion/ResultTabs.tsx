import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { TABS, type AnalysisResult } from "./types";
import { DiagramCard } from "./DiagramCard";

function Block({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4 pb-24 pt-2">{children}</div>;
}

function Prose({ text }: { text: string }) {
  return (
    <div className="whitespace-pre-wrap rounded-2xl border border-border bg-card p-4 text-[15px] leading-relaxed text-foreground shadow-[var(--shadow-elegant)]">
      {text}
    </div>
  );
}

export function ResultTabs({ result }: { result: AnalysisResult }) {
  const [emblaRef, embla] = useEmblaCarousel({ loop: false, align: "start" });
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!embla) return;
    const onSelect = () => setActive(embla.selectedScrollSnap());
    embla.on("select", onSelect);
    onSelect();
    return () => {
      embla.off("select", onSelect);
    };
  }, [embla]);

  const go = (i: number) => embla?.scrollTo(i);

  return (
    <div className="flex flex-col">
      {result.topic && (
        <div className="mb-3 px-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Topic · <span className="text-foreground">{result.topic}</span>
        </div>
      )}

      {/* Tab pills */}
      <div className="-mx-4 mb-3 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-2">
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => go(i)}
              className={
                "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition " +
                (i === active
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-elegant)]"
                  : "border border-border bg-secondary/60 text-muted-foreground hover:text-foreground")
              }
            >
              {i + 1}. {t}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {/* 1. Solution */}
          <div className="min-w-0 flex-[0_0_100%] pr-2">
            <Block>
              <Prose text={result.solution || "—"} />
            </Block>
          </div>

          {/* 2. Visual Diagrams */}
          <div className="min-w-0 flex-[0_0_100%] px-1">
            <Block>
              {result.diagrams?.length ? (
                result.diagrams.map((d, i) => <DiagramCard key={i} d={d} />)
              ) : (
                <Prose text="No diagrams returned." />
              )}
            </Block>
          </div>

          {/* 3. Simple Examples */}
          <div className="min-w-0 flex-[0_0_100%] px-1">
            <Block>
              {result.simpleExamples?.map((e, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-elegant)]"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      Example {i + 1}
                    </span>
                    <span className="text-sm font-semibold text-foreground">{e.title}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Q. </span>
                    {e.problem}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{e.steps}</p>
                </div>
              ))}
            </Block>
          </div>

          {/* 4. WHY */}
          <div className="min-w-0 flex-[0_0_100%] px-1">
            <Block>
              <Prose text={result.why || "—"} />
            </Block>
          </div>

          {/* 5. Common Doubts */}
          <div className="min-w-0 flex-[0_0_100%] px-1">
            <Block>
              {result.doubts?.map((d, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-elegant)]"
                >
                  <p className="text-sm font-semibold text-accent">Q. {d.q}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{d.a}</p>
                </div>
              ))}
            </Block>
          </div>

          {/* 6. Similar Examples */}
          <div className="min-w-0 flex-[0_0_100%] px-1">
            <Block>
              {(["easy", "moderate", "board"] as const).map((level) => (
                <div key={level} className="space-y-2">
                  <div className="px-1 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                    {level === "board" ? "Board Level" : level}
                  </div>
                  {result.similarExamples?.[level]?.map((q, i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-elegant)]"
                    >
                      <p className="text-sm font-medium text-foreground">{q.q}</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                        {q.a}
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </Block>
          </div>

          {/* 7. Videos */}
          <div className="min-w-0 flex-[0_0_100%] pl-2">
            <Block>
              {result.videos?.map((v, i) => (
                <a
                  key={i}
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(v.query)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-2xl border border-border bg-card p-4 transition hover:border-primary/60 hover:bg-secondary/70"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/90 text-destructive-foreground">
                      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">{v.title}</div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        Search: {v.query}
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </Block>
          </div>
        </div>
      </div>
    </div>
  );
}