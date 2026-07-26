import type { RecommendationSummary } from "@/types/teaching-engine";

type ModuleRecommendationsProps = {
  recommendationSummary: RecommendationSummary;
};

export function ModuleRecommendations({ recommendationSummary }: ModuleRecommendationsProps) {
  return (
    <section className="rounded-3xl border border-border bg-card/70 p-4 shadow-[var(--shadow-elegant)] backdrop-blur md:p-5">
      <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Recommended Modules</div>
      <div className="mb-3 rounded-2xl border border-border bg-background/50 p-3">
        <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Recommended because</div>
        <div className="flex flex-wrap gap-2">
          {recommendationSummary.reasons.length > 0 ? (
            recommendationSummary.reasons.map((reason) => (
              <span key={reason} className="rounded-full border border-border bg-card/70 px-2.5 py-1 text-xs text-foreground">
                {reason}
              </span>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">Type a question to see local module recommendations.</span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {recommendationSummary.modules.length > 0 ? (
          recommendationSummary.modules.map((module) => (
            <span key={module} className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs text-foreground">
              {module}
            </span>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">No recommendation yet.</span>
        )}
      </div>
    </section>
  );
}
