import { OUTPUT_OPTIONS, type OutputOption } from "@/types/teaching-engine";

/**
 * UNIVERSAL TEACHING SCRIPT LIBRARY
 *
 * Teacher's Depth has EXACTLY 23 master functions (OUTPUT_OPTIONS in
 * src/types/teaching-engine.ts). A Teaching Script never adds a function;
 * it is a specialized execution profile that controls HOW the existing
 * 23 functions are applied to the current question/content.
 *
 * DESIGN GOALS (library, not a single-script feature):
 * - The registry (TEACHING_SCRIPTS) is the SINGLE SOURCE OF TRUTH. The
 *   TeachingScriptId type is DERIVED from it, so adding a future script is a
 *   pure data-entry: give it an `id` and add the definition here. No core
 *   application logic, types file, or registry union needs to change.
 * - Scripts reference ONLY existing Teacher's Depth functions.
 * - All injection points are optional and empty for "none", so the default
 *   behaviour stays byte-identical.
 * - See `assertValidTeachingScript` for the self-contained validation a new
 *   definition must pass before being registered.
 */

export type FunctionApplicability = "APPLICABLE" | "NOT_APPLICABLE" | "REVIEW_REQUIRED";

export type TeachingScript = {
  id: string;
  label: string;
  description: string;
  /** Directives injected into the generated teaching prompt ("" when none). */
  promptDirectives: string;
  /** Directives injected into the master teaching-image specification ("" when none). */
  imageSpecDirectives: string;
  /**
   * Sensible default selections the script starts from. These are a baseline
   * only — the engine must still evaluate EVERY function per question as
   * APPLICABLE / NOT_APPLICABLE / REVIEW_REQUIRED. This is NOT a suppression
   * list: no function is permanently removed.
   */
  defaultSelections: OutputOption[];
  /** Presentation defaults the script prefers (applied only when script activates). */
  defaults: {
    visualStyle: "Simple labeled diagram" | "Dissected step-by-step visual";
    explanationStyle: "Highly structured step-by-step";
  };
};

const NO_SCRIPT: TeachingScript = {
  id: "none",
  label: "Standard / None",
  description: "Standard Teacher's Depth behaviour with no specialized script.",
  promptDirectives: "",
  imageSpecDirectives: "",
  defaultSelections: [],
  defaults: {
    visualStyle: "Simple labeled diagram",
    explanationStyle: "Highly structured step-by-step",
  },
};

/**
 * ICSE Class X Mathematics — Expert Teaching Script.
 * The methodology is kept complete: source fidelity, independent mathematical
 * verification, weak-student audit, exam-oriented teaching, adaptive 23-function
 * applicability, separate formula background/breakdown, deterministic visuals,
 * Question -> Solution structure, one question per image, MCQ/numerical/algebra/
 * geometry/graph/statistics handling, and final quality control.
 */
const ICSE_CLASS10_MATHEMATICS: TeachingScript = {
  id: "icse-class10-mathematics",
  label: "ICSE Class X Mathematics — Expert Teaching Script",
  description:
    "Applies the ICSE Class X Mathematics expert methodology: source fidelity, independent verification, weak-student audit and exam-oriented presentation.",
  promptDirectives: `TEACHING SCRIPT ACTIVE: ICSE CLASS X MATHEMATICS — EXPERT TEACHING SCRIPT
Apply this execution profile on top of the existing Teacher's Depth functions. The script controls HOW the functions are applied; it adds no new functions.

1. SOURCE FIDELITY
- Treat the supplied original question/source as authoritative.
- Preserve exact wording, numbers, symbols, options, diagrams and labels wherever readable.
- Never invent missing source information.
- Clearly identify unclear or missing source material.
- Do not silently replace the source with another version.

2. MATHEMATICAL VERIFICATION
- Solve independently; verify every numerical calculation.
- Verify algebra, formulas, substitution and units.
- Verify signs, inequalities and restrictions.
- Verify geometry; verify graphs/coordinates/slopes/equations.
- Verify statistics and probability.
- Independently verify MCQ answers; do not reproduce an incorrect supplied solution.
- Clearly state the verified answer.

3. WEAK-STUDENT AUDIT
- Show every important step; introduce formulas before use.
- Make substitutions and intermediate calculations visible.
- Explain reasons for important steps; address common confusion points.
- Clearly identify the final answer.

4. EXAM-ORIENTED TEACHING
- Explain what the question asks, what is given, the concept/topic, and the required formula/theorem/method.
- Explain why that method is appropriate.
- Give step-by-step working, the final answer, ICSE examination presentation, common mistakes and final verification.

5. ADAPTIVE TEACHER'S DEPTH
- The 23 Teacher's Depth functions are the MASTER LIBRARY.
- For every question, classify EACH function as APPLICABLE, NOT_APPLICABLE or REVIEW_REQUIRED.
- Generate only genuinely useful functions; do not generate artificial filler.
- For NOT_APPLICABLE write exactly: "Not applicable to this question."

6. FORMULA HANDLING
- Keep FORMULA BACKGROUND and FORMULA BREAKDOWN as separate teaching elements; do not merge them.

7. VISUAL TEACHING
- Use deterministic mathematical visuals where useful: geometry diagrams, number lines, tables, graphs, coordinate planes, matrices, algebraic structures, flow representations.
- Visuals must agree with the mathematics and must never fabricate source information.`,
  imageSpecDirectives: `TEACHING SCRIPT ACTIVE: ICSE CLASS X MATHEMATICS — EXPERT TEACHING SCRIPT
Build the image as ONE question = ONE teaching image. Do not combine unrelated questions into one image.

Follow this exact Question -> Solution structure:
- Exact Question (preserved source wording/numbers/symbols/options/diagrams/labels)
- Given / Required
- Concept
- Formula / Theorem / Method
- Step-by-step Solution (algebra shown line by line)
- Reasoning
- Final Answer (clearly identified, independently verified)
- Verification
- Exam Tip / Common Mistake where useful
- Applicable Teacher's Depth elements: classify each of the 23 functions as APPLICABLE, NOT_APPLICABLE or REVIEW_REQUIRED; for NOT_APPLICABLE write exactly "Not applicable to this question."

Question-type rules:
- MCQ: preserve exact options, independently verify the correct option, explain the correct option, and explain tempting alternatives where useful.
- Numerical questions: use Given -> Formula -> Substitution -> Calculation -> Result -> Unit.
- Algebra: show important transformations line by line.
- Geometry: identify given, required, theorem/property, correspondence where relevant, calculations, conclusion.
- Graphs / coordinate geometry: verify coordinates, axes, scale, signs, slopes, equations, plotted points and relationships.
- Statistics / probability: verify data, ordering, class intervals, frequency/cumulative frequency, formulas, positions, interpretation and result.

Visuals must be deterministic (geometry diagrams, number lines, tables, graphs, coordinate planes, matrices, algebraic structures, flow representations) and must agree with the mathematics without fabricating source information.
Keep FORMULA BACKGROUND and FORMULA BREAKDOWN as separate elements.
Clearly identify unclear or missing source material; never invent missing source content.`,
  defaultSelections: [
    "Background",
    "Formula Breakdown",
    "Logical Flow",
    "Visual Explanation",
    "Exam Importance",
    "Common Mistakes",
    "Practice Questions",
    "Revision Notes",
  ],
  defaults: {
    visualStyle: "Dissected step-by-step visual",
    explanationStyle: "Highly structured step-by-step",
  },
};

