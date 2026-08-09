import { describe, expect, it } from "vitest";
import { ensureMinimumDisintegrationCards } from "@/lib/teaching-engine/disintegration";

describe("ensureMinimumDisintegrationCards", () => {
  it("creates a coverage-safe deck with at least seven cards for a dense topic", () => {
    const cards = ensureMinimumDisintegrationCards({
      mainTopic: "Electricity",
      subtopics: ["Current", "Resistance", "Ohm's Law", "Circuit"] ,
      sourceContent: [
        "Current is the flow of charge.",
        "Resistance opposes current flow.",
        "Ohm's law relates voltage, current and resistance.",
        "A simple circuit includes a cell, resistor and switch."
      ],
      additionalExamCoverage: [
        "Series and parallel combination questions.",
        "Power and energy calculations.",
        "Practical circuit diagrams."
      ],
      definitions: [
        { title: "Definition", text: "Electric current is the flow of electric charge." }
      ],
      formulae: [
        { formula: "V = IR", meaning: "Voltage equals current times resistance.", units: "V, A, Ω" }
      ],
      workedExamples: [
        { title: "Worked Example", problem: "Find current in a 12 V circuit with 4 Ω resistor.", steps: "I = V / R = 12 / 4 = 3 A" }
      ],
      diagrams: [
        { title: "Circuit Diagram", description: "Simple closed circuit with battery and resistor." }
      ],
      tables: [
        { title: "Resistance Comparison", description: "Series vs parallel resistance." }
      ],
      importantFacts: [
        "Current flows from higher potential to lower potential.",
        "Resistance is measured in ohms.",
        "Power depends on current and voltage."
      ],
      examPoints: [
        "Appeared directly in board papers.",
        "Typical marks: 3-5 marks."
      ],
      commonQuestionTypes: [
        "Numerical", "Conceptual"
      ],
      commonMistakes: [
        "Using current and voltage interchangeably.",
        "Forgetting unit conversion."
      ],
      revisionPoints: [
        "Remember formula V = IR.",
        "Check units carefully.",
        "Practice circuit diagrams."
      ],
      cards: []
    });

    expect(cards.length).toBeGreaterThanOrEqual(7);
    expect(cards.some((card) => /definition|concept/i.test(card.title))).toBe(true);
    expect(cards.some((card) => /formula/i.test(card.title))).toBe(true);
    expect(cards.some((card) => /example|worked/i.test(card.title))).toBe(true);
    expect(cards.some((card) => /mistake/i.test(card.title))).toBe(true);
    expect(cards.some((card) => /exam|revision/i.test(card.title))).toBe(true);
    expect(cards.some((card) => /source content/i.test(card.title))).toBe(true);
    expect(cards.some((card) => /additional exam coverage/i.test(card.title))).toBe(true);
  });
});
