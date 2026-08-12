import { Link, useNavigate } from "@tanstack/react-router";
import { Bookmark, Home, Search, Sparkles } from "lucide-react";
import { useState, type ReactNode, type ComponentType, type SVGProps } from "react";

export function AppShell({
  children,
  title,
  back,
}: {
  children: ReactNode;
  title?: string;
  back?: { to: string; label?: string };
}) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  return (
    <div className="relative min-h-[100dvh] bg-background">
      {/* Ambient gradient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(60% 40% at 20% 0%, color-mix(in oklab, var(--primary) 22%, transparent), transparent 70%), radial-gradient(50% 35% at 90% 10%, color-mix(in oklab, var(--accent) 22%, transparent), transparent 70%)"
        }}
      />

      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
          {back ? (
            <a
              href={back.to}
              className="inline-flex min-h-10 items-center rounded-full border border-border bg-card/60 px-3 py-2 text-[11px] text-muted-foreground hover:text-foreground"
            >
              ← {back.label ?? "Back"}
            </a>
          ) : (
            <Link to="/" className="flex items-center gap-2 text-foreground">
              <span
                className="grid h-9 w-9 place-items-center rounded-2xl text-primary-foreground shadow-[var(--shadow-elegant)]"
                style={{ background: "var(--gradient-primary)" }}
              >
                <Sparkles size={18} />
              </span>
              <span className="text-xs font-bold tracking-tight sm:text-sm">Teacher's Depth</span>
            </Link>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Link to="/bookmarks" className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full p-2 text-muted-foreground hover:text-foreground" aria-label="Bookmarks">
              <Bookmark size={18} />
            </Link>
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-3 pb-3 sm:px-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (q.trim()) navigate({ to: "/search", search: { q } });
            }}
            className="flex min-h-11 items-center gap-2 rounded-2xl border border-border bg-card/70 px-3 py-2 backdrop-blur"
          >
            <Search size={16} className="shrink-0 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search chapters, formulas, examples, notes…"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </form>
          {title && (
            <h1 className="mt-3 text-base font-bold tracking-tight text-foreground sm:text-lg">{title}</h1>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-3 pb-[5.5rem] pt-3 sm:px-4 sm:pb-28 sm:pt-4">{children}</main>

      {/* Bottom nav with safe-area padding */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/80 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] backdrop-blur-xl md:hidden"
      >
        <div className="mx-auto grid max-w-3xl grid-cols-3 px-3 py-1">
          <NavItem to="/" icon={Home} label="Home" />
          <NavItem to="/bookmarks" icon={Bookmark} label="Saved" />
          <NavItem to="/companion" icon={Sparkles} label="AI" />
        </div>
      </nav>
    </div>
  );
}

function NavItem({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;
  label: string;
}) {
  return (
    <Link
      to={to as any}
      className="flex min-h-[3.25rem] flex-col items-center justify-center gap-1 px-2 py-2 text-[12px] text-muted-foreground hover:text-foreground"
    >
      <Icon size={18} />
      {label}
    </Link>
  );
}