export const TEACHING_SCRIPTS = [NO_SCRIPT, ICSE_CLASS10_MATHEMATICS] as const;

/**
 * A valid Teaching Script ID is the id of a script registered in the library.
 * Derived from TEACHING_SCRIPTS so future scripts are added by data-entry only.
 */
export type TeachingScriptId = (typeof TEACHING_SCRIPTS)[number]["id"];

export const DEFAULT_TEACHING_SCRIPT: TeachingScriptId = "none";

const SCRIPT_MAP = new Map<string, TeachingScript>(
  TEACHING_SCRIPTS.map((script) => [script.id, script]),
);

export function getTeachingScript(id: string): TeachingScript {
  return SCRIPT_MAP.get(id) ?? NO_SCRIPT;
}

export function isTeachingScriptId(value: string): value is TeachingScriptId {
  return SCRIPT_MAP.has(value);
}

/** Normalizes arbitrary stored input into a valid script id (defaults to "none"). */
export function resolveTeachingScriptId(value: unknown): TeachingScriptId {
  return typeof value === "string" && isTeachingScriptId(value) ? value : DEFAULT_TEACHING_SCRIPT;
}

/**
 * The final QA gate the ICSE script applies to generated output.
 * Exposed separately so tests and future renderers can reference it without
 * re-deriving the checklist from free text.
 */
export const ICSE_FINAL_QA_CHECKS = [
  "SOURCE CHECK",
  "MATH CHECK",
  "COMPLETENESS CHECK",
  "TEACHER'S DEPTH CHECK",
  "VISUAL CHECK",
  "EXAM CHECK",
  "CLARITY CHECK",
  "FINAL ANSWER CHECK",
] as const;

/**
 * Guard: a script must only reference existing Teacher's Depth functions.
 * Returns true when no 24th (unknown) function is referenced anywhere.
 */
export function scriptReferencesOnlyKnownFunctions(script: TeachingScript): boolean {
  const known = new Set<string>(OUTPUT_OPTIONS);
  return script.defaultSelections.every((option) => known.has(option));
}

/**
 * Self-contained validation for a Teaching Script definition.
 *
 * A FUTURE script can be registered by adding one data entry to
 * TEACHING_SCRIPTS without touching any core application logic — this helper
 * is the only gate it must pass. It enforces the library invariants:
 * - unique, non-empty id;
 * - label + description present;
 * - references only existing Teacher's Depth functions (never a #24);
 * - no permanent suppression mechanism (suppressFunctions-style fields absent).
 */
export function assertValidTeachingScript(
  script: TeachingScript,
  existingIds: readonly string[] = TEACHING_SCRIPTS.map((s) => s.id),
): void {
  if (!script.id || typeof script.id !== "string") {
    throw new Error("Teaching Script must have a non-empty string id.");
  }
  if (existingIds.includes(script.id)) {
    throw new Error(`Duplicate Teaching Script id: "${script.id}".`);
  }
  if (!script.label.trim() || !script.description.trim()) {
    throw new Error(`Teaching Script "${script.id}" needs a label and description.`);
  }
  if (!scriptReferencesOnlyKnownFunctions(script)) {
    throw new Error(
      `Teaching Script "${script.id}" references an unknown Teacher's Depth function.`,
    );
  }
  const asRecord = script as unknown as Record<string, unknown>;
  if ("suppressFunctions" in asRecord || "disabledFunctions" in asRecord) {
    throw new Error(
      `Teaching Script "${script.id}" must not permanently suppress Teacher's Depth functions.`,
    );
  }
}

export type { OutputOption };
