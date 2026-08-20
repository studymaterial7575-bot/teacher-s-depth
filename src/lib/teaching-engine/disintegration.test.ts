import { describe, expect, it } from "vitest";
import { ensureMinimumDisintegrationCards } from "@/lib/teaching-engine/disintegration";

describe("ensureMinimumDisintegrationCards", () => {
  it("creates a source-first teaching deck with dynamic card count for a dense topic", () => {
    const cards = ensureMinimumDisintegrationCards({
      mainTopic: "Electricity",
      subtopics: ["Current", "Resistance", "Ohm's Law", "Circuit"],
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

    expect(cards.length).toBeGreaterThanOrEqual(6);
    expect(cards.some((card) => /definition|concept/i.test(card.title))).toBe(true);
    expect(cards.some((card) => /formula/i.test(card.title))).toBe(true);
    expect(cards.some((card) => /example|worked/i.test(card.title))).toBe(true);
    expect(cards.some((card) => /mistake/i.test(card.title))).toBe(true);
    expect(cards.some((card) => /exam|revision/i.test(card.title))).toBe(true);
    expect(cards.some((card) => /source content/i.test(card.title))).toBe(true);
    expect(cards.some((card) => /additional exam coverage/i.test(card.title))).toBe(true);
  });

  it("strips internal generation instructions from card content", () => {
    const cards = ensureMinimumDisintegrationCards({
      mainTopic: "Ohm's Law",
      subtopics: ["Electrical current", "Resistance"],
      sourceContent: [
        "Voltage is directly proportional to current, V = IR.",
      ],
      additionalExamCoverage: [
        "Explain V = IR and define each variable.",
      ],
      definitions: [
        { title: "Definition", text: "Current is the flow of charge." },
      ],
      formulae: [
        { formula: "V = IR", meaning: "Voltage = current × resistance", units: "V, A, Ω" },
      ],
      workedExamples: [
        { title: "Worked Example", problem: "Find current using V = 12 V and R = 4 Ω.", steps: "I = V / R = 12 / 4 = 3 A" },
      ],
      diagrams: [
        { title: "Circuit Diagram", description: "A battery, resistor, and ammeter connected in series." },
      ],
      tables: [],
      importantFacts: ["Resistance opposes current flow."],
      examPoints: ["Define variables and solve numerically."],
      commonQuestionTypes: ["Numerical application"],
      commonMistakes: ["Forgetting to include units."],
      revisionPoints: ["Memorise V = IR and define each variable."],
      cards: [
        {
          title: "Prompt instruction card",
          explanation: "Create a single comprehensive educational infographic covering the complete topic.",
          keyPoints: ["Add one application prompt.", "Use a simple labelled classroom diagram."],
        },
      ],
    });

    const joined = cards.map((card) => `${card.title}\n${card.explanation}\n${card.keyPoints.join("\n")}`).join("\n");
    expect(joined).not.toMatch(/create a single comprehensive educational infographic|add one application prompt|use a simple labelled classroom diagram|work through one guided example/i);
    expect(joined).not.toMatch(/you are generating a teaching response|this is not a chatbot conversation|output formatting instructions|student profile\s*:/i);
    expect(joined).toContain("V = IR");
  });

  it("does not force filler cards when source understanding is sparse", () => {
    const cards = ensureMinimumDisintegrationCards({
      mainTopic: "Spherical Mirrors",
      subtopics: [],
      sourceContent: ["A spherical mirror is a part of a hollow sphere."],
      additionalExamCoverage: [],
      definitions: [],
      formulae: [],
      workedExamples: [],
      diagrams: [],
      tables: [],
      importantFacts: [],
      examPoints: [],
      commonQuestionTypes: [],
      commonMistakes: [],
      revisionPoints: [],
      cards: [],
    });

    expect(cards.length).toBeGreaterThanOrEqual(1);
    expect(cards.length).toBeLessThan(7);
    expect(cards.every((card) => card.explanation.length > 0)).toBe(true);
  });

  it("uses spherical-mirror understanding content and excludes prompt/instruction leakage", () => {
    const cards = ensureMinimumDisintegrationCards({
      mainTopic: "Spherical Mirrors",
      subtopics: ["Concave mirror", "Convex mirror", "Mirror formula"],
      sourceContent: [
        "A spherical mirror is a part of a hollow sphere.",
        "Concave mirror converges light rays while convex mirror diverges them.",
        "If the focal length of a concave mirror is 15 cm, find radius of curvature.",
      ],
      additionalExamCoverage: [
        "Apply R = 2f for practice with different focal lengths.",
      ],
      definitions: [
        { title: "Spherical mirror", text: "A spherical mirror is formed from a section of a hollow sphere." },
      ],
      formulae: [
        { formula: "R = 2f", meaning: "Radius of curvature is twice the focal length.", units: "cm" },
      ],
      workedExamples: [
        {
          title: "Worked Example",
          problem: "Given f = 15 cm, find R.",
          steps: "Use R = 2f. Substitute f = 15 cm. R = 30 cm.",
        },
      ],
      diagrams: [
        { title: "Mirror Diagram", description: "Label pole (P), focus (F), and centre of curvature (C) on principal axis." },
      ],
      tables: [],
      importantFacts: ["Concave mirrors can form real or virtual images."],
      examPoints: ["Past-paper frequency unavailable."],
      commonQuestionTypes: ["Numerical"],
      commonMistakes: ["Confusing focal length with radius of curvature."],
      revisionPoints: ["Remember R = 2f for spherical mirrors."],
      cards: [
        {
          title: "Prompt Text",
          explanation: "You are generating a teaching response. This is not a chatbot conversation.",
          keyPoints: ["OUTPUT FORMATTING INSTRUCTIONS", "Respond in exactly three sections"],
        },
      ],
    });

    const joined = cards.map((card) => `${card.title}\n${card.explanation}\n${card.keyPoints.join("\n")}`).join("\n");

    expect(cards.length).toBeGreaterThanOrEqual(4);
    expect(joined).toContain("spherical mirror");
    expect(joined).toContain("R = 2f");
    expect(joined).toContain("f = 15 cm");
    expect(joined).not.toMatch(/you are generating a teaching response|this is not a chatbot conversation|output formatting instructions|respond in exactly three sections/i);
    expect(cards.some((card) => /additional exam coverage/i.test(card.title))).toBe(true);
  });

  it("filters mobile/browser contamination from teaching cards", () => {
    const cards = ensureMinimumDisintegrationCards({
      mainTopic: "Spherical Mirrors",
      subtopics: ["Light - Reflection and Refraction"],
      sourceContent: [
        "20:14 (2 2 devices 1 \"SI @72%\"",
        "Share a link to chat?",
        "This creates a copy that others can chat with",
        "Given f = 15 cm and R = 2f for spherical mirrors.",
      ],
      additionalExamCoverage: [
        "Same-topic CBSE Class 10 mirror practice.",
      ],
      definitions: [{ title: "Definition", text: "A spherical mirror is part of a hollow sphere." }],
      formulae: [{ formula: "R = 2f", meaning: "Radius of curvature is twice focal length.", units: "cm" }],
      workedExamples: [{ title: "Worked Example", problem: "f = 15 cm", steps: "R = 2f = 30 cm" }],
      diagrams: [{ title: "Mirror", description: "Label P, F and C." }],
      tables: [],
      importantFacts: [],
      examPoints: ["Past-paper frequency unavailable."],
      commonQuestionTypes: ["Numerical"],
      commonMistakes: ["Do not confuse R and f."],
      revisionPoints: ["R = 2f"],
      cards: [],
    });

    const joined = cards.map((card) => `${card.title}\n${card.explanation}\n${card.keyPoints.join("\n")}`).join("\n");
    expect(joined).not.toMatch(/20:14|2\s*devices|share a link to chat|copy that others can chat/i);
    expect(joined).toContain("R = 2f");
  });

  it("preserves complete spherical-mirror worked example chain with explicit final answer", () => {
    const cards = ensureMinimumDisintegrationCards({
      mainTopic: "Light / Spherical Mirrors",
      subtopics: ["Concave mirror", "Convex mirror", "Reflection and Refraction"],
      sourceContent: [
        "CBSE Class 10 Physics chapter context for spherical mirrors.",
      ],
      additionalExamCoverage: ["Same-topic mirror practice questions."],
      definitions: [
        { title: "Definition", text: "A spherical mirror is a part of a hollow sphere." },
      ],
      formulae: [
        { formula: "R = 2f", meaning: "Radius of curvature is twice focal length.", units: "cm" },
      ],
      workedExamples: [
        {
          title: "Worked Example",
          problem: "Find radius of curvature when focal length is 15 cm.",
          steps: [
            "Given:",
            "f = 15 cm",
            "Formula:",
            "R = 2f",
            "Substitution:",
            "R = 2 × 15",
            "Calculation:",
            "R = 30 cm",
            "Final Answer:",
            "Radius of curvature = 30 cm",
            "V = IR",
          ].join("\n"),
        },
      ],
      diagrams: [{ title: "Mirror Diagram", description: "Label P, F and C." }],
      tables: [],
      importantFacts: [],
      examPoints: ["Practice numericals based on R = 2f."],
      commonQuestionTypes: ["Numerical"],
      commonMistakes: ["Do not confuse focal length and radius of curvature."],
      revisionPoints: ["Use R = 2f for spherical mirrors."],
      cards: [],
    });

    const workedCard = cards.find((card) => /worked example/i.test(card.title));
    expect(workedCard).toBeDefined();

    const workedText = [workedCard?.explanation ?? "", ...(workedCard?.keyPoints ?? []), workedCard?.example ?? ""].join("\n");

    expect(workedText).toContain("Given:");
    expect(workedText).toContain("f = 15 cm");
    expect(workedText).toContain("Formula:");
    expect(workedText).toContain("R = 2f");
    expect(workedText).toContain("Substitution:");
    expect(workedText).toContain("R = 2 × 15");
    expect(workedText).toContain("Calculation:");
    expect(workedText).toContain("R = 30 cm");
    expect(workedText).toContain("Final Answer:");
    expect(workedText).toContain("Radius of curvature = 30 cm");
    expect(workedText).not.toMatch(/V\s*=\s*I\s*R/i);
  });
});
