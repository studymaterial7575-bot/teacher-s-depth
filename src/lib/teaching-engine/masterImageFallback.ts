import type { ExtractedContent, TeachingImageAnalysisResult, TeachingCard } from "@/types/teaching-engine";
import {
  filterRelevantFormulaeByContext,
  getContextAwareFallbackFormula,
  pickKnownValue,
  sanitizeEducationalLines,
  sanitizeEducationalText,
  sanitizeEducationalTextByContext,
} from "@/lib/teaching-engine/contentIntegrity";

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

function extractWorkedExampleLines(value: string) {
  const lines = sanitizeEducationalText(value)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const sequence = lines.filter((line) =>
    /^(given|formula|therefore|answer)\s*[:\-]/i.test(line) ||
    /\b(f\s*=\s*\d+\s*cm|r\s*=\s*2\s*f|r\s*=\s*\d+\s*[x×]\s*\d+|r\s*=\s*\d+\s*cm)\b/i.test(line),
  );

  return sanitizeEducationalLines(sequence, 10);
}

function pickPrimaryFormula(formulae: string[], contextText: string) {
  const relevant = filterRelevantFormulaeByContext(formulae, contextText);
  const preferred = relevant.find((item) => /\br\s*=\s*2\s*f\b/i.test(item));
  return firstNonEmpty(preferred, relevant[0], getContextAwareFallbackFormula(contextText));
}

function sanitizeTeachingLine(value: string, fallback: string) {
  const normalized = sanitizeEducationalText(value, 3).replace(/\s+/g, " ").trim();
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
  return sanitizeEducationalLines(value.split(/\r?\n/), max);
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
  const rawContext = `${extracted.subject} ${extracted.board} ${extracted.classLevel} ${extracted.chapter} ${extracted.topic} ${extracted.ocrText} ${teachingResponse}`;
  const cleanedTeachingResponse = sanitizeEducationalTextByContext(teachingResponse, rawContext);
  const cleanedSourceText = sanitizeEducationalTextByContext(extracted.ocrText || "", rawContext);
  const formulaContext = `${extracted.subject} ${extracted.board} ${extracted.classLevel} ${extracted.chapter} ${extracted.topic} ${cleanedSourceText} ${cleanedTeachingResponse}`;
  const topic = pickKnownValue(extracted.topic, "Detected Topic") || "Detected Topic";
  const chapter = pickKnownValue(extracted.chapter, "Detected Chapter") || "Detected Chapter";
  const subject = pickKnownValue(extracted.subject, "Detected Subject") || "Detected Subject";
  const sourceContent = safeLines([cleanedSourceText, cleanedTeachingResponse].filter(Boolean).join("\n"), 8).map((line) => sanitizeTeachingLine(line, `Core idea from the source for ${topic}.`));
  const definition = sanitizeTeachingLine(firstSentence(cleanedTeachingResponse, `Core definition for ${topic}.`), `Core definition for ${topic}.`);
  const inlineFormulaCandidates = Array.from(cleanedTeachingResponse.matchAll(/[A-Za-z][A-Za-z0-9]*\s*=\s*[^\n,.;]+/g)).map((item) => item[0]);
  const formula = pickPrimaryFormula([...extracted.formulae, ...inlineFormulaCandidates], formulaContext);
  const workedExampleLines = extractWorkedExampleLines([cleanedSourceText, cleanedTeachingResponse].filter(Boolean).join("\n"));
  const workedExampleProblem = sanitizeTeachingLine(
    firstNonEmpty(
      extracted.numericalQuestions[0],
      workedExampleLines.find((line) => /\b(find|calculate|determine|evaluate)\b/i.test(line)),
      `Apply the formula to a worked example involving ${topic}.`,
    ),
    `Apply the formula to a worked example involving ${topic}.`,
  );
  const workedExampleSteps = workedExampleLines.length > 0
    ? workedExampleLines.join("\n")
    : "1) Write the formula\n2) Substitute values\n3) Solve carefully\n4) State the final answer";
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
  const revisionPoints = safeLines(cleanedTeachingResponse, 6);

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
    makeCard(`${topic} — Worked Example`, workedExampleProblem, [workedExampleSteps, "Use the correct units."], { example: workedExampleSteps }),
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
    formulae: formula
      ? [{ formula, meaning: "Explain what the formula means and how to use it.", units: "Use standard school units where relevant" }]
      : [],
    workedExamples: [{ title: `${topic} Worked Example`, problem: workedExampleProblem, steps: workedExampleSteps }],
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
