import { describe, expect, it } from "vitest";
import { buildMasterImageSpec } from "@/components/teaching-engine/MasterImageWorkflow";
import type { ExtractedContent } from "@/types/teaching-engine";

describe("buildMasterImageSpec", () => {
  it("uses cleaned mirror-context content and preserved metadata without V = IR", () => {
    const extracted: ExtractedContent = {
      ocrText: "CBSE Class 10 Physics\nChapter: Light - Reflection and Refraction\nTopic: Light / Spherical Mirrors",
      subject: "Physics",
      board: "CBSE",
      classLevel: "Class 10",
      chapter: "Light - Reflection and Refraction",
      topic: "Light / Spherical Mirrors",
      concept: "Concave/Convex Mirror",
      questionType: "Numerical/Problem",
      questionTypes: ["Numerical/Problem"],
      language: "English",
      hasTables: false,
      hasExercises: false,
      examImportance: "Past-paper frequency unavailable.",
      formulae: ["R = 2f", "V = IR"],
      numericalQuestions: ["Given: f = 15 cm"],
      diagrams: ["Mirror ray diagram"],
      keywords: ["mirror", "focal"],
    };

    const teachingResponse = [
      "For spherical mirrors, use R = 2f.",
      "Worked example: f = 15 cm, R = 30 cm.",
      "V = IR is not applicable here.",
    ].join("\n");

    const sourceText = [
      "Given: f = 15 cm",
      "Formula: R = 2f",
      "R = 2 × 15",
      "R = 30 cm",
    ].join("\n");

    const spec = buildMasterImageSpec(extracted, teachingResponse, "", sourceText);

    expect(spec).toContain("Subject: Physics");
    expect(spec).toContain("Chapter: Light - Reflection and Refraction");
    expect(spec).toContain("Topic: Light / Spherical Mirrors");
    expect(spec).toContain("R = 2f");
    expect(spec).toContain("R = 2 × 15");
    expect(spec).toContain("R = 30 cm");
    expect(spec).not.toMatch(/V\s*=\s*I\s*R/i);
    expect(spec).not.toMatch(/\bUnknown\b/i);
    expect(spec).toContain("IMPORTANT ADDITIONAL EXAM COVERAGE");
  });
});
