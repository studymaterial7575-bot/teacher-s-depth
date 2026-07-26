import type { ChangeEvent } from "react";

type QuestionEditorProps = {
  questions: string;
  onQuestionsChange: (value: string) => void;
  questionCharacterCount: number;
  nonEmptyLineCount: number;
};

export function QuestionEditor({
  questions,
  onQuestionsChange,
  questionCharacterCount,
  nonEmptyLineCount,
}: QuestionEditorProps) {
  return (
    <section className="rounded-3xl border border-border bg-card/70 p-4 shadow-[var(--shadow-elegant)] backdrop-blur md:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">2. Question Workspace</div>
        <div className="flex gap-3 text-[11px] text-muted-foreground">
          <span>{questionCharacterCount} chars</span>
          <span>{nonEmptyLineCount} non-empty lines</span>
        </div>
      </div>
      <textarea
        value={questions}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onQuestionsChange(event.target.value)}
        placeholder="Paste one or more questions here..."
        className="min-h-40 w-full rounded-2xl border border-border bg-background/60 px-3 py-3 text-sm text-foreground outline-none"
      />
    </section>
  );
}
