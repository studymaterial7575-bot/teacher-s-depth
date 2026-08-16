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

  it("does not split concave and convex concept headings into separate questions", () => {
    const text = [
      "Physics",
      "Topic: Spherical Mirrors",
      "There are two types of spherical mirrors:",
      "1. Concave mirror",
      "2. Convex mirror",
      "Important terms:",
      "Pole (P)",
      "Centre of curvature (C)",
      "Example: If the focal length is 15 cm, find its radius of curvature.",
    ].join("\n");

    const items = extractAcademicQuestions(text);
    expect(items).toHaveLength(1);
    expect(items[0].subject).toBe("Physics");
    expect(items[0].topic).toBe("Spherical Mirrors");
    expect(items[0].ocrText).toContain("Example: If the focal length is 15 cm, find its radius of curvature.");
    expect(items[0].ocrText).not.toContain("1. Concave mirror");
    expect(items[0].ocrText).not.toContain("2. Convex mirror");
  });

  it("keeps the live OCR spherical mirror source as one genuine question and no false concept blocks", () => {
    const source = [
      "CBSE CLASS 10 – PHYSICS",
      "",
      "Chapter: Light – Reflection and Refraction",
      "",
      "Topic: Spherical Mirrors",
      "",
      "A spherical mirror is a part of a hollow sphere.",
      "",
      "There are two types of spherical mirrors:",
      "1. Concave mirror",
      "2. Convex mirror",
      "",
      "Important terms:",
      "• Pole (P)",
      "• Centre of curvature (C)",
      "• Radius of curvature (R)",
      "• Principal focus (F)",
      "• Focal length (f)",
      "",
      "For a spherical mirror:",
      "",
      "R = 2f",
      "",
      "Example:",
      "If the focal length of a concave mirror is 15 cm, find its radius of curvature.",
      "",
      "Given:",
      "f = 15 cm",
      "",
      "Formula:",
      "R = 2f",
      "",
      "Therefore:",
      "R = 2 × 15",
      "R = 30 cm",
      "",
      "Answer: Radius of curvature = 30 cm",
      "",
      "Quick revision:",
      "• Concave mirror can form real or virtual images.",
      "• Convex mirror forms a virtual, erect and diminished image.",
      "• R = 2f",
      "",
      "Common mistake:",
      "Do not confuse focal length with radius of curvature.",
    ].join("\n");

    const items = extractAcademicQuestions(source);

    expect(items).toHaveLength(1);
    expect(items[0].subject).toBe("Physics");
    expect(items[0].topic).toContain("Spherical Mirrors");
    expect(items[0].ocrText).toContain("1. concave mirror");
    expect(items[0].ocrText).toContain("2. convex mirror");
    expect(items[0].ocrText).toContain("Important terms:");
    expect(items[0].ocrText).toContain("R = 2f");
    expect(items[0].ocrText).toContain("If the focal length of a concave mirror is 15 cm, find its radius of curvature.");
    expect(items.some((item) => item.ocrText.includes("1. concave mirror") && item.ocrText.includes("2. convex mirror") && item.ocrText.includes("Important terms:") && item.ocrText.includes("R = 2f"))).toBe(true);
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

  it("uses only the current user selections in the generated prompt", () => {
    const text = [
      "Physics - Linear Equations - Solve 2x + 5 = 13.",
      "Physics - Light / Spherical Mirrors - Explain image formation.",
    ].join("\n");
    const items = extractAcademicQuestions(text);

    const prompt = buildPromptTexts({
      sourceFiles: ["Image: selection-test.png"],
      extracted: items[0],
      extractedItems: items,
      studentProfile: ["Average", "Step-by-step explanation", "Exam preparation"],
      depthOptions: depth,
      selectedOutputOptions: ["Normal Solution", "Formula Breakdown", "Practice Questions", "Create Teaching Image"],
      visualStyle: visual,
      explanationStyle: explanation,
      objective: "Generate classroom-ready output.",
    })[0];

    expect(prompt).toContain("Average (teacher override)");
    expect(prompt).toContain("Step-by-step explanation (teacher override)");
    expect(prompt).toContain("Exam preparation (teacher override)");
    expect(prompt).not.toContain("Very weak");
    expect(prompt).not.toContain("Visual learner");
    expect(prompt).toContain("Formula Breakdown");
    expect(prompt).toContain("Practice Questions");
    expect(prompt).toContain("Create Teaching Image");
    expect(prompt).not.toContain("Background");
    expect(prompt).not.toContain("Logical Flow");
  });

  it("keeps fresh-run metadata isolated from stale or previous subject data", () => {
    const stale = {
      ocrText: "Linear Equations solve x + 3 = 9.",
      cleanedOcrText: "Linear Equations solve x + 3 = 9.",
      subject: "Linear Equations",
      board: "CBSE",
      classLevel: "Class 10",
      chapter: "Algebra",
      topic: "Linear Equations",
      concept: "Equation solving",
      questionType: "Numerical/Problem",
      questionTypes: ["Numerical/Problem"],
      language: "English",
      hasTables: false,
      hasExercises: false,
      examImportance: "Past-paper frequency unavailable.",
      formulae: [],
      numericalQuestions: ["Solve x + 3 = 9."],
      diagrams: [],
      keywords: ["equation", "solve", "x"],
    };

    const current = {
      ocrText: "Light / Spherical Mirrors explain image formation for a concave mirror.",
      cleanedOcrText: "Light / Spherical Mirrors explain image formation for a concave mirror.",
      subject: "Physics",
      board: "Unknown",
      classLevel: "Class 10",
      chapter: "Light - Reflection and Refraction",
      topic: "Light / Spherical Mirrors",
      concept: "Concave Mirror",
      questionType: "Concept Explanation",
      questionTypes: ["Concept Explanation"],
      language: "English",
      hasTables: false,
      hasExercises: false,
      examImportance: "Past-paper frequency unavailable.",
      formulae: ["1/f = 1/v + 1/u"],
      numericalQuestions: [],
      diagrams: ["ray diagram"],
      keywords: ["mirror", "focus", "image"],
    };

    const prompts = buildPromptTexts({
      sourceFiles: ["Image: fresh-run.png"],
      extracted: stale,
      extractedItems: [current],
      studentProfile: ["Average"],
      depthOptions: depth,
      selectedOutputOptions: ["Normal Solution", "Practice Questions"],
      visualStyle: visual,
      explanationStyle: explanation,
      objective: "Generate classroom-ready output.",
    });

    expect(prompts).toHaveLength(1);
    expect(prompts[0]).toContain("Subject: Physics");
    expect(prompts[0]).toContain("Topic: Light / Spherical Mirrors");
    expect(prompts[0]).not.toContain("Linear Equations");
    expect(prompts[0]).not.toContain("Equation solving");
  });

  it("keeps question-by-question metadata isolated in multi-question OCR", () => {
    const text = [
      "Physics - Linear Equations - Solve 2x + 5 = 13.",
      "Physics - Light / Spherical Mirrors - Explain image formation in a concave mirror.",
    ].join("\n");
    const items = extractAcademicQuestions(text);

    const prompts = buildPromptTexts({
      sourceFiles: ["Image: multi-question.png"],
      extracted: items[0],
      extractedItems: items,
      studentProfile: ["Average"],
      depthOptions: depth,
      selectedOutputOptions: ["Normal Solution", "Logical Flow"],
      visualStyle: visual,
      explanationStyle: explanation,
      objective: "Generate classroom-ready output.",
    });

    expect(prompts).toHaveLength(2);
    expect(prompts[0]).toContain("Topic: Linear Equations");
    expect(prompts[0]).not.toContain("Light / Spherical Mirrors");
    expect(prompts[1]).toContain("Topic: Light / Spherical Mirrors");
    expect(prompts[1]).not.toContain("Linear Equations");
  });

  it("matches the CBSE spherical mirror source, selection, and isolation requirements", () => {
    const source = [
      "CBSE CLASS 10 – PHYSICS",
      "",
      "Chapter: Light – Reflection and Refraction",
      "",
      "Topic: Spherical Mirrors",
      "",
      "A spherical mirror is a part of a hollow sphere.",
      "",
      "There are two types of spherical mirrors:",
      "1. Concave mirror",
      "2. Convex mirror",
      "",
      "Important terms:",
      "• Pole (P)",
      "• Centre of curvature (C)",
      "• Radius of curvature (R)",
      "• Principal focus (F)",
      "• Focal length (f)",
      "",
      "For a spherical mirror:",
      "",
      "R = 2f",
      "",
      "Example:",
      "If the focal length of a concave mirror is 15 cm, find its radius of curvature.",
      "",
      "Given:",
      "f = 15 cm",
      "",
      "Formula:",
      "R = 2f",
      "",
      "Therefore:",
      "R = 2 × 15",
      "R = 30 cm",
      "",
      "Answer: Radius of curvature = 30 cm",
      "",
      "Quick revision:",
      "• Concave mirror can form real or virtual images.",
      "• Convex mirror forms a virtual, erect and diminished image.",
      "• R = 2f",
      "",
      "Common mistake:",
      "Do not confuse focal length with radius of curvature.",
    ].join("\n");

    const items = extractAcademicQuestions(source);
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].subject).toBe("Physics");
    expect(items[0].board).toBe("CBSE");
    expect(items[0].classLevel).toBe("Class 10");
    expect(items[0].chapter).toContain("Light");
    expect(items[0].topic).toContain("Spherical Mirrors");
    expect(items[0].formulae.join(" | ")).toContain("R = 2f");
    expect(items[0].numericalQuestions.join(" ")).toContain("f = 15 cm");

    const prompt = buildPromptTexts({
      sourceFiles: ["Image: spherical-mirrors.png"],
      extracted: items[0],
      extractedItems: items,
      studentProfile: ["Very weak", "Step-by-step explanation", "Exam preparation"],
      depthOptions: ["Definition", "Worked examples", "Common mistakes", "Revision notes"],
      selectedOutputOptions: [
        "Normal Solution",
        "Formula Breakdown",
        "Common Mistakes",
        "Practice Questions",
        "Revision Notes",
        "Create Teaching Image",
      ],
      visualStyle: "Simple labeled diagram",
      explanationStyle: "Simple classroom language",
      objective: "Generate classroom-ready output.",
    })[0];

    const profileSection = prompt.split("STUDENT PROFILE:")[1]?.split("TEACHING DEPTH REQUIRED:")[0] ?? "";

    expect(profileSection).toContain("Very weak (teacher override)");
    expect(profileSection).toContain("Step-by-step explanation (teacher override)");
    expect(profileSection).toContain("Exam preparation (teacher override)");
    expect(profileSection).not.toContain("Average");
    expect(profileSection).not.toContain("Advanced");
    expect(profileSection).not.toContain("Visual learner");
    expect(profileSection).not.toContain("Quick revision");
    expect(profileSection).not.toContain("Deep understanding");
    expect(profileSection).not.toContain("Student finds subject boring");
    expect(profileSection).not.toContain("Formula background");
    expect(profileSection).not.toContain("Teacher mode");
    expect(profileSection).not.toContain("Parent mode");

    expect(prompt).toContain("Normal Solution");
    expect(prompt).toContain("Formula Breakdown");
    expect(prompt).toContain("Common Mistakes");
    expect(prompt).toContain("Practice Questions");
    expect(prompt).toContain("Revision Notes");
    expect(prompt).toContain("Create Teaching Image");
    expect(prompt).not.toContain("Background");
    expect(prompt).not.toContain("Logical Flow");
    expect(prompt).not.toContain("Visual Explanation");
    expect(prompt).not.toContain("Real-life Analogy");
    expect(prompt).not.toContain("Exam Importance");
    expect(prompt).not.toContain("Memory Tricks");
    expect(prompt).not.toContain("Word Meanings");
    expect(prompt).not.toContain("Grammar Explanation");

    expect(prompt).not.toContain("Linear Equations");
    expect(prompt).not.toContain("x + 7 = 15");
    expect(prompt).not.toContain("2x + 5 = 17");
    expect(prompt).not.toContain("3x - 7 = 11");
    expect(prompt).not.toContain("Algebra");

    expect(prompt).toContain("SECTION 1: Normal Solution");
    expect(prompt).toContain("SECTION 2: Scrollable Deep Learning Section");
    expect(prompt).toContain("SECTION 3: Create Teaching Image");

    expect(prompt).toContain("Spherical Mirrors");
    expect(prompt).toContain("Light - Reflection and Refraction");
    expect(prompt).not.toContain("Linear Equations");
    expect(prompt).not.toContain("x + 3 = 9");
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
