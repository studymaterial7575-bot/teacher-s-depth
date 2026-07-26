import { Clipboard, Sparkles } from "lucide-react";

type PromptPreviewProps = {
  prompt: string;
  copied: boolean;
  onCopyPrompt: () => void;
};

export function PromptPreview({ prompt, copied, onCopyPrompt }: PromptPreviewProps) {
  return (
    <section className="rounded-3xl border border-border bg-card/70 p-4 shadow-[var(--shadow-elegant)] backdrop-blur md:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">4. Prompt Preview</div>
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-background/50 px-2.5 py-1 text-[11px] text-muted-foreground">
          <Sparkles size={12} />
          Ready to teach
        </div>
      </div>
      <textarea
        readOnly
        value={prompt}
        className="min-h-44 w-full rounded-2xl border border-border bg-background/60 px-3 py-3 text-sm text-foreground outline-none"
      />

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onCopyPrompt}
          className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground"
        >
          <Clipboard size={16} />
          {copied ? "Copied" : "Copy Prompt"}
        </button>
      </div>
    </section>
  );
}
