import { describe, expect, it } from "vitest";
import { extractAcademicQuestions } from "@/lib/teaching-engine/academicExtractor";
import { buildPromptTexts, createResearchPrompt, detectGhostStoryInterest } from "@/lib/teaching-engine/promptBuilder";
import type {
  DepthOption,
  ExplanationStyleOption,
  StudentProfileOption,
  VisualStyleOption,
} from "@/types/teaching-engine";

const profile: StudentProfileOption[] = ["Average", "Step-by-step explanation"];
const depth: DepthOption[] = ["Definition", "Worked examples"];
const visual: VisualStyleOption = "Simple labeled diagram";
const explanation: ExplanationStyleOption = "Simple classroom language";

describe("academic extraction pipeline", () => {
  it("extracts a single Physics question correctly", () => {
    const text = [
      "Class 10 Physics",
      "Topic: Ohm's Law",
      "Calculate current if V = 12V and R = 4 ohm.",
      "Formula: V = IR",
    ].join("\n");

    const items = extractAcademicQuestions(text);
    expect(items).toHaveLength(1);
    expect(items[0].subject).toBe("Physics");
    expect(items[0].chapter).toBe("Electricity");
    expect(items[0].topic).toBe("Ohm's Law");
    expect(items[0].questionType).toBe("Numerical/Problem");
    expect(items[0].formulae.join(" ")).toContain("V = IR");
  });

  it("extracts a single Biology question correctly", () => {
    const text = [
      "Biology",
      "Explain photosynthesis in detail.",
      "Carbon dioxide + Water -> Glucose + Oxygen",
    ].join("\n");

    const items = extractAcademicQuestions(text);
    expect(items).toHaveLength(1);
    expect(items[0].subject).toBe("Biology");
    expect(items[0].chapter).toBe("Life Processes");
    expect(items[0].topic).toBe("Photosynthesis");
    expect(items[0].questionType).toBe("Concept Explanation");
    expect(items[0].formulae.join(" ")).toContain("Glucose + Oxygen");
  });

  it("separates mixed Physics and Biology questions", () => {
    const text = [
      "Test 1 - Physics - Ohm's Law",
      "Calculate current if V = 10V and R = 2 ohm.",
      "V = IR",
      "Test 2 - Biology - Photosynthesis",
      "Explain role of chlorophyll.",
      "Carbon dioxide + Water -> Glucose + Oxygen",
    ].join("\n");

    const items = extractAcademicQuestions(text);
    expect(items).toHaveLength(2);
    expect(items[0].subject).toBe("Physics");
    expect(items[1].subject).toBe("Biology");
    expect(items[0].formulae.join(" ")).toContain("V = IR");
    expect(items[1].formulae.join(" ")).not.toContain("V = IR");
  });

  it("extracts four independent subjects from one OCR", () => {
    const text = [
      "Test 3 - Biology - Photosynthesis",
      "Test 4 - Physics - Ohm's Law",
      "Test 6 - History - First World War",
      "Test 7 - Geography - Water Cycle",
    ].join("\n");

    const items = extractAcademicQuestions(text);
    expect(items).toHaveLength(4);
    expect(items.map((item) => item.subject)).toEqual(["Biology", "Physics", "History", "Geography"]);
  });

  it("handles formula-only OCR", () => {
    const text = "V = IR";
    const items = extractAcademicQuestions(text);
    expect(items).toHaveLength(1);
    expect(items[0].formulae.length).toBeGreaterThan(0);
    expect(items[0].subject).toBe("Physics");
  });

  it("handles diagram-only OCR", () => {
    const text = "Draw and label the Water Cycle diagram.";
    const items = extractAcademicQuestions(text);
    expect(items).toHaveLength(1);
    expect(items[0].subject).toBe("Geography");
    expect(items[0].questionType).toBe("Diagram-based");
    expect(items[0].diagrams.length).toBeGreaterThan(0);
  });

  it("handles numerical-only OCR", () => {
    const text = "Find the current when voltage is 12V and resistance is 3 ohm.";
    const items = extractAcademicQuestions(text);
    expect(items).toHaveLength(1);
    expect(items[0].questionType).toBe("Numerical/Problem");
    expect(items[0].numericalQuestions.length).toBeGreaterThan(0);
  });

  it("handles long-answer OCR", () => {
    const text = "Explain the causes of the First World War.";
    const items = extractAcademicQuestions(text);
    expect(items).toHaveLength(1);
    expect(items[0].subject).toBe("History");
    expect(items[0].questionType).toBe("Concept Explanation");
  });

  it("classifies spherical mirror content as Physics and detects concept", () => {
    const text = [
      "An object is placed in front of a concave mirror.",
      "Mark focus and centre of curvature on the principal axis.",
      "Use mirror formula to explain image formation.",
    ].join("\n");

    const items = extractAcademicQuestions(text);
    expect(items).toHaveLength(1);
    expect(items[0].subject).toBe("Physics");
    expect(items[0].topic).toBe("Light / Spherical Mirrors");
    expect(items[0].concept).toBe("Concave Mirror");
    expect(items[0].board).toBe("Not identified");
    expect(items[0].keywords).toEqual(expect.arrayContaining(["object", "focus", "curvature"]));
  });

  it("normalizes common OCR confusions before metadata inference", () => {
    const text = [
      "0bject in front of c0ncave mirror",
      "mark f0cus and center of curvature",
      "explain reflecti0n and 1mage formation",
    ].join("\n");

    const items = extractAcademicQuestions(text);
    expect(items).toHaveLength(1);
    expect(items[0].subject).toBe("Physics");
    expect(items[0].topic).toBe("Light / Spherical Mirrors");
    expect(items[0].keywords).toEqual(expect.arrayContaining(["object", "focus", "curvature", "mirror"]));
  });

  it("normalizes OCR-corrupted mirror formula while preserving raw formula", () => {
    const text = [
      "mirror formula",
      "I/f = I/v + I/u",
      "m = v/u",
    ].join("\n");

    const items = extractAcademicQuestions(text);
    expect(items).toHaveLength(1);
    expect((items[0].formulaDetails?.length ?? 0) > 0).toBe(true);
    expect(items[0].formulae.join(" | ")).toContain("1/f = 1/v + 1/u");
    expect(items[0].formulaDetails?.some((item) => item.raw.includes("I/f") && item.normalized.includes("1/f"))).toBe(true);
  });

  it("ignores chat UI noise", () => {
    const text = [
      "Reply to ChatGPT",
      "Share a link to chat",
      "8:42 PM",
      "87%",
      "Physics",
      "Calculate current if V = 24V and R = 6 ohm.",
    ].join("\n");

    const items = extractAcademicQuestions(text);
    expect(items).toHaveLength(1);
    expect(items[0].subject).toBe("Physics");
    expect(items[0].ocrText.toLowerCase()).not.toContain("reply to chatgpt");
    expect(items[0].ocrText).not.toContain("87%");
  });

  it("returns Unknown on low-confidence OCR", () => {
    const text = "blurry zxqv text random letters";
    const items = extractAcademicQuestions(text);
    expect(items).toHaveLength(1);
    expect(items[0].subject).toBe("Unknown");
    expect(items[0].topic).toBe("Unknown");
  });

  it("handles cropped screenshots with partial context", () => {
    const text = "... Ohm's law ... current and resistance ...";
    const items = extractAcademicQuestions(text);
    expect(items).toHaveLength(1);
    expect(items[0].subject).toBe("Physics");
    expect(items[0].chapter).toBe("Electricity");
  });

  it("generates one prompt per extracted question", () => {
    const text = [
      "Physics - Ohm's Law - Calculate current if V = 12V and R = 4 ohm.",
      "Biology - Explain photosynthesis.",
    ].join("\n");
    const items = extractAcademicQuestions(text);

    const prompts = buildPromptTexts({
      sourceFiles: ["Image: test.png"],
      extracted: items[0],
      extractedItems: items,
      studentProfile: profile,
      depthOptions: depth,
      selectedOutputOptions: ["Normal Solution", "Logical Flow", "Create Teaching Image"],
      visualStyle: visual,
      explanationStyle: explanation,
      objective: "Generate classroom-ready output.",
    });

    expect(prompts).toHaveLength(2);
    expect(prompts[0]).toContain("Subject: Physics");
    expect(prompts[1]).toContain("Subject: Biology");
    expect(prompts[0]).not.toContain("Subject: Biology");
    expect(prompts[0]).toContain("SOURCE CONTENT ONLY");
    expect(prompts[0]).toContain("IMPORTANT ADDITIONAL EXAM COVERAGE");
    expect(prompts[0]).toContain("Do not reuse previous teaching context");
  });

  it("detects ghost story interest and produces a classroom-safe research prompt", () => {
    const input = "Students really like real ghost stories. Find me an interesting one.";
    const signal = detectGhostStoryInterest(input);

    expect(signal.kind).toBe("ghost_story");
    expect(signal.confidence).toBeGreaterThan(0.5);

    const prompt = createResearchPrompt(input);
    expect(prompt).not.toBe("");
    expect(prompt).toContain("ENTERTAINMENT + CURIOSITY + REAL-WORLD STORY");
    expect(prompt).toContain("Do not present paranormal or supernatural claims as scientifically proven");
    expect(prompt).toContain("Verified facts");
    expect(prompt).toContain("YouTube claims");
    expect(prompt).toContain("What do you think happened?");
  });

  it("recognizes ghost stories from Mumbai and YouTube discovery paths", () => {
    const input = "Tell me about a real ghost story from Mumbai and what YouTube episodes claim.";
    const signal = detectGhostStoryInterest(input);

    expect(signal.kind).toBe("ghost_story");
    expect(signal.confidence).toBeGreaterThan(0.5);

    const prompt = createResearchPrompt(input);
    expect(prompt).toContain("Mumbai");
    expect(prompt).toContain("original/reliable reporting");
    expect(prompt).toContain("source verification");
  });
});
