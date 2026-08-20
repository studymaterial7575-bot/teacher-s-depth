import { describe, expect, it } from "vitest";
import {
  filterRelevantFormulaeByContext,
  sanitizeEducationalTextByContext,
} from "@/lib/teaching-engine/contentIntegrity";

describe("content integrity context filtering", () => {
  it("removes V = IR mentions in spherical mirror context", () => {
    const context = "CBSE Class 10 Physics Light - Reflection and Refraction Spherical Mirrors";
    const text = [
      "For mirrors, use R = 2f.",
      "Common confusion: V = IR is not for this chapter.",
      "Given f = 15 cm.",
    ].join("\n");

    const cleaned = sanitizeEducationalTextByContext(text, context);
    expect(cleaned).toContain("R = 2f");
    expect(cleaned).toContain("f = 15 cm");
    expect(cleaned).not.toMatch(/V\s*=\s*I\s*R/i);
  });

  it("keeps mirror formulas and excludes numeric assignments from formula list", () => {
    const context = "CBSE Class 10 Physics Topic: Spherical Mirrors";
    const formulae = ["f = 15 cm", "R = 2f", "R = 30 cm", "V = IR"];

    const filtered = filterRelevantFormulaeByContext(formulae, context);
    expect(filtered).toContain("R = 2f");
    expect(filtered.join(" | ")).not.toMatch(/V\s*=\s*I\s*R/i);
    expect(filtered).not.toContain("f = 15 cm");
    expect(filtered).not.toContain("R = 30 cm");
  });
});
