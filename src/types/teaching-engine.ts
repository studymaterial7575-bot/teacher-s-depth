export const MODULES = [
  "Simplest Understanding",
  "Logical Flow",
  "Visual Learning",
  "Formula Intelligence",
  "Common Mistakes",
  "Exam Importance",
  "Practice",
  "Concept Builder",
  "Real Life Examples",
  "Examples",
  "Timeline / Sequence",
] as const;

export type ModuleName = (typeof MODULES)[number];

export type QuestionAnalysis = {
  subject: string;
  chapter: string;
  questionType: string;
  difficulty: string;
  skillsRequired: string[];
  visualRequired: string;
  formulaRequired: string;
  examImportance: string;
};

export type RecommendationSummary = {
  reasons: string[];
  modules: ModuleName[];
};
