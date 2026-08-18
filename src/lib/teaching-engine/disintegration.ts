import type { TeachingCard, TeachingImageAnalysisResult } from "@/types/teaching-engine";

const REQUIRED_CARD_PATTERNS = [
  /definition|concept|idea|overview/i,
  /formula|equation|law|principle/i,
  /example|worked|problem|application/i,
  /visual|diagram|map|graph|table/i,
  /mistake|error|trap/i,
  /exam|revision|summary|checklist/i,
];

const INTERNAL_GENERATION_DIRECTIVES = [
  /create a single comprehensive educational infographic/i,
  /add one application prompt/i,
  /add one reasoning prompt/i,
  /add one recall check/i,
  /label it as additional coverage/i,
  /use a simple labelled classroom diagram/i,
  /work through one guided example/i,
  /simple labelled visual/i,
  /write the known values, substitute into the formula, solve carefully, and state the final answer/i,
  /show the reasoning step by step/i,
  /check units and final result before concluding/i,
  /state the source-based idea clearly/i,
  /avoid mixing in unstated information/i,
  /add one application question/i,
  /ask one reasoning question/i,
  /include one quick recall check/i,
  /use only source-supported ideas/i,
  /explain what each variable means and how to use the formula/i,
];

const PROMPT_OR_METADATA_PATTERNS = [
  /you are generating a teaching response/i,
  /this is not a chatbot conversation/i,
  /extracted content\s*:/i,
  /source material\s*:/i,
  /student profile\s*:/i,
  /teaching depth required\s*:/i,
  /selected output options?\s*:/i,
  /required visual style\s*:/i,
  /required explanation style\s*:/i,
  /teaching objective\s*:/i,
  /output formatting instructions\s*:/i,
  /respond in exactly three sections/i,
  /section\s*1\s*:/i,
  /section\s*2\s*:/i,
  /section\s*3\s*:/i,
  /ocr text\s*:/i,
  /subject\s*:/i,
  /board\s*:/i,
  /class\s*:/i,
  /chapter\s*:/i,
  /topic\s*:/i,
  /question type\s*:/i,
  /language\s*:/i,
  /keywords\s*:/i,
  /contains tables\s*:/i,
  /contains exercises\s*:/i,
  /do not ask follow-up questions/i,
  /generate the full educational response now/i,
  /^https?:\/\//i,
];

function firstNonEmpty(...values: Array<string | undefined>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return "";
}

function sanitizeTeachingLine(value: string, fallback = "") {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;
  if (PROMPT_OR_METADATA_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return fallback;
  }
  if (INTERNAL_GENERATION_DIRECTIVES.some((pattern) => pattern.test(normalized))) {
    return fallback;
  }
  return normalized;
}

