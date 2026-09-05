import { describe, expect, it } from "vitest";
import {
  DEFAULT_TEACHING_SCRIPT,
  getTeachingScript,
  ICSE_FINAL_QA_CHECKS,
  isTeachingScriptId,
  resolveTeachingScriptId,
  scriptReferencesOnlyKnownFunctions,
  TEACHING_SCRIPTS,
} from "@/lib/teaching-engine/teachingScripts";
import { buildPromptTexts } from "@/lib/teaching-engine/promptBuilder";
import { buildMasterImageSpec } from "@/components/teaching-engine/MasterImageWorkflow";
import {
  OUTPUT_OPTIONS,
  type ExtractedContent,
  type PromptBuilderInput,
} from "@/types/teaching-engine";

function makeExtracted(overrides: Partial<ExtractedContent> = {}): ExtractedContent {
  return {
    ocrText: "ICSE Class 10 Mathematics. Solve: x^2 - 5x + 6 = 0.",
    subject: "Mathematics",
    board: "ICSE",
    classLevel: "Class 10",
    chapter: "Quadratic Equations",
    topic: "Solving quadratic equations",
    concept: "Quadratic Equation",
    questionType: "Numerical/Problem",
    questionTypes: ["Numerical/Problem"],
    language: "English",
    hasTables: false,
    hasExercises: true,
    examImportance: "Past-paper frequency unavailable.",
    formulae: ["x = (-b ± √(b^2 - 4ac)) / 2a"],
    numericalQuestions: ["Solve: x^2 - 5x + 6 = 0"],
    diagrams: [],
    keywords: ["quadratic", "roots"],
    ...overrides,
  };
}

function makePromptInput(overrides: Partial<PromptBuilderInput> = {}): PromptBuilderInput {
  return {
    sourceFiles: ["paper.png"],
    extracted: makeExtracted(),
    studentProfile: ["Exam preparation"],
    depthOptions: ["Definition", "Worked examples"],
    selectedOutputOptions: ["Normal Solution", "Logical Flow"],
    visualStyle: "Simple labeled diagram",
    explanationStyle: "Simple classroom language",
    objective: "Explain for exam preparation.",
    ...overrides,
  };
}

