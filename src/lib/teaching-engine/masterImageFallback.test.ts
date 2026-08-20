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

    const joined = analysis.cards.map((card) => `${card.title}\n${card.explanation}\n${card.keyPoints.join("\n")}`).join("\n");

    expect(analysis.mainTopic).toBe("Electricity");
    expect(analysis.cards.length).toBeGreaterThanOrEqual(7);
    expect(analysis.cards.some((card) => /formula/i.test(card.title))).toBe(true);
    expect(analysis.cards.some((card) => /example/i.test(card.title))).toBe(true);
    expect(analysis.cards.some((card) => /mistake/i.test(card.title))).toBe(true);
    expect(analysis.cards.some((card) => /exam|revision/i.test(card.title))).toBe(true);
    expect(joined).not.toMatch(/add one application prompt|create a single comprehensive educational infographic|simple labelled classroom diagram|work through one guided example/i);
    expect(joined).toContain("V = IR");
  });

  it("keeps spherical-mirror formula context and excludes irrelevant electricity formula", () => {
    const extracted: ExtractedContent = {
      ocrText: "CBSE Class 10 Physics Chapter: Light - Reflection and Refraction Topic: Spherical Mirrors",
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
      formulae: ["V = IR", "R = 2f"],
      numericalQuestions: ["Given f = 15 cm, find radius of curvature."],
      diagrams: ["Mirror ray diagram"],
      keywords: ["mirror", "focal", "radius"],
    };

    const analysis = buildFallbackTeachingImageAnalysis(
      extracted,
      [
        "Given: f = 15 cm",
        "Formula: R = 2f",
        "R = 2 × 15",
        "R = 30 cm",
        "Answer: Radius of curvature = 30 cm",
        "Share a link to chat?",
      ].join("\n"),
    );

    const joined = analysis.cards.map((card) => `${card.title}\n${card.explanation}\n${card.keyPoints.join("\n")}`).join("\n");
    const formulaJoined = analysis.formulae.map((item) => item.formula).join(" | ");

    expect(analysis.mainTopic).toBe("Light / Spherical Mirrors");
    expect(analysis.subtopics[0]).toBe("Light - Reflection and Refraction");

    expect(formulaJoined).toContain("R = 2f");
    expect(formulaJoined).not.toMatch(/V\s*=\s*I\s*R/i);
    expect(joined).toContain("30 cm");
    expect(joined).toContain("R = 2 × 15");
    expect(joined).toContain("Answer: Radius of curvature = 30 cm");
    expect(joined).not.toMatch(/share a link to chat/i);
    expect(joined).not.toMatch(/\bunknown\b/i);
  });
});
