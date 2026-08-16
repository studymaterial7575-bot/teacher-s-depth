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

function buildFormulaSummary(formula: string, meaning?: string) {
  const normalizedFormula = formula.trim();
  const safeMeaning = sanitizeTeachingLine(
    meaning || "",
    "Explain the relationship between the main quantities in this topic.",
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
  return {
    title: normalizeCardTitle(title),
    explanation: sanitizeTeachingLine(explanation, "Core teaching content for this topic."),
    keyPoints: keyPoints
      .map((point) => sanitizeTeachingLine(point, "Key idea for this topic."))
      .filter(Boolean)
      .slice(0, 8),
    ...extra,
  };
}

export function ensureMinimumDisintegrationCards(analysis: TeachingImageAnalysisResult): TeachingCard[] {
  const existing = Array.isArray(analysis.cards) && analysis.cards.length > 0 ? [...analysis.cards] : [];
  const cards: TeachingCard[] = existing.map((card) => ({
    ...card,
    title: normalizeCardTitle(card.title),
    explanation: sanitizeTeachingLine(card.explanation || "Core teaching content for this topic.", "Core teaching content for this topic."),
    keyPoints: Array.isArray(card.keyPoints)
      ? card.keyPoints
          .map((point) => sanitizeTeachingLine(point, "Key teaching point."))
          .filter(Boolean)
          .slice(0, 8)
      : [],
  }));

  const mainTopic = firstNonEmpty(analysis.mainTopic, "Topic");
  const sourceContentSummary = sanitizeTeachingLine(
    firstNonEmpty(
      analysis.sourceContent[0],
      `Core idea from the source for ${mainTopic}.`,
    ),
    `Core idea from the source for ${mainTopic}.`,
  );
  const additionalCoverageSummary = sanitizeTeachingLine(
    firstNonEmpty(
      analysis.additionalExamCoverage[0],
      `Additional same-topic exam support for ${mainTopic} with a clear application and reasoning focus.`,
    ),
    `Additional same-topic exam support for ${mainTopic} with a clear application and reasoning focus.`,
  );

  const sourceContentCard = cards.find((card) => /source content/i.test(card.title) || /source content/i.test(card.explanation));
  if (!sourceContentCard) {
    cards.push(
      makeCard(
        `${mainTopic} — Source Content`,
        sourceContentSummary,
        analysis.sourceContent.slice(0, 4).length > 0
          ? analysis.sourceContent.slice(0, 4).map((item) => sanitizeTeachingLine(item, `Understand the main idea of ${mainTopic} from the source.`))
          : ["The key idea from the source is stated clearly.", "Only support claims that are directly linked to the source material."],
      ),
    );
  }

  const additionalCoverageCard = cards.find((card) => /additional exam coverage/i.test(card.title) || /additional exam coverage/i.test(card.explanation));
  if (!additionalCoverageCard) {
    cards.push(
      makeCard(
        `${mainTopic} — Important Additional Exam Coverage`,
        additionalCoverageSummary,
        analysis.additionalExamCoverage.slice(0, 4).length > 0
          ? analysis.additionalExamCoverage.slice(0, 4).map((item) => sanitizeTeachingLine(item, `This topic is strengthened by realistic application and reasoning questions.`))
          : ["Explain the concept in a classroom-friendly way.", "Apply the idea to a real example.", "Check the answer with a short reasoning step."],
      ),
    );
  }

  const conceptCard = cards.find((card) => REQUIRED_CARD_PATTERNS[0].test(card.title) || /definition|concept|overview/i.test(card.explanation));
  if (!conceptCard) {
    cards.push(
      makeCard(
        `${mainTopic} — Concept & Definition`,
        firstNonEmpty(analysis.definitions[0]?.text, analysis.sourceContent[0], `Core definition and understanding of ${mainTopic}.`),
        analysis.revisionPoints.slice(0, 4),
      ),
    );
  }

  const formulaCard = cards.find((card) => REQUIRED_CARD_PATTERNS[1].test(card.title) || /formula|equation|law|principle/i.test(card.explanation || ""));
  if (!formulaCard) {
    const formula = analysis.formulae[0]?.formula || "Identify the key formula/equation from chapter context.";
    const meaning = analysis.formulae[0]?.meaning || "Explain what the formula represents and how it is used.";
    cards.push(
      makeCard(
        `${mainTopic} — Formula & Meaning`,
        buildFormulaSummary(formula, meaning),
        [
          "State the formula clearly.",
          "Explain each variable and its meaning.",
          "Link the formula to the relevant worked example.",
        ],
        { formula },
      ),
    );
  }

  const exampleCard = cards.find((card) => REQUIRED_CARD_PATTERNS[2].test(card.title) || /example|worked|problem|application/i.test(card.explanation || ""));
  if (!exampleCard) {
    cards.push(
      makeCard(
        `${mainTopic} — Worked Example`,
        sanitizeTeachingLine(
          firstNonEmpty(
            analysis.workedExamples[0]?.problem,
            analysis.sourceContent.find((value) => /example|problem|solve|calculate/i.test(value)) || `Apply the key formula to a worked example involving ${mainTopic}.`,
          ),
          `Apply the key formula to a worked example involving ${mainTopic}.`,
        ),
        [
          sanitizeTeachingLine(
            firstNonEmpty(analysis.workedExamples[0]?.steps, "Write the known values, substitute into the formula, solve carefully, and state the final answer."),
            "Write the known values, substitute into the formula, solve carefully, and state the final answer.",
          ),
          "Show the reasoning step by step.",
          "Check units and final result before concluding.",
        ],
        { example: analysis.workedExamples[0]?.steps || "Write the known values, substitute into the formula, solve carefully, and state the final answer." },
      ),
    );
  }

  const visualCard = cards.find((card) => REQUIRED_CARD_PATTERNS[3].test(card.title) || /visual|diagram|map|graph|table|flowchart/i.test(card.explanation || ""));
  if (!visualCard) {
    cards.push(
      makeCard(
        `${mainTopic} — Diagram / Visual Map`,
        sanitizeTeachingLine(
          firstNonEmpty(analysis.diagrams[0]?.description, analysis.tables[0]?.description, "The diagram labels the key parts and shows how they are related."),
          "The diagram labels the key parts and shows how they are related.",
        ),
        [
          "Label the important parts clearly.",
          "Show relationships or sequence visually.",
          "Tie the diagram back to the formula or concept.",
        ],
        { diagram: analysis.diagrams[0]?.description || "The diagram labels the key parts and shows how they are related." },
      ),
    );
  }

  const mistakeCard = cards.find((card) => REQUIRED_CARD_PATTERNS[4].test(card.title) || /mistake|error|trap|common/i.test(card.explanation || ""));
  if (!mistakeCard) {
    cards.push(
      makeCard(
        `${mainTopic} — Common Mistakes`,
        "Avoid the most common misunderstanding in this topic.",
        (analysis.commonMistakes.length > 0 ? analysis.commonMistakes : [
          "Confusing the formula variables.",
          "Forgetting to include units or labels.",
          "Skipping the logic check before finalising the answer.",
        ]).slice(0, 5),
        { commonMistake: analysis.commonMistakes[0] || "Do not skip the reasoning step." },
      ),
    );
  }

  const examCard = cards.find((card) => REQUIRED_CARD_PATTERNS[5].test(card.title) || /exam|revision|summary|checklist/i.test(card.explanation || ""));
  if (!examCard) {
    cards.push(
      makeCard(
        `${mainTopic} — Exam Importance & Revision`,
        firstNonEmpty(analysis.examPoints[0], analysis.additionalExamCoverage[0], "This topic is important because it combines concept recall, formula use, and application-based reasoning."),
        [
          "List the key idea, formula, and likely question type.",
          "Note the most common exam patterns.",
          "Revise definitions, formula use and worked examples before the exam.",
        ],
        { examImportance: analysis.examPoints.join(" | ") || "Revision and exam preparation checklist." },
      ),
    );
  }

  if (cards.length < 7) {
    cards.push(
      makeCard(
        `${mainTopic} — Additional Exam Coverage`,
        sanitizeTeachingLine(
          firstNonEmpty(
            analysis.additionalExamCoverage[0],
            `This topic is strengthened by additional application, reasoning, and quick recall practice in ${mainTopic}.`,
          ),
          `This topic is strengthened by additional application, reasoning, and quick recall practice in ${mainTopic}.`,
        ),
        analysis.additionalExamCoverage.slice(0, 4).map((item) => sanitizeTeachingLine(item, `Apply the concept in a different context and explain the reasoning clearly.`)),
      ),
    );
  }

  if (cards.length < 7) {
    cards.push(
      makeCard(
        `${mainTopic} — Real-life Example`,
        "Connect the concept to a real classroom or daily-life application.",
        [
          "Explain the concept in plain language.",
          "Link the theory to a practical situation.",
          "Make the learning memorable for students.",
        ],
      ),
    );
  }

  if (cards.length < 7) {
    cards.push(
      makeCard(
        `${mainTopic} — Logical Flow`,
        "Show the logical sequence of ideas in a student-friendly order.",
        [
          "Start with the core idea.",
          "Introduce the formula or principle.",
          "Follow with a solved example and a quick check.",
        ],
      ),
    );
  }

  const deduped = cards.filter((card, index, arr) => {
    const key = `${card.title}|${card.explanation}`;
    return arr.findIndex((candidate) => `${candidate.title}|${candidate.explanation}` === key) === index;
  });

  if (deduped.length >= 7) {
    return deduped.slice(0, Math.max(7, Math.min(12, deduped.length)));
  }

  while (deduped.length < 7) {
    deduped.push(
      makeCard(
        `${mainTopic} — Learning Check ${deduped.length + 1}`,
        "Add a compact review card to maintain complete teaching coverage.",
        [
          "State the main idea in one sentence.",
          "Mention a formula or diagram if relevant.",
          "Finish with one quick revision prompt.",
        ],
      ),
    );
  }

  return deduped.slice(0, 12);
}
