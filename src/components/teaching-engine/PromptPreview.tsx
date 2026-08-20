import { useMemo, useState } from "react";
import { CheckCircle2, Clipboard, Eye, Send, Sparkles } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type PromptPreviewProps = {
  prompt: string;
  copied: boolean;
  sourceFileNames: string[];
  onCopyPrompt: () => void;
  onSendToChatGpt: () => void;
  onDownloadAiPackage: () => void;
  sendStatus: "idle" | "sending" | "sent" | "opened" | "error";
  summary: {
    imagesProcessed: number;
    academicQuestions: number;
    subjects: string[];
    teachingStyle: string;
    visualStyle: string;
    learnerProfile: string;
    estimatedOutput: string[];
    estimatedReadingTime: string;
  } | null;
};

export function PromptPreview({
  prompt,
  copied,
  sourceFileNames,
  onCopyPrompt,
  onSendToChatGpt,
  onDownloadAiPackage,
  sendStatus,
  summary,
}: PromptPreviewProps) {
  const [showFullPrompt, setShowFullPrompt] = useState(false);

  const previewLines = useMemo(() => {
    if (!prompt.trim()) return "";
    return prompt
      .split(/\r?\n/)
      .slice(0, 20)
      .join("\n");
  }, [prompt]);

  const hasPrompt = prompt.trim().length > 0;

  return (
    <section className="rounded-3xl border border-border bg-card/70 p-4 shadow-[var(--shadow-elegant)] backdrop-blur md:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">5. Output Prompt</div>
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-background/50 px-2.5 py-1 text-[11px] text-muted-foreground">
          <Sparkles size={12} />
          Ready to teach
        </div>
      </div>

      {!hasPrompt && (
        <div className="rounded-2xl border border-border bg-background/50 px-4 py-4 text-sm text-muted-foreground">
          Build the prompt to see a summary and preview.
        </div>
      )}

      {hasPrompt && summary && (
        <div className="rounded-2xl border border-border bg-background/50 p-4">
          <div className="mb-3 text-sm font-semibold text-foreground">Prompt Summary</div>
          <div className="space-y-3 text-sm text-foreground">
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card/40 px-3 py-2">
              <span>Images Processed</span>
              <span className="font-semibold text-foreground">{summary.imagesProcessed}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card/40 px-3 py-2">
              <span>Questions Detected</span>
              <span className="font-semibold text-foreground">{summary.academicQuestions}</span>
            </div>
            <div className="rounded-xl border border-border/70 bg-card/40 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Subjects</div>
              {summary.subjects.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {summary.subjects.map((subject) => (
                    <span key={subject} className="rounded-full border border-border px-2 py-0.5 text-xs text-foreground">
                      {subject}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">Unknown</div>
              )}
            </div>
            <div className="rounded-xl border border-border/70 bg-card/40 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Teaching Style</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {summary.teachingStyle.split(",").map((item) => item.trim()).filter(Boolean).map((item) => (
                  <span key={item} className="rounded-full border border-border px-2 py-0.5 text-xs text-foreground">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-card/40 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Visual Style</div>
              <div className="mt-1 flex flex-wrap gap-1">
                <span className="rounded-full border border-border px-2 py-0.5 text-xs text-foreground">{summary.visualStyle}</span>
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-card/40 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Learner Profile</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {summary.learnerProfile.split(",").map((item) => item.trim()).filter(Boolean).map((item) => (
                  <span key={item} className="rounded-full border border-border px-2 py-0.5 text-xs text-foreground">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-card/40 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Estimated AI Response</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {summary.estimatedOutput.map((item) => (
                  <span key={item} className="rounded-full border border-border px-2 py-0.5 text-xs text-foreground">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card/40 px-3 py-2">
              <span>Estimated Reading Time</span>
              <span className="font-semibold text-foreground">{summary.estimatedReadingTime}</span>
            </div>
          </div>
        </div>
      )}

      {hasPrompt && (
        <Accordion type="single" collapsible className="mt-4 rounded-2xl border border-border bg-background/50 px-3">
          <AccordionItem value="preview" className="border-b-0">
            <AccordionTrigger className="text-foreground no-underline hover:no-underline">
              Prompt Preview (first 20 lines)
            </AccordionTrigger>
            <AccordionContent>
              <pre className="whitespace-pre-wrap rounded-xl border border-border bg-card/50 px-3 py-3 text-xs text-foreground">
                {previewLines}
              </pre>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {hasPrompt && showFullPrompt && (
        <pre className="mt-4 whitespace-pre-wrap rounded-2xl border border-border bg-background/60 px-3 py-3 text-sm text-foreground">
          {prompt}
        </pre>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onCopyPrompt}
          disabled={!hasPrompt}
          className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground"
        >
          <Clipboard size={16} />
          {copied ? "AI package copied" : "Copy AI Package"}
        </button>
        <button
          type="button"
          onClick={() => setShowFullPrompt((prev) => !prev)}
          disabled={!hasPrompt}
          className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card/60 px-4 py-3 text-sm font-semibold text-foreground"
        >
          <Eye size={16} />
          {showFullPrompt ? "Hide Full Prompt" : "View Full Prompt"}
        </button>
        <button
          type="button"
          onClick={onSendToChatGpt}
          disabled={!hasPrompt || sendStatus === "sending"}
          className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card/60 px-4 py-3 text-sm font-semibold text-foreground"
        >
          <Send size={16} />
          {sendStatus === "sending" ? "Preparing prompt..." : "Send to ChatGPT"}
        </button>
      </div>

      {sourceFileNames.length > 0 && (
        <div className="mt-3 rounded-2xl border border-border bg-background/50 p-3 text-xs text-muted-foreground">
          <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Original source files kept with the prompt</div>
          <div className="space-y-1 break-all">
            {sourceFileNames.map((fileName) => (
              <div key={fileName}>{fileName}</div>
            ))}
          </div>
          <button
            type="button"
            onClick={onDownloadAiPackage}
            disabled={!hasPrompt}
            className="mt-3 rounded-xl border border-border bg-card/60 px-3 py-2 text-xs font-semibold text-foreground"
          >
            Download AI package
          </button>
        </div>
      )}

      <div aria-live="polite" className="sr-only">
        {sendStatus === "sending" && "Sending prompt"}
        {sendStatus === "sent" && "Prompt sent successfully"}
        {sendStatus === "opened" && "Opened ChatGPT with generated prompt"}
        {sendStatus === "error" && "Unable to send prompt"}
      </div>

      {sendStatus === "sent" && (
        <div className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 size={14} />
            Prompt Sent Successfully.
          </span>
        </div>
      )}

      {sendStatus === "opened" && (
        <div className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 size={14} />
            Opened ChatGPT with generated prompt.
          </span>
        </div>
      )}

      {sendStatus === "error" && (
        <div className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
          Unable to open ChatGPT. Please allow popups and try again.
        </div>
      )}

      {copied && (
        <div className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
          Prompt copied to clipboard.
        </div>
      )}
    </section>
  );
}
