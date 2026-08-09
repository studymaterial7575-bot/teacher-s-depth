import { describe, expect, it } from "vitest";
import { buildFallbackTeachingImageAnalysis } from "@/lib/teaching-engine/masterImageFallback";
import type { ExtractedContent } from "@/types/teaching-engine";

describe("buildFallbackTeachingImageAnalysis", () => {
  it("builds a structured teaching deck from local context", () => {
    const extracted: ExtractedContent = {
      ocrText: "Electricity is the flow of charge.",
      subject: "Science",
      board: "CBSE",
      classLevel: "10",
      chapter: "Electricity",
      topic: "Electricity",
      questionType: "Short answer",
      questionTypes: ["Short answer"],
      language: "English",
      hasTables: false,
      hasExercises: false,
      examImportance: "High",
      formulae: ["V = IR"],
      numericalQuestions: ["Find the current in a 12 V circuit with a 4 Ω resistor."],
      diagrams: ["Circuit diagram"],
      keywords: ["circuit", "current", "resistance"],
    };

    const analysis = buildFallbackTeachingImageAnalysis(
      extracted,
      "Electric current flows when a closed circuit is present. Ohm's law relates voltage, current, and resistance.",
    );

    expect(analysis.mainTopic).toBe("Electricity");
    expect(analysis.cards.length).toBeGreaterThanOrEqual(7);
    expect(analysis.cards.some((card) => /formula/i.test(card.title))).toBe(true);
    expect(analysis.cards.some((card) => /example/i.test(card.title))).toBe(true);
    expect(analysis.cards.some((card) => /mistake/i.test(card.title))).toBe(true);
    expect(analysis.cards.some((card) => /exam|revision/i.test(card.title))).toBe(true);
  });
});
