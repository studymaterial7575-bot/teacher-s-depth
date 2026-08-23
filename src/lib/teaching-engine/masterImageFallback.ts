import type {
  ExtractedContent,
  TeachingImageAnalysisResult,
  TeachingCard,
} from "@/types/teaching-engine";
import {
  filterRelevantFormulaeByContext,
  getContextAwareFallbackFormula,
  pickKnownValue,
  sanitizeEducationalLines,
  sanitizeEducationalText,
  sanitizeEducationalTextByContext,
} from "@/lib/teaching-engine/contentIntegrity";
import { formatMathDisplayText, hasMathNotation } from "@/lib/teaching-engine/mathDisplay";

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

  const sequence = lines.filter(
    (line) =>
      /^(given|formula|therefore|answer)\s*[:-]/i.test(line) ||
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

function displayTeachingLine(value: string, fallback: string) {
  const normalized = sanitizeTeachingLine(value, fallback);
  if (!normalized) return fallback;
  return hasMathNotation(normalized) ? formatMathDisplayText(normalized) : normalized;
}

function buildFormulaSummary(formula: string, fallback: string) {
  const normalized = formula.trim();
  if (!normalized) return fallback;
  if (/\bV\b.*\bI\b.*\bR\b/i.test(normalized) || /\bI\b.*\bR\b.*\bV\b/i.test(normalized)) {
    return "V = potential difference; I = current; R = resistance. The relationship shows that voltage increases with current when resistance stays constant.";
  }
  return `${displayTeachingLine(normalized, fallback)} — explain the relationship between the main quantities in the topic.`;
}

function safeLines(value: string, max = 8) {
  return sanitizeEducationalLines(value.split(/\r?\n/), max);
}

function uniqueLines(values: string[], max: number) {
  const deduped: string[] = [];
  for (const value of values) {
    const cleaned = sanitizeTeachingLine(value, "");
    if (!cleaned) continue;
    if (deduped.some((existing) => existing.toLowerCase() === cleaned.toLowerCase())) continue;
    deduped.push(cleaned);
    if (deduped.length >= max) break;
  }
  return deduped;
}

function isLanguageSubject(subject: string, topic: string) {
  return /\b(english|hindi|marathi|language|grammar|literature|tense|voice)\b/i.test(
    `${subject} ${topic}`,
  );
}

function isStemSubject(subject: string) {
  return /\b(mathematics|math|physics|chemistry|biology|science|computer|commerce)\b/i.test(
    subject,
  );
}

function grammarPatternHints(text: string) {
  const lines = safeLines(text, 18).filter((line) =>
    /\b(tense|form|structure|rule|pattern|subject|verb|object|auxiliary|timeline|usage|error)\b/i.test(
      line,
    ),
  );
  return uniqueLines(lines, 5);
}

function buildSubjectAwareQuestionTypes(subject: string, topic: string) {
  if (isLanguageSubject(subject, topic)) {
    return [
      "Rule identification and usage questions",
      "Sentence transformation/application questions",
      "Error-spotting and correction questions",
      "Short explanation questions",
    ];
  }
  return [
    "Definition questions",
    "Formula/concept application questions",
    "Numerical/application questions",
    "Reasoning or conceptual explanation questions",
  ];
}

function firstSentence(text: string, fallback: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;
  const sentence = normalized.split(/[.!?]/)[0]?.trim();
  return sentence && sentence.length > 0 ? sentence : fallback;
}

function makeCard(
  title: string,
  explanation: string,
  keyPoints: string[],
  extra: Partial<TeachingCard> = {},
): TeachingCard {
  return {
    title: title.trim() || "Teaching Card",
    explanation: sanitizeTeachingLine(explanation, "Core teaching content for this topic."),
    keyPoints: keyPoints
      .map((point) => sanitizeTeachingLine(point, "Key teaching point."))
      .filter(Boolean)
      .slice(0, 8),
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
  const isLanguage = isLanguageSubject(subject, topic);
  const isStem = isStemSubject(subject);
  const sourceOnlyLines = uniqueLines(safeLines(cleanedSourceText, 12), 8);
  const responseSupportedLines = uniqueLines(safeLines(cleanedTeachingResponse, 12), 8);
  const sourceContent =
    sourceOnlyLines.length > 0
      ? sourceOnlyLines.map((line) => displayTeachingLine(line, line))
      : responseSupportedLines.slice(0, 6).map((line) => displayTeachingLine(line, line));
  const definition = displayTeachingLine(
    firstSentence(cleanedTeachingResponse, `Core definition for ${topic}.`),
    `Core definition for ${topic}.`,
  );
  const inlineFormulaCandidates = Array.from(
    cleanedTeachingResponse.matchAll(/[A-Za-z][A-Za-z0-9]*\s*=\s*[^\n,.;]+/g),
  ).map((item) => item[0]);
  const formula = isLanguage
    ? ""
    : pickPrimaryFormula([...extracted.formulae, ...inlineFormulaCandidates], formulaContext);
  const workedExampleLines = extractWorkedExampleLines(
    [cleanedSourceText, cleanedTeachingResponse].filter(Boolean).join("\n"),
  );
  const workedExampleProblem = displayTeachingLine(
    firstNonEmpty(
      isStem ? extracted.numericalQuestions[0] : "",
      workedExampleLines.find((line) => /\b(find|calculate|determine|evaluate)\b/i.test(line)),
      isLanguage
        ? `Use one source-supported ${topic} sentence/application example.`
        : `Apply source-supported concept/formula to a worked example involving ${topic}.`,
    ),
    isLanguage
      ? `Use one source-supported ${topic} sentence/application example.`
      : `Apply source-supported concept/formula to a worked example involving ${topic}.`,
  );
  const workedExampleSteps =
    workedExampleLines.length > 0
      ? workedExampleLines.map((line) => displayTeachingLine(line, line)).join("\n")
      : isLanguage
        ? "1) Identify the required rule/structure\n2) Apply it to the sentence/context\n3) Verify correctness and usage"
        : "1) Write the formula\n2) Substitute values\n3) Solve carefully\n4) State the final answer";
  const diagram = displayTeachingLine(
    firstNonEmpty(
      extracted.diagrams[0],
      isLanguage
        ? "Create a clearly labelled timeline/structure map that explains the topic usage."
        : "Create a clearly labelled conceptual diagram from the supplied topic.",
    ),
    isLanguage
      ? "Create a clearly labelled timeline/structure map that explains the topic usage."
      : "Create a clearly labelled conceptual diagram from the supplied topic.",
  );
  const examPoints = uniqueLines(
    [
      displayTeachingLine(
        `Exam importance: ${firstNonEmpty(extracted.examImportance, "Medium")}`,
        `Exam importance: ${firstNonEmpty(extracted.examImportance, "Medium")}`,
      ),
      isLanguage
        ? "Be ready to explain rule, usage, and one correct example."
        : "Be ready to explain concept, formula, and one worked example.",
    ],
    4,
  );
  const commonMistakes = uniqueLines(
    isLanguage
      ? [
          "Mixing forms/rules in the wrong context",
          "Ignoring subject-verb agreement or time reference",
          "Applying a rule without checking sentence meaning",
        ]
      : [
          "Using the wrong variable in the formula",
          "Forgetting units or a clear final answer",
          "Skipping the reasoning step before solving",
        ],
    6,
  );
  const revisionPoints = uniqueLines(
    [...sourceContent, ...responseSupportedLines, ...grammarPatternHints(cleanedTeachingResponse)],
    6,
  );
  const additionalExamCoverage = uniqueLines(
    [
      `ADDITIONAL: Missing same-topic exam coverage for ${topic}.`,
      isLanguage
        ? "ADDITIONAL: Include same-topic rule-application and error-correction practice."
        : "ADDITIONAL: Include same-topic conceptual/application/numerical practice where relevant.",
      "ADDITIONAL: Keep additional content clearly separated from source-derived content.",
    ],
    6,
  );

  const formulae =
    !isLanguage && formula
      ? [
          {
            formula,
            meaning: "Explain what the formula means and how to use it.",
            units: isStem ? "Use standard school units where relevant" : "",
          },
        ]
      : [];

  const conceptSectionLines = isLanguage
    ? uniqueLines(
        [
          ...grammarPatternHints(cleanedSourceText),
          ...grammarPatternHints(cleanedTeachingResponse),
          "Use topic-specific rules/structures from supplied context.",
        ],
        6,
      )
    : uniqueLines(
        [
          definition,
          formulae[0]?.formula ? `Formula: ${formulae[0].formula}` : "",
          formulae[0]?.meaning ?? "",
        ],
        6,
      );

  const commonQuestionTypes = buildSubjectAwareQuestionTypes(subject, topic);
  const conceptHeading = isLanguage ? "C. GRAMMAR RULES / STRUCTURES" : "C. FORMULAS / CONCEPTS";
  const workedExamplePointLines = uniqueLines(workedExampleSteps.split(/\r?\n/), 5);
  const workedExampleMeta = workedExamplePointLines.join("\n").trim();

  const cards: TeachingCard[] = [
    makeCard(
      `A. SOURCE CONTENT — ${topic}`,
      sourceContent[0] ?? definition,
      sourceContent.slice(1, 6),
      { examImportance: "Source-derived content" },
    ),
    makeCard(
      "B. IMPORTANT ADDITIONAL EXAM COVERAGE",
      additionalExamCoverage[0] ?? `ADDITIONAL: Same-topic exam coverage for ${topic}.`,
      additionalExamCoverage.slice(1, 6),
      { examImportance: "Additional exam-supporting coverage" },
    ),
    makeCard(
      conceptHeading,
      conceptSectionLines[0] ?? definition,
      conceptSectionLines.slice(1, 6),
      formulae[0]?.formula ? { formula: formulae[0].formula } : {},
    ),
    makeCard(
      "D. VISUALS / DIAGRAMS",
      diagram,
      [
        isLanguage
          ? "Use a labelled topic timeline/structure visual."
          : "Use labelled conceptual or process diagram from the topic.",
        "Keep labels readable for classroom and mobile viewing.",
      ],
      { diagram },
    ),
    makeCard(
      "E. WORKED EXAMPLES",
      workedExampleProblem,
      workedExamplePointLines,
      workedExampleMeta ? { example: workedExampleMeta } : {},
    ),
    makeCard(
      "F. COMMON MISTAKES",
      commonMistakes[0] ?? "Avoid common misunderstandings in this topic.",
      commonMistakes.slice(1, 6),
      { commonMistake: commonMistakes[0] },
    ),
    makeCard(
      "G. EXAM-IMPORTANT AREAS",
      examPoints[0] ?? "Exam support points for this topic.",
      examPoints.slice(1, 5),
      { examImportance: examPoints.join(" | ") },
    ),
    makeCard(
      "H. COMMON QUESTION TYPES",
      commonQuestionTypes[0] ?? "Common question patterns for the topic.",
      commonQuestionTypes.slice(1, 6),
    ),
    makeCard(
      "I. QUICK REVISION",
      revisionPoints[0] ?? "Quick revision points from supplied topic context.",
      revisionPoints.slice(1, 6),
    ),
  ];

  return {
    mainTopic: topic,
    subtopics: [chapter, "Definition", "Formula", "Example", "Revision"],
    sourceContent,
    additionalExamCoverage,
    definitions: [{ title: `${topic} Definition`, text: definition }],
    formulae,
    workedExamples: [
      {
        title: `${topic} Worked Example`,
        problem: workedExampleProblem,
        steps: workedExampleSteps,
      },
    ],
    diagrams: [{ title: `${topic} Diagram`, description: diagram }],
    tables: [],
    importantFacts: sourceContent.slice(0, 4),
    examPoints,
    commonQuestionTypes,
    commonMistakes,
    revisionPoints,
    cards: cards.filter((card) => card.explanation.trim().length > 0),
  };
}
