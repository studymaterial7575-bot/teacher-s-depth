import { describe, expect, it } from "vitest";
import { getAutoRelevantOutputOptions } from "@/lib/teaching-engine/outputSelection";
import type { ExtractedContent } from "@/types/teaching-engine";

function makeExtracted(overrides: Partial<ExtractedContent>): ExtractedContent {
  return {
    ocrText: "",
    subject: "Unknown",
    board: "Unknown",
    classLevel: "Unknown",
    chapter: "Unknown",
    topic: "Unknown",
    concept: "Unknown",
    questionType: "Unknown",
    questionTypes: [],
    language: "English",
    hasTables: false,
    hasExercises: false,
    examImportance: "Past-paper frequency unavailable.",
    formulae: [],
    formulaDetails: [],
    numericalQuestions: [],
    diagrams: [],
    keywords: [],
    ...overrides,
  };
}

describe("output selection auto relevance", () => {
  it("does not default to selecting all deep-learning functions", () => {
    const extracted = makeExtracted({
      subject: "Physics",
      topic: "Light / Spherical Mirrors",
      concept: "Concave Mirror",
      questionType: "Concept Explanation",
      questionTypes: ["Concept Explanation", "Diagram-based"],
      keywords: ["object", "concave", "focus", "curvature", "mirror"],
      formulae: ["1/f = 1/v + 1/u"],
      diagrams: ["Draw ray diagram for concave mirror"],
    });

    const selected = getAutoRelevantOutputOptions({
      extracted,
      studentProfile: [],
      objective: "Classroom explanation for exam prep",
    });

    expect(selected).toContain("Normal Solution");
    expect(selected).toContain("Formula Breakdown");
    expect(selected).toContain("Common Mistakes");
    expect(selected).toContain("Revision Notes");
    expect(selected).toContain("Visual Explanation");
    expect(selected).toContain("Create Teaching Image");
    expect(selected).not.toContain("Mind Map");
    expect(selected.length).toBeLessThan(24);
  });
});
