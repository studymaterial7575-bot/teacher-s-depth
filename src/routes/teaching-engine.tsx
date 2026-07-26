import { createFileRoute } from "@tanstack/react-router";
import { Clipboard, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ModuleRecommendations } from "@/components/teaching-engine/ModuleRecommendations";
import { ModuleSelector } from "@/components/teaching-engine/ModuleSelector";
import { PromptPreview } from "@/components/teaching-engine/PromptPreview";
import { QuestionAnalysisCard } from "@/components/teaching-engine/QuestionAnalysis";
import { QuestionEditor } from "@/components/teaching-engine/QuestionEditor";
import { DEFAULT_SELECTED_MODULES, MODULES } from "@/lib/teaching-engine/keywordRules";
import { getRecommendations } from "@/lib/teaching-engine/moduleRecommender";
import { buildPromptText } from "@/lib/teaching-engine/promptBuilder";
import { analyzeQuestion } from "@/lib/teaching-engine/questionAnalyzer";
import type { ModuleName, QuestionAnalysis } from "@/types/teaching-engine";

export const Route = createFileRoute("/teaching-engine")({
  head: () => ({
    meta: [
      { title: "Teacher's Teaching Engine — Teacher's Depth" },
      { name: "description", content: "Create a structured teaching prompt from uploaded material and selected modules." },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const [selectedModules, setSelectedModules] = useState<ModuleName[]>(DEFAULT_SELECTED_MODULES);
  const [hasManualOverride, setHasManualOverride] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [questions, setQuestions] = useState("Paste one or more questions here...\n\nExample:\n1. Find the value of x.\n2. Solve the equation.");
  const [prompt, setPrompt] = useState(`Subject: [Enter subject]
Board: [Enter board]
Class: [Enter class]
Question: [Enter your question here]
Objective: [Enter your teaching objective here]

Selected Teaching Modules:
- None selected

Instructions for ChatGPT:
- Act as a supportive classroom teacher.
- Explain the topic in a student-friendly way.
- Use the selected teaching modules to structure the response.
- Keep the explanation clear, logical, and easy to follow.

Desired Output Format:
1. Short answer or direct result
2. Step-by-step explanation
3. Simple visual analogy or example
4. Formula summary if relevant
5. Common mistakes to avoid
6. Exam tip`);
  const [copied, setCopied] = useState(false);
  const [analysis, setAnalysis] = useState<QuestionAnalysis>({
    subject: "Not yet identified",
    chapter: "Not yet identified",
    questionType: "General",
    difficulty: "Medium",
    skillsRequired: ["Reasoning"],
    visualRequired: "No",
    formulaRequired: "No",
    examImportance: "Medium",
  });

  useEffect(() => {
    setAnalysis(analyzeQuestion(questions));
  }, [questions]);

  const recommendationSummary = useMemo(() => getRecommendations(questions, analysis), [questions, analysis]);

  useEffect(() => {
    if (hasManualOverride) return;

    const nextSelection = recommendationSummary.modules.length > 0
      ? Array.from(new Set([...DEFAULT_SELECTED_MODULES, ...recommendationSummary.modules])) as ModuleName[]
      : [...DEFAULT_SELECTED_MODULES];

    setSelectedModules(nextSelection);
  }, [recommendationSummary.modules, hasManualOverride]);

  const nonEmptyLineCount = questions
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0).length;
  const questionCharacterCount = questions.length;

  function toggleModule(module: ModuleName) {
    setHasManualOverride(true);
    setSelectedModules((prev) =>
      prev.includes(module) ? prev.filter((item) => item !== module) : [...prev, module],
    );
  }

  function buildPrompt() {
    const nextPrompt = buildPromptText({
      selectedModules,
      questions,
      fileName,
    });

    setPrompt(nextPrompt);
    setCopied(false);
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <AppShell back={{ to: "/" }} title="Teacher's Teaching Engine">
      <div className="space-y-4">
        <section className="rounded-3xl border border-border bg-card/70 p-4 shadow-[var(--shadow-elegant)] backdrop-blur md:p-5">
          <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <Upload size={14} />
            <span>1. Upload PDF or Screenshot</span>
          </div>

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-background/50 px-4 py-8 text-center transition hover:border-primary/60">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
              <Upload size={20} />
            </div>
            <div className="text-sm font-semibold text-foreground">Attach a PDF or screenshot</div>
            <div className="mt-1 text-xs text-muted-foreground">No OCR or analysis is performed here — this is a guided teaching UI.</div>
            <input
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                setFileName(file ? file.name : null);
              }}
            />
          </label>

          {fileName ? (
            <div className="mt-3 rounded-2xl border border-border bg-card/60 px-3 py-2 text-sm text-foreground">
              <span className="text-muted-foreground">Selected file:</span> {fileName}
            </div>
          ) : null}
        </section>

        <QuestionEditor
          questions={questions}
          onQuestionsChange={setQuestions}
          questionCharacterCount={questionCharacterCount}
          nonEmptyLineCount={nonEmptyLineCount}
        />

        <QuestionAnalysisCard analysis={analysis} />

        <ModuleRecommendations recommendationSummary={recommendationSummary} />

        <ModuleSelector
          modules={MODULES}
          selectedModules={selectedModules}
          onToggleModule={toggleModule}
        />

        <PromptPreview prompt={prompt} copied={copied} onCopyPrompt={copyPrompt} />

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={buildPrompt}
            className="flex-1 rounded-2xl py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}
          >
            Build Prompt
          </button>
          <button
            type="button"
            onClick={copyPrompt}
            className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground"
          >
            <Clipboard size={16} />
            {copied ? "Copied" : "Copy Prompt"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
