import { Check } from "lucide-react";

type ExamPrepModeProps = {
  revision: string[];
};

export function ExamPrepMode({ revision }: ExamPrepModeProps) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 p-5 shadow-[var(--shadow-elegant)] backdrop-blur">
      <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">Exam Prep Mode</div>
      <p className="mb-4 text-sm text-muted-foreground">
        Fast, high-yield points to revise before exams.
      </p>
      <ul className="space-y-2 text-sm text-foreground">
        {revision.map((point, i) => (
          <li key={i} className="flex gap-2">
            <Check size={16} className="mt-0.5 shrink-0 text-primary" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
