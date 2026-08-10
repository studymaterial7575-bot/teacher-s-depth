import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Calculator as CalcIcon, Pause, Play, RotateCcw, Timer as TimerIcon } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/tools")({
  head: () => ({
    meta: [
      { title: "Study Tools — Teacher's Depth" },
      { name: "description", content: "Calculator, scientific calculator, unit converter, percentage calculator, pomodoro and stopwatch." },
    ],
  }),
  component: ToolsPage,
});

const TOOLS = [
  { id: "calc", label: "Calculator" },
  { id: "sci", label: "Scientific" },
  { id: "conv", label: "Unit Converter" },
  { id: "pct", label: "Percentage" },
  { id: "pomo", label: "Pomodoro" },
  { id: "stop", label: "Stopwatch" },
] as const;

function ToolsPage() {
  const [active, setActive] = useState<(typeof TOOLS)[number]["id"]>("calc");
  return (
    <AppShell back={{ to: "/" }} title="Study Tools">
      <div className="-mx-4 mb-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-2">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={
                "shrink-0 rounded-full px-3.5 py-2 text-xs font-medium transition " +
                (active === t.id
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card/60 text-muted-foreground hover:text-foreground")
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card/70 p-5 shadow-[var(--shadow-elegant)] backdrop-blur">
        {active === "calc" && <Calculator scientific={false} />}
        {active === "sci" && <Calculator scientific />}
        {active === "conv" && <UnitConverter />}
        {active === "pct" && <PercentageCalc />}
        {active === "pomo" && <Pomodoro />}
        {active === "stop" && <Stopwatch />}
      </div>
    </AppShell>
  );
}

function safeEval(expr: string): string {
  try {
    // sanitize: digits, operators, dot, parens, spaces, %, ** , Math.*
    if (!/^[\d+\-*/().%^\s,piesqrtloMath\.]+$/i.test(expr)) return "Err";
    const replaced = expr
      .replace(/π/g, "Math.PI")
      .replace(/(?<![a-zA-Z])pi(?![a-zA-Z])/g, "Math.PI")
      .replace(/(?<![a-zA-Z])e(?![a-zA-Z])/g, "Math.E")
      .replace(/\^/g, "**");
    // eslint-disable-next-line no-new-func
    const val = Function(`"use strict"; return (${replaced});`)();
    return String(Number.isFinite(val) ? +val.toFixed(10) : "Err");
  } catch {
    return "Err";
  }
}

function Calculator({ scientific }: { scientific: boolean }) {
  const [expr, setExpr] = useState("");
  const result = expr ? safeEval(expr) : "";
  const basic = ["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "(", ")"];
  const sci = ["Math.sin(", "Math.cos(", "Math.tan(", "Math.log(", "Math.sqrt(", "^", "π", "e"];

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
        <CalcIcon size={14} /> {scientific ? "Scientific" : "Basic"} Calculator
      </div>
      <div className="mb-3 rounded-2xl bg-background/50 p-4 text-right">
        <div className="min-h-[20px] break-all text-xs text-muted-foreground">{expr || "0"}</div>
        <div className="mt-1 text-2xl font-bold text-foreground">{result || "0"}</div>
      </div>
      {scientific && (
        <div className="mb-2 grid grid-cols-4 gap-2">
          {sci.map((s) => (
            <button
              key={s}
              onClick={() => setExpr((e) => e + s)}
              className="rounded-xl border border-border bg-card/60 px-2 py-2.5 text-xs font-mono text-foreground hover:border-primary/50"
            >
              {s.replace("Math.", "")}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-4 gap-2">
        {basic.map((b) => (
          <button
            key={b}
            onClick={() => setExpr((e) => e + b)}
            className="rounded-xl bg-secondary px-3 py-3.5 text-base font-semibold text-foreground hover:bg-secondary/70"
          >
            {b}
          </button>
        ))}
        <button
          onClick={() => setExpr("")}
          className="col-span-2 rounded-xl bg-destructive/80 py-3.5 text-sm font-semibold text-destructive-foreground"
        >
          Clear
        </button>
        <button
          onClick={() => setExpr((e) => e + "+")}
          className="rounded-xl bg-secondary py-3.5 text-base font-semibold text-foreground"
        >
          +
        </button>
        <button
          onClick={() => setExpr(result)}
          className="rounded-xl py-3.5 text-base font-bold text-primary-foreground"
          style={{ background: "var(--gradient-primary)" }}
        >
          =
        </button>
      </div>
    </div>
  );
}

const UNITS: Record<string, { name: string; toBase: number }[]> = {
  Length: [
    { name: "m", toBase: 1 },
    { name: "km", toBase: 1000 },
    { name: "cm", toBase: 0.01 },
    { name: "mm", toBase: 0.001 },
    { name: "in", toBase: 0.0254 },
    { name: "ft", toBase: 0.3048 },
  ],
  Mass: [
    { name: "kg", toBase: 1 },
    { name: "g", toBase: 0.001 },
    { name: "lb", toBase: 0.4536 },
    { name: "oz", toBase: 0.02835 },
  ],
  Temperature: [{ name: "°C", toBase: 1 }],
};

function UnitConverter() {
  const [category, setCategory] = useState("Length");
  const units = UNITS[category];
  const [from, setFrom] = useState(units[0].name);
  const [to, setTo] = useState(units[1]?.name ?? units[0].name);
  const [value, setValue] = useState("1");
  const num = parseFloat(value) || 0;

  let out = 0;
  if (category === "Temperature") {
    out = num; // single unit demo
  } else {
    const fU = units.find((u) => u.name === from)!;
    const tU = units.find((u) => u.name === to)!;
    out = (num * fU.toBase) / tU.toBase;
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {Object.keys(UNITS).map((c) => (
          <button
            key={c}
            onClick={() => {
              setCategory(c);
              setFrom(UNITS[c][0].name);
              setTo(UNITS[c][1]?.name ?? UNITS[c][0].name);
            }}
            className={
              "rounded-full px-3 py-1.5 text-xs " +
              (category === c ? "bg-primary text-primary-foreground" : "border border-border bg-card/60 text-muted-foreground")
            }
          >
            {c}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="rounded-xl border border-border bg-background/40 px-3 py-2 text-sm text-foreground"
        />
        <select value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-xl border border-border bg-background/40 px-3 py-2 text-sm text-foreground">
          {units.map((u) => <option key={u.name} value={u.name}>{u.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-background/40 px-3 py-2 text-sm text-foreground">{out.toFixed(4)}</div>
        <select value={to} onChange={(e) => setTo(e.target.value)} className="rounded-xl border border-border bg-background/40 px-3 py-2 text-sm text-foreground">
          {units.map((u) => <option key={u.name} value={u.name}>{u.name}</option>)}
        </select>
      </div>
    </div>
  );
}

function PercentageCalc() {
  const [a, setA] = useState("20");
  const [b, setB] = useState("150");
  const pct = (parseFloat(a) || 0);
  const total = (parseFloat(b) || 0);
  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Percent</span>
          <input value={a} onChange={(e) => setA(e.target.value)} className="rounded-xl border border-border bg-background/40 px-3 py-2 text-foreground" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Of total</span>
          <input value={b} onChange={(e) => setB(e.target.value)} className="rounded-xl border border-border bg-background/40 px-3 py-2 text-foreground" />
        </label>
      </div>
      <div className="rounded-2xl bg-background/40 p-4">
        <div className="text-xs text-muted-foreground">{pct}% of {total} =</div>
        <div className="text-2xl font-bold text-foreground">{((pct / 100) * total).toFixed(2)}</div>
      </div>
      <div className="rounded-2xl bg-background/40 p-4">
        <div className="text-xs text-muted-foreground">{pct} is what % of {total}?</div>
        <div className="text-2xl font-bold text-foreground">{total ? ((pct / total) * 100).toFixed(2) : "—"}%</div>
      </div>
    </div>
  );
}

function useInterval(cb: () => void, ms: number | null) {
  const ref = useRef(cb);
  useEffect(() => { ref.current = cb; }, [cb]);
  useEffect(() => {
    if (ms == null) return;
    const id = setInterval(() => ref.current(), ms);
    return () => clearInterval(id);
  }, [ms]);
}

function Pomodoro() {
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<"work" | "break">("work");
  useInterval(() => {
    setSeconds((s) => {
      if (s <= 1) {
        setRunning(false);
        const next = mode === "work" ? "break" : "work";
        setMode(next);
        return next === "work" ? 25 * 60 : 5 * 60;
      }
      return s - 1;
    });
  }, running ? 1000 : null);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return (
    <div className="text-center">
      <div className="inline-flex rounded-full border border-border bg-card/60 p-1 text-xs">
        {(["work", "break"] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setSeconds(m === "work" ? 25 * 60 : 5 * 60); setRunning(false); }}
            className={"rounded-full px-3 py-1 " + (mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
          >
            {m === "work" ? "Focus 25" : "Break 5"}
          </button>
        ))}
      </div>
      <div className="my-6 font-mono text-6xl font-black text-foreground tracking-tight">{mm}:{ss}</div>
      <div className="flex justify-center gap-2">
        <button onClick={() => setRunning((r) => !r)} className="inline-flex min-h-10 items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
          {running ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Start</>}
        </button>
        <button onClick={() => { setRunning(false); setSeconds(mode === "work" ? 25 * 60 : 5 * 60); }} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-card/60 px-5 py-2 text-sm text-foreground">
          <RotateCcw size={14} /> Reset
        </button>
      </div>
    </div>
  );
}

function Stopwatch() {
  const [ms, setMs] = useState(0);
  const [running, setRunning] = useState(false);
  useInterval(() => setMs((m) => m + 10), running ? 10 : null);
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return (
    <div className="text-center">
      <div className="mb-1 inline-flex items-center gap-2 text-xs text-muted-foreground">
        <TimerIcon size={14} /> Stopwatch
      </div>
      <div className="my-6 font-mono text-5xl font-black text-foreground">
        {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}.<span className="text-3xl text-muted-foreground">{String(cs).padStart(2, "0")}</span>
      </div>
      <div className="flex justify-center gap-2">
        <button onClick={() => setRunning((r) => !r)} className="min-h-10 rounded-full px-5 py-2 text-sm font-semibold text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
          {running ? "Pause" : "Start"}
        </button>
        <button onClick={() => { setMs(0); setRunning(false); }} className="min-h-10 rounded-full border border-border bg-card/60 px-5 py-2 text-sm text-foreground">Reset</button>
      </div>
    </div>
  );
}