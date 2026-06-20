import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ResultTabs } from "@/components/companion/ResultTabs";
import { SUBJECTS, type AnalysisResult, type Subject } from "@/components/companion/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Teacher Companion — Depth Engine" },
      {
        name: "description",
        content:
          "Supplementary depth engine for school teachers — solutions, diagrams, examples, doubts and videos from a PDF or screenshot.",
      },
      { property: "og:title", content: "Teacher Companion" },
      {
        property: "og:description",
        content: "Upload a PDF or screenshot. Get 7 tabs of depth for any class topic.",
      },
    ],
  }),
  component: Index,
});

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function Index() {
  const [subject, setSubject] = useState<Subject>("Mathematics");
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function analyze() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const payloadFiles = await Promise.all(
        files.map(async (f) => ({
          name: f.name,
          mime: f.type || (f.name.endsWith(".pdf") ? "application/pdf" : "image/png"),
          dataUrl: await fileToDataUrl(f),
        })),
      );
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, text, files: payloadFiles }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as AnalysisResult;
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setFiles([]);
    setText("");
    setError(null);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 pb-10 pt-6">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Welcome
          </p>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Teacher <span className="text-primary">Companion</span>
          </h1>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Depth engine · v0.1
          </p>
        </div>
        {result && (
          <button
            onClick={reset}
            className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-secondary-foreground hover:bg-secondary/70"
          >
            New
          </button>
        )}
      </header>

      {!result && (
        <section className="space-y-5">
          {/* Subject pills */}
          <div>
            <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Subject
            </div>
            <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex gap-2">
                {SUBJECTS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSubject(s)}
                    className={
                      "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition " +
                      (subject === s
                        ? "bg-primary text-primary-foreground shadow-[var(--shadow-elegant)]"
                        : "border border-border bg-card text-muted-foreground hover:text-foreground")
                    }
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Upload */}
          <div
            className="rounded-3xl border border-dashed border-border bg-card p-5 text-center shadow-[var(--shadow-elegant)]"
            onClick={() => fileInputRef.current?.click()}
            role="button"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                const list = e.target.files;
                if (!list) return;
                setFiles((prev) => [...prev, ...Array.from(list)]);
                e.target.value = "";
              }}
            />
            <div
              className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="text-sm font-semibold text-foreground">
              Upload PDF or Screenshot
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Tap to attach · multiple files supported
            </div>
          </div>

          {files.length > 0 && (
            <ul className="space-y-2">
              {files.map((f, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-xs"
                >
                  <span className="truncate text-foreground">{f.name}</span>
                  <button
                    onClick={() => setFiles((p) => p.filter((_, idx) => idx !== i))}
                    className="ml-3 shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Optional short text */}
          <div>
            <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Optional hint (one line)
            </div>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Class 8 — quadratic equations"
              className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <button
            onClick={analyze}
            disabled={loading || (files.length === 0 && !text.trim())}
            className="w-full rounded-2xl py-3.5 text-sm font-semibold text-primary-foreground transition disabled:opacity-40"
            style={{
              background: "var(--gradient-primary)",
              boxShadow: "var(--shadow-elegant)",
            }}
          >
            {loading ? "Analyzing…" : "Get Depth Analysis"}
          </button>

          {error && (
            <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </p>
          )}

          <p className="pt-2 text-center text-[11px] leading-relaxed text-muted-foreground">
            ChatGPT remains the Primary Teacher.
            <br />
            Teacher Companion is a supplementary depth engine.
          </p>
        </section>
      )}

      {result && <ResultTabs result={result} />}
    </main>
  );
}
