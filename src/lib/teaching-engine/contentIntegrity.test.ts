import { describe, expect, it } from "vitest";
import {
  detectOcrGarbage,
  filterRelevantFormulaeByContext,
  sanitizeEducationalTextByContext,
  sanitizeTeacherRequirement,
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

describe("OCR garbage detection", () => {
  it("flags stray symbol fragments as garbage", () => {
    const text = "A car travels 120 km in 3 hours.\n& Si :\nCalculate average speed.";
    const result = detectOcrGarbage(text);
    expect(result.hasGarbage).toBe(true);
    expect(result.examples.join(" ")).toContain("& Si :");
  });

  it("flags a two-letter noise token as garbage", () => {
    const text = "CBSE Class 9 Physics Motion\nNZ\nCalculate speed.";
    const result = detectOcrGarbage(text);
    expect(result.hasGarbage).toBe(true);
    expect(result.examples[0]).toContain("NZ");
  });

  it("does not flag clean educational text", () => {
    const text = "A car travels 120 km in 3 hours.\nCalculate average speed.\nAverage speed = Distance / Time.";
    const result = detectOcrGarbage(text);
    expect(result.hasGarbage).toBe(false);
  });

  it("is not treated as teaching content: & Si : fragment", () => {
    const { hasGarbage } = detectOcrGarbage("& Si :");
    expect(hasGarbage).toBe(true);
  });
});

describe("OCR garbage detection — edge cases", () => {
  it("does not flag legitimate short abbreviations like km/h or m/s", () => {
    const text = "Speed = 40 km/h\nConvert to m/s\nDistance = 20 km";
    const { hasGarbage } = detectOcrGarbage(text);
    expect(hasGarbage).toBe(false);
  });

  it("does not flag single-variable formula tokens like V or R when in formula context", () => {
    // Formulas with short letters are valid educational content
    const text = "V = IR\nR = V / I\nCalculate current.";
    const { hasGarbage } = detectOcrGarbage(text);
    expect(hasGarbage).toBe(false);
  });

  it("does not flag full country/proper names as garbage", () => {
    const { hasGarbage } = detectOcrGarbage("New Zealand was founded in 1840.");
    expect(hasGarbage).toBe(false);
  });

  it("flags NZ when isolated as a standalone line fragment", () => {
    // Isolated 2-char token with no context — typical OCR screen artifact
    const { hasGarbage, examples } = detectOcrGarbage("NZ");
    expect(hasGarbage).toBe(true);
    expect(examples[0]).toContain("NZ");
  });

  it("does not let flagged garbage reach teacher requirement after sanitization", () => {
    // Simulates the full path: OCR garbage → sanitizeTeacherRequirement → empty
    const ocrNoise = ["NZ", "& Si :", "!@#"];
    for (const noise of ocrNoise) {
      expect(sanitizeTeacherRequirement(noise)).toBe("");
    }
  });

  it("confidence is reduced: mixed OCR with garbage should be flagged", () => {
    // Real scenario: CBSE question with mobile screen artifacts
    const contaminated = [
      "CBSE Class 9 Physics",
      "NZ",                          // garbage fragment
      "A car travels 120 km in 3 hours.",
      "& Si :",                       // garbage fragment
      "Calculate average speed.",
    ].join("\n");
    const { hasGarbage, examples } = detectOcrGarbage(contaminated);
    expect(hasGarbage).toBe(true);
    expect(examples.length).toBeGreaterThanOrEqual(1);
  });
});

describe("teacher requirement sanitization", () => {
  it("returns empty string for a two-letter garbage token like NZ", () => {
    expect(sanitizeTeacherRequirement("NZ")).toBe("");
  });

  it("returns empty string for pure symbols", () => {
    expect(sanitizeTeacherRequirement("& Si :")).toBe("");
  });

  it("preserves a genuine teacher instruction", () => {
    const req = "Focus on the worked example and conversion steps.";
    expect(sanitizeTeacherRequirement(req)).toBe(req);
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeTeacherRequirement("   ")).toBe("");
  });
});
