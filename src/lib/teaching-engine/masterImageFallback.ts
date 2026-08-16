import type { ExtractedContent, TeachingImageAnalysisResult, TeachingCard } from "@/types/teaching-engine";

const INTERNAL_GENERATION_DIRECTIVES = [
  /create a single comprehensive educational infographic/i,
  /add one application prompt/i,
  /add one reasoning prompt/i,
  /label it as additional coverage/i,
  /use a simple labelled classroom diagram/i,
  /work through one guided example/i,
  /simple labelled visual/i,
  /add one application question/i,
  /ask one reasoning question/i,
  /include one quick recall check/i,
  /use only source-supported ideas/i,
  /explain what each variable means and how to use the formula/i,
];

function firstNonEmpty(...values: Array<string | undefined>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return "";
}

function sanitizeTeachingLine(value: string, fallback: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;
  if (INTERNAL_GENERATION_DIRECTIVES.some((pattern) => pattern.test(normalized))) {
    return fallback;
  }
  return normalized;
}

function buildFormulaSummary(formula: string, fallback: string) {
  const normalized = formula.trim();
  if (!normalized) return fallback;
  if (/\bV\b.*\bI\b.*\bR\b/i.test(normalized) || /\bI\b.*\bR\b.*\bV\b/i.test(normalized)) {
    return "V = potential difference; I = current; R = resistance. The relationship shows that voltage increases with current when resistance stays constant.";
  }
  return `${normalized} — explain the relationship between the main quantities in the topic.`;
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
    explanation: sanitizeTeachingLine(explanation, "Core teaching content for this topic."),
    keyPoints: keyPoints.map((point) => sanitizeTeachingLine(point, "Key teaching point.")).filter(Boolean).slice(0, 8),
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
  const sourceContent = safeLines(teachingResponse, 8).map((line) => sanitizeTeachingLine(line, `Core idea from the source for ${topic}.`));
  const definition = sanitizeTeachingLine(firstSentence(teachingResponse, `Core definition for ${topic}.`), `Core definition for ${topic}.`);
  const formula = firstNonEmpty(extracted.formulae[0], "V = IR");
  const example = sanitizeTeachingLine(
    firstNonEmpty(extracted.numericalQuestions[0], `Apply the formula to a worked example involving ${topic}.`),
    `Apply the formula to a worked example involving ${topic}.`,
  );
  const diagram = sanitizeTeachingLine(
    firstNonEmpty(extracted.diagrams[0], "The diagram labels the key parts and shows how they are related."),
    "The diagram labels the key parts and shows how they are related.",
  );
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
    makeCard(`${topic} — Source Content`, definition, ["The source supports the key idea clearly.", "Keep the explanation grounded in the current source material."], { examImportance: "Source-only content" }),
    makeCard(`${topic} — Concept & Definition`, definition, ["State the main idea clearly.", "Relate it to the chapter context."], { examImportance: "Core conceptual understanding" }),
    makeCard(`${topic} — Important Additional Exam Coverage`, sanitizeTeachingLine(
      firstNonEmpty(
        sourceContent.slice(0, 1)[0],
        `Build extra same-topic exam support for ${topic} in ${subject} with application and reasoning.`,
      ),
      `Build extra same-topic exam support for ${topic} in ${subject} with application and reasoning.`,
    ), ["Explain the concept in simple classroom language.", "Apply it to a realistic exam question.", "Check the reasoning before the final answer."], { examImportance: "Additional exam-supporting coverage" }),
    makeCard(`${topic} — Formula & Meaning`, buildFormulaSummary(formula, `The formula relates the main quantities in this topic.`), ["Write the formula first.", "Explain each variable simply."], { formula }),
    makeCard(`${topic} — Worked Example`, example, ["Show substitution steps.", "Use the correct units."], { example }),
    makeCard(`${topic} — Diagram / Visual Map`, `A labelled diagram shows the main parts and how they are related: ${diagram}.`, ["Label the key parts clearly.", "Show the relationship visually."], { diagram }),
    makeCard(`${topic} — Common Mistakes`, "Avoid the most common misunderstandings in this topic.", commonMistakes, { commonMistake: commonMistakes[0] }),
    makeCard(`${topic} — Exam Importance & Revision`, "Review the key idea, formula, and worked example before class or exams.", revisionPoints.length > 0 ? revisionPoints : ["Revise the definition, formula, and one example."], { examImportance: examPoints.join(" | ") }),
    makeCard(`${topic} — Additional Exam Coverage`, `Link the topic to ${chapter} in ${subject} with extra application, reasoning, and practice questions.`, ["Answer one application question.", "Explain the reasoning in a short answer.", "Review the main idea and formula."], { examImportance: "Additional exam-supporting coverage" }),
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