function hasEducationalSignal(value: string) {
  const text = sanitizeTeachingLine(value, "");
  if (!text) return false;

  if (/[=+\-/*^]/.test(text) && /\d|[a-z]/i.test(text)) return true;
  if (/\b(concept|definition|formula|equation|law|principle|example|solve|calculate|derive|diagram|label|graph|table|mistake|revision|exam|reason|because|therefore|given|answer)\b/i.test(text)) return true;
  if (/\b(cbse|icse|igcse|physics|chemistry|biology|mathematics|history|geography|english)\b/i.test(text)) return true;
  return text.split(/\s+/).length >= 4;
}

function sanitizeList(values: string[], max = 6) {
  const output: string[] = [];
  for (const value of values) {
    const clean = sanitizeTeachingLine(value, "");
    if (!clean) continue;
    if (!hasEducationalSignal(clean)) continue;
    if (!output.includes(clean)) {
      output.push(clean);
    }
    if (output.length >= max) break;
  }
  return output;
}

function buildFormulaSummary(formula: string, meaning?: string) {
  const normalizedFormula = formula.trim();
  const safeMeaning = sanitizeTeachingLine(
    meaning || "",
    "",
  );

  if (!normalizedFormula) {
    return safeMeaning;
  }

  if (/\bV\b.*\bI\b.*\bR\b/i.test(normalizedFormula) || /\bI\b.*\bR\b.*\bV\b/i.test(normalizedFormula)) {
    return "V = potential difference; I = current; R = resistance. The relationship shows that voltage increases with current when resistance stays constant.";
  }

  return `${normalizedFormula} — ${safeMeaning}`;
}

function normalizeCardTitle(value: string) {
  return value.trim() || "Teaching Card";
}

function makeCard(title: string, explanation: string, keyPoints: string[], extra: Partial<TeachingCard> = {}): TeachingCard {
  const cleanExplanation = sanitizeTeachingLine(explanation, "");
  const cleanPoints = keyPoints
    .map((point) => sanitizeTeachingLine(point, ""))
    .filter((point) => point.length > 0 && hasEducationalSignal(point))
    .slice(0, 8);

  if (!cleanExplanation || !hasEducationalSignal(cleanExplanation)) {
    return {
      title: normalizeCardTitle(title),
      explanation: "",
      keyPoints: [],
      ...extra,
    };
  }

  return {
    title: normalizeCardTitle(title),
    explanation: cleanExplanation,
    keyPoints: cleanPoints,
    ...extra,
  };
}

function isUsableCard(card: TeachingCard) {
  if (!card.explanation || !hasEducationalSignal(card.explanation)) return false;
  if (PROMPT_OR_METADATA_PATTERNS.some((pattern) => pattern.test(card.explanation))) return false;
  if (INTERNAL_GENERATION_DIRECTIVES.some((pattern) => pattern.test(card.explanation))) return false;
  return true;
}

function pushCard(cards: TeachingCard[], card: TeachingCard) {
  if (!isUsableCard(card)) return;
  cards.push(card);
}

export function ensureMinimumDisintegrationCards(analysis: TeachingImageAnalysisResult): TeachingCard[] {
  const cards: TeachingCard[] = [];
  const mainTopic = firstNonEmpty(analysis.mainTopic, "Topic");
  const sourceContent = sanitizeList(analysis.sourceContent, 8);
  const definitions = sanitizeList(analysis.definitions.map((item) => firstNonEmpty(item.text, item.title)), 5);
  const formulae = analysis.formulae
    .map((item) => ({
      formula: sanitizeTeachingLine(item.formula, ""),
      meaning: sanitizeTeachingLine(item.meaning, ""),
      units: sanitizeTeachingLine(item.units, ""),
    }))
    .filter((item) => item.formula.length > 0 || item.meaning.length > 0);
  const workedExamples = analysis.workedExamples
    .map((item) => ({
      title: sanitizeTeachingLine(item.title, ""),
      problem: sanitizeTeachingLine(item.problem, ""),
      steps: sanitizeTeachingLine(item.steps, ""),
    }))
    .filter((item) => item.problem.length > 0 || item.steps.length > 0);
  const visuals = sanitizeList(
    [
      ...analysis.diagrams.map((item) => item.description),
      ...analysis.tables.map((item) => item.description),
    ],
    6,
  );
  const commonMistakes = sanitizeList(analysis.commonMistakes, 6);
  const examPoints = sanitizeList(analysis.examPoints, 6);
  const revisionPoints = sanitizeList(analysis.revisionPoints, 6);
  const additionalCoverage = sanitizeList(analysis.additionalExamCoverage, 6);

  pushCard(
    cards,
    makeCard(
      `${mainTopic} — Source Content`,
      firstNonEmpty(sourceContent[0], definitions[0]),
      sourceContent.slice(0, 5),
    ),
  );

  pushCard(
    cards,
    makeCard(
      `${mainTopic} — Concept & Definition`,
      firstNonEmpty(definitions[0], sourceContent[0]),
      [...definitions.slice(1), ...revisionPoints].slice(0, 5),
    ),
  );

  if (formulae.length > 0) {
    const firstFormula = formulae[0];
    pushCard(
      cards,
      makeCard(
        `${mainTopic} — Formula & Meaning`,
        buildFormulaSummary(firstFormula.formula, firstFormula.meaning),
        [
          firstFormula.units ? `Units: ${firstFormula.units}` : "",
          ...formulae.slice(1).map((item) => item.formula),
        ].filter(Boolean),
        { formula: firstFormula.formula },
      ),
    );
  }

  if (workedExamples.length > 0) {
    const firstExample = workedExamples[0];
    pushCard(
      cards,
      makeCard(
        `${mainTopic} — Worked Example`,
        firstNonEmpty(firstExample.problem, sourceContent.find((value) => /example|problem|solve|calculate/i.test(value))),
        [firstExample.steps, ...workedExamples.slice(1).map((item) => firstNonEmpty(item.problem, item.steps))].filter(Boolean),
        { example: firstNonEmpty(firstExample.steps, firstExample.problem) },
      ),
    );
  }

  if (visuals.length > 0) {
    pushCard(
      cards,
      makeCard(
        `${mainTopic} — Diagram / Visual Explanation`,
        visuals[0],
        visuals.slice(1, 6),
        { diagram: visuals[0] },
      ),
    );
  }

  if (commonMistakes.length > 0) {
    pushCard(
      cards,
      makeCard(
        `${mainTopic} — Common Mistakes`,
        commonMistakes[0],
        commonMistakes.slice(1, 6),
        { commonMistake: commonMistakes[0] },
      ),
    );
  }

  if (examPoints.length > 0 || revisionPoints.length > 0) {
    pushCard(
      cards,
      makeCard(
        `${mainTopic} — Exam Importance & Revision`,
        firstNonEmpty(examPoints[0], revisionPoints[0]),
        [...examPoints.slice(1), ...revisionPoints].slice(0, 6),
        { examImportance: examPoints.join(" | ") },
      ),
    );
  }

  if (additionalCoverage.length > 0) {
    pushCard(
      cards,
      makeCard(
        `${mainTopic} — Additional Exam Coverage`,
        additionalCoverage[0],
        additionalCoverage.slice(1, 6),
      ),
    );
  }

  const deduped = cards.filter((card, index, arr) => {
    const key = `${card.title}|${card.explanation}`;
    return arr.findIndex((candidate) => `${candidate.title}|${candidate.explanation}` === key) === index;
  });

  if (deduped.length > 0) {
    return deduped.slice(0, 12);
  }

  const fallback = makeCard(
    `${mainTopic} — Source Content`,
    firstNonEmpty(sourceContent[0], definitions[0], "Source understanding is insufficient to build teaching cards. Re-analyze with a clearer master image."),
    sourceContent.slice(1, 5),
  );

  return isUsableCard(fallback) ? [fallback] : [];
}
