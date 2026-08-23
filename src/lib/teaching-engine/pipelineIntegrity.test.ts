import { describe, expect, it } from "vitest";
import { extractAcademicQuestions } from "@/lib/teaching-engine/academicExtractor";
import { ensureMinimumDisintegrationCards } from "@/lib/teaching-engine/disintegration";
import { buildFallbackTeachingImageAnalysis } from "@/lib/teaching-engine/masterImageFallback";
import type { ExtractedContent } from "@/types/teaching-engine";

describe("teaching-engine integrity pipeline", () => {
  it("keeps spherical-mirror workflow educational and context-correct end-to-end", () => {
    const ocrText = [
      '20:14 (2 2 devices 1 "SI @72%"',
      "Share a link to chat?",
      "This creates a copy that others can chat with",
      "CBSE CLASS 10 - PHYSICS",
      "Chapter: Light - Reflection and Refraction",
      "Topic: Spherical Mirrors",
      "A spherical mirror is a part of a hollow sphere.",
      "Important terms: Pole, principal focus, radius of curvature",
      "If the focal length of a concave mirror is 15 cm, find radius of curvature.",
      "Given: f = 15 cm",
      "Formula: R = 2f",
      "R = 2 × 15",
      "Therefore: R = 30 cm",
      "Answer: Radius of curvature = 30 cm",
      "V = IR",
    ].join("\n");

    const extractedItems = extractAcademicQuestions(ocrText);
    expect(extractedItems).toHaveLength(1);

    const extracted = extractedItems[0];
    expect(extracted.subject).toBe("Physics");
    expect(extracted.board).toBe("CBSE");
    expect(extracted.classLevel).toBe("Class 10");
    expect(extracted.chapter).toBe("Light - Reflection and Refraction");
    expect(extracted.topic).toBe("Light / Spherical Mirrors");
    expect(extracted.concept).toBe("Concave/Convex Mirror");
    expect(extracted.formulae.join(" | ")).toMatch(/R\s*=\s*2f/i);
    expect(extracted.formulae.join(" | ")).not.toMatch(/V\s*=\s*I\s*R/i);
    expect(extracted.formulae).not.toContain("f = 15 cm");
    expect(extracted.formulae).not.toContain("R = 30 cm");

    const sourceJoined = `${extracted.ocrText}\n${extracted.academicSourceContent}`;
    expect(sourceJoined).not.toMatch(
      /20:14|2\s*devices|share a link to chat|copy that others can chat/i,
    );

    const analysis = buildFallbackTeachingImageAnalysis(
      extracted,
      [
        "Given: f = 15 cm",
        "Formula: R = 2f",
        "R = 2 × 15",
        "R = 30 cm",
        "Answer: Radius of curvature = 30 cm",
        "Use R = 2f.",
        "Share a link to chat?",
      ].join("\n"),
    );

    const cards = ensureMinimumDisintegrationCards(analysis);
    const cardsJoined = cards
      .map((card) => `${card.title}\n${card.explanation}\n${card.keyPoints.join("\n")}`)
      .join("\n");

    expect(cards.length).toBeGreaterThanOrEqual(8);
    expect(cards.some((card) => /additional exam coverage/i.test(card.title))).toBe(true);
    expect(cardsJoined).toContain("R = 2f");
    expect(cardsJoined).toContain("30 cm");
    expect(cardsJoined).toContain("R = 2 × 15");
    expect(cardsJoined).toContain("Answer: Radius of curvature = 30 cm");
    expect(cardsJoined).not.toMatch(
      /20:14|2\s*devices|share a link to chat|copy that others can chat/i,
    );
    expect(cardsJoined).not.toMatch(/V\s*=\s*I\s*R/i);
    expect(cardsJoined).not.toMatch(/\bUnknown\b/i);
  });

  it("renders universal mathematics notation through analysis and disintegration", () => {
    const extracted: ExtractedContent = {
      subject: "Mathematics",
      board: "CBSE",
      classLevel: "Class 10",
      chapter: "Quadratic Equations",
      topic: "Roots and Discriminant",
      concept: "Quadratic Roots",
      questionType: "Short answer",
      questionTypes: ["Short answer"],
      language: "English",
      hasTables: false,
      hasExercises: false,
      keywords: ["quadratic equations", "roots", "discriminant"],
      ocrText:
        "2x2 - 5x - 3 = 0\nx2 - 6x + 9 = 0\nDelta = b2 - 4ac\nx = (-b +/- sqrt(b2 - 4ac)) / 2a\nalpha + beta = -b/a\nalpha beta = c/a",
      cleanedOcrText:
        "2x2 - 5x - 3 = 0\nx2 - 6x + 9 = 0\nDelta = b2 - 4ac\nx = (-b +/- sqrt(b2 - 4ac)) / 2a\nalpha + beta = -b/a\nalpha beta = c/a",
      formulae: ["x = (-b +/- sqrt(b2 - 4ac)) / 2a"],
      diagrams: [],
      numericalQuestions: ["Find the roots of 2x2 - 5x - 3 = 0."],
      examImportance: "High",
      academicSourceContent: "",
    };

    const analysis = buildFallbackTeachingImageAnalysis(
      extracted,
      "2x2 - 5x - 3 = 0\nx2 - 6x + 9 = 0\nDelta = b2 - 4ac\nx = (-b +/- sqrt(b2 - 4ac)) / 2a\nalpha + beta = -b/a\nalpha beta = c/a",
    );

    const cards = ensureMinimumDisintegrationCards(analysis);
    const joined = cards
      .map((card) => `${card.title}\n${card.explanation}\n${card.keyPoints.join("\n")}`)
      .join("\n");

    expect(joined).toContain("2x² − 5x − 3 = 0");
    expect(joined).toContain("x² − 6x + 9 = 0");
    expect(joined).toContain("Δ = b² − 4ac");
    expect(joined).toContain("x = (−b ± √(b² − 4ac)) / 2a");
    expect(joined).toContain("α + β = −b/a");
    expect(joined).toContain("α β = c/a");
  });
});
