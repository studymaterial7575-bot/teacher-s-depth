import type { ModuleName, QuestionAnalysis, RecommendationSummary } from "@/types/teaching-engine";
import { RECOMMENDATION_RULES } from "./keywordRules";
import { normalizeText } from "./questionAnalyzer";

export function getRecommendations(questionText: string, analysis: QuestionAnalysis): RecommendationSummary {
  const normalized = normalizeText(questionText);
  const reasons = new Set<string>();
  const recommendedModules = new Set<ModuleName>();

  if (!normalized) {
    return { reasons: [], modules: [] };
  }

  RECOMMENDATION_RULES.forEach((rule) => {
    const matchedKeywords = rule.keywords.filter((keyword) => normalized.includes(keyword));
    if (matchedKeywords.length === 0) return;

    if (rule.label === "Geometry / Maths") {
      reasons.add("Geometry keywords detected");
    }
    if (rule.label === "Algebra") {
      reasons.add("Formula keyword detected");
    }
    if (rule.label === "Science") {
      reasons.add("Diagram keyword detected");
    }
    if (rule.label === "English") {
      reasons.add("Language keywords detected");
    }
    if (rule.label === "Social Studies") {
      reasons.add("Social studies keywords detected");
    }

    rule.modules.forEach((module) => recommendedModules.add(module));
  });

  if (analysis.visualRequired === "Yes") {
    recommendedModules.add("Visual Learning");
    reasons.add("Visual support recommended");
  }

  if (analysis.formulaRequired === "Yes") {
    recommendedModules.add("Formula Intelligence");
    reasons.add("Formula explanation recommended");
  }

  if (analysis.subject === "Mathematics" && analysis.chapter === "Geometry") {
    recommendedModules.add("Logical Flow");
    recommendedModules.add("Common Mistakes");
  }

  if (analysis.subject === "Mathematics" && analysis.chapter === "Algebra") {
    recommendedModules.add("Logical Flow");
    recommendedModules.add("Practice");
  }

  if (analysis.subject === "Science") {
    recommendedModules.add("Concept Builder");
    recommendedModules.add("Real Life Examples");
  }

  if (analysis.subject === "English") {
    recommendedModules.add("Simplest Understanding");
    recommendedModules.add("Examples");
  }

  if (analysis.subject === "Social Studies") {
    recommendedModules.add("Timeline / Sequence");
    recommendedModules.add("Exam Importance");
  }

  return {
    reasons: Array.from(reasons),
    modules: Array.from(recommendedModules),
  };
}
