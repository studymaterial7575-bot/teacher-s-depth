import type { ExtractedContent, TeachingImageAnalysisResult, TeachingCard } from "@/types/teaching-engine";

function firstNonEmpty(...values: Array<string | undefined>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return "";
}

function safeLines(value: string, max = 8) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, max);
}

function firstSentence(text: string, fallback: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;
  const sentence = normalized.split(/[.!?]/)[0]?.trim();
  return sentence && sentence.length > 0 ? sentence : fallback;
}

function makeCard(title: string, explanation: string, keyPoints: string[], extra: Partial<TeachingCard> = {}): TeachingCard {
  return {
    title: title.trim() || "Teaching Card",
    explanation: explanation.trim() || "Core teaching content for this topic.",
    keyPoints: keyPoints.filter(Boolean).slice(0, 8),
    ...extra,
  };
}

export function buildFallbackTeachingImageAnalysis(
  extracted: ExtractedContent,
  teachingResponse: string,
): TeachingImageAnalysisResult {
  const topic = firstNonEmpty(extracted.topic, "Detected Topic");
  const chapter = firstNonEmpty(extracted.chapter, "Detected Chapter");
  const subject = firstNonEmpty(extracted.subject, "Detected Subject");
  const sourceContent = safeLines(teachingResponse, 8);
  const definition = firstSentence(teachingResponse, `Core definition for ${topic}.`);
  const formula = firstNonEmpty(extracted.formulae[0], "V = IR");
  const example = firstNonEmpty(extracted.numericalQuestions[0], `Work through one guided example for ${topic}.`);
  const diagram = firstNonEmpty(extracted.diagrams[0], "Simple labelled classroom diagram");
  const examPoints = [
    `Exam importance: ${firstNonEmpty(extracted.examImportance, "Medium")}`,
    "Be ready to explain the concept, the formula, and one worked example.",
  ];
  const commonMistakes = [
    "Using the wrong variable in the formula",
    "Forgetting units or a clear final answer",
    "Skipping the reasoning step before solving",
  ];
  const revisionPoints = safeLines(teachingResponse, 6);

  const cards: TeachingCard[] = [
    makeCard(`${topic} — Source Content`, definition, ["Use only source-supported ideas.", "Keep the explanation grounded in the current source."], { examImportance: "Source-only content" }),
    makeCard(`${topic} — Concept & Definition`, definition, ["State the main idea clearly.", "Relate it to the chapter context."], { examImportance: "Core conceptual understanding" }),
    makeCard(`${topic} — Important Additional Exam Coverage`, firstNonEmpty(
      sourceContent.slice(0, 1)[0],
      `Add missing same-topic exam support for ${topic} in ${subject}.`,
    ), ["Add one application prompt.", "Add one reasoning prompt.", "Label it as additional coverage."], { examImportance: "Additional exam-supporting coverage" }),
    makeCard(`${topic} — Formula & Meaning`, `${formula} — explain what each variable means and how to use the formula.`, ["Write the formula first.", "Explain each variable simply."], { formula }),
    makeCard(`${topic} — Worked Example`, example, ["Show substitution steps.", "Use the correct units."], { example }),
    makeCard(`${topic} — Diagram / Visual Map`, `Use a simple labelled visual: ${diagram}.`, ["Label the key parts clearly.", "Show the relationship visually."], { diagram }),
    makeCard(`${topic} — Common Mistakes`, "Avoid the most common misunderstandings in this topic.", commonMistakes, { commonMistake: commonMistakes[0] }),
    makeCard(`${topic} — Exam Importance & Revision`, "Review the key idea, formula, and worked example before class or exams.", revisionPoints.length > 0 ? revisionPoints : ["Revise the definition, formula, and one example."], { examImportance: examPoints.join(" | ") }),
    makeCard(`${topic} — Additional Exam Coverage`, `Link the topic to ${chapter} in ${subject} with extra application, reasoning, and practice questions.`, ["Add one application question.", "Ask one reasoning question.", "Include one quick recall check."], { examImportance: "Additional exam-supporting coverage" }),
  ];

  return {
    mainTopic: topic,
    subtopics: [chapter, "Definition", "Formula", "Example", "Revision"],
    sourceContent,
    additionalExamCoverage: [
      `Extended ${topic} practice for ${subject}`,
      "Application and reasoning questions",
      "Short recall and concept-check prompts",
    ],
    definitions: [{ title: `${topic} Definition`, text: definition }],
    formulae: [{ formula, meaning: "Explain what the formula means and how to use it.", units: "Use standard school units where relevant" }],
    workedExamples: [{ title: `${topic} Worked Example`, problem: example, steps: "1) Write the formula\n2) Substitute values\n3) Solve carefully\n4) State the final answer" }],
    diagrams: [{ title: `${topic} Diagram`, description: diagram }],
    tables: [],
    importantFacts: sourceContent.slice(0, 4),
    examPoints,
    commonQuestionTypes: ["Definition questions", "Formula-based questions", "Application questions"],
    commonMistakes,
    revisionPoints,
    cards,
  };
}
