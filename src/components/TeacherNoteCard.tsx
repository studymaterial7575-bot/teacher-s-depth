import { AlertTriangle, Brain, Lightbulb, ShieldAlert, Sparkles } from "lucide-react";
import type { TeacherNote } from "@/lib/data";

const META: Record<TeacherNote["kind"], { label: string; icon: any; tone: string }> = {
  tip: { label: "Teacher Tip", icon: Lightbulb, tone: "text-amber-300" },
  memory: { label: "Memory Trick", icon: Brain, tone: "text-fuchsia-300" },
  error: { label: "Common Error", icon: AlertTriangle, tone: "text-rose-300" },
  exam: { label: "Exam Alert", icon: ShieldAlert, tone: "text-sky-300" },
  why: { label: "Why It Works", icon: Sparkles, tone: "text-emerald-300" },
};

export function TeacherNoteCard({ note }: { note: TeacherNote }) {
  const m = META[note.kind];
  const Icon = m.icon;
  return (
    <div className="flex gap-3 rounded-2xl border border-border bg-card/70 p-4 shadow-[var(--shadow-elegant)] backdrop-blur">
      <div className={`mt-0.5 shrink-0 rounded-xl bg-background/40 p-2 ${m.tone}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <div className={`text-[11px] font-bold uppercase tracking-[0.18em] ${m.tone}`}>{m.label}</div>
        <p className="mt-1 text-sm leading-relaxed text-foreground">{note.text}</p>
      </div>
    </div>
  );
}