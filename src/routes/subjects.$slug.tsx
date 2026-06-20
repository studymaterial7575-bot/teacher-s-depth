import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Stars } from "@/components/Stars";
import { SUBJECTS, chaptersBySubject, getSubject, type SubjectKey } from "@/lib/data";

export const Route = createFileRoute("/subjects/$slug")({
  head: ({ params }) => {
    const s = getSubject(params.slug);
    return {
      meta: [
        { title: `${s?.name ?? "Subject"} — Teacher's Depth` },
        { name: "description", content: s?.description ?? "Chapters and lessons." },
      ],
    };
  },
  component: SubjectPage,
  notFoundComponent: () => (
    <AppShell back={{ to: "/" }}>
      <p className="text-sm text-muted-foreground">Subject not found.</p>
    </AppShell>
  ),
});

function SubjectPage() {
  const { slug } = Route.useParams();
  const subject = getSubject(slug);
  if (!subject) throw notFound();
  const Icon = subject.icon;
  const chapters = chaptersBySubject(subject.key as SubjectKey);

  return (
    <AppShell back={{ to: "/" }}>
      {/* Tabs to switch subject */}
      <div className="-mx-4 mb-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-2">
          {SUBJECTS.map((s) => (
            <Link
              key={s.key}
              to="/subjects/$slug"
              params={{ slug: s.key }}
              className={
                "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition " +
                (s.key === subject.key
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-elegant)]"
                  : "border border-border bg-card/60 text-muted-foreground hover:text-foreground")
              }
            >
              {s.name}
            </Link>
          ))}
        </div>
      </div>

      <div className={`relative mb-6 overflow-hidden rounded-3xl border border-border bg-gradient-to-br ${subject.gradient} p-6`}>
        <Icon size={36} className={subject.tone} />
        <h1 className="mt-3 text-2xl font-black tracking-tight text-foreground">{subject.name}</h1>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{subject.description}</p>
      </div>

      <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-foreground">Chapters</h2>
      {chapters.length === 0 ? (
        <p className="text-sm text-muted-foreground">More chapters coming soon for {subject.name}.</p>
      ) : (
        <div className="space-y-2">
          {chapters.map((c) => (
            <Link
              key={c.id}
              to="/chapter/$subject/$chapter"
              params={{ subject: c.subject, chapter: c.id }}
              className="flex items-start gap-3 rounded-2xl border border-border bg-card/60 p-4 backdrop-blur transition hover:border-primary/50"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-foreground">{c.title}</div>
                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.summary}</div>
              </div>
              <Stars value={c.importance} label={false} />
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}