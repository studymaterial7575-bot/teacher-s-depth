import { useState } from "react";
import type { DiagramItem } from "./types";

export function DiagramCard({ d }: { d: DiagramItem }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function genImage() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/diagram-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${d.title}. ${d.caption}`,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setImgUrl(data.dataUrl);
    } catch (e: any) {
      setErr(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-elegant)]">
      <div className="mb-3 text-sm font-semibold tracking-wide text-foreground">{d.title}</div>
      <div className="overflow-hidden rounded-xl bg-background/40 p-3 text-foreground">
        {imgUrl ? (
          <img src={imgUrl} alt={d.title} className="mx-auto w-full max-w-md rounded-lg" />
        ) : (
          <div
            className="mx-auto w-full max-w-md [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:w-full [&_text]:fill-current [&_*]:[stroke-linecap:round]"
            dangerouslySetInnerHTML={{ __html: d.svg }}
          />
        )}
      </div>
      {d.caption && (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{d.caption}</p>
      )}
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={genImage}
          disabled={loading}
          className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-secondary-foreground transition hover:bg-secondary/70 disabled:opacity-50"
        >
          {loading ? "Rendering image…" : imgUrl ? "Regenerate image" : "Image fallback"}
        </button>
        {imgUrl && (
          <button
            onClick={() => setImgUrl(null)}
            className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Back to SVG
          </button>
        )}
      </div>
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
    </div>
  );
}