describe("teaching script registry", () => {
  it("exposes a script registry", () => {
    expect(Array.isArray(TEACHING_SCRIPTS)).toBe(true);
    expect(TEACHING_SCRIPTS.length).toBeGreaterThanOrEqual(2);
  });

  it("has unique script ids", () => {
    const ids = TEACHING_SCRIPTS.map((script) => script.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('supports "none" and returns no directives for it', () => {
    const none = getTeachingScript("none");
    expect(none.id).toBe("none");
    expect(none.promptDirectives).toBe("");
    expect(none.imageSpecDirectives).toBe("");
    expect(none.defaultSelections).toEqual([]);
  });

  it("loads the ICSE Class X Mathematics script", () => {
    const script = getTeachingScript("icse-class10-mathematics");
    expect(script.id).toBe("icse-class10-mathematics");
    expect(script.label).toContain("ICSE Class X Mathematics");
    expect(script.promptDirectives.length).toBeGreaterThan(0);
    expect(script.imageSpecDirectives.length).toBeGreaterThan(0);
  });

  it("defaults unknown/invalid ids to none", () => {
    expect(resolveTeachingScriptId("icse-class10-mathematics")).toBe("icse-class10-mathematics");
    expect(resolveTeachingScriptId("not-a-script")).toBe("none");
    expect(resolveTeachingScriptId(undefined)).toBe("none");
    expect(resolveTeachingScriptId(null)).toBe("none");
    expect(resolveTeachingScriptId(42)).toBe("none");
    expect(DEFAULT_TEACHING_SCRIPT).toBe("none");
    expect(isTeachingScriptId("none")).toBe(true);
    expect(isTeachingScriptId("bogus")).toBe(false);
  });
});

describe("ICSE script methodology content", () => {
  const script = getTeachingScript("icse-class10-mathematics");
  const all = `${script.promptDirectives}\n${script.imageSpecDirectives}`.toLowerCase();

  it("contains source-fidelity directives", () => {
    expect(all).toContain("source fidelity");
    expect(all).toContain("authoritative");
    expect(all).toContain("preserve exact wording");
    expect(all).toContain("never invent missing source information");
  });

  it("contains mathematical-verification directives", () => {
    expect(all).toContain("mathematical verification");
    expect(all).toContain("solve independently");
    expect(all).toContain("verify algebra");
    expect(all).toContain("units");
  });

  it("contains weak-student audit directives", () => {
    expect(all).toContain("weak-student audit");
    expect(all).toContain("every important step");
    expect(all).toContain("common confusion points");
  });

  it("contains adaptive 23-function applicability rules", () => {
    expect(all).toContain("applicable");
    expect(all).toContain("not_applicable");
    expect(all).toContain("review_required");
    expect(all).toContain("not applicable to this question.");
    expect(all).not.toContain("artificial filler for");
    expect(all).toContain("artificial filler");
  });

  it("keeps FORMULA BACKGROUND and FORMULA BREAKDOWN as separate elements", () => {
    expect(all).toContain("formula background");
    expect(all).toContain("formula breakdown");
    expect(all).toContain("separate");
  });

  it("enforces one question = one teaching image", () => {
    expect(all).toContain("one question = one teaching image");
    expect(all).toContain("do not combine unrelated questions");
  });

  it("contains MCQ preservation rules", () => {
    expect(all).toContain("mcq");
    expect(all).toContain("preserve exact options");
    expect(all).toContain("independently verify the correct option");
  });

  it("contains numerical / algebra / geometry / graph / statistics rules", () => {
    expect(all).toContain("given");
    expect(all).toContain("substitution");
    expect(all).toContain("unit");
    expect(all).toContain("line by line"); // algebra
    expect(all).toContain("theorem/property"); // geometry
    expect(all).toContain("slopes"); // graphs / coordinate geometry
    expect(all).toContain("cumulative frequency"); // statistics
    expect(all).toContain("probability");
  });

  it("contains final QA requirements", () => {
    expect(ICSE_FINAL_QA_CHECKS).toContain("SOURCE CHECK");
    expect(ICSE_FINAL_QA_CHECKS).toContain("MATH CHECK");
    expect(ICSE_FINAL_QA_CHECKS).toContain("FINAL ANSWER CHECK");
    expect(ICSE_FINAL_QA_CHECKS.length).toBe(8);
  });

  it("does not hard-code permanent suppression of any Teacher's Depth function", () => {
    const languageFunctions = ["Word Meanings", "Grammar Explanation", "Timeline", "Map Explanation"];
    for (const fn of languageFunctions) {
      expect(script.defaultSelections).not.toContain(fn);
    }
    // Crucially: every known function is still referenceable — nothing is suppressed.
    expect(scriptReferencesOnlyKnownFunctions(script)).toBe(true);
    expect((script as unknown as Record<string, unknown>).suppressFunctions).toBeUndefined();
  });
});

describe("no 24th function is introduced", () => {
  it("OUTPUT_OPTIONS still contains exactly 24 entries (1 primary + 23 functions)", () => {
    expect(OUTPUT_OPTIONS).toHaveLength(24);
    expect(OUTPUT_OPTIONS).toContain("Create Teaching Image");
  });

  it("every script default selection is an existing Teacher's Depth function", () => {
    for (const script of TEACHING_SCRIPTS) {
      expect(scriptReferencesOnlyKnownFunctions(script)).toBe(true);
    }
  });
});

describe("prompt integration", () => {
  it("produces byte-identical prompt output when script = none vs omitted", () => {
    const withoutScript = buildPromptTexts(makePromptInput());
    const withNone = buildPromptTexts(makePromptInput({ teachingScript: "none" }));
    expect(withNone).toEqual(withoutScript);
    expect(withNone[0]).not.toContain("TEACHING SCRIPT ACTIVE");
  });

  it("injects ICSE directives into the prompt when the script is active", () => {
    const [prompt] = buildPromptTexts(makePromptInput({ teachingScript: "icse-class10-mathematics" }));
    expect(prompt).toContain("TEACHING SCRIPT ACTIVE: ICSE CLASS X MATHEMATICS");
    expect(prompt).toContain("SOURCE FIDELITY");
    expect(prompt).toContain("MATHEMATICAL VERIFICATION");
    expect(prompt).toContain("ADAPTIVE TEACHER'S DEPTH");
    // The rest of the prompt structure is untouched.
    expect(prompt).toContain("SECTION 1: Normal Solution");
    expect(prompt).toContain("SECTION 3: Create Teaching Image");
  });
});

describe("Create Teaching Image integration", () => {
  it("passes no script directives into the image spec when script = none", () => {
    const spec = buildMasterImageSpec(makeExtracted(), "Use the quadratic formula.", "", "Solve x^2 - 5x + 6 = 0");
    expect(spec).not.toContain("TEACHING SCRIPT ACTIVE");
    expect(spec).toContain("MASTER LEARNING IMAGE");
  });

  it("receives the active script and injects the ICSE Question -> Solution structure", () => {
    const spec = buildMasterImageSpec(
      makeExtracted(),
      "Use the quadratic formula.",
      "",
      "Solve x^2 - 5x + 6 = 0",
      "icse-class10-mathematics",
    );
    expect(spec).toContain("TEACHING SCRIPT ACTIVE: ICSE CLASS X MATHEMATICS");
    expect(spec).toContain("ONE question = ONE teaching image");
    expect(spec).toContain("Exact Question");
    expect(spec).toContain("Given / Required");
    expect(spec).toContain("Step-by-step Solution");
    expect(spec).toContain("Final Answer");
    expect(spec).toContain("Verification");
    expect(spec).toContain("MCQ: preserve exact options");
    expect(spec).toContain("Not applicable to this question.");
  });
});
