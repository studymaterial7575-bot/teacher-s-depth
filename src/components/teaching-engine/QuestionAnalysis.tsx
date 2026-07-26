import type { QuestionAnalysis } from "@/types/teaching-engine";

type QuestionAnalysisProps = {
  analysis: QuestionAnalysis;
};

export function QuestionAnalysisCard({ analysis }: QuestionAnalysisProps) {
  const fields = [
    { label: "Subject", value: analysis.subject },
    { label: "Chapter", value: analysis.chapter },
    { label: "Question Type", value: analysis.questionType },
    { label: "Difficulty", value: analysis.difficulty },
    { label: "Skills Required", value: analysis.skillsRequired.join(", ") },
    { label: "Visual Required", value: analysis.visualRequired },
    { label: "Formula Required", value: analysis.formulaRequired },
    { label: "Exam Importance", value: analysis.examImportance },
  ];

  return (
    <section className="rounded-3xl border border-border bg-card/70 p-4 shadow-[var(--shadow-elegant)] backdrop-blur md:p-5">
      <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Question Analysis</div>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((item) => (
          <div key={item.label} className="rounded-2xl border border-border bg-background/50 p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{item.label}</div>
            <div className="mt-1 text-sm text-foreground">{item.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
