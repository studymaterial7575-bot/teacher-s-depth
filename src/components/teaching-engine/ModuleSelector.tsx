import type { ModuleName } from "@/types/teaching-engine";

type ModuleSelectorProps = {
  modules: readonly ModuleName[];
  selectedModules: ModuleName[];
  onToggleModule: (module: ModuleName) => void;
};

export function ModuleSelector({ modules, selectedModules, onToggleModule }: ModuleSelectorProps) {
  return (
    <section className="rounded-3xl border border-border bg-card/70 p-4 shadow-[var(--shadow-elegant)] backdrop-blur md:p-5">
      <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">3. Teaching Modules</div>
      <div className="grid gap-2 sm:grid-cols-2">
        {modules.map((module) => {
          const checked = selectedModules.includes(module);
          return (
            <label
              key={module}
              className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm transition ${checked ? "border-primary/50 bg-primary/10 text-foreground" : "border-border bg-background/40 text-muted-foreground"}`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggleModule(module)}
                className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-2 focus:ring-ring"
              />
              <span>{module}</span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
