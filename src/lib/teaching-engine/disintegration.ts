import type { TeachingCard, TeachingImageAnalysisResult } from "@/types/teaching-engine";

const REQUIRED_CARD_PATTERNS = [
  /definition|concept|idea|overview/i,
  /formula|equation|law|principle/i,
  /example|worked|problem|application/i,
  /visual|diagram|map|graph|table/i,
  /mistake|error|trap/i,
  /exam|revision|summary|checklist/i,
];

function firstNonEmpty(...values: Array<string | undefined>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return "";
}

function normalizeCardTitle(value: string) {
  return value.trim() || "Teaching Card";
}

function makeCard(title: string, explanation: string, keyPoints: string[], extra: Partial<TeachingCard> = {}): TeachingCard {
  return {
    title: normalizeCardTitle(title),
    explanation: explanation.trim() || "Core teaching content for this topic.",
    keyPoints: keyPoints.filter(Boolean).slice(0, 8),
    ...extra,
  };
}

export function ensureMinimumDisintegrationCards(analysis: TeachingImageAnalysisResult): TeachingCard[] {
  const existing = Array.isArray(analysis.cards) && analysis.cards.length > 0 ? [...analysis.cards] : [];
  const cards: TeachingCard[] = existing.map((card) => ({
    ...card,
    title: normalizeCardTitle(card.title),
    explanation: card.explanation || "Core teaching content for this topic.",
    keyPoints: Array.isArray(card.keyPoints) ? card.keyPoints.filter(Boolean).slice(0, 8) : [],
  }));

  const mainTopic = firstNonEmpty(analysis.mainTopic, "Topic");
  const sourceContentSummary = firstNonEmpty(
    analysis.sourceContent[0],
    `Use only directly supported source content for ${mainTopic}.`,
  );
  const additionalCoverageSummary = firstNonEmpty(
    analysis.additionalExamCoverage[0],
    `Add missing but relevant same-topic exam support for ${mainTopic}.`,
  );

  const sourceContentCard = cards.find((card) => /source content/i.test(card.title) || /source content/i.test(card.explanation));
  if (!sourceContentCard) {
    cards.push(
      makeCard(
        `${mainTopic} — Source Content`,
        sourceContentSummary,
        analysis.sourceContent.slice(0, 4).length > 0 ? analysis.sourceContent.slice(0, 4) : ["State the source-based idea clearly.", "Avoid mixing in unstated information."],
      ),
    );
  }

  const additionalCoverageCard = cards.find((card) => /additional exam coverage/i.test(card.title) || /additional exam coverage/i.test(card.explanation));
  if (!additionalCoverageCard) {
    cards.push(
      makeCard(
        `${mainTopic} — Important Additional Exam Coverage`,
        additionalCoverageSummary,
        analysis.additionalExamCoverage.slice(0, 4).length > 0 ? analysis.additionalExamCoverage.slice(0, 4) : ["Add one application prompt.", "Add one reasoning prompt.", "Add one recall check."],
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
        `${formula} — ${meaning}`,
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
        firstNonEmpty(
          analysis.workedExamples[0]?.problem,
          analysis.sourceContent.find((value) => /example|problem|solve|calculate/i.test(value)) || `Work through one guided example for ${mainTopic}.`,
        ),
        [
          firstNonEmpty(analysis.workedExamples[0]?.steps, "Write the known values, substitute into the formula, solve carefully, and state the final answer."),
          "Show the reasoning step by step.",
          "Check units and final result before concluding.",
        ],
        { example: analysis.workedExamples[0]?.steps || "Show the solving steps clearly." },
      ),
    );
  }

  const visualCard = cards.find((card) => REQUIRED_CARD_PATTERNS[3].test(card.title) || /visual|diagram|map|graph|table|flowchart/i.test(card.explanation || ""));
  if (!visualCard) {
    cards.push(
      makeCard(
        `${mainTopic} — Diagram / Visual Map`,
        firstNonEmpty(analysis.diagrams[0]?.description, analysis.tables[0]?.description, "Create a clean teaching diagram that labels the key parts and shows their relationship."),
        [
          "Label the important parts clearly.",
          "Show relationships or sequence visually.",
          "Tie the diagram back to the formula or concept.",
        ],
        { diagram: analysis.diagrams[0]?.description || "Show a simple labelled visual for this concept." },
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
        firstNonEmpty(
          analysis.additionalExamCoverage[0],
          "Include extended practice on concept application, diagrams or questions that are likely to appear in mixed-format assessments.",
        ),
        analysis.additionalExamCoverage.slice(0, 4),
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
