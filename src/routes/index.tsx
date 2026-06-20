import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Flame, GraduationCap, History, Sparkles, Trophy } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Stars } from "@/components/Stars";
import { CHAPTERS, SUBJECTS } from "@/lib/data";
import { STORAGE_KEYS, useLocalStorage, type Progress, type Recent } from "@/lib/storage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Teacher's Depth — Learn with clarity" },
      {
        name: "description",
        content:
          "A premium learning companion for CBSE, ICSE and IGCSE students — depth, diagrams and clarity in every chapter.",
      },
      { property: "og:title", content: "Teacher's Depth" },
      {
        property: "og:description",
        content: "Learn with depth, clarity and visual understanding.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [progress] = useLocalStorage<Progress>(STORAGE_KEYS.progress, {
    completed: [],
    todayMinutes: 0,
    weekly: [10, 25, 15, 40, 30, 20, 35],
    streak: 3,
    lastStudyDay: "",
  });
  const [recents] = useLocalStorage<Recent[]>(STORAGE_KEYS.recents, []);
  const completionPct = Math.min(
    100,
    Math.round((progress.completed.length / Math.max(CHAPTERS.length, 1)) * 100),
  );
  const continueChapter = recents[0]
    ? CHAPTERS.find((c) => c.id === recents[0].id)
    : CHAPTERS[0];
  const recentChapters = CHAPTERS.slice(0, 4);

  return (
    <AppShell>
      <section className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          Welcome back
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          Learn with <span className="text-primary">depth</span>,
          <br /> clarity and visual understanding.
        </h1>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">
          Built for CBSE, ICSE and IGCSE — every chapter explained the way a great teacher would.
        </p>
      </section>

      {/* Quick start */}
      <section className="mb-8">
        <SectionTitle title="Quick Start" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickTile href="/companion" icon={Sparkles} label="Ask AI" tone="from-emerald-500/30 to-teal-500/10" />
          <QuickTile href="/bookmarks" icon={Trophy} label="My Saved" tone="from-amber-500/30 to-orange-500/10" />
          <QuickTile href="/tools" icon={GraduationCap} label="Study Tools" tone="from-sky-500/30 to-indigo-500/10" />
          <QuickTile href="/search" icon={History} label="Search" tone="from-fuchsia-500/30 to-purple-500/10" />
        </div>
      </section>

      {/* Continue learning */}
      {continueChapter && (
        <section className="mb-8">
          <SectionTitle title="Continue Learning" />
          <Link
            to="/chapter/$subject/$chapter"
            params={{ subject: continueChapter.subject, chapter: continueChapter.id }}
            className="group relative block overflow-hidden rounded-3xl border border-border bg-card/70 p-5 shadow-[var(--shadow-elegant)] backdrop-blur transition hover:border-primary/60"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 opacity-60"
              style={{
                background:
                  "radial-gradient(60% 80% at 100% 0%, color-mix(in oklab, var(--primary) 25%, transparent), transparent 60%)",
              }}
            />
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.2em] text-primary">
                  {SUBJECTS.find((s) => s.key === continueChapter.subject)?.name}
                </div>
                <h3 className="mt-1 truncate text-lg font-bold text-foreground">{continueChapter.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{continueChapter.summary}</p>
              </div>
              <div className="shrink-0">
                <Stars value={continueChapter.importance} label={false} />
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Overall progress</span>
                <span className="text-foreground">{completionPct}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${completionPct}%`, background: "var(--gradient-primary)" }}
                />
              </div>
              <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1 text-amber-300">
                  <Flame size={12} /> {progress.streak}-day streak
                </span>
                <span>· {progress.todayMinutes} min today</span>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Subjects */}
      <section className="mb-8">
        <SectionTitle title="Subjects" subtitle="Pick your battlefield" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SUBJECTS.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.key}
                to="/subjects/$slug"
                params={{ slug: s.key }}
                className={`group relative overflow-hidden rounded-2xl border border-border bg-card/70 p-4 backdrop-blur transition hover:border-primary/60 hover:scale-[1.01]`}
              >
                <div
                  aria-hidden
                  className={`absolute inset-0 -z-10 bg-gradient-to-br ${s.gradient} opacity-70`}
                />
                <Icon className={`${s.tone}`} size={22} />
                <div className="mt-3 text-sm font-bold text-foreground">{s.name}</div>
                <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{s.description}</div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recent chapters */}
      <section className="mb-12">
        <SectionTitle title="Recent Chapters" />
        <div className="space-y-2">
          {recentChapters.map((c) => {
            const subj = SUBJECTS.find((s) => s.key === c.subject)!;
            const Icon = subj.icon;
            return (
              <Link
                key={c.id}
                to="/chapter/$subject/$chapter"
                params={{ subject: c.subject, chapter: c.id }}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card/60 p-3 backdrop-blur transition hover:border-primary/50"
              >
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-background/60 ${subj.tone}`}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-foreground">{c.title}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{subj.name} · {c.summary}</div>
                </div>
                <Stars value={c.importance} label={false} />
              </Link>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-foreground">{title}</h2>
      {subtitle && <span className="text-[11px] text-muted-foreground">{subtitle}</span>}
    </div>
  );
}

function QuickTile({
  href,
  icon: Icon,
  label,
  tone,
}: {
  href: string;
  icon: any;
  label: string;
  tone: string;
}) {
  return (
    <Link
      to={href}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card/70 p-3 backdrop-blur transition hover:border-primary/60"
    >
      <div aria-hidden className={`absolute inset-0 -z-10 bg-gradient-to-br ${tone} opacity-80`} />
      <Icon size={18} className="text-foreground/90" />
      <div className="mt-2 text-sm font-semibold text-foreground">{label}</div>
    </Link>
  );
}
