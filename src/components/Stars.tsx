import { Star } from "lucide-react";
import { IMPORTANCE_LABELS, type Importance } from "@/lib/data";

export function Stars({ value, label = true }: { value: Importance; label?: boolean }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-foreground/80 backdrop-blur">
      <span className="flex">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={12}
            className={i < value ? "fill-amber-300 text-amber-300" : "text-muted-foreground/40"}
          />
        ))}
      </span>
      {label && <span className="font-medium">{IMPORTANCE_LABELS[value]}</span>}
    </div>
  );
}